# PRD: 종합 신호 성과와 방향 적중

> 상태: Release 0 검증 완료 · Release 1 데이터 모델 및 Release 2 핵심 UI 구현  
> 작성일: 2026-08-01  
> 상위 문서: `PRD-serenity-web-ui.md`  
> 관련 문서: `UX-SPEC-serenity-investment-intelligence.md`, `TECH-SPEC-serenity-investment-intelligence.md`  
> 범위: 인플루언서 종합 관점 생성, 신호 이후 가격 성과, 방향 적중 판정

## 1. Summary

이 기능은 여러 인플루언서의 최근 관점을 하나의 시점 고정 신호로 만들고,
그 신호 이후 주가가 실제로 같은 방향으로 움직였는지 보여준다. 사용자는 종목
목록에서 `종합 신호`, `신호 이후 수익률`, `방향 결과`를 한눈에 비교하고,
상세 화면에서 신호를 만든 분석가와 원문, 기준 가격, 기간별 성과를 검증한다.

이 기능은 매수·매도 추천이나 투자 성과 보장이 아니다. 과거 공개 관점과 이후
시장 움직임을 재현 가능한 규칙으로 연결하는 검증 도구다.

## 2. Contacts

| 역할 | 담당 | 책임 |
|---|---|---|
| Product Owner | 사용자 | 종합 신호와 적중 판정 기준 승인 |
| Product/UX | 사용자 + Codex | 정보 우선순위, 용어, 화면 흐름 |
| Engineering | 사용자 + Codex | 가격 수집, 신호 재생, 성과 계산, UI |
| Opinion Data | 공개 X 게시글 분석 | 신호 입력과 근거 원문 |
| Market Data | 승인된 EOD 가격 제공자 | 수정 가격과 거래일 정보 |

## 3. Background

### 3.1 현재 제품이 답하는 질문

현재 제품은 다음을 잘 보여준다.

- 어떤 종목이 많이 언급됐는가?
- 긍정과 부정 중 무엇이 우세한가?
- 최근 의견과 누적 관점이 다른가?
- 어떤 원문이 해당 판단의 근거인가?

그러나 사용자가 최종적으로 확인하려는 질문에는 답하지 못한다.

> “인플루언서들의 종합 관점이 나온 뒤 주가는 실제로 같은 방향으로
> 움직였는가?”

현재 구현의 `최근 가격 / 1D`는 하루 변동만 보여준다. 관점이 형성된 시점과
연결되지 않으므로 신호의 유용성이나 방향 적중 여부를 판단할 수 없다.

### 3.2 왜 지금 필요한가

- 종목과 원문 분석 데이터가 이미 시각 순서대로 저장된다.
- 분석가별 최신 stance와 변화 유형을 구분할 수 있다.
- 실시간 가격이 필요하지 않다는 제품 제약이 확인됐다.
- 하루 한 번의 수정 가격만으로도 신호 이후 성과를 계산할 수 있다.

### 3.3 핵심 문제

단순히 현재 누적 관점을 과거 가격에 붙이면 사후 편향이 생긴다. 오늘의 누적
관점은 과거 게시글 이후 새로 들어온 정보까지 포함하기 때문이다. 따라서
성과를 계산하려면 당시 사용 가능했던 정보만으로 종합 관점을 다시 만들고,
그 순간의 구성 분석가와 계산 규칙을 고정해야 한다.

### 3.4 제품 원칙

1. **신호는 시점에 고정한다.** 이후 데이터로 과거 신호를 바꾸지 않는다.
2. **가격보다 결과를 먼저 보여준다.** 절대 가격보다 신호 이후 수익률과 방향
   일치 여부를 우선한다.
3. **분석가마다 한 표만 가진다.** 게시 빈도가 높은 계정이 종합 신호를
   지배하지 않게 한다.
4. **결과는 근거로 돌아갈 수 있어야 한다.** 모든 신호는 당시 분석가 관점과
   원문을 보존한다.
5. **표본 부족을 숨기지 않는다.** 작은 표본은 백분율보다 건수로 표시한다.
6. **평가 불가와 실패를 구분한다.** 가격 누락, 기간 미도래, 혼재 관점을
   미적중으로 계산하지 않는다.
7. **공식을 버전으로 관리한다.** 기준 변경 시 과거 결과를 조용히 덮어쓰지
   않는다.

## 4. Objective

### 4.1 사용자 목표

사용자가 종목 목록에서 10초 안에 다음을 판단하게 한다.

- 현재 종합 신호가 긍정인지 부정인지
- 종합 신호가 언제 형성됐는지
- 신호 이후 주가가 몇 퍼센트 움직였는지
- 기본 평가 기간에서 방향이 맞았는지
- 결과를 믿기 위한 분석가 수와 표본이 충분한지

