import { describe, expect, it, vi } from "vitest";

import {
  applyTickerQuery,
  getCumulativeSentiment,
  paginateTickerRows,
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
    signalPerformance: {
      direction: "positive",
      signalAt: "2026-06-18T15:00:00.000Z",
      directionalAnalystCount: 3,
      bullishAnalystCount: 3,
      bearishAnalystCount: 0,
      entrySessionDate: "2026-06-19",
      entryAdjustedOpen: 102.4,
      latestPriceDate: "2026-07-31",
      latestAdjustedClose: 127.8,
      rawReturnToDate: 0.248,
      outcome20dStatus: "evaluable",
      outcome20dRawReturn: 0.184,
      outcome20dVerdict: "aligned",
      calculationVersion: "signal-v1.1-r0",
      priceProvider: "fixture",
      priceTrend: [],
    },
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

  it("requires an exact two-thirds analyst majority", () => {
    expect(
      getCumulativeSentiment({ positiveCount: 7, negativeCount: 3 }),
    ).toBe("positive");
    expect(
      getCumulativeSentiment({ positiveCount: 13, negativeCount: 7 }),
    ).toBe("mixed");
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
      view: "verified",
      sentiment: "positive",
      stance: "all",
      change: "all",
      period: "all",
      sort: "mentions7d",
      order: "asc",
      page: 1,
    });

    expect(
      parseTickerQuery(
        new URLSearchParams("sentiment=magic&sort=invalid&order=sideways"),
      ),
    ).toMatchObject({
      sentiment: "all",
      view: "verified",
      sort: "totalMentions",
      order: "desc",
      page: 1,
    });
  });

  it("accepts discovery views and normalizes the page number", () => {
    expect(
      parseTickerQuery(new URLSearchParams("view=momentum&page=3")),
    ).toMatchObject({ view: "momentum", page: 3 });

    expect(
      parseTickerQuery(new URLSearchParams("view=unknown&page=-2")),
    ).toMatchObject({ view: "verified", page: 1 });
  });
});

describe("applyTickerQuery", () => {
  it("ranks verified candidates by sample-aware proof before mention volume", () => {
    const candidate = rows[1];
    const proofRows = [
      {
        ...candidate,
        ticker: "SMALL",
        totalMentions: 100,
        proofMetrics: {
          currentBullishAnalystCount: 4,
          hitCount: 1,
          sampleSize: 1,
          hitRate: 1,
          wilsonScore: 0.2065,
        },
      },
      {
        ...candidate,
        ticker: "SOLID",
        totalMentions: 10,
        proofMetrics: {
          currentBullishAnalystCount: 3,
          hitCount: 17,
          sampleSize: 24,
          hitRate: 17 / 24,
          wilsonScore: 0.5086,
        },
      },
      {
        ...candidate,
        ticker: "PROVEN",
        totalMentions: 20,
        proofMetrics: {
          currentBullishAnalystCount: 2,
          hitCount: 7,
          sampleSize: 10,
          hitRate: 0.7,
          wilsonScore: 0.3968,
        },
      },
    ];

    expect(applyTickerQuery(proofRows, {}).map((row) => row.ticker)).toEqual([
      "SOLID",
      "PROVEN",
      "SMALL",
    ]);
  });

  it("shows current positive consensus before performance history is available", () => {
    expect(applyTickerQuery(rows, {}).map((row) => row.ticker)).toEqual([
      "COHR",
      "AAOI",
    ]);
  });

  it("matches ticker and company names without case sensitivity", () => {
    const byTicker = applyTickerQuery(rows, { q: "coh", view: "all" });
    const byCompany = applyTickerQuery(rows, { q: "opto", view: "all" });

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

  it("separates momentum, risk changes, and the verified universe", () => {
    expect(
      applyTickerQuery(rows, { view: "changes" }).map((row) => row.ticker),
    ).toEqual(["LITE", "AAOI"]);

    expect(
      applyTickerQuery(rows, { view: "momentum" }).map((row) => row.ticker),
    ).toEqual(["COHR", "LITE"]);

    expect(
      applyTickerQuery(rows, { view: "all" }).map((row) => row.ticker),
    ).toEqual(["COHR", "AAOI", "LITE"]);
  });

  it("never exposes rows whose ticker identity is unresolved", () => {
    const unresolved = {
      ...rows[0],
      ticker: "SHAZ",
      companyName: "Shazam (not a publicly traded company; likely ticker error)",
    };

    expect(
      applyTickerQuery([...rows, unresolved], { view: "all" }).some(
        (row) => row.ticker === "SHAZ",
      ),
    ).toBe(false);
  });

  it("sorts deterministically and uses ticker as the tie breaker", () => {
    const tiedRows = rows.map((row) => ({ ...row, totalMentions: 10 }));
    const result = applyTickerQuery(tiedRows, {
      view: "all",
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

describe("paginateTickerRows", () => {
  it("returns a bounded page and clamps an out-of-range page", () => {
    const repeated = Array.from({ length: 65 }, (_, index) => ({ index }));

    expect(paginateTickerRows(repeated, 2, 30)).toMatchObject({
      page: 2,
      pageCount: 3,
      total: 65,
    });
    expect(paginateTickerRows(repeated, 2, 30).rows).toHaveLength(30);
    expect(paginateTickerRows(repeated, 99, 30)).toMatchObject({
      page: 3,
      pageCount: 3,
    });
  });
});
