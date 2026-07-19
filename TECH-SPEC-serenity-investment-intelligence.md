# Technical Specification: Serenity Investment Intelligence

> 상태: 구현 기준 초안  
> 작성일: 2026-07-18  
> 관련 문서:
> - `PRD-serenity-investment-intelligence-agent.md`
> - `PRD-serenity-web-ui.md`
> - `UX-SPEC-serenity-investment-intelligence.md`

## 1. 기술 결정 요약

| 영역 | 선택 |
|---|---|
| Web framework | Next.js 16.2 App Router |
| UI runtime | React 19.2, TypeScript strict |
| Node runtime | Node.js 24 LTS |
| Package manager | pnpm 10 |
| Styling | Tailwind CSS 4.3 |
| UI primitives | shadcn/ui, Radix primitives |
| Table | TanStack Table v8 |
| Chart | Recharts |
| Icons | Lucide React |
| Database | Supabase Postgres |
| Database access | `@supabase/supabase-js`, `@supabase/ssr` |
| Auth | Supabase Auth email magic link |
| Backend jobs | Supabase Edge Functions, TypeScript/Deno |
| Scheduler | Supabase Cron with `pg_cron` and `pg_net` |
| Validation | Zod 4 |
| LLM | DeepSeek-V4-Flash, non-thinking mode |
| Notification | Telegram Bot API |
| Web hosting | Vercel |
| DB migrations | Supabase CLI SQL migrations |
| Unit tests | Vitest |
| Database tests | pgTAP through Supabase CLI |
| Edge Function tests | Deno test |
| End-to-end tests | Playwright |
| CI | GitHub Actions |

패키지 설치 시 preview, canary, beta 버전을 사용하지 않는다. 정확한 patch 버전은 `pnpm-lock.yaml`에 고정한다.

## 2. Architecture

### 2.1 전체 구성

```text
                         +-----------------------+
                         |    Rettiwt-API        |
                         +-----------+-----------+
                                     |
                                     v
+----------------+        +----------+-----------+
| Supabase Cron  +------->+ ingest-x-posts       |
+----------------+        +----------+-----------+
                                     |
                                     v
                         +-----------+-----------+
                         | Supabase Postgres     |
                         | posts, analysis_jobs  |
                         +-----------+-----------+
                                     |
+----------------+        +----------+-----------+        +------------------+
| Supabase Cron  +------->+ analyze-posts        +------->+ DeepSeek API     |
+----------------+        +----------+-----------+        +------------------+
                                     |
                                     v
                         +-----------+-----------+
                         | analyses, ticker view |
                         +-----------+-----------+
                                     |
                 +-------------------+-------------------+
                 |                                       |
                 v                                       v
       +---------+----------+                  +---------+----------+
       | generate-daily     |                  | Next.js on Vercel  |
       | Telegram notice    |                  | Supabase SSR       |
       +--------------------+                  +--------------------+
```

### 2.2 책임 분리

Vercel:

- 사용자 웹 화면
- Supabase Auth session 처리
- 사용자 권한으로 읽기
- Watchlist, feedback, 개인 메모 mutation

Supabase:

- 원문과 분석 데이터의 단일 원본
- Auth와 RLS
- X 게시글 수집
- LLM 분석
- 집계 view
- Daily Brief 생성
- Cron과 배치 실행 로그

DeepSeek:

- 게시글별 구조화 분석
- Daily Brief 상단 요약 문단

Telegram:

- Brief 생성 완료
- Watchlist 주요 변화
- 연속 작업 실패

### 2.3 의도적으로 제외한 구성

- 별도 Express/Fastify 서버
- Drizzle, Prisma 같은 ORM
- Vercel Cron
- Redis
- 외부 message queue
- embeddings와 vector database
- GraphQL
- 별도 microservice

DB schema는 Supabase migration SQL을 단일 원본으로 사용한다. ORM schema를 추가로 관리하지 않는다.

## 3. Repository Structure

