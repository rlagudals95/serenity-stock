# UI/UX Specification: Serenity Investment Intelligence

> 상태: 구현 기준 초안  
> 작성일: 2026-07-18  
> 제품 요구사항: `PRD-serenity-investment-intelligence-agent.md`  
> 기능 명세: `PRD-serenity-web-ui.md`  
> 기술 명세: `TECH-SPEC-serenity-investment-intelligence.md`  
> 디자인 컨텍스트: `.impeccable.md`

## 1. 목적

이 문서는 기능 요구사항을 실제 화면 구조와 상호작용 규칙으로 변환한다.

첫 화면은 종목을 비교하는 작업용 테이블이어야 한다. 사용자는 10초 안에 다음을 파악할 수 있어야 한다.

1. 가장 많이 언급된 종목
2. 긍정 또는 부정 언급이 우세한 종목
3. 누적 관점과 최근 의견이 달라진 종목
4. 새 주장이나 새 리스크가 등장한 종목
5. 원문 확인이 필요한 분석

종목 상세 화면은 집계 결과를 설명하는 근거 화면이어야 한다. AI 분석, 근거 문장, 전체 게시글, X 원문 링크가 끊기지 않는 하나의 검증 흐름으로 이어져야 한다.

## 2. UX 방향

### 2.1 핵심 컨셉

`Analytical Workbench`

- 분석적인: 수치와 근거가 장식보다 우선한다.
- 정돈된: 화면마다 하나의 명확한 판단 순서를 가진다.
- 밀도 높은: 많은 정보를 보여주되 반복 표현과 장식은 줄인다.
- 차분한: 긍정과 부정을 과장하지 않고 같은 시각적 무게로 다룬다.

### 2.2 핵심 시각 문법

Overview의 각 Row 안에서 다음 세 층이 한 번에 읽혀야 한다.

```text
관심도            전체 여론                         현재 상태
총 언급 47        긍정 38 / 부정 3 + 분포          최근 긍정 · 새 주장
```

이 세 층을 큰 KPI 카드나 장식적인 차트로 대체하지 않는다.

### 2.3 화면 판단 순서

```text
변화 감지
  -> 총 언급과 성향 확인
  -> 누적 관점과 최근 의견 비교
  -> 종목 상세 진입
  -> claim과 evidence 확인
  -> X 원문 검증
  -> Watchlist 또는 개인 리서치 갱신
```

## 3. 정보 구조

### 3.1 MVP Route

```text
/tickers
  종목 Overview

/tickers/[ticker]?tab=overview
  종목 개요

/tickers/[ticker]?tab=opinions
  의견과 원문

/tickers/[ticker]?tab=research
  내 리서치
```

루트 `/`는 `/tickers`로 이동한다.

### 3.2 후속 Route

```text
/daily
  Daily Brief

/review
  검토 필요 분석

/settings
  분석 기준과 계정 설정
```

MVP에서는 메뉴가 `Tickers` 하나뿐이므로 상시 Sidebar를 만들지 않는다. 두 번째 핵심 메뉴가 추가되는 시점에 216px 폭의 축소 가능한 Sidebar를 도입한다.

## 4. Global Shell

### 4.1 Desktop

```text
┌─────────────────────────────────────────────────────────────────────────┐
│ Serenity Intelligence      Tickers              08:04 KST · 정상   [계정] │
├─────────────────────────────────────────────────────────────────────────┤
│ 페이지 콘텐츠                                                           │
└─────────────────────────────────────────────────────────────────────────┘
```

- App bar 높이: 52px
- 콘텐츠 최대 폭: 1600px
- 1280px 이하에서는 좌우 20px, 1280px 이상에서는 좌우 28px
- App bar는 화면 상단에 고정한다.
- 로고는 텍스트 워드마크로 시작한다.
- 갱신 상태는 `정상`, `데이터 지연`, `갱신 실패`와 마지막 성공 시각을 함께 표시한다.
- 계정은 `UserRound` 아이콘 버튼으로 열며 tooltip은 `계정`이다.

### 4.2 Mobile

```text
┌──────────────────────────────┐
│ Serenity        08:04   [계정] │
├──────────────────────────────┤
│ 페이지 콘텐츠                 │
└──────────────────────────────┘
```

- App bar 높이: 48px
- 화면 좌우 padding: 12px
- 갱신 상태는 아이콘과 시각만 표시한다. 상태 상세는 popover에서 보여준다.
- 핵심 기능을 hamburger menu 뒤에 숨기지 않는다.

### 4.3 Navigation

- 현재 route는 text weight와 2px 이하의 하단 indicator로 구분한다.
- 메뉴가 하나뿐일 때 `Tickers` 탭을 반복 노출하지 않는다.
- 상세 페이지에는 `Tickers / COHR` breadcrumb를 표시한다.
- 브라우저 뒤로 가기 시 Overview의 검색, 필터, 정렬, cursor를 URL에서 복원한다.

