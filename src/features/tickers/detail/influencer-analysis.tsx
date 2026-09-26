"use client";

import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { opinionSnapshot } from "../briefing-model";
import { formatKstDate, stanceLabels } from "../format";
import { influencerInitials, latestInfluencerViews, matchingOpinion } from "../influencer-model";
import { trackProductEvent } from "../product-events";
import type { Stance, TickerDetail } from "../types";

export function InfluencerAnalysis({ ticker }: { ticker: TickerDetail }) {
  const sources = latestInfluencerViews(opinionSnapshot(ticker));
  const withClaim = sources.filter(source => source.claim);
  const positive = withClaim.filter(source => source.stance === "bullish").length;
  const negative = withClaim.filter(source => source.stance === "bearish").length;
  const other = withClaim.length - positive - negative;

  return <section className="influencer-analysis" aria-labelledby="influencer-analysis-title">
    <header className="influencer-heading">
      <div><p className="brief-kicker">인플루언서의 시선</p><h2 id="influencer-analysis-title">이 기업을 보는 {sources.length ? `${sources.length}명` : "사람들"}의 생각</h2></div>
      {ticker.opinions.length ? <Link href={`/tickers/${ticker.ticker}?tab=opinions`} className="brief-text-link">전체 분석 보기 →</Link> : null}
    </header>
    {sources.length ? <>
      <div className="influencer-consensus" aria-label="인플루언서별 최근 입장 집계">
        <div className="influencer-counts"><span className="is-positive">긍정 <strong>{positive}명</strong></span><span className="is-negative">부정 <strong>{negative}명</strong></span>{other > 0 ? <span>중립·혼재 등 <strong>{other}명</strong></span> : null}{sources.length > withClaim.length ? <span>주장 미확인 <strong>{sources.length - withClaim.length}명</strong></span> : null}</div>
        <p>각 인물의 최근 주장 기준 · AI 분류</p>
      </div>
      <div className="influencer-views">{sources.map(source => {
        const analyst = ticker.analysts.find(item => item.key === source.key)!;
        const opinion = matchingOpinion(source, ticker.opinions);
        return <article className="influencer-view" key={source.key} aria-label={`${source.name}의 최근 의견`}>
          <header className="influencer-person"><span className="influencer-avatar" aria-hidden="true">{influencerInitials(source.name)}</span><div><h3>{source.name}</h3><span>@{analyst.username}</span></div><span className={`influencer-stance influencer-stance--${source.claim ? source.stance : "unknown"}`}>{source.claim ? stanceLabels[source.stance as Stance] ?? "의견 미분류" : "주장 미확인"}</span></header>
          <div className="influencer-position"><p>{source.claim || "최근 게시글에서 핵심 주장을 아직 찾지 못했어요."}</p>
            <div className="influencer-source"><time dateTime={source.date}>{formatKstDate(source.date, false)}</time>{source.url ? <a href={source.url} target="_blank" rel="noopener noreferrer" aria-label={`${source.name} 원문`} onClick={() => trackProductEvent("evidence_open", ticker.ticker, "influencer-source")}>원문 <ExternalLink size={12} aria-hidden="true" /></a> : <span>원문 링크 없음</span>}</div>
            {opinion && (opinion.evidence || opinion.fullText) ? <details className="influencer-evidence" onToggle={event => { if (event.currentTarget.open) trackProductEvent("evidence_open", ticker.ticker, "influencer-analysis"); }}>
              <summary>분석 근거 펼치기</summary>
              {opinion.reviewStatus === "needs_review" ? <p className="influencer-review">검토가 필요한 분석이에요.</p> : null}
              {opinion.evidence ? <div><h4>주장의 근거</h4><p>{opinion.evidence}</p></div> : null}
              {opinion.fullText ? <div><h4>수집된 원문</h4><p className="influencer-original">{opinion.fullText}</p></div> : null}
            </details> : null}
          </div>
        </article>;
      })}</div>
    </> : <p className="section-empty">아직 수집된 인플루언서 의견이 없어요.</p>}
  </section>;
}
