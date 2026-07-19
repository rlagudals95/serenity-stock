# Ticker Analyst Presence Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Show the most relevant influencers and their latest stances in every ticker row, with a scalable `+N` summary and an accessible full-list popover.

**Architecture:** Keep the existing `TickerOverview.analysts` data contract and add a pure model module for deterministic ordering and consensus calculation. Build one client-side `AnalystPresence` component with desktop and mobile variants, render its popover through a body portal so table overflow cannot clip it, and compose it from `TickerRow`. No database or pipeline changes are required.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Lucide, Vitest, Testing Library, Playwright, CSS.

---

## File Structure

- Create `src/features/tickers/analyst-presence-model.ts`
  - Pure sorting, initials, stance counts and consensus functions.
- Create `src/features/tickers/analyst-presence-model.test.ts`
  - Unit coverage for ordering, counts, consensus and visible limits.
- Create `src/features/tickers/analyst-presence.tsx`
  - Chips, trigger, portal popover, dismissal and focus behavior.
- Create `src/features/tickers/analyst-presence.test.tsx`
  - Accessible interaction and edge-state tests.
- Modify `src/features/tickers/repository.ts`
  - Reuse the shared consensus helper for ticker details.
- Modify `src/features/tickers/ticker-row.tsx`
  - Replace free-form analyst badges and mobile text with `AnalystPresence`.
- Modify `src/features/tickers/ticker-table.tsx`
  - Rename the analyst header and allow the scalable summary width.
- Modify `src/features/tickers/ticker-table.test.tsx`
  - Verify table integration and row navigation isolation.
- Modify `src/features/tickers/fixtures.ts`
  - Give one fixture ticker more than three historical analyst snapshots for responsive coverage.
- Modify `src/app/globals.css`
  - Add fixed-height desktop chips, mobile compact signals and portal popover styling.
- Modify `src/lib/supabase/config.ts`
  - Support an explicit test-only fixture mode in the existing resolver.
- Modify `src/lib/supabase/config.test.ts`
  - Verify fixture mode bypasses hosted configuration.
- Modify `playwright.config.ts`
  - Start the E2E server in deterministic fixture mode.
- Modify `e2e/serenity.spec.ts`
  - Replace stale copy/count assertions and test the analyst popover without overflow.

### Task 1: Shared analyst presence model

**Files:**
- Create: `src/features/tickers/analyst-presence-model.test.ts`
- Create: `src/features/tickers/analyst-presence-model.ts`
- Modify: `src/features/tickers/repository.ts:360-410`

- [ ] **Step 1: Write the failing model tests**

Create tests with a small snapshot builder and explicit expectations:

```ts
import { describe, expect, it } from "vitest";

import type { AnalystSnapshot, Stance } from "./types";
import {
  analystInitials,
  buildAnalystPresenceModel,
  compareAnalystSnapshots,
  sortAnalystSnapshots,
} from "./analyst-presence-model";

function snapshot(
  name: string,
  latestStance: Stance,
  lastMentionedAt: string,
  totalMentions = 1,
): AnalystSnapshot {
  const key = name.toLowerCase().replaceAll(" ", "_");
  return {
    key,
    name,
    username: key,
    totalMentions,
    positiveCount: latestStance === "bullish" ? totalMentions : 0,
    negativeCount: latestStance === "bearish" ? totalMentions : 0,
    neutralCount: latestStance === "neutral" ? totalMentions : 0,
    mixedCount: latestStance === "mixed" ? totalMentions : 0,
    unknownCount: latestStance === "unknown" ? totalMentions : 0,
    cumulativeSentiment: "neutral",
    latestStance,
    latestClaim: null,
    latestChangeType: null,
    firstMentionedAt: lastMentionedAt,
    lastMentionedAt,
    latestSourceUrl: `https://x.com/${key}/status/1`,
  };
}

