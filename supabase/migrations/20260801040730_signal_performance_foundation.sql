begin;

create table public.market_daily_prices (
  ticker text not null
    references public.tickers(ticker) on update cascade on delete cascade,
  session_date date not null,
  market_open_at timestamptz not null,
  raw_open numeric(20, 8) not null,
  raw_high numeric(20, 8) not null,
  raw_low numeric(20, 8) not null,
  raw_close numeric(20, 8) not null,
  adjusted_close numeric(20, 8) not null,
  adjusted_open numeric(20, 8) not null,
  adjustment_factor numeric(20, 12) not null,
  adjusted_open_method text not null,
  provider text not null,
  provider_symbol text not null,
  source_updated_at timestamptz,
  fetched_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (ticker, session_date),
  constraint market_daily_prices_values_positive_check
    check (
      raw_open > 0
      and raw_high > 0
      and raw_low > 0
      and raw_close > 0
      and adjusted_close > 0
      and adjusted_open > 0
      and adjustment_factor > 0
    ),
  constraint market_daily_prices_ohlc_check
    check (
      raw_high >= greatest(raw_open, raw_close)
      and raw_low <= least(raw_open, raw_close)
      and raw_high >= raw_low
    ),
  constraint market_daily_prices_method_check
    check (
      adjusted_open_method in (
        'provider_adjusted_open',
        'raw_open_adjustment_ratio'
      )
    ),
  constraint market_daily_prices_provider_not_blank_check
    check (btrim(provider) <> '' and btrim(provider_symbol) <> ''),
  constraint market_daily_prices_adjustment_check
    check (
      abs(adjusted_close - raw_close * adjustment_factor) <= 0.000001
      and abs(adjusted_open - raw_open * adjustment_factor) <= 0.000001
    )
);

create table public.consensus_signal_events (
  id bigint generated always as identity primary key,
  ticker text not null
    references public.tickers(ticker) on update cascade on delete restrict,
  signal_at timestamptz not null,
  signal_type text not null,
  direction text not null,
  previous_state text not null,
  trigger_analysis_id bigint not null
    references public.post_ticker_analyses(id) on delete restrict,
  calculation_version text not null,
  analyst_snapshot jsonb not null,
  directional_analyst_count smallint not null,
  bullish_analyst_count smallint not null,
  bearish_analyst_count smallint not null,
  positive_share numeric(8, 7) not null,
  negative_share numeric(8, 7) not null,
  entry_session_date date,
  entry_adjusted_open numeric(20, 8),
  entry_price_method text,
  price_provider text,
  ended_at timestamptz,
  ended_reason text,
  created_at timestamptz not null default now(),
  constraint consensus_signal_events_type_check
    check (signal_type in ('entry', 'flip')),
  constraint consensus_signal_events_direction_check
    check (direction in ('positive', 'negative')),
  constraint consensus_signal_events_previous_state_check
    check (previous_state in ('positive', 'negative', 'mixed', 'insufficient')),
  constraint consensus_signal_events_version_not_blank_check
    check (btrim(calculation_version) <> ''),
  constraint consensus_signal_events_snapshot_object_check
    check (jsonb_typeof(analyst_snapshot) = 'object'),
  constraint consensus_signal_events_counts_check
    check (
      directional_analyst_count >= 2
      and bullish_analyst_count >= 0
      and bearish_analyst_count >= 0
      and directional_analyst_count =
        bullish_analyst_count + bearish_analyst_count
    ),
  constraint consensus_signal_events_shares_check
    check (
      positive_share between 0 and 1
      and negative_share between 0 and 1
      and abs(positive_share + negative_share - 1) <= 0.0000001
      and abs(
        positive_share
        - bullish_analyst_count::numeric / directional_analyst_count
      ) <= 0.0000001
      and abs(
        negative_share
        - bearish_analyst_count::numeric / directional_analyst_count
      ) <= 0.0000001
    ),
  constraint consensus_signal_events_threshold_check
    check (
      (direction = 'positive' and positive_share >= 2.0 / 3.0)
      or (direction = 'negative' and negative_share >= 2.0 / 3.0)
    ),
  constraint consensus_signal_events_entry_price_check
    check (
      (
        entry_session_date is null
        and entry_adjusted_open is null
        and entry_price_method is null
        and price_provider is null
      )
      or
      (
        entry_session_date is not null
        and entry_adjusted_open > 0
        and btrim(entry_price_method) <> ''
        and btrim(price_provider) <> ''
      )
    ),
  constraint consensus_signal_events_end_state_check
    check (
      (ended_at is null and ended_reason is null)
      or (
        ended_at > signal_at
        and ended_reason in ('mixed', 'insufficient', 'flipped', 'ttl_expired')
      )
    ),
  constraint consensus_signal_events_trigger_version_unique
    unique (trigger_analysis_id, calculation_version),
  constraint consensus_signal_events_entry_price_fkey
    foreign key (ticker, entry_session_date)
    references public.market_daily_prices(ticker, session_date)
    on update cascade
);

