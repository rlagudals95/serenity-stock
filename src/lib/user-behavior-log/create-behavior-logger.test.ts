import { describe, expect, it, vi } from "vitest";

import { createBehaviorLogger } from "./create-behavior-logger";

describe("createBehaviorLogger", () => {
  it("merges shared context with event-specific input", async () => {
    const send = vi.fn();
    const logger = createBehaviorLogger({
      send,
      getContext: () => ({
        path: "/tickers",
        sessionId: "session-123",
        metadata: {
          surface: "ticker-table",
        },
      }),
    });

    const event = await logger.click({
      element: {
        id: "NVDA",
        type: "ticker-row",
      },
      metadata: {
        destination: "/tickers/NVDA",
      },
    });

    expect(send).toHaveBeenCalledWith({
      eventName: "click",
      path: "/tickers",
      sessionId: "session-123",
      metadata: {
        surface: "ticker-table",
        destination: "/tickers/NVDA",
      },
      element: {
        id: "NVDA",
        type: "ticker-row",
      },
      occurredAt: event.occurredAt,
    });
  });

  it("uses the browser location and allows a custom event name", async () => {
    window.history.replaceState({}, "", "/tickers/NVDA?tab=research");
    const send = vi.fn();
    const logger = createBehaviorLogger({ send });

    await logger.pageView({ eventName: "ticker_detail_opened" });

    expect(send).toHaveBeenCalledWith(
      expect.objectContaining({
        eventName: "ticker_detail_opened",
        path: "/tickers/NVDA?tab=research",
      }),
    );
  });

  it("propagates sender failures to the caller", async () => {
    const logger = createBehaviorLogger({
      send: async () => {
        throw new Error("storage unavailable");
      },
    });

    await expect(logger.impression()).rejects.toThrow("storage unavailable");
  });
});
