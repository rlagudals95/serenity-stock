# PRD: Serenity Investment Intelligence Web UI

> 상태: 구현 명세 초안  
> 작성일: 2026-07-18  
> 상위 문서: `PRD-serenity-investment-intelligence-agent.md`  
> 기술 명세: `TECH-SPEC-serenity-investment-intelligence.md`  
> UI/UX 명세: `UX-SPEC-serenity-investment-intelligence.md`  
> 범위: 종목 Overview 테이블과 종목 상세 페이지

## 1. Summary

Serenity Web UI는 Serenity가 언급한 종목을 테이블로 비교하고, 각 종목의 누적 성향과 최근 의견을 원문까지 추적하는 개인용 리서치 화면이다.

첫 화면에서 `총 언급 수`, `긍정/부정 언급 수`, `누적 성향`, `최근 의견`, `최근 변화`를 바로 확인할 수 있어야 한다. Row를 선택하면 종목 상세 페이지로 이동해 의견 이력, 근거 문장, 실제 X 게시글을 확인할 수 있어야 한다.

## 2. Contacts

| 역할 | 담당 | 책임 |
|---|---|---|
| Product Owner | 사용자 | 정보 우선순위와 집계 기준 승인 |
| Developer | 사용자 + Codex | UI, DB view, 조회 로직 구현 |
| Data Source | Serenity 공개 X 게시글 | 화면에 표시할 원문 |

## 3. Background

### 3.1 해결할 문제

Daily Brief는 하루 단위 변화를 보는 데 적합하지만 다음 질문에는 충분하지 않다.

- Serenity가 지금까지 가장 많이 언급한 종목은 무엇인가?
- 전체적으로 긍정적이었는가, 부정적이었는가?
- 누적 성향과 가장 최근 의견이 다른 종목은 무엇인가?
- 해당 판단이 어떤 원문에서 나왔는가?

사용자는 종목을 빠르게 비교한 뒤, 관심 있는 종목의 근거를 깊게 확인할 수 있어야 한다.

### 3.2 핵심 제품 원칙

1. `투자의견`이라는 표현 대신 `Serenity 관점`을 사용한다.
2. 누적 성향과 최근 의견을 분리한다.
3. 성향은 색상만으로 표현하지 않고 텍스트와 절대 개수를 함께 표시한다.
4. 모든 AI 해석은 원문과 연결한다.
5. 집계 규칙은 설명 가능하고 재현 가능해야 한다.
6. 메인 화면은 대시보드보다 작업용 데이터 테이블에 가깝게 만든다.

## 4. Objective

### 4.1 사용자 목표

사용자가 첫 화면을 보고 10초 안에 다음을 판단하게 한다.

- 많이 언급된 종목
- 긍정 또는 부정 언급이 우세한 종목
- 최근 관점이 바뀐 종목
- 상세 확인이 필요한 종목

### 4.2 성공 기준

| 지표 | 목표 |
|---|---:|
| 특정 종목의 총 언급 수 확인 | 10초 이하 |
| 긍정/부정 우세 여부 확인 | Row를 열지 않고 가능 |
| 종목 상세 페이지 진입 | Row 선택 1회 |
| AI 분석에서 원문 이동 | 상세 페이지에서 1회 |
| Overview와 상세 집계 불일치 | 0건 |
| 필터 또는 정렬 후 URL 복원 | 100% |
| 키보드만으로 Row 탐색 및 진입 | 가능 |

## 5. Market Segment

### 5.1 Primary User

Serenity의 게시글을 참고하면서 종목별 관심도와 관점 변화를 직접 검토하려는 개인 투자자.

### 5.2 핵심 사용자 작업

> "Serenity가 자주, 긍정적으로 언급한 종목을 찾고, 최근 의견이 달라졌는지 원문으로 확인하고 싶다."

### 5.3 사용 환경

- 데스크톱 웹을 우선한다.
- 태블릿과 모바일에서도 조회는 가능해야 한다.
- 초기에는 단일 사용자 비공개 앱으로 운영한다.

## 6. Value Propositions

