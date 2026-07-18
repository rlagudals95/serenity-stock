begin;

create schema if not exists private;

revoke all on schema private from public;
revoke all on schema private from anon, authenticated;

create table public.tickers (
  ticker text primary key,
  company_name text not null,
  exchange text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint tickers_ticker_format_check
    check (ticker = upper(ticker) and ticker ~ '^[A-Z][A-Z0-9.-]{0,9}$'),
  constraint tickers_company_name_not_blank_check
    check (btrim(company_name) <> ''),
  constraint tickers_exchange_not_blank_check
    check (exchange is null or btrim(exchange) <> '')
);

create table public.ticker_aliases (
  id bigint generated always as identity primary key,
  ticker text not null references public.tickers(ticker) on update cascade on delete cascade,
  alias text not null,
  alias_type text not null,
  source text not null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  constraint ticker_aliases_alias_not_blank_check
    check (btrim(alias) <> ''),
  constraint ticker_aliases_alias_type_check
    check (alias_type in ('ticker', 'cashtag', 'company_name', 'product', 'other')),
  constraint ticker_aliases_source_check
    check (source in ('manual', 'x_api', 'llm', 'import'))
);

create unique index ticker_aliases_lower_alias_ticker_uidx
  on public.ticker_aliases (lower(alias), ticker);

create table public.posts (
  id bigint generated always as identity primary key,
  x_post_id text not null unique,
  author_id text not null,
  text text not null,
  url text not null,
  post_type text not null,
  conversation_id text,
  referenced_post_ids text[] not null default '{}'::text[],
  posted_at timestamptz not null,
  metrics jsonb not null default '{}'::jsonb,
  raw jsonb not null,
  inserted_at timestamptz not null default now(),
  constraint posts_x_post_id_not_blank_check
    check (btrim(x_post_id) <> ''),
  constraint posts_author_id_not_blank_check
    check (btrim(author_id) <> ''),
  constraint posts_text_not_blank_check
    check (btrim(text) <> ''),
  constraint posts_url_not_blank_check
    check (btrim(url) <> ''),
  constraint posts_post_type_check
    check (post_type in ('original', 'reply', 'quote', 'repost')),
  constraint posts_metrics_object_check
    check (jsonb_typeof(metrics) = 'object'),
  constraint posts_raw_object_check
    check (jsonb_typeof(raw) = 'object')
);

create table public.analysis_configs (
  id bigint generated always as identity primary key,
  provider text not null,
  model text not null,
  prompt_version text not null,
  schema_version text not null,
  is_active boolean not null default false,
  created_at timestamptz not null default now(),
  constraint analysis_configs_provider_not_blank_check
    check (btrim(provider) <> ''),
  constraint analysis_configs_model_not_blank_check
    check (btrim(model) <> ''),
  constraint analysis_configs_prompt_version_not_blank_check
    check (btrim(prompt_version) <> ''),
  constraint analysis_configs_schema_version_not_blank_check
    check (btrim(schema_version) <> ''),
  constraint analysis_configs_version_unique
    unique (provider, model, prompt_version, schema_version)
);

create unique index analysis_configs_one_active_idx
  on public.analysis_configs ((is_active))
  where is_active = true;

create table public.analysis_jobs (
  id bigint generated always as identity primary key,
  post_id bigint not null references public.posts(id) on delete cascade,
  analysis_config_id bigint not null references public.analysis_configs(id),
  status text not null default 'pending',
  attempts integer not null default 0,
  available_at timestamptz not null default now(),
  locked_at timestamptz,
  locked_by uuid,
  last_error jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint analysis_jobs_status_check
    check (status in ('pending', 'processing', 'completed', 'failed')),
  constraint analysis_jobs_attempts_check
    check (attempts >= 0),
  constraint analysis_jobs_lock_state_check
    check (
      (status = 'processing' and locked_at is not null and locked_by is not null)
      or
      (status <> 'processing' and locked_at is null and locked_by is null)
    ),
  constraint analysis_jobs_last_error_object_check
    check (last_error is null or jsonb_typeof(last_error) = 'object'),
  constraint analysis_jobs_post_config_unique
    unique (post_id, analysis_config_id)
);

