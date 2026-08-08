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

const signalPerformanceRow = {
  ticker: "COHR",
  company_name: "Coherent Corp.",
  signal_event_id: 17,
  signal_at: "2026-06-18T15:00:00.000Z",
  direction: "positive",
  directional_analyst_count: 3,
  bullish_analyst_count: 2,
  bearish_analyst_count: 1,
  calculation_version: "signal-v1.1-r0",
  analyst_snapshot: {},
  entry_session_date: "2026-06-19",
  entry_adjusted_open: "102.4",
  latest_price_date: "2026-07-31",
  latest_adjusted_close: "127.8",
  raw_return_to_date: "0.248",
  signed_return_to_date: "0.248",
  outcome_20d_status: "evaluable",
  outcome_20d_raw_return: "0.184",
  outcome_20d_signed_return: "0.184",
  outcome_20d_verdict: "aligned",
  latest_price_provider: "fixture",
  latest_price_fetched_at: "2026-08-01T00:00:00.000Z",
};

describe("mapOverviewRow", () => {
  it("normalizes nullable view fields and database numbers for the UI contract", () => {
    expect(
      mapOverviewRow(
        { ...overviewRow, is_watchlisted: true },
        [],
        signalPerformanceRow,
      ),
    ).toMatchObject({
      ticker: "COHR",
      totalMentions: 47,
      cumulativeSentiment: "positive",
      latestStance: "unknown",
      changeType: null,
      watchlisted: true,
      signalPerformance: {
        direction: "positive",
        signalAt: "2026-06-18T15:00:00.000Z",
        directionalAnalystCount: 3,
        bullishAnalystCount: 2,
        bearishAnalystCount: 1,
        entryAdjustedOpen: 102.4,
        latestAdjustedClose: 127.8,
        rawReturnToDate: 0.248,
        outcome20dVerdict: "aligned",
      },
    });
  });

  it("uses the verified Release 0 snapshot when the signal view is not deployed", () => {
    const result = mapOverviewRow(overviewRow);

    expect(result.signalPerformance).toMatchObject({
      direction: "positive",
      entryAdjustedOpen: 282.1199951171875,
      latestAdjustedClose: 262.8900146484375,
      rawReturnToDate: -0.0681624159987746,
      priceProvider: "release-0-validation",
    });
    expect(result.signalPerformance?.priceTrend).toHaveLength(20);
    expect(result.signalPerformance?.priceTrend.at(-1)).toEqual({
      date: "2026-07-31",
      close: 262.8900146484375,
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
