import { describe, expect, it } from "vitest";

import {
  applyOpinionToSnapshot,
  calculateConsensus,
  calculateSignalOutcome,
  findBaselineSession,
  getSignalTransition,
  replayConsensusSignals,
  type ConsensusOpinion,
  type ConsensusSnapshot,
} from "./domain";

const baseOpinion: ConsensusOpinion = {
  analysisId: 1,
  analystKey: "serenity",
  stance: "bullish",
  stanceConfidence: 0.9,
  reviewStatus: "auto",
  changeType: "first_mention",
  postedAt: "2026-07-01T12:00:00.000Z",
  sourceUrl: "https://x.com/serenity/status/1",
};

describe("calculateConsensus", () => {
  it("treats exactly two of three analysts as positive consensus", () => {
    const result = calculateConsensus([
      baseOpinion,
      { ...baseOpinion, analysisId: 2, analystKey: "shay" },
      {
        ...baseOpinion,
        analysisId: 3,
        analystKey: "beth",
        stance: "bearish",
      },
    ]);

    expect(result.state).toBe("positive");
    expect(result.positiveShare).toBeCloseTo(2 / 3);
  });

  it("requires at least three directional analysts", () => {
    expect(calculateConsensus([baseOpinion]).state).toBe("insufficient");
    expect(
      calculateConsensus([
        baseOpinion,
        { ...baseOpinion, analysisId: 2, analystKey: "shay" },
      ]).state,
    ).toBe("insufficient");
  });

  it("returns mixed when neither direction reaches two thirds", () => {
    const result = calculateConsensus([
      baseOpinion,
      { ...baseOpinion, analysisId: 2, analystKey: "shay" },
      {
        ...baseOpinion,
        analysisId: 3,
        analystKey: "beth",
        stance: "bearish",
      },
      {
        ...baseOpinion,
        analysisId: 4,
        analystKey: "brian",
        stance: "bearish",
      },
    ]);

    expect(result.state).toBe("mixed");
  });
});

describe("applyOpinionToSnapshot", () => {
  it("accepts a manually approved directional vote below the auto threshold", () => {
    const next = applyOpinionToSnapshot(new Map(), {
      ...baseOpinion,
      stanceConfidence: 0.5,
      reviewStatus: "approved",
    });

    expect(next.get("serenity")?.stance).toBe("bullish");
  });

  it("does not clear a vote for a low-confidence automatic stance change", () => {
    const snapshot: ConsensusSnapshot = new Map([["serenity", baseOpinion]]);
    const next = applyOpinionToSnapshot(snapshot, {
      ...baseOpinion,
      analysisId: 2,
      stance: "neutral",
      stanceConfidence: 0.5,
      changeType: "stance_change",
    });

    expect(next.get("serenity")?.analysisId).toBe(1);
  });

  it("keeps the prior directional vote for an ordinary neutral fact post", () => {
    const snapshot: ConsensusSnapshot = new Map([["serenity", baseOpinion]]);

    const next = applyOpinionToSnapshot(snapshot, {
      ...baseOpinion,
      analysisId: 2,
      stance: "neutral",
      changeType: "repeat",
      postedAt: "2026-07-02T12:00:00.000Z",
    });

    expect(next.get("serenity")?.analysisId).toBe(1);
  });

  it("removes the prior vote for an approved explicit non-directional stance change", () => {
    const snapshot: ConsensusSnapshot = new Map([["serenity", baseOpinion]]);

    const next = applyOpinionToSnapshot(snapshot, {
      ...baseOpinion,
      analysisId: 2,
      stance: "neutral",
      reviewStatus: "approved",
      changeType: "stance_change",
      postedAt: "2026-07-02T12:00:00.000Z",
    });

    expect(next.has("serenity")).toBe(false);
  });

  it("does not change the snapshot for an opinion awaiting review", () => {
    const snapshot: ConsensusSnapshot = new Map([["serenity", baseOpinion]]);

    const next = applyOpinionToSnapshot(snapshot, {
      ...baseOpinion,
      analysisId: 2,
      stance: "bearish",
      reviewStatus: "needs_review",
      changeType: "stance_change",
      postedAt: "2026-07-02T12:00:00.000Z",
    });

    expect(next.get("serenity")?.stance).toBe("bullish");
  });
});

describe("getSignalTransition", () => {
  it.each([
    ["insufficient", "positive", "entry"],
    ["positive", "negative", "flip"],
    ["positive", "mixed", "exit"],
    ["positive", "positive", "none"],
  ] as const)("maps %s → %s to %s", (previous, current, expected) => {
    expect(getSignalTransition(previous, current)).toBe(expected);
  });
});

