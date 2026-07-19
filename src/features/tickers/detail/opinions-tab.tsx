"use client";

import { Filter, SearchX } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useMemo, useTransition } from "react";

import { stanceLabels } from "../format";
import type { Opinion, Stance } from "../types";
import { OpinionItem } from "./opinion-item";

export function OpinionsTab({
  opinions,
  ticker,
}: {
  opinions: Opinion[];
  ticker: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const stance = params.get("stance") ?? "all";
  const analyst = params.get("analyst") ?? "all";
  const reviewOnly = params.get("review") === "true";
  const analystOptions = useMemo(
    () =>
      [...new Map(
        opinions.map((opinion) => [opinion.analyst.key, opinion.analyst]),
      ).values()],
    [opinions],
  );

  const filtered = useMemo(
    () =>
      opinions.filter(
        (opinion) =>
          (stance === "all" || opinion.stance === stance) &&
          (analyst === "all" || opinion.analyst.key === analyst) &&
          (!reviewOnly || opinion.reviewStatus === "needs_review"),
      ),
    [analyst, opinions, reviewOnly, stance],
  );

  function update(name: string, value: string) {
    const next = new URLSearchParams(params.toString());
    if (value === "all" || value === "false") next.delete(name);
    else next.set(name, value);
    next.set("tab", "opinions");
    startTransition(() => {
      router.replace(`${pathname}?${next.toString()}`, { scroll: false });
    });
  }

  return (
    <section className={`opinions-tab ${isPending ? "is-pending" : ""}`}>
      <div className="timeline-controls">
        <div className="timeline-controls__title">
          <Filter aria-hidden="true" size={14} />
          <span>{filtered.length}개 의견</span>
        </div>
        <label className="select-control">
          <span className="sr-only">분석가</span>
          <select
            onChange={(event) => update("analyst", event.target.value)}
            value={analyst}
          >
            <option value="all">전체 분석가</option>
            {analystOptions.map((option) => (
              <option key={option.key} value={option.key}>
                {option.name}
              </option>
            ))}
          </select>
        </label>
        <label className="select-control">
          <span className="sr-only">의견 성향</span>
          <select
            onChange={(event) => update("stance", event.target.value)}
            value={stance}
          >
            <option value="all">전체 성향</option>
            {(Object.entries(stanceLabels) as Array<[Stance, string]>).map(
              ([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ),
            )}
          </select>
        </label>
        <button
          aria-pressed={reviewOnly}
          className={`filter-button ${reviewOnly ? "is-active" : ""}`}
          onClick={() => update("review", reviewOnly ? "false" : "true")}
          type="button"
        >
          검토 필요
        </button>
      </div>

      {filtered.length ? (
        <div className="opinion-timeline">
          {filtered.map((opinion) => (
            <OpinionItem key={opinion.id} opinion={opinion} />
          ))}
        </div>
      ) : (
        <div className="timeline-empty">
          <SearchX aria-hidden="true" size={19} />
          <p>{ticker}에 조건과 일치하는 의견이 없습니다.</p>
        </div>
      )}
    </section>
  );
}
