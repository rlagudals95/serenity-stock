import { cookies } from "next/headers";

import {
  applyTickerQuery,
  hasPublicTickerIdentity,
  paginateTickerRows,
  parseTickerQuery,
} from "@/features/tickers/query";
import {
  getAnalystProfiles,
  getTickerProofOverview,
  getTickerOverviewRows,
  getTickerBriefingResearch,
} from "@/features/tickers/cached-repository";
import { BriefingHome } from "@/features/tickers/briefing-home";
import { buildTickerBrief } from "@/features/tickers/briefing-model";
import { selectBriefingCandidates } from "@/features/tickers/briefing-selection";
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
    params.size === 0 ? Promise.resolve([]) : getAnalystProfiles(),
    cookies(),
  ]);
  const rowsWithPreferences = applyWatchlistOverrides(
    allRows,
    parseWatchlistOverrides(cookieStore.get(WATCHLIST_COOKIE)?.value),
  );
  if (params.size === 0) {
    const picks = selectBriefingCandidates(rowsWithPreferences);
    const research = await getTickerBriefingResearch(picks.map(({ row }) => row.ticker))
      .catch((error: unknown) => {
        console.error("Briefing evidence unavailable", error);
        return {} as Awaited<ReturnType<typeof getTickerBriefingResearch>>;
      });
    return <BriefingHome
      candidates={picks.map(({ row, recommendation }) => ({
        ...buildTickerBrief(row, research[row.ticker]),
        expectation: recommendation.evidence,
        recommendation,
      }))}
      watched={rowsWithPreferences.filter(row => row.watchlisted && hasPublicTickerIdentity(row)).map(row => buildTickerBrief(row))}
    />;
  }
  const proofOverview = await getTickerProofOverview();
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
      proofOverview={proofOverview}
    />
  );
}
