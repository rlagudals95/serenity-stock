import { cookies } from "next/headers";

import {
  applyTickerQuery,
  hasPublicTickerIdentity,
  paginateTickerRows,
  parseTickerQuery,
} from "@/features/tickers/query";
import {
  getAnalystProfiles,
  getTickerOverviewRows,
} from "@/features/tickers/repository";
import { TickerOverviewPage } from "@/features/tickers/ticker-overview-page";
import {
  applyWatchlistOverrides,
  parseWatchlistOverrides,
  WATCHLIST_COOKIE,
} from "@/features/tickers/watchlist-preferences";

export const dynamic = "force-dynamic";

export default async function TickersPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const resolved = await searchParams;
  const params = new URLSearchParams();

  for (const [key, value] of Object.entries(resolved)) {
    if (typeof value === "string") params.set(key, value);
  }

  const query = parseTickerQuery(params);
  const [allRows, analysts, cookieStore] = await Promise.all([
    getTickerOverviewRows(),
    getAnalystProfiles(),
    cookies(),
  ]);
  const rowsWithPreferences = applyWatchlistOverrides(
    allRows,
    parseWatchlistOverrides(cookieStore.get(WATCHLIST_COOKIE)?.value),
  );
  const filteredRows = applyTickerQuery(rowsWithPreferences, query);
  const pagination = paginateTickerRows(filteredRows, query.page, 30);
  const publicCount = rowsWithPreferences.filter(hasPublicTickerIdentity).length;

  return (
    <TickerOverviewPage
      query={{ ...query, page: pagination.page }}
      rows={pagination.rows}
      totalCount={publicCount}
      analysts={analysts}
      pagination={pagination}
    />
  );
}
