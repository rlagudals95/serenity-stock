import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { defaultTickerQuery } from "./query";
import { TickerTable } from "./ticker-table";
import type { TickerOverview } from "./types";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn() }),
}));

const row: TickerOverview = {
  ticker: "COHR",
  companyName: "Coherent Corp.",
  marketQuote: {
    price: 102.64,
    change: 2.18,
    changePercent: 2.17,
    previousClose: 100.46,
    asOf: "2026-07-21T20:00:00.000Z",
    currency: "USD",
    provider: "fixture",
  },
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
  signalPerformance: {
    direction: "positive",
    signalAt: "2026-06-18T15:00:00.000Z",
    directionalAnalystCount: 3,
    bullishAnalystCount: 3,
    bearishAnalystCount: 0,
    entrySessionDate: "2026-06-19",
    entryAdjustedOpen: 102.4,
    latestPriceDate: "2026-07-31",
    latestAdjustedClose: 127.8,
    rawReturnToDate: 0.248,
    outcome20dStatus: "evaluable",
    outcome20dRawReturn: 0.184,
    outcome20dVerdict: "aligned",
    calculationVersion: "signal-v1.1-r0",
    priceProvider: "fixture",
    priceTrend: [
      { date: "2026-07-06", close: 100 },
      { date: "2026-07-15", close: 116.4 },
      { date: "2026-07-31", close: 127.8 },
    ],
  },
  analysts: [
    {
      key: "serenity",
      name: "Serenity",
      username: "aleabitoreddit",
      totalMentions: 30,
      positiveCount: 24,
      negativeCount: 1,
      neutralCount: 2,
      mixedCount: 2,
      unknownCount: 1,
      cumulativeSentiment: "positive",
      latestStance: "bullish",
      latestClaim: "광학 수요가 강하다는 관점",
      latestChangeType: "repeat",
      firstMentionedAt: "2026-04-01T00:00:00.000Z",
      lastMentionedAt: "2026-07-18T05:42:00.000Z",
      latestSourceUrl: "https://x.com/aleabitoreddit/status/1",
    },
    {
      key: "shay_boloor",
      name: "Shay Boloor",
      username: "StockSavvyShay",
      totalMentions: 17,
      positiveCount: 14,
      negativeCount: 2,
      neutralCount: 0,
      mixedCount: 1,
      unknownCount: 0,
      cumulativeSentiment: "positive",
      latestStance: "bearish",
      latestClaim: "AI 광통신의 장기 성장을 본다는 관점",
      latestChangeType: "new_claim",
      firstMentionedAt: "2026-05-10T00:00:00.000Z",
      lastMentionedAt: "2026-07-17T05:42:00.000Z",
      latestSourceUrl: "https://x.com/StockSavvyShay/status/2",
    },
    {
      key: "beth_kindig",
      name: "Beth Kindig",
      username: "Beth_Kindig",
      totalMentions: 9,
      positiveCount: 4,
      negativeCount: 1,
      neutralCount: 0,
      mixedCount: 4,
      unknownCount: 0,
      cumulativeSentiment: "mixed",
      latestStance: "mixed",
      latestClaim: "AI 인프라 수요와 밸류에이션을 함께 본다는 관점",
      latestChangeType: "repeat",
      firstMentionedAt: "2026-06-01T00:00:00.000Z",
      lastMentionedAt: "2026-07-16T05:42:00.000Z",
      latestSourceUrl: "https://x.com/Beth_Kindig/status/3",
    },
    {
      key: "dylan_patel",
      name: "Dylan Patel",
      username: "dylan522p",
      totalMentions: 4,
      positiveCount: 1,
      negativeCount: 0,
      neutralCount: 3,
      mixedCount: 0,
      unknownCount: 0,
      cumulativeSentiment: "insufficient",
      latestStance: "neutral",
      latestClaim: "공급망 실행을 더 지켜봐야 한다는 관점",
      latestChangeType: "unclear",
      firstMentionedAt: "2026-07-01T00:00:00.000Z",
      lastMentionedAt: "2026-07-15T05:42:00.000Z",
      latestSourceUrl: "https://x.com/dylan522p/status/4",
    },
  ],
};