### 4.2 제품 목표

- 공개 관점을 단순 요약에서 검증 가능한 시계열 신호로 발전시킨다.
- 사용자가 인기나 언급량뿐 아니라 실제 이후 결과로 종목을 비교하게 한다.
- 과장된 수익률 홍보가 아니라 재현 가능한 신뢰 지표를 만든다.

### 4.3 Key Results

첫 릴리스 후 4주 동안 다음을 확인한다.

| Key Result | 목표 |
|---|---:|
| 사용자가 종합 방향·이후 수익률·결과를 찾는 시간 | 10초 이하 |
| 신호에서 당시 분석가 snapshot과 원문까지 이동 | 2회 이하 interaction |
| 같은 입력으로 신호 재계산 시 결과 일치 | 100% |
| Overview와 상세의 수익률·판정 불일치 | 0건 |
| 신호 성과에 가격 기준일과 데이터 기준일 표시 | 100% |
| 가격 누락을 0% 수익률로 잘못 표시 | 0건 |
| 사후 데이터가 과거 신호 구성에 포함 | 0건 |

사용성 검증에서는 대표 종목 5개로 과제를 수행한다. 5개 중 4개 이상에서
사용자가 도움 없이 올바른 종합 방향과 결과를 설명할 수 있어야 한다.

## 5. Market Segment(s)

### 5.1 Primary Segment

여러 인플루언서의 공개 의견을 리서치 입력으로 사용하지만, 그 의견을 그대로
신뢰하지 않고 실제 이후 결과와 원문을 함께 검토하는 개인 투자자다.

### 5.2 핵심 Job

> “여러 사람이 긍정적으로 본 종목 중 실제로 주가가 따라온 종목과 그렇지
> 않은 종목을 빠르게 구분하고, 왜 그런 신호가 만들어졌는지 확인하고 싶다.”

### 5.3 사용 제약

- 데스크톱 비교가 주 사용 환경이며 모바일에서도 핵심 결과를 확인한다.
- 실시간 매매 도구가 아니므로 장중 tick 정확도는 필요하지 않다.
- 가격 데이터는 하루 한 번 갱신돼도 된다.
- 초기에는 개인·내부·비상업 용도다.
- 외부 공개 전에는 가격 제공자의 display/redistribution 권한을 다시 확인한다.

## 6. Value Proposition(s)

| 사용자 문제 | 현재 경험 | 새 경험 |
|---|---|---|
| 긍정 언급이 실제로 맞았는지 모름 | 원문과 현재 관점만 확인 | 신호 이후 수익률과 방향 결과 확인 |
| 게시량이 많은 분석가가 여론을 지배 | 전체 게시글 수 중심 | 분석가별 최신 의견 한 표씩 반영 |
| 오늘의 관점을 과거에 소급할 위험 | 시점 snapshot 없음 | 당시 정보만 저장한 신호 event |
| 작은 표본의 적중률이 과장될 수 있음 | 표본 규칙 없음 | 성숙 신호 수와 분자/분모 동시 표시 |
| 결과가 왜 나왔는지 알기 어려움 | 가격과 원문이 분리 | 결과 → 신호 구성 → 원문 흐름 |

### 6.1 Value Curve

강화한다.

- 시점 정확성
- 결과 설명 가능성
- 표본 투명성
- 원문 추적성
- 종목 간 비교 속도

줄인다.

- 실시간 가격 갱신 빈도
- 장중 가격 소음
- 단순 언급량의 영향
- 근거 없는 성공률 강조

제거한다.

- 전일 대비 변동을 핵심 신호처럼 보여주는 방식
- 비공식 웹사이트 가격 scraping 의존
- 현재 집계 결과를 과거에 소급하는 계산

## 7. Solution

### 7.1 핵심 용어

| 용어 | 정의 |
|---|---|
| 의견 | 한 분석가가 한 종목에 밝힌 유효 stance |
| 분석가 snapshot | 특정 시점 기준 각 분석가의 가장 최근 유효 의견 |
| 종합 상태 | snapshot을 동일 가중치로 합친 positive/negative/mixed/insufficient 상태 |
| 종합 신호 | 종합 상태가 방향성을 처음 얻거나 반대 방향으로 바뀐 event |
| 기준가 | 신호 다음 정규 거래 세션의 수정 시가 |
| 신호 이후 수익률 | 기준가부터 가장 최근 수정 종가까지의 변화율 |
| 고정 기간 결과 | 신호 후 5·20·60거래일 수정 종가 기준 수익률 |
| 방향 결과 | 고정 기간 수익률과 신호 방향이 일치하는지 판정한 상태 |
| 방향 적중률 | 평가 기간이 지난 신호 중 `방향 일치` 비율 |

