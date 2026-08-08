"use client";

import { Star } from "lucide-react";
import { useRouter } from "next/navigation";
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
  const router = useRouter();
  const [active, setActive] = useState(initialActive);
  const [pending, setPending] = useState(false);
  const [status, setStatus] = useState("");

  async function toggle() {
    const nextActive = !active;
    setActive(nextActive);
    setPending(true);
    setStatus("");

    try {
      const response = await fetch("/api/watchlist", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ticker, active: nextActive }),
      });
      if (!response.ok) throw new Error("watchlist save failed");
      setStatus("Watchlist 저장됨");
      router.refresh();
    } catch {
      setActive(!nextActive);
      setStatus("Watchlist 저장 실패");
    } finally {
      setPending(false);
    }
  }

  return (
    <span className="watchlist-control">
      <button
        aria-label={`${ticker} Watchlist ${active ? "제거" : "추가"}`}
        aria-pressed={active}
        className={`watchlist-button ${active ? "is-active" : ""} ${
          withLabel ? "watchlist-button--labeled" : ""
        }`}
        disabled={pending}
        onClick={(event) => {
          event.stopPropagation();
          void toggle();
        }}
        title={active ? "Watchlist에서 제거" : "Watchlist에 추가"}
        type="button"
      >
        <Star
          aria-hidden="true"
          fill={active ? "currentColor" : "none"}
          size={15}
        />
        {withLabel ? <span>Watchlist</span> : null}
      </button>
      {status ? (
        <span aria-live="polite" className="sr-only">
          {status}
        </span>
      ) : null}
    </span>
  );
}
