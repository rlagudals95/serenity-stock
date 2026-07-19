import { describe, expect, it } from "vitest";

import {
  buildSupabaseTickerDetail,
  mapOverviewRow,
  type OverviewViewRow,
} from "./repository";

const overviewRow: OverviewViewRow = {
  ticker: "COHR",
  company_name: "Coherent Corp.",
  total_mentions: "47",
  positive_count: 38,
  negative_count: 3,
  neutral_count: 2,
  mixed_count: 3,
  unknown_count: 1,
  cumulative_sentiment: "positive",
  latest_stance: null,
  latest_change_type: null,
  mentions_7d: 8,
  mentions_30d: 17,
  unique_threads: 12,
  last_mentioned_at: "2026-07-18T05:42:00.000Z",
  is_watchlisted: false,
  needs_review_count: 0,
};

describe("mapOverviewRow", () => {
  it("normalizes nullable view fields and database numbers for the UI contract", () => {
    expect(
      mapOverviewRow({ ...overviewRow, is_watchlisted: true }),
    ).toMatchObject({
      ticker: "COHR",
      totalMentions: 47,
      cumulativeSentiment: "positive",
      latestStance: "unknown",
      changeType: null,
      watchlisted: true,
    });
  });

  it("does not mix fixture research notes into Supabase ticker details", () => {
    expect(buildSupabaseTickerDetail(overviewRow, []).research).toEqual({
      priority: "medium",
      status: "unreviewed",
      note: "",
    });
  });

  it("keeps per-analyst history separate and marks opposing latest views", () => {
    const detail = buildSupabaseTickerDetail(overviewRow, [], [
      {
        ticker: "COHR",
        analyst_key: "serenity",
        analyst_name: "Serenity",
        x_username: "aleabitoreddit",
        total_mentions: 31,
        positive_count: 26,
        negative_count: 2,
        neutral_count: 1,
        mixed_count: 2,
        unknown_count: 0,
        latest_stance: "bullish",
        latest_claim: "광학 부품 수요가 강하다는 관점",
        latest_change_type: "repeat",
        first_mentioned_at: "2026-04-01T00:00:00.000Z",
        last_mentioned_at: "2026-07-18T05:42:00.000Z",
        latest_source_url: "https://x.com/aleabitoreddit/status/1",
      },
      {
        ticker: "COHR",
        analyst_key: "shay_boloor",
        analyst_name: "Shay Boloor",
        x_username: "StockSavvyShay",
        total_mentions: 16,
        positive_count: 5,
        negative_count: 9,
        neutral_count: 1,
        mixed_count: 1,
        unknown_count: 0,
        latest_stance: "bearish",
        latest_claim: "밸류에이션 부담을 더 크게 본다는 관점",
        latest_change_type: "stance_change",
        first_mentioned_at: "2026-05-10T00:00:00.000Z",
        last_mentioned_at: "2026-07-17T05:42:00.000Z",
        latest_source_url: "https://x.com/StockSavvyShay/status/2",
      },
    ]);

    expect(detail.analysts).toHaveLength(2);
    expect(detail.analystComparison).toBe("disagreement");
    expect(detail.analysts[1]).toMatchObject({
      key: "shay_boloor",
      name: "Shay Boloor",
      firstMentionedAt: "2026-05-10T00:00:00.000Z",
      latestStance: "bearish",
    });
  });
});
