import { describe, expect, it } from "vitest";

import { resolvePipelineConfig } from "./config";

describe("resolvePipelineConfig", () => {
  it("reports every missing credential required for a real sync", () => {
    expect(resolvePipelineConfig({})).toEqual({
      configured: false,
      missing: [
        "SUPABASE_URL",
        "SUPABASE_SECRET_KEY",
        "RETTIWT_API_KEY",
        "DEEPSEEK_API_KEY",
      ],
    });
  });

  it("builds a cost-bounded source-agnostic sync configuration", () => {
    expect(
      resolvePipelineConfig({
        SUPABASE_URL: "https://serenity.supabase.co",
        SUPABASE_SECRET_KEY: "sb_secret_test",
        RETTIWT_API_KEY: "rettiwt-session",
        DEEPSEEK_API_KEY: "deepseek-token",
        SERENITY_SYNC_MAX_POSTS: "750",
        SERENITY_ANALYSIS_BATCH_SIZE: "250",
        SERENITY_BACKFILL_DAYS: "120",
        SERENITY_BACKFILL_MAX_POSTS: "1500",
      }),
    ).toEqual({
      configured: true,
      value: {
        supabaseUrl: "https://serenity.supabase.co",
        supabaseSecretKey: "sb_secret_test",
        rettiwtApiKey: "rettiwt-session",
        xPostProvider: "rettiwt",
        deepseekApiKey: "deepseek-token",
        deepseekModel: "deepseek-v4-flash",
        maxPosts: 500,
        analysisBatchSize: 100,
        backfillDays: 90,
        backfillMaxPosts: 1000,
      },
    });
  });

  it("derives the Rettiwt key from X session cookies without persisting a duplicate", () => {
    const result = resolvePipelineConfig({
      SUPABASE_URL: "https://serenity.supabase.co",
      SUPABASE_SECRET_KEY: "sb_secret_test",
      X_AUTH_TOKEN: "auth-value",
      X_CT0: "ct0-value",
      X_TWID: "u%3D123",
      DEEPSEEK_API_KEY: "deepseek-token",
    });

    expect(result).toMatchObject({
      configured: true,
      value: {
        rettiwtApiKey: Buffer.from(
          "auth_token=auth-value;ct0=ct0-value;twid=u%3D123;",
        ).toString("base64"),
      },
    });
  });

  it("defaults the X post provider to Rettiwt", () => {
    const result = resolvePipelineConfig({
      SUPABASE_URL: "https://serenity.supabase.co",
      SUPABASE_SECRET_KEY: "sb_secret_test",
      RETTIWT_API_KEY: "rettiwt-session",
      DEEPSEEK_API_KEY: "deepseek-token",
    });

    expect(result).toMatchObject({
      configured: true,
      value: { xPostProvider: "rettiwt" },
    });
  });

  it("rejects an unsupported X post provider", () => {
    expect(() =>
      resolvePipelineConfig({
        SUPABASE_URL: "https://serenity.supabase.co",
        SUPABASE_SECRET_KEY: "sb_secret_test",
        RETTIWT_API_KEY: "rettiwt-session",
        DEEPSEEK_API_KEY: "deepseek-token",
        X_POST_PROVIDER: "unknown",
      }),
    ).toThrow("Unsupported X_POST_PROVIDER: unknown");
  });
});
