import { describe, expect, it } from "vitest";

import { getFixtureTickerDetail } from "./fixtures";

describe("getFixtureTickerDetail", () => {
  it("finds tickers case-insensitively and returns no synthetic unknown row", () => {
    expect(getFixtureTickerDetail("cohr")?.ticker).toBe("COHR");
    expect(getFixtureTickerDetail("not-real")).toBeUndefined();
  });
});