create table public.post_analyses (
  id bigint generated always as identity primary key,
  post_id bigint not null references public.posts(id) on delete cascade,
  analysis_config_id bigint not null references public.analysis_configs(id),
  status text not null,
  relevance text not null,
  summary_ko text,
  themes text[] not null default '{}'::text[],
  is_noise boolean not null default false,
  input_tokens integer,
  output_tokens integer,
  estimated_cost_usd numeric(12, 8),
  raw_response jsonb not null,
  created_at timestamptz not null default now(),
  constraint post_analyses_status_check
    check (status in ('completed', 'needs_review', 'rejected')),
  constraint post_analyses_relevance_check
    check (relevance in ('relevant', 'partial', 'irrelevant')),
  constraint post_analyses_input_tokens_check
    check (input_tokens is null or input_tokens >= 0),
  constraint post_analyses_output_tokens_check
    check (output_tokens is null or output_tokens >= 0),
  constraint post_analyses_estimated_cost_check
    check (estimated_cost_usd is null or estimated_cost_usd >= 0),
  constraint post_analyses_raw_response_object_check
    check (jsonb_typeof(raw_response) = 'object'),
  constraint post_analyses_post_config_unique
    unique (post_id, analysis_config_id)
);

create table public.post_ticker_analyses (
  id bigint generated always as identity primary key,
  post_analysis_id bigint not null references public.post_analyses(id) on delete cascade,
  ticker text not null references public.tickers(ticker) on update cascade,
  stance text not null,
  claim_type text not null,
  claim text,
  evidence_from_post text[] not null default '{}'::text[],
  risks_mentioned text[] not null default '{}'::text[],
  catalysts_mentioned text[] not null default '{}'::text[],
  conviction text not null,
  novelty text not null,
  ticker_confidence numeric(4, 3) not null,
  stance_confidence numeric(4, 3) not null,
  review_status text not null default 'auto',
  review_reason text,
  change_type text,
  change_summary text,
  compared_to_analysis_id bigint references public.post_ticker_analyses(id) on delete set null,
  created_at timestamptz not null default now(),
  constraint post_ticker_analyses_stance_check
    check (stance in ('bullish', 'bearish', 'mixed', 'neutral', 'unknown')),
  constraint post_ticker_analyses_claim_type_check
    check (
      claim_type in (
        'thesis',
        'valuation',
        'growth',
        'earnings',
        'catalyst',
        'risk',
        'technical',
        'positioning',
        'other'
      )
    ),
  constraint post_ticker_analyses_conviction_check
    check (conviction in ('low', 'medium', 'high', 'unknown')),
  constraint post_ticker_analyses_novelty_check
    check (novelty in ('new', 'updated', 'repeated', 'unknown')),
  constraint post_ticker_analyses_ticker_confidence_check
    check (ticker_confidence between 0 and 1),
  constraint post_ticker_analyses_stance_confidence_check
    check (stance_confidence between 0 and 1),
  constraint post_ticker_analyses_review_status_check
    check (review_status in ('auto', 'approved', 'needs_review', 'rejected')),
  constraint post_ticker_analyses_review_reason_check
    check (review_reason is null or review_reason in ('ticker', 'stance', 'claim', 'other')),
  constraint post_ticker_analyses_change_type_check
    check (
      change_type is null
      or change_type in (
        'first_mention',
        'new_claim',
        'new_risk',
        'stance_change',
        'repeat',
        'unclear'
      )
    ),
  constraint post_ticker_analyses_post_ticker_unique
    unique (post_analysis_id, ticker),
  constraint post_ticker_analyses_not_self_compared_check
    check (compared_to_analysis_id is null or compared_to_analysis_id <> id)
);

