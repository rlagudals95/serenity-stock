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
      screen.getByRole("heading", {
        name: "주식 인플루언서 픽, 실제 결과를 추적합니다",
      }),
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
      screen.getByRole("heading", { name: "이들이 지금 보는 종목" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText("과거 적중 이력과 완료 표본을 함께 봅니다."),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByText("추적 소스 20명"));

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
      screen.queryByRole("link", { name: "@Ole_S_Hansen" }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "@StockMKTNewz" }),
    ).toHaveAttribute("href", "https://x.com/StockMKTNewz");
    expect(
      screen.getByRole("link", { name: "@Convequity" }),
    ).toHaveAttribute("href", "https://x.com/Convequity");
    expect(
      screen.getByRole("link", { name: "@munster_gene" }),
    ).toHaveAttribute("href", "https://x.com/munster_gene");
    expect(
      screen.getByRole("link", { name: "@ChitChatStocks" }),
    ).toHaveAttribute("href", "https://x.com/ChitChatStocks");
    expect(
      screen.getByRole("link", { name: "@RihardJarc" }),
    ).toHaveAttribute("href", "https://x.com/RihardJarc");
    expect(
      screen.getByRole("link", { name: "@JonahLupton" }),
    ).toHaveAttribute("href", "https://x.com/JonahLupton");
    expect(
      screen.getByRole("link", { name: "@RyanReeves_" }),
    ).toHaveAttribute("href", "https://x.com/RyanReeves_");
    expect(
      screen.getByRole("link", { name: "@muddywatersre" }),
    ).toHaveAttribute("href", "https://x.com/muddywatersre");
    expect(screen.getAllByText("의견 소스")).toHaveLength(8);
    expect(screen.getAllByText("근거·맥락")).toHaveLength(7);
    expect(screen.getAllByText("뉴스·탐색")).toHaveLength(2);
    expect(screen.getAllByText("리스크 검증")).toHaveLength(3);
    expect(screen.getAllByText("종합의견 반영")).toHaveLength(8);
    expect(screen.getByText(/유료 구독.*이해상충/)).toBeInTheDocument();
    expect(screen.getByText(/Shay 본인이나 관련 회사와 제휴/)).toBeInTheDocument();
    expect(screen.getByText(/감사를 받은 운용 성과가 아닙니다/)).toBeInTheDocument();
    expect(screen.getByText(/2026.*기준/)).toBeInTheDocument();
    expect(screen.queryByText(/17:02 KST/)).not.toBeInTheDocument();
  });

});
