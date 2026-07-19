# Public Investor Intelligence

성장주 분석가들의 공개 X 게시글에서 종목별 언급, 누적 관점,
최근 의견과 변화 근거를 확인하고 분석가별 관점을 비교하는 개인용 투자
리서치 도구입니다. 현재 Serenity, Shay Boloor, Beth Kindig,
App Economy Insights, Brian Stoffel을 추적합니다.

## Stack

- Next.js 16 App Router
- React 19 and TypeScript
- Tailwind CSS 4
- Supabase Postgres, Auth, RLS
- Recharts and Lucide
- Vitest and Playwright

## Run

```bash
pnpm install
pnpm dev
```

브라우저에서 `http://localhost:3000/tickers`를 엽니다.

필수 환경 변수가 없으면 내장 fixture를 사용합니다. 아래 변수를 설정하면
Hosted Supabase에 활성 분석가의 X 게시글을 수집하고 DeepSeek로 분석할 수
있습니다.

```bash
cp .env.example .env.local
```

```text
SUPABASE_URL=https://YOUR_PROJECT.supabase.co
SUPABASE_SECRET_KEY=sb_secret_REPLACE_ME
SERENITY_CRON_SECRET=GENERATE_A_LONG_RANDOM_SECRET
RETTIWT_API_KEY=REPLACE_ME
TELEGRAM_BOT_TOKEN=REPLACE_ME
TELEGRAM_CHAT_ID=REPLACE_ME
DEEPSEEK_API_KEY=REPLACE_ME
DEEPSEEK_MODEL=deepseek-v4-flash
SERENITY_INGEST_MAX_POSTS=1000
SERENITY_SYNC_MAX_POSTS=100
SERENITY_ANALYSIS_BATCH_SIZE=25
SERENITY_BACKFILL_DAYS=60
SERENITY_BACKFILL_MAX_POSTS=700
```

`SUPABASE_SECRET_KEY`는 Supabase Dashboard의 **Settings → API Keys → Secret
keys**에서 생성합니다. 이 값은 Next.js 서버에서만 읽으며 브라우저 번들에는
포함되지 않습니다. `.env.local`을 커밋하거나 키를 `NEXT_PUBLIC_` 변수에
넣지 마세요.

