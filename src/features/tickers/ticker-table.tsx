import {
  ArrowDown,
  ArrowUp,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import Link from "next/link";

import type { TickerOverview, TickerQuery, TickerSort } from "./types";
import { TickerRow } from "./ticker-row";

const headers: Array<{
  label: string;
  sort?: TickerSort;
  className: string;
}> = [
  { label: "종목", sort: "ticker", className: "ticker-column" },
  { label: "분석가별 최근 관점", className: "analyst-column" },
  { label: "총 언급", sort: "totalMentions", className: "total-column" },
  { label: "긍정 / 부정", sort: "positiveCount", className: "distribution-column" },
  { label: "누적 관점", className: "sentiment-column" },
  { label: "최근 의견", className: "stance-column" },
  { label: "변화", className: "change-column" },
  { label: "7D / 30D", sort: "mentions7d", className: "period-column" },
  { label: "최근 언급", sort: "lastMentionedAt", className: "relative-time-column" },
  { label: "품질", className: "quality-column" },
];

function sortHref(query: TickerQuery, sort: TickerSort) {
  const params = new URLSearchParams();
  if (query.q) params.set("q", query.q);
  if (query.watchlist) params.set("watchlist", "true");
  if (query.sentiment !== "all") params.set("sentiment", query.sentiment);
  if (query.stance !== "all") params.set("stance", query.stance);
  if (query.change !== "all") params.set("change", query.change);
  if (query.period !== "all") params.set("period", query.period);
  params.set("sort", sort);
  params.set(
    "order",
    query.sort === sort && query.order === "desc" ? "asc" : "desc",
  );
  return `/tickers?${params.toString()}`;
}

export function TickerTable({
  rows,
  query,
}: {
  rows: TickerOverview[];
  query: TickerQuery;
}) {
  if (rows.length === 0) {
    return (
      <div className="table-empty">
        <p>조건에 맞는 종목이 없습니다.</p>
        <Link className="text-button" href="/tickers">
          필터 초기화
        </Link>
      </div>
    );
  }

  return (
    <div className="table-shell">
      <div className="table-scroll">
        <table className="ticker-table">
          <colgroup>
            <col className="watchlist-column" />
            <col className="ticker-column" />
            <col className="analyst-column" />
            <col className="total-column" />
            <col className="distribution-column" />
            <col className="sentiment-column" />
            <col className="stance-column" />
            <col className="change-column" />
            <col className="period-column" />
            <col className="relative-time-column" />
            <col className="quality-column" />
          </colgroup>
          <thead>
            <tr>
              <th className="watchlist-column" scope="col">
                <span className="sr-only">Watchlist</span>
              </th>
              {headers.map((header) => (
                <th
                  aria-sort={
                    query.sort === header.sort
                      ? query.order === "desc"
                        ? "descending"
                        : "ascending"
                      : undefined
                  }
                  className={header.className}
                  key={header.label}
                  scope="col"
                >
                  {header.sort ? (
                    <Link
                      className="sort-link"
                      href={sortHref(query, header.sort)}
                    >
                      {header.label}
                      {query.sort === header.sort ? (
                        query.order === "desc" ? (
                          <ArrowDown aria-hidden="true" size={13} />
                        ) : (
                          <ArrowUp aria-hidden="true" size={13} />
                        )
                      ) : null}
                    </Link>
                  ) : (
                    header.label
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <TickerRow key={row.ticker} row={row} />
            ))}
          </tbody>
        </table>
      </div>
      <footer className="table-footer">
        <span>
          <strong>1-{rows.length}</strong> / {rows.length}개 종목
        </span>
        <div className="pagination-actions">
          <button aria-label="이전 페이지" className="icon-button" disabled>
            <ChevronLeft aria-hidden="true" size={16} />
          </button>
          <button aria-label="다음 페이지" className="icon-button" disabled>
            <ChevronRight aria-hidden="true" size={16} />
          </button>
        </div>
      </footer>
    </div>
  );
}
