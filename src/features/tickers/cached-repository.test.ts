import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  cache: vi.fn((loader: (...args: unknown[]) => unknown, ...options: unknown[]) => { void options; return loader; }),
  overview: vi.fn(async () => [{ ticker: "COHR", watchlisted: false }]),
  detail: vi.fn(async (ticker: string) => ({ ticker })),
  research: vi.fn(async () => ({})),
  proof: vi.fn(async () => ({})),
}));
vi.mock("next/cache", () => ({ unstable_cache: mocks.cache }));
vi.mock("./repository", () => ({
  getTickerOverviewRows: mocks.overview,
  getAnalystProfiles: vi.fn(),
  getTickerDetail: mocks.detail,
  getTickerBriefingResearch: mocks.research,
  getTickerProofOverview: mocks.proof,
}));

import { getTickerBriefingResearch, getTickerDetail, getTickerOverviewRows, getTickerProofOverview } from "./cached-repository";

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv("SERENITY_FIXTURE_MODE", "false");
  vi.stubEnv("SUPABASE_URL", "https://one.supabase.co");
  vi.stubEnv("SUPABASE_SECRET_KEY", "test-secret");
});
afterEach(() => vi.unstubAllEnvs());

describe("shared ticker read cache boundary", () => {
  it("uses a project-scoped 60-second tagged cache without credentials in the key", async () => {
    await getTickerOverviewRows();
    expect(mocks.cache).toHaveBeenLastCalledWith(mocks.overview,
      ["serenity-reads-v1", "https://one.supabase.co", "overview"],
      { revalidate: 60, tags: ["serenity-ticker-data"] });
    vi.stubEnv("SUPABASE_URL", "https://two.supabase.co");
    await getTickerOverviewRows();
    expect(mocks.cache.mock.calls.at(-1)?.[1]).toContain("https://two.supabase.co");
  });

  it("canonicalizes detail and batch keys across navigation", async () => {
    await getTickerDetail("cohr");
    await getTickerBriefingResearch(["NVDA", " cohr ", "COHR"]);
    expect(mocks.detail).toHaveBeenCalledWith("COHR");
    expect(mocks.research).toHaveBeenCalledWith(["COHR", "NVDA"]);
  });

  it("builds proof fallbacks from shared rows rather than cookie-modified rows", async () => {
    await getTickerProofOverview();
    expect(mocks.proof).toHaveBeenCalledWith([{ ticker: "COHR", watchlisted: false }]);
  });

  it("bypasses the persistent cache in fixture mode", async () => {
    vi.stubEnv("SERENITY_FIXTURE_MODE", "true");
    await getTickerOverviewRows();
    expect(mocks.cache).not.toHaveBeenCalled();
    expect(mocks.overview).toHaveBeenCalledOnce();
  });
});