| 사용자 요구 | 제공 방식 |
|---|---|
| 누적 관심도 비교 | 총 언급 수와 7일/30일 언급 수 |
| 긍정/부정 즉시 확인 | 절대 개수, 분포 막대, 누적 성향 배지 |
| 최근 변화 발견 | 최근 의견과 변화 유형 |
| 판단 근거 확인 | 근거 문장과 X 원문 링크 |
| AI 오류 통제 | confidence, 검토 상태, 사용자 피드백 |

## 7. Solution

### 7.1 Information Architecture

초기 UI는 두 개의 핵심 route로 구성한다.

```text
/tickers
  종목 Overview 테이블

/tickers/[ticker]
  종목 상세 페이지
```

루트 `/`는 `/tickers`로 이동한다.

후속 route:

```text
/review
  AI 분석 검토 큐

/daily
  Daily Brief 목록과 상세
```

`/review`와 `/daily`는 첫 UI 릴리스 범위에서 제외한다.

### 7.2 Global Layout

#### 7.2.1 상단 영역

- 왼쪽: `Serenity Intelligence`
- 가운데 또는 왼쪽 아래: 현재 화면 제목
- 오른쪽: 마지막 데이터 갱신 시각
- 계정 메뉴: 로그아웃

큰 hero, 소개 문구, 마케팅 영역은 사용하지 않는다.

#### 7.2.2 Navigation

초기 navigation:

- Tickers

후속 navigation:

- Daily Brief
- Review
- Watchlist

navigation은 화면 왼쪽의 좁은 sidebar 또는 상단 탭으로 제공한다. 초기 메뉴가 하나뿐이면 sidebar를 만들지 않는다.

### 7.3 Ticker Overview

#### 7.3.1 화면 목적

모든 종목을 동일한 기준으로 비교하고, 많이 언급되거나 관점이 바뀐 종목을 찾는다.

#### 7.3.2 기본 화면 구조

```text
종목 분석                              마지막 갱신 08:04 KST

[검색] [Watchlist] [누적 성향] [최근 의견] [변화] [기간]

★ | 티커 / 회사 | 총 언급 | 성향 분포 | 누적 성향 | 최근 의견 | 변화 | 7D / 30D | 최근 언급
------------------------------------------------------------------------------------------------
★ | COHR         | 47      | +38 / -3 | 긍정 우세 | 긍정 의견 | 새 주장 | 8 / 17   | 2시간 전
  | AAOI         | 31      | +20 / -4 | 긍정 우세 | Mixed    | 새 리스크 | 2 / 12  | 1일 전
```

#### 7.3.3 컬럼 명세

| 순서 | 컬럼 | 표시 내용 | 정렬 | 모바일 |
|---:|---|---|---|---|
| 1 | Watchlist | 별 아이콘 toggle | 아니요 | 표시 |
| 2 | 티커 / 회사 | ticker, company name | ticker | 표시 |
| 3 | 총 언급 | 전체 유효 게시글 수 | 숫자 | 표시 |
| 4 | 성향 분포 | 긍정/부정 절대 개수와 분포 막대 | 긍정 비율 | 표시 |
| 5 | 누적 성향 | 긍정 우세/부정 우세/혼재/판단 부족 | 가능 | 숨김 가능 |
| 6 | 최근 의견 | 가장 최근 유효 언급의 stance | 가능 | 표시 |
| 7 | 변화 | 신규 종목/새 주장/새 리스크/방향 전환/반복 | 가능 | 표시 |
| 8 | 7D / 30D | 최근 기간별 언급 수 | 각각 가능 | 숨김 |
| 9 | 최근 언급 | 상대 시각, hover 시 절대 시각 | 가능 | 숨김 |
| 10 | 품질 상태 | 검토 필요 개수 또는 경고 아이콘 | 가능 | 아이콘만 |

기본 정렬:

```text
total_mentions desc
last_mentioned_at desc
```

페이지당 50개 Row를 표시한다.

#### 7.3.4 총 언급 수 정의

`총 언급`은 해당 ticker가 확인된 서로 다른 게시글 수다.

포함:

- original
- reply
- quote
- 삭제 전에 이미 정상 수집된 게시글
- `review_status = approved`
- `review_status = auto`이면서 `ticker_confidence >= 0.75`