create table public.watchlist (
  user_id uuid not null references auth.users(id) on delete cascade,
  ticker text not null references public.tickers(ticker) on update cascade on delete cascade,
  priority text not null default 'medium',
  note text,
  research_status text not null default 'unreviewed',
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, ticker),
  constraint watchlist_priority_check
    check (priority in ('low', 'medium', 'high')),
  constraint watchlist_research_status_check
    check (research_status in ('unreviewed', 'researching', 'completed', 'on_hold'))
);

create table public.analysis_feedback (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  post_ticker_analysis_id bigint not null
    references public.post_ticker_analyses(id) on delete cascade,
  rating text not null,
  error_type text,
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint analysis_feedback_rating_check
    check (rating in ('useful', 'known', 'misclassified')),
  constraint analysis_feedback_error_type_check
    check (error_type is null or error_type in ('ticker', 'stance', 'claim', 'other')),
  constraint analysis_feedback_misclassified_error_check
    check (rating = 'misclassified' or error_type is null),
  constraint analysis_feedback_user_analysis_unique
    unique (user_id, post_ticker_analysis_id)
);

create table public.daily_reports (
  id bigint generated always as identity primary key,
  report_date date not null,
  version integer not null,
  window_start timestamptz not null,
  window_end timestamptz not null,
  status text not null,
  content_md text not null,
  summary text,
  source_post_ids bigint[] not null default '{}'::bigint[],
  stats jsonb not null default '{}'::jsonb,
  analysis_config_id bigint references public.analysis_configs(id),
  created_at timestamptz not null default now(),
  constraint daily_reports_version_check
    check (version > 0),
  constraint daily_reports_window_check
    check (window_start < window_end),
  constraint daily_reports_status_check
    check (status in ('draft', 'ready', 'sent', 'failed')),
  constraint daily_reports_content_not_blank_check
    check (btrim(content_md) <> ''),
  constraint daily_reports_stats_object_check
    check (jsonb_typeof(stats) = 'object'),
  constraint daily_reports_date_version_unique
    unique (report_date, version)
);

create table public.pipeline_runs (
  id uuid primary key,
  job_name text not null,
  status text not null,
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  counts jsonb not null default '{}'::jsonb,
  error jsonb,
  metadata jsonb not null default '{}'::jsonb,
  constraint pipeline_runs_job_name_check
    check (job_name in ('ingest_x_posts', 'analyze_posts', 'generate_daily_brief')),
  constraint pipeline_runs_status_check
    check (status in ('running', 'completed', 'failed', 'partial')),
  constraint pipeline_runs_finished_at_check
    check (
      (status = 'running' and finished_at is null)
      or
      (status <> 'running' and finished_at is not null)
    ),
  constraint pipeline_runs_counts_object_check
    check (jsonb_typeof(counts) = 'object'),
  constraint pipeline_runs_error_object_check
    check (error is null or jsonb_typeof(error) = 'object'),
  constraint pipeline_runs_metadata_object_check
    check (jsonb_typeof(metadata) = 'object')
);

create index ticker_aliases_active_alias_idx
  on public.ticker_aliases (lower(alias))
  where active = true;

create index ticker_aliases_ticker_idx
  on public.ticker_aliases (ticker);

create index posts_posted_at_id_idx
  on public.posts (posted_at desc, id desc);

create index posts_conversation_id_idx
  on public.posts (conversation_id)
  where conversation_id is not null;

create index analysis_jobs_available_idx
  on public.analysis_jobs (status, available_at, id)
  where status in ('pending', 'failed');

create index analysis_jobs_processing_lock_idx
  on public.analysis_jobs (locked_at, id)
  where status = 'processing';

create index analysis_jobs_analysis_config_id_idx
  on public.analysis_jobs (analysis_config_id);

create index post_analyses_analysis_config_id_idx
  on public.post_analyses (analysis_config_id);

create index post_ticker_analyses_ticker_post_analysis_idx
  on public.post_ticker_analyses (ticker, post_analysis_id);

