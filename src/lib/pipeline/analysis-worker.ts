import "server-only";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import type { AnalysisPayload } from "./analysis-schema";
import type { PipelineConfig } from "./config";
import { analyzePostWithDeepSeek } from "./deepseek";
import type { AnalysisWorkResult } from "./held-analysis-core";
import {
  extractTickerCandidates,
  type StoredPost,
} from "./x";

interface AnalysisJob {
  id: number | string;
  post_id: number | string;
}

interface StoredPostRow {
  id: number | string;
  x_post_id: string;
  author_id: string;
  text: string;
  url: string;
  post_type: StoredPost["post_type"];
  conversation_id: string | null;
  referenced_post_ids: string[];
  posted_at: string;
  metrics: Record<string, number>;
  raw: StoredPost["raw"];
}

export function createPipelineClient(
  config: PipelineConfig,
  applicationName: string,
) {
  return createClient(config.supabaseUrl, config.supabaseSecretKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
    global: {
      headers: {
        "x-application-name": applicationName,
      },
    },
  });
}

export async function ensureAnalysisConfig(
  client: SupabaseClient,
  model: string,
): Promise<number | string> {
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

function toStoredPost(row: StoredPostRow): StoredPost {
  return {
    x_post_id: row.x_post_id,
    author_id: row.author_id,
    text: row.text,
    url: row.url,
    post_type: row.post_type,
    conversation_id: row.conversation_id,
    referenced_post_ids: row.referenced_post_ids,
    posted_at: row.posted_at,
    metrics: row.metrics,
    raw: row.raw,
  };
}

async function processInBatches<T>(
  items: T[],
  batchSize: number,
  worker: (item: T) => Promise<void>,
) {
  for (let index = 0; index < items.length; index += batchSize) {
    await Promise.all(items.slice(index, index + batchSize).map(worker));
  }
}

export async function processAvailableAnalysisJobs(
  client: SupabaseClient,
  config: PipelineConfig,
  batchSize: number,
): Promise<AnalysisWorkResult> {
  const result: AnalysisWorkResult = {
    claimed: 0,
    analyzed: 0,
    failed: 0,
  };
  const workerId = crypto.randomUUID();
  const { data: claimed, error: claimError } = await client.rpc(
    "claim_analysis_jobs",
    {
      p_worker_id: workerId,
      p_batch_size: batchSize,
    },
  );
  if (claimError) {
    throw new Error(`Analysis job claim failed: ${claimError.message}`);
  }

  const jobs = (claimed ?? []) as AnalysisJob[];
  result.claimed = jobs.length;
  const postIds = jobs.map((job) => job.post_id);
  const postById = new Map<string, StoredPostRow>();

  if (postIds.length > 0) {
    const { data, error } = await client
      .from("posts")
      .select("*")
      .in("id", postIds);
    if (error) throw new Error(`Claimed post lookup failed: ${error.message}`);
    for (const post of (data ?? []) as StoredPostRow[]) {
      postById.set(String(post.id), post);
    }
  }

  await processInBatches(jobs, 3, async (job) => {
    try {
      const row = postById.get(String(job.post_id));
      if (!row) throw new Error(`Post ${job.post_id} was not found.`);
      const post = toStoredPost(row);
      const analysis = await analyzePostWithDeepSeek({
        apiKey: config.deepseekApiKey,
        model: config.deepseekModel,
        post,
        candidates: extractTickerCandidates(post.text),
      });
      const payload = normalizeForDatabase(analysis.payload);
      await upsertTickers(client, payload);

      const { error } = await client.rpc("complete_analysis_job", {
        p_job_id: job.id,
        p_worker_id: workerId,
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
      result.analyzed += 1;
    } catch (error) {
      result.failed += 1;
      const message =
        error instanceof Error ? error.message : "Unknown analysis error";
      const { error: failError } = await client.rpc("fail_analysis_job", {
        p_job_id: job.id,
        p_worker_id: workerId,
        p_error_payload: {
          code: "analysis_failed",
          message,
          retryable: true,
        },
        p_next_available_at: new Date(Date.now() + 5 * 60_000).toISOString(),
      });
      if (failError) {
        throw new Error(`Analysis failure recording failed: ${failError.message}`);
      }
    }
  });

  return result;
}