제외:

- repost
- noise
- `review_status = rejected`
- ticker 판정이 `needs_review`
- 같은 게시글 안에서 같은 ticker가 여러 번 나온 중복
- 현재 사용 중인 분석 버전이 아닌 과거 분석 결과

추가 규칙:

- 같은 스레드 안의 서로 다른 게시글은 각각 1회로 계산한다.
- 상세 페이지에서는 `고유 스레드 수`를 보조 지표로 표시한다.
- ticker는 확정됐지만 stance만 `needs_review`인 글도 총 언급에는 포함한다.
- stance가 불명확한 글은 총 언급에는 포함하지만 긍정/부정 집계에는 포함하지 않는다.
- 따라서 총 언급 수는 stance 분포에 포함된 게시글 수보다 클 수 있다.
- ticker 판정이 `needs_review`인 건수는 품질 상태에 따로 표시한다.

#### 7.3.5 성향 분포 정의

stance mapping:

| LLM stance | UI 집계 |
|---|---|
| bullish | 긍정 |
| bearish | 부정 |
| neutral | 중립 |
| mixed | 혼재 |
| unknown | 판단 불가 |

Row의 성향 분포 셀:

```text
+38  -3
[긍정 81%][혼재 8%][중립 6%][부정 5%]
```

표시 규칙:

- 첫 줄에는 긍정과 부정의 절대 개수를 항상 표시한다.
- 둘째 줄에는 전체 유효 stance의 분포 막대를 표시한다.
- 중립, 혼재, 판단 불가 개수는 tooltip과 접근성 label에 표시한다.
- 분포 막대가 없어도 `+38 / -3` 텍스트만으로 의미를 이해할 수 있어야 한다.
- 색상은 긍정=green, 부정=red, 혼재=amber, 중립/판단 불가=gray 계열을 사용한다.

#### 7.3.6 누적 성향 계산

누적 성향은 LLM이 직접 생성하지 않고 저장된 stance 개수로 계산한다.

```text
directional_count = positive_count + negative_count
positive_share = positive_count / directional_count
```

판정:

| 조건 | 누적 성향 |
|---|---|
| directional_count < 3 | 판단 부족 |
| positive_share >= 0.65 | 긍정 우세 |
| positive_share <= 0.35 | 부정 우세 |
| 그 외 | 혼재 |

중립, mixed, unknown은 방향 비율의 분모에서 제외하지만 절대 개수에는 표시한다.

#### 7.3.7 최근 의견 정의

최근 의견은 가장 최근에 작성된 유효 게시글의 종목별 stance다.

유효 조건:

- noise가 아님
- repost가 아님
- review 상태가 `approved`이거나 `stance_confidence >= 0.75`인 `auto`
- stance가 `unknown`이 아님
- 현재 분석 버전

표시:

- `긍정 의견`
- `부정 의견`
- `혼재`
- `중립`
- `의견 없음`

저장된 enum `bullish`, `bearish`, `mixed`, `neutral`, `unknown`은 변경하지 않는다.

최근 의견은 누적 성향과 다를 수 있다. 둘이 반대 방향이면 Row의 변화 컬럼을 강조한다.

#### 7.3.8 변화 컬럼

DB의 변화 유형을 다음 UI label로 표시한다.

| change type | UI label |
|---|---|
| first_mention | 신규 종목 |
| new_claim | 새 주장 |
| new_risk | 새 리스크 |
| stance_change | 방향 전환 |
| repeat | 반복 |
| unclear | 불명확 |
| null | 변화 없음 |

강조 순서:

1. 방향 전환
2. 새 리스크
3. 신규 종목
4. 새 주장
5. 불명확
6. 반복
7. 변화 없음

변화 label에는 해당 판정의 기준 게시글 시각을 tooltip으로 제공한다.

#### 7.3.9 검색과 필터

검색:

- ticker prefix
- company name 부분 일치
- 대소문자 구분 없음

필터:

- Watchlist만 보기
- 누적 성향
- 최근 의견
- 변화 유형
- 최소 총 언급 수
- 최근 언급 기간: 24H, 7D, 30D, 전체
- 검토 필요 항목 포함 여부

