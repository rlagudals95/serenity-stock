import type { SupabaseClient } from "@supabase/supabase-js";

import type { AnalysisPayload } from "../_shared/analysis-schema.ts";
import { isCronAuthorized } from "../_shared/auth.ts";
import {
  acquireLease,
  createServiceClient,
  finishRun,
  releaseLease,
  startRun,
  type RunCounts,
} from "../_shared/database.ts";
import { analyzePostWithDeepSeek } from "../_shared/deepseek.ts";
import { errorDetails, jsonResponse } from "../_shared/http.ts";
import {
  extractTickerCandidates,
  type StoredPost,
} from "../_shared/x.ts";

interface AnalysisJob {
  id: number | string;
  post_id: number | string;
  attempts: number;
}

interface StoredPostRow extends Omit<StoredPost, "x_post_id"> {
  id: number | string;
  x_post_id: string;
}

interface AnalysisCounts extends RunCounts {
  enqueued: number;
  claimed: number;
  analyzed: number;
  failed: number;
  deadLettered: number;
}

function requiredEnvironment(name: string) {
  const value = Deno.env.get(name)?.trim();
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

async function ensureAnalysisConfig(
  client: SupabaseClient,
  model: string,
) {
  const { data: existing, error: selectError } = await client
    .from("analysis_configs")
    .select("id,is_active")
    .eq("provider", "deepseek")
    .eq("model", model)
    .eq("prompt_version", "serenity-post-v1")
    .eq("schema_version", "serenity-analysis-v1")
    .maybeSingle();
  if (selectError) {
    throw new Error(`Analysis config lookup failed: ${selectError.message}`);
  }
  if (existing?.is_active) return existing.id;

  const { error: deactivateError } = await client
    .from("analysis_configs")
    .update({ is_active: false })
    .eq("is_active", true);
  if (deactivateError) {
    throw new Error(
      `Analysis config deactivation failed: ${deactivateError.message}`,
    );
  }

  if (existing) {
    const { error } = await client
      .from("analysis_configs")
      .update({ is_active: true })
      .eq("id", existing.id);
    if (error) {
      throw new Error(`Analysis config activation failed: ${error.message}`);
    }
    return existing.id;
  }

  const { data, error } = await client
    .from("analysis_configs")
    .insert({
      provider: "deepseek",
      model,
      prompt_version: "serenity-post-v1",
      schema_version: "serenity-analysis-v1",
      is_active: true,
    })
    .select("id")
    .single();
  if (error) {
    throw new Error(`Analysis config creation failed: ${error.message}`);
  }
  return data.id;
}

function normalizeForDatabase(payload: AnalysisPayload): AnalysisPayload {
  return {
    ...payload,
    ticker_analyses: payload.ticker_analyses.map((analysis) => {
      if (analysis.ticker_confidence < 0.75) {
        return {
          ...analysis,
          review_status: "needs_review" as const,
          review_reason: "ticker" as const,
        };
      }
      if (analysis.stance_confidence < 0.75) {
        return {
          ...analysis,
          review_status: "needs_review" as const,
          review_reason: analysis.review_reason ?? ("stance" as const),
        };
      }
      return analysis;
    }),
  };
}

async function upsertTickers(
  client: SupabaseClient,
  payload: AnalysisPayload,
) {
  if (payload.ticker_analyses.length === 0) return;
  const tickers = [
    ...new Map(
      payload.ticker_analyses.map((analysis) => [
        analysis.ticker,
        {
          ticker: analysis.ticker,
          company_name: analysis.company_name,
          active: true,
        },
      ]),
    ).values(),
  ];
  const { error } = await client
    .from("tickers")
    .upsert(tickers, { onConflict: "ticker", ignoreDuplicates: true });
  if (error) throw new Error(`Ticker upsert failed: ${error.message}`);
}

async function processWithConcurrency<T>(
  items: T[],
  concurrency: number,
  worker: (item: T) => Promise<void>,
) {
  for (let index = 0; index < items.length; index += concurrency) {
    await Promise.all(items.slice(index, index + concurrency).map(worker));
  }
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
  const deepseekApiKey = requiredEnvironment("DEEPSEEK_API_KEY");
  const model = Deno.env.get("DEEPSEEK_MODEL")?.trim() || "deepseek-v4-flash";
  const jobName = "analyze-posts";
  const ownerId = crypto.randomUUID();
  const client = createServiceClient(
    supabaseUrl,
    serviceRoleKey,
    "serenity-edge-analysis",
  );

  let hasLease = false;
  let runId: string | undefined;
  const counts: AnalysisCounts = {
    enqueued: 0,
    claimed: 0,
    analyzed: 0,
    failed: 0,
    deadLettered: 0,
  };

  try {
    hasLease = await acquireLease(client, jobName, ownerId);
    if (!hasLease) {
      return jsonResponse({ status: "skipped", reason: "lease_held", counts });
    }

    runId = await startRun(client, "analyze_posts", counts, {
      provider: "deepseek",
      model,
      batch_size: 10,
      concurrency: 3,
      runtime: "supabase-edge",
    });
    await ensureAnalysisConfig(client, model);

    const { data: enqueued, error: enqueueError } = await client.rpc(
      "enqueue_missing_analysis_jobs",
      { p_batch_size: 1_000 },
    );
    if (enqueueError) {
      throw new Error(`Analysis job enqueue failed: ${enqueueError.message}`);
    }
    counts.enqueued = Number(enqueued ?? 0);

    const { data: claimed, error: claimError } = await client.rpc(
      "claim_analysis_jobs",
      { p_worker_id: ownerId, p_batch_size: 10 },
    );
    if (claimError) {
      throw new Error(`Analysis job claim failed: ${claimError.message}`);
    }
    const jobs = (claimed ?? []) as AnalysisJob[];
    counts.claimed = jobs.length;

    const postById = new Map<string, StoredPostRow>();
    if (jobs.length > 0) {
      const { data, error } = await client
        .from("posts")
        .select("*")
        .in("id", jobs.map((job) => job.post_id));
      if (error) throw new Error(`Claimed post lookup failed: ${error.message}`);
      for (const post of (data ?? []) as StoredPostRow[]) {
        postById.set(String(post.id), post);
      }
    }

    await processWithConcurrency(jobs, 3, async (job) => {
      try {
        const post = postById.get(String(job.post_id));
        if (!post) throw new Error(`Post ${job.post_id} was not found.`);
        const analysis = await analyzePostWithDeepSeek({
          apiKey: deepseekApiKey,
          model,
          post,
          candidates: extractTickerCandidates(post.text),
        });
        const payload = normalizeForDatabase(analysis.payload);
        await upsertTickers(client, payload);

        const { error } = await client.rpc("complete_analysis_job", {
          p_job_id: job.id,
          p_worker_id: ownerId,
          p_analysis_payload: {
            ...payload,
            status: payload.ticker_analyses.some(
              (item) => item.review_status === "needs_review",
            )
              ? "needs_review"
              : "completed",
            input_tokens: analysis.inputTokens,
            output_tokens: analysis.outputTokens,
            raw_response: analysis.rawResponse,
          },
        });
        if (error) {
          throw new Error(`Analysis completion failed: ${error.message}`);
        }
        counts.analyzed += 1;
      } catch (error) {
        counts.failed += 1;
        if (job.attempts >= 3) counts.deadLettered += 1;
        const { error: failError } = await client.rpc("fail_analysis_job", {
          p_job_id: job.id,
          p_worker_id: ownerId,
          p_error_payload: {
            code: "analysis_failed",
            message: error instanceof Error ? error.message : String(error),
            retryable: job.attempts < 3,
          },
          p_next_available_at: new Date(Date.now() + 15 * 60_000).toISOString(),
        });
        if (failError) {
          throw new Error(
            `Analysis failure recording failed: ${failError.message}`,
          );
        }
      }
    });

    await finishRun(
      client,
      runId,
      counts.failed > 0 ? "partial" : "completed",
      counts,
    );
    return jsonResponse({
      status: counts.failed > 0 ? "partial" : "completed",
      counts,
    });
  } catch (error) {
    if (runId) await finishRun(client, runId, "failed", counts, error);
    console.error("analyze-posts failed", errorDetails(error));
    return jsonResponse({ error: errorDetails(error), counts }, 500);
  } finally {
    if (hasLease) await releaseLease(client, jobName, ownerId);
  }
});
