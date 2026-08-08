import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { createBehaviorLogger } from "../create-behavior-logger";
import { BehaviorLoggerProvider } from "./context";
import { LogClick } from "./log-click";
import { LogImpression } from "./log-impression";
import { LogPageView } from "./log-page-view";

class MockIntersectionObserver {
  static instances: MockIntersectionObserver[] = [];

  callback: IntersectionObserverCallback;
  disconnect = vi.fn();
  observe = vi.fn();
  unobserve = vi.fn();
  takeRecords = vi.fn(() => []);

  constructor(callback: IntersectionObserverCallback) {
    this.callback = callback;
    MockIntersectionObserver.instances.push(this);
  }

  trigger(entry: Partial<IntersectionObserverEntry>) {
    this.callback(
      [entry as IntersectionObserverEntry],
      this as unknown as IntersectionObserver,
    );
  }
}

describe("user behavior log React helpers", () => {
  beforeEach(() => {
    MockIntersectionObserver.instances = [];
    vi.stubGlobal("IntersectionObserver", MockIntersectionObserver);
  });

  it("logs a page view when mounted", async () => {
    const send = vi.fn();
    const logger = createBehaviorLogger({
      send,
      getContext: () => ({ path: "/tickers" }),
    });

    render(
      <BehaviorLoggerProvider logger={logger}>
        <LogPageView metadata={{ surface: "overview" }} />
      </BehaviorLoggerProvider>,
    );

    await waitFor(() =>
      expect(send).toHaveBeenCalledWith(
        expect.objectContaining({
          eventName: "page_view",
          path: "/tickers",
          metadata: { surface: "overview" },
        }),
      ),
    );
  });

  it("logs a click while preserving the child click handler", async () => {
    const send = vi.fn();
    const childOnClick = vi.fn();
    const logger = createBehaviorLogger({
      send,
      getContext: () => ({ path: "/tickers" }),
    });

    render(
      <BehaviorLoggerProvider logger={logger}>
        <LogClick element={{ id: "NVDA", type: "ticker-row" }}>
          <button type="button" onClick={childOnClick}>
            NVDA 열기
          </button>
        </LogClick>
      </BehaviorLoggerProvider>,
    );

    fireEvent.click(screen.getByRole("button", { name: "NVDA 열기" }));

    expect(childOnClick).toHaveBeenCalledOnce();
    await waitFor(() =>
      expect(send).toHaveBeenCalledWith(
        expect.objectContaining({
          eventName: "click",
          element: { id: "NVDA", type: "ticker-row" },
        }),
      ),
    );
  });

  it("does not log a click prevented by the child", async () => {
    const send = vi.fn();
    const logger = createBehaviorLogger({ send });

    render(
      <LogClick logger={logger}>
        <button
          type="button"
          onClick={(event) => {
            event.preventDefault();
          }}
        >
          이동 취소
        </button>
      </LogClick>,
    );

    fireEvent.click(screen.getByRole("button", { name: "이동 취소" }));

    await waitFor(() => expect(send).not.toHaveBeenCalled());
  });

  it("logs an impression once when the target crosses the threshold", async () => {
    const send = vi.fn();
    const logger = createBehaviorLogger({
      send,
      getContext: () => ({ path: "/tickers/NVDA" }),
    });

    render(
      <LogImpression
        logger={logger}
        element={{ id: "signal-evidence", type: "section" }}
        threshold={0.25}
      >
        <section>신호 근거</section>
      </LogImpression>,
    );

    const observer = MockIntersectionObserver.instances[0];
    const target = screen.getByText("신호 근거");
    observer?.trigger({
      isIntersecting: true,
      intersectionRatio: 0.8,
      target,
    });
    observer?.trigger({
      isIntersecting: true,
      intersectionRatio: 0.9,
      target,
    });

    await waitFor(() => expect(send).toHaveBeenCalledOnce());
    expect(send).toHaveBeenCalledWith(
      expect.objectContaining({
        eventName: "impression",
        path: "/tickers/NVDA",
        element: { id: "signal-evidence", type: "section" },
      }),
    );
  });
});
