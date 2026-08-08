import {
  ExternalLink,
  ShieldCheck,
  UsersRound,
} from "lucide-react";
import Link from "next/link";

import { analystProfiles } from "./analysts";
import { formatKstDate } from "./format";
import { TickerControls } from "./ticker-controls";
import { TickerTable, type TickerPagination } from "./ticker-table";
import type {
  AnalystProfile,
  TickerOverview,
  TickerQuery,
} from "./types";

export function TickerOverviewPage({
  rows,
  query,
  totalCount,
  analysts = analystProfiles,
  pagination,
}: {
  rows: TickerOverview[];
  query: TickerQuery;
  totalCount: number;
  analysts?: AnalystProfile[];
  pagination?: TickerPagination;
}) {
  const latestMention = rows.reduce<string | null>((latest, row) => {
    if (!latest || row.lastMentionedAt > latest) return row.lastMentionedAt;
    return latest;
  }, null);

  return (
    <section className="overview-page">
      <header className="page-heading">
        <div>
          <p className="eyebrow">INFLUENCER CONVICTION SCREEN</p>
          <h1>검증된 투자 후보</h1>
          <p className="page-heading__meta">
            여러 인플루언서의 방향성 합의와 실제 시장 반응이 확인된 종목부터 비교하세요.
          </p>
        </div>
        <div className="page-heading__status">
          <span>
            전체 <strong>{totalCount}</strong>개 종목 ·{" "}
            <strong>{analysts.length}</strong>개 소스
          </span>
          <p className="page-heading__timestamp">
            {latestMention
              ? `${formatKstDate(latestMention)} KST 기준`
              : "분석 데이터 없음"}
          </p>
        </div>
      </header>
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
            <p className="section-kicker">SHORTLIST</p>
            <h2>후보 비교</h2>
          </div>
          <p>
            의견 근거는 확인 가능한 원문과 의견 참여 인원, 의견 후 주가는 2명
            이상 의견이 모인 날부터의 수익률입니다.
          </p>
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
