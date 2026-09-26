import { beforeEach, describe, expect, it, vi } from "vitest";

const db = vi.hoisted(() => ({ rpc: vi.fn(), from: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({
  isSupabaseConfigured: () => true,
  createClient: async () => db,
}));

import { getTickerBriefingResearch } from "./repository";

const evidence = (ticker: string, risk: string, catalyst: string) => ({
  ticker, post_ticker_analysis_id: 12, posted_at: "2026-09-25T00:00:00Z",
  source_url: "https://x.com/analyst/status/12", analyst_key: "analyst",
  analyst_name: "Analyst", x_username: "analyst", risks_mentioned: [risk],
  catalysts_mentioned: [catalyst],
});

beforeEach(() => vi.resetAllMocks());

describe("briefing evidence reads", () => {
  it("batches distinct tickers and preserves each card's source-backed evidence", async () => {
    db.rpc.mockResolvedValue({ data: [
      evidence("COHR", "Coherent risk", "Coherent catalyst"),
      evidence("NVDA", "Nvidia risk", "Nvidia catalyst"),
      evidence("COHR", "Coherent risk", "Coherent catalyst"),
    ], error: null });
    const result = await getTickerBriefingResearch(["nvda", " COHR ", "NVDA"]);
    expect(db.rpc).toHaveBeenCalledExactlyOnceWith("get_ticker_briefing_research", { p_tickers: ["COHR", "NVDA"] });
    expect(db.from).not.toHaveBeenCalled();
    expect(result.COHR.risks).toHaveLength(1);
    expect(result.COHR.risks[0]).toMatchObject({ text: "Coherent risk", sourceUrl: "https://x.com/analyst/status/12", analyst: { name: "Analyst" } });
    expect(result.NVDA.catalysts[0].text).toBe("Nvidia catalyst");
  });

  it("does not query an empty selection and rejects oversized batches", async () => {
    expect(await getTickerBriefingResearch([])).toEqual({});
    await expect(getTickerBriefingResearch(Array.from({ length: 11 }, (_, i) => `T${i}`))).rejects.toThrow("At most 10");
    expect(db.rpc).not.toHaveBeenCalled();
  });

  it("uses per-ticker limits during a rolling deployment without the RPC", async () => {
    db.rpc.mockResolvedValue({ error: { code: "PGRST202" }, data: null });
    const queries: Array<{ ticker?: string; limit: ReturnType<typeof vi.fn> }> = [];
    db.from.mockImplementation(() => {
      const query = {
        ticker: undefined as string | undefined,
        select: vi.fn().mockReturnThis(),
        eq: vi.fn(function (this: { ticker?: string }, _column: string, ticker: string) { this.ticker = ticker; return this; }),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn(async function (this: { ticker?: string }) { return { data: [evidence(this.ticker!, `${this.ticker} risk`, "next")], error: null }; }),
      };
      queries.push(query);
      return query;
    });
    const result = await getTickerBriefingResearch(["COHR", "NVDA"]);
    expect(db.from).toHaveBeenCalledTimes(2);
    expect(queries.every(query => query.limit.mock.calls[0][0] === 100)).toBe(true);
    expect(result.COHR.risks[0].text).toBe("COHR risk");
    expect(result.NVDA.risks[0].text).toBe("NVDA risk");
  });

  it("does not turn database failures into successfully cached empty evidence", async () => {
    db.rpc.mockResolvedValue({ error: { code: "57014", message: "timeout" }, data: null });
    await expect(getTickerBriefingResearch(["COHR"])).rejects.toThrow("timeout");
    expect(db.from).not.toHaveBeenCalled();
  });
});
