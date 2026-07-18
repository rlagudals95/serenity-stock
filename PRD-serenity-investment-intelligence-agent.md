# PRD: Serenity Investment Intelligence Agent

> 상태: MVP 초안  
> 작성일: 2026-07-18  
> 대상: 개인용 투자 리서치 도구  
> 기술 명세: `TECH-SPEC-serenity-investment-intelligence.md`  
> UI/UX 명세: `UX-SPEC-serenity-investment-intelligence.md`  
> 주의: 이 제품은 투자 조언이나 매수·매도 신호를 제공하지 않는다.

## 1. Summary

Serenity Investment Intelligence Agent는 Serenity의 X 게시글을 수집하고, 종목별 주장과 태도를 구조화해 매일 아침 읽기 쉬운 리서치 브리프를 만드는 개인용 도구다.

핵심은 게시글을 많이 모으는 것이 아니다. 사용자가 매일 다음 세 가지를 빠르게 확인하게 하는 것이 핵심이다.

1. 새롭게 언급된 종목은 무엇인가?
2. 기존 관심 종목에 새로운 주장이나 리스크가 추가됐는가?
3. 오늘 추가로 조사할 가치가 있는 내용은 무엇인가?

MVP는 Supabase Postgres를 데이터 원본으로 사용한다. 웹 대시보드 없이 Daily Brief와 간단한 조회 기능부터 검증한다.

## 2. Contacts

| 역할 | 담당 | 책임 |
|---|---|---|
| Product Owner | 사용자 | 우선순위 결정, 결과 평가, 투자 기준 제공 |
| Developer | 사용자 + Codex | 구현, 테스트, 운영 자동화 |
| Content Source | Serenity의 공개 X 계정 | 분석 대상 공개 게시글 |

## 3. Background

### 3.1 현재 상황

Serenity는 AI, 반도체, 광통신, 데이터센터, 공급망과 관련된 투자 아이디어를 X에 게시한다. 하지만 X는 시간순 피드이기 때문에 종목별 맥락과 관점 변화를 장기간 추적하기 어렵다.

사용자는 현재 다음 작업을 반복해야 한다.

- Serenity의 최신 게시글을 직접 확인한다.
- 종목과 테마를 머릿속이나 메모로 분류한다.
- 과거 발언과 비교해 새 정보인지 판단한다.
- 관심 종목과 관련된 글을 따로 찾는다.
- 주장과 사실을 구분하기 위해 추가 조사를 한다.

### 3.2 문제 정의

사용자가 해결하려는 문제는 "Serenity의 글을 요약하는 것"이 아니다.

진짜 문제는 흩어진 게시글에서 투자 판단에 영향을 줄 수 있는 변화를 놓치지 않고, 그 변화를 과거 맥락과 연결하는 데 시간과 주의력이 많이 든다는 것이다.

현재 방식에는 다음 문제가 있다.

- 새 주장과 반복 주장을 구분하기 어렵다.
- 한 게시글에 여러 종목이 있을 때 종목별 태도를 분리하기 어렵다.
- 과거 게시글이 흩어져 있어 관점 변화를 기억에 의존하게 된다.
- 농담, 리포스트, 시장 반응과 실제 투자 가설이 섞여 있다.
- 원문과 AI의 해석을 분리하지 않으면 잘못된 요약을 사실처럼 받아들일 수 있다.

### 3.3 왜 지금 만드는가

- 저가 LLM도 분류와 정보 추출 작업에서 충분한 품질을 낼 수 있다.
- Supabase 하나로 Postgres, 서버 함수, 스케줄링, 로그 기반을 구성할 수 있다.
- X API가 사용량 기반 과금이므로 소수 계정의 게시글만 읽는 개인 도구를 작게 시작할 수 있다.

### 3.4 핵심 제약

- X API의 가격과 정책은 바뀔 수 있다.
- LLM이 태도와 확신도를 잘못 해석할 수 있다.
- 게시글만으로 실제 투자 가치나 사실 여부를 검증할 수 없다.
- 초기 사용자는 한 명이므로 운영 복잡도가 제품 가치보다 커지면 안 된다.

## 4. Objective

### 4.1 제품 목표

Serenity의 공개 게시글을 사용자가 매일 3분 안에 검토할 수 있는 종목 중심 리서치 브리프로 바꾼다.

