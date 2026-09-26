import Link from "next/link";
import { Suspense, type ReactNode } from "react";
import { AppNavigation } from "./app-navigation";

export function AppShell({ children, demo = false }: { children: ReactNode; demo?: boolean }) {
  return (
    <div className="app-shell">
      <header className="app-bar">
        <div className="app-bar__inner">
          <Link className="wordmark" href="/tickers">
            <span className="wordmark__mark" aria-hidden="true">
              s
            </span>
            <span>serenity</span>
            {demo ? <span className="demo-label">샘플 데이터</span> : null}
          </Link>
          <Suspense><AppNavigation /></Suspense>
        </div>
      </header>
      <main className="page-frame">{children}</main>
    </div>
  );
}
