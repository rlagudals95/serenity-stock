import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { getFixtureTickerDetail } from "../fixtures";
import { MetricsStrip } from "./metrics-strip";
import { OpinionItem } from "./opinion-item";
import { TickerHeader } from "./ticker-header";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn() }),
}));

describe("ticker detail header", () => {
  it("introduces the company before the detailed evidence", () => {
    const ticker = getFixtureTickerDetail("COHR")!;
    render(<TickerHeader ticker={ticker} />);
    expect(screen.getByRole("heading", { name: "COHR Coherent Corp." })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "← 오늘 확인할 것" })).toHaveAttribute("href", "/tickers");
    expect(screen.queryByText("현재 종합 신호")).not.toBeInTheDocument();
  });

  it("keeps the underlying mention counts available for deeper research", () => {
    render(<MetricsStrip ticker={getFixtureTickerDetail("COHR")!} />);
    expect(screen.getByText("47")).toBeInTheDocument();
    expect(screen.getByText("3")).toBeInTheDocument();
  });
});

describe("opinion detail", () => {
  it("expands the full post when the opinion body is clicked", () => {
    const ticker = getFixtureTickerDetail("COHR");
    const opinion = ticker?.opinions[0];
    expect(opinion).toBeDefined();

    render(<OpinionItem opinion={opinion!} />);

    const article = screen.getByRole("article");
    expect(screen.getByText("Shay Boloor")).toBeInTheDocument();
    expect(article).toHaveAttribute("data-expanded", "false");

    fireEvent.click(screen.getByRole("heading", { name: opinion!.claim }));

    expect(article).toHaveAttribute("data-expanded", "true");
    expect(
      screen.getByRole("button", { name: /전체 글 접기/ }),
    ).toBeInTheDocument();
  });
});
