import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { readStoredBehaviorLogEvents } from "../app-behavior-logger";
import { TrackedExternalLink, TrackedLink } from "./tracked-link";

describe("tracked links", () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    window.history.replaceState({}, "", "/tickers");
  });

  it("logs an internal navigation while preserving link behavior", () => {
    const onClick = vi.fn();
    render(
      <TrackedLink
        eventName="ticker_row_opened"
        href="/tickers/NVDA"
        metadata={{ ticker: "NVDA" }}
        onClick={onClick}
        target="_blank"
      >
        NVDA
      </TrackedLink>,
    );

    fireEvent.click(screen.getByRole("link", { name: "NVDA" }));

    expect(onClick).toHaveBeenCalledOnce();
    expect(readStoredBehaviorLogEvents()).toEqual([
      expect.objectContaining({
        eventName: "ticker_row_opened",
        path: "/tickers",
        element: { id: "/tickers/NVDA", type: "link" },
        metadata: {
          destination: "/tickers/NVDA",
          ticker: "NVDA",
        },
      }),
    ]);
  });

  it("logs an external source navigation", () => {
    render(
      <TrackedExternalLink
        eventName="source_link_opened"
        href="https://x.com/example/status/1"
        metadata={{ ticker: "NVDA" }}
        target="_blank"
      >
        원문
      </TrackedExternalLink>,
    );

    fireEvent.click(screen.getByRole("link", { name: "원문" }));

    expect(readStoredBehaviorLogEvents()).toEqual([
      expect.objectContaining({
        eventName: "source_link_opened",
        element: {
          id: "https://x.com/example/status/1",
          type: "external-link",
        },
      }),
    ]);
  });
});