정렬:

- 총 언급
- 긍정 언급
- 부정 언급
- 긍정 비율
- 7D 언급
- 30D 언급
- 최근 언급
- ticker

필터와 정렬은 URL query에 저장한다.

예:

```text
/tickers?watchlist=true&sentiment=positive&sort=total_mentions&order=desc
```

#### 7.3.10 Row interaction

- Row의 비어 있는 영역을 선택하면 `/tickers/[ticker]`로 이동한다.
- Enter 또는 Space로 선택한 Row를 열 수 있다.
- Watchlist toggle을 선택하면 상세 페이지로 이동하지 않는다.
- 정렬 버튼과 tooltip을 선택해도 상세 페이지로 이동하지 않는다.
- 새 탭 열기와 브라우저 기본 navigation이 동작해야 한다.
- hover 상태는 Row 높이나 컬럼 너비를 바꾸지 않는다.

### 7.4 Ticker Detail

#### 7.4.1 화면 목적

종목의 누적 성향과 최근 의견이 어떤 게시글과 근거에서 만들어졌는지 확인한다.

#### 7.4.2 Header

```text
Tickers / COHR

COHR  Coherent Corp.                         [★ Watchlist]
Serenity 누적 성향: 긍정 우세   최근 의견: 긍정 의견   최근 변화: 새 주장
```

표시 항목:

- ticker
- company name
- Watchlist toggle
- 누적 성향
- 최근 의견
- 최근 변화
- 마지막 정상 분석 시각

#### 7.4.3 Metrics strip

Header 아래에 한 줄 지표 영역을 둔다.

| 지표 | 내용 |
|---|---|
| 총 언급 | 전체 유효 게시글 수 |
| 긍정 | bullish 개수 |
| 부정 | bearish 개수 |
| 중립/혼재 | neutral + mixed 개수 |
| 7D | 최근 7일 언급 수 |
| 30D | 최근 30일 언급 수 |
| 고유 스레드 | distinct conversation count |
| 최근 언급 | 마지막 게시글 시각 |

모바일에서는 두 줄 grid로 바꾸되 지표 순서를 유지한다.

#### 7.4.4 Tabs

```text
[개요] [의견과 원문] [내 리서치]
```

URL:

```text
/tickers/COHR?tab=overview
/tickers/COHR?tab=opinions
/tickers/COHR?tab=research
```

#### 7.4.5 개요 탭

구성 순서:

1. 누적 성향 분포
2. 최근 변화
3. 최근 주요 주장
4. 최근 언급된 리스크
5. 최근 언급된 catalyst
6. 언급 추이

누적 성향 분포:

- 긍정/부정 절대 개수
- 전체 stance 분포 막대
- 누적 성향 판정 기준

최근 변화:

- 변화 유형
- 변화 요약
- 비교한 현재 게시글과 이전 게시글 링크
- 판단 confidence

최근 주요 주장:

- 최근 30일의 서로 다른 claim 최대 5개
- 최신 순
- 각 claim에 stance, 날짜, 원문 링크 표시

리스크와 catalyst:

- 최근 30일 기준
- 같은 문구 중복 제거
- 각 항목에 최초 또는 최근 원문 링크 표시

언급 추이:

- 기본 기간 90일
- 일별 언급 수 line 또는 bar chart
- 긍정과 부정 언급 수를 구분
- 30일 이전 데이터가 부족하면 보유한 전체 기간만 표시
- 시장 가격은 언급 추이 chart에 겹쳐 그리지 않는다. 최근 거래가와 전일 대비
  변동은 table 및 상세 header에서 별도 정보로 표시한다.

#### 7.4.6 의견과 원문 탭

게시글 단위 timeline을 최신순으로 표시한다.

각 항목:

- 게시 시각
- stance
- claim type
- novelty
- conviction
- AI가 정리한 claim
- 원문 근거 문장
- 전체 게시글 펼치기
- `X에서 원문 보기` 외부 링크
- 분석 confidence
- review 상태
- 사용자 피드백

예:

