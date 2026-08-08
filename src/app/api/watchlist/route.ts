import { NextRequest, NextResponse } from "next/server";

import {
  isValidWatchlistTicker,
  parseWatchlistOverrides,
  serializeWatchlistOverrides,
  WATCHLIST_COOKIE,
} from "@/features/tickers/watchlist-preferences";

export async function POST(request: NextRequest) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (
    !body ||
    typeof body !== "object" ||
    !("ticker" in body) ||
    !("active" in body) ||
    !isValidWatchlistTicker(body.ticker) ||
    typeof body.active !== "boolean"
  ) {
    return NextResponse.json(
      { error: "Ticker and active state are required" },
      { status: 400 },
    );
  }

  const overrides = parseWatchlistOverrides(
    request.cookies.get(WATCHLIST_COOKIE)?.value,
  );
  overrides.set(body.ticker, body.active);

  const response = new NextResponse(null, { status: 204 });
  response.cookies.set(WATCHLIST_COOKIE, serializeWatchlistOverrides(overrides), {
    httpOnly: true,
    maxAge: 60 * 60 * 24 * 365,
    path: "/",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });
  return response;
}