```text
serenity-stock/
  src/
    app/
      (auth)/
        login/
          page.tsx
      (app)/
        layout.tsx
        tickers/
          page.tsx
          loading.tsx
          error.tsx
          [ticker]/
            page.tsx
            loading.tsx
            error.tsx
      auth/
        callback/
          route.ts
    components/
      layout/
      tickers/
        ticker-table.tsx
        ticker-filters.tsx
        sentiment-distribution.tsx
        stance-badge.tsx
        change-badge.tsx
        ticker-metrics.tsx
        opinion-timeline.tsx
      ui/
    lib/
      supabase/
        browser.ts
        server.ts
        middleware.ts
      queries/
        tickers.ts
        ticker-detail.ts
      actions/
        watchlist.ts
        feedback.ts
        research.ts
      domain/
        sentiment.ts
        ticker.ts
      env.ts
    types/
      database.ts
      domain.ts
  supabase/
    config.toml
    migrations/
    seed.sql
    functions/
      _shared/
        db.ts
        errors.ts
        http.ts
        llm/
          index.ts
          deepseek.ts
        schemas/
          analyze-post.ts
        x-client.ts
        telegram.ts
      ingest-x-posts/
        index.ts
      analyze-posts/
        index.ts
      generate-daily-brief/
        index.ts
      tests/
        analyze-post-test.ts
        daily-brief-test.ts
    tests/
      database/
        schema.test.sql
        rls.test.sql
        ticker-overview.test.sql
        analysis-jobs.test.sql
  prompts/
    analyze-post-v1.md
    daily-summary-v1.md
  fixtures/
    posts.json
    golden-posts.json
  tests/
    unit/
    e2e/
  .env.example
  package.json
  pnpm-lock.yaml
  tsconfig.json
  next.config.ts
```

단일 repository와 단일 `package.json`을 사용한다.

## 4. Runtime and Version Policy

### 4.1 Web

- Next.js `16.2.x`
- React `19.2.x`
- Node.js `24.x` LTS
- TypeScript latest stable compatible with Next.js 16.2
- Tailwind CSS `4.3.x`

Next.js 16.3 preview 기능은 사용하지 않는다.

### 4.2 Supabase Edge Functions

- Supabase Edge Runtime
- TypeScript
- Deno-compatible standard APIs
- `npm:` import는 필요한 라이브러리에만 사용
- Node 전용 API와 native binary 의존성은 사용하지 않는다.

Edge Function은 Free plan의 150초 wall-clock limit 안에서 종료되도록 설계한다.

### 4.3 Dependency policy

- runtime dependency를 추가할 때 사용 이유를 PR에 기록한다.
- 동일 기능 라이브러리를 두 개 이상 사용하지 않는다.
- package version은 lockfile에 고정한다.
- major upgrade는 별도 작업으로 처리한다.
- 공급망 위험을 줄이기 위해 pnpm의 script 허용 목록을 사용한다.

## 5. Database Design

### 5.1 기본 규칙

- table과 column 이름은 `snake_case` 소문자
- ID는 `bigint generated always as identity`
- 시간은 `timestamptz`
- 문자열은 길이 제한이 꼭 필요한 경우 외에는 `text`
- 상태 값은 `text + check constraint`
- 금액은 `numeric`
- raw API와 LLM 응답만 `jsonb`
- 모든 foreign key column에 index 생성
- public schema table은 모두 RLS 활성화

### 5.2 핵심 테이블

#### `tickers`

```text
ticker text primary key
company_name text not null
exchange text
active boolean not null default true
created_at timestamptz not null default now()
updated_at timestamptz not null default now()
```

#### `ticker_aliases`

```text
id bigint identity primary key
ticker text not null references tickers(ticker)
alias text not null
alias_type text not null
source text not null
active boolean not null default true
created_at timestamptz not null default now()

unique (lower(alias), ticker)
```

#### `posts`

```text
id bigint identity primary key
x_post_id text not null unique
author_id text not null
text text not null
url text not null
post_type text not null
conversation_id text
referenced_post_ids text[] not null default '{}'
posted_at timestamptz not null
metrics jsonb not null default '{}'
raw jsonb not null
inserted_at timestamptz not null default now()
```

`post_type` check:

```text
original, reply, quote, repost
```

#### `analysis_configs`

활성 LLM 분석 버전을 명시한다.

```text
id bigint identity primary key
provider text not null
model text not null
prompt_version text not null
schema_version text not null
is_active boolean not null default false
created_at timestamptz not null default now()

unique (provider, model, prompt_version, schema_version)
```

활성 config는 하나만 허용한다.

```sql
create unique index analysis_configs_one_active_idx
on analysis_configs ((is_active))
where is_active = true;
```

#### `analysis_jobs`

LLM 작업의 재시도와 중복 실행을 관리한다.

```text
id bigint identity primary key
post_id bigint not null references posts(id) on delete cascade
analysis_config_id bigint not null references analysis_configs(id)
status text not null default 'pending'
attempts integer not null default 0
available_at timestamptz not null default now()
locked_at timestamptz
locked_by uuid
last_error jsonb
created_at timestamptz not null default now()
updated_at timestamptz not null default now()

unique (post_id, analysis_config_id)
```

`status` check:

```text
pending, processing, completed, failed
```

#### `post_analyses`