## 5. Overview 화면

### 5.1 화면 구조

```text
종목 분석                                              08:04 KST 기준
Serenity가 언급한 종목 126개

[종목 검색........................] [Watchlist] [성향] [최근 의견] [변화] [기간] [필터]

★  종목             총 언급   긍정 / 부정 + 분포      누적 관점    최근 의견    변화       7D/30D   최근 언급
────────────────────────────────────────────────────────────────────────────────────────────────────────────
★  COHR             47        +38  -3  ▬▬▬▬▬░         긍정 우세    긍정 의견    새 주장     8 / 17   2시간 전
   Coherent Corp.
────────────────────────────────────────────────────────────────────────────────────────────────────────────
☆  AAOI             31        +20  -4  ▬▬▬▬░░         긍정 우세    혼재         새 리스크   2 / 12   1일 전
   Applied Opto...
```

페이지 제목 아래 설명은 데이터 범위만 전달한다. 제품 기능을 설명하는 소개 문구는 넣지 않는다.

### 5.2 화면 영역

1. Page header: 제목, 결과 개수, 기준 시각
2. Control bar: 검색, 자주 쓰는 필터, 전체 필터
3. Active filter row: 적용된 조건이 있을 때만 표시
4. Data table: 비교와 상세 진입
5. Pagination footer: 표시 범위와 이전/다음

Control bar와 table 사이는 12px로 묶는다. Page header와 control bar 사이는 24px로 분리한다.

### 5.3 Desktop Table Geometry

1440px 화면의 권장 열 기준이다.

| 열 | 폭 | 정렬 | 비고 |
|---|---:|---|---|
| Watchlist | 40px | 중앙 | 아이콘 버튼 32px |
| 종목 | min 176px | 왼쪽 | sticky |
| 총 언급 | 88px | 오른쪽 | tabular number |
| 긍정/부정 분포 | min 210px | 왼쪽 | 절대 개수 우선 |
| 누적 관점 | 104px | 왼쪽 | 짧은 텍스트 |
| 최근 의견 | 104px | 왼쪽 | 짧은 텍스트 |
| 변화 | 112px | 왼쪽 | 중요도 아이콘 포함 가능 |
| 7D/30D | 88px | 오른쪽 | `8 / 17` |
| 최근 언급 | 104px | 오른쪽 | 상대 시각 |
| 품질 | 48px | 중앙 | 문제가 있을 때만 아이콘 |

- Table header 높이: 40px
- Row 높이: 60px
- company name이 없더라도 Row 높이는 유지한다.
- header와 첫 번째 열은 sticky다.
- sticky 경계에는 1px 구분선만 사용한다.
- 숫자 열은 오른쪽 정렬하고 `font-variant-numeric: tabular-nums`를 적용한다.
- 정렬 변경으로 열 너비가 움직이지 않아야 한다.

### 5.4 Row 정보 위계

#### 종목

```text
COHR
Coherent Corp.
```

- ticker가 1차 정보다.
- 회사명은 한 줄 말줄임한다.
- ticker와 회사명을 별도 배지로 감싸지 않는다.

#### 총 언급

- medium weight 숫자로 표시한다.
- tooltip이나 비율 없이 절대 개수만 표시한다.
- `총 언급`은 긍정과 부정의 합이 아닐 수 있으므로 더하기 식으로 표현하지 않는다.

#### 성향 분포

```text
+38  -3
[positive][mixed][neutral][negative]
```

- 첫 줄은 `+38`, `-3`의 절대 개수다.
- screen reader label로 `긍정 38건, 부정 3건`을 제공한다.
- 분포 막대 높이는 5px, 최소 segment 폭은 시각 표시에서 2px다.
- 값이 0인 segment는 표시하지 않는다.
- 중립, 혼재, 판단 불가 개수는 tooltip에 보조로 제공하되 접근성 label에는 항상 포함한다.
- 방향성 표본이 3건 미만이면 분포 막대를 옅게 표시하고 `표본 부족` 텍스트를 제공한다.

#### 누적 관점과 최근 의견

데이터 enum은 유지하되 UI에서는 다음 한국어 라벨을 사용한다.

| 데이터 값 | 누적 관점 | 최근 의견 |
|---|---|---|
| bullish/positive | 긍정 우세 | 긍정 의견 |
| bearish/negative | 부정 우세 | 부정 의견 |
| mixed | 혼재 | 혼재 |
| neutral | 해당 없음 | 중립 |
| unknown/insufficient | 판단 부족 | 의견 없음 |

- `누적 관점`과 `최근 의견`이라는 열 제목을 항상 유지한다.
- 같은 색을 사용하더라도 문구를 다르게 해 시간 범위 차이를 드러낸다.
- 둘이 반대 방향이면 최근 의견 앞에 `ArrowLeftRight` 아이콘과 `관점 불일치` 접근성 label을 표시한다.
- 배지는 24px 높이, 4px radius 이하의 compact label로 제한한다.

