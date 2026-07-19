type Environment = Record<string, string | undefined>;

export interface PipelineConfig {
  supabaseUrl: string;
  supabaseSecretKey: string;
  xBearerToken: string;
  deepseekApiKey: string;
  deepseekModel: string;
  maxPosts: number;
  analysisBatchSize: number;
  backfillDays: number;
  backfillMaxPosts: number;
}

export type PipelineConfigResult =
  | { configured: true; value: PipelineConfig }
  | { configured: false; missing: string[] };

function value(input: string | undefined) {
  return input?.trim() || undefined;
}

function boundedInteger(
  input: string | undefined,
  fallback: number,
  minimum: number,
  maximum: number,
) {
  const parsed = Number.parseInt(input ?? "", 10);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(maximum, Math.max(minimum, parsed));
}

export function resolvePipelineConfig(
  environment: Environment,
): PipelineConfigResult {
  const supabaseUrl =
    value(environment.SUPABASE_URL) ??
    value(environment.NEXT_PUBLIC_SUPABASE_URL);
  const supabaseSecretKey =
    value(environment.SUPABASE_SECRET_KEY) ??
    value(environment.SUPABASE_SERVICE_ROLE_KEY);
  const xBearerToken = value(environment.X_API_BEARER_TOKEN);
  const deepseekApiKey = value(environment.DEEPSEEK_API_KEY);
  const missing: string[] = [];

  if (!supabaseUrl) missing.push("SUPABASE_URL");
  if (!supabaseSecretKey) missing.push("SUPABASE_SECRET_KEY");
  if (!xBearerToken) missing.push("X_API_BEARER_TOKEN");
  if (!deepseekApiKey) missing.push("DEEPSEEK_API_KEY");

  if (
    missing.length > 0 ||
    !supabaseUrl ||
    !supabaseSecretKey ||
    !xBearerToken ||
    !deepseekApiKey
  ) {
    return { configured: false, missing };
  }

  return {
    configured: true,
    value: {
      supabaseUrl,
      supabaseSecretKey,
      xBearerToken,
      deepseekApiKey,
      deepseekModel:
        value(environment.DEEPSEEK_MODEL) ?? "deepseek-v4-flash",
      maxPosts: boundedInteger(
        environment.SERENITY_SYNC_MAX_POSTS,
        100,
        10,
        500,
      ),
      analysisBatchSize: boundedInteger(
        environment.SERENITY_ANALYSIS_BATCH_SIZE,
        25,
        1,
        100,
      ),
      backfillDays: boundedInteger(
        environment.SERENITY_BACKFILL_DAYS,
        60,
        1,
        90,
      ),
      backfillMaxPosts: boundedInteger(
        environment.SERENITY_BACKFILL_MAX_POSTS,
        700,
        100,
        1000,
      ),
    },
  };
}

export function getPipelineConfig(environment = process.env) {
  const result = resolvePipelineConfig(environment);
  if (!result.configured) {
    throw new Error(
      `Pipeline configuration is incomplete: ${result.missing.join(", ")}`,
    );
  }
  return result.value;
}