create index post_ticker_analyses_post_analysis_id_idx
  on public.post_ticker_analyses (post_analysis_id);

create index post_ticker_analyses_compared_to_analysis_id_idx
  on public.post_ticker_analyses (compared_to_analysis_id)
  where compared_to_analysis_id is not null;

create index post_ticker_analyses_ticker_stance_created_at_idx
  on public.post_ticker_analyses (ticker, stance, created_at desc)
  where review_status <> 'rejected';

create index post_ticker_analyses_review_confidence_idx
  on public.post_ticker_analyses (
    review_status,
    ticker_confidence,
    stance_confidence
  );

create index watchlist_user_active_ticker_idx
  on public.watchlist (user_id, active, ticker);

create index watchlist_ticker_idx
  on public.watchlist (ticker);

create index analysis_feedback_post_ticker_analysis_id_idx
  on public.analysis_feedback (post_ticker_analysis_id);

create index daily_reports_report_date_version_idx
  on public.daily_reports (report_date desc, version desc);

create index daily_reports_analysis_config_id_idx
  on public.daily_reports (analysis_config_id)
  where analysis_config_id is not null;

create index pipeline_runs_job_name_started_at_idx
  on public.pipeline_runs (job_name, started_at desc);

create or replace function private.set_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

revoke execute on function private.set_updated_at() from public;

create trigger tickers_set_updated_at
before update on public.tickers
for each row execute function private.set_updated_at();

create trigger analysis_jobs_set_updated_at
before update on public.analysis_jobs
for each row execute function private.set_updated_at();

create trigger watchlist_set_updated_at
before update on public.watchlist
for each row execute function private.set_updated_at();

create trigger analysis_feedback_set_updated_at
before update on public.analysis_feedback
for each row execute function private.set_updated_at();

alter table public.tickers enable row level security;
alter table public.ticker_aliases enable row level security;
alter table public.posts enable row level security;
alter table public.analysis_configs enable row level security;
alter table public.analysis_jobs enable row level security;
alter table public.post_analyses enable row level security;
alter table public.post_ticker_analyses enable row level security;
alter table public.watchlist enable row level security;
alter table public.analysis_feedback enable row level security;
alter table public.daily_reports enable row level security;
alter table public.pipeline_runs enable row level security;

create policy tickers_authenticated_select
  on public.tickers
  for select
  to authenticated
  using (true);

create policy ticker_aliases_authenticated_select
  on public.ticker_aliases
  for select
  to authenticated
  using (true);

create policy posts_authenticated_select
  on public.posts
  for select
  to authenticated
  using (true);

create policy analysis_configs_authenticated_select
  on public.analysis_configs
  for select
  to authenticated
  using (true);

create policy post_analyses_authenticated_select
  on public.post_analyses
  for select
  to authenticated
  using (true);

create policy post_ticker_analyses_authenticated_select
  on public.post_ticker_analyses
  for select
  to authenticated
  using (true);

create policy daily_reports_authenticated_select
  on public.daily_reports
  for select
  to authenticated
  using (true);

create policy watchlist_owner_select
  on public.watchlist
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy watchlist_owner_insert
  on public.watchlist
  for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

create policy watchlist_owner_update
  on public.watchlist
  for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy watchlist_owner_delete
  on public.watchlist
  for delete
  to authenticated
  using ((select auth.uid()) = user_id);

create policy analysis_feedback_owner_select
  on public.analysis_feedback
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy analysis_feedback_owner_insert
  on public.analysis_feedback
  for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

create policy analysis_feedback_owner_update
  on public.analysis_feedback
  for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy analysis_feedback_owner_delete
  on public.analysis_feedback
  for delete
  to authenticated
  using ((select auth.uid()) = user_id);

