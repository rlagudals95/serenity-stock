"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { trackProductEvent } from "./product-events";

export function CandidateLink({ ticker, children, className, change = false, label }: {
  ticker: string; children: ReactNode; className?: string; change?: boolean; label?: string;
}) {
  return <Link className={className} href={`/tickers/${ticker}`} aria-label={label ?? `${ticker} ${change ? "달라진 근거 확인" : "판단 근거 보기"}`} onClick={() => trackProductEvent(change ? "change_open" : "candidate_open", ticker, change ? "updates" : "candidates")}>{children}</Link>;
}
