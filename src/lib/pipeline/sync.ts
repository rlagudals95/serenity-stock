import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import {
  createPipelineClient,
  ensureAnalysisConfig,
  processAvailableAnalysisJobs,
} from "./analysis-worker";
import type { PipelineConfig } from "./config";
import {
  fetchXPosts,
  fetchXUser,
} from "./x";

export interface SyncResult {
  fetched: number;
  inserted: number;
  duplicates: number;
  jobsCreated: number;
  analyzed: number;
  failed: number;
}

async function findSourceCursor(
  client: SupabaseClient,
  username: string,
): Promise<{ userId?: string; sinceId?: string; storedCount: number }> {
  const sourcePattern = `https://x.com/${username}/status/%`;
  const [latest, total] = await Promise.all([
    client
      .from("posts")
      .select("author_id,x_post_id")
      .like("url", sourcePattern)
      .order("posted_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    client
      .from("posts")
      .select("id", { count: "exact", head: true })
      .like("url", sourcePattern),
  ]);

  if (latest.error) {
    throw new Error(`Source cursor lookup failed: ${latest.error.message}`);
  }
  if (total.error) {
    throw new Error(`Source post count failed: ${total.error.message}`);
  }
  return {
    userId: latest.data?.author_id,
    sinceId: latest.data?.x_post_id,
    storedCount: total.count ?? 0,
  };
}

async function finishPipelineRun(
  client: SupabaseClient,
  runId: string,
  status: "completed" | "partial" | "failed",
  result: SyncResult,
  error?: unknown,
) {
  const errorPayload =
    error instanceof Error
      ? { code: "sync_failed", message: error.message }
      : error
        ? { code: "sync_failed", message: String(error) }
        : null;
  await client
    .from("pipeline_runs")
    .update({
      status,
      finished_at: new Date().toISOString(),
      counts: result,
      error: errorPayload,
    })
    .eq("id", runId);
}

export async function syncSerenity(config: PipelineConfig): Promise<SyncResult> {
  const client = createPipelineClient(config, "serenity-local-sync");
  const runId = crypto.randomUUID();
  const result: SyncResult = {
    fetched: 0,
    inserted: 0,
    duplicates: 0,
    jobsCreated: 0,
    analyzed: 0,
    failed: 0,
  };

  const { error: runError } = await client.from("pipeline_runs").insert({
    id: runId,
    job_name: "ingest_x_posts",
    status: "running",
    counts: result,
    metadata: {
      source: "x",
      username: config.xUsername,
      model: config.deepseekModel,
      max_posts: config.maxPosts,
      analysis_batch_size: config.analysisBatchSize,
    },
  });
  if (runError) {
    throw new Error(`Pipeline run creation failed: ${runError.message}`);
  }

  try {
    await ensureAnalysisConfig(client, config.deepseekModel);
    const cursor = await findSourceCursor(client, config.xUsername);
    const isBackfill = cursor.storedCount < config.maxPosts;
    const user = cursor.userId
      ? { id: cursor.userId }
      : await fetchXUser(config.xUsername, config.xBearerToken);
    const fetchedPosts = await fetchXPosts({
      userId: user.id,
      username: config.xUsername,
      bearerToken: config.xBearerToken,
      sinceId: isBackfill ? undefined : cursor.sinceId,
      maxResults: config.maxPosts,
    });
    const posts = [
      ...new Map(
        fetchedPosts.map((post) => [post.x_post_id, post]),
      ).values(),
    ];
    result.fetched = posts.length;

    if (posts.length > 0) {
      const postIds = posts.map((post) => post.x_post_id);
      const { count: existingCount, error: countError } = await client
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
      result.inserted = posts.length - (existingCount ?? 0);
      result.duplicates = existingCount ?? 0;
    }

    const { data: jobsCreated, error: enqueueError } = await client.rpc(
      "enqueue_missing_analysis_jobs",
      { p_batch_size: config.maxPosts },
    );
    if (enqueueError) {
      throw new Error(`Analysis job enqueue failed: ${enqueueError.message}`);
    }
    result.jobsCreated = Number(jobsCreated ?? 0);

    const work = await processAvailableAnalysisJobs(
      client,
      config,
      config.analysisBatchSize,
    );
    result.analyzed = work.analyzed;
    result.failed = work.failed;

    await finishPipelineRun(
      client,
      runId,
      result.failed > 0 ? "partial" : "completed",
      result,
    );
    return result;
  } catch (error) {
    await finishPipelineRun(client, runId, "failed", result, error);
    throw error;
  }
}
