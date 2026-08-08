"use client";

import { Minus, TrendingDown, TrendingUp } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import type { MarketQuote as MarketQuoteData } from "./types";
import { formatKstDate } from "./format";

function formatPrice(value: number, currency: MarketQuoteData["currency"]) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function formatSigned(value: number, suffix = "") {
  const sign = value > 0 ? "+" : value < 0 ? "−" : "";
  return `${sign}${Math.abs(value).toFixed(2)}${suffix}`;
}

export function MarketQuote({
  quote,
  ticker,
  variant,
}: {
  quote?: MarketQuoteData | null;
  ticker?: string;
  variant: "table" | "detail";
}) {
  const rootRef = useRef<Element | null>(null);
  const [resolvedQuote, setResolvedQuote] = useState(quote);
  const setRootRef = (node: HTMLDivElement | HTMLSpanElement | null) => {
    rootRef.current = node;
  };

  useEffect(() => {
    if (quote !== undefined || !ticker) return;

    const controller = new AbortController();
    const load = async () => {
      try {
        const response = await fetch(
          `/api/market/quote?ticker=${encodeURIComponent(ticker)}`,
          { signal: controller.signal },
        );
        if (!response.ok) throw new Error("Quote request failed");
        const payload = (await response.json()) as {
          quote: MarketQuoteData | null;
        };
        setResolvedQuote(payload.quote);
      } catch (error) {
        if (!(error instanceof DOMException && error.name === "AbortError")) {
          setResolvedQuote(null);
        }
      }
    };

    if (!("IntersectionObserver" in window)) {
      void load();
      return () => controller.abort();
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) return;
        observer.disconnect();
        void load();
      },
      { rootMargin: "160px" },
    );

    if (rootRef.current) observer.observe(rootRef.current);
    return () => {
      observer.disconnect();
      controller.abort();
    };
  }, [quote, ticker]);

  if (resolvedQuote === undefined) {
    return (
      <span
        aria-live="polite"
        className={`market-quote market-quote--${variant} is-unavailable`}
        ref={setRootRef}
      >
        가격 확인 중
      </span>
    );
  }

  if (!resolvedQuote) {
    return (
      <span
        className={`market-quote market-quote--${variant} is-unavailable`}
        ref={setRootRef}
      >
        가격 정보 없음
      </span>
    );
  }

  const direction =
    resolvedQuote.change > 0
      ? "up"
      : resolvedQuote.change < 0
        ? "down"
        : "flat";
  const DirectionIcon =
    direction === "up"
      ? TrendingUp
      : direction === "down"
        ? TrendingDown
        : Minus;
  const price = formatPrice(resolvedQuote.price, resolvedQuote.currency);
  const changeLabel = `${formatSigned(resolvedQuote.change)} (${formatSigned(
    resolvedQuote.changePercent,
    "%",
  )})`;
  const timestamp =
    resolvedQuote.provider === "nasdaq"
      ? `${resolvedQuote.asOf.slice(5, 7)}.${resolvedQuote.asOf.slice(8, 10)} 종가`
      : `${formatKstDate(resolvedQuote.asOf, false)} KST`;

  return (
    <div
      aria-label={`최근 가격 ${price}, 전일 대비 ${changeLabel}`}
      className={`market-quote market-quote--${variant} market-quote--${direction}`}
      ref={setRootRef}
    >
      {variant === "detail" ? (
        <span className="market-quote__label">최근 가격</span>
      ) : null}
      <strong className="market-quote__price">{price}</strong>
      <span className="market-quote__change">
        <DirectionIcon aria-hidden="true" size={variant === "detail" ? 14 : 12} />
        {changeLabel}
      </span>
      {variant === "detail" ? (
        <time className="market-quote__time" dateTime={resolvedQuote.asOf}>
          {resolvedQuote.provider === "fixture" ? "데모 데이터 · " : ""}
          {timestamp}
        </time>
      ) : null}
    </div>
  );
}