사용자 화면에서는 `정답`, `예측 성공`보다 `방향 일치`, `방향 불일치`를
우선 사용한다. `적중률`은 여러 개의 성숙 신호를 집계할 때만 사용한다.

### 7.2 종합 상태 계산

#### 7.2.1 입력 자격

분석가 의견은 다음 조건을 모두 충족할 때만 종합 상태에 포함한다.

- ticker 판정이 승인됐거나 자동 승인 기준을 통과함
- stance confidence가 `0.75` 이상
- stance가 `bullish` 또는 `bearish`
- 해당 시점 기준 가장 최근의 유효 방향 의견임
- 게시 시점으로부터 `90일` 이내임

일반적인 `neutral`, `mixed`, `unknown` 분석은 사실 보도나 불명확한 문맥 때문에
생길 수 있으므로 기존 방향 투표를 자동으로 제거하지 않는다. 비방향 분석이
명시적인 `stance_change`로 승인된 경우에만 기존 투표를 제거한다. 같은
분석가의 반복 게시물은 표 수를 늘리지 않는다.

#### 7.2.2 동일 가중치

각 분석가는 한 표를 가진다.

```text
positive_share = bullish_analysts / directional_analysts
negative_share = bearish_analysts / directional_analysts
```

종합 상태 기본값:

| 조건 | 종합 상태 |
|---|---|
| 방향 분석가 2명 미만 | insufficient |
| positive_share ≥ 2/3 | positive |
| negative_share ≥ 2/3 | negative |
| 그 외 | mixed |

내부 계산에는 정확한 `2/3`를 사용하고 화면에는 `67%`로 반올림해 표시한다.
decimal `0.67`을 직접 비교하면 3명 중 2명인 `66.67%`가 탈락하므로 사용하지
않는다. `90일`은 초기 가설이며 실제 분포를 확인한 뒤 calculation version을
올려 변경할 수 있다.

### 7.3 종합 신호 생성

새 유효 의견이 들어올 때 종합 상태를 다시 계산한다. 다음 경우에만 신호를
생성한다.

| 변화 | 신호 유형 | 생성 여부 |
|---|---|---|
| insufficient/mixed → positive | positive entry | 생성 |
| insufficient/mixed → negative | negative entry | 생성 |
| positive → negative | bearish flip | 생성 |
| negative → positive | bullish flip | 생성 |
| positive → positive | reinforcement | V1에서는 생성하지 않음 |
| negative → negative | reinforcement | V1에서는 생성하지 않음 |
| directional → mixed/insufficient | signal exit | 종료 기록만 생성 |

의견 TTL 만료는 매일 상태를 재계산해 기존 신호를 종료할 수 있지만, 새 게시글
없이 만료만으로 positive/negative entry 또는 flip을 만들지는 않는다.

신호에는 다음 정보를 변경 불가능한 snapshot으로 저장한다.

- 신호 시각과 방향
- 이전 종합 상태
- 참여 분석가와 각 stance
- 제외된 분석가와 제외 사유
- 계산에 사용한 게시글과 원문 URL
- 분석가 수와 찬성/반대 수
- confidence와 review 상태
- 계산 공식 version

백필 시에는 게시글을 `posted_at`, 이후 고유 ID 순으로 재생한다. 각 시점에는
그 시점까지 존재한 데이터만 사용한다.

### 7.4 가격 기준과 수익률

#### 7.4.1 가격 데이터

- 미국 시장의 일별 OHLC와 adjusted close를 사용한다.
- stock split과 dividend를 반영할 수 있는 수정 가격을 우선한다.
- 제공자가 adjusted open을 직접 주지 않으면 같은 거래일의
  `adjusted_close / close` 비율을 raw open에 적용해 계산하고 계산 방식을
  기록한다.
- 가격 source와 수집 시각을 모든 row에 저장한다.
- 장 마감 후 하루 한 번 수집한다.
- 화면 요청 중에는 외부 가격 API를 호출하지 않는다.

#### 7.4.2 기준가

기본 기준가는 신호가 발생한 다음 정규 거래 세션의 `adjusted open`이다.
다음 시가가 제공되지 않으면 해당 신호를 `data_missing`으로 두며 같은 날
종가로 조용히 대체하지 않는다.

이 규칙은 게시물이 장중·장후·휴장일 중 언제 작성됐는지와 관계없이 동일한
진입 기준을 만들고, 게시 전에 이미 발생한 가격 변화를 성과로 포함하지 않게
한다.

#### 7.4.3 수익률

