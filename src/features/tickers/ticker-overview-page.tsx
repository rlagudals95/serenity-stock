import { CircleDotDashed, ExternalLink } from "lucide-react";

import { formatKstDate } from "./format";
import { TickerControls } from "./ticker-controls";
import { TickerTable } from "./ticker-table";
import type { TickerOverview, TickerQuery } from "./types";

export function TickerOverviewPage({
  rows,
  query,
  totalCount,
}: {
  rows: TickerOverview[];
  query: TickerQuery;
  totalCount: number;
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
            SERENITY ·{" "}
            <a
              href="https://x.com/aleabitoreddit"
              rel="noopener noreferrer"
              target="_blank"
            >
              @aleabitoreddit
              <ExternalLink aria-hidden="true" size={11} />
            </a>
          </p>
          <h1>Serenity 종목 인텔리전스</h1>
          <p className="page-heading__meta">
            AI·반도체 공급망 분석 · X 팔로워 90만+ · 언급 종목{" "}
            <strong>{totalCount}</strong>개
          </p>
        </div>
        <p className="page-heading__timestamp">
          {latestMention
            ? `${formatKstDate(latestMention)} KST 기준`
            : "분석 데이터 없음"}
        </p>
      </header>
      <div className="table-workspace">
        <TickerControls query={query} />
        <TickerTable query={query} rows={rows} />
      </div>
    </section>
  );
}
