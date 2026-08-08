begin;

select plan(6);

select is(
  private.classify_consensus_state(2, 1),
  'positive',
  'exactly two of three analysts qualifies as positive consensus'
);

select is(
  private.classify_consensus_state(1, 1),
  'mixed',
  'one bullish and one bearish analyst remains mixed'
);

select is(
  private.classify_signal_outcome('negative', -0.10),
  'aligned',
  'a falling price aligns with a negative signal'
);

select is(
  (
    select count(*)::integer
    from pg_tables
    where schemaname = 'public'
      and tablename in (
        'market_daily_prices',
        'consensus_signal_events',
        'signal_outcomes'
      )
  ),
  3,
  'all signal performance tables exist'
);

select is(
  (
    select count(*)::integer
    from pg_class
    where oid in (
        'public.market_daily_prices'::regclass,
        'public.consensus_signal_events'::regclass,
        'public.signal_outcomes'::regclass
      )
      and relrowsecurity
  ),
  3,
  'all signal performance tables have RLS enabled'
);

select ok(
  (
    select 'security_invoker=true' = any(reloptions)
    from pg_class
    where oid = 'public.ticker_signal_performance'::regclass
  ),
  'ticker signal performance view uses invoker security'
);

select * from finish();

rollback;

