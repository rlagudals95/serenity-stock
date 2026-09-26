import {
  ArrowRight,
  ExternalLink,
  Flame,
  GitCompareArrows,
  ShieldAlert,
  Sparkles,
} from "lucide-react";

import { StatusPill } from "@/components/ui/status-pill";

import {
  changeLabels,
  confidenceLabel,
  formatKstDate,
  stanceLabels,
} from "../format";
import type { ResearchItem, TickerDetail } from "../types";
import { MentionChart } from "./mention-chart";

function SourceLink({ href, label = "X 원문" }: { href: string; label?: string }) {
  return (
    <a
      className="source-link"
      href={href}
      rel="noopener noreferrer"
      target="_blank"
    >
      {label}
      <ExternalLink aria-hidden="true" size={13} />
    </a>
  );
}

function ResearchList({
  items,
  empty,
}: {
  items: ResearchItem[];
  empty: string;
}) {
  if (!items.length) return <p className="section-empty">{empty}</p>;

  return (
    <ul className="research-list">
      {items.map((item) => (
        <li key={item.id}>
          <p>{item.text}</p>
          <div className="item-meta">
            <span>{item.analyst.name}</span>
            <time dateTime={item.date}>{formatKstDate(item.date, false)}</time>
            <SourceLink href={item.sourceUrl} />
          </div>
        </li>
      ))}
    </ul>
  );
}

