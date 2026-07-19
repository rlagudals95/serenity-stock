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
      latestStance: "bullish",
      latestClaim: "AI 광통신의 장기 성장을 본다는 관점",
      latestChangeType: "new_claim",
      firstMentionedAt: "2026-05-10T00:00:00.000Z",
      lastMentionedAt: "2026-07-17T05:42:00.000Z",
      latestSourceUrl: "https://x.com/StockSavvyShay/status/2",
    },
  ],
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
    expect(screen.getByText("Serenity")).toBeInTheDocument();
    expect(screen.getByText("Shay")).toBeInTheDocument();
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
