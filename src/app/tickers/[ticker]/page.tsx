import { notFound } from "next/navigation";
import Link from "next/link";
import { cookies } from "next/headers";

import { MetricsStrip } from "@/features/tickers/detail/metrics-strip";
import { OpinionsTab } from "@/features/tickers/detail/opinions-tab";
import { OverviewTab } from "@/features/tickers/detail/overview-tab";
import { ResearchTab } from "@/features/tickers/detail/research-tab";
import { TickerHeader } from "@/features/tickers/detail/ticker-header";
import { getTickerDetail } from "@/features/tickers/repository";
import { DecisionSummary } from "@/features/tickers/detail/decision-summary";
import { SignalPerformanceHero } from "@/features/tickers/signal-performance";
import { applyWatchlistOverrides, parseWatchlistOverrides, WATCHLIST_COOKIE } from "@/features/tickers/watchlist-preferences";

export const dynamic = "force-dynamic";

type DetailTab = "overview" | "opinions" | "research";

function parseTab(value: string | string[] | undefined): DetailTab {
  return value === "opinions" || value === "research" ? value : "overview";
}

export default async function TickerDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ ticker: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [{ ticker: rawTicker }, query] = await Promise.all([
    params,
    searchParams,
  ]);
  const [detail, cookieStore] = await Promise.all([getTickerDetail(rawTicker), cookies()]);

  if (!detail) notFound();
  const ticker = applyWatchlistOverrides([detail], parseWatchlistOverrides(cookieStore.get(WATCHLIST_COOKIE)?.value))[0];

  const tab = parseTab(query.tab);
  const tabs: Array<{ value: DetailTab; label: string }> = [
    { value: "overview", label: "의견 한눈에" },
    { value: "opinions", label: `의견과 원문 ${ticker.opinions.length}` },
    { value: "research", label: "내 리서치" },
  ];

  return (
    <article className="ticker-detail-page brief-detail-page">
      <TickerHeader ticker={ticker} />
      <nav aria-label="종목 상세 보기" className="detail-tabs">
        {tabs.map((item) => (
          <Link
            aria-current={tab === item.value ? "page" : undefined}
            className={tab === item.value ? "is-active" : ""}
            href={`/tickers/${ticker.ticker}?tab=${item.value}`}
            key={item.value}
          >
            {item.label}
          </Link>
        ))}
      </nav>
      <div className="detail-tab-panel">
        {tab === "overview" ? <><DecisionSummary ticker={ticker} /><details className="brief-advanced"><summary>언급 추이 · 과거 결과 더 보기</summary><SignalPerformanceHero performance={ticker.signalPerformance} /><MetricsStrip ticker={ticker} /><OverviewTab ticker={ticker} showAnalysts={false} /></details></> : null}
        {tab === "opinions" ? (
          <OpinionsTab opinions={ticker.opinions} ticker={ticker.ticker} />
        ) : null}
        {tab === "research" ? <ResearchTab ticker={ticker} /> : null}
      </div>
    </article>
  );
}