```text
2026-07-18 07:42 KST   긍정 의견 · 새 주장 · 확신 보통

1.6T 광통신 수요가 예상보다 강하다는 주장

근거:
"..."

[전체 글 펼치기] [X에서 보기] [유용함] [이미 앎] [오분류]
```

필터:

- stance
- claim type
- novelty
- 날짜 범위
- 검토 필요만 보기

페이지당 20개 항목을 표시한다.

원문 표시 규칙:

- AI 요약과 원문을 시각적으로 구분한다.
- 근거 문장은 원문과 정확히 일치하는 경우에만 인용 스타일로 표시한다.
- 삭제된 게시글은 저장된 원문을 표시하고 `X 원문 이용 불가` 상태를 표시한다.
- 외부 링크는 새 탭으로 열고 `noopener noreferrer`를 사용한다.

#### 7.4.7 내 리서치 탭

초기 기능:

- Watchlist priority
- 개인 메모
- 리서치 상태

리서치 상태:

- 확인 전
- 조사 중
- 확인 완료
- 보류

후속 기능:

- 사용자 thesis
- 검증할 질문
- 관련 SEC 문서
- 가격과 실적 근거

자동 저장은 사용하지 않는다. 명시적인 저장 버튼과 저장 성공 상태를 제공한다.

### 7.5 Feedback and Review

각 종목별 의견에 다음 피드백을 남길 수 있다.

- `useful`: 추가 조사에 도움이 됨
- `known`: 맞지만 이미 알고 있던 내용
- `misclassified`: stance, ticker 또는 claim이 잘못됨

`misclassified` 선택 시 선택적으로 오류 유형을 기록한다.

- 잘못된 ticker
- 잘못된 stance
- 원문에 없는 claim
- noise
- 기타

피드백은 LLM 결과를 즉시 덮어쓰지 않는다. 검토 데이터와 모델 평가셋으로 사용한다.

### 7.6 Loading, Empty and Error States

#### Loading

- 테이블 header와 컬럼 너비를 유지하는 skeleton Row를 표시한다.
- loading text 때문에 레이아웃이 움직이지 않아야 한다.

#### Empty

상황별 문구:

- 데이터 없음: `아직 분석된 종목이 없습니다.`
- 검색 결과 없음: `조건에 맞는 종목이 없습니다.`
- 의견 없음: `이 종목에 대한 유효한 의견이 없습니다.`

#### Error

- 마지막 정상 데이터를 유지한다.
- 상단에 `마지막 갱신 실패`와 마지막 성공 시각을 표시한다.
- 사용자가 실행할 수 있는 재시도 버튼을 제공한다.
- 기술적인 stack trace는 화면에 표시하지 않는다.

#### Stale data

마지막 정상 수집 이후 6시간이 지나면 `데이터 지연` 상태를 표시한다.

### 7.7 Responsive Rules

Desktop:

- 1280px 이상에서 모든 기본 컬럼 표시
- 테이블 header 고정
- ticker/company 컬럼 고정

Tablet:

- 품질 상태와 최근 언급 컬럼 축약
- 필요하면 수평 스크롤 허용

Mobile:

- Row를 2줄 구조로 표시
- 첫 줄: ticker, 총 언급, 누적 성향, 최근 의견
- 둘째 줄: 긍정/부정 개수, 변화, 최근 언급
- company name, 7D/30D, 품질 상태는 상세 페이지에서 확인
- table을 반복 카드 목록으로 바꾸지 않는다.

### 7.8 Accessibility

- 모든 stance와 sentiment는 색상과 텍스트를 함께 사용한다.
- 분포 막대에는 screen reader용 설명을 제공한다.
- focus indicator를 항상 표시한다.
- Row, filter, sort를 키보드로 사용할 수 있어야 한다.
- tooltip 안에 핵심 정보만 두지 않는다.
- 날짜는 화면에 KST로 표시하고 접근성 label에는 전체 날짜를 제공한다.

### 7.9 Authentication and Security

