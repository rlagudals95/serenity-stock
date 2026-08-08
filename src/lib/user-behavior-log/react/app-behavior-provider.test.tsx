import { render, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { readStoredBehaviorLogEvents } from "../app-behavior-logger";
import {
  AppBehaviorLoggerProvider,
  BehaviorPageViewTracker,
} from "./app-behavior-provider";

vi.mock("next/navigation", () => ({
  usePathname: () => "/tickers",
}));

describe("app behavior provider", () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  it("logs a page view when the route is mounted", async () => {
    render(
      <AppBehaviorLoggerProvider>
        <BehaviorPageViewTracker />
      </AppBehaviorLoggerProvider>,
    );

    await waitFor(() =>
      expect(readStoredBehaviorLogEvents()).toEqual([
        expect.objectContaining({
          eventName: "page_view",
          path: "/tickers",
        }),
      ]),
    );
  });
});