#### 변화

| 변화 | 표현 | 강조 수준 |
|---|---|---|
| 방향 전환 | `ArrowLeftRight` + 방향 전환 | 가장 높음 |
| 새 리스크 | `TriangleAlert` + 새 리스크 | 높음 |
| 신규 종목 | `Sparkles` + 신규 종목 | 중간 |
| 새 주장 | `MessageSquarePlus` + 새 주장 | 중간 |
| 불명확 | `CircleHelp` + 불명확 | 낮음 |
| 반복 | 텍스트 `반복` | 낮음 |
| 변화 없음 | `-` | 없음 |

아이콘은 상태 구분을 보조한다. 상태마다 배경색이 강한 배지를 반복하지 않는다.

### 5.5 Row 상호작용

- Row의 비어 있는 영역 hover 시 surface만 한 단계 진하게 바뀐다.
- hover, focus, selected 상태에서 Row 높이와 열 너비는 변하지 않는다.
- Row 선택 시 `/tickers/[ticker]`로 이동한다.
- Row는 keyboard focus를 받고 Enter 또는 Space로 연다.
- Watchlist, tooltip, sort button은 Row navigation을 발생시키지 않는다.
- `Cmd+Click`, `Ctrl+Click`, middle click의 새 탭 동작을 보존한다.
- 현재 focus Row는 2px focus ring으로 표시하고 대비 3:1 이상을 확보한다.

### 5.6 검색

- input 높이: 36px
- 기본 폭: 280px, 최대 420px
- placeholder: `티커 또는 회사명`
- ticker prefix와 회사명 부분 일치를 지원한다.
- 입력 후 250ms debounce하거나 Enter로 제출한다.
- 결과 적용 후 input focus를 유지한다.
- 검색값은 URL `q`에 저장한다.
- clear는 `X` 아이콘 버튼으로 제공하고 tooltip은 `검색어 지우기`다.

### 5.7 필터

Control bar에 항상 노출할 항목:

1. Watchlist
2. 누적 관점
3. 최근 의견
4. 변화
5. 최근 언급 기간

`최소 총 언급`, `검토 필요 포함`은 `SlidersHorizontal` 아이콘의 전체 필터 popover에 둔다.

- Watchlist는 별 아이콘과 텍스트가 있는 toggle button이다.
- 단일 선택은 menu, 복수 선택은 checkbox menu를 사용한다.
- 적용된 필터는 control bar 아래 active filter row에 compact token으로 표시한다.
- 모든 필터 해제는 `초기화` text button으로 제공한다.
- 필터는 선택 즉시 적용한다.
- 연속 URL 변경은 history를 쌓지 않도록 replace한다.
- 결과가 바뀔 때 table body에만 pending 상태를 표시한다.

### 5.8 정렬

- 정렬 가능한 header만 button으로 구현한다.
- 현재 정렬 열에만 `ArrowUp` 또는 `ArrowDown`을 표시한다.
- 숫자와 최근 시각은 내림차순, ticker는 오름차순이 첫 방향이다.
- 동일 값은 ticker 오름차순으로 안정 정렬한다.
- screen reader에는 `총 언급, 내림차순 정렬됨`처럼 읽힌다.

### 5.9 Pagination

- cursor pagination을 사용한다.
- footer 왼쪽: `1-50 / 126개 종목`
- footer 오른쪽: 이전/다음 icon button
- 마지막 페이지에서 다음 button은 disabled다.
- 페이지 이동 후 table 시작점으로 이동하고 첫 Row에 focus를 둔다.
- 페이지당 항목 수는 MVP에서 50으로 고정한다.

### 5.10 Overview 상태

#### Loading

- 실제 header와 같은 열 너비를 먼저 렌더링한다.
- 8개의 skeleton Row를 60px 높이로 표시한다.
- loading 전후 레이아웃이 움직이지 않아야 한다.
- 낮은 대비 opacity pulse를 사용하고 reduced motion에서는 정지시킨다.

#### Empty

- 최초 데이터 없음: `아직 분석된 종목이 없습니다.`
- 검색/필터 결과 없음: `조건에 맞는 종목이 없습니다.`
- 검색/필터 결과 없음에는 `필터 초기화` button만 제공한다.
- 일러스트나 큰 빈 상태 카드를 사용하지 않는다.

#### Error

- 마지막 정상 데이터가 있으면 그대로 유지한다.
- Page header 아래에 낮은 높이의 status band를 표시한다.
- 문구: `마지막 갱신에 실패했습니다. 07:55 KST 데이터입니다.`
- 오른쪽에 `RefreshCw` 재시도 icon button을 둔다.
- 기술 오류 detail은 노출하지 않는다.

#### Stale

