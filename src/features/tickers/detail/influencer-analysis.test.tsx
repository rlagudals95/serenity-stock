import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { opinionSnapshot } from "../briefing-model";
import { getFixtureTickerDetail } from "../fixtures";
import { latestInfluencerViews, matchingOpinion, supportingInfluencers } from "../influencer-model";
import { InfluencerAnalysis } from "./influencer-analysis";

const ticker = getFixtureTickerDetail("COHR")!;

describe("influencer evidence", () => {
  it("counts people once and uses their latest view, not repeated mentions", () => {
    const snapshot = opinionSnapshot(ticker);
    const source = snapshot.sources.find(item => item.stance === "bullish")!;
    snapshot.sources.push({ ...source, date: "2026-09-26T01:00:00Z", stance: "bearish" });
    expect(latestInfluencerViews(snapshot)).toHaveLength(4);
    expect(supportingInfluencers(snapshot)).toHaveLength(2);
    expect(supportingInfluencers(snapshot).some(item => item.key === source.key)).toBe(false);
  });

  it("does not count a missing claim or unsafe source as homepage proof", () => {
    const snapshot = opinionSnapshot(ticker);
    snapshot.sources = snapshot.sources.map(source => ({ ...source, url: "javascript:alert(1)" }));
    expect(supportingInfluencers(snapshot)).toEqual([]);
    expect(latestInfluencerViews(snapshot).every(source => source.url === null)).toBe(true);
    snapshot.sources = snapshot.sources.map(source => ({ ...source, url: "https://x.com/example", claim: "  " }));
    expect(supportingInfluencers(snapshot)).toEqual([]);
  });

  it("keeps the opposing view visible alongside each person's dated source", () => {
    render(<InfluencerAnalysis ticker={ticker} />);
    const counts = screen.getByLabelText("인플루언서별 최근 입장 집계");
    expect(counts).toHaveTextContent("긍정 3명부정 1명");
    expect(screen.getAllByRole("article")).toHaveLength(4);
    const opposing = screen.getByRole("article", { name: "Bear Case의 최근 의견" });
    expect(within(opposing).getByText("부정 의견")).toBeVisible();
    expect(within(opposing).getByText(ticker.analysts.find(item => item.key === "bear_case")!.latestClaim!)).toBeVisible();
    expect(within(opposing).getByRole("link", { name: "Bear Case 원문" })).toHaveAttribute("target", "_blank");
  });

  it("only expands evidence from the same author, source and claim", () => {
    const opinion = ticker.opinions[0];
    const source = opinionSnapshot(ticker).sources.find(item => item.key === opinion.analyst.key)!;
    expect(matchingOpinion(source, ticker.opinions)?.id).toBe(opinion.id);
    expect(matchingOpinion({ ...source, key: "different-author" }, ticker.opinions)).toBeUndefined();
    expect(matchingOpinion({ ...source, url: "https://x.com/another-post" }, ticker.opinions)).toBeUndefined();
    expect(matchingOpinion({ ...source, claim: "Another claim" }, ticker.opinions)).toBeUndefined();
    render(<InfluencerAnalysis ticker={ticker} />);
    const row = screen.getByRole("article", { name: `${opinion.analyst.name}의 최근 의견` });
    fireEvent.click(within(row).getByText("분석 근거 펼치기"));
    expect(within(row).getByText(opinion.evidence)).toBeVisible();
    expect(within(row).getByText(opinion.fullText)).toBeVisible();
    expect(within(screen.getByRole("article", { name: "Growth Desk의 최근 의견" })).queryByText("분석 근거 펼치기")).not.toBeInTheDocument();
  });

  it("shows an honest empty state and missing-claim state", () => {
    const view = render(<InfluencerAnalysis ticker={{ ...ticker, analysts: [], opinions: [] }} />);
    expect(screen.getByText("아직 수집된 인플루언서 의견이 없어요.")).toBeVisible();
    expect(screen.queryByLabelText("인플루언서별 최근 입장 집계")).not.toBeInTheDocument();
    view.rerender(<InfluencerAnalysis ticker={{ ...ticker, analysts: [{ ...ticker.analysts[0], latestClaim: null, latestSourceUrl: null }] }} />);
    expect(screen.getByLabelText("인플루언서별 최근 입장 집계")).toHaveTextContent("주장 미확인 1명");
    expect(screen.getByText("원문 링크 없음")).toBeVisible();
  });
});
