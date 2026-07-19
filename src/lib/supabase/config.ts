type SupabaseEnvironment = Record<string, string | undefined>;

export type SupabaseDataConfig =
  | { mode: "fixture" }
  | {
      mode: "supabase";
      url: string;
      apiKey: string;
      access: "secret" | "public";
    };

function configured(value: string | undefined) {
  const normalized = value?.trim();
  return normalized ? normalized : undefined;
}

export function resolveSupabaseDataConfig(
  environment: SupabaseEnvironment,
): SupabaseDataConfig {
  if (environment.SERENITY_FIXTURE_MODE?.trim() === "true") {
    return { mode: "fixture" };
  }

  const url =
    configured(environment.SUPABASE_URL) ??
    configured(environment.NEXT_PUBLIC_SUPABASE_URL);
  const secretKey =
    configured(environment.SUPABASE_SECRET_KEY) ??
    configured(environment.SUPABASE_SERVICE_ROLE_KEY);
  const publishableKey = configured(
    environment.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  );
  const hasSupabaseVariable = Boolean(url || secretKey || publishableKey);

  if (!hasSupabaseVariable) {
    return { mode: "fixture" };
  }

  if (secretKey && url) {
    return {
      mode: "supabase",
      url,
      apiKey: secretKey,
      access: "secret",
    };
  }

  if (url && publishableKey && !secretKey) {
    return { mode: "fixture" };
  }

  if (!url || !secretKey) {
    throw new Error(
      "Supabase configuration is incomplete. Set a project URL and an API key.",
    );
  }

  return { mode: "fixture" };
}
