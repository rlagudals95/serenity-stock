import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { defaultTickerQuery } from "./query";
import { TickerOverviewPage } from "./ticker-overview-page";
import type { TickerOverview } from "./types";

vi.mock("./ticker-controls", () => ({
  TickerControls: () => <div data-testid="ticker-controls" />,
}));

vi.mock("./ticker-table", () => ({
  TickerTable: () => <div data-testid="ticker-table" />,
}));

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
  watchlisted: false,
  reviewCount: 0,
};

describe("TickerOverviewPage", () => {
  it("identifies both tracked analysts and uses the latest source timestamp", () => {
    render(
      <TickerOverviewPage
        query={defaultTickerQuery}
        rows={[row]}
        totalCount={1}
      />,
    );

    expect(
      screen.getByRole("heading", { name: "투자 관점 인텔리전스" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "@aleabitoreddit" }),
    ).toHaveAttribute("href", "https://x.com/aleabitoreddit");
    expect(
      screen.getByRole("link", { name: "@StockSavvyShay" }),
    ).toHaveAttribute("href", "https://x.com/StockSavvyShay");
    expect(screen.getByText(/Shay 본인이나 관련 회사와 제휴/)).toBeInTheDocument();
    expect(screen.getByText(/감사를 받은 운용 성과가 아닙니다/)).toBeInTheDocument();
    expect(screen.getByText(/2026.*기준/)).toBeInTheDocument();
    expect(screen.queryByText(/17:02 KST/)).not.toBeInTheDocument();
  });
});
