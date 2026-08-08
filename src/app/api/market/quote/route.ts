import { NextResponse } from "next/server";

import { getLatestMarketQuotes } from "@/lib/market-data/finnhub";

const TICKER_PATTERN = /^[A-Z][A-Z0-9.-]{0,9}$/;

export async function GET(request: Request) {
  const ticker = new URL(request.url).searchParams.get("ticker")?.toUpperCase();

  if (!ticker || !TICKER_PATTERN.test(ticker)) {
    return NextResponse.json({ error: "Invalid ticker" }, { status: 400 });
  }

  const quotes = await getLatestMarketQuotes([ticker]);
  const response = NextResponse.json({ quote: quotes.get(ticker) ?? null });
  response.headers.set(
    "Cache-Control",
    "public, s-maxage=900, stale-while-revalidate=3600",
  );
  return response;
}
