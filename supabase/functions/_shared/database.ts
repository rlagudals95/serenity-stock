import {
  createClient,
  type SupabaseClient,
} from "@supabase/supabase-js";

import {
  alertDueCutoff,
  alertRetryMinutes,
} from "./ingestion-control.ts";
import { errorDetails } from "./http.ts";

export interface RunCounts {
  [key: string]: number;
}

export type ScheduleDecision =
  | "due"
  | "not_due"
  | "auth_blocked"
  | "credential_changed";

export interface ScheduleClaim {
  decision: ScheduleDecision;
  nextRunAt: string;
  delayMinutes: number | null;
}

export interface PendingPipelineAlert {
  id: number;
  message: string;
  attempts: number;
}

export function normalizeScheduleClaim(value: unknown): ScheduleClaim {
  const row = Array.isArray(value) ? value[0] : undefined;
  if (!row || typeof row !== "object") {
    throw new Error("Invalid pipeline schedule claim response");
  }
  const candidate = row as Record<string, unknown>;
  if (
    !["due", "not_due", "auth_blocked", "credential_changed"].includes(
      String(candidate.decision),
    ) ||
    typeof candidate.next_run_at !== "string" ||
    !(
      candidate.delay_minutes === null ||
      typeof candidate.delay_minutes === "number"
    )
  ) {
    throw new Error("Invalid pipeline schedule claim response");
  }
  return {
    decision: candidate.decision as ScheduleDecision,
    nextRunAt: candidate.next_run_at,
    delayMinutes: candidate.delay_minutes as number | null,
  };
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

export async function claimPipelineSchedule(
  client: SupabaseClient,
  jobName: string,
  mode: "scheduled" | "manual",
  credentialFingerprint: string,
) {
  const { data, error } = await client.rpc("claim_pipeline_schedule", {
    p_job_name: jobName,
    p_mode: mode,
    p_credential_fingerprint: credentialFingerprint,
  });
  if (error) throw new Error(`Schedule claim failed: ${error.message}`);
  return normalizeScheduleClaim(data);
}

export async function enqueuePipelineAlert(
  client: SupabaseClient,
  alert: {
    eventKey: string;
    kind:
      | "ingestion_success"
      | "ingestion_failure"
      | "authentication_blocked"
      | "ingestion_recovery";
    message: string;
  },
) {
  const { error } = await client.from("pipeline_alerts").upsert(
    {
      event_key: alert.eventKey,
      kind: alert.kind,
      message: alert.message,
    },
    { onConflict: "event_key", ignoreDuplicates: true },
  );
  if (error) throw new Error(`Pipeline alert enqueue failed: ${error.message}`);
}

export async function blockPipelineAuthentication(
  client: SupabaseClient,
  input: {
    jobName: string;
    credentialFingerprint: string;
    eventKey: string;
    message: string;
  },
) {
  const { error } = await client.rpc("block_pipeline_auth", {
    p_job_name: input.jobName,
    p_credential_fingerprint: input.credentialFingerprint,
    p_event_key: input.eventKey,
    p_message: input.message,
  });
  if (error) throw new Error(`Authentication block failed: ${error.message}`);
}

export async function listDuePipelineAlerts(
  client: SupabaseClient,
  limit = 10,
): Promise<PendingPipelineAlert[]> {
  const { data, error } = await client
    .from("pipeline_alerts")
    .select("id,message,attempts")
    .eq("status", "pending")
    .lte("next_attempt_at", alertDueCutoff())
    .order("id")
    .limit(limit);
  if (error) throw new Error(`Pipeline alert lookup failed: ${error.message}`);
  return (data ?? []) as PendingPipelineAlert[];
}

export async function markPipelineAlertSent(
  client: SupabaseClient,
  alertId: number,
) {
  const { error } = await client
    .from("pipeline_alerts")
    .update({
      status: "sent",
      sent_at: new Date().toISOString(),
      last_error: null,
    })
    .eq("id", alertId)
    .eq("status", "pending");
  if (error) throw new Error(`Pipeline alert update failed: ${error.message}`);
}

export async function reschedulePipelineAlert(
  client: SupabaseClient,
  alert: PendingPipelineAlert,
  error: unknown,
) {
  const nextAttemptAt = new Date(
    Date.now() + alertRetryMinutes(alert.attempts) * 60_000,
  ).toISOString();
  const { error: updateError } = await client
    .from("pipeline_alerts")
    .update({
      attempts: alert.attempts + 1,
      next_attempt_at: nextAttemptAt,
      last_error: errorDetails(error),
    })
    .eq("id", alert.id)
    .eq("status", "pending");
  if (updateError) {
    throw new Error(
      `Pipeline alert reschedule failed: ${updateError.message}`,
    );
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