export function OverviewTab({ ticker, showAnalysts = true }: { ticker: TickerDetail; showAnalysts?: boolean }) {
  const directional = ticker.positiveCount + ticker.negativeCount;
  const comparisonLabel =
    ticker.analystComparison === "agreement"
      ? "최근 관점 일치"
      : ticker.analystComparison === "disagreement"
        ? "최근 관점 엇갈림"
        : ticker.analystComparison === "single_source"
          ? "단일 분석가 언급"
          : "관점 비교 보류";

  return (
    <div className="detail-overview-stack">
      {showAnalysts ? <section className="analyst-comparison-section">
        <header className="section-heading-row">
          <div>
            <p className="section-kicker">SOURCE COMPARISON</p>
            <h2>분석가별 최근 관점</h2>
          </div>
          <span
            className={`comparison-result comparison-result--${ticker.analystComparison}`}
          >
            <GitCompareArrows aria-hidden="true" size={14} />
            {comparisonLabel}
          </span>
        </header>
        <div className="analyst-comparison-grid">
          {ticker.analysts.map((analyst) => (
            <article
              className={`analyst-signal-card analyst-signal-card--${analyst.key}`}
              key={analyst.key}
            >
              <header>
                <div>
                  <strong>{analyst.name}</strong>
                  <span>@{analyst.username}</span>
                </div>
                <StatusPill
                  tone={
                    analyst.latestStance === "bullish"
                      ? "positive"
                      : analyst.latestStance === "bearish"
                        ? "negative"
                        : analyst.latestStance === "mixed"
                          ? "mixed"
                          : "neutral"
                  }
                >
                  {stanceLabels[analyst.latestStance]}
                </StatusPill>
              </header>
              <p>
                {analyst.latestClaim ??
                  "최근 게시글에서 명확한 투자 주장이 추출되지 않았습니다."}
              </p>
              <footer>
                <span>첫 언급 {formatKstDate(analyst.firstMentionedAt, false)}</span>
                <span>총 {analyst.totalMentions}회</span>
                {analyst.latestSourceUrl ? (
                  <SourceLink href={analyst.latestSourceUrl} label="최근 원문" />
                ) : null}
              </footer>
            </article>
          ))}
        </div>
      </section> : null}

      <div className="detail-overview-grid">
        <div className="detail-overview-main">
        <section className="detail-section sentiment-trend-section">
          <header className="section-heading-row">
            <div>
              <p className="section-kicker">90 DAY SIGNAL</p>
              <h2>분석가 합의와 언급 추이</h2>
            </div>
            <p className="directional-sample">
              방향성 투표 <span className="data-number">{directional}</span>표 / 총 언급{" "}
              <span className="data-number">{ticker.totalMentions}</span>회
            </p>
          </header>
          <div className="detail-distribution">
            <div className="detail-distribution__numbers">
              <span>
                강세 <strong className="data-number">{ticker.positiveCount}</strong>표
              </span>
              <span>
                약세 <strong className="data-number">{ticker.negativeCount}</strong>표
              </span>
              <span>
                기타{" "}
                <strong className="data-number">
                  {ticker.neutralCount + ticker.mixedCount}
                </strong>
              </span>
            </div>
            <p>최근 90일 내 최소 3명의 유효 투표 중 정확히 2/3 이상이 같은 방향이면 우세로 분류합니다.</p>
          </div>
          <MentionChart data={ticker.trend} />
          <div className="chart-legend" aria-hidden="true">
            <span><i className="legend-dot legend-dot--positive" />긍정</span>
            <span><i className="legend-dot legend-dot--negative" />부정</span>
            <span><i className="legend-dot legend-dot--neutral" />그 외</span>
          </div>
        </section>

        <section className="detail-section claims-section">
          <header className="section-heading-row">
            <div>
              <p className="section-kicker">RECENT CLAIMS</p>
              <h2>최근 주요 주장</h2>
            </div>
            <a className="section-more" href={`?tab=opinions`}>
              전체 의견
              <ArrowRight aria-hidden="true" size={14} />
            </a>
          </header>
          <ol className="claim-list">
            {ticker.claims.map((claim) => (
              <li key={claim.id}>
                <div className="claim-meta">
                  <span className="claim-analyst">{claim.analyst.name}</span>
                  <time dateTime={claim.date}>{formatKstDate(claim.date, false)}</time>
                  <StatusPill
                    tone={
                      claim.stance === "bullish"
                        ? "positive"
                        : claim.stance === "bearish"
                          ? "negative"
                          : claim.stance === "mixed"
                            ? "mixed"
                            : "neutral"
                    }
                  >
                    {stanceLabels[claim.stance]}
                  </StatusPill>
                  {claim.changeType ? (
                    <span>{changeLabels[claim.changeType]}</span>
                  ) : null}
                </div>
                <p>{claim.text}</p>
                <div className="item-meta">
                  {claim.repeatCount ? <span>반복 {claim.repeatCount}회</span> : null}
                  <SourceLink href={claim.sourceUrl} label="근거 원문" />
                </div>
              </li>
            ))}
          </ol>
        </section>
        </div>

        <aside className="detail-overview-rail">
        <section className="rail-section recent-change-section">
          <header>
            <Flame aria-hidden="true" size={15} />
            <h2>최근 변화</h2>
          </header>
          <div className="rail-section__meta">
            <StatusPill tone="accent">
              {ticker.changeType ? changeLabels[ticker.changeType] : "변화 없음"}
            </StatusPill>
            <span>확신 {confidenceLabel(ticker.recentChange.confidence)}</span>
          </div>
          <p>{ticker.recentChange.summary}</p>
          <div className="source-pair">
            <SourceLink href={ticker.recentChange.currentSourceUrl} label="현재 원문" />
            {ticker.recentChange.previousSourceUrl ? (
              <SourceLink href={ticker.recentChange.previousSourceUrl} label="이전 원문" />
            ) : null}
          </div>
        </section>

        <section className="rail-section">
          <header>
            <ShieldAlert aria-hidden="true" size={15} />
            <h2>최근 리스크</h2>
          </header>
          <ResearchList
            empty="최근 30일 동안 추출된 리스크가 없습니다."
            items={ticker.risks}
          />
        </section>

        <section className="rail-section">
          <header>
            <Sparkles aria-hidden="true" size={15} />
            <h2>최근 Catalyst</h2>
          </header>
          <ResearchList
            empty="최근 30일 동안 추출된 Catalyst가 없습니다."
            items={ticker.catalysts}
          />
        </section>
        </aside>
      </div>
    </div>
  );
}
