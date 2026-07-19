begin;

alter table public.analyst_profiles
  add column analysis_post_types text[] not null
    default array['original', 'reply', 'quote']::text[];

alter table public.analyst_profiles
  add constraint analyst_profiles_analysis_post_types_check
    check (
      cardinality(analysis_post_types) > 0
      and analysis_post_types
        <@ array['original', 'reply', 'quote']::text[]
    );

insert into public.analyst_profiles (
  analyst_key,
  display_name,
  x_username,
  follower_label,
  description_ko,
  focus_areas,
  sort_order,
  active,
  analysis_post_types
)
values
  (
    'app_economy',
    'App Economy Insights',
    'EconomyApp',
    'X 팔로워 23만+',
    '디지털 경제와 상장 기술 기업의 실적·비즈니스 모델을 데이터와 시각화로 정리합니다.',
    array['디지털 경제', '빅테크', 'SaaS', '실적 분석'],
    40,
    true,
    array['original']
  ),
  (
    'brian_stoffel',
    'Brian Stoffel',
    'Brian_Stoffel_',
    'X 팔로워 14만+',
    '기업 펀더멘털과 안티프래질 원칙을 바탕으로 장기 성장주 관점과 포트폴리오 판단을 공유합니다.',
    array['장기 성장주', '기업 펀더멘털', '밸류에이션', '포트폴리오'],
    50,
    true,
    array['original']
  )
on conflict (analyst_key) do update
set
  display_name = excluded.display_name,
  x_username = excluded.x_username,
  follower_label = excluded.follower_label,
  description_ko = excluded.description_ko,
  focus_areas = excluded.focus_areas,
  sort_order = excluded.sort_order,
  active = excluded.active,
  analysis_post_types = excluded.analysis_post_types;

delete from public.posts as post
using public.analyst_profiles as profile,
  public.ingestion_cursors as cursor
where lower(post.author_username) = lower(profile.x_username)
  and cursor.source_key = 'x:' || lower(profile.x_username)
  and post.author_id <> cursor.user_id;

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
    left join public.analyst_profiles as profile
      on lower(profile.x_username) = lower(post.author_username)
    where post.analysis_eligible = true
      and post.post_type <> 'repost'
      and (
        profile.analyst_key is null
        or post.post_type = any(profile.analysis_post_types)
      )
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

commit;
