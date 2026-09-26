begin;

-- Keep the current voting/return semantics, but compute historical records once.
-- Without this boundary the planner repeatedly evaluates the outcome joins for
-- each current analyst. This is per-query materialization, not a stale snapshot.
create or replace view public.ticker_candidate_proof
with (security_invoker = true)
as
with track_records as materialized (
  select analyst_key, hit_count, sample_size
  from public.analyst_track_records
), current_bullish_analysts as (
  select
    summary.ticker,
    summary.analyst_key
  from public.ticker_consensus_analyst_summary as summary
  where summary.latest_stance = 'bullish'
    and summary.last_mentioned_at >= now() - interval '90 days'
), aggregated as (
  select
    ticker.ticker,
    count(current.analyst_key)::bigint as current_bullish_analyst_count,
    coalesce(sum(track.hit_count), 0)::bigint as hit_count,
    coalesce(sum(track.sample_size), 0)::bigint as sample_size
  from public.tickers as ticker
  left join current_bullish_analysts as current
    on current.ticker = ticker.ticker
  left join track_records as track
    on track.analyst_key = current.analyst_key
  where ticker.active = true
  group by ticker.ticker
)
select
  aggregated.ticker,
  aggregated.current_bullish_analyst_count,
  aggregated.hit_count,
  aggregated.sample_size,
  aggregated.hit_count::numeric / nullif(aggregated.sample_size, 0)
    as hit_rate,
  case
    when aggregated.sample_size = 0 then null
    else (
      (
        aggregated.hit_count::numeric / aggregated.sample_size
        + (1.96 * 1.96) / (2 * aggregated.sample_size)
        - 1.96 * sqrt(
          (
            aggregated.hit_count::numeric / aggregated.sample_size
            * (1 - aggregated.hit_count::numeric / aggregated.sample_size)
            + (1.96 * 1.96) / (4 * aggregated.sample_size)
          ) / aggregated.sample_size
        )
      ) / (1 + (1.96 * 1.96) / aggregated.sample_size)
    )
  end as wilson_score
from aggregated;

-- Fetch only the evidence used on briefing cards in one network round trip.
-- The limit is per ticker so an active ticker cannot crowd out another card.
create function public.get_ticker_briefing_research(p_tickers text[])
returns table (
  ticker text,
  post_ticker_analysis_id bigint,
  posted_at timestamptz,
  source_url text,
  analyst_key text,
  analyst_name text,
  x_username text,
  risks_mentioned text[],
  catalysts_mentioned text[]
)
language plpgsql
stable
security invoker
set search_path = ''
as $$
begin
  if cardinality(p_tickers) > 10 then
    raise exception 'At most 10 briefing tickers are supported' using errcode = '22023';
  end if;

  return query
  select requested.ticker, evidence.*
  from (
    select distinct upper(btrim(value)) as ticker
    from unnest(p_tickers) as input(value)
    where value is not null and btrim(value) <> ''
  ) as requested
  cross join lateral (
    select timeline.post_ticker_analysis_id, timeline.posted_at,
      timeline.source_url, timeline.analyst_key, timeline.analyst_name,
      timeline.x_username, timeline.risks_mentioned, timeline.catalysts_mentioned
    from public.ticker_opinion_timeline_v2 as timeline
    where timeline.ticker = requested.ticker
    order by timeline.posted_at desc, timeline.post_ticker_analysis_id desc
    limit 100
  ) as evidence
  order by requested.ticker, evidence.posted_at desc, evidence.post_ticker_analysis_id desc;
end;
$$;

revoke all on function public.get_ticker_briefing_research(text[])
  from public, anon, authenticated;
grant execute on function public.get_ticker_briefing_research(text[])
  to service_role;

commit;
