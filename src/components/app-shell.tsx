import { DatabaseZap } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

import { resolvePipelineConfig } from "@/lib/pipeline/config";
import { resolveSupabaseDataConfig } from "@/lib/supabase/config";

import { SyncButton } from "./sync-button";

export function AppShell({ children }: { children: ReactNode }) {
  const dataMode = resolveSupabaseDataConfig(process.env).mode;
  const isSupabase = dataMode === "supabase";
  const pipeline = resolvePipelineConfig(process.env);

  return (
    <div className="app-shell">
      <header className="app-bar">
        <div className="app-bar__inner">
          <Link className="wordmark" href="/tickers">
            <span className="wordmark__mark" aria-hidden="true">
              S
            </span>
            <span className="wordmark__full">Serenity Intelligence</span>
            <span className="wordmark__short">Serenity</span>
          </Link>
          {/* <div className="app-bar__actions">
            <span
              className={`freshness ${isSupabase ? "freshness--ok" : ""}`}
              title={
                isSupabase
                  ? "Hosted Supabase 실데이터 연결"
                  : "환경 변수가 없어 내장 Demo 데이터를 표시 중"
              }
            >
              <DatabaseZap aria-hidden="true" size={14} />
              <span className="freshness__desktop">
                {isSupabase ? "Supabase 연결" : "Demo 데이터"}
              </span>
              <span className="freshness__mobile">
                {isSupabase ? "Supabase" : "Demo"}
              </span>
            </span>
            <SyncButton
              configured={pipeline.configured}
              missing={pipeline.configured ? [] : pipeline.missing}
            />
          </div> */}
        </div>
      </header>
      <main className="page-frame">{children}</main>
    </div>
  );
}
