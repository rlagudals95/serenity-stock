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
import { DataFreshness } from "./briefing-ui";
import { TickerTable, type TickerPagination } from "./ticker-table";
import type {
  AnalystProfile,
  SourceRole,
  TickerOverview,
  TickerProofOverview,
  TickerQuery,
} from "./types";

const sourceRoleLabels: Record<SourceRole, string> = {
  opinion: "의견 소스",
  context: "근거·맥락",
  news: "뉴스·탐색",
  risk: "리스크 검증",
};

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
  topCandidates?: TickerOverview[];
}) {
  const latestMention = rows.reduce<string | null>((latest, row) => {
    if (!latest || row.lastMentionedAt > latest) return row.lastMentionedAt;
    return latest;
  }, null);

  return (
    <section className="overview-page">
      <header className="brief-intro explore-intro"><p className="brief-kicker">직접 찾아보고 싶다면</p><h1>궁금한 종목을<br />같은 기준으로 비교해요.</h1><p className="brief-subtitle">공개 의견과 최근 변화, 과거 결과를 함께 살펴볼 수 있어요.</p><DataFreshness asOf={latestMention} /></header>
      <details className="brief-performance"><summary>과거 신호의 실제 결과 보기</summary><TickerProofHero
        analystCount={analysts.length}
        latestMention={latestMention}
        overview={proofOverview ?? buildProofOverview(rows)}
        totalCount={totalCount}
      /></details>
      <nav aria-label="종목 후보 보기" className="ticker-view-tabs">
        {[
          ["verified", "긍정 관점 후보", "/tickers?view=verified"],
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
            <h2>탐색 결과</h2>
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
                  <div className="analyst-profile__title">
                    <h2>{analyst.name}</h2>
                    <span>{sourceRoleLabels[analyst.sourceRole]}</span>
                  </div>
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
              {analyst.consensusEligible ? (
                <p className="analyst-profile__consensus">종합의견 반영</p>
              ) : null}
              <ul aria-label={`${analyst.name} 주요 분석 분야`}>
                {analyst.focusAreas.map((area) => (
                  <li key={area}>{area}</li>
                ))}
              </ul>
            </article>
          ))}
        </div>
        <div className="project-disclosure">
          <ShieldCheck aria-hidden="true" size={15} />
          <p>
            각 분석가와 리서치 브랜드에는 보유 포지션, 유료 구독,
            운용사·스폰서 관계에 따른 이해상충이 있을 수 있습니다. 이 서비스는
            어떤 계정과도 제휴하지 않으며, 공개 발언을 투자 조언이나 감사된 운용
            성과로 취급하지 않습니다.
            {analysts.some((analyst) => analyst.key === "shay_boloor") ? (
              <>
                {" "}
                Shay의 공개 포트폴리오 성과는 Savvy Trader를 통해 추적되지만,
                회계법인의 감사를 받은 운용 성과가 아닙니다. 이 서비스는 공개
                게시물을 분석하는 팬 프로젝트이며 Shay 본인이나 관련 회사와
                제휴된 관계가 아닙니다.
              </>
            ) : null}
          </p>
        </div>
      </details>
    </section>
  );
}
