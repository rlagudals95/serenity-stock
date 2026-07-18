import { describe, expect, it } from "vitest";

import { resolvePipelineConfig } from "./config";

describe("resolvePipelineConfig", () => {
  it("reports every missing credential required for a real sync", () => {
    expect(resolvePipelineConfig({})).toEqual({
      configured: false,
      missing: [
        "SUPABASE_URL",
        "SUPABASE_SECRET_KEY",
        "X_API_BEARER_TOKEN",
        "DEEPSEEK_API_KEY",
      ],
    });
  });

  it("builds a cost-bounded Serenity sync configuration", () => {
    expect(
      resolvePipelineConfig({
        SUPABASE_URL: "https://serenity.supabase.co",
        SUPABASE_SECRET_KEY: "sb_secret_test",
        X_API_BEARER_TOKEN: "x-token",
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
        xBearerToken: "x-token",
        xUsername: "aleabitoreddit",
        deepseekApiKey: "deepseek-token",
        deepseekModel: "deepseek-v4-flash",
        maxPosts: 500,
        analysisBatchSize: 100,
        backfillDays: 90,
        backfillMaxPosts: 1000,
      },
    });
  });
});
