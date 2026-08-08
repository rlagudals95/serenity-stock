export const WATCHLIST_COOKIE = "serenity_watchlist";

const tickerPattern = /^[A-Z][A-Z0-9.-]{0,9}$/;

export function parseWatchlistOverrides(value: string | undefined) {
  const overrides = new Map<string, boolean>();

  for (const item of value?.split(",") ?? []) {
    const [ticker, active] = item.split(":");
    if (!tickerPattern.test(ticker) || (active !== "1" && active !== "0")) {
      continue;
    }
    overrides.set(ticker, active === "1");
  }

  return overrides;
}

export function serializeWatchlistOverrides(overrides: Map<string, boolean>) {
  return [...overrides]
    .filter(([ticker]) => tickerPattern.test(ticker))
    .sort(([left], [right]) => left.localeCompare(right))
    .slice(0, 100)
    .map(([ticker, active]) => `${ticker}:${active ? "1" : "0"}`)
    .join(",");
}

export function applyWatchlistOverrides<
  T extends { ticker: string; watchlisted: boolean },
>(rows: readonly T[], overrides: Map<string, boolean>): T[] {
  return rows.map((row) => {
    const active = overrides.get(row.ticker);
    return active === undefined ? row : { ...row, watchlisted: active };
  });
}

export function isValidWatchlistTicker(value: unknown): value is string {
  return typeof value === "string" && tickerPattern.test(value);
}
