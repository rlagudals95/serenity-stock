"use client";

import { Search, SlidersHorizontal, Star, X } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { FormEvent, useState, useTransition } from "react";

import {
  changeLabels,
  cumulativeSentimentLabels,
  stanceLabels,
} from "./format";
import type { TickerQuery } from "./types";

export function TickerControls({ query }: { query: TickerQuery }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [search, setSearch] = useState(query.q);
  const [isPending, startTransition] = useTransition();

  function update(name: string, value: string) {
    const next = new URLSearchParams(searchParams.toString());
    if (!value || value === "all" || value === "false") {
      next.delete(name);
    } else {
      next.set(name, value);
    }
    startTransition(() => {
      router.replace(`${pathname}?${next.toString()}`, { scroll: false });
    });
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    update("q", search.trim());
  }

  const activeCount = [
    query.watchlist,
    query.sentiment !== "all",
    query.stance !== "all",
    query.change !== "all",
    query.period !== "all",
  ].filter(Boolean).length;

  return (
    <div className={`controls ${isPending ? "is-pending" : ""}`}>
      <form className="search-form" onSubmit={submit}>
        <Search aria-hidden="true" className="search-form__icon" size={16} />
        <input
          aria-label="티커 또는 회사명 검색"
          onChange={(event) => setSearch(event.target.value)}
          placeholder="티커 또는 회사명"
          value={search}
        />
        {search ? (
          <button
            aria-label="검색어 지우기"
            className="search-form__clear"
            onClick={() => {
              setSearch("");
              update("q", "");
            }}
            type="button"
          >
            <X aria-hidden="true" size={14} />
          </button>
        ) : null}
      </form>

      <button
        aria-pressed={query.watchlist}
        className={`filter-button ${query.watchlist ? "is-active" : ""}`}
        onClick={() => update("watchlist", query.watchlist ? "false" : "true")}
        type="button"
      >
        <Star
          aria-hidden="true"
          fill={query.watchlist ? "currentColor" : "none"}
          size={14}
        />
        Watchlist
      </button>

      <label className="select-control">
        <span className="sr-only">누적 관점</span>
        <select
          onChange={(event) => update("sentiment", event.target.value)}
          value={query.sentiment}
        >
          <option value="all">누적 관점</option>
          {Object.entries(cumulativeSentimentLabels).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </label>

      <label className="select-control controls__secondary">
        <span className="sr-only">최근 의견</span>
        <select
          onChange={(event) => update("stance", event.target.value)}
          value={query.stance}
        >
          <option value="all">최근 의견</option>
          {Object.entries(stanceLabels).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </label>

      <label className="select-control controls__secondary">
        <span className="sr-only">변화 유형</span>
        <select
          onChange={(event) => update("change", event.target.value)}
          value={query.change}
        >
          <option value="all">변화</option>
          {Object.entries(changeLabels).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
          <option value="none">변화 없음</option>
        </select>
      </label>

      <label className="select-control controls__secondary">
        <span className="sr-only">최근 언급 기간</span>
        <select
          onChange={(event) => update("period", event.target.value)}
          value={query.period}
        >
          <option value="all">전체 기간</option>
          <option value="24h">최근 24시간</option>
          <option value="7d">최근 7일</option>
          <option value="30d">최근 30일</option>
        </select>
      </label>

      <button className="filter-button controls__mobile-filter" type="button">
        <SlidersHorizontal aria-hidden="true" size={14} />
        필터{activeCount ? ` ${activeCount}` : ""}
      </button>
    </div>
  );
}
