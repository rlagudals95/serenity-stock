export type IngestionMode = "scheduled" | "manual";
export type ScheduleDecision =
  | "due"
  | "not_due"
  | "auth_blocked"
  | "credential_changed";

export function parseIngestionMode(body: unknown): IngestionMode {
  const mode =
    body && typeof body === "object" && "mode" in body
      ? (body as { mode?: unknown }).mode
      : undefined;
  if (mode === undefined) return "manual";
  if (mode === "scheduled" || mode === "manual") return mode;
  throw new Error(`Unsupported ingestion mode: ${String(mode)}`);
}

export function alertRetryMinutes(completedAttempts: number) {
  if (completedAttempts <= 0) return 5;
  if (completedAttempts === 1) return 15;
  return 60;
}

export function alertDueCutoff(now = Date.now()) {
  return new Date(now + 5_000).toISOString();
}

export async function credentialFingerprint(credential: string) {
  const bytes = new TextEncoder().encode(credential);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)]
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

export function authenticationAlertEventKey(
  jobName: string,
  fingerprint: string,
) {
  return `${jobName}:auth:${fingerprint}`;
}

export function runAlertEventKey(jobName: string, runId: string) {
  return `${jobName}:run:${runId}`;
}

export function shouldContactX(decision: ScheduleDecision) {
  return decision === "due" || decision === "credential_changed";
}