describe("analyst presence model", () => {
  it("orders by recency, mention count, then display name", () => {
    const analysts = [
      snapshot("Zulu", "bullish", "2026-07-17T00:00:00Z", 10),
      snapshot("Beta", "bearish", "2026-07-18T00:00:00Z", 2),
      snapshot("Alpha", "bullish", "2026-07-18T00:00:00Z", 2),
      snapshot("Gamma", "neutral", "2026-07-18T00:00:00Z", 5),
    ];

    expect(sortAnalystSnapshots(analysts).map((item) => item.name)).toEqual([
      "Gamma",
      "Alpha",
      "Beta",
      "Zulu",
    ]);
  });

  it("builds visible analysts, hidden count and stance counts", () => {
    const model = buildAnalystPresenceModel(
      [
        snapshot("One", "bullish", "2026-07-18T04:00:00Z"),
        snapshot("Two", "bullish", "2026-07-18T03:00:00Z"),
        snapshot("Three", "bearish", "2026-07-18T02:00:00Z"),
        snapshot("Four", "unknown", "2026-07-18T01:00:00Z"),
      ],
      3,
    );

    expect(model.visible.map((item) => item.name)).toEqual([
      "One",
      "Two",
      "Three",
    ]);
    expect(model.hiddenCount).toBe(1);
    expect(model.counts).toEqual({ bullish: 2, bearish: 1, other: 1 });
    expect(model.comparison).toBe("disagreement");
  });

  it("classifies agreement, mixed, disagreement and a single source", () => {
    const at = "2026-07-18T00:00:00Z";
    expect(
      compareAnalystSnapshots([
        snapshot("One", "bullish", at),
        snapshot("Two", "bullish", at),
      ]),
    ).toBe("agreement");
    expect(
      compareAnalystSnapshots([
        snapshot("One", "bullish", at),
        snapshot("Two", "bearish", at),
      ]),
    ).toBe("disagreement");
    expect(
      compareAnalystSnapshots([
        snapshot("One", "bullish", at),
        snapshot("Two", "neutral", at),
      ]),
    ).toBe("mixed");
    expect(compareAnalystSnapshots([snapshot("One", "unknown", at)])).toBe(
      "single_source",
    );
  });

  it("creates deterministic one- or two-letter initials", () => {
    expect(analystInitials("Serenity")).toBe("SE");
    expect(analystInitials("Shay Boloor")).toBe("SB");
    expect(analystInitials("  ")).toBe("?");
  });
});
```

- [ ] **Step 2: Run the test and verify it fails**

Run:

```bash
pnpm vitest run src/features/tickers/analyst-presence-model.test.ts
```

Expected: FAIL because `./analyst-presence-model` does not exist.

- [ ] **Step 3: Implement the pure model**

Create:

```ts
import type {
  AnalystComparison,
  AnalystSnapshot,
  Stance,
} from "./types";

export interface AnalystStanceCounts {
  bullish: number;
  bearish: number;
  other: number;
}

export interface AnalystPresenceModel {
  all: AnalystSnapshot[];
  visible: AnalystSnapshot[];
  hiddenCount: number;
  counts: AnalystStanceCounts;
  comparison: AnalystComparison;
}

export const analystStanceLabels: Record<Stance, string> = {
  bullish: "긍정 의견",
  bearish: "부정 의견",
  mixed: "혼재",
  neutral: "중립",
  unknown: "판단 보류",
};

export const analystComparisonLabels: Record<AnalystComparison, string> = {
  agreement: "최근 관점 일치",
  disagreement: "관점 엇갈림",
  mixed: "관점 혼재",
  single_source: "단일 분석가",
};

export function sortAnalystSnapshots(analysts: AnalystSnapshot[]) {
  return [...analysts].sort(
    (left, right) =>
      right.lastMentionedAt.localeCompare(left.lastMentionedAt) ||
      right.totalMentions - left.totalMentions ||
      left.name.localeCompare(right.name),
  );
}

export function compareAnalystSnapshots(
  analysts: AnalystSnapshot[],
): AnalystComparison {
  if (analysts.length < 2) return "single_source";
  const stances = analysts.map((analyst) => analyst.latestStance);
  if (stances.includes("bullish") && stances.includes("bearish")) {
    return "disagreement";
  }
  if (stances.every((stance) => stance === stances[0])) return "agreement";
  return "mixed";
}

export function countLatestStances(
  analysts: AnalystSnapshot[],
): AnalystStanceCounts {
  return analysts.reduce<AnalystStanceCounts>(
    (counts, analyst) => {
      if (analyst.latestStance === "bullish") counts.bullish += 1;
      else if (analyst.latestStance === "bearish") counts.bearish += 1;
      else counts.other += 1;
      return counts;
    },
    { bullish: 0, bearish: 0, other: 0 },
  );
}

export function buildAnalystPresenceModel(
  analysts: AnalystSnapshot[],
  visibleLimit: number,
): AnalystPresenceModel {
  const all = sortAnalystSnapshots(analysts);
  const visible = all.slice(0, visibleLimit);
  return {
    all,
    visible,
    hiddenCount: Math.max(0, all.length - visible.length),
    counts: countLatestStances(all),
    comparison: compareAnalystSnapshots(all),
  };
}

export function analystInitials(name: string) {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (!words.length) return "?";
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return `${words[0][0]}${words[words.length - 1][0]}`.toUpperCase();
}
```

- [ ] **Step 4: Replace the duplicate repository comparison**

Import `compareAnalystSnapshots` in `repository.ts`, delete the private
`compareAnalysts` function, and change the detail mapper:

```ts
import { compareAnalystSnapshots } from "./analyst-presence-model";
```

Replace the existing return-field expression exactly:

```diff
-    analystComparison: compareAnalysts(analysts),
+    analystComparison: compareAnalystSnapshots(analysts),
```

- [ ] **Step 5: Run focused tests**

Run:

```bash
pnpm vitest run \
  src/features/tickers/analyst-presence-model.test.ts \
  src/features/tickers/repository.test.ts
