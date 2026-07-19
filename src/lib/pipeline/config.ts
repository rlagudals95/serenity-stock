type Environment = Record<string, string | undefined>;

export interface PipelineConfig {
  supabaseUrl: string;
  supabaseSecretKey: string;
  rettiwtApiKey: string;
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

function rettiwtApiKey(environment: Environment) {
  const encoded = value(environment.RETTIWT_API_KEY);
  if (encoded) return encoded;

  const authToken = value(environment.X_AUTH_TOKEN);
  const ct0 = value(environment.X_CT0);
  const twid = value(environment.X_TWID);
  if (!authToken || !ct0 || !twid) return undefined;

  return Buffer.from(
    `auth_token=${authToken};ct0=${ct0};twid=${twid};`,
  ).toString("base64");
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
  const resolvedRettiwtApiKey = rettiwtApiKey(environment);
  const deepseekApiKey = value(environment.DEEPSEEK_API_KEY);
  const missing: string[] = [];

  if (!supabaseUrl) missing.push("SUPABASE_URL");
  if (!supabaseSecretKey) missing.push("SUPABASE_SECRET_KEY");
  if (!resolvedRettiwtApiKey) missing.push("RETTIWT_API_KEY");
  if (!deepseekApiKey) missing.push("DEEPSEEK_API_KEY");

  if (
    missing.length > 0 ||
    !supabaseUrl ||
    !supabaseSecretKey ||
    !resolvedRettiwtApiKey ||
    !deepseekApiKey
  ) {
    return { configured: false, missing };
  }

  return {
    configured: true,
    value: {
      supabaseUrl,
      supabaseSecretKey,
      rettiwtApiKey: resolvedRettiwtApiKey,
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