- 6시간 이상 정상 수집이 없으면 app bar의 갱신 상태를 amber 계열로 바꾼다.
- `데이터 지연 · 마지막 정상 수집 6시간 전`을 표시한다.
- 테이블 데이터는 계속 탐색할 수 있다.

## 6. 종목 상세 화면

### 6.1 전체 구조

```text
Tickers / COHR

COHR  Coherent Corp.                                      [☆ Watchlist]
누적 관점  긍정 우세   최근 의견  긍정 의견   최근 변화  새 주장
마지막 정상 분석 2026-07-18 08:02 KST

총 언급 47 | 긍정 38 | 부정 3 | 중립/혼재 6 | 7D 8 | 30D 17 | 고유 스레드 29 | 최근 2시간 전

[개요] [의견과 원문 47] [내 리서치]
───────────────────────────────────────────────────────────────────────────
탭 콘텐츠
```

Header와 metrics strip은 카드로 감싸지 않는다. 페이지 배경 위에 직접 배치하고 구분선과 간격으로 구조를 만든다.

### 6.2 Header

- breadcrumb와 제목 사이는 12px
- ticker는 25px, 회사명은 16px
- Watchlist는 오른쪽에 별 아이콘과 텍스트를 함께 둔다.
- 누적 관점, 최근 의견, 최근 변화는 같은 한 줄에 배치하되 label/value 구조를 유지한다.
- 방향이 반대면 두 값 사이에 `관점 불일치` 표시를 둔다.
- 데이터 기준 시각은 secondary text로 표시한다.

### 6.3 Metrics Strip

- 높이: desktop 64px
- 각 지표는 vertical divider로 나눈다.
- 지표 값이 label보다 먼저 읽히도록 값 weight를 한 단계 높인다.
- 숫자에는 tabular number를 사용한다.
- 각 지표를 개별 카드로 만들지 않는다.
- `총 언급`, `긍정`, `부정`, `최근 언급`은 항상 노출한다.
- 960px 이하에서는 두 행 grid로 줄바꿈한다.

### 6.4 Tabs

- tab list 높이: 40px
- 선택된 tab은 text weight와 2px 하단 indicator로 표시한다.
- 선택 상태는 URL query에 저장한다.
- browser back/forward로 tab 이동이 복원된다.
- `의견과 원문`에는 전체 의견 수를 작은 tabular number로 표시할 수 있다.
- tab 전환 후 focus를 강제로 이동하지 않는다.

## 7. 상세: 개요 탭

### 7.1 Desktop Layout

```text
┌──────────────────────────────────────────────┬──────────────────────────┐
│ 성향 분포 + 90일 언급 추이                  │ 최근 변화                │
│                                              ├──────────────────────────┤
│                                              │ 최근 리스크              │
├──────────────────────────────────────────────┤                          │
│ 최근 주요 주장                              ├──────────────────────────┤
│                                              │ 최근 catalyst            │
└──────────────────────────────────────────────┴──────────────────────────┘
```

- 12-column grid에서 main 8, side 4 비율을 사용한다.
- grid gap: 32px
- section은 카드가 아니라 heading, 내용, 구분선으로 나눈다.
- 오른쪽 rail은 짧은 항목과 변화 감지에 사용한다.
- 1100px 이하에서는 한 열로 쌓되 `최근 변화`를 성향 분포 다음으로 이동한다.

### 7.2 성향 분포와 추이

- 상단에 총 언급과 방향성 표본 수를 표시한다.
- 절대 개수와 누적 관점 판정식을 함께 제공한다.
- 90일 chart는 일별 총 언급을 bar, 긍정/부정을 색상 segment로 표현한다.
- 장식용 sparkline은 사용하지 않는다.
- chart hover에는 날짜, 총 언급, 긍정, 부정, 중립/혼재를 표시한다.
- chart 아래에는 보이는 기간과 데이터 누락 여부를 텍스트로 제공한다.
- 시장 가격과 수익률을 함께 그리지 않는다.

### 7.3 최근 변화

- 변화 유형, 요약, 기준 시각, confidence를 표시한다.
- 현재 글과 비교 대상 글을 각각 link로 제공한다.
- `방향 전환`과 `새 리스크`만 강한 색을 사용한다.
- confidence는 `높음`, `보통`, `검토 필요`로 먼저 표시하고 정확한 값은 tooltip에 둔다.
- 검토 필요 상태는 원문 확인 동작과 가깝게 둔다.

### 7.4 최근 주요 주장

```text
2026.07.18   긍정 의견   새 주장
1.6T 광통신 수요가 예상보다 강하다는 주장
근거 보기  ·  X 원문
```

- 최대 5개
- 항목 사이에는 1px divider
- claim은 2줄까지 표시하고 전체 텍스트는 상세 timeline에서 확인한다.
- 원문 link는 외부 링크 icon과 함께 표시한다.
- 같은 claim은 중복 제거하되 반복 횟수를 보조 정보로 표시할 수 있다.