describe("TickerTable", () => {
  it("renders the compact candidate decision context", () => {
    render(<TickerTable query={defaultTickerQuery} rows={[row]} />);

    expect(
      screen.getByRole("link", { name: /COHR Coherent Corp\./ }),
    ).toHaveAttribute("href", "/tickers/COHR");
    expect(screen.getByText("7일 8회")).toBeInTheDocument();
    expect(screen.getByText("총 47회")).toBeInTheDocument();
    expect(screen.getByText("+38")).toBeInTheDocument();
    expect(screen.getByText("-3")).toBeInTheDocument();
    expect(screen.getByText("긍정 우세")).toBeInTheDocument();
    expect(screen.getByText("긍정 의견")).toBeInTheDocument();
    expect(screen.getByText("새 주장")).toBeInTheDocument();
    expect(screen.getByText("긍정 신호")).toBeInTheDocument();
    expect(screen.getByText("3명 중 3명 긍정")).toBeInTheDocument();
    expect(screen.getByText("+24.8%")).toBeInTheDocument();
    expect(screen.getByText("방향 일치")).toBeInTheDocument();
    for (const heading of [
      "관심도",
      "인플루언서 관점",
      "최근 변화",
    ]) {
      expect(
        screen.getByRole("columnheader", { name: heading }),
      ).toBeInTheDocument();
    }
    expect(
      screen.getByRole("columnheader", { name: /의견 근거/ }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("columnheader", { name: /의견 후 주가/ }),
    ).toBeInTheDocument();
    expect(screen.getByText("원문 · 의견 참여 인원")).toBeInTheDocument();
    expect(screen.getByText("의견 합의 시점 대비")).toBeInTheDocument();
    expect(screen.getByText("원문 확인 가능")).toBeInTheDocument();
    expect(screen.getByText("원문 4개")).toBeInTheDocument();
    expect(screen.getByText("의견 참여 3명")).toBeInTheDocument();
    expect(screen.queryByRole("columnheader", { name: "품질" })).not.toBeInTheDocument();
    expect(screen.getByText("Serenity")).toBeInTheDocument();
    expect(screen.getByText("Shay Boloor")).toBeInTheDocument();
    expect(screen.queryByText("Bullish")).not.toBeInTheDocument();
  });

  it("integrates responsive analyst summaries without nesting interactions", () => {
    render(<TickerTable query={defaultTickerQuery} rows={[row]} />);

    expect(
      screen.getByRole("columnheader", { name: "인플루언서 관점" }),
    ).toBeInTheDocument();

    const tickerLink = screen.getByRole("link", {
      name: "COHR Coherent Corp.",
    });
    expect(tickerLink).toHaveAttribute("href", "/tickers/COHR");

    const trigger = screen.getByRole("button", {
      name: "COHR 언급 분석가 4명 보기",
    });
    expect(within(trigger).getByText("Serenity · Shay Boloor 외 2명")).toBeInTheDocument();
    expect(within(trigger).getByText("긍정 1 · 부정 1 · 기타 2")).toBeInTheDocument();
    expect(tickerLink).not.toContainElement(trigger);
    expect(trigger.closest("a")).toBeNull();

    fireEvent.click(trigger);

    const dialog = screen.getByRole("dialog", {
      name: "COHR 언급 분석가",
    });
    for (const [analystName, sourceUrl] of [
      ["Serenity", "https://x.com/aleabitoreddit/status/1"],
      ["Shay Boloor", "https://x.com/StockSavvyShay/status/2"],
      ["Beth Kindig", "https://x.com/Beth_Kindig/status/3"],
      ["Dylan Patel", "https://x.com/dylan522p/status/4"],
    ] as const) {
      expect(within(dialog).getByText(analystName)).toBeInTheDocument();
      expect(
        within(dialog).getByRole("link", {
          name: `${analystName} 최근 원문`,
        }),
      ).toHaveAttribute("href", sourceUrl);
    }
  });

  it("exposes the full distribution as an accessible label", () => {
    render(<TickerTable query={defaultTickerQuery} rows={[row]} />);

    expect(
      screen.getByLabelText(
        "긍정 38건, 부정 3건, 혼재 3건, 중립 2건, 판단 불가 1건",
      ),
    ).toBeInTheDocument();
  });

  it("keeps missing signal data explicit instead of fabricating performance", () => {
    render(
      <TickerTable
        query={defaultTickerQuery}
        rows={[{ ...row, signalPerformance: null }]}
      />,
    );

    expect(screen.getByText("비교할 합의 없음")).toBeInTheDocument();
    expect(screen.queryByText("성과 계산 전")).not.toBeInTheDocument();
  });

  it("shows working pagination only when more than one page exists", () => {
    render(
      <TickerTable
        pagination={{ page: 2, pageCount: 3, pageSize: 30, total: 65 }}
        query={{ ...defaultTickerQuery, page: 2, view: "all" }}
        rows={[row]}
      />,
    );

    expect(screen.getByRole("link", { name: "이전 페이지" })).toHaveAttribute(
      "href",
      expect.stringContaining("page=1"),
    );
    expect(screen.getByRole("link", { name: "다음 페이지" })).toHaveAttribute(
      "href",
      expect.stringContaining("page=3"),
    );
    expect(screen.getByText("31–60 / 65개 종목")).toBeInTheDocument();
  });

});
