import { applyTickerQuery, parseTickerQuery } from "@/features/tickers/query";
import {
  getAnalystProfiles,
  getTickerOverviewRows,
} from "@/features/tickers/repository";
import { TickerOverviewPage } from "@/features/tickers/ticker-overview-page";

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
  const [allRows, analysts] = await Promise.all([
    getTickerOverviewRows(),
    getAnalystProfiles(),
  ]);
  const rows = applyTickerQuery(allRows, query);

  return (
    <TickerOverviewPage
      query={query}
      rows={rows}
      totalCount={allRows.length}
      analysts={analysts}
    />
  );
}
