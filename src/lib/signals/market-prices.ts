export interface ProviderDailyPrice {
  ticker: string;
  providerSymbol: string;
  sessionDate: string;
  marketOpenAt: string;
  open: number;
  high: number;
  low: number;
  close: number;
  adjustedClose: number;
  adjustedOpen?: number;
  sourceUpdatedAt?: string | null;
}

export interface MarketDailyPriceRow {
  ticker: string;
  session_date: string;
  market_open_at: string;
  raw_open: number;
  raw_high: number;
  raw_low: number;
  raw_close: number;
  adjusted_close: number;
  adjusted_open: number;
  adjustment_factor: number;
  adjusted_open_method:
    | "provider_adjusted_open"
    | "raw_open_adjustment_ratio";
  provider: string;
  provider_symbol: string;
  source_updated_at: string | null;
  fetched_at: string;
}

export interface MarketPriceUpsertClient {
  from(table: "market_daily_prices"): {
    upsert(
      rows: MarketDailyPriceRow[],
      options: { onConflict: "ticker,session_date" },
    ): Promise<{ error: { message: string } | null }>;
  };
}

function round(value: number, decimalPlaces: number) {
  const factor = 10 ** decimalPlaces;
  return Math.round(value * factor) / factor;
}

function validPositivePrice(value: number) {
  return Number.isFinite(value) && value > 0;
}

export function normalizeDailyPrice(
  bar: ProviderDailyPrice,
  provider: string,
  fetchedAt = new Date().toISOString(),
): MarketDailyPriceRow {
  const ticker = bar.ticker.trim().toUpperCase();
  const providerName = provider.trim();
  const providerSymbol = bar.providerSymbol.trim();
  if (!/^[A-Z][A-Z0-9.-]{0,9}$/.test(ticker)) {
    throw new Error(`Invalid ticker: ${bar.ticker}`);
  }
  if (!providerName || !providerSymbol) {
    throw new Error("Provider and provider symbol are required");
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(bar.sessionDate)) {
    throw new Error(`Invalid session date: ${bar.sessionDate}`);
  }
  if (Number.isNaN(new Date(bar.marketOpenAt).getTime())) {
    throw new Error(`Invalid market open timestamp: ${bar.marketOpenAt}`);
  }
  if (
    ![
      bar.open,
      bar.high,
      bar.low,
      bar.close,
      bar.adjustedClose,
    ].every(validPositivePrice)
  ) {
    throw new Error("Daily prices must be finite positive numbers");
  }
  if (
    bar.high < Math.max(bar.open, bar.close) ||
    bar.low > Math.min(bar.open, bar.close) ||
    bar.high < bar.low
  ) {
    throw new Error("Invalid OHLC range");
  }

  const adjustmentFactor = bar.adjustedClose / bar.close;
  const derivedAdjustedOpen = bar.open * adjustmentFactor;
  const adjustedOpen = bar.adjustedOpen ?? derivedAdjustedOpen;
  if (!validPositivePrice(adjustedOpen)) {
    throw new Error("Adjusted open must be a finite positive number");
  }
  if (
    bar.adjustedOpen !== undefined &&
    Math.abs(bar.adjustedOpen - derivedAdjustedOpen) > 0.000001
  ) {
    throw new Error("Adjusted open is inconsistent with the adjustment ratio");
  }

  return {
    ticker,
    session_date: bar.sessionDate,
    market_open_at: new Date(bar.marketOpenAt).toISOString(),
    raw_open: round(bar.open, 8),
    raw_high: round(bar.high, 8),
    raw_low: round(bar.low, 8),
    raw_close: round(bar.close, 8),
    adjusted_close: round(bar.adjustedClose, 8),
    adjusted_open: round(adjustedOpen, 8),
    adjustment_factor: round(adjustmentFactor, 12),
    adjusted_open_method:
      bar.adjustedOpen === undefined
        ? "raw_open_adjustment_ratio"
        : "provider_adjusted_open",
    provider: providerName,
    provider_symbol: providerSymbol,
    source_updated_at: bar.sourceUpdatedAt
      ? new Date(bar.sourceUpdatedAt).toISOString()
      : null,
    fetched_at: new Date(fetchedAt).toISOString(),
  };
}

export async function upsertMarketDailyPrices(
  client: MarketPriceUpsertClient,
  rows: readonly MarketDailyPriceRow[],
  batchSize = 500,
) {
  if (!Number.isInteger(batchSize) || batchSize < 1 || batchSize > 1_000) {
    throw new Error("Market price batch size must be between 1 and 1000");
  }

  let batches = 0;
  for (let index = 0; index < rows.length; index += batchSize) {
    const batch = rows.slice(index, index + batchSize);
    const { error } = await client
      .from("market_daily_prices")
      .upsert([...batch], { onConflict: "ticker,session_date" });
    if (error) {
      throw new Error(`Market daily price upsert failed: ${error.message}`);
    }
    batches += 1;
  }

  return { upserted: rows.length, batches };
}

