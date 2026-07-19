begin;

create table public.pipeline_leases (
  job_name text primary key,
  owner_id uuid not null,
  locked_until timestamptz not null,
  acquired_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint pipeline_leases_job_name_not_blank_check
    check (btrim(job_name) <> ''),
  constraint pipeline_leases_locked_until_check
    check (locked_until > acquired_at)
);

create table public.ingestion_cursors (
  source_key text primary key,
  user_id text not null,
  since_id text,
  high_water_id text,
  pagination_token text,
  cycle_started_at timestamptz,
  last_success_at timestamptz,
  last_error jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint ingestion_cursors_source_key_not_blank_check
    check (btrim(source_key) <> ''),
  constraint ingestion_cursors_user_id_not_blank_check
    check (btrim(user_id) <> ''),
  constraint ingestion_cursors_cycle_state_check
    check (
      (pagination_token is null and cycle_started_at is null)
      or
      (pagination_token is not null and cycle_started_at is not null)
    ),
  constraint ingestion_cursors_last_error_object_check
    check (last_error is null or jsonb_typeof(last_error) = 'object')
);

alter table public.analysis_jobs
  drop constraint analysis_jobs_status_check;

alter table public.analysis_jobs
  add constraint analysis_jobs_status_check
    check (status in ('pending', 'processing', 'completed', 'failed', 'dead_letter'));

create index pipeline_leases_locked_until_idx
  on public.pipeline_leases (locked_until);

create index ingestion_cursors_last_success_at_idx
  on public.ingestion_cursors (last_success_at desc nulls last);

create index analysis_jobs_dead_letter_updated_idx
  on public.analysis_jobs (updated_at desc, id)
  where status = 'dead_letter';

create trigger pipeline_leases_set_updated_at
before update on public.pipeline_leases
for each row execute function private.set_updated_at();

create trigger ingestion_cursors_set_updated_at
before update on public.ingestion_cursors
for each row execute function private.set_updated_at();

alter table public.pipeline_leases enable row level security;
alter table public.ingestion_cursors enable row level security;

create or replace function public.acquire_pipeline_lease(
  p_job_name text,
  p_owner_id uuid,
  p_ttl_seconds integer default 600
)
returns boolean
language plpgsql
volatile
security invoker
set search_path = ''
as $$
declare
  acquired boolean;
begin
  if p_job_name is null or btrim(p_job_name) = '' then
    raise exception 'job_name is required' using errcode = '22023';
  end if;

  if p_owner_id is null then
    raise exception 'owner_id is required' using errcode = '22023';
  end if;

  if p_ttl_seconds is null or p_ttl_seconds < 30 or p_ttl_seconds > 3600 then
    raise exception 'ttl_seconds must be between 30 and 3600'
      using errcode = '22023';
  end if;

  with lease as (
    insert into public.pipeline_leases (
      job_name,
      owner_id,
      locked_until,
      acquired_at
    )
    values (
      p_job_name,
      p_owner_id,
      now() + make_interval(secs => p_ttl_seconds),
      now()
    )
    on conflict (job_name) do update
    set
      owner_id = excluded.owner_id,
      locked_until = excluded.locked_until,
      acquired_at = excluded.acquired_at
    where public.pipeline_leases.locked_until <= now()
      or public.pipeline_leases.owner_id = p_owner_id
    returning true
  )
  select coalesce(bool_or(true), false)
  into acquired
  from lease;

  return acquired;
end;
$$;

create or replace function public.release_pipeline_lease(
  p_job_name text,
  p_owner_id uuid
)
returns boolean
language plpgsql
volatile
security invoker
set search_path = ''
as $$
declare
  released_count integer;
begin
  update public.pipeline_leases
  set locked_until = now()
  where job_name = p_job_name
    and owner_id = p_owner_id;

  get diagnostics released_count = row_count;
  return released_count = 1;
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
    status = case when attempts >= 3 then 'dead_letter' else 'failed' end,
    available_at = p_next_available_at,
    locked_at = null,
    locked_by = null,
    last_error = p_error_payload
      || jsonb_build_object('dead_lettered', attempts >= 3)
  where id = p_job_id
    and status = 'processing'
    and locked_by = p_worker_id;

  if not found then
    raise exception 'analysis job % is not locked by this worker', p_job_id
      using errcode = '42501';
  end if;
end;
$$;

revoke all on public.pipeline_leases, public.ingestion_cursors
  from anon, authenticated;
grant all on public.pipeline_leases, public.ingestion_cursors
  to service_role;

revoke execute on function public.acquire_pipeline_lease(text, uuid, integer)
  from public, anon, authenticated;
revoke execute on function public.release_pipeline_lease(text, uuid)
  from public, anon, authenticated;

grant execute on function public.acquire_pipeline_lease(text, uuid, integer)
  to service_role;
grant execute on function public.release_pipeline_lease(text, uuid)
  to service_role;

commit;