### 4.2 사용자 결과

사용자는 Daily Brief를 보고 다음 질문에 답할 수 있어야 한다.

- 지난 24시간 동안 새로 등장한 종목이 있는가?
- Watchlist 종목에 대한 새 주장, 근거, 리스크가 있는가?
- 반복 언급이 아니라 실제로 달라진 내용은 무엇인가?
- 원문에서 직접 확인해야 할 글은 무엇인가?

### 4.3 MVP 성공 기준

출시 후 2주 동안 다음 기준을 확인한다.

| 지표 | 목표 |
|---|---:|
| 게시글 중복 저장 | 0건 |
| 수집 작업 성공률 | 95% 이상 |
| LLM 결과 스키마 통과율 | 최초 호출 95% 이상, 재시도 후 99% 이상 |
| 티커 추출 precision | 95% 이상 |
| 게시글-종목별 stance 수동 일치율 | 85% 이상 |
| Daily Brief 생성 성공률 | 95% 이상 |
| 유용한 중요 항목 비율 | 60% 이상 |
| Daily Brief 검토 시간 | 3분 이하 |

### 4.4 성공 여부를 판단하는 방법

사용자는 Daily Brief의 각 중요 항목에 아래 중 하나를 기록한다.

- `useful`: 실제 추가 조사로 이어졌다.
- `known`: 맞지만 이미 알고 있었다.
- `noise`: 중요하지 않거나 잘못 분류됐다.

2주 동안 `useful / (useful + noise)`가 60% 이상이면 다음 단계로 진행한다.

## 5. Market Segment

### 5.1 Primary Segment

특정 투자 인플루언서의 아이디어를 참고하지만, 그대로 따르기보다 과거 발언과 근거를 직접 검토하려는 개인 투자자.

이 사용자의 핵심 작업은 다음과 같다.

> "매일 모든 글을 읽지 않아도, 내 관심 종목과 투자 가설에 영향을 주는 새 내용을 놓치지 않고 싶다."

### 5.2 초기 사용자 특성

- AI, 반도체, 데이터센터, 나스닥 성장주에 관심이 있다.
- Markdown과 데이터베이스를 편하게 사용한다.
- 단순 감성 분석보다 주장, 근거, 리스크의 구분을 원한다.
- 원문을 직접 확인할 수 있어야 결과를 신뢰한다.

### 5.3 MVP 범위 밖 사용자

- 자동매매 신호가 필요한 사용자
- 여러 인플루언서를 비교하려는 사용자
- 완성된 모바일 앱이나 대시보드가 필요한 사용자
- 규제 대상 투자 조언을 기대하는 사용자

## 6. Value Propositions

### 6.1 핵심 가치

| 사용자 작업 | 기존 방식 | Serenity Agent |
|---|---|---|
| 최신 글 확인 | X 피드를 직접 확인 | 신규 게시글 자동 수집 |
| 종목 파악 | 수동 메모 | 종목별 구조화 |
| 새 정보 판단 | 기억에 의존 | 최근 분석과 비교 |
| 중요도 판단 | 모든 글을 읽음 | 규칙과 LLM으로 우선순위 표시 |
| 신뢰 확인 | 요약만 보고 판단할 위험 | 원문 링크와 근거 문장 제공 |

### 6.2 제품이 줄여야 하는 것

- 반복 글을 읽는 시간
- 관심 종목 언급을 놓칠 가능성
- AI 해석을 원문 사실로 오해할 가능성
- 중요하지 않은 알림

### 6.3 제품이 늘려야 하는 것

- 새로운 주장과 리스크의 발견 속도
- 종목별 과거 맥락의 접근성
- 원문으로 되돌아갈 수 있는 추적 가능성
- 추가 리서치 우선순위의 명확성

## 7. Solution

### 7.1 MVP 원칙

1. 데이터베이스는 처음부터 Supabase Postgres를 사용한다.
2. 원문, 규칙 기반 추출, LLM 해석을 분리 저장한다.
3. stance와 conviction은 게시글 전체가 아니라 `게시글-종목` 단위로 저장한다.
4. 첫 버전은 종목 thesis를 자동으로 덮어쓰지 않는다.
5. 사용자가 원문을 확인할 수 없는 요약은 중요 항목으로 올리지 않는다.
6. LLM 모델 이름과 프롬프트 버전을 모든 분석 결과에 남긴다.
7. 한 번의 명령 또는 하나의 예약 작업으로 전체 파이프라인을 실행할 수 있어야 한다.

