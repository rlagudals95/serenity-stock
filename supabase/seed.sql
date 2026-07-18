begin;

insert into public.tickers (ticker, company_name, exchange)
values
  ('COHR', 'Coherent Corp.', 'NYSE'),
  ('AAOI', 'Applied Optoelectronics, Inc.', 'NASDAQ'),
  ('NVDA', 'NVIDIA Corporation', 'NASDAQ'),
  ('PLTR', 'Palantir Technologies Inc.', 'NASDAQ'),
  ('CRDO', 'Credo Technology Group Holding Ltd', 'NASDAQ'),
  ('ASTS', 'AST SpaceMobile, Inc.', 'NASDAQ');

insert into public.ticker_aliases (ticker, alias, alias_type, source)
values
  ('COHR', '$COHR', 'cashtag', 'manual'),
  ('COHR', 'Coherent', 'company_name', 'manual'),
  ('AAOI', '$AAOI', 'cashtag', 'manual'),
  ('AAOI', 'Applied Optoelectronics', 'company_name', 'manual'),
  ('NVDA', '$NVDA', 'cashtag', 'manual'),
  ('NVDA', 'NVIDIA', 'company_name', 'manual'),
  ('PLTR', '$PLTR', 'cashtag', 'manual'),
  ('PLTR', 'Palantir', 'company_name', 'manual'),
  ('CRDO', '$CRDO', 'cashtag', 'manual'),
  ('CRDO', 'Credo', 'company_name', 'manual'),
  ('ASTS', '$ASTS', 'cashtag', 'manual'),
  ('ASTS', 'AST SpaceMobile', 'company_name', 'manual');

insert into public.analysis_configs (
  provider,
  model,
  prompt_version,
  schema_version,
  is_active,
  created_at
)
values (
  'deepseek',
  'deepseek-v4-flash',
  'serenity-post-v1',
  'serenity-analysis-v1',
  true,
  '2026-07-01T00:00:00Z'
);