```text
raw_return = (exit_adjusted_close / entry_adjusted_open - 1) × 100
signed_return = positive 신호면 raw_return
                negative 신호면 -raw_return
```

표시 기간:

- `현재까지`: 가장 최근 정상 종가
- `5D`: 5번째 거래일 종가
- `20D`: 20번째 거래일 종가, 기본 적중 평가 기간
- `60D`: 60번째 거래일 종가

UI에서는 `20D`를 `1개월`로 쓰고 tooltip에서 `20거래일`임을 설명한다.

### 7.5 방향 결과와 적중률

#### 7.5.1 단일 신호 판정

20거래일 signed return을 기준으로 판정한다.

| signed return | 방향 결과 |
|---:|---|
| `≥ +2%` | direction_aligned |
| `≤ -2%` | direction_opposed |
| `-2% 초과, +2% 미만` | flat |
| 20거래일 미도래 | in_progress |
| 종합 상태가 mixed/insufficient | not_evaluable |
| 기준가 또는 결과 가격 누락 | data_missing |

화면 label:

| 내부 값 | 사용자 label |
|---|---|
| direction_aligned | 방향 일치 |
| direction_opposed | 방향 불일치 |
| flat | 큰 변화 없음 |
| in_progress | 평가 중 |
| not_evaluable | 판정 제외 |
| data_missing | 가격 확인 필요 |

`±2%` 중립 구간은 작은 시장 소음을 적중으로 과장하지 않기 위한 초기값이다.
수익률 숫자는 판정과 관계없이 그대로 표시한다.

#### 7.5.2 집계 적중률

```text
20D 방향 적중률 = direction_aligned 신호 수
                  / 20D가 지난 평가 가능 신호 수
```

`flat`은 분모에 포함하고 분자에는 포함하지 않는다. `in_progress`,
`not_evaluable`, `data_missing`은 분모에서 제외한다.

표시 규칙:

- 항상 `68% · 13/19`처럼 비율과 절대 건수를 함께 표시한다.
- 성숙 신호가 5건 미만이면 백분율 대신 `표본 3건 · 판단 보류`로 표시한다.
- 종목 Row에서는 현재 활성 신호의 결과를 먼저 보여준다.
- 전체 적중률은 별도 요약 영역에서만 보여주며 종목별 결과와 혼합하지 않는다.
- V1에서는 개별 인플루언서 순위나 리더보드를 만들지 않는다.

### 7.6 Overview UX

#### 7.6.1 정보 우선순위

Overview의 판단 순서를 다음과 같이 변경한다.

```text
종목
  → 분석가별 최근 관점
  → 현재 종합 신호
  → 신호 이후 수익률
  → 1개월 방향 결과
  → 언급량과 근거 변화
```

`최근 가격 / 1D` 열은 제거한다. 절대 가격은 상세 화면의 기준가 설명에서만
보조 정보로 사용한다.

#### 7.6.2 권장 Table

```text
종목   분석가별 최근 관점        종합 신호       신호 이후       1개월 결과       총 언급   최근 변화
---------------------------------------------------------------------------------------------------
COHR   Serenity ↑ · Shay ↑       긍정 · 32일     +24.8%          ✓ 방향 일치      47       새 주장
LITE   Serenity ↓ · Shay ↓       부정 · 18일     -11.2%          평가 중          24       방향 전환
ASTS   Serenity ↑ · Shay 혼재    긍정 · 27일     -6.7%           × 방향 불일치    15       새 리스크
```

표시 규칙:

- `신호 이후`에는 방향과 무관한 실제 주가 수익률을 표시한다.
- `1개월 결과`가 방향을 해석한다.
- 부정 신호 뒤 주가가 내린 경우 수익률은 `-11.2%` 그대로 표시하되 결과는
  `방향 일치`다.
- 색상 외에 `↑/↓`, 부호, label을 함께 사용한다.
- 결과 열 tooltip에는 기준일, 기준가, 평가일, 평가가를 표시한다.
- 수익률과 방향 결과로 정렬할 수 있다.
- 모바일에서는 `종합 신호`, `신호 이후`, `결과`를 유지하고 언급 분포를
  후순위로 이동한다.
- 현재 종합 상태가 mixed/insufficient이면 `활성 신호 없음`을 표시한다.
  결과 열에는 가장 최근에 종료된 방향 신호의 1개월 결과를 날짜와 함께
  secondary text로 제공한다.

#### 7.6.3 필터

추가한다.

- 종합 신호: 긍정 / 부정 / 혼재 / 표본 부족
- 방향 결과: 일치 / 불일치 / 큰 변화 없음 / 평가 중
- 신호 나이: 5D 미만 / 5~20D / 20D 이상
- 최소 참여 분석가 수

