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
    'convequity',
    'Convequity',
    'Convequity',
    null,
    'AI 가치사슬 전반의 기술 구조와 병목을 기업 실적·밸류에이션에 연결해 분석합니다.',
    array['AI 인프라', '반도체', '데이터센터', '기업 소프트웨어'],
    80,
    true,
    array['original', 'quote']
  ),
  (
    'gene_munster',
    'Gene Munster',
    'munster_gene',
    null,
    'AI·빅테크 성장주를 중심으로 실적, 투자 지출과 장기 성장 관점을 공유합니다.',
    array['AI 인프라', '빅테크', '반도체', '성장주'],
    90,
    true,
    array['original', 'quote']
  ),
  (
    'chit_chat_stocks',
    'Chit Chat Stocks',
    'ChitChatStocks',
    null,
    '상장 기업의 비즈니스 모델, 실적, 밸류에이션과 장기 투자 논점을 정리합니다.',
    array['성장주', '기업 펀더멘털', '실적', '밸류에이션'],
    100,
    true,
    array['original', 'quote']
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