insert into public.posts (
  x_post_id,
  author_id,
  text,
  url,
  post_type,
  conversation_id,
  referenced_post_ids,
  posted_at,
  metrics,
  raw
)
values
  (
    'seed-cohr-01',
    'serenity-seed',
    '$COHR optical transceiver demand is strengthening into the second half.',
    'https://x.com/serenitycap/status/seed-cohr-01',
    'original',
    'thread-cohr-01',
    '{}'::text[],
    '2026-07-03T01:15:00Z',
    '{"like_count": 142, "reply_count": 9}'::jsonb,
    '{"seed": true, "source": "x"}'::jsonb
  ),
  (
    'seed-cohr-02',
    'serenity-seed',
    '$COHR backlog and datacenter exposure support a higher earnings path.',
    'https://x.com/serenitycap/status/seed-cohr-02',
    'reply',
    'thread-cohr-01',
    array['seed-cohr-01'],
    '2026-07-07T04:40:00Z',
    '{"like_count": 98, "reply_count": 5}'::jsonb,
    '{"seed": true, "source": "x"}'::jsonb
  ),
  (
    'seed-cohr-03',
    'serenity-seed',
    '$COHR upside remains attractive, though execution risk is not trivial.',
    'https://x.com/serenitycap/status/seed-cohr-03',
    'original',
    'thread-cohr-03',
    '{}'::text[],
    '2026-07-12T07:20:00Z',
    '{"like_count": 121, "reply_count": 12}'::jsonb,
    '{"seed": true, "source": "x"}'::jsonb
  ),
  (
    'seed-cohr-04',
    'serenity-seed',
    '$COHR remains one of the cleaner optical beneficiaries in this cycle.',
    'https://x.com/serenitycap/status/seed-cohr-04',
    'quote',
    'thread-cohr-04',
    array['external-optics-01'],
    '2026-07-18T00:42:00Z',
    '{"like_count": 177, "reply_count": 14}'::jsonb,
    '{"seed": true, "source": "x"}'::jsonb
  ),
  (
    'seed-aaoi-01',
    'serenity-seed',
    '$AAOI capacity expansion creates meaningful operating leverage.',
    'https://x.com/serenitycap/status/seed-aaoi-01',
    'original',
    'thread-aaoi-01',
    '{}'::text[],
    '2026-07-02T02:05:00Z',
    '{"like_count": 103, "reply_count": 8}'::jsonb,
    '{"seed": true, "source": "x"}'::jsonb
  ),
  (
    'seed-aaoi-02',
    'serenity-seed',
    '$AAOI customer demand looks stronger than consensus expects.',
    'https://x.com/serenitycap/status/seed-aaoi-02',
    'reply',
    'thread-aaoi-01',
    array['seed-aaoi-01'],
    '2026-07-06T05:30:00Z',
    '{"like_count": 88, "reply_count": 7}'::jsonb,
    '{"seed": true, "source": "x"}'::jsonb
  ),
  (
    'seed-aaoi-03',
    'serenity-seed',
    '$AAOI valuation now leaves less room for execution mistakes.',
    'https://x.com/serenitycap/status/seed-aaoi-03',
    'original',
    'thread-aaoi-03',
    '{}'::text[],
    '2026-07-13T03:10:00Z',
    '{"like_count": 116, "reply_count": 16}'::jsonb,
    '{"seed": true, "source": "x"}'::jsonb
  ),
  (
    'seed-aaoi-04',
    'serenity-seed',
    '$AAOI demand is constructive, but near-term margins may stay volatile.',
    'https://x.com/serenitycap/status/seed-aaoi-04',
    'original',
    'thread-aaoi-04',
    '{}'::text[],
    '2026-07-17T06:25:00Z',
    '{"like_count": 134, "reply_count": 11}'::jsonb,
    '{"seed": true, "source": "x"}'::jsonb
  ),
  (
    'seed-nvda-01',
    'serenity-seed',
    '$NVDA demand visibility remains exceptional across hyperscalers.',
    'https://x.com/serenitycap/status/seed-nvda-01',
    'original',
    'thread-nvda-01',
    '{}'::text[],
    '2026-07-04T08:45:00Z',
    '{"like_count": 205, "reply_count": 19}'::jsonb,
    '{"seed": true, "source": "x"}'::jsonb
  ),
  (
    'seed-nvda-02',
    'serenity-seed',
    '$NVDA software and networking deepen the competitive moat.',
    'https://x.com/serenitycap/status/seed-nvda-02',
    'original',
    'thread-nvda-02',
    '{}'::text[],
    '2026-07-10T02:55:00Z',
    '{"like_count": 221, "reply_count": 24}'::jsonb,
    '{"seed": true, "source": "x"}'::jsonb
  ),
  (
    'seed-nvda-03',
    'serenity-seed',
    '$NVDA remains strong, but this update does not change the thesis.',
    'https://x.com/serenitycap/status/seed-nvda-03',
    'reply',
    'thread-nvda-02',
    array['seed-nvda-02'],
    '2026-07-16T01:35:00Z',
    '{"like_count": 162, "reply_count": 13}'::jsonb,
    '{"seed": true, "source": "x"}'::jsonb
  ),
  (
    'seed-pltr-01',
    'serenity-seed',
    '$PLTR valuation assumes an unusually long period of flawless growth.',
    'https://x.com/serenitycap/status/seed-pltr-01',
    'original',
    'thread-pltr-01',
    '{}'::text[],
    '2026-07-05T09:10:00Z',
    '{"like_count": 184, "reply_count": 31}'::jsonb,
    '{"seed": true, "source": "x"}'::jsonb
  ),
  (
    'seed-pltr-02',
    'serenity-seed',
    '$PLTR risk-reward looks unfavorable after the latest multiple expansion.',
    'https://x.com/serenitycap/status/seed-pltr-02',
    'original',
    'thread-pltr-02',
    '{}'::text[],
    '2026-07-11T04:15:00Z',
    '{"like_count": 199, "reply_count": 28}'::jsonb,
    '{"seed": true, "source": "x"}'::jsonb
  ),
  (
    'seed-pltr-03',
    'serenity-seed',
    '$PLTR commercial acceleration is better than expected and changes the setup.',
    'https://x.com/serenitycap/status/seed-pltr-03',
    'quote',
    'thread-pltr-03',
    array['external-pltr-01'],
    '2026-07-18T02:05:00Z',
    '{"like_count": 236, "reply_count": 35}'::jsonb,
    '{"seed": true, "source": "x"}'::jsonb
  ),
  (
    'seed-crdo-01',
    'serenity-seed',
    '$CRDO is gaining share as high-speed connectivity becomes a bottleneck.',
    'https://x.com/serenitycap/status/seed-crdo-01',
    'original',
    'thread-crdo-01',
    '{}'::text[],
    '2026-07-01T03:50:00Z',
    '{"like_count": 91, "reply_count": 6}'::jsonb,
    '{"seed": true, "source": "x"}'::jsonb
  ),
  (
    'seed-crdo-02',
    'serenity-seed',
    '$CRDO product breadth supports durable growth beyond one customer.',
    'https://x.com/serenitycap/status/seed-crdo-02',
    'original',
    'thread-crdo-02',
    '{}'::text[],
    '2026-07-09T07:05:00Z',
    '{"like_count": 109, "reply_count": 8}'::jsonb,
    '{"seed": true, "source": "x"}'::jsonb
  ),
  (
    'seed-crdo-03',
    'serenity-seed',
    '$CRDO remains a high-conviction way to own AI connectivity growth.',
    'https://x.com/serenitycap/status/seed-crdo-03',
    'original',
    'thread-crdo-03',
    '{}'::text[],
    '2026-07-15T05:45:00Z',
    '{"like_count": 147, "reply_count": 10}'::jsonb,
    '{"seed": true, "source": "x"}'::jsonb
  ),
  (
    'seed-asts-01',
    'serenity-seed',
    '$ASTS has asymmetric upside if commercial deployment stays on schedule.',
    'https://x.com/serenitycap/status/seed-asts-01',
    'original',
    'thread-asts-01',
    '{}'::text[],
    '2026-07-08T06:15:00Z',
    '{"like_count": 173, "reply_count": 21}'::jsonb,
    '{"seed": true, "source": "x"}'::jsonb
  ),
  (
    'seed-asts-02',
    'serenity-seed',
    '$ASTS launch timing is difficult to underwrite from the available details.',
    'https://x.com/serenitycap/status/seed-asts-02',
    'reply',
    'thread-asts-01',
    array['seed-asts-01'],
    '2026-07-14T08:35:00Z',
    '{"like_count": 127, "reply_count": 18}'::jsonb,
    '{"seed": true, "source": "x"}'::jsonb
  ),
  (
    'seed-asts-03',
    'serenity-seed',
    '$ASTS financing risk has increased and now deserves more weight.',
    'https://x.com/serenitycap/status/seed-asts-03',
    'original',
    'thread-asts-03',
    '{}'::text[],
    '2026-07-17T09:05:00Z',
    '{"like_count": 154, "reply_count": 26}'::jsonb,
    '{"seed": true, "source": "x"}'::jsonb
  );

