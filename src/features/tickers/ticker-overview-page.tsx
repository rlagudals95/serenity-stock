import {
  ExternalLink,
  ShieldCheck,
  UsersRound,
} from "lucide-react";
import Link from "next/link";

import { analystProfiles } from "./analysts";
import { buildProofOverview } from "./proof-model";
import { TickerControls } from "./ticker-controls";
import { TickerProofHero } from "./ticker-proof-hero";
import { TickerTable, type TickerPagination } from "./ticker-table";
import type {
  AnalystProfile,
  TickerOverview,
  TickerProofOverview,
  TickerQuery,
} from "./types";

export function TickerOverviewPage({
  rows,
  query,
  totalCount,
  analysts = analystProfiles,
  pagination,
  proofOverview,
}: {
  rows: TickerOverview[];
  query: TickerQuery;
  totalCount: number;
  analysts?: AnalystProfile[];
  pagination?: TickerPagination;
  proofOverview?: TickerProofOverview;
}) {
  const latestMention = rows.reduce<string | null>((latest, row) => {
    if (!latest || row.lastMentionedAt > latest) return row.lastMentionedAt;
    return latest;
  }, null);

  return (
    <section className="overview-page">
      <TickerProofHero
        analystCount={analysts.length}
        latestMention={latestMention}
        overview={proofOverview ?? buildProofOverview(rows)}
        totalCount={totalCount}
      />
      <nav aria-label="종목 후보 보기" className="ticker-view-tabs">
        {[
          ["verified", "검증된 후보", "/tickers"],
          ["momentum", "관심 급증", "/tickers?view=momentum"],
          ["changes", "리스크·방향 전환", "/tickers?view=changes"],
          ["all", "전체 종목", "/tickers?view=all"],
        ].map(([view, label, href]) => (
          <Link
            aria-current={query.view === view ? "page" : undefined}
            className={query.view === view ? "is-active" : undefined}
            href={href}
            key={view}
          >
            {label}
          </Link>
        ))}
      </nav>
      <section className="universe-section">
        <header className="universe-section__heading">
          <div>
            <p className="section-kicker">CURRENT PICKS</p>
            <h2>이들이 지금 보는 종목</h2>
          </div>
          <p>과거 적중 이력과 완료 표본을 함께 봅니다.</p>
        </header>
        <div className="table-workspace">
          <TickerControls
            query={query}
            resultCount={pagination?.total ?? rows.length}
          />
          <TickerTable pagination={pagination} query={query} rows={rows} />
        </div>
      </section>
      <details className="analyst-directory">
        <summary className="analyst-directory__heading">
          <UsersRound aria-hidden="true" size={15} />
          <span>추적 소스 {analysts.length}명</span>
          <span className="analyst-directory__preview">
            {analysts.map((analyst) => analyst.name).join(" · ")}
          </span>
          <span className="analyst-directory__toggle">목록 보기</span>
        </summary>
        <div className="analyst-profile-grid">
          {analysts.map((analyst) => (
            <article
              className={`analyst-profile analyst-profile--${analyst.key}`}
              key={analyst.key}
            >
              <header>
                <div>
                  <h2>{analyst.name}</h2>
                  <a
                    href={`https://x.com/${analyst.username}`}
                    rel="noopener noreferrer"
                    target="_blank"
                  >
                    @{analyst.username}
                    <ExternalLink aria-hidden="true" size={11} />
                  </a>
                </div>
                <span>{analyst.followerLabel}</span>
              </header>
              <p>{analyst.description}</p>
              <ul aria-label={`${analyst.name} 주요 분석 분야`}>
                {analyst.focusAreas.map((area) => (
                  <li key={area}>{area}</li>
                ))}
              </ul>
            </article>
          ))}
        </div>
        {analysts.some((analyst) => analyst.key === "shay_boloor") ? (
          <div className="project-disclosure">
            <ShieldCheck aria-hidden="true" size={15} />
            <p>
              Shay의 공개 포트폴리오 성과는 Savvy Trader를 통해 추적되지만,
              회계법인의 감사를 받은 운용 성과가 아닙니다. 이 서비스는 공개
              게시물을 분석하는 팬 프로젝트이며 Shay 본인이나 관련 회사와
              제휴된 관계가 아닙니다.
            </p>
          </div>
        ) : null}
      </details>
    </section>
  );
}
