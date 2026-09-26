"use client";

import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { BriefCard, BriefEmpty, DataFreshness } from "./briefing-ui";
import { CandidateLink } from "./candidate-link";
import { findOpinionChanges, type TickerBrief } from "./briefing-model";
import { useResearch } from "./use-research";
import { formatKstDate } from "./format";
import { WatchlistButton } from "./watchlist-button";

export function BriefingHome({ candidates, watched, watchlistPage = false }: {
  candidates: TickerBrief[]; watched: TickerBrief[]; watchlistPage?: boolean;
}) {
  const { records, ready } = useResearch();
  const updates = watched.flatMap(brief => {
    const changes = findOpinionChanges(records[brief.ticker]?.baseline, brief.snapshot);
    return changes.length ? [{ brief, change: changes[0], count: changes.length }] : [];
  });
  const unreviewed = watched.filter(brief => !records[brief.ticker]?.baseline);
  const returning = watched.length > 0;
  const quiet = ready && returning && updates.length === 0;
  const newest = [...candidates, ...watched].map(b => b.asOf).sort().at(-1) ?? null;

  return <section className={`brief-page ${!watchlistPage ? "discovery-page" : ""}`}>
    <header className="brief-intro discovery-intro">
      <p className="brief-kicker">{watchlistPage ? "내가 고른 기회" : returning && ready && updates.length ? "관심 종목의 다음 이야기" : "공개 의견에서 찾은 투자 아이디어"}</p>
      <h1>{watchlistPage ? <>눈여겨본 기업,<br />이어서 살펴보세요.</> : returning && ready && updates.length ? <>내가 보던 종목,<br />{updates.length}개에 새 근거가 있어요.</> : candidates.length ? <>다음 기회는<br />어디에 있을까요?</> : <>다음 투자 기회,<br />근거부터 살펴보세요.</>}</h1>
      <p className="brief-subtitle">{watchlistPage ? "저장한 이유와 달라진 근거를 한곳에서." : returning && ready && updates.length ? "달라진 근거부터 확인하세요." : "관심 가는 이야기부터 골라보세요."}</p>
      {newest ? <DataFreshness asOf={newest} /> : null}
    </header>

    {watchlistPage ? <>
      <div className="brief-section-heading"><h2>저장한 종목 <span>{watched.length}</span></h2><p>이 브라우저의 관심 목록</p></div>
      {watched.length ? <div className="brief-board">{watched.map(brief => {
        const record = records[brief.ticker];
        const count = findOpinionChanges(record?.baseline, brief.snapshot).length;
        return <article className="brief-watch-row" key={brief.ticker}>
          <div className="brief-company-mark" aria-hidden="true">{brief.ticker.slice(0, 1)}</div>
          <div><div className="brief-identity"><h3>{brief.ticker}</h3><span>{brief.companyName}</span>{count > 0 ? <span className="brief-tag">새 근거 {count}개</span> : null}{record?.status === "paused" ? <span className="brief-tag">보류</span> : null}</div>
            <p className="brief-watch-note">{record?.note || "관심을 가진 이유를 아직 기록하지 않았어요."}</p>
            <p className="brief-card-meta">{record?.reviewedAt ? `마지막 확인 ${formatKstDate(record.reviewedAt)}` : "판단 근거를 읽고 현재 의견을 확인해 주세요."}</p>
          </div>
          <div className="brief-watch-actions"><CandidateLink ticker={brief.ticker} change={count > 0} className="brief-text-link">이어서 보기 <ArrowUpRight size={15} aria-hidden="true" /></CandidateLink><WatchlistButton ticker={brief.ticker} initialActive={brief.watchlisted} snapshot={brief.snapshot} withLabel /></div>
        </article>;
      })}</div> : <BriefEmpty title="아직 저장한 종목이 없어요">이유를 읽고 관심이 가는 종목 하나부터 골라보세요.</BriefEmpty>}
      <p className="brief-storage-note">메모와 확인 기록은 이 브라우저에 보관돼요. 브라우저 데이터를 지우면 함께 삭제됩니다.</p>
    </> : <>
      {returning ? <section aria-label="관심 종목의 변화" className={`brief-updates ${quiet ? "brief-updates--quiet" : ""}`}>
        <div className="brief-section-heading"><h2>지난 확인 이후 {ready ? <span>{updates.length}</span> : null}</h2><Link href="/watchlist" className="brief-text-link">내 관심 종목 →</Link></div>
        {!ready ? <p className="brief-empty-inline" role="status">내 확인 기록을 불러오는 중이에요.</p> : updates.length ? <div className="brief-board">{updates.map(({ brief, change, count }) => <article className="brief-update" key={brief.ticker}>
          <div className="brief-identity"><h3>{brief.ticker}</h3><span>{brief.companyName}</span><span className="brief-tag">{change.after.change === "new_risk" ? "새 위험 근거" : change.after.change === "stance_change" ? "관점 변경" : "새 공개 의견"}{count > 1 ? ` 외 ${count - 1}개` : ""}</span></div>
          <div className="brief-comparison"><div><span>이전에 확인한 의견</span><p>{change.before?.claim || "이 분석가의 의견을 확인한 기록이 없어요."}</p></div><div><span>지난 확인 이후 · {change.after.name}</span><p>{change.after.claim}</p></div></div>
          <div className="brief-update-footer"><time dateTime={change.after.date}>{formatKstDate(change.after.date)}</time><CandidateLink ticker={brief.ticker} change className="brief-text-link">달라진 근거 확인 <ArrowUpRight size={15} aria-hidden="true" /></CandidateLink></div>
        </article>)}</div> : <div className="brief-empty-inline"><h3>{unreviewed.length ? "저장한 종목, 어디까지 확인했나요?" : "관심 종목에 새 변화가 없어요"}</h3><p>{unreviewed.length ? "처음 확인한 의견을 기준으로 이후의 변화를 비교해 드려요." : "추적 중인 공개 의견 기준이에요. 새로운 자료가 수집되면 다시 비교해 드릴게요."}</p>{unreviewed.length ? <div className="brief-actions">{unreviewed.slice(0, 3).map(b => <CandidateLink key={b.ticker} ticker={b.ticker} className="brief-text-link">{b.ticker} 근거 확인 →</CandidateLink>)}</div> : null}</div>}
      </section> : null}
      <section aria-label="검토할 후보">
        <div className="brief-section-heading"><h2>눈여겨볼 기회 <span>{candidates.length}</span></h2><Link href="/tickers?view=all" className="brief-text-link">전체 탐색 →</Link></div>
        {candidates.length ? <div className="opportunity-list">{candidates.map(brief => <BriefCard key={brief.ticker} brief={brief} />)}</div> : <BriefEmpty title="현재 기준을 충족한 후보가 없어요">새로운 의견이 쌓이면 후보를 다시 보여드릴게요.</BriefEmpty>}
        <details className="brief-method"><summary>어떻게 골랐나요?</summary><p>공개 의견에 기반한 검토 후보이며 개인화된 매수 추천은 아닙니다. 원문 링크와 구체적인 긍정 주장이 있고 긍정 의견 수가 부정 의견 수보다 많은 종목에서 고릅니다. 여러 의견 비교는 긍정 소스 수, 새 변화 포착은 첫 언급·새 주장의 시점, 사업 성장 추적은 원문 요약의 반복 매출·채택 확대·시장 확대 표현을 기준으로 선정해요. 성장 관점을 먼저 확보한 뒤 중복 종목 없이 최대 3개를 보여줍니다. 특정 관점의 근거가 없으면 추가 비교 후보로 표시하며, 최소 근거가 부족하면 3개를 억지로 채우지 않아요. 의견 수는 수익 확률이 아니며, 배당·저평가·저위험 판단은 현재 데이터로 제공하지 않습니다.</p></details>
      </section>
    </>}
  </section>;
}
