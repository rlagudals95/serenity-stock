import { describe, expect, it } from "vitest";

import { parseAnalysisPayload } from "./analysis-schema";

const validPayload = {
  relevance: "relevant",
  summary_ko: "광통신 수요가 강하다는 주장이다.",
  themes: ["optical_networking"],
  is_noise: false,
  ticker_analyses: [
    {
      ticker: "cohr",
      company_name: "Coherent Corp.",
      stance: "bullish",
      claim_type: "growth",
      claim: "AI 데이터센터 수요가 광통신 매출 성장을 지지한다.",
      evidence_from_post: ["optical demand is accelerating"],
      risks_mentioned: [],
      catalysts_mentioned: ["next earnings"],
      conviction: "high",
      novelty: "new",
      ticker_confidence: 0.96,
      stance_confidence: 0.9,
      review_status: "auto",
      review_reason: null,
      change_type: "first_mention",
      change_summary: "첫 유효 언급",
    },
  ],
};

describe("parseAnalysisPayload", () => {
  it("normalizes valid ticker analysis output", () => {
    expect(
      parseAnalysisPayload(
        validPayload,
        "$COHR optical demand is accelerating into next earnings.",
      ).ticker_analyses[0].ticker,
    ).toBe("COHR");
  });

  it("removes ungrounded evidence and sends the opinion to review", () => {
    const result = parseAnalysisPayload(
      validPayload,
      "$COHR unrelated source text",
    );

    expect(result.ticker_analyses[0]).toMatchObject({
      evidence_from_post: [],
      review_status: "needs_review",
      review_reason: "claim",
    });
  });

  it("restores source line breaks when the model collapses whitespace", () => {
    const result = parseAnalysisPayload(
      validPayload,
      "$COHR optical demand is\n\naccelerating into next earnings.",
    );

    expect(result.ticker_analyses[0].evidence_from_post).toEqual([
      "optical demand is\n\naccelerating",
    ]);
  });

  it("restores source casing and omitted list markers", () => {
    const payload = structuredClone(validPayload);
    payload.ticker_analyses[0].evidence_from_post = [
      "jensen said no delays: optical demand is accelerating",
    ];
    const result = parseAnalysisPayload(
      payload,
      "Jensen said no delays:\n\n- optical demand is accelerating.",
    );

    expect(result.ticker_analyses[0].evidence_from_post).toEqual([
      "Jensen said no delays:\n\n- optical demand is accelerating",
    ]);
  });

  it("restores a bounded source excerpt abbreviated with an ellipsis", () => {
    const payload = structuredClone(validPayload);
    payload.ticker_analyses[0].evidence_from_post = [
      "$COHR ... with their 50% drops.",
    ];
    const result = parseAnalysisPayload(
      payload,
      "$COHR and $AAOI with their 50% drops.",
    );

    expect(result.ticker_analyses[0].evidence_from_post).toEqual([
      "$COHR and $AAOI with their 50% drops.",
    ]);
  });

  it("deduplicates and bounds oversized label arrays", () => {
    const payload = {
      ...structuredClone(validPayload),
      themes: Array.from({ length: 12 }, (_, index) => `theme_${index}`),
      ticker_analyses: [
        {
          ...structuredClone(validPayload.ticker_analyses[0]),
          risks_mentioned: [
            "risk 1",
            "risk 1",
            "risk 2",
            "risk 3",
            "risk 4",
            "risk 5",
            "risk 6",
          ],
        },
      ],
    };

    const result = parseAnalysisPayload(
      payload,
      "$COHR optical demand is accelerating into next earnings.",
    );

    expect(result.themes).toHaveLength(10);
    expect(result.ticker_analyses[0].risks_mentioned).toEqual([
      "risk 1",
      "risk 2",
      "risk 3",
      "risk 4",
      "risk 5",
    ]);
  });

  it("deduplicates ticker analyses without dropping a multi-ticker recap", () => {
    const base = structuredClone(validPayload.ticker_analyses[0]);
    const payload = {
      ...structuredClone(validPayload),
      ticker_analyses: [
        ...Array.from({ length: 12 }, (_, index) => ({
          ...base,
          ticker: `T${index}`,
          company_name: `Company ${index}`,
        })),
        { ...base, ticker: "T0", company_name: "Duplicate Company" },
      ],
    };

    const result = parseAnalysisPayload(
      payload,
      "$COHR optical demand is accelerating into next earnings.",
    );

    expect(result.ticker_analyses).toHaveLength(12);
    expect(
      result.ticker_analyses.filter((analysis) => analysis.ticker === "T0"),
    ).toHaveLength(1);
  });
});
