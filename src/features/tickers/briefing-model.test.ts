import { describe, expect, it } from "vitest";
import { getFixtureTickerDetail } from "./fixtures";
import { buildTickerBrief, findOpinionChanges, opinionSnapshot, sourceHref } from "./briefing-model";

const detail = getFixtureTickerDetail("COHR")!;
const baseline = opinionSnapshot(detail);

describe("briefing evidence", () => {
  it("uses actual source evidence for expectations, risks, and next checks", () => {
    const brief = buildTickerBrief(detail, detail);
    expect(brief.expectation?.text).toBe(detail.analysts.find(a => a.latestStance === "bullish")?.latestClaim);
    expect(brief.risk?.text).toBe(detail.risks[0].text);
    expect(brief.nextCheck?.text).toBe(detail.catalysts[0].text);
  });
  it("does not invent missing risks or catalysts", () => {
    const brief = buildTickerBrief({ ...detail, analysts: [] });
    expect(brief.risk).toBeNull();
    expect(brief.expectation).toBeNull();
    expect(brief.nextCheck).toBeNull();
    expect(sourceHref("#")).toBeNull();
    expect(sourceHref("javascript:alert(1)")).toBeNull();
  });
});

describe("returning user's opinion changes", () => {
  it("does not claim prior knowledge for a first visit", () => {
    expect(findOpinionChanges(undefined, baseline)).toEqual([]);
    expect(findOpinionChanges(baseline, baseline)).toEqual([]);
  });
  it("ignores repeated opinions, whitespace and counts", () => {
    const current = structuredClone(baseline);
    current.sources[0].date = "2026-09-26T01:00:00Z";
    current.sources[0].claim += "  ";
    expect(findOpinionChanges(baseline, current)).toEqual([]);
    current.sources[0].claim = "새로운 문장";
    current.sources[0].change = "repeat";
    expect(findOpinionChanges(baseline, current)).toEqual([]);
  });
  it("surfaces a genuinely new risk and preserves the previous authored opinion", () => {
    const current = structuredClone(baseline);
    current.sources[0] = { ...current.sources[0], date: "2026-09-26T01:00:00Z", change: "new_risk", claim: "신규 주문 전환 지연 가능성" };
    const changes = findOpinionChanges(baseline, current);
    expect(changes).toHaveLength(1);
    expect(changes[0].before?.claim).toBe(baseline.sources[0].claim);
    expect(changes[0].after.claim).toBe("신규 주문 전환 지연 가능성");
    expect(findOpinionChanges(current, current)).toEqual([]);
  });
  it("does not call historical backfill a new update", () => {
    const current = structuredClone(baseline);
    current.sources[0] = { ...current.sources[0], date: "2025-01-01T00:00:00Z", change: "new_risk", claim: "과거 위험 의견" };
    expect(findOpinionChanges(baseline, current)).toEqual([]);
  });
});