### 7.2 사용자 흐름

```text
Supabase Cron
  -> Serenity X 게시글 수집
  -> 원문과 메타데이터 저장
  -> 규칙 기반 티커 후보 추출
  -> LLM으로 게시글-종목별 구조화
  -> 스키마 검증 및 저장
  -> 지난 24시간 변화 계산
  -> Daily Brief 생성
  -> Supabase에 저장
```

MVP에서는 Daily Brief를 Supabase에 저장하고 Markdown으로 내보낼 수 있게 한다. 메시지 알림은 Brief 생성 성공 여부와 Watchlist 중요 항목 수만 짧게 보낸다.

### 7.3 MVP 기능

#### 7.3.1 게시글 수집

X API의 사용자 게시글 엔드포인트를 사용해 Serenity의 신규 게시글을 가져온다.

저장 항목:

- X post ID
- 원문
- 작성 시각
- 원문 URL
- 게시글 유형: `original`, `reply`, `quote`, `repost`
- 대화 ID와 참조 게시글 ID
- 공개된 engagement 지표
- API raw payload

규칙:

- `x_post_id`에 unique constraint를 둔다.
- 마지막 성공 시각만 믿지 않고 `since_id`를 함께 저장한다.
- 리포스트는 저장하되 기본 분석 대상에서 제외한다.
- 답글과 인용글은 가능한 범위에서 참조 글의 텍스트도 저장한다.
- 수집 실패 시 기존 데이터와 리포트를 삭제하지 않는다.

Acceptance Criteria:

- 같은 게시글을 여러 번 가져와도 한 행만 존재한다.
- 수집 작업을 수동으로 다시 실행할 수 있다.
- 각 게시글에서 원문 X URL을 열 수 있다.
- 429 응답은 재시도 시각과 함께 기록한다.

#### 7.3.2 티커 후보 추출

다음 순서로 후보를 만든다.

1. `$COHR` 같은 cashtag 추출
2. 대문자 토큰 추출 후 `ticker_aliases`와 비교
3. 회사명과 제품명 alias 비교
4. LLM이 문맥으로 후보를 보정

`AI`, `CEO`, `GPU`, `CAPEX`, `ASIC`, `USA`, `HBM` 같은 일반 단어는 티커로 바로 인정하지 않는다.

Acceptance Criteria:

- 명시적 cashtag는 100% 후보로 잡는다.
- 최종 티커는 ticker master 또는 사용자가 승인한 alias와 연결된다.
- 불확실한 티커는 버리지 않고 `needs_review`로 저장한다.

#### 7.3.3 게시글-종목별 LLM 분석

LLM은 게시글 전체 요약과 각 종목에 대한 분석을 반환한다.

필수 출력:

```json
{
  "relevance": "relevant",
  "postSummaryKo": "광통신 수요가 예상보다 강하다는 주장이다.",
  "themes": ["optical_networking", "ai_datacenter"],
  "isNoise": false,
  "tickerAnalyses": [
    {
      "ticker": "COHR",
      "stance": "bullish",
      "claimType": "thesis_update",
      "claim": "1.6T 광통신 수요가 예상보다 강하다.",
      "evidenceFromPost": ["원문에서 근거로 사용한 짧은 문장"],
      "risksMentioned": [],
      "catalystsMentioned": ["다음 실적 가이던스"],
      "conviction": "medium",
      "novelty": "unknown",
      "tickerConfidence": 1,
      "stanceConfidence": 0.87
    }
  ]
}
```

허용 값:

- `relevance`: `relevant`, `possibly_relevant`, `irrelevant`
- `stance`: `bullish`, `bearish`, `mixed`, `neutral`, `unknown`
- `claimType`: `new_idea`, `thesis_update`, `risk_warning`, `industry_comment`, `position_hint`, `news_reaction`, `noise`
- `conviction`: `low`, `medium`, `high`, `unknown`
- `novelty`: `new`, `repeated`, `updated`, `unknown`

설계 결정:

