import Link from "next/link";
import { ArrowUpRight, ExternalLink } from "lucide-react";
import { formatKstDate } from "./format";
import { isStale, type BriefEvidence, type TickerBrief } from "./briefing-model";
import { CandidateLink } from "./candidate-link";
import { opportunityCopy } from "./opportunity-copy";
import { influencerInitials, supportingInfluencers } from "./influencer-model";

export function EvidenceSource({ evidence }: { evidence: BriefEvidence | null }) {
  if (!evidence) return null;
  return <div className="brief-source"><span>{evidence.author} · {formatKstDate(evidence.date, false)}</span>{evidence.url ? <a href={evidence.url} target="_blank" rel="noopener noreferrer">원문 <ExternalLink size={12} aria-hidden="true" /></a> : null}</div>;
}

export function DataFreshness({ asOf }: { asOf: string | null }) {
  if (!asOf) return <p className="brief-freshness">분석된 공개 의견이 아직 없어요.</p>;
  return <p className={`brief-freshness ${isStale(asOf) ? "is-stale" : ""}`}><time dateTime={asOf}>최근 의견 {formatKstDate(asOf)} KST</time>{isStale(asOf) ? <span>7일 이상 지난 의견 · 최신 자료 확인 필요</span> : null}</p>;
}

export function BriefCard({ brief }: { brief: TickerBrief }) {
  const copy = opportunityCopy(brief);
  const supporters = supportingInfluencers(brief.snapshot);
  const names = supporters.slice(0, 2).map(source => source.name).join(" · ");
  const proof = supporters.length ? `긍정 의견 ${supporters.length}명 · ${names}${supporters.length > 2 ? ` 외 ${supporters.length - 2}명` : ""}` : "";
  return <article className="opportunity" aria-label={`${brief.ticker} 추천 근거`}>
    <CandidateLink ticker={brief.ticker} className="opportunity-link" label={`${brief.ticker} · ${copy.title.replace(/\n/g, " ")} · ${copy.teaser} · ${proof} · 성장 이야기 보기`}>
      <div className="opportunity-story">
        <p className="opportunity-angle">{copy.angle}</p>
        <h3>{copy.title}</h3>
        <p className="opportunity-teaser">{copy.teaser}</p>
      </div>
      <div className="opportunity-company"><strong>{brief.ticker}</strong><span>{brief.companyName}</span></div>
      {supporters.length ? <div className="opportunity-proof"><div className="influencer-avatar-stack" aria-hidden="true">{supporters.slice(0, 2).map(source => <span className="influencer-avatar" key={source.key}>{influencerInitials(source.name)}</span>)}</div><div><strong>긍정 의견 {supporters.length}명</strong><span>{names}{supporters.length > 2 ? ` 외 ${supporters.length - 2}명` : ""}</span></div></div> : null}
      <span className="opportunity-cta">성장 이야기 보기 <ArrowUpRight size={17} aria-hidden="true" /></span>
    </CandidateLink>
  </article>;
}

export function BriefEmpty({ title, children }: { title: string; children: React.ReactNode }) {
  return <div className="brief-empty"><h2>{title}</h2><p>{children}</p><Link className="brief-button brief-button--secondary" href="/tickers?view=all">전체 종목 살펴보기</Link></div>;
}
