import "server-only";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import type { PipelineConfig } from "./config";
import {
  createRettiwtClient,
  fetchRettiwtPostPage,
  fetchRettiwtUser,
  type StoredPost,
} from "./x";

export interface BackfillResult {
  startTime: string;
  endTime: string;
  fetched: number;
  inserted: number;
  duplicates: number;
  pages: number;
  oldestPostAt: string | null;
  newestPostAt: string | null;
  truncated: boolean;
  analysisEligible: false;
}

interface TrackedSource {
  analyst_key: string;
  x_username: string;
}

function backfillClient(config: PipelineConfig) {
  return createClient(config.supabaseUrl, config.supabaseSecretKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
    global: {
      headers: {
        "x-application-name": "serenity-history-backfill",
      },
    },
  });
}

async function findStoredAuthorId(
  client: SupabaseClient,
  username: string,
) {
  const { data, error } = await client
    .from("posts")
    .select("author_id")
    .ilike("author_username", username)
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(`Stored X author lookup failed: ${error.message}`);
  return data?.author_id as string | undefined;
}

function updateDateRange(result: BackfillResult, posts: StoredPost[]) {
  for (const post of posts) {
    if (!result.oldestPostAt || post.posted_at < result.oldestPostAt) {
      result.oldestPostAt = post.posted_at;
    }
    if (!result.newestPostAt || post.posted_at > result.newestPostAt) {
      result.newestPostAt = post.posted_at;
    }
  }
}

function runMetadata(
  config: PipelineConfig,
  result: BackfillResult,
  sources: TrackedSource[],
  activeSource?: TrackedSource,
  paginationToken?: string,
) {
  return {
    mode: "historical_backfill",
    source: "rettiwt",
    tracked_sources: sources.map((source) => ({
      key: source.analyst_key,
      username: source.x_username,
    })),
    active_source: activeSource?.analyst_key ?? null,
    start_time: result.startTime,
    end_time: result.endTime,
    max_posts: config.backfillMaxPosts,
    analysis_eligible: false,
    pages_completed: result.pages,
    next_pagination_token: paginationToken ?? null,
  };
}

async function finishRun(
  client: SupabaseClient,
  runId: string,
  status: "completed" | "failed",
  result: BackfillResult,
  config: PipelineConfig,
  sources: TrackedSource[],
  activeSource?: TrackedSource,
  paginationToken?: string,
  error?: unknown,
) {
  const errorPayload =
    error instanceof Error
      ? { code: "backfill_failed", message: error.message, retryable: true }
      : error
        ? { code: "backfill_failed", message: String(error), retryable: true }
        : null;
  await client
    .from("pipeline_runs")
    .update({
      status,
      finished_at: new Date().toISOString(),
      counts: result,
      error: errorPayload,
      metadata: runMetadata(
        config,
        result,
        sources,
        activeSource,
        paginationToken,
      ),
    })
    .eq("id", runId);
}

export async function backfillTrackedAnalystHistory(
  config: PipelineConfig,
): Promise<BackfillResult> {
  const client = backfillClient(config);
  const rettiwt = createRettiwtClient(config.rettiwtApiKey);
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
  const runId = crypto.randomUUID();
  const endTime = new Date(Date.now() - 10_000).toISOString();
  const startTime = new Date(
    new Date(endTime).getTime() - config.backfillDays * 86_400_000,
  ).toISOString();
  const result: BackfillResult = {
    startTime,
    endTime,
    fetched: 0,
    inserted: 0,
    duplicates: 0,
    pages: 0,
    oldestPostAt: null,
    newestPostAt: null,
    truncated: false,
    analysisEligible: false,
  };

  const { error: runError } = await client.from("pipeline_runs").insert({
    id: runId,
    job_name: "ingest_x_posts",
    status: "running",
    counts: result,
    metadata: runMetadata(config, result, sources),
  });
  if (runError) {
    throw new Error(`Backfill run creation failed: ${runError.message}`);
  }

  let paginationToken: string | undefined;
  let activeSource: TrackedSource | undefined;

  try {
    const seenIds = new Set<string>();
    for (let sourceIndex = 0; sourceIndex < sources.length; sourceIndex += 1) {
      activeSource = sources[sourceIndex];
      paginationToken = undefined;
      const remainingBudget = config.backfillMaxPosts - result.fetched;
      const remainingSources = sources.length - sourceIndex;
      const sourceBudget = Math.max(
        1,
        Math.floor(remainingBudget / remainingSources),
      );
      let sourceFetched = 0;
      const storedAuthorId = await findStoredAuthorId(
        client,
        activeSource.x_username,
      );
      const user = storedAuthorId
        ? { id: storedAuthorId }
        : await fetchRettiwtUser(rettiwt, activeSource.x_username);

      while (
        sourceFetched < sourceBudget &&
        result.fetched < config.backfillMaxPosts
      ) {
        const page = await fetchRettiwtPostPage(rettiwt, {
          userId: user.id,
          username: activeSource.x_username,
          startTime,
          endTime,
          paginationToken,
          pageSize: Math.min(100, sourceBudget - sourceFetched),
        });
        result.pages += 1;

        const uniquePosts: StoredPost[] = [];
        const pageBudget = Math.min(
          sourceBudget - sourceFetched,
          config.backfillMaxPosts - result.fetched,
        );
        for (const post of page.posts) {
          if (uniquePosts.length >= pageBudget) break;
          if (seenIds.has(post.x_post_id)) {
            result.duplicates += 1;
            continue;
          }
          seenIds.add(post.x_post_id);
          uniquePosts.push(post);
        }
        sourceFetched += uniquePosts.length;
        result.fetched += uniquePosts.length;
        updateDateRange(result, uniquePosts);

        if (uniquePosts.length > 0) {
          const postIds = uniquePosts.map((post) => post.x_post_id);
          const { data: existing, error: lookupError } = await client
            .from("posts")
            .select("x_post_id")
            .in("x_post_id", postIds);
          if (lookupError) {
            throw new Error(
              `Backfill duplicate lookup failed: ${lookupError.message}`,
            );
          }
          const existingIds = new Set(
            (existing ?? []).map((post) => post.x_post_id as string),
          );
          result.duplicates += existingIds.size;

          const { error: insertError } = await client.from("posts").upsert(
            uniquePosts.map((post) => ({
              ...post,
              analysis_eligible: false,
            })),
            { onConflict: "x_post_id", ignoreDuplicates: true },
          );
          if (insertError) {
            throw new Error(
              `Backfill post upsert failed: ${insertError.message}`,
            );
          }
          result.inserted += uniquePosts.length - existingIds.size;
        }

        paginationToken = page.nextToken;
        if (sourceFetched >= sourceBudget && paginationToken) {
          result.truncated = true;
        }
        const { error: progressError } = await client
          .from("pipeline_runs")
          .update({
            counts: result,
            metadata: runMetadata(
              config,
              result,
              sources,
              activeSource,
              paginationToken,
            ),
          })
          .eq("id", runId);
        if (progressError) {
          throw new Error(
            `Backfill progress update failed: ${progressError.message}`,
          );
        }

        if (!paginationToken || page.posts.length === 0) break;
      }
    }

    await finishRun(
      client,
      runId,
      "completed",
      result,
      config,
      sources,
      activeSource,
      paginationToken,
    );
    return result;
  } catch (error) {
    await finishRun(
      client,
      runId,
      "failed",
      result,
      config,
      sources,
      activeSource,
      paginationToken,
      error,
    );
    throw error;
  }
}