기본 정렬 후보:

1. 최근 종합 신호 발생 시각 내림차순
2. 총 언급 수 내림차순

사용성 검증에서 두 정렬을 비교한다.

### 7.7 Ticker Detail UX

#### 7.7.1 Header

```text
COHR  Coherent Corp.

현재 종합 신호  긍정
2026.06.18 형성 · 분석가 3/4명 긍정

기준가 $102.40  →  최근 종가 $127.80     +24.8%
1개월 결과  ✓ 방향 일치                  가격 기준 2026.07.31
```

기존 `최근 가격 / 1D` block을 위 성과 block으로 교체한다. 종합 신호와
수익률은 인접하게 배치하되, 신호와 시장 결과가 서로 다른 데이터임을 label로
구분한다.

#### 7.7.2 개요 탭 순서

1. 현재 종합 신호와 시장 반응
2. 신호를 만든 분석가별 최근 관점
3. 가격과 신호 timeline
4. 최근 변화와 주요 주장
5. 리스크와 catalyst
6. 누적 성향과 언급 추이

#### 7.7.3 가격과 신호 Timeline

- adjusted close line을 표시한다.
- positive entry/flip은 `긍정 신호`, negative entry/flip은 `부정 신호`라는
  세로 marker로 표시한다.
- hover에는 날짜, 종가, 당시 종합 상태, 참여 분석가 수를 표시한다.
- marker를 선택하면 신호 snapshot과 근거 원문 목록으로 이동한다.
- 언급량 chart와 가격 chart는 축을 공유하거나 겹쳐 그리지 않는다.
- V1에서는 candlestick, intraday, volume을 표시하지 않는다.

#### 7.7.4 신호 이력

```text
날짜        신호       참여       5D       1개월      3개월      결과
2026.06.18  긍정 전환  3 / 4      +6.2%    +18.4%    평가 중     방향 일치
2026.02.03  부정 전환  2 / 3      -3.1%    +4.8%     +1.2%       방향 불일치
```

각 행에서 다음을 확인할 수 있어야 한다.

- 계산 공식 version
- 기준가와 평가 가격
- 당시 분석가별 stance
- 포함·제외 사유
- 근거 원문
- 가격 source와 기준일

### 7.8 데이터 모델

#### 7.8.1 `market_daily_prices`

| 필드 | 내용 |
|---|---|
| ticker | canonical ticker FK |
| trading_date | 거래일 |
| open/high/low/close | 원시 OHLC |
| adjusted_open | 수정 시가, 제공 시 |
| adjusted_close | 수정 종가 |
| volume | 거래량, nullable |
| currency | 기본 USD |
| provider | 가격 제공자 |
| provider_symbol | 제공자 ticker |
| fetched_at | 마지막 정상 수집 시각 |

Primary key는 `(ticker, trading_date, provider)`다.

#### 7.8.2 `consensus_signal_events`

| 필드 | 내용 |
|---|---|
| id | signal ID |
| ticker | canonical ticker FK |
| occurred_at | 신호를 만든 게시글 시각 |
| direction | positive / negative |
| previous_state | 이전 종합 상태 |
| signal_type | entry / flip |
| trigger_analysis_id | 신호를 만든 분석 ID |
| analyst_snapshot | 분석가·stance·근거 JSON snapshot |
| directional_count | 방향 분석가 수 |
| agreeing_count | 신호 방향 분석가 수 |
| calculation_version | 계산 공식 version |
| entry_trading_date | 다음 정규 거래일 |
| entry_price | 수정 시가 |
| price_provider | 기준가 제공자 |
| ended_at | 신호 종료 시각, nullable |
| ended_reason | mixed / insufficient / flipped, nullable |
| created_at | event 저장 시각 |

같은 calculation version에서 동일한 원인 게시글로 중복 신호를 만들 수 없다.

#### 7.8.3 `signal_outcomes`

| 필드 | 내용 |
|---|---|
| signal_id | consensus signal FK |
| horizon_sessions | 5 / 20 / 60 |
| evaluation_date | 실제 평가 거래일 |
| exit_price | 수정 종가 |
| raw_return_pct | 실제 주가 수익률 |
| signed_return_pct | 신호 방향 반영 수익률 |
| verdict | aligned / opposed / flat / pending / missing |
| calculated_at | 계산 시각 |
| calculation_version | 결과 공식 version |

Primary key는 `(signal_id, horizon_sessions, calculation_version)`다.

### 7.9 처리 흐름