create or replace function public.claim_analysis_jobs(
  p_worker_id uuid,
  p_batch_size integer
)
returns setof public.analysis_jobs
language plpgsql
volatile
security invoker
set search_path = ''
as $$
begin
  if p_worker_id is null then
    raise exception 'worker_id is required' using errcode = '22023';
  end if;

  if p_batch_size is null or p_batch_size < 1 or p_batch_size > 100 then
    raise exception 'batch_size must be between 1 and 100' using errcode = '22023';
  end if;

  return query
  with candidates as (
    select job.id
    from public.analysis_jobs as job
    where (
      (
        job.status in ('pending', 'failed')
        and job.available_at <= now()
      )
      or
      (
        job.status = 'processing'
        and job.locked_at <= now() - interval '5 minutes'
      )
    )
    order by job.available_at, job.id
    for update skip locked
    limit p_batch_size
  )
  update public.analysis_jobs as job
  set
    status = 'processing',
    attempts = job.attempts + 1,
    locked_at = now(),
    locked_by = p_worker_id,
    last_error = case
      when job.status = 'processing'
        then jsonb_build_object('code', 'stale_lock_reclaimed')
      else job.last_error
    end
  from candidates
  where job.id = candidates.id
  returning job.*;
end;
$$;

create or replace function public.enqueue_missing_analysis_jobs(
  p_batch_size integer default 100
)
returns integer
language plpgsql
volatile
security invoker
set search_path = ''
as $$
declare
  inserted_count integer;
begin
  if p_batch_size is null or p_batch_size < 1 or p_batch_size > 1000 then
    raise exception 'batch_size must be between 1 and 1000' using errcode = '22023';
  end if;

  with active_config as (
    select config.id
    from public.analysis_configs as config
    where config.is_active = true
  ),
  missing as (
    select post.id as post_id, active_config.id as analysis_config_id
    from public.posts as post
    cross join active_config
    where post.post_type <> 'repost'
      and not exists (
        select 1
        from public.analysis_jobs as job
        where job.post_id = post.id
          and job.analysis_config_id = active_config.id
      )
    order by post.posted_at, post.id
    limit p_batch_size
  )
  insert into public.analysis_jobs (post_id, analysis_config_id)
  select missing.post_id, missing.analysis_config_id
  from missing
  on conflict (post_id, analysis_config_id) do nothing;

  get diagnostics inserted_count = row_count;
  return inserted_count;
end;
$$;

create or replace function public.complete_analysis_job(
  p_job_id bigint,
  p_worker_id uuid,
  p_analysis_payload jsonb
)
returns bigint
language plpgsql
volatile
security invoker
set search_path = ''
as $$
declare
  claimed_job public.analysis_jobs%rowtype;
  new_post_analysis_id bigint;
