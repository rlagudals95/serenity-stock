import { describe, expect, it } from "vitest";

import {
  applyWatchlistOverrides,
  parseWatchlistOverrides,
  serializeWatchlistOverrides,
} from "./watchlist-preferences";

describe("watchlist preferences", () => {
  it("round-trips explicit add and remove overrides", () => {
    const value = serializeWatchlistOverrides(
      new Map([
        ["COHR", true],
        ["LITE", false],
      ]),
    );

    expect(parseWatchlistOverrides(value)).toEqual(
      new Map([
        ["COHR", true],
        ["LITE", false],
      ]),
    );
  });

  it("ignores malformed and unsafe ticker values", () => {
    expect(parseWatchlistOverrides("COHR:1,bad ticker:1,LITE:2")).toEqual(
      new Map([["COHR", true]]),
    );
  });

  it("overlays only explicit preferences and preserves repository defaults", () => {
    const rows = [
      { ticker: "COHR", watchlisted: false },
      { ticker: "LITE", watchlisted: true },
      { ticker: "AAOI", watchlisted: true },
    ];

    expect(
      applyWatchlistOverrides(
        rows,
        new Map([
          ["COHR", true],
          ["LITE", false],
        ]),
      ),
    ).toEqual([
      { ticker: "COHR", watchlisted: true },
      { ticker: "LITE", watchlisted: false },
      { ticker: "AAOI", watchlisted: true },
    ]);
  });
});