```text
유효 게시글 분석 저장
  → 해당 시점의 분석가별 최신 stance 재계산
  → 종합 상태 계산
  → 상태 진입/전환이면 signal snapshot 저장
  → 다음 거래일 수정 시가 연결
  → 매일 EOD 가격 upsert
  → 5/20/60 거래일 outcome 계산
  → Overview와 상세 view 갱신
```

#### 7.9.1 Historical Backfill

1. 가격 제공자에서 필요한 기간의 일별 수정 가격을 한 번 수집한다.
2. 유효 게시글을 시간순으로 재생해 과거 종합 상태를 복원한다.
3. 신호 event를 생성한다.
4. 다음 거래일 기준가와 5/20/60D 결과를 연결한다.
5. 표본 종목을 수동 계산해 SQL 결과와 비교한다.

백필 범위는 현재 보유한 분석 가능한 게시글의 최초 일자부터 시작한다. 가격은
첫 게시일보다 최소 5거래일 앞에서 시작한다.

#### 7.9.2 Daily Update

- 미국 정규장 종료 후 하루 한 번 실행한다.
- 활성 ticker의 최신 거래일 가격을 idempotent upsert한다.
- 새로 성숙한 outcome만 계산한다.
- 실패 시 마지막 정상 가격과 결과를 유지한다.
- 재시도는 rate limit과 `Retry-After`를 따른다.
- UI 요청은 외부 가격 API를 직접 호출하지 않는다.

### 7.10 데이터 품질과 편향 방지

| 위험 | 방지 방법 |
|---|---|
| Look-ahead bias | 게시글 시간순 replay와 immutable snapshot |
| 게시 빈도 편향 | 분석가별 최신 의견 한 표 |
| 오래된 의견 잔존 | 90일 TTL |
| 작은 표본 과장 | 5건 미만 percentage 숨김 |
| 미세 변동을 적중 처리 | ±2% flat 구간 |
| 휴장일·장후 게시물 혼동 | 다음 정규 세션 수정 시가 사용 |
| Split/dividend 왜곡 | adjusted 가격과 재계산 |
| 삭제·오분류 원문 | snapshot 보존, review 상태 표시 |
| 제공자 가격 누락 | missing 상태, 임의 대체 금지 |
| 공식 변경으로 결과 변동 | calculation version 병기 |
| 생존자 편향 | 비활성·상장폐지 ticker도 과거 평가에 유지 |
| 시장 전체 상승 착시 | V2에서 SPY 상대수익률 병기 |

### 7.11 상태와 예외

- 아직 기준 거래일이 없으면 `기준가 대기`를 표시한다.
- 20거래일이 지나지 않았으면 `평가 중 · 12/20거래일`을 표시한다.
- 가격 수집이 2거래일 이상 늦으면 `가격 지연`을 표시하고 마지막 정상값을
  유지한다.
- 신호 계산에 사용된 의견이 review에서 오분류로 확정되면 기존 event를
  삭제하지 않는다. 새 calculation version으로 재계산하고 변경 이유를 남긴다.
- 합병, ticker 변경, 상장폐지는 canonical ticker mapping으로 과거 가격을
  연결한다.

### 7.12 Analytics

기능 사용성을 확인하기 위해 다음 event를 기록한다.

- `signal_performance_sorted`
- `signal_result_filtered`
- `signal_history_opened`
- `signal_evidence_opened`
- `signal_formula_opened`

핵심 행동 지표는 page view가 아니라 `signal_evidence_opened`다. 성과를 본 뒤
근거까지 확인하는 비율이 높아야 이 기능이 단순 수익률 순위표가 아닌 리서치
도구로 작동한다고 판단한다.

### 7.13 Assumptions

검증이 필요한 가설이다.

1. 최신 stance를 분석가별 한 표로 합치는 방식이 전체 게시글 수 가중치보다
   사용자 기대에 가깝다.
2. 최소 2명, 67% 동의가 의미 있는 종합 신호를 만든다.
3. 의견 유효기간 90일이 장기 관점과 데이터 신선성의 균형점이다.
4. 다음 거래일 수정 시가가 가장 공정하고 설명 가능한 기준가다.
5. 20거래일이 사용자가 기대하는 기본 평가 기간에 가깝다.
6. ±2% flat 구간이 작은 시장 소음을 적중으로 과장하지 않는다.
7. V1에서는 절대 수익률만으로도 핵심 가치 검증이 가능하다.

### 7.14 Non-goals

V1에서는 다음을 하지 않는다.

- 실시간·장중 가격과 candlestick
- 매수·매도·목표가 추천
- 실제 포트폴리오 수익률 계산
- 세금, 수수료, slippage 반영
- 자동 주문 또는 alert
- 개별 인플루언서 순위와 경쟁형 leaderboard
- 적중률을 미래 성과 보장처럼 표현
- 시장 benchmark와 sector 중립화
- 옵션·공매도 성과

