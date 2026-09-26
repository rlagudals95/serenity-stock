"use client";

import { Star } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { OpinionSnapshot } from "./briefing-model";
import { markReviewed, updateResearch } from "./research-state";
import { trackProductEvent } from "./product-events";

export function WatchlistButton({
  initialActive,
  ticker,
  withLabel = false,
  snapshot,
}: {
  initialActive: boolean;
  ticker: string;
  withLabel?: boolean;
  snapshot?: OpinionSnapshot;
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
      let message = nextActive ? "관심 종목에 저장했어요." : "관심 종목에서 제외했어요.";
      try {
        if (nextActive && snapshot) markReviewed(ticker, snapshot);
        if (!nextActive) updateResearch(ticker, { baseline: undefined, reviewedAt: null });
      } catch {
        message += " 확인 기록은 저장하지 못했어요. 종목 상세에서 다시 확인해 주세요.";
      }
      setStatus(message);
      if (nextActive) trackProductEvent("watchlist_saved", ticker, "watchlist-button");
      router.refresh();
    } catch {
      setActive(!nextActive);
      setStatus("저장하지 못했어요. 다시 시도해 주세요.");
    } finally {
      setPending(false);
    }
  }

  return (
    <span className="watchlist-control">
      <button
        aria-label={`${ticker} 관심 종목 ${active ? "제거" : "추가"}`}
        aria-pressed={active}
        className={`watchlist-button ${active ? "is-active" : ""} ${
          withLabel ? "watchlist-button--labeled" : ""
        }`}
        disabled={pending}
        onClick={(event) => {
          event.stopPropagation();
          void toggle();
        }}
        title={active ? "관심 종목에서 제거" : "관심 종목에 추가"}
        type="button"
      >
        <Star
          aria-hidden="true"
          fill={active ? "currentColor" : "none"}
          size={15}
        />
        {withLabel ? <span>{pending ? "저장 중…" : active ? "관심 등록됨" : "관심 종목에 추가"}</span> : null}
      </button>
      {status ? (
        <span aria-live="polite" className={withLabel ? "watchlist-feedback" : "sr-only"}>
          {status}
        </span>
      ) : null}
    </span>
  );
}