- 모든 route는 Supabase Auth 로그인이 필요하다.
- 초기 인증은 email magic link를 사용한다.
- 브라우저와 Next.js 사용자 요청에서는 Supabase publishable key만 사용한다.
- service role key는 Supabase Edge Function에서만 사용한다.
- `watchlist`, `analysis_feedback`, 사용자 메모는 RLS로 사용자별 접근을 제한한다.
- 원문 텍스트를 HTML로 직접 렌더링하지 않고 escape한다.

### 7.10 Data Contract

#### 7.10.1 `tickers` table

UI를 위해 canonical ticker 정보를 별도 관리한다.

| 필드 | 타입 | 설명 |
|---|---|---|
| ticker | text primary key | 정규화 ticker |
| company_name | text | 공식 회사명 |
| exchange | text nullable | 거래소 |
| active | boolean | 활성 여부 |
| created_at | timestamptz | 생성 시각 |
| updated_at | timestamptz | 갱신 시각 |

`ticker_aliases.ticker`는 `tickers.ticker`를 참조한다.

#### 7.10.2 `watchlist` 확장

Supabase Auth 사용자를 기준으로 Watchlist와 개인 리서치 상태를 저장한다.

| 필드 | 타입 | 설명 |
|---|---|---|
| user_id | uuid | auth.users FK |
| ticker | text | tickers FK |
| priority | text | low/medium/high |
| note | text nullable | 개인 메모 |
| research_status | text | unreviewed/researching/completed/on_hold |
| active | boolean | Watchlist 활성 여부 |
| created_at | timestamptz | 생성 시각 |
| updated_at | timestamptz | 수정 시각 |

Primary key:

```text
(user_id, ticker)
```

#### 7.10.3 `analysis_feedback` table

| 필드 | 타입 | 설명 |
|---|---|---|
| id | bigint | 내부 ID |
| user_id | uuid | auth.users FK |
| post_ticker_analysis_id | bigint | 분석 FK |
| rating | text | useful/known/misclassified |
| error_type | text nullable | 오류 유형 |
| note | text nullable | 메모 |
| created_at | timestamptz | 생성 시각 |
| updated_at | timestamptz | 수정 시각 |

Unique constraint:

```text
(user_id, post_ticker_analysis_id)
```

#### 7.10.4 종목 분석 confidence와 변화 필드

`post_ticker_analyses`의 단일 `confidence`를 다음처럼 분리한다.

| 필드 | 타입 | 설명 |
|---|---|---|
| ticker_confidence | numeric | 해당 ticker가 실제 언급됐다는 확신, 0~1 |
| stance_confidence | numeric | stance 판정에 대한 확신, 0~1 |
| review_reason | text nullable | ticker/stance/claim/other |
| change_type | text nullable | first_mention/new_claim/new_risk/stance_change/repeat/unclear |
| change_summary | text nullable | 변화에 대한 짧은 설명 |
| compared_to_analysis_id | bigint nullable | 비교한 이전 post_ticker_analysis FK |

명시적 cashtag와 승인된 company alias는 `ticker_confidence = 1`로 저장한다. stance가 불명확하더라도 ticker confidence가 기준을 통과하면 총 언급 수에는 포함한다.

`first_mention`은 DB 기록으로 계산한다. 나머지 변화는 이전 분석과 비교하며, 비교 대상이 있으면 `compared_to_analysis_id`를 반드시 저장한다.

#### 7.10.5 `ticker_overview` view

Overview 테이블은 여러 API 호출을 조합하지 않고 하나의 DB view를 조회한다.

사용자별 Watchlist를 안전하게 결합하기 위해 view는 security invoker 방식으로 만들고 다음 조건으로 join한다.

```text
watchlist.user_id = auth.uid()
```

사용자 화면에서는 service role이 아니라 로그인 session이 포함된 Supabase client로 view를 조회한다.

필수 컬럼:

```ts
type TickerOverviewRow = {
  ticker: string;
  companyName: string;
  isWatchlisted: boolean;
  totalMentions: number;
  positiveCount: number;
  negativeCount: number;
  neutralCount: number;
  mixedCount: number;
  unknownCount: number;
  positiveShare: number | null;
  cumulativeSentiment:
    | "positive"
    | "negative"
    | "mixed"
    | "insufficient";
  latestStance:
    | "bullish"
    | "bearish"
    | "mixed"
    | "neutral"
    | null;
  latestClaim: string | null;
  latestChangeType:
    | "first_mention"
    | "new_claim"
    | "new_risk"
    | "stance_change"
    | "repeat"
    | "unclear"
    | null;
  mentions7d: number;
  mentions30d: number;
  uniqueThreads: number;
  lastMentionedAt: string;
  needsReviewCount: number;
};
```