```text
id bigint identity primary key
post_id bigint not null references posts(id) on delete cascade
analysis_config_id bigint not null references analysis_configs(id)
status text not null
relevance text not null
summary_ko text
themes text[] not null default '{}'
is_noise boolean not null default false
input_tokens integer
output_tokens integer
estimated_cost_usd numeric(12, 8)
raw_response jsonb not null
created_at timestamptz not null default now()

unique (post_id, analysis_config_id)
```

#### `post_ticker_analyses`

```text
id bigint identity primary key
post_analysis_id bigint not null references post_analyses(id) on delete cascade
ticker text not null references tickers(ticker)
stance text not null
claim_type text not null
claim text
evidence_from_post text[] not null default '{}'
risks_mentioned text[] not null default '{}'
catalysts_mentioned text[] not null default '{}'
conviction text not null
novelty text not null
ticker_confidence numeric(4, 3) not null
stance_confidence numeric(4, 3) not null
review_status text not null default 'auto'
review_reason text
change_type text
change_summary text
compared_to_analysis_id bigint references post_ticker_analyses(id)
created_at timestamptz not null default now()

unique (post_analysis_id, ticker)
```

confidence check:

```text
0 <= ticker_confidence <= 1
0 <= stance_confidence <= 1
```

#### `watchlist`

```text
user_id uuid not null references auth.users(id) on delete cascade
ticker text not null references tickers(ticker)
priority text not null default 'medium'
note text
research_status text not null default 'unreviewed'
active boolean not null default true
created_at timestamptz not null default now()
updated_at timestamptz not null default now()

primary key (user_id, ticker)
```

#### `analysis_feedback`

```text
id bigint identity primary key
user_id uuid not null references auth.users(id) on delete cascade
post_ticker_analysis_id bigint not null
  references post_ticker_analyses(id) on delete cascade
rating text not null
error_type text
note text
created_at timestamptz not null default now()
updated_at timestamptz not null default now()

unique (user_id, post_ticker_analysis_id)
```

#### `daily_reports`

```text
id bigint identity primary key
report_date date not null
version integer not null
window_start timestamptz not null
window_end timestamptz not null
status text not null
content_md text not null
summary text
source_post_ids bigint[] not null default '{}'
stats jsonb not null default '{}'
analysis_config_id bigint references analysis_configs(id)
created_at timestamptz not null default now()

unique (report_date, version)
```

#### `pipeline_runs`

```text
id uuid primary key
job_name text not null
status text not null
started_at timestamptz not null default now()
finished_at timestamptz
counts jsonb not null default '{}'
error jsonb
metadata jsonb not null default '{}'
```

### 5.3 Views

#### `ticker_overview`

- `security_invoker = true`
- 활성 `analysis_configs`만 집계
- ticker/post 조합을 한 번만 집계
- repost와 noise 제외
- ticker confidence 기준을 통과한 항목만 총 언급에 포함
- stance confidence 기준을 통과한 항목만 성향 집계
- `watchlist.user_id = (select auth.uid())`
- count와 cumulative sentiment를 DB에서 계산

초기에는 일반 view를 사용한다. 전체 `post_ticker_analyses`가 100,000행을 넘거나 query p95가 500ms를 넘으면 materialized view를 검토한다.

#### `ticker_opinion_timeline`

- `security_invoker = true`
- 현재 로그인 사용자의 feedback을 join
- `posted_at desc, post_ticker_analysis_id desc`
- cursor pagination에 필요한 두 값을 노출

### 5.4 Required indexes

```text
posts(posted_at desc, id desc)
posts(conversation_id)

ticker_aliases(lower(alias)) where active = true
ticker_aliases(ticker)

analysis_jobs(status, available_at, id)
  where status in ('pending', 'failed')
analysis_jobs(locked_at, id)
  where status = 'processing'
analysis_jobs(post_id, analysis_config_id)
analysis_jobs(analysis_config_id)

post_analyses(post_id, analysis_config_id)
post_analyses(analysis_config_id)

post_ticker_analyses(ticker, post_analysis_id)
post_ticker_analyses(post_analysis_id)
post_ticker_analyses(compared_to_analysis_id)
post_ticker_analyses(ticker, stance, created_at desc)
  where review_status <> 'rejected'

watchlist(user_id, active, ticker)
watchlist(ticker)
analysis_feedback(user_id, post_ticker_analysis_id)
analysis_feedback(post_ticker_analysis_id)

daily_reports(report_date desc, version desc)
daily_reports(analysis_config_id)
pipeline_runs(job_name, started_at desc)
```

실제 index 채택은 `EXPLAIN (ANALYZE, BUFFERS)`로 확인한다. 사용되지 않는 중복 index는 만들지 않는다.

### 5.5 Analysis job claim

