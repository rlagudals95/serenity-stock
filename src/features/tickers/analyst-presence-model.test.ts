import { describe, expect, it } from "vitest";

import {
  analystInitials,
  buildAnalystPresenceModel,
  compareAnalystSnapshots,
  sortAnalystSnapshots,
} from "./analyst-presence-model";
import type { AnalystSnapshot, Stance } from "./types";

function analyst(
  name: string,
  latestStance: Stance,
  overrides: Partial<AnalystSnapshot> = {},
): AnalystSnapshot {
  return {
    key: name.toLowerCase().replaceAll(" ", "_"),
    name,
    username: name.toLowerCase().replaceAll(" ", "_"),
    totalMentions: 1,
    positiveCount: 0,
    negativeCount: 0,
    neutralCount: 0,
    mixedCount: 0,
    unknownCount: 0,
    cumulativeSentiment: "insufficient",
    latestStance,
    latestClaim: null,
    latestChangeType: null,
    firstMentionedAt: "2026-07-01T00:00:00.000Z",
    lastMentionedAt: "2026-07-01T00:00:00.000Z",
    latestSourceUrl: null,
    ...overrides,
  };
}

describe("analyst presence model", () => {
  it("sorts by recency, then mention count, then name without mutating input", () => {
    const analysts = [
      analyst("Zulu", "bullish", { totalMentions: 3 }),
      analyst("Beta", "bullish", { totalMentions: 9 }),
      analyst("Alpha", "bullish", { totalMentions: 9 }),
      analyst("Newest", "bullish", {
        totalMentions: 1,
        lastMentionedAt: "2026-07-02T00:00:00.000Z",
      }),
    ];

    expect(sortAnalystSnapshots(analysts).map(({ name }) => name)).toEqual([
      "Newest",
      "Alpha",
      "Beta",
      "Zulu",
    ]);
    expect(analysts.map(({ name }) => name)).toEqual([
      "Zulu",
      "Beta",
      "Alpha",
      "Newest",
    ]);
  });

  it("builds a visible model with stance counts and disagreement", () => {
    const model = buildAnalystPresenceModel(
      [
        analyst("Neutral", "neutral", {
          lastMentionedAt: "2026-07-01T00:00:00.000Z",
        }),
        analyst("Bear", "bearish", {
          lastMentionedAt: "2026-07-03T00:00:00.000Z",
        }),
        analyst("Bull Two", "bullish", {
          lastMentionedAt: "2026-07-04T00:00:00.000Z",
        }),
        analyst("Bull One", "bullish", {
          lastMentionedAt: "2026-07-05T00:00:00.000Z",
        }),
      ],
      3,
    );

    expect(model.visible.map(({ name }) => name)).toEqual([
      "Bull One",
      "Bull Two",
      "Bear",
    ]);
    expect(model.hiddenCount).toBe(1);
    expect(model.counts).toEqual({ bullish: 2, bearish: 1, other: 1 });
    expect(model.comparison).toBe("disagreement");
  });

  it.each([
    ["agreement", [analyst("A", "neutral"), analyst("B", "neutral")]],
    ["disagreement", [analyst("A", "bullish"), analyst("B", "bearish")]],
    ["mixed", [analyst("A", "bullish"), analyst("B", "mixed")]],
    ["single_source", [analyst("A", "bullish")]],
  ] as const)("detects %s analyst comparisons", (expected, analysts) => {
    expect(compareAnalystSnapshots(analysts)).toBe(expected);
  });

  it("derives initials from names", () => {
    expect(analystInitials("Serenity")).toBe("SE");
    expect(analystInitials("Shay Boloor")).toBe("SB");
    expect(analystInitials("   ")).toBe("?");
  });
});
