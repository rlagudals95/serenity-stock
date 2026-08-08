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