여러 worker가 동시에 실행되어도 같은 작업을 처리하지 않도록 Postgres 함수에서 원자적으로 claim한다.

```text
claim_analysis_jobs(worker_id uuid, batch_size integer)
```

처리 규칙:

1. `pending` 또는 재시도 가능한 `failed` 작업을 선택한다.
2. `available_at <= now()` 조건을 적용한다.
3. `for update skip locked`를 사용한다.
4. 선택한 작업을 `processing`으로 바꾼다.
5. `attempts`를 1 증가시킨다.
6. 선택한 행을 반환한다.

함수는 `security invoker`로 만들고 `anon`, `authenticated`의 execute 권한을 revoke한다. Edge Function의 service role만 호출한다.

5분 이상 `processing` 상태이고 `locked_at`이 갱신되지 않은 작업은 worker 중단으로 간주한다. 다음 claim에서 해당 작업을 다시 가져올 수 있어야 한다.

신규 게시글 저장과 job 생성 사이에 오류가 발생해도 복구할 수 있도록 다음 함수도 제공한다.

```text
enqueue_missing_analysis_jobs(batch_size integer)
```

활성 analysis config에 대한 job이 없는 non-repost 게시글을 찾아 `on conflict do nothing`으로 job을 생성한다. `ingest-x-posts`의 마지막 단계와 `analyze-posts`의 첫 단계에서 실행한다.

### 5.6 Analysis result transaction

분석 저장과 job 상태 변경은 Postgres 함수 한 번으로 처리한다.

```text
complete_analysis_job(
  job_id bigint,
  worker_id uuid,
  analysis_payload jsonb
)
```

함수 처리:

1. job이 현재 worker에게 lock되어 있는지 확인한다.
2. `post_analyses`를 생성한다.
3. `post_ticker_analyses`를 bulk insert한다.
4. job을 `completed`로 변경한다.
5. 하나라도 실패하면 전체 transaction을 rollback한다.

실패 처리:

```text
fail_analysis_job(
  job_id bigint,
  worker_id uuid,
  error_payload jsonb,
  next_available_at timestamptz
)
```

두 함수 모두 `security invoker`로 만들고 service role에만 execute 권한을 준다. `analysis_payload`는 Edge Function의 Zod 검증을 통과해야 하며, DB constraint로도 허용 값을 다시 검사한다.

### 5.7 Upsert policy

- X 게시글: `x_post_id` 기준 `on conflict do nothing`
- analysis job: `(post_id, analysis_config_id)` 기준 `on conflict do nothing`
- Watchlist: `(user_id, ticker)` 기준 `on conflict do update`
- feedback: `(user_id, post_ticker_analysis_id)` 기준 `on conflict do update`

SELECT 후 INSERT하는 패턴은 사용하지 않는다.

## 6. Authentication and RLS

> **로컬 MVP 결정 (2026-07-18):** Auth는 현재 구현 범위에서 제외한다.
> Next.js 서버가 `SUPABASE_SECRET_KEY`로 Hosted Supabase를 조회하며 브라우저에는
> 키와 Supabase client를 노출하지 않는다. 이 모드는 신뢰할 수 있는 로컬
> 컴퓨터에서만 사용한다. 외부 배포 단계에서는 아래의 email magic link,
> cookie session, 사용자별 RLS 설계를 다시 적용한다.

### 6.1 Auth

- Supabase Auth email magic link
- public signup 비활성화
- 초기 사용자는 Supabase Dashboard에서 생성
- 인증 callback: `/auth/callback`
- session cookie는 `@supabase/ssr`로 관리
- server에서 사용자 확인 시 검증된 auth API를 사용

### 6.2 Client keys

