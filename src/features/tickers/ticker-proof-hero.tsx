import { ExternalLink } from "lucide-react";
import Link from "next/link";

import { formatKstDate } from "./format";
import type { TickerProofOverview } from "./types";

function formatPercent(value: number) {
  const sign = value > 0 ? "+" : "";
  return `${sign}${(value * 100).toFixed(1)}%`;
}

export function TickerProofHero({
  overview,
  totalCount,
  analystCount,
  latestMention,
}: {
  overview: TickerProofOverview;
  totalCount: number;
  analystCount: number;
  latestMention: string | null;
}) {
  const completed = overview.state === "completed";

  return (
    <header className={`ticker-proof-hero ticker-proof-hero--${overview.state}`}>
      <div className="ticker-proof-hero__intro">
        <p className="eyebrow">
          {completed
            ? "20거래일 판정 완료 · 공개 원문 기반"
            : "공개 의견 이후 주가 추적 중"}
        </p>
        <h1>
          {completed
            ? "주식 인플루언서가 고르고, 실제로 오른 종목"
            : "주식 인플루언서 픽, 실제 결과를 추적합니다"}
        </h1>
      </div>

      {overview.cases.length > 0 ? (
        <div aria-label="실제 주가 결과" className="proof-case-strip">
          {overview.cases.map((item) => (
            <article className="proof-case" key={`${item.ticker}-${item.signalAt}`}>
              <div className="proof-case__identity">
                <span>
                  {item.state === "completed"
                    ? "최근 판정 완료 사례"
                    : "현재까지 상승"}
                </span>
                <Link
                  aria-label={`${item.ticker} 상세 보기`}
                  href={`/tickers/${item.ticker}`}
                >
                  {item.ticker}
                </Link>
              </div>
              <strong className="proof-case__return">
                {formatPercent(item.returnValue)}
              </strong>
              <p>
                {item.state === "completed"
                  ? "20거래일 후 상승"
                  : "현재까지 상승 · 20일 판정 중"}
              </p>
              <footer>
                <span>{item.analystName ?? item.companyName}</span>
                {item.sourceUrl ? (
                  <a
                    aria-label="원문"
                    href={item.sourceUrl}
                    rel="noopener noreferrer"
                    target="_blank"
                  >
                    원문
                    <ExternalLink aria-hidden="true" size={10} />
                  </a>
                ) : null}
              </footer>
            </article>
          ))}
        </div>
      ) : (
        <div className="proof-case-strip proof-case-strip--empty">
          <p>20거래일 판정이 완료되면 상승·미적중 결과를 함께 공개합니다.</p>
        </div>
      )}

      <div className="proof-rollup">
        {completed ? (
          <>
            <span>판정 완료 {overview.completedCount}건</span>
            <strong>상승 {overview.hitCount}건</strong>
            <span>미적중 {overview.missCount}건</span>
            <span>기준 20거래일 후 상승</span>
          </>
        ) : (
          <>
            <span>현재 상승 추적 {overview.cases.length}건</span>
            <strong>20거래일 검증 중</strong>
            <span>완료 후 상승·미적중 모두 공개</span>
          </>
        )}
        <span className="proof-rollup__universe">
          전체 {totalCount}개 · 인플루언서 {analystCount}명
        </span>
        <time dateTime={latestMention ?? undefined}>
          {latestMention
            ? `${formatKstDate(latestMention)} KST 기준`
            : "분석 데이터 없음"}
        </time>
      </div>
    </header>
  );
}