- 0~100 점수 대신 작은 enum을 사용한다. 숫자 점수는 모델이 정밀한 것처럼 보이지만 실제 기준을 일관되게 유지하기 어렵다.
- `evidenceFromPost`는 원문에서 찾을 수 있는 짧은 근거만 허용한다.
- 원문에 없는 사실, 실적, 가격 데이터는 생성하지 않는다.
- `novelty`는 최근 같은 종목 분석을 제공할 수 있을 때만 판단한다. 문맥이 부족하면 `unknown`이다.

Acceptance Criteria:

- Zod 스키마 검증을 통과한 결과만 정상 분석으로 저장한다.
- 실패 시 한 번 재시도하고, 다시 실패하면 `needs_review`로 남긴다.
- 원문에 없는 티커를 추가한 경우 낮은 ticker confidence와 검토 상태를 남긴다.
- provider, model, prompt version, token usage, raw response를 저장한다.

#### 7.3.4 변화 감지

MVP에서는 별도 thesis 문서를 LLM이 계속 수정하지 않는다. 대신 저장된 분석을 SQL과 단순 규칙으로 비교한다.

변화 유형:

- `first_mention`: 데이터베이스에서 처음 등장
- `new_claim`: 기존에 없던 claim
- `new_risk`: 기존에 없던 risk
- `stance_change`: 최근 stance와 방향이 달라짐
- `repeat`: 의미상 기존 주장 반복
- `unclear`: 비교 근거가 부족함

처리 방법:

- 첫 언급과 언급량은 SQL로 계산한다.
- stance 변화는 최근 확정된 stance와 비교한다.
- claim 중복은 먼저 정규화된 텍스트와 해시로 확인한다.
- 의미 비교가 필요할 때만 LLM에 최근 관련 분석 최대 5개를 제공한다.

Acceptance Criteria:

- 첫 언급 판정은 LLM이 아니라 DB 기록으로 계산한다.
- 변화 판정에는 비교 대상 분석 ID가 저장된다.
- 근거가 부족할 때 억지로 변화 유형을 정하지 않고 `unclear`를 사용한다.

#### 7.3.5 Watchlist

사용자는 관심 종목과 메모를 Supabase Table Editor 또는 SQL로 관리한다.

필수 필드:

- ticker
- priority
- note
- active

MVP에는 별도 Watchlist UI를 만들지 않는다.

#### 7.3.6 Daily Brief

매일 한국 시간 오전 8시 17분에 지난 24시간을 기준으로 생성한다.

구성:

```md
# Serenity Daily Brief - YYYY-MM-DD

## 핵심 변화
## Watchlist 언급
## 신규 종목
## 새 주장과 리스크
## 반복 또는 낮은 중요도
## 직접 확인할 원문
```

각 중요 항목은 다음 정보를 포함한다.

- ticker
- stance
- 무엇이 새로웠는지
- 원문에서 확인된 근거
- 불확실한 점
- 원문 링크

생성 방식:

- 섹션, 종목 표, 언급 수, 링크는 SQL 결과를 Markdown 템플릿에 넣어 코드로 생성한다.
- LLM은 저장된 구조화 분석만 입력받아 맨 위의 짧은 요약 문단을 작성한다.
- LLM은 DB에 없는 ticker, claim, risk를 리포트에 추가할 수 없다.
- LLM 요약이 실패하면 요약 없이 나머지 리포트를 정상 생성한다.

Acceptance Criteria:

- 데이터가 없는 날에도 빈 리포트를 정상 생성한다.
- 모든 중요 항목에 최소 하나의 원문 링크가 있다.
- 투자 행동을 직접 지시하는 표현을 사용하지 않는다.
- 같은 날짜의 리포트를 다시 만들면 새 버전을 남긴다.
- LLM 호출 실패가 Daily Brief 전체 실패로 이어지지 않는다.

#### 7.3.7 알림

MVP 알림은 하나의 채널만 사용한다. Telegram을 기본으로 한다.

알림 조건:

- Daily Brief 생성 완료
- Watchlist 종목의 `new_claim`, `new_risk`, `stance_change`
- 데이터 수집 또는 분석 작업의 연속 실패

모든 중요 게시글을 실시간으로 보내는 기능은 MVP에서 제외한다.

### 7.4 기술 구조

#### 7.4.1 선택 기술

- Database: Supabase Postgres
- Server runtime: Supabase Edge Functions, TypeScript/Deno
- Scheduler: Supabase Cron
- Database access: `@supabase/supabase-js`
- Schema validation: Zod
- LLM: provider adapter를 통한 외부 API
- Notification: Telegram Bot API
- Local development: Supabase CLI

