import type { MarketQuote } from "@/features/tickers/types";

const QUOTE_ENDPOINT = "https://finnhub.io/api/v1/quote";
const NASDAQ_QUOTE_ENDPOINT = "https://api.nasdaq.com/api/quote/watchlist";
const REVALIDATE_SECONDS = 15 * 60;

export interface FinnhubQuoteResponse {
  c?: number;
  d?: number | null;
  dp?: number | null;
  pc?: number;
  t?: number;
}

export interface NasdaqQuoteResponse {
  data?: Array<{
    symbol?: string;
    lastSalePrice?: string;
    netChange?: string;
    percentageChange?: string;
    lastTradeTimestampDateTime?: string;
    previousClosePrice?: number;
  }> | null;
}

function finiteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

export function mapFinnhubQuote(
  payload: FinnhubQuoteResponse,
): MarketQuote | null {
  if (
    !finiteNumber(payload.c) ||
    payload.c <= 0 ||
    !finiteNumber(payload.pc) ||
    payload.pc <= 0 ||
    !finiteNumber(payload.t) ||
    payload.t <= 0
  ) {
    return null;
  }

  const fallbackChange = payload.c - payload.pc;
  const change = finiteNumber(payload.d) ? payload.d : fallbackChange;
  const changePercent = finiteNumber(payload.dp)
    ? payload.dp
    : (fallbackChange / payload.pc) * 100;

  return {
    price: payload.c,
    change,
    changePercent,
    previousClose: payload.pc,
    asOf: new Date(payload.t * 1000).toISOString(),
    currency: "USD",
    provider: "finnhub",
  };
}

function marketNumber(value: string | number | undefined) {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (!value) return null;
  const parsed = Number(value.replace(/[$,%+,]/g, "").trim());
  return Number.isFinite(parsed) ? parsed : null;
}

export function mapNasdaqQuote(
  payload: NasdaqQuoteResponse,
): MarketQuote | null {
  const quote = payload.data?.[0];
  const price = marketNumber(quote?.lastSalePrice);
  const change = marketNumber(quote?.netChange);
  const changePercent = marketNumber(quote?.percentageChange);
  const previousClose = marketNumber(quote?.previousClosePrice);
  const rawTimestamp = quote?.lastTradeTimestampDateTime;

  if (
    price === null ||
    price <= 0 ||
    change === null ||
    changePercent === null ||
    previousClose === null ||
    previousClose <= 0 ||
    !rawTimestamp
  ) {
    return null;
  }

  const date = rawTimestamp.slice(0, 10);
  const asOf = new Date(`${date}T00:00:00.000Z`);
  if (Number.isNaN(asOf.getTime())) return null;

  return {
    price,
    change,
    changePercent,
    previousClose,
    asOf: asOf.toISOString(),
    currency: "USD",
    provider: "nasdaq",
  };
}

async function fetchQuote(
  symbol: string,
  apiKey: string,
): Promise<MarketQuote | null> {
  try {
    const response = await fetch(
      `${QUOTE_ENDPOINT}?symbol=${encodeURIComponent(symbol)}`,
      {
        headers: { "X-Finnhub-Token": apiKey },
        next: { revalidate: REVALIDATE_SECONDS },
        signal: AbortSignal.timeout(3_000),
      },
    );

    if (!response.ok) return null;
    return mapFinnhubQuote((await response.json()) as FinnhubQuoteResponse);
  } catch {
    return null;
  }
}

async function fetchNasdaqQuote(symbol: string): Promise<MarketQuote | null> {
  try {
    const response = await fetch(
      `${NASDAQ_QUOTE_ENDPOINT}?symbol=${encodeURIComponent(`${symbol}|stocks`)}`,
      {
        headers: {
          Accept: "application/json",
          "User-Agent": "Mozilla/5.0 (compatible; SerenityStock/1.0)",
        },
        next: { revalidate: REVALIDATE_SECONDS },
        signal: AbortSignal.timeout(3_000),
      },
    );

    if (!response.ok) return null;
    return mapNasdaqQuote((await response.json()) as NasdaqQuoteResponse);
  } catch {
    return null;
  }
}

export async function getLatestMarketQuotes(
  tickers: readonly string[],
): Promise<Map<string, MarketQuote>> {
  const apiKey = process.env.FINNHUB_API_KEY?.trim();
  const symbols = [...new Set(tickers.map((ticker) => ticker.toUpperCase()))];
  const results = await Promise.all(
    symbols.map(async (symbol) => {
      const finnhubQuote = apiKey ? await fetchQuote(symbol, apiKey) : null;
      return [symbol, finnhubQuote ?? (await fetchNasdaqQuote(symbol))] as const;
    }),
  );

  return new Map(
    results.filter(
      (entry): entry is readonly [string, MarketQuote] => entry[1] !== null,
    ),
  );
}
