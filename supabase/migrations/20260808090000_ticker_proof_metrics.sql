begin;

create view public.analyst_bullish_episode_outcomes
with (security_invoker = true)
as
with countable as (
  select
    timeline.post_ticker_analysis_id,
    timeline.ticker,
    timeline.company_name,
    timeline.analyst_key,
    timeline.analyst_name,
    timeline.x_username,
    timeline.posted_at,
    timeline.source_url,
    timeline.stance,
    lag(timeline.stance) over (
      partition by timeline.ticker, timeline.analyst_key
      order by timeline.posted_at, timeline.post_ticker_analysis_id
    ) as previous_stance
  from public.ticker_opinion_timeline_v2 as timeline
  where timeline.review_status in ('auto', 'approved')
    and timeline.stance_confidence >= 0.75
    and timeline.stance in ('bullish', 'bearish', 'neutral', 'mixed')
), episode_starts as (
  select countable.*
  from countable
  where countable.stance = 'bullish'
    and countable.previous_stance is distinct from 'bullish'
)
select
  episode.post_ticker_analysis_id as episode_id,
  episode.ticker,
  episode.company_name,
  episode.analyst_key,
  episode.analyst_name,
  episode.x_username,
  episode.posted_at as signal_at,
  episode.source_url,
  baseline.session_date as entry_session_date,
  baseline.adjusted_open as entry_adjusted_open,
  target.session_date as target_session_date,
  target.adjusted_close as target_adjusted_close,
  case
    when baseline.session_date is null then 'data_missing'
    when target.session_date is null then 'pending'
    else 'evaluable'
  end as outcome_status,
  case
    when target.adjusted_close is null then null
    else target.adjusted_close / baseline.adjusted_open - 1
  end as raw_return,
  case
    when target.adjusted_close is null then null
    else target.adjusted_close / baseline.adjusted_open - 1 > 0
  end as hit
from episode_starts as episode
left join lateral (
  select price.session_date, price.adjusted_open
  from public.market_daily_prices as price
  where price.ticker = episode.ticker
    and price.market_open_at > episode.posted_at
  order by price.market_open_at
  limit 1
) as baseline on true
left join lateral (
  select price.session_date, price.adjusted_close
  from public.market_daily_prices as price
  where baseline.session_date is not null
    and price.ticker = episode.ticker
    and price.session_date >= baseline.session_date
  order by price.session_date
  offset 19
  limit 1
) as target on true;

create view public.analyst_track_records
with (security_invoker = true)
as
select
  outcome.analyst_key,
  max(outcome.analyst_name) as analyst_name,
  max(outcome.x_username) as x_username,
  count(*) filter (where outcome.hit)::bigint as hit_count,
  count(*)::bigint as sample_size,
  count(*) filter (where outcome.hit)::numeric / nullif(count(*), 0)
    as hit_rate,
  max(outcome.target_session_date) as latest_result_at
from public.analyst_bullish_episode_outcomes as outcome
where outcome.outcome_status = 'evaluable'
  and outcome.signal_at >= now() - interval '12 months'
group by outcome.analyst_key;

create view public.ticker_candidate_proof
with (security_invoker = true)
as
with current_bullish_analysts as (
  select
    summary.ticker,
    summary.analyst_key
  from public.ticker_analyst_summary as summary
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
  left join public.analyst_track_records as track
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

create view public.ticker_proof_rollup
with (security_invoker = true)
as
select
  count(*) filter (
    where outcome.outcome_status = 'evaluable'
  )::bigint as completed_count,
  count(*) filter (
    where outcome.outcome_status = 'evaluable' and outcome.hit
  )::bigint as hit_count,
  count(*) filter (
    where outcome.outcome_status = 'evaluable' and not outcome.hit
  )::bigint as miss_count,
  count(*) filter (
    where outcome.outcome_status = 'pending'
  )::bigint as pending_count,
  max(outcome.target_session_date) filter (
    where outcome.outcome_status = 'evaluable'
  ) as latest_result_at
from public.analyst_bullish_episode_outcomes as outcome
where outcome.signal_at >= now() - interval '12 months';

revoke all on
  public.analyst_bullish_episode_outcomes,
  public.analyst_track_records,
  public.ticker_candidate_proof,
  public.ticker_proof_rollup
from public, anon, authenticated;

grant select on
  public.analyst_bullish_episode_outcomes,
  public.analyst_track_records,
  public.ticker_candidate_proof,
  public.ticker_proof_rollup
to authenticated, service_role;

commit;
