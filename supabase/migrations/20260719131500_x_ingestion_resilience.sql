begin;

create table public.pipeline_schedules (
  job_name text primary key,
  state text not null default 'active'
    check (state in ('active', 'auth_blocked')),
  next_run_at timestamptz not null default now(),
  blocked_credential_fingerprint text,
  auth_blocked_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint pipeline_schedules_job_name_not_blank_check
    check (btrim(job_name) <> ''),
  constraint pipeline_schedules_auth_state_check
    check (
      (
        state = 'active'
        and blocked_credential_fingerprint is null
        and auth_blocked_at is null
      )
      or
      (
        state = 'auth_blocked'
        and blocked_credential_fingerprint ~ '^[0-9a-f]{64}$'
        and auth_blocked_at is not null
      )
    )
);

create table public.pipeline_alerts (
  id bigint generated always as identity primary key,
  event_key text not null unique,
  kind text not null,
  message text not null,
  status text not null default 'pending',
  attempts integer not null default 0,
  next_attempt_at timestamptz not null default now(),
  sent_at timestamptz,
  last_error jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint pipeline_alerts_event_key_not_blank_check
    check (btrim(event_key) <> ''),
  constraint pipeline_alerts_kind_check
    check (
      kind in (
        'ingestion_success',
        'ingestion_failure',
        'authentication_blocked',
        'ingestion_recovery'
      )
    ),
  constraint pipeline_alerts_message_not_blank_check
    check (btrim(message) <> ''),
  constraint pipeline_alerts_status_check
    check (status in ('pending', 'sent')),
  constraint pipeline_alerts_attempts_check
    check (attempts >= 0),
  constraint pipeline_alerts_delivery_state_check
    check (
      (status = 'pending' and sent_at is null)
      or (status = 'sent' and sent_at is not null)
    ),
  constraint pipeline_alerts_last_error_object_check
    check (last_error is null or jsonb_typeof(last_error) = 'object')
);

create index pipeline_schedules_next_run_idx
  on public.pipeline_schedules (next_run_at)
  where state = 'active';

create index pipeline_alerts_due_idx
  on public.pipeline_alerts (next_attempt_at, id)
  where status = 'pending';

create trigger pipeline_schedules_set_updated_at
before update on public.pipeline_schedules
for each row execute function private.set_updated_at();

create trigger pipeline_alerts_set_updated_at
before update on public.pipeline_alerts
for each row execute function private.set_updated_at();

alter table public.pipeline_schedules enable row level security;
alter table public.pipeline_alerts enable row level security;

create or replace function public.claim_pipeline_schedule(
  p_job_name text,
  p_mode text,
  p_credential_fingerprint text
)
returns table (
  decision text,
  next_run_at timestamptz,
  delay_minutes integer
)
language plpgsql
volatile
security invoker
set search_path = ''
as $$
declare
  schedule_row public.pipeline_schedules%rowtype;
  chosen_delay integer;
  was_blocked boolean;
begin
  if p_job_name is null or btrim(p_job_name) = '' then
    raise exception 'job_name is required' using errcode = '22023';
  end if;

  if p_mode not in ('scheduled', 'manual') then
    raise exception 'mode must be scheduled or manual'
      using errcode = '22023';
  end if;

  if p_credential_fingerprint is null
    or p_credential_fingerprint !~ '^[0-9a-f]{64}$' then
    raise exception 'credential fingerprint must be SHA-256 hex'
      using errcode = '22023';
  end if;

  insert into public.pipeline_schedules (job_name)
  values (p_job_name)
  on conflict (job_name) do nothing;

  select *
  into schedule_row
  from public.pipeline_schedules
  where job_name = p_job_name
  for update;

  was_blocked := schedule_row.state = 'auth_blocked';

  if was_blocked
    and schedule_row.blocked_credential_fingerprint =
      p_credential_fingerprint then
    return query
    select
      'auth_blocked'::text,
      schedule_row.next_run_at,
      null::integer;
    return;
  end if;

  if not was_blocked
    and p_mode = 'scheduled'
    and schedule_row.next_run_at > now() then
    return query
    select
      'not_due'::text,
      schedule_row.next_run_at,
      null::integer;
    return;
  end if;

  chosen_delay := 30 + floor(random() * 4)::integer * 5;

  update public.pipeline_schedules
  set
    state = 'active',
    next_run_at = now() + make_interval(mins => chosen_delay),
    blocked_credential_fingerprint = null,
    auth_blocked_at = null
  where job_name = p_job_name
  returning *
  into schedule_row;

  return query
  select
    case
      when was_blocked then 'credential_changed'::text
      else 'due'::text
    end,
    schedule_row.next_run_at,
    chosen_delay;
end;
$$;

create or replace function public.block_pipeline_auth(
  p_job_name text,
  p_credential_fingerprint text,
  p_event_key text,
  p_message text
)
returns void
language plpgsql
volatile
security invoker
set search_path = ''
as $$
begin
  if p_job_name is null or btrim(p_job_name) = '' then
    raise exception 'job_name is required' using errcode = '22023';
  end if;

  if p_credential_fingerprint is null
    or p_credential_fingerprint !~ '^[0-9a-f]{64}$' then
    raise exception 'credential fingerprint must be SHA-256 hex'
      using errcode = '22023';
  end if;

  update public.pipeline_schedules
  set
    state = 'auth_blocked',
    blocked_credential_fingerprint = p_credential_fingerprint,
    auth_blocked_at = now()
  where job_name = p_job_name;

  if not found then
    insert into public.pipeline_schedules (
      job_name,
      state,
      blocked_credential_fingerprint,
      auth_blocked_at
    )
    values (
      p_job_name,
      'auth_blocked',
      p_credential_fingerprint,
      now()
    );
  end if;

  insert into public.pipeline_alerts (
    event_key,
    kind,
    message
  )
  values (
    p_event_key,
    'authentication_blocked',
    p_message
  )
  on conflict (event_key) do nothing;
end;
$$;

revoke all on public.pipeline_schedules, public.pipeline_alerts
  from public, anon, authenticated;
grant all on public.pipeline_schedules, public.pipeline_alerts
  to service_role;

revoke all on sequence public.pipeline_alerts_id_seq
  from public, anon, authenticated;
grant usage, select on sequence public.pipeline_alerts_id_seq
  to service_role;

revoke execute on function public.claim_pipeline_schedule(text, text, text)
  from public, anon, authenticated;
revoke execute on function public.block_pipeline_auth(text, text, text, text)
  from public, anon, authenticated;

grant execute on function public.claim_pipeline_schedule(text, text, text)
  to service_role;
grant execute on function public.block_pipeline_auth(text, text, text, text)
  to service_role;

commit;
