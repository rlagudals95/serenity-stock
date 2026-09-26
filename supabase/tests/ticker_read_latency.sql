begin;
select plan(9);

select ok(
  (select 'security_invoker=true' = any(reloptions) from pg_class where oid = 'public.ticker_candidate_proof'::regclass),
  'proof optimization preserves invoker security'
);
select ok(not has_function_privilege('anon', 'public.get_ticker_briefing_research(text[])', 'execute'), 'anonymous callers cannot read briefing research');
select ok(not has_function_privilege('authenticated', 'public.get_ticker_briefing_research(text[])', 'execute'), 'authenticated callers cannot bypass the server read boundary');
select ok(has_function_privilege('service_role', 'public.get_ticker_briefing_research(text[])', 'execute'), 'service role can fetch briefing research');
select is((select count(*)::integer from public.get_ticker_briefing_research('{}')), 0, 'an empty batch returns no rows');
select throws_ok(
  $$select * from public.get_ticker_briefing_research(array['A','B','C','D','E','F','G','H','I','J','K'])$$,
  '22023', 'At most 10 briefing tickers are supported', 'oversized batches are rejected'
);
select results_eq(
  $$select * from public.get_ticker_briefing_research(array[' cohr ', 'NVDA', 'COHR', null, ''])$$,
  $$select * from public.get_ticker_briefing_research(array['COHR', 'NVDA'])$$,
  'normalized duplicate tickers do not repeat evidence'
);
select results_eq(
  $$select * from public.get_ticker_briefing_research(array['COHR', 'NVDA'])$$,
  $$select requested.ticker, timeline.* from (values ('COHR'), ('NVDA')) as requested(ticker)
    cross join lateral (
      select post_ticker_analysis_id, posted_at, source_url, analyst_key, analyst_name,
        x_username, risks_mentioned, catalysts_mentioned
      from public.ticker_opinion_timeline_v2 t where t.ticker = requested.ticker
      order by posted_at desc, post_ticker_analysis_id desc limit 100
    ) timeline order by requested.ticker, posted_at desc, post_ticker_analysis_id desc$$,
  'batched cards preserve the latest 100 evidence rows per ticker and source attribution'
);
select ok(not (select prosecdef from pg_proc where oid = 'public.get_ticker_briefing_research(text[])'::regprocedure), 'briefing RPC does not elevate caller privileges');
select * from finish();
rollback;
