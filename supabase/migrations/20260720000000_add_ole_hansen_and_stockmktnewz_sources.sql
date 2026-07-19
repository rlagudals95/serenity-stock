begin;

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
    'ole_hansen',
    'Ole S Hansen',
    'Ole_S_Hansen',
    'X 팔로워 8만+',
    '주요 원자재 시장을 중심으로 귀금속·에너지·농산물의 가격 흐름과 거시 환경을 분석합니다.',
    array['원자재', '귀금속', '에너지', '거시경제'],
    60,
    true,
    array['original', 'reply', 'quote']
  ),
  (
    'stockmktnewz',
    'Evan (StockMKTNewz)',
    'StockMKTNewz',
    'X 팔로워 99만+',
    '미국 증시와 상장 기업의 주요 뉴스, 실적, 시장 이벤트를 빠르게 정리해 공유합니다.',
    array['미국 증시', '기업 뉴스', '실적', '시장 이벤트'],
    70,
    true,
    array['original', 'reply', 'quote']
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

commit;
