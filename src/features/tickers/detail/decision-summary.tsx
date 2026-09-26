"use client";

import Link from "next/link";
import { useState } from "react";
import type { TickerDetail } from "../types";
import { buildTickerBrief, findOpinionChanges } from "../briefing-model";
import { opportunityCopy } from "../opportunity-copy";
import { EvidenceSource } from "../briefing-ui";
import { WatchlistButton } from "../watchlist-button";
import { useResearch } from "../use-research";
import { markReviewed } from "../research-state";
import { trackProductEvent } from "../product-events";
import { InfluencerAnalysis } from "./influencer-analysis";

export function DecisionSummary({ ticker }: { ticker: TickerDetail }) {
  const brief = buildTickerBrief(ticker, ticker);
  const { records, ready } = useResearch();
  const [status, setStatus] = useState("");
  const [failed, setFailed] = useState(false);
  const record = records[ticker.ticker];
  const changes = findOpinionChanges(record?.baseline, brief.snapshot);
  const copy = opportunityCopy(brief);

  function review() {
    try {
      markReviewed(ticker.ticker, brief.snapshot);
      setFailed(false); setStatus("현재 근거를 확인한 것으로 기록했어요.");
      trackProductEvent("change_reviewed", ticker.ticker, "detail");
    } catch {
      setFailed(true); setStatus("확인 기록을 저장하지 못했어요. 다시 시도해 주세요.");
    }
  }

  return <div className="brief-decision-summary">
    <InfluencerAnalysis ticker={ticker} />
    {changes.length ? <section aria-label="달라진 의견 비교" className="brief-detail-changes">
      <h3>지난 확인 이후의 의견 {changes.length}개</h3>
      <div className="brief-board">{changes.map(change => <article className="brief-update" key={change.after.key}>
        <div className="brief-identity"><h3>{change.after.name}</h3></div>
        <div className="brief-comparison"><div><span>이전에 확인한 의견</span><p>{change.before?.claim || "이 분석가의 의견을 확인한 기록이 없어요."}</p></div><div><span>새로 확인할 의견</span><p>{change.after.claim}</p><EvidenceSource evidence={{ text: change.after.claim, author: change.after.name, date: change.after.date, url: change.after.url }} /></div></div>
      </article>)}</div>
    </section> : null}
    <details className="brief-thesis-summary"><summary>기회 · 위험 · 다음 체크포인트</summary>
      <section className="brief-lead opportunity-detail-lead"><p className="brief-kicker">{copy.angle}</p><h2>{copy.title}</h2></section>
    <div className="brief-board"><div className="brief-reasons">
      <section><h3>기회가 되는 이유</h3><p>{brief.expectation?.text ?? "긍정 근거를 더 확인해야 해요."}</p><EvidenceSource evidence={brief.expectation} /></section>
      <section className="brief-counter"><h3>놓치면 안 될 위험</h3><p>{brief.risk?.text ?? "반대 근거가 부족해요. 위험이 없다는 뜻은 아니에요."}</p><EvidenceSource evidence={brief.risk} /></section>
    </div><section className="brief-next-check"><h3>다음 체크포인트</h3><p>{brief.nextCheck?.text ?? "확인할 조건이 아직 없어요. 내 기록에 체크포인트를 남겨보세요."}</p><EvidenceSource evidence={brief.nextCheck} /></section></div>
    </details>
    <div className="brief-decision-actions"><div><h3>이 기업, 계속 지켜볼까요?</h3><p>저장하면 다음 의견과 비교할 수 있어요.</p></div><div className="brief-actions"><WatchlistButton ticker={ticker.ticker} initialActive={ticker.watchlisted} snapshot={brief.snapshot} withLabel /><Link href={`/tickers/${ticker.ticker}?tab=research`} className="brief-button brief-button--secondary">내 생각 남기기</Link></div></div>
    {ready && ticker.watchlisted ? <div className="brief-review-action"><button className="brief-text-link" type="button" onClick={review}>{changes.length ? "새 근거 확인 완료" : record?.baseline ? "현재 근거 다시 확인" : "현재 근거 확인 완료"}</button><span role={failed ? "alert" : "status"}>{status}</span></div> : null}
    {record?.note ? <section className="brief-saved-note"><h3>내가 관심을 가진 이유</h3><p>{record.note}</p><Link className="brief-text-link" href={`/tickers/${ticker.ticker}?tab=research`}>기록 수정 →</Link></section> : null}
  </div>;
}
