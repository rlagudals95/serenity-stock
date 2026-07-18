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
});