## 8. Release

### 8.1 Release 0: Method Validation

예상 범위: 짧은 설계·검증 단계

포함:

- 종합 상태, 신호, 기준가, 결과 공식 확정
- 실제 종목 5개를 spreadsheet로 수동 계산
- 90일 TTL, 정확한 2/3 동의, 20D, ±2% 기준 민감도 비교
- 가격 제공자 라이선스와 adjusted price 지원 확인

완료 기준:

- 동일 입력으로 수동 계산과 코드 결과가 일치한다.
- 과거 시점에 미래 의견이 포함되지 않는다.
- 제품 용어를 사용자에게 설명했을 때 오해가 없다.

#### Release 0 계산 검증 결과

- 검증일: 2026-08-01
- 대상: COHR, AAOI, LITE, NVDA, ASTS
- 원천 분석: 307건, 분석가 5명
- 종합 신호 event: 15건
- 20거래일 성숙 event: 5건
- 20거래일 결과: 방향 일치 0건, 보합 2건, 방향 불일치 3건
- 계산 check: 기준가 누락 0건, 원문 URL 누락 0건, formula error 0건

결론:

- 시점 고정 replay와 가격 성과 연결은 기술적으로 재현 가능하다.
- 현재 표본으로 신호 성과가 좋다고 주장할 수 없다. 기능은 성과 홍보보다
  긍정 언급과 실제 결과를 분리해 보여주는 검증 도구로 제공한다.
- 종목별 성숙 신호가 5건 미만이면 percentage 적중률을 숨긴다.
- 일반 비방향 분석이 기존 표를 지우면 entry가 반복 생성되는 문제가 있어,
  명시적 `stance_change`인 경우에만 방향표를 제거하도록 수정했다.
- 검증용 가격 endpoint는 제품 런타임에 사용하지 않는다. 운영 공개 전
  승인된 EOD 제공자와 display/redistribution 권한을 확정한다.

### 8.2 Release 1: Data Foundation

예상 범위: 약 3~5일

포함:

- `market_daily_prices`
- `consensus_signal_events`
- `signal_outcomes`
- 가격 historical backfill과 daily EOD sync
- 게시글 chronological replay
- SQL 단위 테스트와 데이터 품질 상태

완료 기준:

- 표본 5종목의 모든 신호가 수동 계산과 일치한다.
- sync 재실행 시 중복 row가 생기지 않는다.
- 가격 실패가 기존 정상 결과를 삭제하지 않는다.

### 8.3 Release 2: Overview Core Signal

예상 범위: 약 2~4일

2026-08-01 구현 상태:

- 종목 Row의 `최근 가격 / 1D`를 현재 종합 신호, 신호 이후 수익률,
  1개월 결과로 교체했다.
- 상세 header에 동일한 신호·기준가·최근 종가·결과 block을 연결했다.
- 종목 Row에 최근 20거래일 조정 종가 추세, 최근 종가, 20D 변동률을 추가했다.
- `ticker_signal_performance` view가 아직 없으면 검증 대상 5종목은 Release 0
  스냅샷을 표시하고, 그 밖의 종목은 명시적인 미적재 상태를 표시한다.
- 방향 결과 filter·sort와 기준 가격 tooltip은 후속 범위로 남아 있다.

포함:

- `최근 가격 / 1D`를 `신호 이후`와 `1개월 결과`로 교체
- 종합 신호와 참여 분석가 수
- 방향 결과 filter와 sort
- 모바일 핵심 신호 유지
- 기준일과 가격 tooltip

완료 기준:

- Row를 열지 않고 신호 방향, 이후 수익률, 결과를 확인한다.
- 색상 없이도 positive/negative와 aligned/opposed를 구분한다.
- 가격 또는 신호가 없을 때 이유가 표시된다.

### 8.4 Release 3: Detail Evidence

예상 범위: 약 3~5일

포함:

- 상세 header 성과 block
- 가격과 신호 timeline chart
- 5/20/60D 신호 이력
- 당시 분석가 snapshot과 원문 drill-down
- 공식과 데이터 기준 설명

완료 기준:

- 모든 결과에서 당시 신호 구성과 원문까지 추적한다.
- chart와 표의 가격·수익률이 일치한다.
- 모바일에서 header와 신호 이력이 가로 overflow를 만들지 않는다.

### 8.5 Release 4: Calibration

실사용 후 진행한다.

후보:

- SPY 대비 초과수익률
- sector benchmark 비교
- 90일 TTL과 동의 threshold 조정
- 신호 강화 event
- 전체 종합 신호 적중률
- 개별 분석가 성과는 별도 기획과 충분한 표본 후 검토

