import {
  CircleDotDashed,
  ExternalLink,
  ShieldCheck,
  UsersRound,
} from "lucide-react";

import { analystProfiles } from "./analysts";
import { formatKstDate } from "./format";
import { TickerControls } from "./ticker-controls";
import { TickerTable } from "./ticker-table";
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
}: {
  rows: TickerOverview[];
  query: TickerQuery;
  totalCount: number;
  analysts?: AnalystProfile[];
}) {
  const latestMention = rows.reduce<string | null>((latest, row) => {
    if (!latest || row.lastMentionedAt > latest) return row.lastMentionedAt;
    return latest;
  }, null);

  return (
    <section className="overview-page">
      <header className="page-heading">
        <div>
          <p className="eyebrow">
            <CircleDotDashed aria-hidden="true" size={14} />
            PUBLIC X INVESTMENT SIGNALS
          </p>
          <h1>투자 관점 인텔리전스</h1>
          <p className="page-heading__meta">
            활성 분석가 <strong>{analysts.length}</strong>명의 공개 게시글을
            매일 분석 · 언급 종목 <strong>{totalCount}</strong>개
          </p>
        </div>
        <p className="page-heading__timestamp">
          {latestMention
            ? `${formatKstDate(latestMention)} KST 기준`
            : "분석 데이터 없음"}
        </p>
      </header>
      <section aria-label="추적 중인 분석가" className="analyst-directory">
        <div className="analyst-directory__heading">
          <UsersRound aria-hidden="true" size={15} />
          <span>추적 중인 분석가 {analysts.length}명</span>
        </div>
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
      </section>
      <div className="table-workspace">
        <TickerControls query={query} />
        <TickerTable query={query} rows={rows} />
      </div>
    </section>
  );
}
