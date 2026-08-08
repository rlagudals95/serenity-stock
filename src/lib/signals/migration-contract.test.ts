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

function verifiedSourcesMigrationSql() {
  const migration = readdirSync(migrationsDirectory).find((file) =>
    file.endsWith("_add_verified_x_sources.sql"),
  );

  expect(migration, "verified source migration should exist").toBeDefined();
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
    expect(sql).toContain("directional_analyst_count >= 3");
    expect(sql).toContain("p_minimum_analysts integer default 3");
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

describe("verified X source migration", () => {
  it("separates source purpose from consensus eligibility", () => {
    const sql = verifiedSourcesMigrationSql();

    expect(sql).toContain("add column source_role text not null");
    expect(sql).toContain("add column consensus_eligible boolean not null");
    expect(sql).toContain(
      "check (not consensus_eligible or source_role = 'opinion')",
    );
    expect(sql).toMatch(
      /create view public\.ticker_consensus_analyst_summary\s+with \(security_invoker = true\)/,
    );
  });

  it("keeps one fresh directional vote per eligible analyst", () => {
    const sql = verifiedSourcesMigrationSql();

    expect(sql).toContain("with vote_events as");
    expect(sql).toContain("latest_vote_event as");
    expect(sql).toContain(
      "distinct on (events.ticker, events.analyst_key)",
    );
    expect(sql).toContain("events.stance in ('bullish', 'bearish')");
    expect(sql).toContain("events.posted_at >= now() - interval '90 days'");
  });

  it("registers the verified additions and keeps pilots inactive", () => {
    const sql = verifiedSourcesMigrationSql();

    for (const username of [
      "RihardJarc",
      "JonahLupton",
      "RyanReeves_",
      "dnystedt",
      "TSOH_Investing",
      "firstadopter",
      "dylan522p",
      "SpaceInvestor_D",
      "muddywatersre",
      "StockJabber",
      "KerrisdaleCap",
    ]) {
      expect(sql).toContain(`'${username}'`);
    }

    expect(sql).toContain("'stock_market_nerd'");
    expect(sql).toContain("'mostly_borrowed_ideas'");
    expect(sql).toContain("'jose_najarro'");
    expect(sql).toContain("'ole_hansen'");
  });
});
