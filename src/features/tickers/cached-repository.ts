import { unstable_cache } from "next/cache";

import { resolveSupabaseDataConfig } from "@/lib/supabase/config";
import { TICKER_DATA_CACHE_TAG, TICKER_DATA_REVALIDATE_SECONDS } from "./cache-policy";
import * as repository from "./repository";

// Cache only server/service-role reads. Apply cookies and other user preferences
// in the page AFTER reading this cache; never put request context in these loaders.
function cachedRead<Args extends unknown[], Result>(
  name: string,
  loader: (...args: Args) => Promise<Result>,
) {
  return (...args: Args): Promise<Result> => {
    const config = resolveSupabaseDataConfig(process.env);
    if (config.mode === "fixture") return loader(...args);
    return unstable_cache(loader, ["serenity-reads-v1", config.url, name], {
      revalidate: TICKER_DATA_REVALIDATE_SECONDS,
      tags: [TICKER_DATA_CACHE_TAG],
    })(...args);
  };
}

export const getTickerOverviewRows = cachedRead("overview", repository.getTickerOverviewRows);
export const getAnalystProfiles = cachedRead("analysts", repository.getAnalystProfiles);
const getDetail = cachedRead("detail", repository.getTickerDetail);
const getResearch = cachedRead("briefing-research", repository.getTickerBriefingResearch);

export function getTickerDetail(ticker: string) {
  return getDetail(ticker.toUpperCase());
}

export function getTickerBriefingResearch(tickers: string[]) {
  return getResearch([...new Set(tickers.map(ticker => ticker.trim().toUpperCase()).filter(Boolean))].sort());
}

// Keep the cache key independent of the user's watchlist. The fallback also uses
// shared overview rows, so schemas without the proof views retain their behavior.
const getProofOverview = cachedRead("proof-overview", repository.getTickerProofOverview);
export async function getTickerProofOverview() {
  // Resolve this before entering the proof cache: nested unstable_cache calls
  // bypass their own cache and would repeat the five overview reads on a miss.
  return getProofOverview(await getTickerOverviewRows());
}