```

Expected: both test files PASS.

- [ ] **Step 6: Commit the model**

```bash
git add \
  src/features/tickers/analyst-presence-model.ts \
  src/features/tickers/analyst-presence-model.test.ts \
  src/features/tickers/repository.ts
git commit -m "feat: add analyst presence model"
```

### Task 2: Accessible analyst presence and popover

**Files:**
- Create: `src/features/tickers/analyst-presence.test.tsx`
- Create: `src/features/tickers/analyst-presence.tsx`

- [ ] **Step 1: Write failing interaction tests**

Use four snapshots so desktop renders three representatives and `+1`:

```tsx
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import type { AnalystSnapshot, Stance } from "./types";
import { AnalystPresence } from "./analyst-presence";

function analyst(
  name: string,
  latestStance: Stance,
  lastMentionedAt: string,
): AnalystSnapshot {
  const key = name.toLowerCase().replaceAll(" ", "_");
  return {
    key,
    name,
    username: key,
    totalMentions: 3,
    positiveCount: 0,
    negativeCount: 0,
    neutralCount: 0,
    mixedCount: 0,
    unknownCount: 0,
    cumulativeSentiment: "neutral",
    latestStance,
    latestClaim: null,
    latestChangeType: null,
    firstMentionedAt: lastMentionedAt,
    lastMentionedAt,
    latestSourceUrl: `https://x.com/${key}/status/1`,
  };
}

const analysts = [
  analyst("Serenity", "bullish", "2026-07-18T04:00:00Z"),
  analyst("Shay Boloor", "bullish", "2026-07-18T03:00:00Z"),
  analyst("Beth Kindig", "bullish", "2026-07-18T02:00:00Z"),
  analyst("Bear Case", "bearish", "2026-07-18T01:00:00Z"),
];

