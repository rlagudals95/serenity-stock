"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";

export function AppNavigation() {
  const pathname = usePathname();
  const params = useSearchParams();
  const active = pathname === "/watchlist" ? "watch" : pathname === "/tickers" && params.size ? "explore" : "today";
  return <nav className="app-navigation" aria-label="주 메뉴">{[
    ["today", "오늘", "/tickers"], ["watch", "내 관심 종목", "/watchlist"], ["explore", "전체 탐색", "/tickers?view=all"],
  ].map(([key, label, href]) => <Link key={key} href={href} aria-current={active === key ? "page" : undefined}>{label}</Link>)}</nav>;
}