begin
  if p_analysis_payload is null or jsonb_typeof(p_analysis_payload) <> 'object' then
    raise exception 'analysis_payload must be a JSON object' using errcode = '22023';
  end if;

  select job.*
  into claimed_job
  from public.analysis_jobs as job
  where job.id = p_job_id
  for update;

  if not found then
    raise exception 'analysis job % does not exist', p_job_id using errcode = 'P0002';
  end if;

  if claimed_job.status <> 'processing' or claimed_job.locked_by <> p_worker_id then
    raise exception 'analysis job % is not locked by this worker', p_job_id
      using errcode = '42501';
  end if;

  insert into public.post_analyses (
    post_id,
    analysis_config_id,
    status,
    relevance,
    summary_ko,
    themes,
    is_noise,
    input_tokens,
    output_tokens,
    estimated_cost_usd,
    raw_response
  )
  values (
    claimed_job.post_id,
    claimed_job.analysis_config_id,
    coalesce(p_analysis_payload ->> 'status', 'completed'),
    coalesce(p_analysis_payload ->> 'relevance', 'relevant'),
    p_analysis_payload ->> 'summary_ko',
    coalesce(
      array(
        select jsonb_array_elements_text(p_analysis_payload -> 'themes')
      ),
      '{}'::text[]
    ),
    coalesce((p_analysis_payload ->> 'is_noise')::boolean, false),
    (p_analysis_payload ->> 'input_tokens')::integer,
    (p_analysis_payload ->> 'output_tokens')::integer,
    (p_analysis_payload ->> 'estimated_cost_usd')::numeric(12, 8),
    coalesce(p_analysis_payload -> 'raw_response', p_analysis_payload)
  )
  returning id into new_post_analysis_id;

  insert into public.post_ticker_analyses (
    post_analysis_id,
    ticker,
    stance,
    claim_type,
    claim,
    evidence_from_post,
    risks_mentioned,
    catalysts_mentioned,
    conviction,
    novelty,
    ticker_confidence,
    stance_confidence,
    review_status,
    review_reason,
    change_type,
    change_summary,
    compared_to_analysis_id
  )
  select
    new_post_analysis_id,
    item.ticker,
    item.stance,
    item.claim_type,
    item.claim,
    coalesce(item.evidence_from_post, '{}'::text[]),
    coalesce(item.risks_mentioned, '{}'::text[]),
    coalesce(item.catalysts_mentioned, '{}'::text[]),
    item.conviction,
    item.novelty,
    item.ticker_confidence,
    item.stance_confidence,
    coalesce(item.review_status, 'auto'),
    item.review_reason,
    item.change_type,
    item.change_summary,
    item.compared_to_analysis_id
  from jsonb_to_recordset(
    coalesce(p_analysis_payload -> 'ticker_analyses', '[]'::jsonb)
  ) as item (
    ticker text,
    stance text,
    claim_type text,
    claim text,
    evidence_from_post text[],
    risks_mentioned text[],
    catalysts_mentioned text[],
    conviction text,
    novelty text,
    ticker_confidence numeric(4, 3),
    stance_confidence numeric(4, 3),
    review_status text,
    review_reason text,
    change_type text,
    change_summary text,
    compared_to_analysis_id bigint
  );

  update public.analysis_jobs
  set
    status = 'completed',
    locked_at = null,
    locked_by = null,
    last_error = null
  where id = p_job_id;

  return new_post_analysis_id;
end;
$$;

create or replace function public.fail_analysis_job(
  p_job_id bigint,
  p_worker_id uuid,
  p_error_payload jsonb,
  p_next_available_at timestamptz
)
returns void
language plpgsql
volatile
security invoker
set search_path = ''
as $$
begin
  if p_error_payload is null or jsonb_typeof(p_error_payload) <> 'object' then
    raise exception 'error_payload must be a JSON object' using errcode = '22023';
  end if;

  if p_next_available_at is null then
    raise exception 'next_available_at is required' using errcode = '22023';
  end if;

  update public.analysis_jobs
  set
    status = 'failed',
    available_at = p_next_available_at,
    locked_at = null,
    locked_by = null,
    last_error = p_error_payload
  where id = p_job_id
    and status = 'processing'
    and locked_by = p_worker_id;

  if not found then
    raise exception 'analysis job % is not locked by this worker', p_job_id
      using errcode = '42501';
  end if;
end;
$$;

