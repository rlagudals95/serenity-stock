import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

const migrationsDirectory = path.join(process.cwd(), "supabase", "migrations");

function signalMigrationSql() {
  const migration = readdirSync(migrationsDirectory).find((file) =>
    file.endsWith("_signal_performance_foundation.sql"),
  );

  expect(migration, "signal performance migration should exist").toBeDefined();
  return readFileSync(path.join(migrationsDirectory, migration!), "utf8");
}

function tickerProofMigrationSql() {
  const migration = readdirSync(migrationsDirectory).find((file) =>
    file.endsWith("_ticker_proof_metrics.sql"),
  );

  expect(migration, "ticker proof migration should exist").toBeDefined();
  return readFileSync(path.join(migrationsDirectory, migration!), "utf8");
}

describe("signal performance migration", () => {
  it("defines the three durable signal performance tables", () => {
    const sql = signalMigrationSql();

    expect(sql).toContain("create table public.market_daily_prices");
    expect(sql).toContain("create table public.consensus_signal_events");
    expect(sql).toContain("create table public.signal_outcomes");
  });

  it("enables RLS and exposes only security-invoker read views", () => {
    const sql = signalMigrationSql();

    expect(sql).toContain(
      "alter table public.market_daily_prices enable row level security",
    );
    expect(sql).toContain(
      "alter table public.consensus_signal_events enable row level security",
    );
    expect(sql).toContain(
      "alter table public.signal_outcomes enable row level security",
    );
    expect(sql).toMatch(
      /create view public\.ticker_signal_performance\s+with \(security_invoker = true\)/,
    );
  });

  it("uses an exact two-thirds threshold and an idempotent daily price key", () => {
    const sql = signalMigrationSql();

    expect(sql).toContain("2.0 / 3.0");
    expect(sql).toContain("primary key (ticker, session_date)");
  });
});

describe("ticker proof migration", () => {
  it("defines reproducible proof views and a 20-session outcome", () => {
    const sql = tickerProofMigrationSql();

    expect(sql).toContain(
      "create view public.analyst_bullish_episode_outcomes",
    );
    expect(sql).toContain("create view public.analyst_track_records");
    expect(sql).toContain("create view public.ticker_candidate_proof");
    expect(sql).toContain("create view public.ticker_proof_rollup");
    expect(sql).toContain(
      "target.adjusted_close / baseline.adjusted_open - 1",
    );
    expect(sql).toContain("offset 19");
  });

  it("keeps proof views server-readable and unavailable to anonymous clients", () => {
    const sql = tickerProofMigrationSql();

    expect(sql).toContain("with (security_invoker = true)");
    expect(sql).toContain("revoke all on");
    expect(sql).toContain("grant select on");
    expect(sql).toContain("to authenticated, service_role");
  });
});
