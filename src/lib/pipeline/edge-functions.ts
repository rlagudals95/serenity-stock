export interface HostedPipelineConfig {
  supabaseUrl: string;
  cronSecret: string;
}

export interface ScheduledFunctionResult {
  status: "completed" | "partial" | "skipped";
  counts?: Record<string, number>;
  reason?: string;
}

type ScheduledFunctionName = "ingest-x" | "analyze-posts";
type Environment = Record<string, string | undefined>;

function requiredValue(value: string | undefined, name: string) {
  const normalized = value?.trim();
  if (!normalized) {
    throw new Error(`Hosted pipeline configuration is incomplete: ${name}`);
  }
  return normalized;
}

export function getHostedPipelineConfig(
  environment: Environment = process.env,
): HostedPipelineConfig {
  return {
    supabaseUrl: requiredValue(
      environment.SUPABASE_URL ?? environment.NEXT_PUBLIC_SUPABASE_URL,
      "SUPABASE_URL",
    ),
    cronSecret: requiredValue(
      environment.SERENITY_CRON_SECRET,
      "SERENITY_CRON_SECRET",
    ),
  };
}

export async function invokeScheduledFunction(
  functionName: ScheduledFunctionName,
  config: HostedPipelineConfig,
  fetcher: typeof fetch = fetch,
): Promise<ScheduledFunctionResult> {
  const baseUrl = config.supabaseUrl.replace(/\/+$/, "");
  const response = await fetcher(
    `${baseUrl}/functions/v1/${functionName}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-serenity-cron-secret": config.cronSecret,
      },
      body: "{}",
      signal: AbortSignal.timeout(140_000),
    },
  );
  const body = (await response.json().catch(() => null)) as
    | ScheduledFunctionResult
    | { error?: { message?: string } | string }
    | null;
  if (!response.ok) {
    const errorBody = body as
      | { error?: { message?: string } | string }
      | null;
    const message =
      typeof errorBody?.error === "string"
        ? errorBody.error
        : errorBody?.error?.message
          ?? `${functionName} failed (${response.status})`;
    throw new Error(message);
  }
  return body as ScheduledFunctionResult;
}

export async function runHostedSync(
  config: HostedPipelineConfig,
  fetcher: typeof fetch = fetch,
) {
  const ingest = await invokeScheduledFunction("ingest-x", config, fetcher);
  const analysis = await invokeScheduledFunction(
    "analyze-posts",
    config,
    fetcher,
  );
  return { ingest, analysis };
}
