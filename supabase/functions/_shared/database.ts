import {
  createClient,
  type SupabaseClient,
} from "@supabase/supabase-js";

import { errorDetails } from "./http.ts";

export interface RunCounts {
  [key: string]: number;
}

export function createServiceClient(
  supabaseUrl: string,
  serviceRoleKey: string,
  applicationName: string,
) {
  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
    global: {
      headers: { "x-application-name": applicationName },
    },
  });
}

export async function acquireLease(
  client: SupabaseClient,
  jobName: string,
  ownerId: string,
) {
  const { data, error } = await client.rpc("acquire_pipeline_lease", {
    p_job_name: jobName,
    p_owner_id: ownerId,
    p_ttl_seconds: 600,
  });
  if (error) throw new Error(`Lease acquisition failed: ${error.message}`);
  return data === true;
}

export async function releaseLease(
  client: SupabaseClient,
  jobName: string,
  ownerId: string,
) {
  const { error } = await client.rpc("release_pipeline_lease", {
    p_job_name: jobName,
    p_owner_id: ownerId,
  });
  if (error) {
    console.error("Lease release failed", {
      jobName,
      message: error.message,
    });
  }
}

export async function startRun(
  client: SupabaseClient,
  jobName: "ingest_x_posts" | "analyze_posts",
  counts: RunCounts,
  metadata: Record<string, unknown>,
) {
  const id = crypto.randomUUID();
  const { error } = await client.from("pipeline_runs").insert({
    id,
    job_name: jobName,
    status: "running",
    counts,
    metadata,
  });
  if (error) throw new Error(`Pipeline run creation failed: ${error.message}`);
  return id;
}

export async function finishRun(
  client: SupabaseClient,
  runId: string,
  status: "completed" | "partial" | "failed",
  counts: RunCounts,
  error?: unknown,
) {
  const { error: updateError } = await client
    .from("pipeline_runs")
    .update({
      status,
      finished_at: new Date().toISOString(),
      counts,
      error: error ? errorDetails(error) : null,
    })
    .eq("id", runId);
  if (updateError) {
    console.error("Pipeline run completion failed", {
      runId,
      message: updateError.message,
    });
  }
}
