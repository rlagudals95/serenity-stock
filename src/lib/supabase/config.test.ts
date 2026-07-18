import { describe, expect, it } from "vitest";

import { resolveSupabaseDataConfig } from "./config";

describe("resolveSupabaseDataConfig", () => {
  it("uses fixture mode when no Supabase variables are present", () => {
    expect(resolveSupabaseDataConfig({})).toEqual({ mode: "fixture" });
  });

  it("uses the server-only secret key for hosted Supabase", () => {
    expect(
      resolveSupabaseDataConfig({
        SUPABASE_URL: "https://serenity.supabase.co",
        SUPABASE_SECRET_KEY: "sb_secret_test",
      }),
    ).toEqual({
      mode: "supabase",
      url: "https://serenity.supabase.co",
      apiKey: "sb_secret_test",
      access: "secret",
    });
  });

  it("keeps fixture mode when only legacy public variables are present", () => {
    expect(
      resolveSupabaseDataConfig({
        NEXT_PUBLIC_SUPABASE_URL: "https://serenity.supabase.co",
        NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_test",
      }),
    ).toEqual({ mode: "fixture" });
  });

  it("accepts the legacy service role key during migration", () => {
    expect(
      resolveSupabaseDataConfig({
        NEXT_PUBLIC_SUPABASE_URL: "https://serenity.supabase.co",
        SUPABASE_SERVICE_ROLE_KEY: "legacy-service-role",
      }),
    ).toEqual({
      mode: "supabase",
      url: "https://serenity.supabase.co",
      apiKey: "legacy-service-role",
      access: "secret",
    });
  });

  it("rejects incomplete configuration instead of silently using fixtures", () => {
    expect(() =>
      resolveSupabaseDataConfig({
        SUPABASE_URL: "https://serenity.supabase.co",
      }),
    ).toThrow(
      "Supabase configuration is incomplete. Set a project URL and an API key.",
    );
  });
});
