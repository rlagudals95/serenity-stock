import { describe, expect, it } from "vitest";

import {
  normalizeDailyPrice,
  upsertMarketDailyPrices,
  type MarketDailyPriceRow,
} from "./market-prices";

const bar = {
  ticker: "COHR",
  providerSymbol: "COHR",
  sessionDate: "2026-07-31",
  marketOpenAt: "2026-07-31T13:30:00.000Z",
  open: 100,
  high: 110,
  low: 95,
  close: 105,
  adjustedClose: 52.5,
};

describe("normalizeDailyPrice", () => {
  it("derives adjusted open from the close adjustment ratio", () => {
    expect(normalizeDailyPrice(bar, "licensed-provider")).toMatchObject({
      ticker: "COHR",
      session_date: "2026-07-31",
      raw_open: 100,
      raw_close: 105,
      adjusted_close: 52.5,
      adjustment_factor: 0.5,
      adjusted_open: 50,
      adjusted_open_method: "raw_open_adjustment_ratio",
      provider: "licensed-provider",
    });
  });

  it("preserves a consistent provider-adjusted open", () => {
    expect(
      normalizeDailyPrice({ ...bar, adjustedOpen: 50 }, "licensed-provider"),
    ).toMatchObject({
      adjusted_open: 50,
      adjusted_open_method: "provider_adjusted_open",
    });
  });

  it("rejects invalid OHLC and inconsistent adjusted open values", () => {
    expect(() =>
      normalizeDailyPrice({ ...bar, high: 99 }, "licensed-provider"),
    ).toThrow("Invalid OHLC range");
    expect(() =>
      normalizeDailyPrice(
        { ...bar, adjustedOpen: 51 },
        "licensed-provider",
      ),
    ).toThrow("Adjusted open is inconsistent");
  });
});

describe("upsertMarketDailyPrices", () => {
  it("writes bounded batches with the idempotent daily conflict key", async () => {
    const calls: Array<{
      rows: MarketDailyPriceRow[];
      options: { onConflict: string };
    }> = [];
    const client = {
      from(table: string) {
        expect(table).toBe("market_daily_prices");
        return {
          async upsert(
            rows: MarketDailyPriceRow[],
            options: { onConflict: string },
          ) {
            calls.push({ rows, options });
            return { error: null };
          },
        };
      },
    };
    const rows = [
      normalizeDailyPrice(bar, "licensed-provider"),
      normalizeDailyPrice(
        { ...bar, ticker: "AAOI", providerSymbol: "AAOI" },
        "licensed-provider",
      ),
      normalizeDailyPrice(
        { ...bar, ticker: "LITE", providerSymbol: "LITE" },
        "licensed-provider",
      ),
    ];

    await upsertMarketDailyPrices(client, rows, 2);

    expect(calls).toHaveLength(2);
    expect(calls.map((call) => call.rows.length)).toEqual([2, 1]);
    expect(calls[0].options).toEqual({ onConflict: "ticker,session_date" });
  });

  it("surfaces storage errors without deleting prior prices", async () => {
    const client = {
      from() {
        return {
          async upsert() {
            return { error: { message: "provider outage" } };
          },
        };
      },
    };

    await expect(
      upsertMarketDailyPrices(
        client,
        [normalizeDailyPrice(bar, "licensed-provider")],
        500,
      ),
    ).rejects.toThrow("Market daily price upsert failed: provider outage");
  });
});