create table public.signal_outcomes (
  signal_event_id bigint not null
    references public.consensus_signal_events(id) on delete cascade,
  horizon_sessions smallint not null,
  status text not null default 'pending',
  target_session_date date,
  target_adjusted_close numeric(20, 8),
  raw_return numeric(18, 10),
  signed_return numeric(18, 10),
  verdict text not null default 'pending',
  price_provider text,
  calculation_version text not null,
  calculated_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (signal_event_id, horizon_sessions),
  constraint signal_outcomes_horizon_check
    check (horizon_sessions in (5, 20, 60)),
  constraint signal_outcomes_status_check
    check (status in ('pending', 'evaluable', 'not_evaluable', 'data_missing')),
  constraint signal_outcomes_verdict_check
    check (
      verdict in (
        'aligned',
        'opposed',
        'flat',
        'pending',
        'not_evaluable',
        'data_missing'
      )
    ),
  constraint signal_outcomes_version_not_blank_check
    check (btrim(calculation_version) <> ''),
  constraint signal_outcomes_state_check
    check (
      (
        status = 'pending'
        and target_session_date is null
        and target_adjusted_close is null
        and raw_return is null
        and signed_return is null
        and verdict = 'pending'
      )
      or
      (
        status = 'evaluable'
        and target_session_date is not null
        and target_adjusted_close > 0
        and raw_return is not null
        and signed_return is not null
        and verdict in ('aligned', 'opposed', 'flat')
        and btrim(price_provider) <> ''
      )
      or
      (
        status = 'not_evaluable'
        and verdict = 'not_evaluable'
      )
      or
      (
        status = 'data_missing'
        and verdict = 'data_missing'
      )
    )
);

create index market_daily_prices_provider_session_idx
  on public.market_daily_prices (provider, session_date desc, ticker);

create index consensus_signal_events_ticker_signal_idx
  on public.consensus_signal_events (
    ticker,
    calculation_version,
    signal_at desc,
    id desc
  );

create index consensus_signal_events_trigger_analysis_idx
  on public.consensus_signal_events (trigger_analysis_id);

create unique index consensus_signal_events_one_active_idx
  on public.consensus_signal_events (ticker, calculation_version)
  where ended_at is null;

create index signal_outcomes_matured_idx
  on public.signal_outcomes (horizon_sessions, verdict, calculated_at desc)
  where status = 'evaluable';

create trigger market_daily_prices_set_updated_at
before update on public.market_daily_prices
for each row execute function private.set_updated_at();

create trigger signal_outcomes_set_updated_at
before update on public.signal_outcomes
for each row execute function private.set_updated_at();

create or replace function private.classify_consensus_state(
  p_bullish integer,
  p_bearish integer,
  p_minimum_analysts integer default 2,
  p_threshold numeric default (2.0 / 3.0)
)
returns text
language sql
immutable
parallel safe
security invoker
set search_path = ''
as $$
  select case
    when p_bullish < 0 or p_bearish < 0 then 'insufficient'
    when p_bullish + p_bearish < p_minimum_analysts then 'insufficient'
    when p_bullish::numeric / (p_bullish + p_bearish) >= p_threshold
      then 'positive'
    when p_bearish::numeric / (p_bullish + p_bearish) >= p_threshold
      then 'negative'
    else 'mixed'
  end;
$$;

