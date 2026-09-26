import Link from "next/link";
import type { TickerDetail } from "../types";
import { DataFreshness } from "../briefing-ui";

export function TickerHeader({ ticker }: { ticker: TickerDetail }) {
  return <header className="brief-detail-header">
    <Link className="brief-back" href="/tickers">← 오늘 확인할 것</Link>
    <div className="brief-detail-identity"><span className="brief-company-mark" aria-hidden="true">{ticker.ticker.slice(0, 1)}</span><h1>{ticker.ticker} <span>{ticker.companyName}</span></h1></div>
    <DataFreshness asOf={ticker.lastMentionedAt} />
  </header>;
}