`RETTIWT_API_KEY`는 유료 X API 키가 아니라 로그인된 X 계정의
`auth_token`, `ct0`, `twid` 쿠키를 Rettiwt 형식으로 인코딩한 값입니다.
[Rettiwt 인증 안내](https://github.com/Rishikant181/Rettiwt-API#authentication)에
따라 생성하고, 계정 전체 세션과 같은 수준의 비밀값으로 취급하세요. 개인
주계정 대신 읽기 전용 수집 계정을 사용하고 로그아웃·비밀번호 변경 후에는
키를 다시 발급해야 합니다. 키 없는 guest 모드는 일부 계정의 최신 타임라인을
누락할 수 있어 이 프로젝트에서는 사용하지 않습니다.
로컬에서는 `RETTIWT_API_KEY` 대신 `X_AUTH_TOKEN`, `X_CT0`, `X_TWID` 세 값을
설정해도 실행 시 메모리에서 같은 키를 생성합니다.

Telegram 값을 설정하면 신규 게시물이 저장된 성공 실행, 모든 수집 실패,
실패 후 첫 정상 복구를 봇으로 알립니다. 신규 게시물이 없는 일반 정상 실행은
메시지를 보내지 않으며, Telegram 전송 실패가 원문 수집을 실패시키지는
않습니다.

Steady-state 수집과 분석은 Supabase Edge Functions에서 실행됩니다. 앱 상단의
**동기화** 버튼은 hosted `ingest-x`와 `analyze-posts` 함수를 순서대로 한 번
호출합니다.

1. `analyst_profiles`의 활성 분석가를 읽고 Rettiwt로 X user ID를 자동 조회
2. 최초 조회한 user ID는 분석가별 cursor에 저장하고, 해당 ID가 실제 작성한
   게시물만 보관한 뒤 `since_id`로 신규 글만 수집
3. Rettiwt timeline pagination을 따라가며 `x_post_id` 기준으로 중복 없이 저장
4. 누락된 `analysis_jobs` 생성 및 claim
5. DeepSeek `deepseek-v4-flash` JSON 모드로 글-종목별 분석
6. ticker, stance, claim, 근거, 리스크, catalyst, confidence 저장
7. 분석가별 최초 언급, 최근 관점, 관점 변화와 원문 링크 집계
8. 종목 overview와 분석가별 비교 화면 갱신

계정별 `analysis_post_types`로 분석 대상을 제한할 수 있습니다. App Economy
Insights와 Brian Stoffel은 게시물은 모두 보관하지만 `original`만 분석합니다.

DeepSeek 출력은 Zod schema와 DB constraint를 모두 통과해야 저장됩니다.
원문에 실제로 존재하지 않는 evidence는 제거하고 해당 분석을
`needs_review`로 표시합니다. JSON 구조 자체가 잘못된 출력은 한 번 교정
재시도한 뒤 실패 job으로 남깁니다. 로컬 기본 수집 한도는 100개이며
10~500 사이에서 조정할 수 있습니다.
예약 분석은 최대 10개씩 claim하고 3개 동시 처리합니다. 로컬 백필 분석은
기존 설정값인 25개 배치를 사용합니다.

### Historical backfill

Cron을 켜기 전에 최근 60일 원문을 수집하려면 개발 서버가 실행 중인
상태에서 아래 요청을 한 번 실행합니다.

```bash
curl -X POST http://127.0.0.1:3000/api/backfill
```

과거 글은 원문만 저장되며 자동 분석되지 않습니다. 저장된 글을 X에
재조회 없이 DeepSeek로 한 배치씩 분석하려면 다음 명령을 반복 실행합니다.

```bash
curl -X POST http://127.0.0.1:3000/api/backfill/analyze
```

백필은 Rettiwt의 게시물 및 답글 타임라인을 최대 20개씩 페이지네이션하고 `x_post_id` 기준으로
중복을 제거합니다. 비용 상한을 위해 기본 최대치는 700개입니다. 새로 저장한
과거 글은 `analysis_eligible=false`로 기록하므로 일반 동기화가 자동으로
분석하지 않습니다. 티커 정규화와 품질 검토가 끝난 뒤 오래된 글부터 분석
대상으로 전환합니다.

Auth는 MVP 범위에서 제외했으며 동기화 API는 `localhost` 요청만 허용합니다.
앱은 신뢰할 수 있는 로컬 컴퓨터에서만 실행하는 것을 전제로 합니다.

## Hosted Supabase

새 Supabase 프로젝트에는 최초 한 번 schema migration을 반영해야 합니다.
이 과정에는 Docker가 필요하지 않습니다.

```bash
pnpm supabase login
pnpm supabase link --project-ref YOUR_PROJECT_REF
pnpm supabase db push --dry-run
pnpm supabase db push
```

Hosted 함수와 Cron은 아래 순서로 반영합니다. Docker는 필요하지 않습니다.

```bash
pnpm supabase secrets set \
  RETTIWT_API_KEY=... \
  TELEGRAM_BOT_TOKEN=... \
  TELEGRAM_CHAT_ID=... \
  DEEPSEEK_API_KEY=... \
  SERENITY_CRON_SECRET=...
pnpm supabase functions deploy ingest-x --use-api
pnpm supabase functions deploy analyze-posts --use-api
```

그 다음 `supabase/sql/configure_scheduled_pipeline.sql`의 Vault 값 두 개를
설정해 SQL Editor에서 실행합니다. 수집과 분석은 각각 15분마다 실행되며,
분석은 수집보다 2분 늦게 시작합니다. 중단할 때는
`supabase/sql/remove_scheduled_pipeline.sql`을 실행합니다.

`supabase/seed.sql`은 fixture와 대응하는 로컬 검증용 가짜 데이터이므로 실제
프로젝트에는 기본적으로 넣지 않습니다.

로컬 Supabase 전체 스택이 필요한 경우에만 Docker를 사용합니다.

```bash
pnpm supabase start
pnpm supabase db reset
```

초기 migration에는 핵심 테이블, RLS, 분석 job 함수,
`security_invoker` view가 포함됩니다. Secret key는 RLS를 우회할 수 있으므로
이 앱을 외부에 배포하려면 반드시 Auth를 다시 추가해야 합니다.

## Shay Boloor fan-project disclosure

Shay Boloor(@StockSavvyShay)의 공개 성장주 투자 관점을 분석 대상으로
포함합니다. 공개 포트폴리오 성과는 Savvy Trader를 통해 추적되지만
회계법인의 감사를 받은 운용 성과가 아니며, 공개 수익률은 모든 투자자의 실제
수익을 의미하지 않습니다. 이 프로젝트는 공개 게시물을 분석하는 팬
프로젝트일 뿐 Shay 본인이나 관련 회사와 제휴된 관계가 아닙니다.

## 추적 분석가 추가

분석가별 username과 user ID는 환경변수로 관리하지 않습니다. 런타임은
`analyst_profiles`의 `active=true` 레코드를 수집 대상으로 사용하며, X user
ID는 username으로 최초 한 번 조회해 `ingestion_cursors`에 저장합니다.

새 분석가는 migration 또는 관리용 SQL에서 프로필 한 건만 추가하면 됩니다.

```sql
insert into public.analyst_profiles (
  analyst_key,
  display_name,
  x_username,
  follower_label,
  description_ko,
  focus_areas,
  sort_order
)
values (
  'new_analyst',
  'New Analyst',
  'x_username',
  null,
  '공개 투자 관점 설명',
  array['AI 인프라'],
  30
);
```

## Verify

```bash
pnpm lint
pnpm test
pnpm typecheck
pnpm build
pnpm e2e
```

Playwright 브라우저가 없다면 한 번 설치합니다.

```bash
pnpm exec playwright install chromium
```
