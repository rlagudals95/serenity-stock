begin;

alter table public.posts
  add column if not exists analysis_eligible boolean not null default true;

create index if not exists posts_analysis_eligible_posted_at_idx
  on public.posts (analysis_eligible, posted_at, id)
  where analysis_eligible = true;

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
    where post.analysis_eligible = true
      and post.post_type <> 'repost'
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