View 규칙:

- 현재 활성 분석 버전만 사용한다.
- ticker/post 조합은 한 번만 집계한다.
- Overview와 상세 페이지가 같은 view 규칙을 공유한다.
- count와 sentiment 계산은 클라이언트에서 다시 하지 않는다.

#### 7.10.6 상세 조회

상세 페이지 timeline은 다음 join을 사용한다.

```text
post_ticker_analyses
  -> post_analyses
  -> posts
  -> analysis_feedback
```

정렬:

```text
posts.posted_at desc
post_ticker_analyses.id desc
```

### 7.11 Frontend Technology

- Next.js App Router
- TypeScript
- Tailwind CSS
- shadcn/ui primitives
- TanStack Table
- Supabase SSR client
- Recharts는 언급 추이 차트에만 사용
- Lucide icons

구현 원칙:

- 초기 데이터는 Server Component에서 조회한다.
- 필터, 정렬, pagination은 URL query와 서버 조회를 사용한다.
- Watchlist와 feedback mutation 후 해당 query만 갱신한다.
- count와 sentiment를 브라우저에서 재계산하지 않는다.

### 7.12 Performance

- 500개 ticker 기준 첫 페이지 DB query p95 500ms 이하
- 첫 화면 주요 콘텐츠 표시 2초 이하
- 필터 변경 후 결과 표시 1초 이하
- 테이블 Row 높이와 컬럼 너비는 데이터 로딩 전후 동일
- Overview query에는 필요한 index와 실행 계획을 검토한다.

권장 index:

```text
posts(posted_at desc)
post_analyses(post_id, created_at desc)
post_ticker_analyses(ticker, post_analysis_id)
post_ticker_analyses(review_status, ticker_confidence, stance_confidence)
watchlist(user_id, ticker, active)
analysis_feedback(user_id, post_ticker_analysis_id)
```

### 7.13 Analytics

개인용 MVP에서는 외부 analytics 도구를 붙이지 않는다.

필요하면 다음 이벤트를 Supabase table에 기록한다.

- ticker_row_opened
- source_link_opened
- filter_applied
- feedback_submitted

사용 가치 판단에는 page view보다 `source_link_opened`와 `feedback_submitted`를 우선한다.

### 7.14 Assumptions

1. 총 언급 수와 성향 분포가 종목 비교의 가장 중요한 지표다.
2. 사용자는 누적 성향과 최근 의견을 구분할 수 있다.
3. 0.65/0.35 누적 성향 기준이 직관적인 결과를 만든다.
4. 50개 Row pagination이면 탐색에 충분하다.
5. 상세 페이지의 opinion timeline이 별도 thesis 문서보다 먼저 필요하다.
6. 회사명과 ticker를 관리할 canonical `tickers` table이 필요하다.

### 7.15 Non-goals

초기 Web UI에서 제외한다.

- 시스템 자체의 매수/매도 의견
- 목표 주가
- 실시간 스트리밍 주가와 장중 tick chart
- 수익률과 백테스트
- 자동 생성된 종목 thesis 편집
- 여러 인플루언서 비교
- SEC와 실적 데이터
- 실시간 push notification 설정
- 자유 형식 대화형 AI

## 8. Release

### 8.1 UI Release 0: Data Foundation

예상 범위: 약 2~3일

포함:

- `tickers` table
- `analysis_feedback` table
- `ticker_overview` view
- 집계 SQL 테스트
- Supabase Auth와 RLS

완료 기준:

- 샘플 데이터의 총 언급과 성향 개수가 수동 계산과 일치한다.
- Overview와 상세 페이지가 같은 집계 결과를 반환한다.
- 다른 사용자 데이터에 접근할 수 없다.

