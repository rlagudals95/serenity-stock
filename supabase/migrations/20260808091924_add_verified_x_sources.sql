begin;

alter table public.analyst_profiles
  add column source_role text not null default 'opinion',
  add column consensus_eligible boolean not null default true;

alter table public.analyst_profiles
  add constraint analyst_profiles_source_role_check
    check (source_role in ('opinion', 'context', 'news', 'risk')),
  add constraint analyst_profiles_consensus_role_check
    check (not consensus_eligible or source_role = 'opinion');

comment on column public.analyst_profiles.source_role is
  'Source purpose: opinion, context/evidence, news/discovery, or risk.';
comment on column public.analyst_profiles.consensus_eligible is
  'Whether this source may contribute a vote to opinion consensus.';

insert into public.analyst_profiles (
  analyst_key,
  display_name,
  x_username,
  follower_label,
  description_ko,
  focus_areas,
  sort_order,
  active,
  analysis_post_types,
  source_role,
  consensus_eligible
)
values
  (
    'gene_munster',
    'Gene Munster',
    'munster_gene',
    'X 팔로워 10만+',
    'AI·빅테크 성장주를 중심으로 실적, 투자 지출과 장기 성장 관점을 공유합니다.',
    array['AI 인프라', '빅테크', '반도체', '성장주'],
    10,
    true,
    array['original', 'quote'],
    'opinion',
    true
  ),
  (
    'convequity',
    'Convequity',
    'Convequity',
    'X 팔로워 1만+',
    'AI 가치사슬 전반의 기술 구조와 병목을 기업 실적·밸류에이션에 연결해 분석합니다.',
    array['AI 인프라', '반도체', '데이터센터', '기업 소프트웨어'],
    20,
    true,
    array['original', 'quote'],
    'opinion',
    true
  ),
  (
    'brian_stoffel',
    'Brian Stoffel',
    'Brian_Stoffel_',
    'X 팔로워 14만+',
    '기업 펀더멘털과 안티프래질 원칙을 바탕으로 장기 성장주 관점과 포트폴리오 판단을 공유합니다.',
    array['장기 성장주', '기업 펀더멘털', '밸류에이션', '포트폴리오'],
    30,
    true,
    array['original'],
    'opinion',
    true
  ),
  (
    'rihard_jarc',
    'Rihard Jarc',
    'RihardJarc',
    'X 팔로워 8만+',
    '테크·성장주 투자 논리와 보유 포지션을 명시하며 기업별 장기 관점을 공유합니다.',
    array['성장주', '빅테크', 'AI', '포트폴리오'],
    40,
    true,
    array['original'],
    'opinion',
    true
  ),
  (
    'jonah_lupton',
    'Jonah Lupton',
    'JonahLupton',
    'X 팔로워 55만+',
    '중소형 성장주와 테마별 투자 아이디어를 근거·포지션·리스크와 함께 제시합니다.',
    array['중소형 성장주', 'AI', '우주산업', '헬스케어'],
    50,
    true,
    array['original'],
    'opinion',
    true
  ),
  (
    'shay_boloor',
    'Shay Boloor',
    'StockSavvyShay',
    'X 팔로워 43만+',
    '장기 성장 가능성이 높은 산업과 성장주를 분석하며 공개 포트폴리오의 구성과 성과를 공유합니다.',
    array['AI 인프라', '반도체', '우주산업', '양자컴퓨팅', '사이버보안'],
    60,
    true,
    array['original'],
    'opinion',
    true
  ),
  (
    'serenity',
    'Serenity',
    'aleabitoreddit',
    'X 팔로워 99만+',
    'AI와 반도체 공급망을 중심으로 공개 투자 관점을 추적합니다.',
    array['AI 인프라', '반도체', '공급망'],
    70,
    true,
    array['original'],
    'opinion',
    true
  ),
  (
    'ryan_reeves',
    'Ryan Reeves',
    'RyanReeves_',
    'X 팔로워 5만+',
    '기업 펀더멘털과 성장 동인을 중심으로 직접적인 종목 관점과 리스크를 공유합니다.',
    array['성장주', '기업 펀더멘털', 'AI', '소프트웨어'],
    80,
    true,
    array['original'],
    'opinion',
    true
  ),
  (
    'beth_kindig',
    'Beth Kindig',
    'Beth_Kindig',
    'X 팔로워 18만+',
    'AI·반도체·빅테크의 산업 데이터와 제3자 전망을 근거 소스로 정리합니다.',
    array['AI 인프라', '반도체', '빅테크', '클라우드'],
    110,
    true,
    array['original'],
    'context',
    false
  ),
  (
    'app_economy',
    'App Economy Insights',
    'EconomyApp',
    'X 팔로워 24만+',
    '디지털 경제와 상장 기술 기업의 실적·비즈니스 모델을 데이터와 시각화로 정리합니다.',
    array['디지털 경제', '빅테크', 'SaaS', '실적 분석'],
    120,
    true,
    array['original'],
    'context',
    false
  ),
  (
    'dan_nystedt',
    'Dan Nystedt',
    'dnystedt',
    'X 팔로워 5만+',
    '반도체 공급망과 아시아 기술 산업의 수치·기업 발표를 빠르게 정리합니다.',
    array['반도체', '대만', '공급망', '기업 실적'],
    130,
    true,
    array['original'],
    'context',
    false
  ),
  (
    'tsoh_investing',
    'The Science of Hitting',
    'TSOH_Investing',
    'X 팔로워 6만+',
    '기업 리서치와 장기 투자 프레임을 공개 글과 뉴스레터 맥락으로 제공합니다.',
    array['기업 리서치', '장기 투자', '빅테크', '소비재'],
    140,
    true,
    array['original'],
    'context',
    false
  ),
  (
    'tae_kim',
    'Tae Kim',
    'firstadopter',
    'X 팔로워 10만+',
    '반도체와 기술 산업의 제품·수요·경쟁 구도를 업계 맥락과 함께 설명합니다.',
    array['반도체', 'AI', '하드웨어', '기술 산업'],
    150,
    true,
    array['original'],
    'context',
    false
  ),
  (
    'dylan_patel',
    'Dylan Patel',
    'dylan522p',
    'X 팔로워 15만+',
    'AI 가속기, 반도체 제조와 데이터센터 경제성을 기술 산업 맥락으로 분석합니다.',
    array['AI 가속기', '반도체', '데이터센터', '공급망'],
    160,
    true,
    array['original'],
    'context',
    false
  ),
  (
    'chit_chat_stocks',
    'Chit Chat Stocks',
    'ChitChatStocks',
    'X 팔로워 1.8만+',
    '기업 인터뷰와 팟캐스트에서 장기 투자 아이디어와 추가 조사 단서를 발굴합니다.',
    array['팟캐스트', '기업 펀더멘털', '실적', '아이디어 발굴'],
    170,
    true,
    array['original'],
    'context',
    false
  ),
  (
    'stockmktnewz',
    'Evan (StockMKTNewz)',
    'StockMKTNewz',
    'X 팔로워 104만+',
    '미국 증시와 상장 기업의 주요 뉴스, 실적, 시장 이벤트를 빠르게 정리해 공유합니다.',
    array['미국 증시', '기업 뉴스', '실적', '시장 이벤트'],
    210,
    true,
    array['original', 'quote'],
    'news',
    false
  ),
  (
    'space_investor',
    'SpaceInvestor',
    'SpaceInvestor_D',
    'X 팔로워 5만+',
    '우주 산업 기업의 계약, 발사, 규제와 시장 뉴스를 종목 탐색용으로 정리합니다.',
    array['우주산업', '방산', '계약', '시장 뉴스'],
    220,
    true,
    array['original', 'quote'],
    'news',
    false
  ),
  (
    'muddy_waters',
    'Muddy Waters Research',
    'muddywatersre',
    'X 팔로워 25만+',
    '공매도 리서치와 기업 회계·지배구조 문제 제기를 독립 리스크 소스로 추적합니다.',
    array['공매도', '회계 리스크', '지배구조', '사기 의혹'],
    310,
    true,
    array['original', 'quote'],
    'risk',
    false
  ),
  (
    'stock_jabber',
    'StockJabber',
    'StockJabber',
    'X 팔로워 11만+',
    '상장 기업의 공시, 프로모션과 잠재적 레드 플래그를 비판적 관점에서 추적합니다.',
    array['공시', '프로모션 리스크', '소형주', '레드 플래그'],
    320,
    true,
    array['original'],
    'risk',
    false
  ),
  (
    'kerrisdale_capital',
    'Kerrisdale Capital',
    'KerrisdaleCap',
    'X 팔로워 9만+',
    '공개 롱·숏 리서치를 통해 밸류에이션, 사업 모델과 하방 리스크를 검증합니다.',
    array['공매도', '밸류에이션', '사업 모델', '하방 리스크'],
    330,
    true,
    array['original', 'quote'],
    'risk',
    false
  ),
  (
    'stock_market_nerd',
    'Stock Market Nerd',
    'StockMarketNerd',
    'X 팔로워 19만+',
    '실적 요약과 성장주 리서치를 제공하며 링크 원문 활용도를 파일럿으로 검증합니다.',
    array['성장주', '실적', '소프트웨어', '뉴스레터'],
    410,
    false,
    array['original'],
    'opinion',
    false
  ),
  (
    'the_valueist',
    'TheValueist',
    'TheValueist',
    'X 팔로워 3만+',
    '근거가 풍부한 종목 분석의 저자성·중복 위험을 파일럿으로 추가 검증합니다.',
    array['가치주', '기업 분석', '밸류에이션', '포트폴리오'],
    420,
    false,
    array['original'],
    'opinion',
    false
  ),
  (
    'mostly_borrowed_ideas',
    'Mostly Borrowed Ideas',
    'borrowed_ideas',
    'X 팔로워 14만+',
    '장문 기업 분석의 링크 원문 수집 효과를 확인하기 위한 파일럿 소스입니다.',
    array['기업 분석', '장기 투자', '밸류에이션', '뉴스레터'],
    430,
    false,
    array['original'],
    'opinion',
    false
  ),
  (
    'jose_najarro',
    'Jose Najarro',
    'JoseNajarro',
    'X 팔로워 1만+',
    '테크 성장주 분석의 강세 편향과 저자 귀속 정확도를 파일럿으로 검증합니다.',
    array['반도체', 'AI', '성장주', '기업 실적'],
    440,
    false,
    array['original'],
    'opinion',
    false
  ),
  (
    'ole_hansen',
    'Ole S Hansen',
    'Ole_S_Hansen',
    'X 팔로워 8만+',
    '원자재·거시 관점은 유효하지만 현재 종목 중심 수집 범위에서는 비활성화합니다.',
    array['원자재', '귀금속', '에너지', '거시경제'],
    900,
    false,
    array['original'],
    'context',
    false
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
  analysis_post_types = excluded.analysis_post_types,
  source_role = excluded.source_role,
  consensus_eligible = excluded.consensus_eligible;

create view public.ticker_consensus_analyst_summary
with (security_invoker = true)
as
with vote_events as (
  select timeline.*
  from public.ticker_opinion_timeline_v2 as timeline
  join public.analyst_profiles as profile
    on profile.analyst_key = timeline.analyst_key
  where profile.active = true
    and profile.consensus_eligible = true
    and (
      timeline.review_status = 'approved'
      or (
        timeline.review_status = 'auto'
        and timeline.stance_confidence >= 0.75
      )
    )
    and (
      timeline.stance in ('bullish', 'bearish')
      or (
        timeline.stance in ('neutral', 'mixed')
        and timeline.analyst_change_type = 'stance_change'
      )
    )
), latest_vote_event as (
  select distinct on (events.ticker, events.analyst_key)
    events.*
  from vote_events as events
  order by
    events.ticker,
    events.analyst_key,
    events.posted_at desc,
    events.post_ticker_analysis_id desc
)
select
  events.ticker,
  events.analyst_key,
  events.analyst_name,
  events.x_username,
  summary.total_mentions,
  summary.positive_count,
  summary.negative_count,
  summary.neutral_count,
  summary.mixed_count,
  summary.unknown_count,
  events.stance as latest_stance,
  events.claim as latest_claim,
  events.analyst_change_type as latest_change_type,
  summary.first_mentioned_at,
  events.posted_at as last_mentioned_at,
  events.source_url as latest_source_url
from latest_vote_event as events
join public.ticker_analyst_summary as summary
  on summary.ticker = events.ticker
  and summary.analyst_key = events.analyst_key
where events.stance in ('bullish', 'bearish')
  and events.posted_at >= now() - interval '90 days';

create or replace view public.analyst_track_records
with (security_invoker = true)
as
select
  outcome.analyst_key,
  max(outcome.analyst_name) as analyst_name,
  max(outcome.x_username) as x_username,
  count(*) filter (where outcome.hit)::bigint as hit_count,
  count(*)::bigint as sample_size,
  count(*) filter (where outcome.hit)::numeric / nullif(count(*), 0)
    as hit_rate,
  max(outcome.target_session_date) as latest_result_at
from public.analyst_bullish_episode_outcomes as outcome
join public.analyst_profiles as profile
  on profile.analyst_key = outcome.analyst_key
where outcome.outcome_status = 'evaluable'
  and outcome.signal_at >= now() - interval '12 months'
  and profile.active = true
  and profile.consensus_eligible = true
group by outcome.analyst_key;

create or replace view public.ticker_candidate_proof
with (security_invoker = true)
as
with current_bullish_analysts as (
  select
    summary.ticker,
    summary.analyst_key
  from public.ticker_consensus_analyst_summary as summary
  where summary.latest_stance = 'bullish'
    and summary.last_mentioned_at >= now() - interval '90 days'
), aggregated as (
  select
    ticker.ticker,
    count(current.analyst_key)::bigint as current_bullish_analyst_count,
    coalesce(sum(track.hit_count), 0)::bigint as hit_count,
    coalesce(sum(track.sample_size), 0)::bigint as sample_size
  from public.tickers as ticker
  left join current_bullish_analysts as current
    on current.ticker = ticker.ticker
  left join public.analyst_track_records as track
    on track.analyst_key = current.analyst_key
  where ticker.active = true
  group by ticker.ticker
)
select
  aggregated.ticker,
  aggregated.current_bullish_analyst_count,
  aggregated.hit_count,
  aggregated.sample_size,
  aggregated.hit_count::numeric / nullif(aggregated.sample_size, 0)
    as hit_rate,
  case
    when aggregated.sample_size = 0 then null
    else (
      (
        aggregated.hit_count::numeric / aggregated.sample_size
        + (1.96 * 1.96) / (2 * aggregated.sample_size)
        - 1.96 * sqrt(
          (
            aggregated.hit_count::numeric / aggregated.sample_size
            * (1 - aggregated.hit_count::numeric / aggregated.sample_size)
            + (1.96 * 1.96) / (4 * aggregated.sample_size)
          ) / aggregated.sample_size
        )
      ) / (1 + (1.96 * 1.96) / aggregated.sample_size)
    )
  end as wilson_score
from aggregated;

revoke all on public.ticker_consensus_analyst_summary
from anon, authenticated;
grant select on public.ticker_consensus_analyst_summary
to authenticated, service_role;

commit;
