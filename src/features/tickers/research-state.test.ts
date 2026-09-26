import { beforeEach, describe, expect, it, vi } from "vitest";
import { emptyResearch, markReviewed, parseResearch, RESEARCH_STORAGE_KEY, saveResearch } from "./research-state";

beforeEach(() => { localStorage.clear(); vi.restoreAllMocks(); });

describe("persistent browser research", () => {
  it("round-trips notes and keeps review snapshots when editing notes", () => {
    const baseline = { asOf: "2026-09-26T00:00:00Z", sources: [] };
    markReviewed("COHR", baseline);
    saveResearch("COHR", { priority: "high", status: "paused", note: "다음 실적에서 주문 확인" });
    const stored = parseResearch(localStorage.getItem(RESEARCH_STORAGE_KEY)).COHR;
    expect(stored.note).toBe("다음 실적에서 주문 확인");
    expect(stored.status).toBe("paused");
    expect(stored.baseline).toEqual(baseline);
    expect(stored.savedAt).not.toBeNull();
  });
  it("rejects malformed records without crashing valid research", () => {
    expect(parseResearch("{bad")).toEqual({});
    expect(parseResearch(JSON.stringify({ COHR: emptyResearch, BAD: { note: false } }))).toEqual({ COHR: emptyResearch });
  });
  it("propagates storage failure instead of reporting a successful save", () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => { throw new DOMException("Quota exceeded", "QuotaExceededError"); });
    expect(() => saveResearch("COHR", { priority: "medium", status: "researching", note: "保留" })).toThrow();
    expect(localStorage.getItem(RESEARCH_STORAGE_KEY)).toBeNull();
  });
});
