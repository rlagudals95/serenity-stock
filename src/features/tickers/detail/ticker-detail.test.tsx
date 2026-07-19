import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { getFixtureTickerDetail } from "../fixtures";
import { MetricsStrip } from "./metrics-strip";
import { OpinionItem } from "./opinion-item";
import { TickerHeader } from "./ticker-header";

describe("ticker detail header", () => {
  it("separates cumulative, latest, and change context while keeping absolute counts", () => {
    const ticker = getFixtureTickerDetail("COHR");
    expect(ticker).toBeDefined();

    render(
      <>
        <TickerHeader ticker={ticker!} />
        <MetricsStrip ticker={ticker!} />
      </>,
    );

    expect(
      screen.getByRole("heading", { name: "COHR Coherent Corp." }),
    ).toBeInTheDocument();
    expect(screen.getByText("누적 관점")).toBeInTheDocument();
    expect(screen.getByText("긍정 우세")).toBeInTheDocument();
    expect(screen.getByText("최근 의견")).toBeInTheDocument();
    expect(screen.getByText("긍정 의견")).toBeInTheDocument();
    expect(screen.getByText("최근 변화")).toBeInTheDocument();
    expect(screen.getByText("새 주장")).toBeInTheDocument();
    expect(screen.getByText("5명 분석가가 언급")).toBeInTheDocument();
    expect(screen.getByText("47")).toBeInTheDocument();
    expect(screen.getByText("38")).toBeInTheDocument();
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
