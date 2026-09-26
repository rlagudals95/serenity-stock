import { describe, expect, it } from "vitest";
import { buildTickerBrief } from "./briefing-model";
import { getFixtureTickerDetail } from "./fixtures";
import { opportunityCopy } from "./opportunity-copy";

describe("source-backed opportunity hooks", () => {
  it("turns the three source theses into distinct hooks without ticker-based promises", () => {
    expect(opportunityCopy(buildTickerBrief(getFixtureTickerDetail("COHR")!)).angle).toBe("수요와 공급의 틈");
    expect(opportunityCopy(buildTickerBrief(getFixtureTickerDetail("ASTS")!)).angle).toBe("상용화의 전환점");
    expect(opportunityCopy(buildTickerBrief(getFixtureTickerDetail("RKLB")!)).angle).toBe("반복 매출의 힘");
  });
  it("does not invent small-cap, cheap, or AI claims when supporting data is absent", () => {
    const brief = buildTickerBrief(getFixtureTickerDetail("COHR")!);
    brief.expectation = { text: "광통신 수요와 생산을 더 확인해야 한다", author: "source", date: brief.asOf, url: null };
    brief.snapshot.sources = [];
    const copy = opportunityCopy(brief);
    expect(copy.teaser).toBe(brief.expectation.text);
    expect(copy.title).toBe("이 기업을\n눈여겨보는 이유");
    expect(JSON.stringify(copy)).not.toMatch(/AI|소형주|저평가|시총|수익률/);
  });
});