진입 기준:

- 20D가 지난 종합 신호가 최소 20건 이상이다.
- 사용자가 절대수익률과 방향 결과를 혼동하지 않는다.
- 가격 데이터 수집 성공률이 2주 연속 99% 이상이다.

## Appendix A. Acceptance Criteria

### Signal Integrity

- [ ] 신호는 발생 시점까지 존재한 의견만 사용한다.
- [ ] 분석가 한 명은 현재 종합 상태에 한 표만 가진다.
- [ ] 같은 방향의 반복 게시물이 새 신호를 만들지 않는다.
- [ ] 종합 상태 진입과 방향 전환만 V1 신호를 만든다.
- [ ] 모든 신호에 calculation version과 분석가 snapshot이 있다.
- [ ] review 수정 전후 결과를 감사할 수 있다.

### Price and Outcome

- [ ] 기준가는 다음 정규 거래일 수정 시가다.
- [ ] 5/20/60D는 달력일이 아니라 거래일로 계산한다.
- [ ] positive와 negative 신호가 같은 signed return 공식으로 판정된다.
- [ ] flat은 적중률 분모에 포함되고 분자에는 포함되지 않는다.
- [ ] pending과 missing은 적중률 분모에서 제외된다.
- [ ] split 또는 dividend 수정 후 outcome을 재계산할 수 있다.
- [ ] 모든 가격에 provider와 기준일이 있다.

### Overview

- [ ] 현재 종합 신호, 신호 이후 수익률, 1개월 결과가 Row에 표시된다.
- [ ] negative 신호 후 음수 수익률이 `방향 일치`로 정확히 표시된다.
- [ ] 신호·가격·결과 부재 사유가 `-`가 아닌 text로 표시된다.
- [ ] 신호 이후 수익률과 방향 결과를 정렬·필터할 수 있다.
- [ ] 모바일에서 핵심 신호가 숨겨지지 않는다.

### Detail

- [ ] Header에서 신호 기준일, 기준가, 최신 종가, 이후 수익률을 확인한다.
- [ ] 가격 chart의 신호 marker가 이력 row와 일치한다.
- [ ] 신호 이력에서 당시 분석가 stance와 원문까지 이동한다.
- [ ] 5건 미만 표본에 percentage 적중률을 표시하지 않는다.
- [ ] 데이터 지연과 계산 version을 확인할 수 있다.

## Appendix B. Decision Log

| 결정 | V1 권장안 | 이유 |
|---|---|---|
| 의견 가중치 | 분석가별 1표 | 게시 빈도 편향 방지 |
| 최소 분석가 | 방향 의견 2명 | 단일 출처를 종합 신호로 오인 방지 |
| 동의 threshold | 내부값 2/3, 표시 67% | 3명 중 2명을 정확히 포함 |
| 비방향 최신 분석 | 명시적 stance_change만 기존 표 제거 | 사실 보도로 인한 신호 churn 방지 |
| 의견 TTL | 90일 | 오래된 관점의 무기한 잔존 방지 |
| 기준 가격 | 다음 거래일 수정 시가 | 게시 전 가격 변화 제외 |
| 기본 평가 기간 | 20거래일 | 단기 소음과 긴 대기 사이 균형 |
| flat 구간 | ±2% | 미세 변동 적중 과장 방지 |
| 적중률 최소 표본 | 5건 | 작은 표본의 백분율 과장 방지 |
| 가격 갱신 | 하루 1회 EOD | 실시간성이 핵심 가치가 아님 |
| V1 benchmark | 없음 | 먼저 방향 결과의 핵심 가치 검증 |

## Appendix C. 후속 문서 변경

이 PRD 승인 후 다음 기존 문서를 갱신한다.

- `PRD-serenity-web-ui.md`: 수익률 non-goal 제거, Overview·Detail 요구사항 변경
- `UX-SPEC-serenity-investment-intelligence.md`: 판단 순서와 table geometry 변경
- `TECH-SPEC-serenity-investment-intelligence.md`: 가격 table, signal replay,
  outcome 계산과 scheduled job 추가
- `.impeccable.md`: `변화 → 종합 신호 → 시장 결과 → 근거` 판단 순서 추가

## Appendix D. Data Provider Note

가격 데이터는 화면 scraping이 아닌 승인된 API로 수집한다. 개인·내부 MVP에서는
하루 한 번 EOD 수집으로 충분하지만, 외부 공개 전에는 display와 redistribution
권한을 별도로 확인한다.

- Twelve Data Individual Pricing: <https://twelvedata.com/pricing>
- Nasdaq Website Legal: <https://www.nasdaq.com/legal>
