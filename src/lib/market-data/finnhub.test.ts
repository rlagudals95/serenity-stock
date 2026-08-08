import { describe, expect, it } from "vitest";

import { mapFinnhubQuote, mapNasdaqQuote } from "./finnhub";

describe("mapFinnhubQuote", () => {
  it("maps the latest price and prior-close movement", () => {
    expect(
      mapFinnhubQuote({ c: 128.4, d: 2.4, dp: 1.9048, pc: 126, t: 1_752_866_400 }),
    ).toEqual({
      price: 128.4,
      change: 2.4,
      changePercent: 1.9048,
      previousClose: 126,
      asOf: "2025-07-18T19:20:00.000Z",
      currency: "USD",
      provider: "finnhub",
    });
  });

  it("derives omitted change values and rejects unavailable quotes", () => {
    expect(mapFinnhubQuote({ c: 102, pc: 100, t: 1_752_866_400 })).toMatchObject({
      change: 2,
      changePercent: 2,
    });
    expect(mapFinnhubQuote({ c: 0, pc: 0, t: 0 })).toBeNull();
  });
});

describe("mapNasdaqQuote", () => {
  it("maps the public delayed quote response", () => {
    expect(
      mapNasdaqQuote({
        data: [
          {
            symbol: "COHR",
            lastSalePrice: "$317.22",
            netChange: "+31.82",
            percentageChange: "+11.15%",
            previousClosePrice: 285.4,
            lastTradeTimestampDateTime: "2026-07-21T00:00:00",
          },
        ],
      }),
    ).toMatchObject({
      price: 317.22,
      change: 31.82,
      changePercent: 11.15,
      previousClose: 285.4,
      asOf: "2026-07-21T00:00:00.000Z",
      provider: "nasdaq",
    });
  });
});
