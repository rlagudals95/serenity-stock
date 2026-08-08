import { fireEvent, render, screen } from "@testing-library/react";
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
  it("puts verified candidates first and keeps source context secondary", () => {
    render(
      <TickerOverviewPage
        query={defaultTickerQuery}
        rows={[row]}
        totalCount={1}
      />,
    );

    expect(
      screen.getByRole("heading", { name: "검증된 투자 후보" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "검증된 후보" }),
    ).toHaveAttribute("href", "/tickers");
    expect(
      screen.getByRole("link", { name: "관심 급증" }),
    ).toHaveAttribute("href", "/tickers?view=momentum");
    expect(
      screen.getByRole("link", { name: "리스크·방향 전환" }),
    ).toHaveAttribute("href", "/tickers?view=changes");
    expect(
      screen.getByRole("link", { name: "전체 종목" }),
    ).toHaveAttribute("href", "/tickers?view=all");
    expect(
      screen.queryByRole("heading", { name: "우선 확인할 변화" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByText("검토 필요"),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "후보 비교" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        /의견 근거.*확인 가능한 원문과 의견 참여 인원.*의견 후 주가.*2명 이상 의견이 모인 날부터의 수익률/,
      ),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByText("추적 소스 7명"));

    expect(
      screen.getByRole("link", { name: "@aleabitoreddit" }),
    ).toHaveAttribute("href", "https://x.com/aleabitoreddit");
    expect(
      screen.getByRole("link", { name: "@StockSavvyShay" }),
    ).toHaveAttribute("href", "https://x.com/StockSavvyShay");
    expect(
      screen.getByRole("link", { name: "@Beth_Kindig" }),
    ).toHaveAttribute("href", "https://x.com/Beth_Kindig");
    expect(
      screen.getByRole("link", { name: "@EconomyApp" }),
    ).toHaveAttribute("href", "https://x.com/EconomyApp");
    expect(
      screen.getByRole("link", { name: "@Brian_Stoffel_" }),
    ).toHaveAttribute("href", "https://x.com/Brian_Stoffel_");
    expect(
      screen.getByRole("link", { name: "@Ole_S_Hansen" }),
    ).toHaveAttribute("href", "https://x.com/Ole_S_Hansen");
    expect(
      screen.getByRole("link", { name: "@StockMKTNewz" }),
    ).toHaveAttribute("href", "https://x.com/StockMKTNewz");
    expect(screen.getByText(/Shay 본인이나 관련 회사와 제휴/)).toBeInTheDocument();
    expect(screen.getByText(/감사를 받은 운용 성과가 아닙니다/)).toBeInTheDocument();
    expect(screen.getByText(/2026.*기준/)).toBeInTheDocument();
    expect(screen.queryByText(/17:02 KST/)).not.toBeInTheDocument();
  });

});