create view public.ticker_overview
with (security_invoker = true)
as
with active_config as (
  select config.id
  from public.analysis_configs as config
  where config.is_active = true
),
ranked_mentions as (
  select
    ticker_analysis.id as post_ticker_analysis_id,
    ticker_analysis.ticker,
    ticker_analysis.stance,
    ticker_analysis.claim,
    ticker_analysis.change_type,
    ticker_analysis.review_status,
    ticker_analysis.review_reason,
    ticker_analysis.stance_confidence,
    post.id as post_id,
    post.x_post_id,
    post.conversation_id,
    post.posted_at,
    row_number() over (
      partition by ticker_analysis.ticker, post.id
      order by ticker_analysis.id desc
    ) as post_ticker_rank
  from public.post_ticker_analyses as ticker_analysis
  join public.post_analyses as post_analysis
    on post_analysis.id = ticker_analysis.post_analysis_id
  join active_config
    on active_config.id = post_analysis.analysis_config_id
  join public.posts as post
    on post.id = post_analysis.post_id
  where post.post_type <> 'repost'
    and post_analysis.is_noise = false
    and (
      ticker_analysis.review_status = 'approved'
      or (
        ticker_analysis.review_status in ('auto', 'needs_review')
        and ticker_analysis.ticker_confidence >= 0.75
        and coalesce(ticker_analysis.review_reason, '') <> 'ticker'
      )
    )
),
mentions as (
  select
    ranked_mentions.*,
    (
      ranked_mentions.review_status = 'approved'
      or (
        ranked_mentions.review_status = 'auto'
        and ranked_mentions.stance_confidence >= 0.75
      )
    ) as stance_is_countable
  from ranked_mentions
  where ranked_mentions.post_ticker_rank = 1
),
aggregated as (
  select
    mentions.ticker,
    count(*)::bigint as total_mentions,
    count(*) filter (
      where mentions.stance_is_countable and mentions.stance = 'bullish'
    )::bigint as positive_count,
    count(*) filter (
      where mentions.stance_is_countable and mentions.stance = 'bearish'
    )::bigint as negative_count,
    count(*) filter (
      where mentions.stance_is_countable and mentions.stance = 'neutral'
    )::bigint as neutral_count,
    count(*) filter (
      where mentions.stance_is_countable and mentions.stance = 'mixed'
    )::bigint as mixed_count,
    count(*) filter (
      where mentions.stance_is_countable and mentions.stance = 'unknown'
    )::bigint as unknown_count,
    count(*) filter (
      where mentions.posted_at >= now() - interval '7 days'
    )::bigint as mentions_7d,
    count(*) filter (
      where mentions.posted_at >= now() - interval '30 days'
    )::bigint as mentions_30d,
    count(
      distinct coalesce(mentions.conversation_id, mentions.x_post_id)
    )::bigint as unique_threads,
    max(mentions.posted_at) as last_mentioned_at,
    count(*) filter (
      where mentions.review_status = 'needs_review'
    )::bigint as needs_review_count
  from mentions
  group by mentions.ticker
),
latest_valid_opinion as (
  select distinct on (mentions.ticker)
    mentions.ticker,
    mentions.stance as latest_stance,
    mentions.claim as latest_claim,
    mentions.change_type as latest_change_type
  from mentions
  where mentions.stance_is_countable
    and mentions.stance <> 'unknown'
  order by mentions.ticker, mentions.posted_at desc, mentions.post_ticker_analysis_id desc
)
select
  ticker.ticker,
  ticker.company_name,
  ticker.exchange,
  exists (
    select 1
    from public.watchlist as watched
    where watched.user_id = (select auth.uid())
      and watched.ticker = ticker.ticker
      and watched.active = true
  ) as is_watchlisted,
  aggregated.total_mentions,
  aggregated.positive_count,
  aggregated.negative_count,
  aggregated.neutral_count,
  aggregated.mixed_count,
  aggregated.unknown_count,
  case
    when aggregated.positive_count + aggregated.negative_count = 0 then null
    else round(
      aggregated.positive_count::numeric
      / (aggregated.positive_count + aggregated.negative_count),
      4
    )
  end as positive_share,
  case
    when aggregated.positive_count + aggregated.negative_count < 3
      then 'insufficient'
    when (
      aggregated.positive_count::numeric
      / (aggregated.positive_count + aggregated.negative_count)
    ) >= 0.65
      then 'positive'
    when (
      aggregated.positive_count::numeric
      / (aggregated.positive_count + aggregated.negative_count)
    ) <= 0.35
      then 'negative'
    else 'mixed'
  end as cumulative_sentiment,
  latest_valid_opinion.latest_stance,
  latest_valid_opinion.latest_claim,
  latest_valid_opinion.latest_change_type,
  aggregated.mentions_7d,
  aggregated.mentions_30d,
  aggregated.unique_threads,
  aggregated.last_mentioned_at,
  aggregated.needs_review_count
