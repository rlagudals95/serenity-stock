begin;

select plan(6);

select is(
  (select count(*)::integer from public.analyst_profiles where active),
  20,
  'twenty second-pass sources are active'
);

select is(
  (
    select count(*)::integer
    from public.analyst_profiles
    where active and consensus_eligible
  ),
  8,
  'only eight verified opinion sources contribute to consensus'
);

select is(
  (
    select count(*)::integer
    from public.analyst_profiles
    where consensus_eligible and source_role <> 'opinion'
  ),
  0,
  'context, news, and risk sources cannot vote in consensus'
);

select is(
  (
    select count(*)::integer
    from public.analyst_profiles
    where analyst_key in (
      'stock_market_nerd',
      'the_valueist',
      'mostly_borrowed_ideas',
      'jose_najarro'
    )
      and not active
      and not consensus_eligible
  ),
  4,
  'all four pilot sources remain inactive and non-voting'
);

select is(
  (
    select active
    from public.analyst_profiles
    where analyst_key = 'ole_hansen'
  ),
  false,
  'Ole Hansen is inactive for the stock-focused pipeline'
);

select ok(
  (
    select 'security_invoker=true' = any(reloptions)
    from pg_class
    where oid = 'public.ticker_consensus_analyst_summary'::regclass
  ),
  'consensus analyst summary uses invoker security'
);

select * from finish();

rollback;