#### 7.4.2 의도적으로 사용하지 않는 것

- Drizzle ORM: MVP에서는 Supabase SQL migration과 생성 타입으로 충분하다.
- 별도 Node 서버: 예약 작업은 Edge Functions로 처리한다.
- 모노레포: 기능 수가 적어 폴더 분리만으로 충분하다.
- Vector DB와 embeddings: 초기 데이터 규모에서는 SQL 조회와 최근 N개 비교로 충분하다.
- GitHub Actions cron: Supabase Cron으로 실행 위치와 로그를 한곳에 모은다.

#### 7.4.3 폴더 구조

```text
serenity-stock/
  supabase/
    migrations/
    functions/
      ingest-posts/
      generate-daily-brief/
      _shared/
        db.ts
        x-client.ts
        llm/
          index.ts
          deepseek.ts
          groq.ts
        schemas.ts
        telegram.ts
  prompts/
    analyze-post-v1.md
    daily-brief-v1.md
  fixtures/
    golden-posts.json
  reports/
  README.md
```

### 7.5 Data Model

#### 7.5.1 `posts`

X 원문과 변경되지 않는 메타데이터를 저장한다.

| 필드 | 타입 | 설명 |
|---|---|---|
| id | bigint | 내부 ID |
| x_post_id | text unique | X 게시글 ID |
| author_id | text | 작성자 ID |
| text | text | 원문 |
| url | text | 원문 URL |
| post_type | text | original/reply/quote/repost |
| conversation_id | text nullable | 스레드 ID |
| referenced_post_ids | text[] | 참조 글 ID |
| posted_at | timestamptz | X 작성 시각 |
| metrics | jsonb | engagement |
| raw | jsonb | X API 응답 |
| inserted_at | timestamptz | 저장 시각 |

#### 7.5.2 `post_analyses`

게시글 단위 분석과 모델 실행 정보를 저장한다. 같은 게시글을 새 프롬프트로 다시 분석할 수 있으므로 `post_id`는 unique가 아니다.

| 필드 | 타입 | 설명 |
|---|---|---|
| id | bigint | 분석 ID |
| post_id | bigint | posts FK |
| status | text | completed/needs_review/failed |
| relevance | text | 관련성 |
| summary_ko | text | 한국어 요약 |
| themes | text[] | 정규화된 테마 |
| is_noise | boolean | 노이즈 여부 |
| provider | text | deepseek/groq 등 |
| model | text | 실제 모델 ID |
| prompt_version | text | 프롬프트 버전 |
| input_tokens | int | 입력 토큰 |
| output_tokens | int | 출력 토큰 |
| estimated_cost_usd | numeric | 추정 비용 |
| raw_response | jsonb | LLM 원 응답 |
| created_at | timestamptz | 분석 시각 |

Unique constraint:

```text
(post_id, provider, model, prompt_version)
```

#### 7.5.3 `post_ticker_analyses`

한 게시글 안의 종목별 관점을 저장한다.

| 필드 | 타입 | 설명 |
|---|---|---|
| id | bigint | 내부 ID |
| post_analysis_id | bigint | post_analyses FK |
| ticker | text | 정규화된 ticker |
| stance | text | 종목별 stance |
| claim_type | text | 주장 유형 |
| claim | text | 핵심 주장 |
| evidence_from_post | text[] | 원문 근거 |
| risks_mentioned | text[] | 원문 리스크 |
| catalysts_mentioned | text[] | 원문 catalyst |
| conviction | text | low/medium/high/unknown |
| novelty | text | new/repeated/updated/unknown |
| ticker_confidence | numeric | ticker 판정 confidence, 0~1 |
| stance_confidence | numeric | stance 판정 confidence, 0~1 |
| review_status | text | auto/needs_review/approved/rejected |
| review_reason | text nullable | ticker/stance/claim/other |

#### 7.5.4 `ticker_aliases`

티커, 회사명, 제품명 alias를 관리한다.

| 필드 | 타입 | 설명 |
|---|---|---|
| alias | text | 검색할 표현 |
| ticker | text | 연결 ticker |
| alias_type | text | cashtag/company/product/manual |
| active | boolean | 사용 여부 |
| source | text | 생성 출처 |

#### 7.5.5 `watchlist`