from public.tickers as ticker
join aggregated
  on aggregated.ticker = ticker.ticker
left join latest_valid_opinion
  on latest_valid_opinion.ticker = ticker.ticker
where ticker.active = true;

create view public.ticker_opinion_timeline
with (security_invoker = true)
as
with active_config as (
  select config.id
  from public.analysis_configs as config
  where config.is_active = true
)
select
  ticker_analysis.id as post_ticker_analysis_id,
  ticker_analysis.ticker,
  ticker.company_name,
  post.id as post_id,
  post.x_post_id,
  post.posted_at,
  post.post_type,
  post.conversation_id,
  post.url as source_url,
  post.text as source_text,
  post_analysis.summary_ko,
  post_analysis.themes,
  ticker_analysis.stance,
  ticker_analysis.claim_type,
  ticker_analysis.claim,
  ticker_analysis.evidence_from_post,
  ticker_analysis.risks_mentioned,
  ticker_analysis.catalysts_mentioned,
  ticker_analysis.conviction,
  ticker_analysis.novelty,
  ticker_analysis.ticker_confidence,
  ticker_analysis.stance_confidence,
  ticker_analysis.review_status,
  ticker_analysis.review_reason,
  ticker_analysis.change_type,
  ticker_analysis.change_summary,
  ticker_analysis.compared_to_analysis_id,
  feedback.rating as feedback_rating,
  feedback.error_type as feedback_error_type,
  feedback.note as feedback_note
from public.post_ticker_analyses as ticker_analysis
join public.post_analyses as post_analysis
  on post_analysis.id = ticker_analysis.post_analysis_id
join active_config
  on active_config.id = post_analysis.analysis_config_id
join public.posts as post
  on post.id = post_analysis.post_id
join public.tickers as ticker
  on ticker.ticker = ticker_analysis.ticker
left join public.analysis_feedback as feedback
  on feedback.post_ticker_analysis_id = ticker_analysis.id
  and feedback.user_id = (select auth.uid())
where post.post_type <> 'repost'
  and post_analysis.is_noise = false
  and (
    ticker_analysis.review_status = 'approved'
    or (
      ticker_analysis.review_status in ('auto', 'needs_review')
      and ticker_analysis.ticker_confidence >= 0.75
      and coalesce(ticker_analysis.review_reason, '') <> 'ticker'
    )
  );

revoke all on all tables in schema public from anon, authenticated;
revoke all on all sequences in schema public from anon, authenticated;

grant select on
  public.tickers,
  public.ticker_aliases,
  public.posts,
  public.analysis_configs,
  public.post_analyses,
  public.post_ticker_analyses,
  public.daily_reports
to authenticated;

grant select, insert, update, delete on
  public.watchlist,
  public.analysis_feedback
to authenticated;

grant usage, select on sequence public.analysis_feedback_id_seq
to authenticated;

grant select on
  public.ticker_overview,
  public.ticker_opinion_timeline
to authenticated;

revoke all on public.ticker_overview, public.ticker_opinion_timeline from anon;

grant all on all tables in schema public to service_role;
grant usage, select on all sequences in schema public to service_role;

revoke execute on function public.claim_analysis_jobs(uuid, integer)
  from public, anon, authenticated;
revoke execute on function public.enqueue_missing_analysis_jobs(integer)
  from public, anon, authenticated;
revoke execute on function public.complete_analysis_job(bigint, uuid, jsonb)
  from public, anon, authenticated;
revoke execute on function public.fail_analysis_job(bigint, uuid, jsonb, timestamptz)
  from public, anon, authenticated;

grant execute on function public.claim_analysis_jobs(uuid, integer)
  to service_role;
grant execute on function public.enqueue_missing_analysis_jobs(integer)
  to service_role;
grant execute on function public.complete_analysis_job(bigint, uuid, jsonb)
  to service_role;
grant execute on function public.fail_analysis_job(bigint, uuid, jsonb, timestamptz)
  to service_role;

commit;