### 7.5 리스크와 Catalyst

- 각각 별도 section으로 둔다.
- 항목은 문장, 최근 언급 날짜, 원문 link로 구성한다.
- severity나 확률을 데이터 없이 추정하지 않는다.
- 항목이 없으면 `최근 30일 동안 추출된 리스크가 없습니다.`처럼 기간을 포함한다.
- 리스크를 붉은 카드로 감싸지 않는다.

## 8. 상세: 의견과 원문 탭

### 8.1 Layout

```text
[성향] [주장 유형] [새로움] [기간] [검토 필요]

2026.07.18 07:42 KST            긍정 의견 · 새 주장 · 확신 보통
1.6T 광통신 수요가 예상보다 강하다는 주장

근거 문장
"..."

[전체 글 펼치기]  [X에서 원문 보기]              [유용함] [이미 앎] [오분류]
───────────────────────────────────────────────────────────────────────────
다음 의견
```

- timeline은 단일 column, 최대 읽기 폭 920px
- 페이지당 20개
- 카드 목록 대신 날짜 grouping과 divider를 사용한다.
- 서로 다른 날짜 사이는 32px, 같은 날짜의 의견 사이는 20px
- 긴 원문은 75ch를 넘지 않도록 한다.

### 8.2 의견 항목 위계

1. 게시 시각
2. 최근 의견, 변화 유형, conviction
3. AI claim
4. 원문 근거 문장
5. 전체 게시글
6. 원문 이동과 피드백
7. confidence와 review 상태

AI claim 위에는 `AI 분석`, 근거와 전체 게시글에는 `원문 근거`, `게시글 전체` label을 표시해 출처를 섞지 않는다.

### 8.3 원문 펼치기

- 기본 상태에서는 claim과 evidence를 표시한다.
- `전체 글 펼치기`를 누르면 같은 항목 안에서 게시글 전체가 열린다.
- 높이는 `grid-template-rows`로 전환하고 opacity를 함께 사용한다.
- 펼친 상태에서 button 문구는 `전체 글 접기`다.
- URL에는 펼침 상태를 저장하지 않는다.
- 삭제된 글은 저장 원문과 `X 원문 이용 불가` 상태를 표시한다.

### 8.4 원문 링크

- label: `X에서 원문 보기`
- `ExternalLink` icon 사용
- 새 탭에서 연다.
- hover는 underline으로 표시한다.
- 각 의견 항목의 첫 화면 안에서 찾을 수 있어야 한다.

### 8.5 Feedback

- `유용함`, `이미 앎`, `오분류`는 segmented control로 표현한다.
- 선택 즉시 optimistic state를 표시하고 저장 실패 시 이전 상태로 되돌린다.
- 한 분석에는 하나만 선택할 수 있다.
- `오분류` 선택 시 해당 항목 아래에 오류 유형 선택과 선택적 메모를 펼친다.
- 오류 유형을 고르기 전에도 feedback 자체는 저장할 수 있다.
- 성공 toast를 매번 띄우지 않고 control 내부의 선택 상태로 완료를 전달한다.

### 8.6 검토 필요 상태

- confidence가 기준 미만이면 `검토 필요`를 표시한다.
- tooltip에서 총 언급 포함 여부와 stance 집계 포함 여부를 구분한다.
- 핵심 문구:
  - `종목은 확인됨 · 의견 집계 제외`
  - `종목 확인 필요 · 총 언급 제외`
- 내부 enum이나 분석 버전은 상세 정보 popover에서만 제공한다.

## 9. 상세: 내 리서치 탭

### 9.1 Layout

- 최대 폭 760px의 form column
- Watchlist priority는 3단계 segmented control
- 리서치 상태는 select
- 개인 메모는 textarea
- 저장 button은 form 하단 오른쪽
- 자동 저장하지 않는다.

### 9.2 상태

리서치 상태:

1. 확인 전
2. 조사 중
3. 확인 완료
4. 보류

Watchlist priority:

1. 낮음
2. 보통
3. 높음

- 저장하지 않은 변경이 있을 때 tab 이동이나 route 이탈 시 확인한다.
- 저장 중에는 spinner와 `저장 중`을 표시한다.
- 저장 성공은 `저장됨 · 08:12 KST`로 form 하단에 유지한다.
- 저장 실패 시 입력값을 보존하고 status message를 표시한다.

## 10. Responsive Design

### 10.1 Breakpoint 역할

| 범위 | 목적 |
|---|---|
| 1280px 이상 | 전체 비교 열을 한 화면에 표시 |
| 960-1279px | 핵심 열 유지, 보조 열 축약 |
| 768-959px | 수평 스크롤과 열 고정으로 비교 유지 |
| 767px 이하 | 2줄 Row와 핵심 열 중심 탐색 |