insert into public.analysis_jobs (
  post_id,
  analysis_config_id,
  status,
  attempts,
  available_at,
  created_at,
  updated_at
)
select
  post.id,
  config.id,
  'completed',
  1,
  post.posted_at,
  post.posted_at,
  post.posted_at + interval '30 seconds'
from public.posts as post
cross join public.analysis_configs as config
where config.is_active = true;

insert into public.post_analyses (
  post_id,
  analysis_config_id,
  status,
  relevance,
  summary_ko,
  themes,
  is_noise,
  input_tokens,
  output_tokens,
  estimated_cost_usd,
  raw_response,
  created_at
)
select
  post.id,
  config.id,
  'completed',
  'relevant',
  'Seed analysis: ' || post.text,
  array['equities', 'serenity'],
  false,
  420,
  115,
  0.00019000,
  jsonb_build_object(
    'seed', true,
    'provider', config.provider,
    'model', config.model
  ),
  post.posted_at + interval '20 seconds'
from public.posts as post
cross join public.analysis_configs as config
where config.is_active = true;

with seed_analysis (
  x_post_id,
  ticker,
  stance,
  claim_type,
  claim,
  evidence,
  risks,
  catalysts,
  conviction,
  novelty,
  ticker_confidence,
  stance_confidence,
  review_status,
  review_reason,
  change_type,
  change_summary
) as (
  values
    (
      'seed-cohr-01', 'COHR', 'bullish', 'growth',
      'Optical demand should strengthen in the second half.',
      'optical transceiver demand is strengthening',
      '{}'::text[], array['datacenter demand'], 'high', 'new',
      1.000, 0.930, 'auto', null, 'first_mention', 'Initial positive thesis'
    ),
    (
      'seed-cohr-02', 'COHR', 'bullish', 'earnings',
      'Backlog and datacenter exposure support earnings upside.',
      'support a higher earnings path',
      '{}'::text[], array['backlog conversion'], 'high', 'updated',
      1.000, 0.940, 'auto', null, 'new_claim', 'Added earnings support'
    ),
    (
      'seed-cohr-03', 'COHR', 'mixed', 'risk',
      'Upside remains, but execution risk is material.',
      'execution risk is not trivial',
      array['execution'], '{}'::text[], 'medium', 'new',
      1.000, 0.900, 'auto', null, 'new_risk', 'Execution risk introduced'
    ),
    (
      'seed-cohr-04', 'COHR', 'bullish', 'thesis',
      'Coherent remains a clean optical cycle beneficiary.',
      'cleaner optical beneficiaries',
      '{}'::text[], array['optical cycle'], 'high', 'updated',
      1.000, 0.950, 'auto', null, 'new_claim', 'Thesis reinforced'
    ),
    (
      'seed-aaoi-01', 'AAOI', 'bullish', 'growth',
      'Capacity expansion can create operating leverage.',
      'capacity expansion creates meaningful operating leverage',
      '{}'::text[], array['capacity expansion'], 'high', 'new',
      1.000, 0.920, 'auto', null, 'first_mention', 'Initial operating leverage thesis'
    ),
    (
      'seed-aaoi-02', 'AAOI', 'bullish', 'growth',
      'Customer demand appears stronger than consensus.',
      'demand looks stronger than consensus',
      '{}'::text[], array['customer demand'], 'medium', 'updated',
      1.000, 0.900, 'auto', null, 'new_claim', 'Demand evidence added'
    ),
    (
      'seed-aaoi-03', 'AAOI', 'bearish', 'valuation',
      'The valuation reduces tolerance for execution misses.',
      'less room for execution mistakes',
      array['valuation', 'execution'], '{}'::text[], 'medium', 'new',
      1.000, 0.910, 'auto', null, 'stance_change', 'Valuation changed the directional view'
    ),
    (
      'seed-aaoi-04', 'AAOI', 'mixed', 'risk',
      'Demand is constructive while margins remain uncertain.',
      'near-term margins may stay volatile',
      array['margin volatility'], array['customer demand'], 'medium', 'updated',
      1.000, 0.880, 'auto', null, 'new_risk', 'Margin risk added'
    ),
    (
      'seed-nvda-01', 'NVDA', 'bullish', 'growth',
      'Hyperscaler demand visibility remains exceptional.',
      'demand visibility remains exceptional',
      '{}'::text[], array['hyperscaler demand'], 'high', 'new',
      1.000, 0.960, 'auto', null, 'first_mention', 'Initial demand thesis'
    ),
    (
      'seed-nvda-02', 'NVDA', 'bullish', 'thesis',
      'Software and networking deepen the competitive moat.',
      'deepen the competitive moat',
      '{}'::text[], array['software', 'networking'], 'high', 'new',
      1.000, 0.950, 'auto', null, 'new_claim', 'Moat thesis expanded'
    ),
    (
      'seed-nvda-03', 'NVDA', 'neutral', 'thesis',
      'The update does not materially change the existing thesis.',
      'does not change the thesis',
      '{}'::text[], '{}'::text[], 'medium', 'repeated',
      1.000, 0.860, 'auto', null, 'repeat', 'No material thesis change'
    ),
    (
      'seed-pltr-01', 'PLTR', 'bearish', 'valuation',
      'The valuation requires an unusually long growth runway.',
      'assumes an unusually long period of flawless growth',
      array['valuation'], '{}'::text[], 'high', 'new',
      1.000, 0.950, 'auto', null, 'first_mention', 'Initial valuation concern'
    ),
    (
      'seed-pltr-02', 'PLTR', 'bearish', 'valuation',
      'Multiple expansion has weakened the risk-reward.',
      'risk-reward looks unfavorable',
      array['multiple compression'], '{}'::text[], 'high', 'updated',
      1.000, 0.940, 'auto', null, 'new_risk', 'Valuation concern reinforced'
    ),
    (
      'seed-pltr-03', 'PLTR', 'bullish', 'growth',
      'Commercial acceleration improves the setup.',
      'commercial acceleration is better than expected',
      '{}'::text[], array['commercial acceleration'], 'medium', 'new',
      1.000, 0.920, 'auto', null, 'stance_change', 'Commercial growth reversed the stance'
    ),
    (
      'seed-crdo-01', 'CRDO', 'bullish', 'growth',
      'Credo is gaining share in high-speed connectivity.',
      'gaining share as high-speed connectivity becomes a bottleneck',
      '{}'::text[], array['share gains'], 'high', 'new',
      1.000, 0.940, 'auto', null, 'first_mention', 'Initial share-gain thesis'
    ),
    (
      'seed-crdo-02', 'CRDO', 'bullish', 'growth',
      'Product breadth can support durable diversified growth.',
      'product breadth supports durable growth',
      array['customer concentration'], array['product breadth'], 'high', 'new',
      1.000, 0.930, 'auto', null, 'new_claim', 'Diversification thesis added'
    ),
    (
      'seed-crdo-03', 'CRDO', 'bullish', 'thesis',
      'Credo remains a high-conviction AI connectivity holding.',
      'high-conviction way to own AI connectivity growth',
      '{}'::text[], array['AI connectivity'], 'high', 'updated',
      1.000, 0.960, 'approved', null, 'repeat', 'High conviction maintained'
    ),
    (
      'seed-asts-01', 'ASTS', 'bullish', 'catalyst',
      'Commercial deployment offers asymmetric upside.',
      'asymmetric upside if commercial deployment stays on schedule',
      array['schedule'], array['commercial deployment'], 'medium', 'new',
      1.000, 0.900, 'auto', null, 'first_mention', 'Initial deployment thesis'
    ),
    (
      'seed-asts-02', 'ASTS', 'unknown', 'risk',
      'Launch timing cannot be assessed confidently.',
      'launch timing is difficult to underwrite',
      array['launch timing'], '{}'::text[], 'unknown', 'new',
      1.000, 0.420, 'needs_review', 'stance', 'unclear', 'Ticker is certain; stance needs review'
    ),
    (
      'seed-asts-03', 'ASTS', 'bearish', 'risk',
      'Financing risk has increased.',
      'financing risk has increased',
      array['financing'], '{}'::text[], 'medium', 'new',
      1.000, 0.910, 'auto', null, 'stance_change', 'Financing risk changed the view'
    )
)
insert into public.post_ticker_analyses (
  post_analysis_id,
  ticker,
  stance,
  claim_type,
  claim,
  evidence_from_post,
  risks_mentioned,
  catalysts_mentioned,
  conviction,
  novelty,
  ticker_confidence,
  stance_confidence,
  review_status,
  review_reason,
  change_type,
  change_summary,
  created_at
)
select
  post_analysis.id,
  seed_analysis.ticker,
  seed_analysis.stance,
  seed_analysis.claim_type,
  seed_analysis.claim,
  array[seed_analysis.evidence],
  seed_analysis.risks,
  seed_analysis.catalysts,
  seed_analysis.conviction,
  seed_analysis.novelty,
  seed_analysis.ticker_confidence,
  seed_analysis.stance_confidence,
  seed_analysis.review_status,
  seed_analysis.review_reason,
  seed_analysis.change_type,
  seed_analysis.change_summary,
  post.posted_at + interval '25 seconds'
