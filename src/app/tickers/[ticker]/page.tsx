import { notFound } from "next/navigation";
import Link from "next/link";

import { MetricsStrip } from "@/features/tickers/detail/metrics-strip";
import { OpinionsTab } from "@/features/tickers/detail/opinions-tab";
import { OverviewTab } from "@/features/tickers/detail/overview-tab";
import { ResearchTab } from "@/features/tickers/detail/research-tab";
import { TickerHeader } from "@/features/tickers/detail/ticker-header";
import { getTickerDetail } from "@/features/tickers/repository";

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
  const ticker = await getTickerDetail(rawTicker);

  if (!ticker) notFound();

  const tab = parseTab(query.tab);
  const tabs: Array<{ value: DetailTab; label: string }> = [
    { value: "overview", label: "개요" },
    { value: "opinions", label: `의견과 원문 ${ticker.opinions.length}` },
    { value: "research", label: "내 리서치" },
  ];

  return (
    <article className="ticker-detail-page">
      <TickerHeader ticker={ticker} />
      <MetricsStrip ticker={ticker} />
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
        {tab === "overview" ? <OverviewTab ticker={ticker} /> : null}
        {tab === "opinions" ? (
          <OpinionsTab opinions={ticker.opinions} ticker={ticker.ticker} />
        ) : null}
        {tab === "research" ? <ResearchTab ticker={ticker} /> : null}
      </div>
    </article>
  );
}