| 필드 | 타입 | 설명 |
|---|---|---|
| ticker | text primary key | 관심 종목 |
| priority | text | low/medium/high |
| note | text | 사용자 메모 |
| active | boolean | 활성 여부 |
| created_at | timestamptz | 등록 시각 |

#### 7.5.6 `daily_reports`

| 필드 | 타입 | 설명 |
|---|---|---|
| id | bigint | 내부 ID |
| report_date | date | KST 기준 날짜 |
| version | int | 재생성 버전 |
| content_md | text | Markdown 본문 |
| source_post_ids | bigint[] | 포함된 게시글 |
| stats | jsonb | 언급량과 실행 통계 |
| provider | text | 보고서 생성 provider |
| model | text | 보고서 생성 model |
| created_at | timestamptz | 생성 시각 |

Unique constraint:

```text
(report_date, version)
```

#### 7.5.7 `pipeline_runs`

| 필드 | 타입 | 설명 |
|---|---|---|
| id | uuid | 실행 ID |
| job_name | text | ingest/daily_brief |
| status | text | running/succeeded/partial/failed |
| started_at | timestamptz | 시작 |
| finished_at | timestamptz | 종료 |
| cursor | jsonb | since_id 등 체크포인트 |
| counts | jsonb | fetched/analyzed/failed |
| error | jsonb | 오류 정보 |

### 7.6 Supabase 운영 설계

예약 작업:

- `ingest-posts`: 3시간마다 실행
- `generate-daily-brief`: 매일 08:17 KST 실행

보안:

- X, LLM, Telegram 키는 Edge Function secret에 저장한다.
- `SUPABASE_SERVICE_ROLE_KEY`는 브라우저나 리포트에 노출하지 않는다.
- 웹 UI가 생기기 전에는 public insert/update policy를 만들지 않는다.
- 사용자용 조회 UI를 만들 때 RLS를 활성화하고 사용자별 정책을 추가한다.

복구:

- 모든 작업은 idempotent하게 만든다.
- `pipeline_runs.cursor`를 이용해 마지막 정상 수집 지점부터 재실행한다.
- 분석 실패 행만 다시 처리할 수 있어야 한다.
- 수동 텍스트 또는 X URL import를 복구 경로로 제공한다.

### 7.7 LLM 선택

#### 7.7.1 결론

MVP 기본 모델은 `DeepSeek-V4-Flash`의 non-thinking mode로 시작한다.

이유:

- 게시글 라벨링과 JSON 생성에 필요한 품질 대비 가격이 낮다.
- OpenAI 형식 API와 JSON Output을 지원한다.
- 현재 공식 가격은 cache miss 입력 $0.14/1M tokens, 출력 $0.28/1M tokens다.
- 같은 provider에서 더 강한 모델로 일부 작업만 올리기 쉽다.

Daily Brief 품질이 부족할 때만 보고서 생성 호출을 `DeepSeek-V4-Pro`로 올린다. 게시글별 분류는 Flash를 유지한다.

#### 7.7.2 비교 후보

2026-07-18 공식 가격 기준:

| 후보 | 입력 / 1M | 출력 / 1M | 장점 | 주의 |
|---|---:|---:|---|---|
| DeepSeek-V4-Flash | $0.14 | $0.28 | 낮은 비용, JSON Output, 긴 문맥 | JSON Schema는 앱에서 다시 검증 |
| Groq GPT-OSS 20B | $0.075 | $0.30 | strict JSON Schema, 매우 빠름 | 실제 라벨 품질을 평가해야 함 |
| Gemini 3.1 Flash-Lite | $0.25 | $1.50 | 고용량 단순 처리용, 무료 tier | 현재 preview, 출력 비용이 더 높음 |
| GPT-5.4 nano | $0.20 | $1.25 | 분류와 추출에 최적화, 안정적 도구 | 이 작업에서는 DeepSeek보다 비쌈 |

가장 싼 모델을 바로 고르지 않는다. 이 규모에서는 X 데이터 비용이 LLM 비용보다 클 가능성이 높고, 라벨 오류를 직접 고치는 시간이 토큰 비용 차이보다 비싸다.

#### 7.7.3 모델 선정 실험

실제 Serenity 게시글 100개로 `golden-posts.json`을 만든다. 사용자가 다음 정답을 직접 표시한다.

