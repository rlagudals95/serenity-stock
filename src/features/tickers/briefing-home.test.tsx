import { fireEvent, render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { opportunityCopy } from "./opportunity-copy";
import { BriefingHome } from "./briefing-home";
import { buildTickerBrief } from "./briefing-model";
import { selectBriefingCandidates } from "./briefing-selection";
import { tickerOverviewFixtures } from "./fixtures";
import { getFixtureTickerDetail } from "./fixtures";
import { markReviewed, saveResearch } from "./research-state";
import { DecisionSummary } from "./detail/decision-summary";

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));
const ticker = getFixtureTickerDetail("COHR")!;
const brief = buildTickerBrief(ticker, ticker);
beforeEach(() => localStorage.clear());

describe("briefing discovery and return loop", () => {
  it("gives a first visitor source-based reasons and an honest empty state", () => {
    const view = render(<BriefingHome candidates={[brief]} watched={[]} />);
    const candidates = screen.getByRole("region", { name: "검토할 후보" });
    expect(within(candidates).getByRole("heading", { name: /AI가 커질수록/ })).toBeInTheDocument();
    expect(within(candidates).queryByText(brief.risk!.text)).not.toBeInTheDocument();
    expect(within(candidates).getByRole("link", { name: /COHR.*성장 이야기 보기/ })).toHaveAttribute("href", "/tickers/COHR");
    expect(screen.queryByRole("region", { name: "관심 종목의 변화" })).not.toBeInTheDocument();
    view.rerender(<BriefingHome candidates={[]} watched={[]} />);
    expect(screen.getByText("현재 기준을 충족한 후보가 없어요")).toBeInTheDocument();
  });

  it("keeps discovery short and preserves evidence after opening a candidate", () => {
    const picks = selectBriefingCandidates(tickerOverviewFixtures);
    const candidates = picks.map(({ row, recommendation }) => ({ ...buildTickerBrief(row, getFixtureTickerDetail(row.ticker)), expectation: recommendation.evidence, recommendation }));
    const view = render(<BriefingHome candidates={candidates} watched={[]} />);
    const region = screen.getByRole("region", { name: "검토할 후보" });
    expect(within(region).getAllByRole("article")).toHaveLength(3);
    for (const candidate of candidates) {
      const card = within(region).getByRole("article", { name: `${candidate.ticker} 추천 근거` });
      expect(within(card).getByRole("heading")).toHaveTextContent(opportunityCopy(candidate).title.replace(/\n/g, " "));
      expect(within(card).queryByText(candidate.recommendation.reason)).not.toBeInTheDocument();
      expect(within(card).queryByText(candidate.risk!.text)).not.toBeInTheDocument();
      expect(within(card).getByText(/긍정 의견 \d+명/)).toBeInTheDocument();
      expect(within(card).getByText(/Shay Boloor/)).toBeInTheDocument();
      expect(within(card).getAllByRole("link")).toHaveLength(1);
    }
    view.unmount();
    render(<DecisionSummary ticker={ticker} />);
    expect(screen.getByRole("heading", { name: "이 기업을 보는 4명의 생각" })).toBeInTheDocument();
    fireEvent.click(screen.getByText("기회 · 위험 · 다음 체크포인트"));
    const summary = screen.getByText("기회 · 위험 · 다음 체크포인트").closest("details")!;
    expect(within(summary).getByText(brief.expectation!.text)).toBeInTheDocument();
    expect(screen.getByText(brief.nextCheck!.text)).toBeInTheDocument();
    expect(screen.getByText(brief.risk!.text)).toBeInTheDocument();
    expect(screen.getAllByRole("link", { name: "원문" })).toHaveLength(3);
  });

  it("requires a baseline before claiming changes and clears a reviewed change", () => {
    const current = structuredClone(ticker);
    current.analysts[0] = { ...current.analysts[0], latestClaim: "새로운 주문 지연 위험", latestChangeType: "new_risk", lastMentionedAt: "2026-09-26T01:00:00Z" };
    const updatedBrief = buildTickerBrief(current, current);
    const view = render(<BriefingHome candidates={[]} watched={[updatedBrief]} />);
    expect(screen.getByText("저장한 종목, 어디까지 확인했나요?")).toBeInTheDocument();
    view.unmount();
    markReviewed(ticker.ticker, brief.snapshot);
    const returnView = render(<><BriefingHome candidates={[]} watched={[updatedBrief]} /><DecisionSummary ticker={{ ...current, watchlisted: true }} /></>);
    const changes = screen.getByRole("region", { name: "관심 종목의 변화" });
    expect(within(changes).getByText("새로운 주문 지연 위험")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "새 근거 확인 완료" }));
    expect(within(changes).getByText("관심 종목에 새 변화가 없어요")).toBeInTheDocument();
    returnView.unmount();
    render(<BriefingHome candidates={[]} watched={[updatedBrief]} />);
    expect(screen.getByText("관심 종목에 새 변화가 없어요")).toBeInTheDocument();
  });

  it("carries the saved reason and paused status into the watchlist", () => {
    saveResearch("COHR", { note: "수주 전환을 확인한 뒤 판단", status: "paused", priority: "high" });
    render(<BriefingHome candidates={[]} watched={[brief]} watchlistPage />);
    expect(screen.getByText("수주 전환을 확인한 뒤 판단")).toBeInTheDocument();
    expect(screen.getByText("보류")).toBeInTheDocument();
  });
});
