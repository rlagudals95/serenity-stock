# X 인플루언서 2차 검증 및 운영 편성

> 기준일: 2026-08-08
>
> 결정: 활성 소스 20개를 역할별로 편성하고, 의견 소스 8개만 종합의견에 반영한다.

## 검증 방식

- 후보 32개 계정에서 최근 게시물 6,150개를 직접 수집했다.
- 대부분 계정은 최근 200개를 확인했고, X 타임라인 제한이 있는 계정은 확보 가능한 표본과 앱 DB 적재 글을 교차 검증했다.
- 원문·답글·인용·재게시 비율, 티커 포함률, 명시적 방향성, 수치·근거, 글 깊이, 포지션 공개, 뉴스 전달, 홍보·과장, 참여도를 비교했다.
- 계정별 최대 20개의 원문·인용 글을 별도 의미 분류해 의견성, 근거 강도, 깊이, 리스크 균형, 저자 귀속 위험을 2차 확인했다.
- 기존 10개 계정은 실제 앱의 분석 결과에서 관련성, 티커 산출, 방향성, 근거·리스크·촉매, 검토 필요 비율도 함께 확인했다.

최근 200개가 포괄하는 기간은 계정 활동량에 따라 하루에서 수개월까지 다르다. 이는 동일 기간 성과 비교가 아니라 실제 수집기가 마주치는 게시물 구성과 운영 적합성을 확인하기 위한 표본이다. 투자 적중률은 실제 매수·매도 호출과 단순 사실 전달을 안정적으로 구분할 이력이 아직 부족해 이번 편성 기준에서 제외했다.

## 활성 편성

| 역할 | 수 | 계정 | 종합의견 |
| --- | ---: | --- | --- |
| 의견 | 8 | Gene Munster, Convequity, Brian Stoffel, Rihard Jarc, Jonah Lupton, Shay Boloor, Serenity, Ryan Reeves | 포함 |
| 근거·맥락 | 7 | Beth Kindig, App Economy Insights, Dan Nystedt, The Science of Hitting, Tae Kim, Dylan Patel, Chit Chat Stocks | 제외 |
| 뉴스·탐색 | 2 | Evan (StockMKTNewz), SpaceInvestor | 제외 |
| 리스크 검증 | 3 | Muddy Waters Research, StockJabber, Kerrisdale Capital | 제외 |

의견 소스도 답글 비중이나 저자 귀속 위험이 높은 경우 `analysis_post_types`를 `original`로 제한한다. Gene Munster와 Convequity처럼 인용 글에서도 직접 관점의 품질이 확인된 계정만 `quote`를 함께 분석한다.

## 기존 소스 조정

- Beth Kindig와 App Economy Insights는 데이터·산업 근거 역할로 이동한다.
- Chit Chat Stocks는 팟캐스트와 아이디어 발굴 역할로 이동한다.
- Evan은 뉴스·촉매 역할로 이동한다.
- Ole Hansen은 원자재·거시 품질과 별개로 현재 종목 중심 파이프라인의 티커 산출이 거의 없어 비활성화한다.
- Shay Boloor와 Serenity는 대량 답글의 영향을 줄이기 위해 원문만 분석한다.

## 비활성 파일럿

Stock Market Nerd, TheValueist, Mostly Borrowed Ideas, Jose Najarro는 프로필을 등록하되 `active=false`, `consensus_eligible=false`로 둔다. 링크 원문 수집, 저자성·중복 검사, 강세 편향 검증이 갖춰진 뒤 30일 파일럿을 별도로 시작한다.

## 데이터 계약

- `source_role`: `opinion`, `context`, `news`, `risk`
- `consensus_eligible`: 종합의견 한 표로 인정할지 여부
- DB 제약으로 `consensus_eligible=true`는 `source_role='opinion'`일 때만 허용한다.
- `ticker_consensus_analyst_summary`는 활성 의견 소스만 제공하며, 후보 증거와 적중 이력 계산도 이 집합만 사용한다.
