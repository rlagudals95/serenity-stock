# Serenity Investment Intelligence

Serenity의 공개 X 게시글에서 종목별 언급, 누적 관점, 최근 의견과 변화 근거를 확인하는 개인용 투자 리서치 도구입니다.

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
Hosted Supabase에 Serenity의 X 게시글을 수집하고 DeepSeek로 분석할 수
있습니다.

```bash
cp .env.example .env.local
```

```text
SUPABASE_URL=https://YOUR_PROJECT.supabase.co
SUPABASE_SECRET_KEY=sb_secret_REPLACE_ME
X_API_BEARER_TOKEN=REPLACE_ME
SERENITY_X_USERNAME=aleabitoreddit
DEEPSEEK_API_KEY=REPLACE_ME
DEEPSEEK_MODEL=deepseek-v4-flash
SERENITY_SYNC_MAX_POSTS=100
SERENITY_ANALYSIS_BATCH_SIZE=25
SERENITY_BACKFILL_DAYS=60
SERENITY_BACKFILL_MAX_POSTS=700
```

`SUPABASE_SECRET_KEY`는 Supabase Dashboard의 **Settings → API Keys → Secret
keys**에서 생성합니다. 이 값은 Next.js 서버에서만 읽으며 브라우저 번들에는
포함되지 않습니다. `.env.local`을 커밋하거나 키를 `NEXT_PUBLIC_` 변수에
넣지 마세요.

설정 후 앱 상단의 **동기화** 버튼을 누르면 다음 작업을 한 번 실행합니다.

1. 최초 실행은 최근 게시글을 백필하고 이후에는 `since_id`로 신규 글만 수집
2. X pagination을 따라가며 `x_post_id` 기준으로 중복 없이 저장
3. 누락된 `analysis_jobs` 생성 및 claim
4. DeepSeek `deepseek-v4-flash` JSON 모드로 글-종목별 분석
5. ticker, stance, claim, 근거, 리스크, catalyst, confidence 저장
6. 종목 overview와 상세 화면 갱신

DeepSeek 출력은 Zod schema와 DB constraint를 모두 통과해야 저장됩니다.
원문에 실제로 존재하지 않는 evidence는 한 번 교정 재시도한 뒤 실패 job으로
남깁니다. 기본 수집 한도는 100개이며 10~500 사이에서 조정할 수 있습니다.
LLM 분석은 기본 25개씩 claim하고 3개 동시 처리합니다.

### Historical backfill

Cron을 켜기 전에 최근 60일 원문을 수집하려면 개발 서버가 실행 중인
상태에서 아래 요청을 한 번 실행합니다.

```bash
curl -X POST http://127.0.0.1:3000/api/backfill
```

과거 글은 원문만 저장되며 자동 분석되지 않습니다. 저장된 글을 X API
재조회 없이 DeepSeek로 한 배치씩 분석하려면 다음 명령을 반복 실행합니다.

```bash
curl -X POST http://127.0.0.1:3000/api/backfill/analyze
```

백필은 X API를 최대 100개씩 페이지네이션하고 `x_post_id` 기준으로
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