브라우저와 Vercel:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`

금지:

- `SUPABASE_SERVICE_ROLE_KEY`
- Rettiwt API key(X 세션 쿠키 인코딩 값)
- DeepSeek API key
- Telegram token

service role은 Supabase Edge Function에서만 사용한다.

### 6.3 RLS policy

Source data:

- `tickers`, `ticker_aliases`, `posts`, `analysis_configs`, `post_analyses`, `post_ticker_analyses`, `daily_reports`
- `authenticated` role에 SELECT만 허용
- 사용자 UI에서 INSERT, UPDATE, DELETE 금지

User data:

- `watchlist`, `analysis_feedback`
- `(select auth.uid()) = user_id` 조건
- SELECT, INSERT, UPDATE, DELETE 각각 policy 작성
- UPDATE에는 SELECT policy도 필요
- `user_id` index 필수

Internal data:

- `analysis_jobs`, `pipeline_runs`
- RLS 활성화
- 브라우저 role policy 없음
- service role만 접근

View:

- 모든 exposed view에 `security_invoker = true`
- owner 권한으로 RLS를 우회하는 view 금지

### 6.4 RLS tests

pgTAP으로 검증한다.

- 익명 사용자는 모든 제품 데이터 조회 불가
- 인증 사용자는 source data 조회 가능
- 사용자는 자신의 Watchlist와 feedback만 조회/수정 가능
- 다른 사용자의 user data 조회/수정 불가
- 인증 사용자는 분석 원본을 수정할 수 없음
- view를 통해 다른 사용자 Watchlist가 노출되지 않음

## 7. Edge Functions

> **로컬 MVP 결정 (2026-07-18):** 최초 검증은 Edge Function과 Cron 대신
> Next.js의 로컬 전용 `POST /api/sync`에서 같은 파이프라인을 수동 실행한다.
> 이 route는 `localhost`만 허용하고, `RETTIWT_API_KEY`,
> `DEEPSEEK_API_KEY`, `SUPABASE_SECRET_KEY`를 서버에서만 사용한다.
> 자동 실행이 필요해지는 배포 단계에서 아래의 세 Edge Function과 Cron으로
> 실행 위치를 옮긴다.

### 7.1 공통 규칙

- 모든 함수는 `pipeline_runs`를 생성한다.
- 성공, 부분 성공, 실패를 명시한다.
- 입력과 외부 API 응답에 timeout을 둔다.
- 재실행 가능한 idempotent 작업으로 만든다.
- 로그에 API key, bearer token, 전체 raw payload를 출력하지 않는다.
- 에러는 `code`, `message`, `retryable`, `context` 형태로 저장한다.
- 한 함수가 다른 Edge Function을 호출하지 않는다.
- 공통 로직은 `_shared`에서 import한다.

### 7.2 `ingest-x-posts`

책임:

- Rettiwt에서 Serenity의 신규 게시글 수집
- posts upsert
- 활성 analysis config의 analysis job 생성

입력:

```json
{
  "mode": "scheduled",
  "maxResults": 100
}
```

처리:

1. 최근 저장된 `x_post_id`를 cursor로 조회한다.
2. Rettiwt user replies timeline(게시물 및 답글)을 호출하고 저장된 `since_id`보다 최신인 글만 남긴다.
3. pagination된 응답을 최대 설정 건수까지 가져온다.
4. 게시글을 `x_post_id` 기준 upsert한다.
5. repost를 제외한 신규 게시글에 analysis job을 생성한다.
6. `enqueue_missing_analysis_jobs`로 누락된 job을 복구한다.
7. fetched, inserted, existing, jobsCreated 수를 기록한다.

timeout:

- Rettiwt request 20초

retry:

- Rettiwt가 재시도 가능한 요청을 최대 2회 재시도한다.
- 인증 실패와 저장 cursor보다 오래된 timeline 응답은 즉시 실패한다.

### 7.3 `analyze-posts`

책임:

- pending analysis job claim
- DeepSeek 호출
- Zod 검증
- 분석과 종목별 결과 저장

처음에 `enqueue_missing_analysis_jobs`를 실행해 수집 중 누락된 job을 복구한다.

실행 제한:

- 한 실행에서 최대 4개 job
- 동시 LLM 호출 최대 2개
- LLM request timeout 25초
- JSON 또는 schema 실패 시 1회 재시도
- Edge Function 전체 soft budget 100초

성공:

- `complete_analysis_job` RPC로 분석과 job 상태를 transaction 단위로 저장

실패:

```text
attempts < 3:
  fail_analysis_job RPC
  status = failed
  available_at = next retry time

attempts >= 3:
  fail_analysis_job RPC
  status = failed
  available_at = infinity
  Telegram alert 대상
