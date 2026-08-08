import { beforeEach, describe, expect, it } from "vitest";

import type { BehaviorLogEvent } from "./types";
import {
  appBehaviorLogger,
  MAX_STORED_BEHAVIOR_EVENTS,
  readStoredBehaviorLogEvents,
  storeBehaviorLogEvent,
  USER_BEHAVIOR_LOG_STORAGE_KEY,
} from "./app-behavior-logger";

const event = (index: number): BehaviorLogEvent => ({
  eventName: "ticker_row_opened",
  occurredAt: `2026-08-08T00:00:${String(index).padStart(2, "0")}.000Z`,
  path: "/tickers",
  metadata: { ticker: `TEST-${index}` },
});

describe("appBehaviorLogger", () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  it("stores behavior events with a stable per-tab session id", async () => {
    await appBehaviorLogger.click({
      eventName: "ticker_row_opened",
      path: "/tickers",
      metadata: { ticker: "NVDA" },
    });
    await appBehaviorLogger.click({
      eventName: "source_link_opened",
      path: "/tickers/NVDA",
      metadata: { ticker: "NVDA" },
    });

    const stored = readStoredBehaviorLogEvents();
    expect(stored).toHaveLength(2);
    expect(stored[0]).toMatchObject({
      eventName: "ticker_row_opened",
      path: "/tickers",
      metadata: { ticker: "NVDA" },
    });
    expect(stored[0]?.sessionId).toBeTruthy();
    expect(stored[1]?.sessionId).toBe(stored[0]?.sessionId);
  });

  it("keeps only the newest bounded set of events", () => {
    for (let index = 0; index <= MAX_STORED_BEHAVIOR_EVENTS; index += 1) {
      storeBehaviorLogEvent(event(index));
    }

    const stored = readStoredBehaviorLogEvents();
    expect(stored).toHaveLength(MAX_STORED_BEHAVIOR_EVENTS);
    expect(stored[0]?.metadata).toEqual({ ticker: "TEST-1" });
    expect(stored.at(-1)?.metadata).toEqual({
      ticker: `TEST-${MAX_STORED_BEHAVIOR_EVENTS}`,
    });
  });

  it("recovers from malformed browser storage", () => {
    localStorage.setItem(USER_BEHAVIOR_LOG_STORAGE_KEY, "not-json");

    storeBehaviorLogEvent(event(1));

    expect(readStoredBehaviorLogEvents()).toEqual([event(1)]);
  });
});
