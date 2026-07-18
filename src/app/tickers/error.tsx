"use client";

import { RefreshCw, TriangleAlert } from "lucide-react";

export default function TickersError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <section className="route-error">
      <TriangleAlert aria-hidden="true" size={20} />
      <div>
        <h1>종목 데이터를 불러오지 못했습니다.</h1>
        <p>연결 상태를 확인한 뒤 다시 시도해 주세요.</p>
      </div>
      <button className="text-button" onClick={reset} type="button">
        <RefreshCw aria-hidden="true" size={14} />
        다시 시도
      </button>
    </section>
  );
}
