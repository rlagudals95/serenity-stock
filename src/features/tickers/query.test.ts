import { describe, expect, it, vi } from "vitest";

import {
  applyTickerQuery,
  getCumulativeSentiment,
  parseTickerQuery,
} from "./query";

const rows = [
  {
    ticker: "AAOI",
    companyName: "Applied Optoelectronics",
    totalMentions: 31,
    positiveCount: 20,
    negativeCount: 4,
    neutralCount: 3,
    mixedCount: 4,
    unknownCount: 0,
    cumulativeSentiment: "positive",
    latestStance: "mixed",
    changeType: "new_risk",
    mentions7d: 2,
    mentions30d: 12,
    lastMentionedAt: "2026-07-17T08:00:00.000Z",
    watchlisted: false,
    reviewCount: 1,
  },
  {
    ticker: "COHR",
    companyName: "Coherent Corp.",
    totalMentions: 47,
    positiveCount: 38,
    negativeCount: 3,
    neutralCount: 2,
    mixedCount: 3,
    unknownCount: 1,
    cumulativeSentiment: "positive",
    latestStance: "bullish",
    changeType: "new_claim",
    mentions7d: 8,
    mentions30d: 17,
    lastMentionedAt: "2026-07-18T05:42:00.000Z",
    watchlisted: true,
    reviewCount: 0,
  },
  {
    ticker: "LITE",
    companyName: "Lumentum Holdings",
    totalMentions: 12,
    positiveCount: 2,
    negativeCount: 7,
    neutralCount: 1,
    mixedCount: 2,
    unknownCount: 0,
    cumulativeSentiment: "negative",
    latestStance: "bearish",
    changeType: "stance_change",
    mentions7d: 5,
    mentions30d: 9,
    lastMentionedAt: "2026-07-18T02:20:00.000Z",
    watchlisted: true,
    reviewCount: 0,
  },
] as const;

describe("getCumulativeSentiment", () => {
  it("returns insufficient when fewer than three directional mentions exist", () => {
    expect(
      getCumulativeSentiment({ positiveCount: 1, negativeCount: 1 }),
    ).toBe("insufficient");
  });

  it("uses the 65/35 thresholds for positive, mixed, and negative labels", () => {
    expect(
      getCumulativeSentiment({ positiveCount: 7, negativeCount: 3 }),
    ).toBe("positive");
    expect(
      getCumulativeSentiment({ positiveCount: 5, negativeCount: 5 }),
    ).toBe("mixed");
    expect(
      getCumulativeSentiment({ positiveCount: 3, negativeCount: 7 }),
    ).toBe("negative");
  });
});

describe("parseTickerQuery", () => {
  it("normalizes known values and falls back for unsupported values", () => {
    expect(
      parseTickerQuery(
        new URLSearchParams(
          "q=coh&watchlist=true&sentiment=positive&sort=mentions7d&order=asc",
        ),
      ),
    ).toEqual({
      q: "coh",
      watchlist: true,
      sentiment: "positive",
      stance: "all",
      change: "all",
      period: "all",
      sort: "mentions7d",
      order: "asc",
    });

    expect(
      parseTickerQuery(
        new URLSearchParams("sentiment=magic&sort=invalid&order=sideways"),
      ),
    ).toMatchObject({
      sentiment: "all",
      sort: "totalMentions",
      order: "desc",
    });
  });
});

describe("applyTickerQuery", () => {
  it("matches ticker and company names without case sensitivity", () => {
    const byTicker = applyTickerQuery(rows, { q: "coh" });
    const byCompany = applyTickerQuery(rows, { q: "opto" });

    expect(byTicker.map((row) => row.ticker)).toEqual(["COHR"]);
    expect(byCompany.map((row) => row.ticker)).toEqual(["AAOI"]);
  });

  it("combines watchlist and sentiment filters", () => {
    const result = applyTickerQuery(rows, {
      watchlist: true,
      sentiment: "positive",
    });

    expect(result.map((row) => row.ticker)).toEqual(["COHR"]);
  });

  it("sorts deterministically and uses ticker as the tie breaker", () => {
    const tiedRows = rows.map((row) => ({ ...row, totalMentions: 10 }));
    const result = applyTickerQuery(tiedRows, {
      sort: "totalMentions",
      order: "desc",
    });

    expect(result.map((row) => row.ticker)).toEqual([
      "AAOI",
      "COHR",
      "LITE",
    ]);
  });

  it("uses the current time by default for relative period filters", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-18T09:00:00.000Z"));
    const staleRow = {
      ...rows[0],
      lastMentionedAt: "2026-07-18T08:00:00.000Z",
    };

    expect(applyTickerQuery([staleRow], { period: "24h" })).toHaveLength(0);
    vi.useRealTimers();
  });
});