```

backoff:

```text
1차: 5분
2차: 30분
3차: 수동 검토
```

### 7.4 `generate-daily-brief`

책임:

- KST 기준 전날 08:00부터 당일 08:00까지 집계
- deterministic Markdown 생성
- 선택적 LLM 요약 생성
- daily report 저장
- Telegram 알림

window:

```text
window_start inclusive
window_end exclusive
```

처리:

1. window 내 게시글과 완료 분석 수를 확인한다.
2. pending/failed 분석 수를 확인한다.
3. SQL 결과로 표, 수치, 링크를 생성한다.
4. 완료된 구조화 분석만 DeepSeek 요약 입력으로 사용한다.
5. 요약 실패 시 본문만 저장한다.
6. 미분석 글이 있으면 report status를 `partial`로 저장한다.
7. Telegram에 완료 또는 부분 완료 상태를 알린다.

### 7.5 Cron

Supabase Cron은 UTC로 설정한다.

| Job | Cron UTC | KST | 목적 |
|---|---|---|---|
| ingest-regular | `0 */3 * * *` | 3시간 간격 | 일반 수집 |
| ingest-before-report | `0 23 * * *` | 08:00 | 보고서 cutoff 수집 |
| analyze-pending | `*/5 * * * *` | 5분 간격 | pending 분석 |
| daily-brief | `17 23 * * *` | 08:17 | Daily Brief |

보고서의 데이터 cutoff는 08:00 KST다. 08:00 이후 게시글은 다음 보고서에 포함한다.

Cron에서 Edge Function을 호출할 때 project URL과 publishable key는 Supabase Vault에 저장한다.

### 7.6 Manual invocation

각 함수는 Supabase Dashboard와 CLI에서 수동 실행할 수 있어야 한다.

수동 실행은 scheduled 실행과 동일한 idempotency 규칙을 적용한다.

## 8. LLM Integration

### 8.1 Provider

기본:

```text
provider = deepseek
model = deepseek-v4-flash
mode = non-thinking
response_format = json_object
```

Daily Brief 품질이 부족한 경우에만 summary 호출을 `deepseek-v4-pro`로 분리할 수 있다.

### 8.2 API client

별도 agent framework를 사용하지 않는다.

- native `fetch`
- OpenAI-compatible request format
- provider adapter
- Zod runtime validation
- timeout via `AbortSignal.timeout`

interface:

```ts
interface LlmProvider {
  analyzePost(input: AnalyzePostInput): Promise<AnalyzePostResult>;
  summarizeDaily(input: DailySummaryInput): Promise<DailySummaryResult>;
}
```

### 8.3 Prompt inputs

게시글 분석:

- 현재 게시글 원문
- 게시글 타입
- 참조 게시글 원문이 있으면 함께 제공
- 규칙 기반 ticker 후보
- 같은 ticker의 최근 유효 분석 최대 5개
- 허용된 ticker master와 alias 결과

제공하지 않는 정보:

- 실시간 주가
- 사용자 보유 종목
- 매수/매도 판단
- 원문과 무관한 외부 뉴스

### 8.4 Output validation

1. API가 valid JSON을 반환해야 한다.
2. Zod schema를 통과해야 한다.
3. 모든 ticker는 canonical `tickers`와 연결되거나 검토 상태여야 한다.
4. `evidence_from_post`는 원문 또는 제공된 참조 원문에 존재해야 한다.
5. confidence는 0~1 범위여야 한다.
6. 실패 시 correction prompt로 한 번 재시도한다.
7. 두 번째 실패는 job failure로 저장한다.

### 8.5 Cost tracking

각 호출에서 저장:

- provider
- model
- prompt version
- schema version
- input tokens
- output tokens
- estimated USD cost
- latency ms

월 사용량은 SQL로 합산한다. 별도 비용 분석 서비스는 사용하지 않는다.

## 9. Web Application

### 9.1 Rendering

- `/tickers`: Server Component에서 첫 페이지 조회
- `/tickers/[ticker]`: Server Component에서 header와 초기 timeline 조회
- filter, sort, cursor는 URL search params 사용
- interactive table과 filter control만 Client Component
- 모든 데이터 mutation은 Server Action

### 9.2 Data access

사용자 페이지:

- cookie session 기반 Supabase server client
- publishable key
- RLS 적용

금지:

- service role을 사용하는 Next.js query
- 브라우저에서 raw source table 전체 download
- 클라이언트에서 total/sentiment 재계산

### 9.3 Pagination

offset pagination을 사용하지 않는다.

Overview cursor:

```text
(sort_value, ticker)
```

Timeline cursor:

```text
(posted_at, post_ticker_analysis_id)
```

cursor는 URL-safe base64 JSON으로 encode한다. cursor 값은 server에서 schema validation한다.

### 9.4 Cache

- 인증된 사용자 데이터에 public cache를 사용하지 않는다.
- Server Component query는 기본적으로 request 단위 fresh data를 사용한다.
- Watchlist와 feedback mutation 후 route를 revalidate한다.
- 브라우저의 장기 local storage에 분석 원문을 저장하지 않는다.

### 9.5 Error boundaries

- route마다 `error.tsx`
- table과 detail에 `loading.tsx`
- Supabase query 실패 시 마지막 갱신 상태를 함께 표시
- 사용자에게 database error detail을 노출하지 않는다.

## 10. Environment Variables

### 10.1 Vercel

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
NEXT_PUBLIC_APP_URL=
```

Vercel에는 service role, X, DeepSeek, Telegram secret를 넣지 않는다.

### 10.2 Supabase Edge Function secrets

