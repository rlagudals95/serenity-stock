import { ArrowLeftRight, UsersRound } from "lucide-react";
import Link from "next/link";

import { StatusPill } from "@/components/ui/status-pill";

import {
  changeLabels,
  cumulativeSentimentLabels,
  formatKstDate,
  stanceLabels,
} from "../format";
import type { TickerDetail } from "../types";
import { SignalPerformanceHero } from "../signal-performance";
import { WatchlistButton } from "../watchlist-button";

export function TickerHeader({ ticker }: { ticker: TickerDetail }) {
  const conflict =
    (ticker.cumulativeSentiment === "positive" &&
      ticker.latestStance === "bearish") ||
    (ticker.cumulativeSentiment === "negative" &&
      ticker.latestStance === "bullish");

  return (
    <header className="ticker-detail-header">
      <nav aria-label="Breadcrumb" className="breadcrumb">
        <Link href="/tickers">Tickers</Link>
        <span aria-hidden="true">/</span>
        <span aria-current="page">{ticker.ticker}</span>
      </nav>
      <div className="ticker-title-row">
        <h1>
          <span className="ticker-title-symbol">{ticker.ticker}</span>
          {" "}
          <span className="ticker-title-company">{ticker.companyName}</span>
        </h1>
        <div className="ticker-title-actions">
          <WatchlistButton
            initialActive={ticker.watchlisted}
            ticker={ticker.ticker}
            withLabel
          />
        </div>
      </div>
      <SignalPerformanceHero performance={ticker.signalPerformance} />
      <div className="ticker-context">
        <div className="context-item">
          <span className="context-item__label">누적 관점</span>
          <StatusPill
            tone={
              ticker.cumulativeSentiment === "positive"
                ? "positive"
                : ticker.cumulativeSentiment === "negative"
                  ? "negative"
                  : ticker.cumulativeSentiment === "mixed"
                    ? "mixed"
                    : "neutral"
            }
          >
            {cumulativeSentimentLabels[ticker.cumulativeSentiment]}
          </StatusPill>
        </div>
        {conflict ? (
          <ArrowLeftRight
            aria-label="누적 관점과 최근 의견 불일치"
            className="context-conflict"
            size={15}
          />
        ) : null}
        <div className="context-item">
          <span className="context-item__label">최근 의견</span>
          <StatusPill
            tone={
              ticker.latestStance === "bullish"
                ? "positive"
                : ticker.latestStance === "bearish"
                  ? "negative"
                  : ticker.latestStance === "mixed"
                    ? "mixed"
                    : "neutral"
            }
          >
            {stanceLabels[ticker.latestStance]}
          </StatusPill>
        </div>
        <div className="context-item">
          <span className="context-item__label">최근 변화</span>
          <span className="context-item__value">
            {ticker.changeType ? changeLabels[ticker.changeType] : "변화 없음"}
          </span>
        </div>
        <div className="context-item context-item--coverage">
          <span className="context-item__label">분석가 커버리지</span>
          <span className="context-item__value">
            <UsersRound aria-hidden="true" size={13} />
            {ticker.analysts.length === 2
              ? "두 분석가 모두 언급"
              : ticker.analysts.length > 2
                ? `${ticker.analysts.length}명 분석가가 언급`
                : `${ticker.analysts[0]?.name ?? "분석가"}만 언급`}
          </span>
        </div>
      </div>
      <p className="ticker-analysis-time">
        마지막 정상 분석 {formatKstDate(ticker.lastAnalysisAt)}
      </p>
    </header>
  );
}
