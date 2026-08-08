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
    expect(screen.getByText("4명 분석가가 언급")).toBeInTheDocument();
    expect(screen.getByText("현재 종합 신호")).toBeInTheDocument();
    expect(screen.getByText("긍정 신호")).toBeInTheDocument();
    expect(screen.getByText("신호 이후 시장 반응")).toBeInTheDocument();
    expect(screen.getByText("기준가 $282.12")).toBeInTheDocument();
    expect(screen.getByText("최근 종가 $262.89")).toBeInTheDocument();
    expect(screen.getByText("-6.8%")).toBeInTheDocument();
    expect(screen.getByText("1개월 결과")).toBeInTheDocument();
    expect(screen.getByText("평가 중")).toBeInTheDocument();
    expect(screen.getByText("47")).toBeInTheDocument();
    expect(screen.getByText("3")).toBeInTheDocument();
    expect(screen.getByText("1")).toBeInTheDocument();
  });

  it("explains when a ticker has no active consensus signal", () => {
    const ticker = getFixtureTickerDetail("COHR");
    expect(ticker).toBeDefined();

    render(<TickerHeader ticker={{ ...ticker!, signalPerformance: null }} />);

    expect(screen.getByText("활성 신호 없음")).toBeInTheDocument();
    expect(
      screen.getByText("최소 3명의 방향성 의견과 2/3 합의가 필요합니다."),
    ).toBeInTheDocument();
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
