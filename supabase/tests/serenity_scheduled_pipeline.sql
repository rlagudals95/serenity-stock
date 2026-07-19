begin;

do $$
declare
  first_owner uuid := gen_random_uuid();
  second_owner uuid := gen_random_uuid();
  job_id bigint;
  post_id bigint;
  config_id bigint;
  claimed public.analysis_jobs%rowtype;
begin
  if not public.acquire_pipeline_lease('test-pipeline', first_owner, 60) then
    raise exception 'first lease acquisition should succeed';
  end if;

  if public.acquire_pipeline_lease('test-pipeline', second_owner, 60) then
    raise exception 'overlapping lease acquisition should fail';
  end if;

  update public.pipeline_leases
  set
    acquired_at = now() - interval '2 minutes',
    locked_until = now() - interval '1 second'
  where job_name = 'test-pipeline';

  if not public.acquire_pipeline_lease('test-pipeline', second_owner, 60) then
    raise exception 'expired lease acquisition should succeed';
  end if;

  insert into public.ingestion_cursors (source_key, user_id)
  values ('test-source', 'test-user');

  begin
    insert into public.ingestion_cursors (source_key, user_id)
    values ('test-source', 'other-user');
    raise exception 'duplicate source cursor should fail';
  exception
    when unique_violation then null;
  end;

  insert into public.analysis_configs (
    provider,
    model,
    prompt_version,
    schema_version,
    is_active
  )
  values (
    'test-provider',
    'test-model',
    'test-prompt',
    'test-schema',
    false
  )
  returning id into config_id;

  insert into public.posts (
    x_post_id,
    author_id,
    text,
    url,
    post_type,
    posted_at,
    raw
  )
  values (
    'test-dead-letter-post',
    'test-user',
    'test post',
    'https://x.com/test/status/test-dead-letter-post',
    'original',
    now(),
    '{}'::jsonb
  )
  returning id into post_id;

  insert into public.analysis_jobs (
    post_id,
    analysis_config_id,
    status,
    attempts,
    locked_at,
    locked_by
  )
  values (
    post_id,
    config_id,
    'processing',
    3,
    now(),
    second_owner
  )
  returning id into job_id;

  perform public.fail_analysis_job(
    job_id,
    second_owner,
    '{"code":"test"}'::jsonb,
    now() + interval '5 minutes'
  );

  select *
  into claimed
  from public.analysis_jobs
  where id = job_id;

  if claimed.status <> 'dead_letter'
    or claimed.locked_at is not null
    or claimed.locked_by is not null then
    raise exception 'third failure should dead-letter and unlock the job';
  end if;
end;
$$;

rollback;
