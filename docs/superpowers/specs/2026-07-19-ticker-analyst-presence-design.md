# Ticker Analyst Presence Design

## Goal

The ticker table must let a user scan which influencers mentioned each stock
and understand each influencer's latest stance without opening every ticker.
The design must remain stable when a ticker has been mentioned by 6–15
influencers.

The primary action remains opening the ticker detail page. Inspecting the full
influencer list is a secondary, in-place action that must not navigate away
from the table.

## Approved Direction

Use a compact summary in the analyst column:

- desktop: the three most recently active influencers, followed by `+N`;
- mobile: the two most recently active influencers, followed by `+N`;
- each visible influencer shows an identity mark and latest-stance signal;
- a consensus badge summarizes agreement or disagreement;
- selecting the analyst summary opens the full list in a popover.

This is preferred over rendering every influencer name because it preserves a
fixed row height. It is preferred over fixed influencer columns because it
does not create horizontal growth as accounts are added.

## Information Hierarchy

Each desktop ticker row presents analyst information in this order:

1. Up to three influencer chips, ordered by most recent mention.
2. A `+N` control when additional influencers exist.
3. A compact consensus line:
   - `5명 긍정 · 1명 부정`
   - `최근 관점 일치`
   - `관점 엇갈림`
   - `단일 분석가`

Each chip contains:

- deterministic initials when no profile image exists;
- a shortened display name;
- a stance marker and a screen-reader label:
  - bullish: green upward signal;
  - bearish: red downward signal;
  - mixed: amber split signal;
  - neutral or unknown: gray neutral signal.

Color must not be the only way stance is communicated. The chip title and
accessible name include the influencer name and localized stance.

On mobile, the ticker row keeps two compact identity marks, `+N`, and the
agreement/disagreement badge. Full names are available in the popover.

## Representative Ordering

Influencers are sorted deterministically by:

1. `lastMentionedAt` descending;
2. `totalMentions` descending;
3. display name ascending.

This makes the visible representatives useful for recency while preventing
unstable ordering when timestamps match.

## Popover

The analyst summary is a real button above the row-wide ticker link overlay.
It opens a popover without navigating to the ticker detail page.

The popover header shows the ticker and total influencer count. Every
influencer row shows:

- display name and X username;
- latest stance;
- total mention count;
- relative time of the latest mention;
- latest source link when available.

The popover uses the same ordering as the compact summary. It closes on
Escape, outside interaction, or a second press of the trigger. Focus returns
to the trigger after keyboard dismissal. The trigger exposes `aria-expanded`
and an accessible label such as `NVDA 언급 분석가 7명 보기`.

On narrow screens the same content uses a viewport-safe anchored panel. It
must not exceed the viewport width or introduce horizontal page overflow.

## Consensus Rules

Use the latest countable stance for each influencer:

- `agreement`: at least two influencers and all latest stances match;
- `disagreement`: at least one bullish and one bearish stance;
- `mixed`: two or more influencers are present but the latest stances do not
  satisfy agreement or directional disagreement;
- `single_source`: only one influencer has a summary for the ticker.

The compact count line counts bullish and bearish latest stances. Neutral,
mixed, and unknown stances are summarized as `그 외 N명` when present.

Consensus calculation lives in a shared pure helper so overview rows and
ticker details cannot drift.

## Data and Component Boundaries

No database migration is required. `TickerOverview.analysts` already includes
the required `AnalystSnapshot` fields:

- name, username and key;
- total mentions;
- latest stance;
- last mention time;
- latest source URL.

Add focused UI units:

- `AnalystPresence`: sorting, visible-count selection, consensus summary and
  trigger semantics;
- `AnalystPresenceChip`: one influencer identity and stance;
- `AnalystPresencePopover`: full influencer list and source links;
- shared analyst comparison and sorting helpers.

`TickerRow` composes these units and retains responsibility for ticker
navigation and the remaining metrics.

## Responsive Behavior

Desktop and tablet:

- analyst column width increases enough for three compact chips;
- row height remains fixed;
- names truncate rather than wrapping;
- popover is anchored to the analyst trigger.

Mobile:

- the separately hidden analyst column remains hidden;
- the ticker cell receives a compact `AnalystPresence` mobile variant;
- two identity marks, `+N`, and consensus remain visible in the first row;
- company name remains hidden as in the current layout;
- the row-wide ticker link and watchlist control keep their existing behavior.

## Empty and Edge States

- No analyst data: show `언급 정보 없음`; do not render a popover trigger.
- One influencer: show the influencer and `단일 분석가`.
- More than three desktop or two mobile: render the exact hidden count.
- Missing source URL: omit the source action for that influencer.
- Long names and usernames: truncate visually while preserving the full value
  in the accessible name and title.
- Unknown stance: display the neutral visual treatment and `판단 보류`.

## Scope

Included:

- compact desktop and mobile analyst presence;
- latest-stance signals;
- agreement/disagreement summary;
- full-list popover;
- source links and keyboard accessibility;
- unit, interaction and responsive coverage.

Excluded from this iteration:

- analyst multi-select filtering;
- profile images fetched from X;
- customizable analyst pinning;
- table sorting by an individual influencer;
- changes to ingestion, analysis or database schemas.

## Verification

Unit tests cover:

- zero, one, three and more-than-three influencer states;
- deterministic sorting;
- bullish, bearish, mixed, neutral and unknown signals;
- agreement, disagreement, mixed and single-source summaries;
- exact `+N` calculations for desktop and mobile.

Interaction tests cover:

- opening and closing the popover;
- Escape behavior and focus restoration;
- source links;
- analyst interaction not triggering ticker navigation.

Responsive E2E coverage checks:

- no horizontal overflow on the ticker overview;
- two mobile representatives plus `+N`;
- the popover remains within the viewport;
- the ticker row still opens the detail page outside interactive controls.
