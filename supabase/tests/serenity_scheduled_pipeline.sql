begin;

select plan(2);

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

select pass('pipeline leases and dead-letter transitions behave as expected');

do $$
declare
  config_id bigint;
  original_post_id bigint;
  reply_post_id bigint;
  default_reply_post_id bigint;
begin
  update public.analysis_configs
  set is_active = false
  where is_active = true;

  insert into public.analysis_configs (
    provider,
    model,
    prompt_version,
    schema_version,
    is_active
  )
  values (
    'test-policy-provider',
    'test-policy-model',
    'test-policy-prompt',
    'test-policy-schema',
    true
  )
  returning id into config_id;

  insert into public.analyst_profiles (
    analyst_key,
    display_name,
    x_username,
    description_ko,
    analysis_post_types
  )
  values
    (
      'test_original_only',
      'Test Original Only',
      'test_original_only',
      '원문 전용 테스트 계정',
      array['original']
    ),
    (
      'test_default_policy',
      'Test Default Policy',
      'test_default_policy',
      '기본 정책 테스트 계정',
      array['original', 'reply', 'quote']
    );

  insert into public.posts (
    x_post_id,
    author_id,
    author_username,
    text,
    url,
    post_type,
    posted_at,
    raw
  )
  values (
    'test-original-only-original',
    'test-original-only-user',
    'test_original_only',
    '$TEST original',
    'https://x.com/test_original_only/status/original',
    'original',
    '1900-01-01T00:00:00Z',
    '{}'::jsonb
  )
  returning id into original_post_id;

  insert into public.posts (
    x_post_id,
    author_id,
    author_username,
    text,
    url,
    post_type,
    posted_at,
    raw
  )
  values (
    'test-original-only-reply',
    'test-original-only-user',
    'test_original_only',
    '$TEST reply',
    'https://x.com/test_original_only/status/reply',
    'reply',
    '1900-01-01T00:00:01Z',
    '{}'::jsonb
  )
  returning id into reply_post_id;

  insert into public.posts (
    x_post_id,
    author_id,
    author_username,
    text,
    url,
    post_type,
    posted_at,
    raw
  )
  values (
    'test-default-policy-reply',
    'test-default-policy-user',
    'test_default_policy',
    '$TEST default reply',
    'https://x.com/test_default_policy/status/reply',
    'reply',
    '1900-01-01T00:00:02Z',
    '{}'::jsonb
  )
  returning id into default_reply_post_id;

  perform public.enqueue_missing_analysis_jobs(1000);

  if not exists (
    select 1
    from public.analysis_jobs
    where post_id = original_post_id
      and analysis_config_id = config_id
  ) then
    raise exception 'original-only profile should enqueue original posts';
  end if;

  if exists (
    select 1
    from public.analysis_jobs
    where post_id = reply_post_id
      and analysis_config_id = config_id
  ) then
    raise exception 'original-only profile should not enqueue replies';
  end if;

  if not exists (
    select 1
    from public.analysis_jobs
    where post_id = default_reply_post_id
      and analysis_config_id = config_id
  ) then
    raise exception 'default profile policy should enqueue replies';
  end if;
end;
$$;

select pass('analyst post-type policies control analysis job enqueueing');
select * from finish();

rollback;