describe("AnalystPresence", () => {
  it("shows three desktop representatives and the hidden count", () => {
    render(
      <AnalystPresence analysts={analysts} ticker="NVDA" variant="desktop" />,
    );

    expect(
      screen.getByRole("button", { name: "NVDA 언급 분석가 4명 보기" }),
    ).toHaveTextContent("+1");
    expect(screen.getByText("Serenity")).toBeInTheDocument();
    expect(screen.getByText("Shay Boloor")).toBeInTheDocument();
    expect(screen.getByText("Beth Kindig")).toBeInTheDocument();
    expect(screen.queryByText("Bear Case")).not.toBeInTheDocument();
    expect(screen.getByText("관점 엇갈림")).toBeInTheDocument();
  });

  it("shows two representatives in the mobile variant", () => {
    render(
      <AnalystPresence analysts={analysts} ticker="NVDA" variant="mobile" />,
    );

    expect(screen.getByText("+2")).toBeInTheDocument();
    expect(screen.getByLabelText("Serenity · 긍정 의견")).toBeInTheDocument();
    expect(screen.getByLabelText("Shay Boloor · 긍정 의견")).toBeInTheDocument();
  });

  it("opens the full list, exposes source links, and closes on Escape", () => {
    render(
      <AnalystPresence analysts={analysts} ticker="NVDA" variant="desktop" />,
    );
    const trigger = screen.getByRole("button", {
      name: "NVDA 언급 분석가 4명 보기",
    });

    fireEvent.click(trigger);
    expect(screen.getByRole("dialog", { name: "NVDA 언급 분석가" })).toBeVisible();
    expect(screen.getByText("Bear Case")).toBeInTheDocument();
    expect(screen.getAllByRole("link", { name: "최근 원문" })).toHaveLength(4);

    fireEvent.keyDown(document, { key: "Escape" });
    expect(
      screen.queryByRole("dialog", { name: "NVDA 언급 분석가" }),
    ).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });

  it("renders a non-interactive empty state", () => {
    render(<AnalystPresence analysts={[]} ticker="NVDA" variant="desktop" />);
    expect(screen.getByText("언급 정보 없음")).toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run the test and verify it fails**

Run:

```bash
pnpm vitest run src/features/tickers/analyst-presence.test.tsx
```

Expected: FAIL because `./analyst-presence` does not exist.

- [ ] **Step 3: Implement the component**

Create a client component with these public props and internal boundaries:

```tsx
"use client";

import {
  ArrowDown,
  ArrowUp,
  ExternalLink,
  Minus,
  Split,
} from "lucide-react";
import {
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";

import {
  analystComparisonLabels,
  analystInitials,
  analystStanceLabels,
  buildAnalystPresenceModel,
} from "./analyst-presence-model";
import { formatRelativeTime } from "./format";
import type { AnalystSnapshot, Stance } from "./types";

type PresenceVariant = "desktop" | "mobile";

interface AnalystPresenceProps {
  analysts: AnalystSnapshot[];
  ticker: string;
  variant: PresenceVariant;
}

function StanceIcon({ stance }: { stance: Stance }) {
  if (stance === "bullish") return <ArrowUp aria-hidden="true" size={10} />;
  if (stance === "bearish") return <ArrowDown aria-hidden="true" size={10} />;
  if (stance === "mixed") return <Split aria-hidden="true" size={10} />;
  return <Minus aria-hidden="true" size={10} />;
}

function AnalystPresenceChip({
  analyst,
  compact,
}: {
  analyst: AnalystSnapshot;
  compact: boolean;
}) {
  const label = `${analyst.name} · ${analystStanceLabels[analyst.latestStance]}`;
  return (
    <span
      aria-label={label}
      className={`analyst-presence-chip analyst-presence-chip--${analyst.latestStance} ${
        compact ? "is-compact" : ""
      }`}
      title={label}
    >
      <span aria-hidden="true" className="analyst-presence-chip__avatar">
        {analystInitials(analyst.name)}
      </span>
      {compact ? null : (
        <span className="analyst-presence-chip__name">{analyst.name}</span>
      )}
      <span aria-hidden="true" className="analyst-presence-chip__stance">
        <StanceIcon stance={analyst.latestStance} />
      </span>
    </span>
  );
}

function PresencePopover({
  analysts,
  labelledBy,
  panelRef,
  position,
  ticker,
}: {
  analysts: AnalystSnapshot[];
  labelledBy: string;
  panelRef: React.RefObject<HTMLDivElement | null>;
  position: { left: number; top: number; width: number };
  ticker: string;
}) {
  return createPortal(
    <div
      aria-labelledby={labelledBy}
      className="analyst-presence-popover"
      ref={panelRef}
      role="dialog"
      style={position}
    >
      <header>
        <strong id={labelledBy}>{ticker} 언급 분석가</strong>
        <span>{analysts.length}명</span>
      </header>
      <ul>
        {analysts.map((analyst) => (
          <li key={analyst.key}>
            <div className="analyst-presence-popover__identity">
              <strong>{analyst.name}</strong>
              <span>@{analyst.username}</span>
            </div>
            <span
              className={`analyst-presence-popover__stance is-${analyst.latestStance}`}
            >
              {analystStanceLabels[analyst.latestStance]}
            </span>
            <span>{analyst.totalMentions}회</span>
            <span>{formatRelativeTime(analyst.lastMentionedAt)}</span>
            {analyst.latestSourceUrl ? (
              <a
                href={analyst.latestSourceUrl}
                rel="noopener noreferrer"
                target="_blank"
              >
                최근 원문
                <ExternalLink aria-hidden="true" size={11} />
              </a>
            ) : null}
          </li>
        ))}
      </ul>
    </div>,
    document.body,
  );
}

export function AnalystPresence({
  analysts,
  ticker,
  variant,
}: AnalystPresenceProps) {
  const model = buildAnalystPresenceModel(
    analysts,
    variant === "mobile" ? 2 : 3,
  );
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState({ left: 12, top: 12, width: 360 });
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const titleId = useId();

  useLayoutEffect(() => {
    if (!open || !triggerRef.current) return;
    const trigger = triggerRef.current.getBoundingClientRect();
    const width = Math.min(380, window.innerWidth - 24);
    const panelHeight = panelRef.current?.getBoundingClientRect().height ?? 320;
    const left = Math.min(
      Math.max(12, trigger.left),
      window.innerWidth - width - 12,
    );
    const below = trigger.bottom + 8;
    const top =
      below + panelHeight <= window.innerHeight - 12
        ? below
        : Math.max(12, trigger.top - panelHeight - 8);
    setPosition({ left, top, width });
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function closeFromDocument(event: PointerEvent) {
      const target = event.target as Node;
      if (
        triggerRef.current?.contains(target) ||
        panelRef.current?.contains(target)
      ) {
        return;
      }
      setOpen(false);
    }
    function closeFromKeyboard(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      setOpen(false);
      requestAnimationFrame(() => triggerRef.current?.focus());
    }
    document.addEventListener("pointerdown", closeFromDocument);
    document.addEventListener("keydown", closeFromKeyboard);
    return () => {
      document.removeEventListener("pointerdown", closeFromDocument);
      document.removeEventListener("keydown", closeFromKeyboard);
    };
  }, [open]);

  if (!model.all.length) {
    return <span className="analyst-presence-empty">언급 정보 없음</span>;
  }

  const countParts = [
    model.counts.bullish ? `${model.counts.bullish}명 긍정` : null,
    model.counts.bearish ? `${model.counts.bearish}명 부정` : null,
    model.counts.other ? `그 외 ${model.counts.other}명` : null,
  ].filter(Boolean);

  return (
    <div className={`analyst-presence analyst-presence--${variant}`}>
      <button
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-label={`${ticker} 언급 분석가 ${model.all.length}명 보기`}
        className="analyst-presence__trigger"
        onClick={() => setOpen((value) => !value)}
        ref={triggerRef}
        type="button"
      >
        <span className="analyst-presence__chips">
          {model.visible.map((analyst) => (
            <AnalystPresenceChip
              analyst={analyst}
              compact={variant === "mobile"}
              key={analyst.key}
            />
          ))}
          {model.hiddenCount ? (
            <span className="analyst-presence__more">+{model.hiddenCount}</span>
          ) : null}
        </span>
        <span className="analyst-presence__summary">
          {variant === "desktop" ? (
            <span className="analyst-presence__counts">
              {countParts.join(" · ")}
            </span>
          ) : null}
          <span
            className={`analyst-presence__comparison is-${model.comparison}`}
          >
            {analystComparisonLabels[model.comparison]}
          </span>
        </span>
      </button>
      {open ? (
        <PresencePopover
          analysts={model.all}
          labelledBy={titleId}
          panelRef={panelRef}
          position={position}
          ticker={ticker}
        />
      ) : null}
    </div>
  );
}
```

Keep this public interface and interaction behavior unchanged. JSX formatting
can follow the repository's formatter and ESLint rules.

- [ ] **Step 4: Run the interaction tests**

Run:

```bash
pnpm vitest run src/features/tickers/analyst-presence.test.tsx
```

Expected: all four tests PASS.

- [ ] **Step 5: Commit the component**

```bash
git add \
  src/features/tickers/analyst-presence.tsx \
  src/features/tickers/analyst-presence.test.tsx
git commit -m "feat: add analyst presence popover"
```

### Task 3: Integrate presence into ticker rows

**Files:**
- Modify: `src/features/tickers/ticker-row.tsx`
- Modify: `src/features/tickers/ticker-table.tsx`
- Modify: `src/features/tickers/ticker-table.test.tsx`
- Modify: `src/app/globals.css`

- [ ] **Step 1: Extend the table integration test**

Update the test fixture to contain four analysts. Keep the existing Serenity
and Shay objects, then append two snapshots with newer or older timestamps.
Add these assertions:

```tsx
expect(
  screen.getByRole("columnheader", { name: "분석가별 최근 관점" }),
).toBeInTheDocument();
expect(
  screen.getByRole("button", { name: "COHR 언급 분석가 4명 보기" }),
).toHaveTextContent("+1");

fireEvent.click(
  screen.getByRole("button", { name: "COHR 언급 분석가 4명 보기" }),
);
expect(
  screen.getByRole("dialog", { name: "COHR 언급 분석가" }),
).toBeVisible();
expect(
  screen.getByRole("link", { name: /COHR Coherent Corp\./ }),
).toHaveAttribute("href", "/tickers/COHR");
```

Import `fireEvent` from Testing Library. Remove the old expectation for the
special-cased text `Shay`; the component renders the profile display name.

- [ ] **Step 2: Run the table test and verify it fails**

Run:

```bash
pnpm vitest run src/features/tickers/ticker-table.test.tsx
```

Expected: FAIL because the current row has no scalable trigger or new header.

- [ ] **Step 3: Replace the current analyst markup**

In `ticker-row.tsx`:

```tsx
import { AnalystPresence } from "./analyst-presence";

// Inside the ticker header, keep the Link focused on ticker identity only:
<th className="ticker-column" scope="row">
  <Link
    aria-label={`${row.ticker} ${row.companyName}`}
    className="ticker-link"
    href={href}
  >
    <span className="ticker-symbol">{row.ticker}</span>
    <span className="company-name">{row.companyName}</span>
  </Link>
  <div className="ticker-link__analysts">
    <AnalystPresence
      analysts={analysts}
      ticker={row.ticker}
      variant="mobile"
    />
  </div>
</th>

// Replace analyst-presence__item mapping in the desktop cell:
<td className="analyst-column">
  <AnalystPresence
    analysts={analysts}
    ticker={row.ticker}
    variant="desktop"
  />
</td>
```

In `ticker-table.tsx`, rename the header and increase the column width through
CSS rather than inline markup:

```ts
{ label: "분석가별 최근 관점", className: "analyst-column" },
```

- [ ] **Step 4: Add the approved visual treatment**

Replace the old `.analyst-presence__item` rules and add the following class
families in `globals.css`:

```css
.ticker-table col.analyst-column {
  width: 286px;
}

.analyst-presence {
  position: relative;
  z-index: 3;
  min-width: 0;
}

.analyst-presence__trigger {
  display: flex;
  width: 100%;
  min-width: 0;
  flex-direction: column;
  align-items: flex-start;
  padding: 0;
  border: 0;
  background: transparent;
  color: inherit;
  cursor: pointer;
  gap: 4px;
  text-align: left;
}

.analyst-presence__chips,
.analyst-presence__summary {
  display: flex;
  min-width: 0;
  align-items: center;
  gap: 5px;
}

.analyst-presence-chip {
  display: inline-flex;
  min-width: 0;
  max-width: 78px;
  min-height: 22px;
  align-items: center;
  padding: 1px 6px 1px 3px;
  gap: 4px;
  border: 1px solid var(--border);
  border-radius: 999px;
  background: var(--surface-raised);
  color: var(--ink-secondary);
}

.analyst-presence-chip__avatar {
  display: grid;
  width: 16px;
  height: 16px;
  flex: 0 0 16px;
  place-items: center;
  border-radius: 50%;
  background: var(--surface-hover);
  font-family: var(--font-data), monospace;
  font-size: 0.5rem;
  font-weight: 700;
}

.analyst-presence-chip__name {
  min-width: 0;
  overflow: hidden;
  font-size: 0.625rem;
  font-weight: 600;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.analyst-presence-chip__stance {
  display: inline-grid;
  flex: 0 0 14px;
  place-items: center;
}

.analyst-presence-chip--bullish .analyst-presence-chip__stance,
.analyst-presence-popover__stance.is-bullish {
  color: var(--positive);
}

.analyst-presence-chip--bearish .analyst-presence-chip__stance,
.analyst-presence-popover__stance.is-bearish {
  color: var(--negative);
}

.analyst-presence-chip--mixed .analyst-presence-chip__stance,
.analyst-presence-popover__stance.is-mixed {
  color: var(--mixed);
}

.analyst-presence__more,
.analyst-presence__comparison {
  display: inline-flex;
  min-height: 20px;
  align-items: center;
  padding: 1px 6px;
  border-radius: 999px;
  background: var(--surface-hover);
  color: var(--ink-muted);
  font-size: 0.625rem;
  font-weight: 700;
  white-space: nowrap;
}

.analyst-presence__counts {
  overflow: hidden;
  color: var(--ink-muted);
  font-size: 0.625rem;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.analyst-presence__comparison.is-agreement {
  background: color-mix(in oklch, var(--positive) 10%, var(--surface));
  color: var(--positive);
}

.analyst-presence__comparison.is-disagreement {
  background: color-mix(in oklch, var(--negative) 10%, var(--surface));
  color: var(--negative);
}

.analyst-presence-popover {
  position: fixed;
  z-index: 200;
  max-height: min(420px, calc(100vh - 24px));
  overflow: auto;
  border: 1px solid var(--border-strong);
  border-radius: var(--radius-md);
  background: var(--surface);
  box-shadow: 0 16px 40px rgb(15 23 42 / 16%);
}

.analyst-presence-popover > header,
.analyst-presence-popover li {
  display: grid;
  align-items: center;
  gap: 8px;
}

.analyst-presence-popover > header {
  grid-template-columns: 1fr auto;
  padding: 11px 12px;
  border-bottom: 1px solid var(--border);
}

.analyst-presence-popover ul {
  margin: 0;
  padding: 0;
  list-style: none;
}

.analyst-presence-popover li {
  grid-template-columns: minmax(100px, 1fr) auto auto auto auto;
  padding: 9px 12px;
  border-bottom: 1px solid var(--border);
  font-size: 0.6875rem;
}

.analyst-presence-popover li:last-child {
  border-bottom: 0;
}

.analyst-presence-popover__identity {
  display: flex;
  min-width: 0;
  flex-direction: column;
}

.analyst-presence-popover__identity span {
  overflow: hidden;
  color: var(--ink-muted);
  text-overflow: ellipsis;
  white-space: nowrap;
}
```

Retain the existing `ticker-link::after` overlay. Ensure
`.ticker-link__analysts`, `.analyst-presence__trigger`, and popover source
links have `position: relative; z-index: 3` where they exist inside a row.

In the mobile media query:

```css
.ticker-link__analysts {
  display: block;
  max-width: 220px;
  margin-top: 4px;
}

.analyst-presence--mobile .analyst-presence__trigger {
  flex-direction: row;
  align-items: center;
}

.analyst-presence--mobile .analyst-presence-chip {
  width: 26px;
  padding: 2px 3px;
}

.analyst-presence--mobile .analyst-presence-chip__avatar {
  width: 14px;
  height: 14px;
  flex-basis: 14px;
}

.analyst-presence--mobile .analyst-presence__summary {
  flex: 0 0 auto;
}
```

- [ ] **Step 5: Run table and component tests**

Run:

```bash
pnpm vitest run \
  src/features/tickers/analyst-presence.test.tsx \
  src/features/tickers/ticker-table.test.tsx
```

Expected: both files PASS with no nested-interactive-element warnings.

- [ ] **Step 6: Commit table integration**

```bash
git add \
  src/features/tickers/ticker-row.tsx \
  src/features/tickers/ticker-table.tsx \
  src/features/tickers/ticker-table.test.tsx \
  src/app/globals.css
git commit -m "feat: show analyst stances in ticker rows"
```

### Task 4: Deterministic responsive E2E coverage

**Files:**
- Modify: `src/lib/supabase/config.ts`
- Modify: `src/lib/supabase/config.test.ts`
- Modify: `src/features/tickers/fixtures.ts`
- Modify: `playwright.config.ts`
- Modify: `e2e/serenity.spec.ts`

- [ ] **Step 1: Write the failing fixture-mode test**

Add to `src/lib/supabase/config.test.ts`:

```ts
it("disables hosted reads when explicit fixture mode is enabled", () => {
  expect(
    resolveSupabaseDataConfig({
      SERENITY_FIXTURE_MODE: "true",
      SUPABASE_URL: "https://project.supabase.co",
      SUPABASE_SECRET_KEY: "secret",
    }),
  ).toEqual({ mode: "fixture" });
});
```

- [ ] **Step 2: Run the config test and verify it fails**

Run:

```bash
pnpm vitest run src/lib/supabase/config.test.ts
```

Expected: FAIL because fixture mode is not recognized.

- [ ] **Step 3: Implement explicit fixture mode**

At the beginning of `resolveSupabaseDataConfig` in
`src/lib/supabase/config.ts`, before reading the URL and keys:

```ts
if (configured(environment.SERENITY_FIXTURE_MODE) === "true") {
  return { mode: "fixture" };
}
```

- [ ] **Step 4: Give COHR more than three fixture analysts**

In `fixtureAnalysts`, assign the original two-element result to
`baseAnalysts`. Return it unchanged for tickers other than COHR. For COHR,
return five snapshots whose counts still add up to the row's 47 total
mentions, 38 positive, 3 negative, 2 neutral, 3 mixed and 1 unknown:

```ts
const baseAnalysts: AnalystSnapshot[] = [
  {
    key: "shay_boloor",
    name: "Shay Boloor",
    username: "StockSavvyShay",
    totalMentions: shayMentions,
    positiveCount: shayPositive,
    negativeCount: shayNegative,
    neutralCount: Math.ceil(shayOther / 2),
    mixedCount: Math.floor(shayOther / 2),
    unknownCount: 0,
    cumulativeSentiment:
      shayPositive + shayNegative < 3
        ? "insufficient"
        : shayPositive >= shayNegative
          ? "positive"
          : "negative",
    latestStance: narratives[row.ticker].stance,
    latestClaim: narratives[row.ticker].claim,
    latestChangeType: narratives[row.ticker].changeType,
    firstMentionedAt: "2026-05-10T03:00:00.000Z",
    lastMentionedAt: row.lastMentionedAt,
    latestSourceUrl: sourceUrl(row.ticker, 1, "StockSavvyShay"),
  },
  {
    key: "serenity",
    name: "Serenity",
    username: "aleabitoreddit",
    totalMentions: serenityMentions,
    positiveCount: serenityPositive,
    negativeCount: serenityNegative,
    neutralCount: Math.ceil(serenityOther / 2),
    mixedCount: Math.floor(serenityOther / 2),
    unknownCount: 0,
    cumulativeSentiment: row.cumulativeSentiment,
    latestStance: row.latestStance,
    latestClaim: narratives[row.ticker].earlierClaim,
    latestChangeType: row.changeType,
    firstMentionedAt: "2026-04-01T03:00:00.000Z",
    lastMentionedAt: "2026-07-16T03:20:00.000Z",
    latestSourceUrl: sourceUrl(row.ticker, 2, "aleabitoreddit"),
  },
];
if (row.ticker !== "COHR") return baseAnalysts;

const [shay, serenity] = baseAnalysts;
return [
  {
    ...shay,
    totalMentions: 15,
    positiveCount: 13,
    negativeCount: 1,
    neutralCount: 0,
    mixedCount: 1,
    unknownCount: 0,
  },
  {
    ...serenity,
    totalMentions: 18,
    positiveCount: 16,
    negativeCount: 0,
    neutralCount: 0,
    mixedCount: 1,
    unknownCount: 1,
  },
  {
    key: "growth_desk",
    name: "Growth Desk",
    username: "growth_desk_demo",
    totalMentions: 6,
    positiveCount: 5,
    negativeCount: 0,
    neutralCount: 0,
    mixedCount: 1,
    unknownCount: 0,
    cumulativeSentiment: "positive",
    latestStance: "bullish",
    latestClaim: "AI 네트워크 수요 확대를 주시합니다.",
    latestChangeType: "new_claim",
    firstMentionedAt: "2026-06-01T00:00:00.000Z",
    lastMentionedAt: "2026-07-16T03:00:00.000Z",
    latestSourceUrl: sourceUrl("COHR", 3, "growth_desk_demo"),
  },
  {
    key: "bear_case",
    name: "Bear Case",
    username: "bear_case_demo",
    totalMentions: 5,
    positiveCount: 2,
    negativeCount: 2,
    neutralCount: 1,
    mixedCount: 0,
    unknownCount: 0,
    cumulativeSentiment: "mixed",
    latestStance: "bearish",
    latestClaim: "밸류에이션 부담을 경계합니다.",
    latestChangeType: "new_risk",
    firstMentionedAt: "2026-06-10T00:00:00.000Z",
    lastMentionedAt: "2026-07-15T03:00:00.000Z",
    latestSourceUrl: sourceUrl("COHR", 4, "bear_case_demo"),
  },
  {
    key: "signal_lab",
    name: "Signal Lab",
    username: "signal_lab_demo",
    totalMentions: 3,
    positiveCount: 2,
    negativeCount: 0,
    neutralCount: 1,
    mixedCount: 0,
    unknownCount: 0,
    cumulativeSentiment: "positive",
    latestStance: "neutral",
    latestClaim: "다음 실적을 기다립니다.",
    latestChangeType: "repeat",
    firstMentionedAt: "2026-06-20T00:00:00.000Z",
    lastMentionedAt: "2026-07-14T03:00:00.000Z",
    latestSourceUrl: sourceUrl("COHR", 5, "signal_lab_demo"),
  },
];
```

These records are fixture-only and are not added to `analyst_profiles` or the
production database.

- [ ] **Step 5: Force the Playwright server to use fixtures**

In `playwright.config.ts`:

```ts
webServer: {
  command: "pnpm dev --hostname 127.0.0.1 --port 3000",
  env: {
    ...process.env,
    SERENITY_FIXTURE_MODE: "true",
  },
  url: "http://127.0.0.1:3000/tickers",
  reuseExistingServer: false,
  timeout: 120_000,
},
```

- [ ] **Step 6: Replace stale E2E expectations**

In `e2e/serenity.spec.ts`:

```ts
await expect(
  page.getByRole("heading", { name: "투자 관점 인텔리전스" }),
).toBeVisible();

const cohrRow = page.getByRole("row", { name: /COHR/ });
await expect(
  cohrRow.getByRole("button", { name: /COHR 언급 분석가 5명 보기/ }),
).toContainText("+2");

await cohrRow
  .getByRole("button", { name: /COHR 언급 분석가 5명 보기/ })
  .click();
await expect(
  page.getByRole("dialog", { name: "COHR 언급 분석가" }),
).toBeVisible();
await expect(
  page.getByRole("link", { name: "최근 원문" }).first(),
).toHaveAttribute("target", "_blank");
```

For the mobile project assert `+3`, because the mobile visible limit is two:

```ts
await expect(
  page.getByRole("button", { name: /COHR 언급 분석가 5명 보기/ }).first(),
).toContainText("+3");
```

Keep the existing viewport overflow calculations, the fixture total assertion
of `47`, and row-to-detail navigation assertions. Replace only the stale
heading and Serenity-specific chart accessible name.

- [ ] **Step 7: Run the deterministic E2E suite**

Run:

```bash
pnpm e2e
```

Expected: 5 PASS and 1 SKIP, with no heading, count, or overflow failures.

- [ ] **Step 8: Commit responsive coverage**

```bash
git add \
  src/lib/supabase/config.ts \
  src/lib/supabase/config.test.ts \
  src/features/tickers/fixtures.ts \
  playwright.config.ts \
  e2e/serenity.spec.ts
git commit -m "test: cover scalable analyst presence"
```

### Task 5: Full verification and visual review

**Files:**
- No planned file changes.

- [ ] **Step 1: Run static and unit verification**

```bash
pnpm lint
pnpm test
pnpm typecheck
pnpm build
```

Expected:

- ESLint exits 0.
- Vitest reports all test files and tests passing.
- TypeScript exits 0 with no diagnostics.
- Next.js production build completes successfully.

- [ ] **Step 2: Run responsive browser verification**

```bash
pnpm e2e
```

Expected: 5 PASS and 1 SKIP.

- [ ] **Step 3: Inspect the final desktop and mobile states**

Open `/tickers` at 1440×1000 and Pixel 7 dimensions. Confirm:

- desktop shows three representatives and `+N`;
- mobile shows two representatives and `+N`;
- disagreement is visible without relying only on color;
- the full list stays inside the viewport;
- source links open in a new tab;
- pressing Escape closes the popover and restores trigger focus;
- clicking elsewhere in the row still opens the ticker detail.

- [ ] **Step 4: Review the final diff**

```bash
git diff --check
git status --short
git log --oneline -5
```

Expected: no whitespace errors, only known pre-existing worktree changes, and
the task commits present at the top of the log.
