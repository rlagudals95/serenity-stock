# Public Investor Intelligence

성장주 분석가들의 공개 X 게시글에서 종목별 언급, 누적 관점,
최근 의견과 변화 근거를 확인하고 분석가별 관점을 비교하는 개인용 투자
리서치 도구입니다. 현재 Serenity, Shay Boloor, Beth Kindig,
App Economy Insights, Brian Stoffel, Ole S Hansen, StockMKTNewz,
Convequity, Gene Munster, Chit Chat Stocks까지 총 10개 공개 계정을 추적합니다.

추가 후보 평가와 선정 근거는
[`docs/research/2026-08-01-x-influencer-expansion.md`](docs/research/2026-08-01-x-influencer-expansion.md)에
정리되어 있습니다.

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
X_POST_PROVIDER=rettiwt
TELEGRAM_BOT_TOKEN=REPLACE_ME
TELEGRAM_CHAT_ID=REPLACE_ME
DEEPSEEK_API_KEY=REPLACE_ME
DEEPSEEK_MODEL=deepseek-v4-flash
FINNHUB_API_KEY=
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

종목 테이블은 최근 20거래일 가격 추세와 종가를 먼저 보여주고, 현재 종합
신호, 신호 이후 수익률, 1개월 방향 결과를 함께 표시합니다. 화면 요청에서
외부 시세 API를 직접 호출하지 않으며, DB가 준비되면
`ticker_signal_performance`와 `market_daily_prices`에 적재된 일봉 결과를
읽습니다. 기존 Nasdaq/Finnhub 지연 시세 adapter와 API route는 가격 공급자
비교 검증용으로 남아 있지만 핵심 화면에서는 사용하지 않습니다.

### Signal performance foundation

최근 거래가는 화면의 보조 정보이며, 핵심 신호는 **인플루언서 종합의견이
형성된 뒤 실제 주가 방향과 일치했는지**입니다. Release 0 계산 검증과 Release
1 데이터 기반은 [`PRD-signal-performance.md`](./PRD-signal-performance.md)를
기준으로 합니다.

- 분석가별 최신 유효 방향성 의견 한 표만 사용합니다.
- 일반 중립·혼합 게시물은 기존 표를 지우지 않으며, 명시적인
  `stance_change`만 표를 해제합니다.
- 최소 2명 참여와 정확한 `2/3` 합의로 긍정·부정 신호를 생성합니다.
- 신호 다음 거래일 시가를 기준가로 삼고 5·20·60 거래일 종가 성과를
  `aligned`, `flat`, `opposed`로 판정합니다.
- 일봉 저장과 계산 모델은 가격 공급자에 독립적입니다. Release 0의 외부
  가격 조회는 방법론 검증에만 사용했으며 운영 화면이나 배치에는 연결하지
  않았습니다.

데이터 스키마는 `market_daily_prices`, `consensus_signal_events`,
`signal_outcomes`와 `ticker_signal_performance` view로 구성됩니다. 아직 Hosted
Supabase에는 새 migration을 적용하지 않았고, 운영 가격 공급자와 일일 동기화
작업은 다음 단계에서 연결합니다.

신호 view가 아직 배포되지 않은 환경에서는 COHR, AAOI, LITE, NVDA, ASTS의
Release 0 검증 스냅샷을 fallback으로 사용합니다. 해당 값은 2026-07-31 기준
실제 일봉과 시점 고정 신호 계산 결과이며 화면에도 기준일을 표시합니다. 검증
범위 밖 종목이나 DB에 실제로 활성 신호가 없는 종목은 임의 수익률을 만들지
않고 명시적인 미적재 상태를 표시합니다.

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
메시지를 보내지 않습니다. 알림은 DB outbox에 먼저 기록하며, Telegram 전송
실패 시 5분, 15분, 이후 최대 60분 간격으로 Telegram만 다시 시도합니다.
Telegram 장애가 X 재요청을 발생시키거나 원문 수집을 실패시키지는 않습니다.

`X_POST_PROVIDER`는 현재 `rettiwt`만 지원합니다. 수집 코드는 공통
`XPostSource` 계약을 사용하므로 공식 X API는 이후 별도 provider로 추가할 수
있습니다. Rettiwt 요청은 750~1,500ms의 랜덤 지연 후 한 번만 실행합니다.

예약 cron은 5분마다 수집 함수를 깨우지만 실제 X 조회는 DB가 선택한
30·35·40·45분 간격으로만 실행합니다. Rettiwt 인증이 실패하면 같은
credential로는 예약 실행과 수동 **동기화** 모두 X를 다시 호출하지 않습니다.
이때 Telegram으로 수집 중단과 조치 방법을 알립니다. 복구하려면 Supabase의
`RETTIWT_API_KEY` secret을 새 값으로 교체하세요. 다음 예약 실행 또는 수동
동기화가 credential 지문 변경을 감지해 한 번 조회하고, 성공 시 복구 알림을
보냅니다. 로그인이나 cookie 갱신은 자동화하지 않습니다.

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

### User behavior log

사용 행동은 외부 analytics 도구 없이 app-local UBL 모듈로 기록합니다. 현재
`page_view`, `ticker_row_opened`, `source_link_opened`, `filter_applied` 이벤트를
브라우저에 최대 200개 보관합니다. 이벤트 모델과 React helper는 sender 주입
방식이라, 여러 세션 집계가 필요해지면 앱 adapter만 Supabase 저장 방식으로
교체할 수 있습니다. 상세 계약과 확인 방법은
[`src/lib/user-behavior-log/README.md`](./src/lib/user-behavior-log/README.md)를
참고하세요.

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
설정해 SQL Editor에서 실행합니다. 수집 cron은 5분마다 스케줄 상태를
확인하고 실제 X 조회는 30·35·40·45분 중 무작위 간격으로 실행합니다.
분석은 기존처럼 15분마다 독립 실행됩니다. 중단할 때는
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