describe("replayConsensusSignals", () => {
  it("creates one entry when a third analyst confirms the direction", () => {
    const result = replayConsensusSignals([
      { ...baseOpinion, ticker: "COHR" },
      {
        ...baseOpinion,
        analysisId: 2,
        analystKey: "shay",
        ticker: "COHR",
        postedAt: "2026-07-02T12:00:00.000Z",
      },
      {
        ...baseOpinion,
        analysisId: 3,
        analystKey: "beth",
        ticker: "COHR",
        postedAt: "2026-07-03T12:00:00.000Z",
      },
      {
        ...baseOpinion,
        analysisId: 4,
        ticker: "COHR",
        postedAt: "2026-07-04T12:00:00.000Z",
        changeType: "repeat",
      },
    ]);

    expect(result.events).toHaveLength(1);
    expect(result.events[0]).toMatchObject({
      ticker: "COHR",
      signalType: "entry",
      direction: "positive",
      triggerAnalysisId: 3,
      directionalAnalysts: 3,
    });
  });

  it("records a direct positive-to-negative flip with three analysts", () => {
    const result = replayConsensusSignals([
      { ...baseOpinion, ticker: "NVDA" },
      {
        ...baseOpinion,
        analysisId: 2,
        analystKey: "shay",
        ticker: "NVDA",
        postedAt: "2026-07-02T12:00:00.000Z",
      },
      {
        ...baseOpinion,
        analysisId: 3,
        analystKey: "beth",
        ticker: "NVDA",
        stance: "bearish",
        postedAt: "2026-07-03T12:00:00.000Z",
      },
      {
        ...baseOpinion,
        analysisId: 4,
        analystKey: "shay",
        ticker: "NVDA",
        stance: "bearish",
        changeType: "stance_change",
        postedAt: "2026-07-04T12:00:00.000Z",
      },
    ]);

    expect(result.events).toHaveLength(2);
    expect(result.events[0]).toMatchObject({
      direction: "positive",
      endedAt: "2026-07-04T12:00:00.000Z",
      endedReason: "flipped",
    });
    expect(result.events[1]).toMatchObject({
      signalType: "flip",
      direction: "negative",
      previousState: "positive",
    });
  });

  it("keeps an active signal for a neutral fact post and exits on explicit stance change", () => {
    const result = replayConsensusSignals([
      { ...baseOpinion, ticker: "ASTS" },
      {
        ...baseOpinion,
        analysisId: 2,
        analystKey: "shay",
        ticker: "ASTS",
        postedAt: "2026-07-02T12:00:00.000Z",
      },
      {
        ...baseOpinion,
        analysisId: 3,
        analystKey: "beth",
        ticker: "ASTS",
        postedAt: "2026-07-03T12:00:00.000Z",
      },
      {
        ...baseOpinion,
        analysisId: 4,
        ticker: "ASTS",
        stance: "neutral",
        changeType: "repeat",
        postedAt: "2026-07-04T12:00:00.000Z",
      },
      {
        ...baseOpinion,
        analysisId: 5,
        ticker: "ASTS",
        stance: "neutral",
        changeType: "stance_change",
        postedAt: "2026-07-05T12:00:00.000Z",
      },
    ]);

    expect(result.events).toHaveLength(1);
    expect(result.events[0]).toMatchObject({
      endedAt: "2026-07-05T12:00:00.000Z",
      endedReason: "insufficient",
    });
    expect(result.finalStates.get("ASTS")?.state).toBe("insufficient");
  });
});

describe("findBaselineSession", () => {
  const sessions = [
    {
      sessionDate: "2026-07-01",
      marketOpenAt: "2026-07-01T13:30:00.000Z",
      adjustedOpen: 100,
      adjustedClose: 101,
    },
    {
      sessionDate: "2026-07-02",
      marketOpenAt: "2026-07-02T13:30:00.000Z",
      adjustedOpen: 102,
      adjustedClose: 103,
    },
  ];

  it("uses the same-day session when a signal arrives before market open", () => {
    expect(
      findBaselineSession(sessions, "2026-07-01T12:00:00.000Z")
        ?.sessionDate,
    ).toBe("2026-07-01");
  });

  it("uses the next session when a signal arrives after market open", () => {
    expect(
      findBaselineSession(sessions, "2026-07-01T14:00:00.000Z")
        ?.sessionDate,
    ).toBe("2026-07-02");
  });
});

describe("calculateSignalOutcome", () => {
  it("counts a falling price as aligned for a negative signal", () => {
    expect(
      calculateSignalOutcome({
        direction: "negative",
        baselinePrice: 100,
        targetPrice: 90,
        matured: true,
      }),
    ).toMatchObject({
      rawReturn: -0.1,
      signedReturn: 0.1,
      verdict: "aligned",
      status: "evaluable",
    });
  });

  it("uses the two percent flat band", () => {
    expect(
      calculateSignalOutcome({
        direction: "positive",
        baselinePrice: 100,
        targetPrice: 101,
        matured: true,
      }).verdict,
    ).toBe("flat");
  });

  it("keeps pending and missing data out of evaluable outcomes", () => {
    expect(
      calculateSignalOutcome({
        direction: "positive",
        baselinePrice: 100,
        targetPrice: null,
        matured: false,
      }),
    ).toMatchObject({ status: "pending", verdict: "pending" });

    expect(
      calculateSignalOutcome({
        direction: "positive",
        baselinePrice: null,
        targetPrice: 110,
        matured: true,
      }),
    ).toMatchObject({ status: "data_missing", verdict: "data_missing" });
  });
});