### 8.2 UI Release 1: Overview

예상 범위: 약 3~5일

포함:

- Ticker Overview
- 전체 컬럼
- 검색, 필터, 정렬
- URL 상태
- pagination
- Watchlist toggle
- loading, empty, error 상태
- desktop/mobile responsive

완료 기준:

- 총 언급과 긍정/부정 개수를 Row에서 바로 확인할 수 있다.
- Row 선택으로 정확한 ticker 상세 route로 이동한다.
- 모든 필터와 정렬이 새로고침 후 유지된다.

### 8.3 UI Release 2: Ticker Detail

예상 범위: 약 3~5일

포함:

- Header와 metrics strip
- 개요 탭
- 의견과 원문 timeline
- X 원문 링크
- 내 리서치 탭
- feedback

완료 기준:

- Row의 모든 집계 값을 상세 페이지에서 재확인할 수 있다.
- 각 AI claim에 원문 또는 원문 이용 불가 상태가 있다.
- 의견 timeline을 stance와 날짜로 필터링할 수 있다.

### 8.4 UI Release 3: Quality Improvements

실제 사용 후 필요한 항목만 진행한다.

포함 후보:

- Review queue
- 테이블 column visibility
- saved filters
- Daily Brief route
- 분석 결과 수동 수정

진입 기준:

- Overview와 상세 페이지가 2주 이상 반복 사용된다.
- 사용자가 자주 수행하는 필터와 검토 흐름이 확인된다.

## Appendix A. Acceptance Criteria

### Overview

- [ ] 총 언급 수가 같은 ticker의 유효한 distinct post 수와 일치한다.
- [ ] 긍정과 부정 절대 개수가 항상 Row에 표시된다.
- [ ] 누적 성향은 명시된 threshold로 계산된다.
- [ ] 최근 의견은 가장 최근 유효 게시글의 stance와 일치한다.
- [ ] repost와 rejected 분석은 집계에서 제외된다.
- [ ] ticker가 확정되고 stance만 needs_review인 글은 총 언급에 포함된다.
- [ ] ticker 판정이 needs_review인 글은 총 언급에 포함되지 않는다.
- [ ] stance confidence가 기준 미만인 글은 긍정/부정 집계에 포함되지 않는다.
- [ ] Row click, Enter, 새 탭 열기가 모두 동작한다.
- [ ] Watchlist toggle이 Row navigation을 일으키지 않는다.
- [ ] 필터와 정렬이 URL에 저장된다.
- [ ] 색상을 보지 않아도 모든 성향을 구분할 수 있다.

### Ticker Detail

- [ ] Overview와 동일한 총 언급 및 성향 개수를 표시한다.
- [ ] 의견 항목마다 게시 시각, stance, claim, 근거, 원문 링크를 표시한다.
- [ ] 삭제된 게시글도 저장 원문과 이용 불가 상태를 표시한다.
- [ ] AI 요약과 원문이 명확히 구분된다.
- [ ] X 링크가 올바른 게시글을 새 탭으로 연다.
- [ ] 사용자 feedback을 한 분석당 하나만 저장한다.
- [ ] 모바일에서 텍스트와 버튼이 겹치지 않는다.

### Security and Reliability

- [ ] 로그인하지 않은 사용자는 페이지 데이터에 접근할 수 없다.
- [ ] service role key가 브라우저 bundle에 포함되지 않는다.
- [ ] 사용자 입력과 X 원문은 escape 후 렌더링된다.
- [ ] 마지막 수집 실패 시 기존 데이터를 계속 볼 수 있다.
- [ ] 6시간 이상 갱신되지 않은 데이터는 지연 상태를 표시한다.

## Appendix B. 초기 기본값

초기 구현은 아래 값을 사용하고, 실제 샘플 데이터 평가 후 조정한다.

1. 누적 성향 threshold: `0.65 / 0.35`
2. 자동 승인 confidence threshold: `0.75`
3. 기본 정렬: `총 언급 desc`, 이후 `최근 언급 desc`
4. mixed 처리: 방향 비율에서 제외하고 절대 개수에는 포함
5. 언급 추이 차트: UI Release 2에 포함
