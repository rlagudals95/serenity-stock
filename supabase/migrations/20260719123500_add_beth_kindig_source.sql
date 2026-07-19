begin;

insert into public.analyst_profiles (
  analyst_key,
  display_name,
  x_username,
  follower_label,
  description_ko,
  focus_areas,
  sort_order,
  active
)
values (
  'beth_kindig',
  'Beth Kindig',
  'Beth_Kindig',
  'X 팔로워 18만+',
  'AI·반도체·빅테크 성장주를 중심으로 데이터 기반 투자 관점을 공유합니다.',
  array['AI 인프라', '반도체', '빅테크', '클라우드'],
  30,
  true
)
on conflict (analyst_key) do update
set
  display_name = excluded.display_name,
  x_username = excluded.x_username,
  follower_label = excluded.follower_label,
  description_ko = excluded.description_ko,
  focus_areas = excluded.focus_areas,
  sort_order = excluded.sort_order,
  active = excluded.active;

commit;