breakpoint는 구현 시 콘텐츠가 실제로 깨지는 지점을 기준으로 조정할 수 있다.

### 10.2 Tablet

- `품질`, `최근 언급`을 icon/짧은 형식으로 축약한다.
- `7D/30D`는 필요하면 숨긴다.
- 종목 열을 sticky로 유지한다.
- table container에만 수평 스크롤을 허용한다.
- 페이지 전체가 좌우로 움직이면 안 된다.

### 10.3 Mobile Overview

반복 카드를 만들지 않고 table semantic과 Row 구분선을 유지한다.

```text
★  COHR                         총 47
   +38 / -3   긍정 우세 · 최근 긍정   새 주장 · 2시간 전
──────────────────────────────────────
☆  AAOI                         총 31
   +20 / -4   긍정 우세 · 최근 혼재   새 리스크 · 1일 전
```

- Row 높이: 최소 72px
- 첫 줄: Watchlist, ticker, 총 언급
- 둘째 줄: 긍정/부정, 누적 관점, 최근 의견, 변화, 최근 언급
- company name은 숨기되 상세 header에서는 표시한다.
- 분포 막대는 360px 미만에서 숨기고 절대 개수를 유지한다.
- 긴 label은 둘째 줄 안에서 자연스럽게 wrap한다.
- touch target은 최소 44x44px
- filter는 `필터` button과 핵심 Watchlist toggle을 우선한다.
- 적용 filter 수는 `필터 2`처럼 표시한다.

### 10.4 Mobile Detail

- Watchlist를 ticker와 같은 줄 오른쪽에 둔다.
- 누적 관점, 최근 의견, 최근 변화는 두 열 grid로 배치한다.
- metrics strip은 2열 또는 4열 grid로 줄바꿈한다.
- tabs는 가로 scroll 없이 3개를 표시한다.
- 개요 탭은 `성향 -> 최근 변화 -> 주요 주장 -> 리스크 -> catalyst -> 추이` 순서로 한 열 배치한다.
- timeline action은 원문 link를 첫 줄, feedback을 다음 줄에 둘 수 있다.
- 원문과 AI 분석은 위아래로 이어진다.

## 11. Visual System

### 11.1 Typography

브랜드 단어는 `분석적인`, `정돈된`, `밀도 높은`이다.

초기 반사 선택인 Inter, IBM Plex Sans, Space Grotesk는 사용하지 않는다. 한글 가독성과 밀도, 숫자 구분을 기준으로 다음 조합을 사용한다.

- UI와 한글 본문: `Gothic A1`
- ticker, 숫자, 날짜의 선택적 accent: `Fragment Mono`
- mono는 ticker와 정렬이 중요한 짧은 숫자에만 사용하며 문장이나 heading 전체에 사용하지 않는다.
- 웹 폰트 실패 시 한글 fallback은 `sans-serif`, 데이터 fallback은 `monospace`다.

App UI는 고정된 rem scale을 사용한다.

| Token | Size | Line height | 용도 |
|---|---:|---:|---|
| text-xs | 0.75rem | 1.35 | 보조 label, 시각 |
| text-sm | 0.875rem | 1.45 | table, control, body |
| text-md | 1rem | 1.5 | 상세 본문, 회사명 |
| text-lg | 1.25rem | 1.3 | section heading |
| text-xl | 1.5625rem | 1.2 | page/ticker heading |

- 기본 table text는 14px다.
- letter spacing은 0을 사용한다.
- 긴 문장은 최대 75ch로 제한한다.
- 데이터 숫자에는 tabular number를 적용한다.

### 11.2 Color

모든 색은 OKLCH token으로 관리한다.

```css
--canvas: oklch(0.978 0.006 190);
--surface: oklch(0.992 0.003 190);
--surface-hover: oklch(0.955 0.012 190);
--ink: oklch(0.225 0.025 245);
--ink-muted: oklch(0.47 0.018 230);
--border: oklch(0.865 0.012 195);
--accent: oklch(0.52 0.135 245);
--positive: oklch(0.50 0.115 154);
--negative: oklch(0.56 0.17 28);
--mixed: oklch(0.66 0.13 76);
--neutral: oklch(0.58 0.025 225);
--focus: oklch(0.57 0.16 245);
```

- canvas와 surface는 순수 흰색 대신 매우 낮은 chroma의 청록 계열 중성색을 사용한다.
- 본문은 순수 검정 대신 옅게 착색된 ink를 사용한다.
- accent는 link, focus, 선택 상태에 제한한다.
- 긍정과 부정은 동일한 채도 수준으로 다뤄 어느 한쪽을 더 매력적으로 보이게 하지 않는다.
- mixed와 warning은 같은 amber 계열을 쓰되 icon과 문구로 의미를 구분한다.
- 색상만으로 상태를 전달하지 않는다.

### 11.3 Shape and Elevation

