import { ArrowDown, ArrowUp, ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";

import type { TickerOverview, TickerQuery, TickerSort } from "./types";
import { TickerRow } from "./ticker-row";

export interface TickerPagination {
  page: number;
  pageCount: number;
  pageSize: number;
  total: number;
}

const headers: Array<{
  label: string;
  description?: string;
  sort?: TickerSort;
  className: string;
}> = [
  { label: "종목", sort: "ticker", className: "ticker-column" },
  { label: "관심도", sort: "mentions7d", className: "interest-column" },
  { label: "인플루언서 관점", className: "analyst-column" },
  { label: "최근 변화", className: "change-column" },
  {
    label: "의견 근거",
    description: "원문 · 의견 참여 인원",
    className: "evidence-column",
  },
  {
    label: "의견 후 주가",
    description: "의견 합의 시점 대비",
    className: "market-validation-column",
  },
];

function queryHref(
  query: TickerQuery,
  updates: Partial<Record<keyof TickerQuery, string | number>>,
) {
  const params = new URLSearchParams();
  if (query.view !== "verified") params.set("view", query.view);
  if (query.q) params.set("q", query.q);
  if (query.watchlist) params.set("watchlist", "true");
  if (query.sentiment !== "all") params.set("sentiment", query.sentiment);
  if (query.stance !== "all") params.set("stance", query.stance);
  if (query.change !== "all") params.set("change", query.change);
  if (query.period !== "all") params.set("period", query.period);
  if (query.sort !== "totalMentions") params.set("sort", query.sort);
  if (query.order !== "desc") params.set("order", query.order);

  for (const [key, value] of Object.entries(updates)) {
    if (value === "" || (value === 1 && key !== "page")) params.delete(key);
    else params.set(key, String(value));
  }

  const suffix = params.toString();
  return suffix ? `/tickers?${suffix}` : "/tickers";
}

function sortHref(query: TickerQuery, sort: TickerSort) {
  return queryHref(query, {
    sort,
    order: query.sort === sort && query.order === "desc" ? "asc" : "desc",
    page: 1,
  });
}

export function TickerTable({
  rows,
  query,
  pagination,
}: {
  rows: TickerOverview[];
  query: TickerQuery;
  pagination?: TickerPagination;
}) {
  if (rows.length === 0) {
    return (
      <div className="table-empty">
        <p>조건에 맞는 종목이 없습니다.</p>
        <Link className="text-button" href="/tickers">
          검증된 후보로 돌아가기
        </Link>
      </div>
    );
  }

  const page = pagination?.page ?? 1;
  const pageSize = pagination?.pageSize ?? rows.length;
  const total = pagination?.total ?? rows.length;
  const first = (page - 1) * pageSize + 1;
  const last = Math.min(page * pageSize, total);

  return (
    <div className="table-shell candidate-table-shell">
      <div className="table-scroll">
        <table className="ticker-table candidate-table">
          <colgroup>
            <col className="watchlist-column" />
            {headers.map((header) => (
              <col className={header.className} key={header.className} />
            ))}
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
                    <Link className="sort-link" href={sortHref(query, header.sort)}>
                      {header.label}
                      {query.sort === header.sort ? (
                        query.order === "desc" ? (
                          <ArrowDown aria-hidden="true" size={13} />
                        ) : (
                          <ArrowUp aria-hidden="true" size={13} />
                        )
                      ) : null}
                    </Link>
                  ) : header.description ? (
                    <span className="candidate-column-heading">
                      <span>{header.label}</span>
                      <small>{header.description}</small>
                    </span>
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
        <div className="table-footer__summary">
          <span>
            <strong>{first}–{last} / {total}개 종목</strong>
          </span>
          <span className="market-data-note">
            의견 후 주가는 배당·세금·거래비용을 반영하지 않습니다.
          </span>
        </div>
        {pagination && pagination.pageCount > 1 ? (
          <nav aria-label="종목 목록 페이지" className="pagination-actions">
            {page > 1 ? (
              <Link
                aria-label="이전 페이지"
                className="icon-button"
                href={queryHref(query, { page: page - 1 })}
              >
                <ChevronLeft aria-hidden="true" size={16} />
              </Link>
            ) : (
              <span aria-hidden="true" className="icon-button is-disabled">
                <ChevronLeft size={16} />
              </span>
            )}
            <span>{page} / {pagination.pageCount}</span>
            {page < pagination.pageCount ? (
              <Link
                aria-label="다음 페이지"
                className="icon-button"
                href={queryHref(query, { page: page + 1 })}
              >
                <ChevronRight aria-hidden="true" size={16} />
              </Link>
            ) : (
              <span aria-hidden="true" className="icon-button is-disabled">
                <ChevronRight size={16} />
              </span>
            )}
          </nav>
        ) : null}
      </footer>
    </div>
  );
}
