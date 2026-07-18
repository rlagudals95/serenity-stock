"use client";

import { Star } from "lucide-react";
import { useState } from "react";

export function WatchlistButton({
  initialActive,
  ticker,
  withLabel = false,
}: {
  initialActive: boolean;
  ticker: string;
  withLabel?: boolean;
}) {
  const [active, setActive] = useState(initialActive);

  return (
    <button
      aria-label={`${ticker} Watchlist ${active ? "제거" : "추가"}`}
      aria-pressed={active}
      className={`watchlist-button ${active ? "is-active" : ""} ${
        withLabel ? "watchlist-button--labeled" : ""
      }`}
      onClick={(event) => {
        event.stopPropagation();
        setActive((value) => !value);
      }}
      title={active ? "Watchlist에서 제거" : "Watchlist에 추가"}
      type="button"
    >
      <Star aria-hidden="true" fill={active ? "currentColor" : "none"} size={15} />
      {withLabel ? <span>Watchlist</span> : null}
    </button>
  );
}
