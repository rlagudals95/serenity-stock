import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import {
  createPipelineClient,
  ensureAnalysisConfig,
  processAvailableAnalysisJobs,
} from "./analysis-worker";
import type { PipelineConfig } from "./config";
import {
  runHeldAnalysisBatchCore,
  type AnalysisProgress,
  type HeldAnalysisBatchResult,
} from "./held-analysis-core";

async function activateHeldPosts(
  client: SupabaseClient,
  batchSize: number,
) {
  const { data, error } = await client
    .from("posts")
    .select("id")
    .eq("analysis_eligible", false)
    .neq("post_type", "repost")
    .order("posted_at", { ascending: true })
    .order("id", { ascending: true })
    .limit(batchSize);
  if (error) {
    throw new Error(`Held post lookup failed: ${error.message}`);
  }

  const ids = (data ?? []).map((post) => post.id as number | string);
  if (ids.length === 0) return 0;

  const { error: updateError } = await client
    .from("posts")
    .update({ analysis_eligible: true })
    .in("id", ids);
  if (updateError) {
    throw new Error(`Held post activation failed: ${updateError.message}`);
  }
  return ids.length;
}

async function countJobs(
  client: SupabaseClient,
  analysisConfigId: number | string,
  status: "pending" | "processing" | "failed" | "completed",
) {
  const { count, error } = await client
    .from("analysis_jobs")
    .select("id", { count: "exact", head: true })
    .eq("analysis_config_id", analysisConfigId)
    .eq("status", status);
  if (error) {
    throw new Error(`Analysis job progress lookup failed: ${error.message}`);
  }
  return count ?? 0;
}

async function getProgress(
  client: SupabaseClient,
  analysisConfigId: number | string,
): Promise<AnalysisProgress> {
  const [heldResult, pending, processing, retryableFailed, completed] =
    await Promise.all([
      client
        .from("posts")
        .select("id", { count: "exact", head: true })
        .eq("analysis_eligible", false)
        .neq("post_type", "repost"),
      countJobs(client, analysisConfigId, "pending"),
      countJobs(client, analysisConfigId, "processing"),
      countJobs(client, analysisConfigId, "failed"),
      countJobs(client, analysisConfigId, "completed"),
    ]);
  if (heldResult.error) {
    throw new Error(
      `Held post progress lookup failed: ${heldResult.error.message}`,
    );
  }

  return {
    held: heldResult.count ?? 0,
    pending,
    processing,
    retryableFailed,
    completed,
  };
}

async function finishRun(
  client: SupabaseClient,
  runId: string,
  status: "completed" | "partial" | "failed",
  counts: Record<string, number>,
  error?: unknown,
) {
  const errorPayload =
    error instanceof Error
      ? {
          code: "historical_analysis_failed",
          message: error.message,
          retryable: true,
        }
      : error
        ? {
            code: "historical_analysis_failed",
            message: String(error),
            retryable: true,
          }
        : null;
  await client
    .from("pipeline_runs")
    .update({
      status,
      finished_at: new Date().toISOString(),
      counts,
      error: errorPayload,
    })
    .eq("id", runId);
}

export async function analyzeHeldPostsBatch(
  config: PipelineConfig,
): Promise<HeldAnalysisBatchResult> {
  const client = createPipelineClient(
    config,
    "serenity-held-history-analysis",
  );
  const analysisConfigId = await ensureAnalysisConfig(
    client,
    config.deepseekModel,
  );
  const runId = crypto.randomUUID();
  const initialCounts = {
    activated: 0,
    jobsCreated: 0,
    claimed: 0,
    analyzed: 0,
    failed: 0,
    heldRemaining: 0,
    pending: 0,
    processing: 0,
    retryableFailed: 0,
    completed: 0,
  };
  const { error: runError } = await client.from("pipeline_runs").insert({
    id: runId,
    job_name: "analyze_posts",
    status: "running",
    counts: initialCounts,
    metadata: {
      mode: "historical_backfill_analysis",
      model: config.deepseekModel,
      analysis_config_id: analysisConfigId,
      batch_size: config.analysisBatchSize,
      source: "stored_posts",
    },
  });
  if (runError) {
    throw new Error(`Analysis run creation failed: ${runError.message}`);
  }

  try {
    const result = await runHeldAnalysisBatchCore({
      batchSize: config.analysisBatchSize,
      activateHeldPosts: (batchSize) =>
        activateHeldPosts(client, batchSize),
      enqueueJobs: async (batchSize) => {
        const { data, error } = await client.rpc(
          "enqueue_missing_analysis_jobs",
          { p_batch_size: batchSize },
        );
        if (error) {
          throw new Error(`Analysis job enqueue failed: ${error.message}`);
        }
        return Number(data ?? 0);
      },
      processAvailableJobs: (batchSize) =>
        processAvailableAnalysisJobs(client, config, batchSize),
      getProgress: () => getProgress(client, analysisConfigId),
    });
    await finishRun(
      client,
      runId,
      result.failed > 0 || result.retryableFailed > 0
        ? "partial"
        : "completed",
      { ...result },
    );
    return result;
  } catch (error) {
    await finishRun(client, runId, "failed", initialCounts, error);
    throw error;
  }
}
