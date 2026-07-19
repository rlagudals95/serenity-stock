import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { AnalystPresence } from "./analyst-presence";
import type { AnalystSnapshot, Stance } from "./types";

function snapshot(
  name: string,
  username: string,
  latestStance: Stance,
  lastMentionedAt: string,
  totalMentions: number,
): AnalystSnapshot {
  return {
    key: username,
    name,
    username,
    totalMentions,
    positiveCount: latestStance === "bullish" ? totalMentions : 0,
    negativeCount: latestStance === "bearish" ? totalMentions : 0,
    neutralCount: latestStance === "neutral" ? totalMentions : 0,
    mixedCount: latestStance === "mixed" ? totalMentions : 0,
    unknownCount: latestStance === "unknown" ? totalMentions : 0,
    cumulativeSentiment: "mixed",
    latestStance,
    latestClaim: null,
    latestChangeType: "new_claim",
    firstMentionedAt: "2026-06-01T00:00:00.000Z",
    lastMentionedAt,
    latestSourceUrl: `https://example.com/${username}`,
  };
}

const analysts = [
  snapshot(
    "Serenity",
    "aleabitoreddit",
    "bullish",
    "2026-07-18T05:42:00.000Z",
    30,
  ),
  snapshot(
    "Shay Boloor",
    "StockSavvyShay",
    "bearish",
    "2026-07-17T05:42:00.000Z",
    17,
  ),
  snapshot(
    "Beth Kindig",
    "Beth_Kindig",
    "mixed",
    "2026-07-16T05:42:00.000Z",
    9,
  ),
  snapshot(
    "Dylan Patel",
    "dylan522p",
    "neutral",
    "2026-07-15T05:42:00.000Z",
    4,
  ),
];

describe("AnalystPresence", () => {
  it("shows three desktop analysts with counts and the comparison summary", () => {
    render(
      <AnalystPresence analysts={analysts} ticker="COHR" variant="desktop" />,
    );

    expect(screen.getByText("Serenity")).toBeInTheDocument();
    expect(screen.getByText("Shay Boloor")).toBeInTheDocument();
    expect(screen.getByText("Beth Kindig")).toBeInTheDocument();
    expect(screen.queryByText("Dylan Patel")).not.toBeInTheDocument();
    expect(screen.getByText("+1")).toBeInTheDocument();
    expect(screen.getByText("긍정 1")).toBeInTheDocument();
    expect(screen.getByText("부정 1")).toBeInTheDocument();
    expect(screen.getByText("기타 2")).toBeInTheDocument();
    expect(screen.getByText("관점 엇갈림")).toBeInTheDocument();

    const trigger = screen.getByRole("button", {
      name: "COHR 언급 분석가 4명 보기",
    });
    expect(trigger).toHaveAttribute("type", "button");
    expect(trigger).toHaveAttribute("aria-haspopup", "dialog");
    expect(trigger).toHaveAttribute("aria-expanded", "false");
  });

  it("shows exactly two accessible analyst chips in the mobile summary", () => {
    render(
      <AnalystPresence analysts={analysts} ticker="COHR" variant="mobile" />,
    );

    expect(screen.getByLabelText("Serenity · 긍정 의견")).toBeInTheDocument();
    expect(
      screen.getByLabelText("Shay Boloor · 부정 의견"),
    ).toBeInTheDocument();
    expect(
      screen.queryByLabelText("Beth Kindig · 혼재"),
    ).not.toBeInTheDocument();
    expect(screen.getByText("+2")).toBeInTheDocument();
    expect(screen.getByText("관점 엇갈림")).toBeInTheDocument();
    expect(screen.queryByText("긍정 1")).not.toBeInTheDocument();
  });

  it("opens the full portal dialog and restores trigger focus on Escape", () => {
    render(
      <AnalystPresence analysts={analysts} ticker="COHR" variant="desktop" />,
    );
    const trigger = screen.getByRole("button", {
      name: "COHR 언급 분석가 4명 보기",
    });

    fireEvent.click(trigger);

    const dialog = screen.getByRole("dialog", {
      name: "COHR 언급 분석가",
    });
    expect(document.body).toContainElement(dialog);
    expect(trigger).toHaveAttribute("aria-expanded", "true");
    expect(within(dialog).getByText("COHR")).toBeInTheDocument();
    expect(within(dialog).getByText("분석가 4명")).toBeInTheDocument();
    expect(within(dialog).getByText("Dylan Patel")).toBeInTheDocument();
    expect(
      within(dialog).getAllByRole("link", { name: "최근 원문" }),
    ).toHaveLength(4);
    expect(
      within(dialog).getAllByRole("link", { name: "최근 원문" })[0],
    ).toHaveAttribute("target", "_blank");
    expect(
      within(dialog).getAllByRole("link", { name: "최근 원문" })[0],
    ).toHaveAttribute("rel", "noopener noreferrer");

    fireEvent.keyDown(document, { key: "Escape" });

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
    expect(trigger).toHaveAttribute("aria-expanded", "false");
  });

  it("keeps a tall dialog scrollable inside a small viewport", () => {
    const innerHeightDescriptor = Object.getOwnPropertyDescriptor(
      window,
      "innerHeight",
    );
    Object.defineProperty(window, "innerHeight", {
      configurable: true,
      value: 320,
    });
    const geometry = vi
      .spyOn(HTMLElement.prototype, "getBoundingClientRect")
      .mockImplementation(function (this: HTMLElement) {
        if (this.getAttribute("role") === "dialog") {
          return new DOMRect(0, 0, 380, 600);
        }
        return new DOMRect(40, 250, 200, 30);
      });

    try {
      render(
        <AnalystPresence analysts={analysts} ticker="COHR" variant="desktop" />,
      );
      fireEvent.click(
        screen.getByRole("button", {
          name: "COHR 언급 분석가 4명 보기",
        }),
      );

      const dialog = screen.getByRole("dialog", {
        name: "COHR 언급 분석가",
      });
      expect(dialog).toHaveStyle({
        maxHeight: "296px",
        overflowY: "auto",
        top: "12px",
      });
      expect(
        Number.parseFloat(dialog.style.top) +
          Number.parseFloat(dialog.style.maxHeight),
      ).toBeLessThanOrEqual(window.innerHeight - 12);
    } finally {
      geometry.mockRestore();
      if (innerHeightDescriptor) {
        Object.defineProperty(window, "innerHeight", innerHeightDescriptor);
      }
    }
  });

  it("renders a non-interactive empty state", () => {
    render(<AnalystPresence analysts={[]} ticker="COHR" variant="desktop" />);

    expect(screen.getByText("언급 정보 없음")).toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});
