import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { defaultTickerQuery } from "./query";
import { TickerTable } from "./ticker-table";
import type { TickerOverview } from "./types";

const row: TickerOverview = {
  ticker: "COHR",
  companyName: "Coherent Corp.",
  totalMentions: 47,
  positiveCount: 38,
  negativeCount: 3,
  neutralCount: 2,
  mixedCount: 3,
  unknownCount: 1,
  cumulativeSentiment: "positive",
  latestStance: "bullish",
  changeType: "new_claim",
  mentions7d: 8,
  mentions30d: 17,
  lastMentionedAt: "2026-07-18T05:42:00.000Z",
  watchlisted: true,
  reviewCount: 0,
};

describe("TickerTable", () => {
  it("renders the complete row-level investment context", () => {
    render(<TickerTable query={defaultTickerQuery} rows={[row]} />);

    expect(
      screen.getByRole("link", { name: /COHR Coherent Corp\./ }),
    ).toHaveAttribute("href", "/tickers/COHR");
    expect(screen.getByText("47")).toBeInTheDocument();
    expect(screen.getByText("+38")).toBeInTheDocument();
    expect(screen.getByText("-3")).toBeInTheDocument();
    expect(screen.getByText("긍정 우세")).toBeInTheDocument();
    expect(screen.getByText("긍정 의견")).toBeInTheDocument();
    expect(screen.getByText("새 주장")).toBeInTheDocument();
    expect(screen.queryByText("Bullish")).not.toBeInTheDocument();
  });

  it("exposes the full distribution as an accessible label", () => {
    render(<TickerTable query={defaultTickerQuery} rows={[row]} />);

    expect(
      screen.getByLabelText(
        "긍정 38건, 부정 3건, 혼재 3건, 중립 2건, 판단 불가 1건",
      ),
    ).toBeInTheDocument();
  });

});
