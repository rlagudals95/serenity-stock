import { describe, expect, it } from "vitest";

import { tickerOverviewFixtures } from "./fixtures";
import { buildProofOverview, proofDisplay } from "./proof-model";
import type { TickerOverview } from "./types";

function withPerformance(
  row: TickerOverview,
  updates: Partial<NonNullable<TickerOverview["signalPerformance"]>>,
) {
  if (!row.signalPerformance) throw new Error("fixture requires performance");
  return {
    ...row,
    signalPerformance: { ...row.signalPerformance, ...updates },
  };
}

describe("ticker proof model", () => {
  it("hides a percentage below ten completed samples", () => {
    expect(proofDisplay({ hitCount: 7, sampleSize: 9 })).toEqual({
      state: "building",
      label: "검증 중",
      detail: "판정 완료 9건",
      rate: null,
    });
  });

  it("shows the raw rate and sample once the threshold is met", () => {
    expect(proofDisplay({ hitCount: 7, sampleSize: 10 })).toEqual({
      state: "verified",
      label: "70%",
      detail: "판정 완료 10건",
      rate: 0.7,
    });
  });

  it("uses current positive returns only as tracking cases", () => {
    const overview = buildProofOverview(tickerOverviewFixtures);

    expect(overview.state).toBe("tracking");
    expect(overview.completedCount).toBe(0);
    expect(overview.cases.length).toBeGreaterThan(0);
    expect(overview.cases.every((item) => item.state === "tracking")).toBe(
      true,
    );
  });

  it("selects recent completed hits and counts misses beside them", () => {
    const aaoi = withPerformance(tickerOverviewFixtures[1], {
      latestPriceDate: "2026-08-07",
      outcome20dStatus: "evaluable",
      outcome20dRawReturn: 0.18,
      outcome20dVerdict: "aligned",
    });
    const lite = withPerformance(tickerOverviewFixtures[2], {
      latestPriceDate: "2026-08-06",
      outcome20dStatus: "evaluable",
      outcome20dRawReturn: -0.04,
      outcome20dVerdict: "opposed",
    });

    const overview = buildProofOverview([lite, aaoi]);

    expect(overview).toMatchObject({
      state: "completed",
      completedCount: 2,
      hitCount: 1,
      missCount: 1,
      latestResultAt: "2026-08-07",
    });
    expect(overview.cases.map((item) => item.ticker)).toEqual(["AAOI"]);
    expect(overview.cases[0].state).toBe("completed");
  });
});
