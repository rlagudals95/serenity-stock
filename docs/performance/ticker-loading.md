# Ticker loading performance

## Changes

- `ticker_candidate_proof` materializes the `analyst_track_records` CTE once per query. This is an execution boundary, not a persisted materialized view: current voting eligibility, the 90-day window, historical outcome calculations, and invoker security remain unchanged. No refresh job is needed.
- The briefing requests only risks/catalysts and their sources through `get_ticker_briefing_research`. It keeps the latest 100 timeline rows **per ticker**, deduplicates requested tickers, and caps batches at 10. Only the service role can invoke it.
- A full three-card home load goes from 21 Supabase requests to 6 (five overview reads plus one evidence RPC). The unused analyst-profile read and 15 full-detail requests are removed. If the RPC has not been deployed, a temporary fallback uses three narrow per-ticker reads after the missing-function response.
- Shared server reads use Next's persistent data cache with a 60-second revalidation interval. Stale entries are served while they refresh. Cookie watchlists are applied afterward; browser research notes never enter the cache. Keys include the Supabase project URL, operation, and normalized arguments. Fixture mode bypasses the cache.
- Successful manual sync/backfill analysis immediately expires the shared tag and revalidates ticker and watchlist pages. Independently scheduled ingestion becomes visible through the 60-second revalidation cycle (plus request/refresh time). Refresh failures retain the last successful cached result.

## Measurements (2026-09-26)

Read-only `EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON)` on the linked Seoul project:

| Query | Execution time | Shared buffer hits | Rows |
| --- | ---: | ---: | ---: |
| Existing candidate proof | 3,870.685 ms | 1,130,005 | 426 |
| Same query with materialized track-record CTE | 209.917 ms | 73,682 | 426 |

The existing plan performed 530,656 price-index scans. A bidirectional `EXCEPT ALL` comparison between the existing view and optimized SELECT returned **zero differing rows**. These are single-run query measurements, not a production latency percentile or a guarantee under load. The remote schema was not modified.

A local production build reading the existing remote database (before migration) returned these complete HTML responses:

| Request | Duration |
| --- | ---: |
| Home, cold cache and old DB view | 5,163 ms |
| Home, warm cache | 11 ms |
| COHR detail, cold detail cache | 254 ms |
| COHR opinions tab, shared detail cache | 17 ms |
| Watchlist, shared overview cache | 8 ms |
| All tickers, warm cache | 21 ms |

Instrumented server fetches confirmed that warm home requests, detail tab changes, and the watchlist reused cached data without another Supabase request. These timings exclude a deployed browser's network/hydration and retain the old DB query cost on cold reads until migration.

## Deployment and verification

1. Apply `supabase/migrations/20260926000000_reduce_ticker_read_latency.sql` through the normal migration workflow. It replaces one view and adds a read-only RPC; it does not update business data or require background jobs.
2. Deploy the app. The missing-RPC fallback allows either order, but the SQL improvement requires the migration.
3. Run `EXPLAIN (ANALYZE, BUFFERS) SELECT * FROM public.ticker_candidate_proof;` and compare output/latency. Check cold and repeated `/tickers`, `/tickers/COHR?tab=opinions`, and `/watchlist` requests separately.

Verified on this branch:

- 212 Vitest tests; TypeScript; ESLint; production build.
- All migrations and seed applied to an isolated Supabase PostgreSQL 17 container; nine pgTAP assertions in `supabase/tests/ticker_read_latency.sql` passed.
- Browser suite: six passed, two skipped, two existing desktop failures. Both failures reproduce unchanged on base commit `e874f4a`: analyst chip test expects `+1` while the UI renders `+2`, and the sticky-column test expects horizontal overflow when the table fits. Home → saved ticker → detail → research → watchlist passes on desktop and mobile.

The SQL test assumes the normal local seed is loaded. Run it through `pnpm supabase test db` with a local Supabase stack. No production migration or deployment is performed by this PR.
