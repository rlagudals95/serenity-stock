import { cookies } from "next/headers";
import { BriefingHome } from "@/features/tickers/briefing-home";
import { buildTickerBrief } from "@/features/tickers/briefing-model";
import { getTickerOverviewRows } from "@/features/tickers/cached-repository";
import { hasPublicTickerIdentity } from "@/features/tickers/query";
import { applyWatchlistOverrides, parseWatchlistOverrides, WATCHLIST_COOKIE } from "@/features/tickers/watchlist-preferences";

export const dynamic = "force-dynamic";

export default async function WatchlistPage() {
  const [rows, cookieStore] = await Promise.all([getTickerOverviewRows(), cookies()]);
  const watched = applyWatchlistOverrides(rows, parseWatchlistOverrides(cookieStore.get(WATCHLIST_COOKIE)?.value))
    .filter(row => row.watchlisted && hasPublicTickerIdentity(row));
  return <BriefingHome candidates={[]} watched={watched.map(row => buildTickerBrief(row))} watchlistPage />;
}
