import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { TickerProofHero } from "./ticker-proof-hero";
import type { TickerProofOverview } from "./types";

const completed: TickerProofOverview = {
  state: "completed",
  completedCount: 18,
  hitCount: 11,
  missCount: 7,
  latestResultAt: "2026-08-07",
  cases: [
    {
      ticker: "AAOI",
      companyName: "Applied Optoelectronics",
      analystName: "Serenity",
      signalAt: "2026-07-01T00:00:00.000Z",
      resultAt: "2026-08-07",
      returnValue: 0.132,
      sourceUrl: "https://x.com/example/status/1",
      state: "completed",
    },
  ],
};

describe("TickerProofHero", () => {
  it("puts a completed rising case beside the full outcome rollup", () => {
    render(
      <TickerProofHero
        analystCount={26}
        latestMention="2026-08-08T01:00:00.000Z"
        overview={completed}
        totalCount={319}
      />,
    );

    expect(
      screen.getByRole("heading", {
        name: "주식 인플루언서가 고르고, 실제로 오른 종목",
      }),
    ).toBeInTheDocument();
    expect(screen.getByText("+13.2%")).toBeInTheDocument();
    expect(screen.getByText("상승 11건")).toBeInTheDocument();
    expect(screen.getByText("미적중 7건")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /AAOI/ })).toHaveAttribute(
      "href",
      "/tickers/AAOI",
    );
    expect(screen.getByRole("link", { name: "원문" })).toHaveAttribute(
      "href",
      "https://x.com/example/status/1",
    );
  });

  it("labels current gains as tracking instead of completed hits", () => {
    render(
      <TickerProofHero
        analystCount={7}
        latestMention="2026-08-08T01:00:00.000Z"
        overview={{
          ...completed,
          state: "tracking",
          completedCount: 0,
          hitCount: 0,
          missCount: 0,
          latestResultAt: null,
          cases: [{ ...completed.cases[0], state: "tracking" }],
        }}
        totalCount={319}
      />,
    );

    expect(
      screen.getByRole("heading", {
        name: "주식 인플루언서 픽, 실제 결과를 추적합니다",
      }),
    ).toBeInTheDocument();
    expect(screen.getByText("현재까지 상승 · 20일 판정 중")).toBeInTheDocument();
    expect(screen.queryByText(/적중률/)).not.toBeInTheDocument();
  });
});