create or replace function private.classify_signal_outcome(
  p_direction text,
  p_raw_return numeric,
  p_flat_band numeric default 0.02
)
returns text
language sql
immutable
parallel safe
security invoker
set search_path = ''
as $$
  with signed as (
    select case
      when p_direction = 'positive' then p_raw_return
      when p_direction = 'negative' then -p_raw_return
      else null
    end as value
  )
  select case
    when value is null then 'not_evaluable'
    when value >= p_flat_band then 'aligned'
    when value <= -p_flat_band then 'opposed'
    else 'flat'
  end
  from signed;
$$;

create view public.ticker_signal_performance
with (security_invoker = true)
as
with latest_price as (
  select distinct on (price.ticker)
    price.ticker,
    price.session_date,
    price.adjusted_close,
    price.provider,
    price.fetched_at
  from public.market_daily_prices as price
  order by price.ticker, price.session_date desc
),
latest_active_signal as (
  select distinct on (signal.ticker)
    signal.*
  from public.consensus_signal_events as signal
  where signal.ended_at is null
  order by signal.ticker, signal.signal_at desc, signal.id desc
)
select
  ticker.ticker,
  ticker.company_name,
  signal.id as signal_event_id,
  signal.signal_at,
  signal.direction,
  signal.directional_analyst_count,
  signal.bullish_analyst_count,
  signal.bearish_analyst_count,
  signal.calculation_version,
  signal.analyst_snapshot,
  signal.entry_session_date,
  signal.entry_adjusted_open,
  price.session_date as latest_price_date,
  price.adjusted_close as latest_adjusted_close,
  case
    when signal.entry_adjusted_open is null or price.adjusted_close is null then null
    else price.adjusted_close / signal.entry_adjusted_open - 1
  end as raw_return_to_date,
  case
    when signal.entry_adjusted_open is null or price.adjusted_close is null then null
    when signal.direction = 'positive'
      then price.adjusted_close / signal.entry_adjusted_open - 1
    else -(price.adjusted_close / signal.entry_adjusted_open - 1)
  end as signed_return_to_date,
  outcome.status as outcome_20d_status,
  outcome.raw_return as outcome_20d_raw_return,
  outcome.signed_return as outcome_20d_signed_return,
  outcome.verdict as outcome_20d_verdict,
  price.provider as latest_price_provider,
  price.fetched_at as latest_price_fetched_at
from public.tickers as ticker
left join latest_active_signal as signal
  on signal.ticker = ticker.ticker
left join latest_price as price
  on price.ticker = ticker.ticker
left join public.signal_outcomes as outcome
  on outcome.signal_event_id = signal.id
  and outcome.horizon_sessions = 20
where ticker.active = true;

alter table public.market_daily_prices enable row level security;
alter table public.consensus_signal_events enable row level security;
alter table public.signal_outcomes enable row level security;

create policy market_daily_prices_authenticated_select
  on public.market_daily_prices
  for select
  to authenticated
  using (true);

create policy consensus_signal_events_authenticated_select
  on public.consensus_signal_events
  for select
  to authenticated
  using (true);

create policy signal_outcomes_authenticated_select
  on public.signal_outcomes
  for select
  to authenticated
  using (true);

revoke all on
  public.market_daily_prices,
  public.consensus_signal_events,
  public.signal_outcomes,
  public.ticker_signal_performance
from anon, authenticated;

grant select on
  public.market_daily_prices,
  public.consensus_signal_events,
  public.signal_outcomes,
  public.ticker_signal_performance
to authenticated;

grant all on
  public.market_daily_prices,
  public.consensus_signal_events,
  public.signal_outcomes
to service_role;

grant select on public.ticker_signal_performance to service_role;

grant usage, select on sequence public.consensus_signal_events_id_seq
to service_role;

revoke all on function private.classify_consensus_state(integer, integer, integer, numeric)
from public, anon, authenticated;
revoke all on function private.classify_signal_outcome(text, numeric, numeric)
from public, anon, authenticated;

grant execute on function private.classify_consensus_state(integer, integer, integer, numeric)
to service_role;
grant execute on function private.classify_signal_outcome(text, numeric, numeric)
to service_role;

alter table public.pipeline_runs
  drop constraint pipeline_runs_job_name_check;

alter table public.pipeline_runs
  add constraint pipeline_runs_job_name_check
  check (
    job_name in (
      'ingest_x_posts',
      'analyze_posts',
      'generate_daily_brief',
      'sync_market_prices',
      'replay_consensus_signals',
      'calculate_signal_outcomes'
    )
  );

commit;
