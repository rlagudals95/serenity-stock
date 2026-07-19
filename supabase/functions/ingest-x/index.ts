import type { SupabaseClient } from "@supabase/supabase-js";

import { isCronAuthorized } from "../_shared/auth.ts";
import {
  acquireLease,
  blockPipelineAuthentication,
  claimPipelineSchedule,
  createServiceClient,
  enqueuePipelineAlert,
  finishRun,
  listDuePipelineAlerts,
  markPipelineAlertSent,
  releaseLease,
  reschedulePipelineAlert,
  startRun,
  type RunCounts,
} from "../_shared/database.ts";
import { errorDetails, jsonResponse } from "../_shared/http.ts";
import {
  createXPostSource,
  nextCursorState,
  XSourceAuthenticationError,
  type XPostSource,
  type StoredPost,
} from "../_shared/x.ts";
import {
  authenticationAlertEventKey,
  credentialFingerprint,
  parseIngestionMode,
  runAlertEventKey,
  shouldContactX,
} from "../_shared/ingestion-control.ts";
import {
  formatAuthenticationBlocked,
  formatIngestionFailure,
  formatIngestionSuccess,
  sendTelegramMessage,
  type TelegramConfig,
} from "../_shared/telegram.ts";

interface IngestionCursor {
  source_key: string;
  user_id: string;
  since_id: string | null;
  high_water_id: string | null;
  pagination_token: string | null;
  cycle_started_at: string | null;
  last_error: unknown | null;
}

interface IngestionCounts extends RunCounts {
  fetched: number;
  inserted: number;
  duplicates: number;
  jobsCreated: number;
  pages: number;
}

interface TrackedSource {
  analyst_key: string;
  x_username: string;
}