```env
RETTIWT_API_KEY=

LLM_PROVIDER=deepseek
LLM_MODEL=deepseek-v4-flash
LLM_API_KEY=
LLM_BASE_URL=https://api.deepseek.com

TELEGRAM_BOT_TOKEN=
TELEGRAM_CHAT_ID=
```

추적 대상은 `analyst_profiles`의 활성 레코드로 관리한다. Edge Function은
username으로 X user ID를 최초 조회하고 `ingestion_cursors.user_id`에
캐시하므로 계정별 secret를 추가하지 않는다.

Supabase가 기본 제공하는 project URL과 service role secret를 재정의하지 않는다.

### 10.3 Local

- `.env.local`: Next.js
- `supabase/functions/.env`: Edge Functions
- 두 파일 모두 gitignore
- `.env.example`에는 key 이름만 저장

## 11. Testing

### 11.1 Unit tests

Vitest:

- cumulative sentiment threshold
- stance mapping
- importance score
- cursor encode/decode
- filter parsing
- KST report window
- Rettiwt payload normalization

### 11.2 Database tests

pgTAP:

- constraints와 foreign keys
- analysis config 하나만 active
- 동일 post/ticker 중복 방지
- total mention 집계
- sentiment count
- repost/noise/rejected 제외
- stance confidence와 ticker confidence 분리
- RLS와 security invoker view
- analysis job claim과 retry

### 11.3 Edge Function tests

Deno test:

- Rettiwt pagination mock
- stale timeline과 반복 cursor 처리
- DeepSeek timeout
- invalid JSON retry
- schema failure retry
- partial Daily Brief
- idempotent re-run

### 11.4 Component tests

Testing Library:

- sentiment distribution text와 accessible label
- Row keyboard navigation
- Watchlist toggle event propagation
- filter URL state
- loading/empty/error state

### 11.5 E2E

Playwright:

- magic link 테스트 session으로 로그인
- Overview 조회, 정렬, 필터
- Row에서 detail 이동
- X 링크 target 확인
- Watchlist toggle
- feedback 저장
- desktop 1440x900
- mobile 390x844

### 11.6 Required verification

