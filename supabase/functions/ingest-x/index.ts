import type { SupabaseClient } from "@supabase/supabase-js";

import { isCronAuthorized } from "../_shared/auth.ts";
import {
  acquireLease,
  createServiceClient,
  finishRun,
  releaseLease,
  startRun,
  type RunCounts,
} from "../_shared/database.ts";
import { errorDetails, jsonResponse } from "../_shared/http.ts";
import {
  fetchXPostPage,
  fetchXUser,
  nextCursorState,
  type StoredPost,
} from "../_shared/x.ts";

interface IngestionCursor {
  source_key: string;
  user_id: string;
  since_id: string | null;
  high_water_id: string | null;
  pagination_token: string | null;
  cycle_started_at: string | null;
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

async function loadOrCreateCursor(
  client: SupabaseClient,
  sourceKey: string,
  username: string,
  bearerToken: string,
): Promise<IngestionCursor> {
  const { data, error } = await client
    .from("ingestion_cursors")
    .select(
      "source_key,user_id,since_id,high_water_id,pagination_token,cycle_started_at",
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
  const user = await fetchXUser(username, bearerToken);

  const initial: IngestionCursor = {
    source_key: sourceKey,
    user_id: user.id,
    since_id: latest?.x_post_id ?? null,
    high_water_id: null,
    pagination_token: null,
    cycle_started_at: null,
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
  const xBearerToken = requiredEnvironment("X_API_BEARER_TOKEN");
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
      source: "x",
      sources: sources.map((source) => ({
        key: source.analyst_key,
        username: source.x_username,
      })),
      max_posts: maxPosts,
      runtime: "supabase-edge",
    });
    for (const source of sources) {
      const sourceKey = `x:${source.x_username.toLowerCase()}`;
      activeSourceKey = sourceKey;
      const cursor = await loadOrCreateCursor(
        client,
        sourceKey,
        source.x_username,
        xBearerToken,
      );
      let sinceId = cursor.since_id;
      let highWaterId = cursor.high_water_id;
      let paginationToken = cursor.pagination_token;
      let cycleStartedAt =
        cursor.cycle_started_at ?? new Date().toISOString();
      const seenTokens = new Set<string>();
      let sourceFetched = 0;

      while (sourceFetched < maxPosts) {
        if (paginationToken && seenTokens.has(paginationToken)) {
          throw new Error("X API returned a repeated pagination token.");
        }
        if (paginationToken) seenTokens.add(paginationToken);

        const page = await fetchXPostPage({
          userId: cursor.user_id,
          username: source.x_username,
          bearerToken: xBearerToken,
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
    return jsonResponse({ status: "completed", counts });
  } catch (error) {
    if (runId) await finishRun(client, runId, "failed", counts, error);
    if (activeSourceKey) {
      await client
        .from("ingestion_cursors")
        .update({ last_error: errorDetails(error) })
        .eq("source_key", activeSourceKey);
    }
    console.error("ingest-x failed", errorDetails(error));
    return jsonResponse({ error: errorDetails(error), counts }, 500);
  } finally {
    if (hasLease) await releaseLease(client, jobName, ownerId);
  }
});