function requiredEnvironment(name: string) {
  const value = Deno.env.get(name)?.trim();
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

function boundedInteger(
  value: string | undefined,
  fallback: number,
  minimum: number,
  maximum: number,
) {
  const parsed = Number.parseInt(value ?? "", 10);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(maximum, Math.max(minimum, parsed));
}

function telegramConfig(): TelegramConfig | undefined {
  const botToken = Deno.env.get("TELEGRAM_BOT_TOKEN")?.trim();
  const chatId = Deno.env.get("TELEGRAM_CHAT_ID")?.trim();
  if (!botToken && !chatId) return undefined;
  if (!botToken || !chatId) {
    console.error("Telegram notification configuration is incomplete.");
    return undefined;
  }
  return { botToken, chatId };
}

async function drainTelegramAlerts(
  client: SupabaseClient,
  config: TelegramConfig | undefined,
) {
  if (!config) return;
  let alerts;
  try {
    alerts = await listDuePipelineAlerts(client);
  } catch (error) {
    console.error("Telegram alert lookup failed", errorDetails(error));
    return;
  }

  for (const alert of alerts) {
    try {
      await sendTelegramMessage(config, alert.message);
      await markPipelineAlertSent(client, alert.id);
    } catch (error) {
      console.error("Telegram notification failed", errorDetails(error));
      try {
        await reschedulePipelineAlert(client, alert, error);
      } catch (rescheduleError) {
        console.error(
          "Telegram alert reschedule failed",
          errorDetails(rescheduleError),
        );
      }
    }
  }
}

async function loadOrCreateCursor(
  client: SupabaseClient,
  sourceKey: string,
  username: string,
  xSource: XPostSource,
): Promise<IngestionCursor> {
  const { data, error } = await client
    .from("ingestion_cursors")
    .select(
      "source_key,user_id,since_id,high_water_id,pagination_token,cycle_started_at,last_error",
    )
    .eq("source_key", sourceKey)
    .maybeSingle();
  if (error) throw new Error(`Cursor lookup failed: ${error.message}`);
  if (data) return data as IngestionCursor;

  const { data: latest, error: latestError } = await client
    .from("posts")
    .select("x_post_id")
    .ilike("author_username", username)
    .order("posted_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (latestError) {
    throw new Error(`Initial cursor lookup failed: ${latestError.message}`);
  }
  const user = await xSource.resolveUser(username);

  const initial: IngestionCursor = {
    source_key: sourceKey,
    user_id: user.id,
    since_id: latest?.x_post_id ?? null,
    high_water_id: null,
    pagination_token: null,
    cycle_started_at: null,
    last_error: null,
  };
  const { error: insertError } = await client
    .from("ingestion_cursors")
    .insert(initial);
  if (insertError) {
    throw new Error(`Cursor initialization failed: ${insertError.message}`);
  }
  return initial;
}

async function storePosts(
  client: SupabaseClient,
  posts: StoredPost[],
) {
  if (posts.length === 0) return { inserted: 0, duplicates: 0 };

  const postIds = posts.map((post) => post.x_post_id);
  const { count, error: countError } = await client
    .from("posts")
    .select("id", { count: "exact", head: true })
    .in("x_post_id", postIds);
  if (countError) {
    throw new Error(`Existing post lookup failed: ${countError.message}`);
  }

  const { error } = await client
    .from("posts")
    .upsert(posts, { onConflict: "x_post_id", ignoreDuplicates: true });
  if (error) throw new Error(`Post upsert failed: ${error.message}`);

  const duplicates = count ?? 0;
  return { inserted: posts.length - duplicates, duplicates };
}

Deno.serve(async (request) => {
  if (request.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  const cronSecret = requiredEnvironment("SERENITY_CRON_SECRET");
  if (
    !(await isCronAuthorized(
      request.headers.get("x-serenity-cron-secret"),
      cronSecret,
    ))
  ) {
    return jsonResponse({ error: "Unauthorized" }, 401);
  }

  const supabaseUrl = requiredEnvironment("SUPABASE_URL");
  const serviceRoleKey = requiredEnvironment("SUPABASE_SERVICE_ROLE_KEY");
  const rettiwtApiKey = requiredEnvironment("RETTIWT_API_KEY");
  const provider = Deno.env.get("X_POST_PROVIDER")?.trim() || "rettiwt";
  const mode = parseIngestionMode(
    await request.json().catch(() => ({})),
  );
  const fingerprint = await credentialFingerprint(rettiwtApiKey);
  const telegram = telegramConfig();
  const maxPosts = boundedInteger(
    Deno.env.get("SERENITY_INGEST_MAX_POSTS"),
    1_000,
    100,
    1_000,
  );
  const jobName = "ingest-x";
  const ownerId = crypto.randomUUID();
  const client = createServiceClient(
    supabaseUrl,
    serviceRoleKey,
    "serenity-edge-ingest",
  );

  let hasLease = false;
  let runId: string | undefined;
  let activeSourceKey: string | undefined;
  let recoveredFromFailure = false;
  const counts: IngestionCounts = {
    fetched: 0,
    inserted: 0,
    duplicates: 0,
    jobsCreated: 0,
    pages: 0,
  };

  try {
    hasLease = await acquireLease(client, jobName, ownerId);
    if (!hasLease) {
      return jsonResponse({ status: "skipped", reason: "lease_held", counts });
    }

    const schedule = await claimPipelineSchedule(
      client,
      jobName,
      mode,
      fingerprint,
    );
    await drainTelegramAlerts(client, telegram);
    if (!shouldContactX(schedule.decision)) {
      return jsonResponse({
        status: "skipped",
        reason: schedule.decision,
        nextRunAt: schedule.nextRunAt,
        counts,
      });
    }

    recoveredFromFailure = schedule.decision === "credential_changed";
    const xSource = createXPostSource({
      provider,
      apiKey: rettiwtApiKey,
    });

    const { data: sourceData, error: sourceError } = await client
      .from("analyst_profiles")
      .select("analyst_key,x_username")
      .eq("active", true)
      .order("sort_order");
    if (sourceError) {
      throw new Error(`Tracked analyst lookup failed: ${sourceError.message}`);
    }
    const sources = (sourceData ?? []) as TrackedSource[];
    if (sources.length === 0) {
      throw new Error("No active analyst profiles are configured.");
    }

    runId = await startRun(client, "ingest_x_posts", counts, {
      source: provider,
      mode,
      sources: sources.map((source) => ({
        key: source.analyst_key,
        username: source.x_username,
      })),
      max_posts: maxPosts,
      runtime: "supabase-edge",
      author_filter: "tweet_by_user_id",
      schedule_delay_minutes: schedule.delayMinutes,
    });
    for (const source of sources) {
      const sourceKey = `x:${source.x_username.toLowerCase()}`;
      activeSourceKey = sourceKey;
      const cursor = await loadOrCreateCursor(
        client,
        sourceKey,
        source.x_username,
        xSource,
      );
      if (cursor.last_error !== null) recoveredFromFailure = true;
      const bootstrap =
        cursor.since_id === null &&
        cursor.high_water_id === null &&
        cursor.pagination_token === null;
      let sinceId = cursor.since_id;
      let highWaterId = cursor.high_water_id;
      let paginationToken = cursor.pagination_token;
      let cycleStartedAt =
        cursor.cycle_started_at ?? new Date().toISOString();
      const seenTokens = new Set<string>();
      let sourceFetched = 0;

      while (sourceFetched < maxPosts) {
        if (paginationToken && seenTokens.has(paginationToken)) {
          throw new Error("Rettiwt returned a repeated pagination token.");
        }
        if (paginationToken) seenTokens.add(paginationToken);

        const page = await xSource.fetchPostPage({
          userId: cursor.user_id,
          username: source.x_username,
          sinceId: sinceId ?? undefined,
          paginationToken: paginationToken ?? undefined,
          pageSize: Math.min(100, maxPosts - sourceFetched),
        });
        counts.pages += 1;
        counts.fetched += page.posts.length;
        sourceFetched += page.posts.length;

        const stored = await storePosts(client, page.posts);
        counts.inserted += stored.inserted;
        counts.duplicates += stored.duplicates;

        const transition = nextCursorState({
          previousSinceId: sinceId,
          previousHighWaterId: highWaterId,
          pagePostIds: page.posts.map((post) => post.x_post_id),
          nextToken: page.nextToken,
          bootstrap,
        });
        sinceId = transition.sinceId;
        highWaterId = transition.highWaterId;
        paginationToken = transition.paginationToken;
        if (transition.complete) cycleStartedAt = new Date().toISOString();

        const { error: cursorError } = await client
          .from("ingestion_cursors")
          .update({
            since_id: sinceId,
            high_water_id: highWaterId,
            pagination_token: paginationToken,
            cycle_started_at: transition.complete ? null : cycleStartedAt,
            last_success_at: transition.complete
              ? new Date().toISOString()
              : null,
            last_error: null,
          })
          .eq("source_key", sourceKey);
        if (cursorError) {
          throw new Error(`Cursor update failed: ${cursorError.message}`);
        }

        if (transition.complete || page.posts.length === 0) break;
      }
    }

    const { data: jobsCreated, error: enqueueError } = await client.rpc(
      "enqueue_missing_analysis_jobs",
      { p_batch_size: 1_000 },
    );
    if (enqueueError) {
      throw new Error(`Analysis job enqueue failed: ${enqueueError.message}`);
    }
    counts.jobsCreated = Number(jobsCreated ?? 0);

    await finishRun(client, runId, "completed", counts);
    if (counts.inserted > 0 || recoveredFromFailure) {
      const message = formatIngestionSuccess({
        ...counts,
        occurredAt: new Date().toISOString(),
        recovered: recoveredFromFailure,
      });
      try {
        await enqueuePipelineAlert(client, {
          eventKey: runAlertEventKey(jobName, runId),
          kind: recoveredFromFailure
            ? "ingestion_recovery"
            : "ingestion_success",
          message,
        });
      } catch (alertError) {
        console.error(
          "Pipeline alert enqueue failed",
          errorDetails(alertError),
        );
      }
      await drainTelegramAlerts(client, telegram);
    }
    return jsonResponse({ status: "completed", counts });
  } catch (error) {
    const details = errorDetails(error);
    if (runId) await finishRun(client, runId, "failed", counts, error);
    if (activeSourceKey) {
      await client
        .from("ingestion_cursors")
        .update({ last_error: details })
        .eq("source_key", activeSourceKey);
    }

    console.error("ingest-x failed", details);
    if (error instanceof XSourceAuthenticationError) {
      const message = formatAuthenticationBlocked({
        sourceKey: activeSourceKey,
        error: details.message,
        fetched: counts.fetched,
        inserted: counts.inserted,
        pages: counts.pages,
        occurredAt: new Date().toISOString(),
      });
      await blockPipelineAuthentication(client, {
        jobName,
        credentialFingerprint: fingerprint,
        eventKey: authenticationAlertEventKey(jobName, fingerprint),
        message,
      });
      await drainTelegramAlerts(client, telegram);
      return jsonResponse(
        {
          error: {
            code: "x_auth_blocked",
            message:
              "X authentication failed; collection is blocked until the credential changes.",
          },
          counts,
        },
        503,
      );
    }

    try {
      await enqueuePipelineAlert(client, {
        eventKey: runAlertEventKey(
          jobName,
          runId ?? crypto.randomUUID(),
        ),
        kind: "ingestion_failure",
        message: formatIngestionFailure({
          sourceKey: activeSourceKey,
          error: details.message,
          fetched: counts.fetched,
          inserted: counts.inserted,
          pages: counts.pages,
          occurredAt: new Date().toISOString(),
        }),
      });
    } catch (alertError) {
      console.error(
        "Pipeline alert enqueue failed",
        errorDetails(alertError),
      );
    }
    await drainTelegramAlerts(client, telegram);
    return jsonResponse({ error: details, counts }, 500);
  } finally {
    if (hasLease) await releaseLease(client, jobName, ownerId);
  }
});
