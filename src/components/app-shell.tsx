import Link from "next/link";
import type { ReactNode } from "react";

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="app-shell">
      <header className="app-bar">
        <div className="app-bar__inner">
          <Link className="wordmark" href="/tickers">
            <span className="wordmark__mark" aria-hidden="true">
              S
            </span>
            <span className="wordmark__full">Investor Intelligence</span>
            <span className="wordmark__short">Intelligence</span>
          </Link>
        </div>
      </header>
      <main className="page-frame">{children}</main>
    </div>
  );
}
