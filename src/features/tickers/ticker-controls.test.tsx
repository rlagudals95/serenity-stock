import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { readStoredBehaviorLogEvents } from "@/lib/user-behavior-log/app-behavior-logger";

import { defaultTickerQuery } from "./query";
import { TickerControls } from "./ticker-controls";

const replace = vi.fn();

vi.mock("next/navigation", () => ({
  usePathname: () => "/tickers",
  useRouter: () => ({ replace }),
  useSearchParams: () => new URLSearchParams(),
}));

describe("TickerControls", () => {
  beforeEach(() => {
    replace.mockClear();
    localStorage.clear();
    sessionStorage.clear();
  });

  it("uses one functional advanced-filter disclosure on every viewport", () => {
    render(<TickerControls query={defaultTickerQuery} resultCount={5} />);

    expect(screen.getByText("세부 필터")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "필터" })).not.toBeInTheDocument();
    expect(screen.getAllByRole("combobox")).toHaveLength(4);

    fireEvent.change(screen.getByRole("combobox", { name: "최근 의견" }), {
      target: { value: "bullish" },
    });

    expect(replace).toHaveBeenCalledWith(
      "/tickers?stance=bullish",
      { scroll: false },
    );
    expect(readStoredBehaviorLogEvents()).toEqual([
      expect.objectContaining({
        eventName: "filter_applied",
        path: "/tickers",
        metadata: {
          filter: "stance",
          value: "bullish",
        },
      }),
    ]);
  });

  it("announces the filtered result count", () => {
    render(<TickerControls query={defaultTickerQuery} resultCount={5} />);

    expect(screen.getByText("5개 결과")).toHaveAttribute("aria-live", "polite");
  });
});
