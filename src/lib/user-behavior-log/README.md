# User behavior log

Serenity의 사용자 행동 이벤트를 provider와 분리해 기록하는 app-local 모듈입니다.
`modu-rental-app`의 `@pmf/user-behavior-log`에서 제품 전용 의존성을 제거한
sender-injection 구조와 React helper를 가져왔습니다.

## 공개 API

- `createBehaviorLogger`: 공통 context와 이벤트별 metadata를 합쳐 sender에 전달
- `pageView`, `click`, `impression`: 기본 이벤트 helper
- `BehaviorLoggerProvider`, `LogClick`, `LogImpression`, `LogPageView`:
  React 연결 helper
- `TrackedLink`, `TrackedExternalLink`: Serenity 링크 행동 기록 adapter

코어 모듈은 analytics provider, DB, API route를 알지 않습니다. 저장 방식은
`app-behavior-logger.ts`의 sender가 결정합니다.

## 현재 Serenity adapter

개인용 MVP에서는 외부 analytics 도구를 연결하지 않습니다. 앱 adapter는
최근 200개 이벤트를 브라우저 `localStorage`에 보관하고, 탭 단위 session id는
`sessionStorage`에 둡니다. 저장 실패는 화면 동작을 중단시키지 않습니다.

현재 연결된 이벤트는 다음과 같습니다.

- `page_view`
- `ticker_row_opened`
- `source_link_opened`
- `filter_applied`

브라우저 콘솔에서 기록을 확인할 수 있습니다.

```js
JSON.parse(
  localStorage.getItem("serenity:user-behavior-log:events:v1") ?? "[]",
);
```

metadata에는 투자 리서치 행동을 해석하는 데 필요한 비식별 값만 넣습니다.
검색 원문, 인증 정보, 게시글 원문 같은 민감하거나 큰 payload는 기록하지
않습니다. 여러 세션을 집계할 필요가 생기면 코어를 바꾸지 않고 sender만
Supabase adapter로 교체합니다.
