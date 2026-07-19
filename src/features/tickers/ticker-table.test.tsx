import { fireEvent, render, screen, within } from "@testing-library/react";
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
    expect(screen.getByText("Shay Boloor")).toBeInTheDocument();
    expect(screen.queryByText("Bullish")).not.toBeInTheDocument();
  });

  it("integrates responsive analyst summaries without nesting interactions", () => {
    render(<TickerTable query={defaultTickerQuery} rows={[row]} />);

    expect(
      screen.getByRole("columnheader", {
        name: "분석가별 최근 관점",
      }),
    ).toBeInTheDocument();

    const tickerLink = screen.getByRole("link", {
      name: "COHR Coherent Corp.",
    });
    expect(tickerLink).toHaveAttribute("href", "/tickers/COHR");

    const triggers = screen.getAllByRole("button", {
      name: "COHR 언급 분석가 4명 보기",
    });
    expect(triggers).toHaveLength(2);
    const desktopPresence = document.querySelector(
      ".analyst-presence--desktop",
    );
    const mobilePresence = document.querySelector(".analyst-presence--mobile");
    expect(desktopPresence).not.toBeNull();
    expect(mobilePresence).not.toBeNull();
    const desktopTrigger = within(desktopPresence as HTMLElement).getByRole(
      "button",
      { name: "COHR 언급 분석가 4명 보기" },
    );
    const mobileTrigger = within(mobilePresence as HTMLElement).getByRole(
      "button",
      { name: "COHR 언급 분석가 4명 보기" },
    );
    expect(within(desktopTrigger).getByText("+1")).toBeInTheDocument();
    expect(within(mobileTrigger).getByText("+2")).toBeInTheDocument();
    expect(tickerLink).not.toContainElement(desktopTrigger);
    expect(tickerLink).not.toContainElement(mobileTrigger);
    expect(desktopTrigger.closest("a")).toBeNull();
    expect(mobileTrigger.closest("a")).toBeNull();

    fireEvent.click(desktopTrigger);

    const dialog = screen.getByRole("dialog", {
      name: "COHR 언급 분석가",
    });
    for (const analystName of [
      "Serenity",
      "Shay Boloor",
      "Beth Kindig",
      "Dylan Patel",
    ]) {
      expect(within(dialog).getByText(analystName)).toBeInTheDocument();
      expect(
        within(dialog).getByRole("link", {
          name: `${analystName} 최근 원문`,
        }),
      ).toBeInTheDocument();
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

});