merge 전에 실행:

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm supabase:test
pnpm test:e2e
pnpm build
```

## 12. Local Development

### 12.1 Prerequisites

- Node.js 24 LTS
- pnpm 10
- Docker-compatible runtime
- Supabase CLI project dependency
- Deno for editor support and function tests

### 12.2 Commands

```bash
pnpm install
pnpm supabase start
pnpm db:reset
pnpm dev
```

Edge Functions:

```bash
pnpm supabase functions serve --env-file supabase/functions/.env
```

Type generation:

```bash
pnpm supabase gen types --lang typescript --local
```

생성된 타입은 `src/types/database.ts`에 반영한다. CI에서 migration과 generated type의 불일치를 검사한다.

## 13. CI/CD

### 13.1 Pull request

GitHub Actions:

1. pnpm install with frozen lockfile
2. lint
3. typecheck
4. unit/component tests
5. Supabase local start
6. database reset and pgTAP
7. Edge Function tests
8. Next.js build
9. Playwright smoke test

### 13.2 Database deploy

순서:

1. local migration 재실행 검증
2. pgTAP
3. Supabase DB lint
4. migration review
5. remote migration push
6. generated DB type 갱신
7. database advisor 확인

Dashboard에서 직접 schema를 변경하지 않는다.

### 13.3 Edge Function deploy

- DB migration 성공 후 배포
- `_shared` 변경 시 세 함수 모두 검증
- 함수별 독립 배포
- 배포 후 수동 smoke invocation

### 13.4 Web deploy

- Vercel Git integration
- PR preview deployment
- main branch production deployment
- Supabase migration과 Edge Function이 먼저 배포된 후 web 배포

## 14. Observability

### 14.1 Initial

- Supabase Edge Function logs
- Supabase Cron run history
- `pipeline_runs`
- Vercel runtime logs
- Telegram failure alert

### 14.2 Structured run metrics

`pipeline_runs.counts`:

```json
{
  "fetched": 12,
  "inserted": 4,
  "jobsCreated": 4,
  "claimed": 4,
  "completed": 3,
  "failed": 1
}
```

### 14.3 Alert policy

즉시:

- 인증 오류
- DB migration 오류
- 3회 재시도 후 LLM job 실패

연속 3회 실패:

- X 수집
- Daily Brief 생성

알림에는 secret, raw token, 전체 stack trace를 포함하지 않는다.

Sentry는 초기 범위에서 제외한다. 로그만으로 원인을 찾기 어려울 때 추가한다.

## 15. Performance and Capacity

초기 가정:

- 하루 X 게시글 100개 이하
- ticker 500개 이하
- post_ticker_analyses 100,000행 이하
- 동시 사용자 5명 이하

목표:

- Overview query p95 500ms 이하
- detail initial query p95 500ms 이하
- 첫 화면 주요 콘텐츠 2초 이하
- analysis worker 실행 100초 이하

확장 조건:

| 조건 | 대응 |
|---|---|
| Overview p95 > 500ms | query plan, index, materialized view 검토 |
| 분석 backlog > 100 | batch/concurrency 조정 또는 Supabase Queues 검토 |
| Edge Function timeout 반복 | worker 분할 또는 외부 job runner 검토 |
| 사용자 > 5 | source data와 user data 접근 패턴 재검토 |

## 16. Security Checklist

- [ ] public schema 모든 table RLS 활성화
- [ ] exposed view `security_invoker = true`
- [ ] user metadata를 권한 판정에 사용하지 않음
- [ ] service role이 browser/Vercel에 없음
- [ ] public signup 비활성화
- [ ] user-owned table은 `user_id` index 보유
- [ ] UPDATE table에 SELECT policy 존재
- [ ] security definer function을 exposed schema에 두지 않음
- [ ] 원문과 사용자 메모 HTML escape
- [ ] 외부 링크 `noopener noreferrer`
- [ ] 로그에서 secret과 raw authorization header 제거
- [ ] RLS pgTAP 통과

## 17. 기술 결정 기록

### ADR-001: Supabase SQL migration, ORM 없음

결정:

- Supabase migration SQL과 generated TypeScript type 사용

이유:

- schema source가 하나다.
- view, RLS, pg_cron, Postgres 함수 관리가 쉽다.
- 현재 query 복잡도에서 ORM의 이점이 작다.

### ADR-002: DB-backed analysis job

결정:

- `analysis_jobs`와 `for update skip locked` 사용

이유:

- 별도 queue 서비스가 필요 없다.
- 재시도와 실패 상태가 DB에 남는다.
- 현재 처리량에 충분하다.

### ADR-003: Vercel은 Web만 담당

결정:

- scheduler와 LLM batch를 Vercel에 두지 않는다.

이유:

- 데이터와 작업 로그를 Supabase에 모은다.
- Cron의 실행 환경이 둘로 나뉘지 않는다.

### ADR-004: Server-side aggregation

결정:

- total mentions와 sentiment는 Postgres view에서 계산

이유:

- Overview와 detail이 같은 값을 사용한다.
- 브라우저 구현에 따라 수치가 달라지지 않는다.
- 집계 규칙을 SQL test로 고정할 수 있다.

### ADR-005: DeepSeek direct adapter

결정:

- agent framework 없이 native fetch와 Zod 사용

이유:

- 호출 형태가 단순하다.
- dependency와 provider 결합을 줄인다.
- 모델 교체가 adapter 하나로 제한된다.

## 18. 구현 순서

### Step 1: Foundation

- Next.js 16.2 생성
- Supabase local init
- Auth
- migration과 seed
- generated types

### Step 2: Data pipeline

- X client
- ingest function
- analysis jobs
- DeepSeek adapter
- analyze function
- Cron

### Step 3: Aggregation

- ticker views
- count/sentiment pgTAP
- Daily Brief

### Step 4: Web Overview

- Ticker table
- filters, sort, cursor
- Watchlist

### Step 5: Ticker Detail

- metrics
- opinion timeline
- source links
- feedback와 personal research

### Step 6: Verification

- full test suite
- RLS audit
- query plans
- Vercel and Supabase deployment

## 19. 공식 참고 문서

- Next.js 16.2: https://nextjs.org/blog/next-16-2
- Next.js on Vercel: https://vercel.com/docs/frameworks/full-stack/nextjs
- Node.js releases: https://nodejs.org/en/about/previous-releases
- Tailwind CSS: https://tailwindcss.com/blog
- Supabase local development: https://supabase.com/docs/guides/local-development/cli/getting-started
- Supabase Edge Functions: https://supabase.com/docs/guides/functions
- Supabase Edge Function limits: https://supabase.com/docs/guides/functions/limits
- Supabase scheduled functions: https://supabase.com/docs/guides/functions/schedule-functions
- Supabase Cron: https://supabase.com/docs/guides/cron
- Supabase database tests: https://supabase.com/docs/guides/local-development/cli/testing-and-linting
- Supabase RLS: https://supabase.com/docs/guides/database/postgres/row-level-security
- DeepSeek pricing and models: https://api-docs.deepseek.com/quick_start/pricing
- DeepSeek JSON Output: https://api-docs.deepseek.com/guides/json_mode