- 기본 radius: 4px
- input, button, popover 최대 radius: 6px
- pill은 filter token과 아주 짧은 상태 label에만 사용한다.
- card radius는 8px를 넘지 않는다.
- table과 page section에는 drop shadow를 사용하지 않는다.
- popover, menu, tooltip에만 낮은 elevation을 사용한다.
- 굵은 좌우 accent border, glass blur, glow를 사용하지 않는다.

### 11.4 Icon

- Lucide icons
- 기본 크기: 16px
- compact table icon: 14px
- icon button: 32x32px, mobile 44x44px
- 모르는 icon에는 tooltip을 제공한다.
- 긍정/부정 자체는 표정이나 상승/하락 화살표에 의존하지 않는다.

### 11.5 Spacing

4pt 기반 semantic scale:

```text
--space-2xs: 4px
--space-xs: 8px
--space-sm: 12px
--space-md: 16px
--space-lg: 24px
--space-xl: 32px
--space-2xl: 48px
--space-3xl: 64px
```

- 같은 의견 항목 내부: 8-12px
- section heading과 내용: 12-16px
- 서로 다른 section: 32-48px
- page header와 주 콘텐츠: 24px
- sibling 간격은 margin보다 gap을 우선한다.

## 12. Motion and Feedback

- hover/focus color: 120ms
- popover/menu enter: 160ms, ease-out-quart
- inline expand/collapse: 180ms, ease-out-quint
- route 전환에 장식적인 page animation을 사용하지 않는다.
- layout width, height, padding, margin을 직접 animation하지 않는다.
- loading 중 button과 filter는 현재 폭을 유지한다.
- `prefers-reduced-motion`에서는 opacity pulse와 expand transition을 제거한다.
- 성공 feedback은 가능한 한 해당 control의 상태 변화로 전달한다.
- toast는 화면 밖에서 발생한 완료나 복구 불가능한 오류에만 사용한다.

## 13. UX Writing

### 13.1 용어

| 사용 | 사용하지 않음 |
|---|---|
| Serenity 관점 | 투자의견 |
| 누적 관점 | 전체 추천 |
| 최근 의견 | 현재 추천 |
| 긍정 의견 / 부정 의견 | 매수 / 매도 |
| AI 분석 | AI의 판단 |
| 원문 근거 | AI 근거 |
| 검토 필요 | AI 오류 |

### 13.2 문장 원칙

- 결과와 기준을 먼저 쓴다.
- 기술 원인보다 사용자가 할 수 있는 행동을 쓴다.
- 투자 권유로 읽힐 수 있는 명령형 표현을 쓰지 않는다.
- confidence가 낮으면 단정하지 않는다.
- 날짜 범위를 문장에 포함한다.

예:

```text
최근 30일 동안 추출된 리스크가 없습니다.
마지막 갱신에 실패했습니다. 07:55 KST 데이터는 계속 확인할 수 있습니다.
종목은 확인됐지만 의견 confidence가 낮아 긍정/부정 집계에서 제외했습니다.
```

## 14. Accessibility

기본 목표는 WCAG 2.2 AA다.

- 일반 text 대비 4.5:1 이상
- 큰 text와 UI 경계 대비 3:1 이상
- 모든 interactive control에 visible focus
- 최소 pointer target desktop 32px, mobile 44px
- table header에 scope와 sort 상태 제공
- Row 전체 클릭 외에도 ticker에 실제 anchor를 제공
- 분포 막대에 전체 문장형 accessible name 제공
- tooltip 없이도 핵심 의미 이해 가능
- icon-only button에 accessible name 제공
- 외부 link는 새 창 열림을 accessible label에 포함
- 색각 이상에서도 긍정/부정/혼재가 문구와 개수로 구분됨
- KST 상대 시각에는 전체 날짜를 accessible description으로 제공
- 동적 filter 결과 수는 과도하지 않은 live region으로 알림
- keyboard focus가 sticky header 뒤에 가려지지 않도록 scroll padding 적용

## 15. 성능과 체감 속도

- 첫 콘텐츠 2초 이하
- filter 결과 1초 이하
- table query 중 이전 결과를 유지
- Row와 column geometry를 loading 전후 동일하게 유지
- chart는 개요 탭 진입 시 lazy load 가능
- timeline 전체 원문은 펼칠 때만 렌더링한다.
- 웹 폰트는 필요한 weight만 self-host하고 `font-display: swap`을 사용한다.
- 한국어 font payload는 subset 전략을 검토한다.

## 16. UX 검증 시나리오

### 16.1 10초 Scan Test

과제:

1. 가장 많이 언급된 종목 찾기
2. 긍정과 부정 언급 수 말하기
3. 최근 방향이 달라진 종목 찾기

성공 기준:

- 각 과제 10초 이하
- 상세 화면 진입 없이 완료
- 누적 관점과 최근 의견을 혼동하지 않음

### 16.2 Source Verification Test

과제:

1. COHR 상세 열기
2. 가장 최근 새 주장 확인
3. AI claim의 근거 문장 확인
4. X 원문 열기

성공 기준:

- Overview에서 원문까지 3회 이하 주요 선택
- 사용자가 AI 요약과 원문을 정확히 구분
- 외부 link가 올바른 게시글을 엶

### 16.3 Filter Recovery Test

과제:

1. Watchlist + 긍정 우세 + 30일 filter 적용
2. 종목 상세 진입
3. browser 뒤로 가기

성공 기준:

- 모든 조건과 정렬 복원
- 이전 table 위치 또는 대상 Row를 찾을 수 있음

### 16.4 Mobile Comprehension Test

과제:

1. 총 언급 확인
2. 긍정/부정 수 확인
3. 최근 의견과 변화 확인
4. 상세 진입

성공 기준:

- 가로 page scroll 없음
- text와 button 겹침 없음
- 중요 정보가 card carousel이나 숨은 menu에 들어가지 않음

## 17. 구현 우선순위

### UX Release 1: Overview Core

- Global shell
- Table geometry
- 총 언급과 긍정/부정 분포
- 누적 관점과 최근 의견
- 검색, 정렬, URL 상태
- Row navigation
- loading, empty, error, stale
- desktop/mobile

### UX Release 2: Detail Verification

- 상세 header와 metrics strip
- 개요 탭
- 의견과 원문 timeline
- 원문 expand와 X link
- confidence와 검토 상태
- feedback

### UX Release 3: Personal Workflow

- Watchlist priority
- 내 리서치 상태와 메모
- saved filters는 실제 반복 사용이 확인된 경우 추가
- 7일 대비 이전 7일 언급 증감은 유용성 검증 후 Overview 보조 열 후보로 검토

## 18. 구현 Acceptance Criteria

### Overview

- [ ] 1280px 이상에서 핵심 열이 한 화면에 표시된다.
- [ ] 총 언급, 긍정, 부정 절대 개수가 모든 Row에 표시된다.
- [ ] 누적 관점과 최근 의견이 별도 열과 별도 label로 표시된다.
- [ ] 반대 방향이면 색상 외 icon과 text로 드러난다.
- [ ] hover, loading, sort에서 Row 높이와 column 폭이 움직이지 않는다.
- [ ] 모든 filter와 sort가 URL에서 복원된다.
- [ ] Row, Watchlist, sort, filter를 keyboard로 사용할 수 있다.
- [ ] mobile은 card 목록이 아닌 2줄 Row 구조를 유지한다.

### Detail

- [ ] Header에서 누적 관점, 최근 의견, 최근 변화를 구분한다.
- [ ] metrics strip을 개별 KPI card로 만들지 않는다.
- [ ] AI claim, evidence, 전체 게시글의 출처가 시각적으로 구분된다.
- [ ] 모든 유효 의견에서 X 원문 또는 원문 이용 불가 상태를 찾을 수 있다.
- [ ] timeline은 최신순이며 filter가 URL에서 복원된다.
- [ ] feedback 결과가 해당 control 안에서 즉시 보인다.

### Visual and Accessibility

- [ ] 순수 검정, 순수 흰색, gradient text, glow, glassmorphism을 사용하지 않는다.
- [ ] table과 section을 반복 card로 감싸지 않는다.
- [ ] 색상 없이 stance와 상태를 구분할 수 있다.
- [ ] 본문 대비 4.5:1, focus/UI 경계 대비 3:1을 충족한다.
- [ ] 360px, 768px, 1024px, 1440px에서 overlap과 page overflow가 없다.
- [ ] reduced motion 설정에서 불필요한 motion이 제거된다.

## Appendix A. 추가로 고려할 정보

MVP Row에 더 넣을 수 있지만 처음부터 노출하지 않는 항목:

| 항목 | 판단 | 이유 |
|---|---|---|
| 이전 7일 대비 언급 증감 | 후속 후보 | 관심도 가속을 보여주지만 열 과밀 가능 |
| 고유 스레드 수 | 상세만 | 반복 thread에 의한 과대 해석 확인용 |
| 평균 confidence | 기본 숨김 | 단일 평균이 품질을 지나치게 단순화 |
| 검토 필요 수 | 문제 있을 때만 | 정상 Row의 시각 소음 방지 |
| 최초 언급일 | 상세만 | 비교 우선순위가 낮음 |
| 시장 가격/수익률 | 제외 | Serenity 관점과 성과를 혼동시킬 수 있음 |

초기 Row의 우선순위는 유지한다.

```text
종목 -> 총 언급 -> 긍정/부정 -> 누적 관점 -> 최근 의견 -> 변화 -> 기간별 언급 -> 최근 시각
```

## Appendix B. Font Sources

- Google Fonts + Korean: https://googlefonts.github.io/korean/
- Fragment Mono: https://fragment.dev/mono