- 관련 여부
- 티커
- 종목별 stance
- claim type
- 원문에 근거가 있는지
- noise 여부

DeepSeek-V4-Flash와 Groq GPT-OSS 20B를 같은 데이터로 비교한다.

채택 기준:

- 스키마 최종 통과율 99% 이상
- 티커 precision 95% 이상
- stance 일치율 85% 이상
- 원문에 없는 근거 생성 2% 이하
- 위 기준을 통과한 모델 중 실제 호출 비용이 낮은 모델

기본 구현은 DeepSeek로 시작하되, 이 평가에서 Groq가 같은 품질을 내면 provider 설정만 바꾼다.

#### 7.7.4 비용 예시

가정:

- 하루 게시글 30개
- 게시글당 입력 1,000 tokens
- 게시글당 출력 400 tokens
- 30일

DeepSeek-V4-Flash 예상 월 비용:

```text
입력: 900,000 tokens x $0.14 / 1M = $0.126
출력: 360,000 tokens x $0.28 / 1M = $0.101
합계: 약 $0.23 + Daily Brief 생성 비용
```

같은 조건에서 X Post Read가 게시글당 $0.005라면 900개 읽기에 약 $4.50가 든다. 따라서 첫 최적화 대상은 LLM보다 중복 X read와 불필요한 수집이다.

가격은 변경될 수 있으므로 실제 비용은 `input_tokens`, `output_tokens`, `estimated_cost_usd`로 기록하고 월별로 확인한다.

#### 7.7.5 Provider 교체 규칙

애플리케이션 코드는 아래 인터페이스만 사용한다.

```ts
interface LlmProvider {
  analyzePost(input: AnalyzePostInput): Promise<AnalyzePostResult>;
  generateDailyBrief(input: DailyBriefInput): Promise<DailyBriefResult>;
}
```

환경 변수:

```env
LLM_PROVIDER=deepseek
LLM_MODEL=deepseek-v4-flash
LLM_API_KEY=
LLM_BASE_URL=https://api.deepseek.com
```

provider별 SDK 타입을 도메인 코드에 직접 노출하지 않는다.

### 7.8 중요도 계산

Importance Score를 LLM에게 직접 0~100으로 만들게 하지 않는다.

앱이 아래 규칙으로 점수를 계산한다.

```text
+4 Watchlist high 종목
+3 stance_change
+3 new_risk
+2 first_mention
+2 new_claim
+1 conviction=high
-2 repeat
-3 noise
```

구간:

- 5점 이상: Daily Brief 핵심 변화
- 2~4점: 일반 항목
- 1점 이하: 낮은 중요도

이 방식은 점수 이유를 설명할 수 있고, 사용 결과에 따라 가중치를 쉽게 바꿀 수 있다.

### 7.9 Assumptions

검증되지 않은 가정:

1. Serenity의 하루 게시글 수가 한 번의 Edge Function 실행으로 처리 가능한 수준이다.
2. X API가 Serenity 공개 게시글과 필요한 참조 정보를 안정적으로 반환한다.
3. 저가 LLM이 영어 게시글을 읽고 한국어 요약을 만들 때 stance를 85% 이상 맞춘다.
4. 사용자는 웹 대시보드 없이도 Daily Brief와 Supabase Table Editor를 초기 검증에 사용할 수 있다.
5. 최근 같은 종목 분석 5개만으로 반복 주장과 새 주장을 충분히 구분할 수 있다.
6. 사용자가 2주 동안 `useful/known/noise` 피드백을 남길 수 있다.

각 가정은 MVP 기간에 측정하고, 실패한 가정 때문에 필요한 기능만 다음 버전에 추가한다.

### 7.10 Non-goals

MVP에서 하지 않는다.

- 매수·매도 추천
- 목표 주가 계산
- 자동매매와 증권사 API 연동
- 실제 보유 포지션 추정
- 실시간 알림
- 여러 인플루언서 지원
- 자동 thesis 문서 갱신
- SEC, 실적, 가격 데이터 교차 검증
- embeddings와 vector database
- Next.js 대시보드
- 백테스트

## 8. Release

### 8.1 Release 0: 기반과 수동 실행

예상 범위: 약 2~3일

포함:

- Supabase 프로젝트와 SQL migration
- `posts`, `post_analyses`, `post_ticker_analyses`, `pipeline_runs`
- 수동 텍스트 import
- DeepSeek provider adapter
- Zod schema
- 단일 게시글 분석

완료 기준:

- 샘플 게시글 20개를 저장하고 재실행해도 중복이 없다.
- 분석 결과가 DB에 종목별로 저장된다.
- 실패한 분석을 다시 실행할 수 있다.

### 8.2 Release 1: 자동 Daily Brief MVP

예상 범위: 그다음 약 4~7일

포함:

- X API 수집
- 3시간 간격 Supabase Cron
- ticker aliases
- Watchlist
- 변화 감지 규칙
- Daily Brief 생성
- Telegram 완료 알림

완료 기준:

- 3일 연속 수동 개입 없이 Daily Brief가 생성된다.
- 모든 중요 항목에서 원문으로 이동할 수 있다.
- 작업 실패가 `pipeline_runs`와 Telegram에 남는다.

### 8.3 Release 1.1: 품질 평가

예상 범위: 2주 dogfooding 기간

포함:

- 100개 golden dataset
- DeepSeek와 Groq 비교
- `useful/known/noise` 피드백 기록
- 중요도 가중치 조정
- 프롬프트 버전 비교

다음 단계 진입 기준:

- 핵심 성공 지표를 만족한다.
- Daily Brief가 실제 추가 리서치 행동으로 이어진다.
- 잘못된 알림을 고치는 시간이 매일 직접 X를 읽는 시간보다 적다.

### 8.4 Release 2: Thesis History

MVP가 유용한 경우에만 진행한다.

포함 후보:

- 종목별 thesis snapshot
- claim과 risk의 변경 이력
- 사용자 승인 기반 thesis 갱신
- 종목별 Markdown 리포트

자동 갱신 전에 사용자가 변경안을 승인하도록 한다. 충분한 정확도가 확인된 뒤에만 자동화를 고려한다.

### 8.5 Release 3: Verification

Thesis History가 실제로 사용되는 경우에만 진행한다.

포함 후보:

- SEC filing과 실적 발표 연결
- 주장별 검증 상태
- 가격과 거래량 반응
- independent evidence

이 단계에서도 시스템은 투자 조언이 아니라 근거 수집과 검증 상태만 제공한다.

### 8.6 Release 4: Web UI

DB와 Daily Brief 조회가 불편하다는 사용 증거가 쌓일 때 진행한다.

상세 구현 명세:

- `PRD-serenity-web-ui.md`

화면 후보:

- Overview
- Posts
- Ticker detail
- Daily Brief
- Watchlist
- Review queue

## Appendix A. 초기 환경 변수

```env
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=

X_BEARER_TOKEN=
SERENITY_X_USER_ID=

LLM_PROVIDER=deepseek
LLM_MODEL=deepseek-v4-flash
LLM_API_KEY=
LLM_BASE_URL=https://api.deepseek.com

TELEGRAM_BOT_TOKEN=
TELEGRAM_CHAT_ID=
```

## Appendix B. 참고한 공식 문서

- DeepSeek models and pricing: https://api-docs.deepseek.com/quick_start/pricing
- DeepSeek JSON Output: https://api-docs.deepseek.com/guides/json_mode
- Groq models and pricing: https://console.groq.com/docs/models
- Groq Structured Outputs: https://console.groq.com/docs/structured-outputs
- Gemini API pricing: https://ai.google.dev/gemini-api/docs/pricing
- GPT-5.4 nano: https://developers.openai.com/api/docs/models/gpt-5.4-nano
- Supabase Cron: https://supabase.com/docs/guides/cron
- Supabase scheduled Edge Functions: https://supabase.com/docs/guides/functions/schedule-functions
- X API pricing: https://docs.x.com/x-api/getting-started/pricing
- X API rate limits: https://docs.x.com/x-api/fundamentals/rate-limits

## Appendix C. 최종 제품 판단

이 제품의 첫 번째 성공은 "똑똑한 투자 에이전트"가 아니다.

첫 번째 성공은 사용자가 매일 X를 직접 훑지 않아도 새 종목, 새 주장, 새 리스크를 놓치지 않고 원문까지 빠르게 확인하는 것이다.

이 흐름이 2주 동안 반복해서 유용하다는 것이 확인된 뒤에만 thesis 자동화, 외부 검증, 대시보드를 추가한다.
