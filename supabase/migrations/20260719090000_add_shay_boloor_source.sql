begin;

create table public.analyst_profiles (
  analyst_key text primary key,
  display_name text not null,
  x_username text not null unique,
  follower_label text,
  description_ko text not null,
  focus_areas text[] not null default '{}'::text[],
  sort_order integer not null default 100,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint analyst_profiles_key_format_check
    check (analyst_key ~ '^[a-z][a-z0-9_]{1,39}$'),
  constraint analyst_profiles_name_not_blank_check
    check (btrim(display_name) <> ''),
  constraint analyst_profiles_username_not_blank_check
    check (btrim(x_username) <> ''),
  constraint analyst_profiles_description_not_blank_check
    check (btrim(description_ko) <> '')
);

insert into public.analyst_profiles (
  analyst_key,
  display_name,
  x_username,
  follower_label,
  description_ko,
  focus_areas,
  sort_order
)
values
  (
    'serenity',
    'Serenity',
    'aleabitoreddit',
    'X 팔로워 90만+',
    'AI와 반도체 공급망을 중심으로 공개 투자 관점을 추적합니다.',
    array['AI 인프라', '반도체', '공급망'],
    10
  ),
  (
    'shay_boloor',
    'Shay Boloor',
    'StockSavvyShay',
    'X 팔로워 43만+',
    '장기 성장 가능성이 높은 산업과 성장주를 분석하며 공개 포트폴리오의 구성과 성과를 공유합니다.',
    array['AI 인프라', '반도체', '우주산업', '양자컴퓨팅', '사이버보안'],
    20
  );

create unique index analyst_profiles_lower_username_uidx
  on public.analyst_profiles (lower(x_username));

alter table public.posts
  add column author_username text;

update public.posts
set author_username = 'aleabitoreddit'
where author_username is null;

alter table public.posts
  alter column author_username set default 'aleabitoreddit',
  alter column author_username set not null;

alter table public.posts
  add constraint posts_author_username_not_blank_check
    check (btrim(author_username) <> '');

create index posts_author_username_posted_at_idx
  on public.posts (lower(author_username), posted_at desc, id desc);

create view public.ticker_opinion_timeline_v2
with (security_invoker = true)
as
with enriched as (
  select
    timeline.*,
    coalesce(profile.analyst_key, lower(post.author_username))
      as analyst_key,
    coalesce(profile.display_name, '@' || post.author_username)
      as analyst_name,
    post.author_username as x_username,
    row_number() over (
      partition by timeline.ticker, lower(post.author_username)
      order by timeline.posted_at, timeline.post_ticker_analysis_id
    ) as analyst_sequence,
    lag(timeline.stance) over (
      partition by timeline.ticker, lower(post.author_username)
      order by timeline.posted_at, timeline.post_ticker_analysis_id
    ) as previous_analyst_stance
  from public.ticker_opinion_timeline as timeline
  join public.posts as post
    on post.id = timeline.post_id
  left join public.analyst_profiles as profile
    on lower(profile.x_username) = lower(post.author_username)
)
select
  enriched.*,
  case
    when enriched.analyst_sequence = 1 then 'first_mention'
    when enriched.stance in ('bullish', 'bearish')
      and enriched.previous_analyst_stance in ('bullish', 'bearish')
      and enriched.stance <> enriched.previous_analyst_stance
      then 'stance_change'
    else enriched.change_type
  end as analyst_change_type
from enriched;

create view public.ticker_analyst_summary
with (security_invoker = true)
as
with mentions as (
  select
    timeline.*,
    (
      timeline.review_status = 'approved'
      or (
        timeline.review_status = 'auto'
        and timeline.stance_confidence >= 0.75
      )
    ) as stance_is_countable
  from public.ticker_opinion_timeline_v2 as timeline
),
aggregated as (
  select
    mentions.ticker,
    mentions.analyst_key,
    mentions.analyst_name,
    mentions.x_username,
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
    min(mentions.posted_at) as first_mentioned_at,
    max(mentions.posted_at) as last_mentioned_at
  from mentions
  group by
    mentions.ticker,
    mentions.analyst_key,
    mentions.analyst_name,
    mentions.x_username
),
latest_valid_opinion as (
  select distinct on (mentions.ticker, mentions.analyst_key)
    mentions.ticker,
    mentions.analyst_key,
    mentions.stance as latest_stance,
    mentions.claim as latest_claim,
    mentions.analyst_change_type as latest_change_type,
    mentions.source_url as latest_source_url
  from mentions
  where mentions.stance_is_countable
    and mentions.stance <> 'unknown'
  order by
    mentions.ticker,
    mentions.analyst_key,
    mentions.posted_at desc,
    mentions.post_ticker_analysis_id desc
)
select
  aggregated.ticker,
  aggregated.analyst_key,
  aggregated.analyst_name,
  aggregated.x_username,
  aggregated.total_mentions,
  aggregated.positive_count,
  aggregated.negative_count,
  aggregated.neutral_count,
  aggregated.mixed_count,
  aggregated.unknown_count,
  latest_valid_opinion.latest_stance,
  latest_valid_opinion.latest_claim,
  latest_valid_opinion.latest_change_type,
  aggregated.first_mentioned_at,
  aggregated.last_mentioned_at,
  latest_valid_opinion.latest_source_url
from aggregated
left join latest_valid_opinion
  on latest_valid_opinion.ticker = aggregated.ticker
  and latest_valid_opinion.analyst_key = aggregated.analyst_key;

create trigger analyst_profiles_set_updated_at
before update on public.analyst_profiles
for each row execute function private.set_updated_at();

alter table public.analyst_profiles enable row level security;

revoke all on public.analyst_profiles from anon, authenticated;
grant select on public.analyst_profiles to authenticated;

grant select on
  public.ticker_opinion_timeline_v2,
  public.ticker_analyst_summary
to authenticated;

revoke all on
  public.ticker_opinion_timeline_v2,
  public.ticker_analyst_summary
from anon;

grant all on public.analyst_profiles to service_role;
grant select on
  public.ticker_opinion_timeline_v2,
  public.ticker_analyst_summary
to service_role;

commit;
