import { describe, expect, it } from "vitest";
import { tickerOverviewFixtures } from "./fixtures";
import { applyTickerQuery, defaultTickerQuery } from "./query";
import { selectBriefingCandidates } from "./briefing-selection";

const rows = () => structuredClone(tickerOverviewFixtures);

describe("recommendations across investor needs", () => {
  it("finds three distinct source-backed opportunities despite the old aggregate threshold", () => {
    expect(applyTickerQuery(rows(), defaultTickerQuery)).toHaveLength(1);
    const picks = selectBriefingCandidates(rows());
    expect(picks.map(p => [p.row.ticker, p.recommendation.lens])).toEqual([
      ["COHR", "evidence"], ["ASTS", "change"], ["RKLB", "growth"],
    ]);
    expect(picks[1].row.cumulativeSentiment).toBe("insufficient");
    for (const pick of picks) {
      expect(pick.recommendation.evidence.url).toMatch(/^https:\/\//);
      expect(pick.row.analysts?.some(a => a.latestClaim === pick.recommendation.evidence.text)).toBe(true);
    }
  });

  it("does not fill slots with unsourced, negative or duplicate stocks", () => {
    const candidates = rows();
    for (const row of candidates) {
      if (row.ticker !== "COHR") row.analysts = row.analysts?.map(a => ({ ...a, latestSourceUrl: null }));
    }
    candidates.push(candidates[0]);
    const picks = selectBriefingCandidates(candidates);
    expect(picks).toHaveLength(1);
    expect(picks[0].row.ticker).toBe("COHR");
    expect(selectBriefingCandidates(rows().filter(r => r.ticker === "LITE"))).toEqual([]);
  });

  it("labels fallback comparisons honestly when growth and new claims are absent", () => {
    const candidates = rows().filter(r => ["COHR", "ASTS", "RKLB"].includes(r.ticker)).map(row => ({
      ...row, analysts: row.analysts?.map(a => ({ ...a, latestClaim: "실적에서 주문을 확인해야 한다는 의견", latestChangeType: "repeat" as const })),
    }));
    const picks = selectBriefingCandidates(candidates);
    expect(picks).toHaveLength(3);
    expect(picks.map(p => p.recommendation.lens)).toEqual(["evidence", "compare", "compare"]);
  });

  it("keeps selection stable across input order and attributes the correct growth claim", () => {
    const picks = selectBriefingCandidates(rows().reverse());
    expect(picks.map(p => p.row.ticker)).toEqual(selectBriefingCandidates(rows()).map(p => p.row.ticker));
    const growth = picks.find(p => p.recommendation.lens === "growth")!;
    expect(growth.recommendation.evidence.text).toContain("반복 매출");
    expect(growth.recommendation.completedSamples).toBe(0);
  });
});