from seed_analysis
join public.posts as post
  on post.x_post_id = seed_analysis.x_post_id
join public.post_analyses as post_analysis
  on post_analysis.post_id = post.id
join public.analysis_configs as config
  on config.id = post_analysis.analysis_config_id
  and config.is_active = true;

with ordered_analyses as (
  select
    ticker_analysis.id,
    ticker_analysis.change_type,
    lag(ticker_analysis.id) over (
      partition by ticker_analysis.ticker
      order by post.posted_at, ticker_analysis.id
    ) as previous_analysis_id
  from public.post_ticker_analyses as ticker_analysis
  join public.post_analyses as post_analysis
    on post_analysis.id = ticker_analysis.post_analysis_id
  join public.posts as post
    on post.id = post_analysis.post_id
)
update public.post_ticker_analyses as ticker_analysis
set compared_to_analysis_id = ordered_analyses.previous_analysis_id
from ordered_analyses
where ticker_analysis.id = ordered_analyses.id
  and ordered_analyses.change_type <> 'first_mention'
  and ordered_analyses.previous_analysis_id is not null;

insert into public.daily_reports (
  report_date,
  version,
  window_start,
  window_end,
  status,
  content_md,
  summary,
  source_post_ids,
  stats,
  analysis_config_id,
  created_at
)
select
  '2026-07-18',
  1,
  '2026-07-17T00:00:00Z',
  '2026-07-18T03:00:00Z',
  'ready',
  E'# Serenity Daily Brief\n\nCOHR remains constructive. PLTR improved, while ASTS financing risk increased.',
  'COHR stayed positive; PLTR turned positive; ASTS added financing risk.',
  array_agg(post.id order by post.posted_at),
  jsonb_build_object(
    'posts_analyzed', count(*),
    'tickers_mentioned', 4
  ),
  config.id,
  '2026-07-18T03:05:00Z'
from public.posts as post
cross join public.analysis_configs as config
where config.is_active = true
  and post.posted_at >= '2026-07-17T00:00:00Z'
  and post.posted_at < '2026-07-18T03:00:00Z'
group by config.id;

insert into public.pipeline_runs (
  id,
  job_name,
  status,
  started_at,
  finished_at,
  counts,
  metadata
)
values (
  '018f742a-f4c4-7cb3-9300-3a63b0974c58',
  'analyze_posts',
  'completed',
  '2026-07-18T03:00:00Z',
  '2026-07-18T03:01:12Z',
  '{"claimed": 20, "completed": 20, "failed": 0}'::jsonb,
  '{"seed": true, "worker": "local"}'::jsonb
);

commit;
