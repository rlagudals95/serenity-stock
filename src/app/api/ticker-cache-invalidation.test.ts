import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({
  revalidateTag: vi.fn(), revalidatePath: vi.fn(),
  sync: vi.fn(async () => ({ status: "completed" })),
  analyze: vi.fn(async () => ({ status: "completed" })),
}));
vi.mock("next/cache", () => ({ revalidateTag: mocks.revalidateTag, revalidatePath: mocks.revalidatePath }));
vi.mock("@/lib/pipeline/edge-functions", () => ({ getHostedPipelineConfig: () => ({}), runHostedSync: mocks.sync }));
vi.mock("@/lib/pipeline/config", () => ({ getPipelineConfig: () => ({}) }));
vi.mock("@/lib/pipeline/held-analysis", () => ({ analyzeHeldPostsBatch: mocks.analyze }));

import { POST as sync } from "./sync/route";
import { POST as analyze } from "./backfill/analyze/route";

beforeEach(() => vi.clearAllMocks());

describe.each([["sync", sync], ["backfill/analyze", analyze]] as const)("%s cache invalidation", (path, handler) => {
  it("expires shared reads and refreshes both navigation surfaces after a successful write", async () => {
    const response = await handler(new NextRequest(`http://localhost/api/${path}`, { method: "POST" }));
    expect(response.status).toBe(200);
    expect(mocks.revalidateTag).toHaveBeenCalledWith("serenity-ticker-data", { expire: 0 });
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/tickers", "layout");
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/watchlist");
  });

  it("does not let remote callers flush the shared cache", async () => {
    const response = await handler(new NextRequest(`https://example.com/api/${path}`, { method: "POST" }));
    expect(response.status).toBe(403);
    expect(mocks.revalidateTag).not.toHaveBeenCalled();
    expect(mocks.sync).not.toHaveBeenCalled();
    expect(mocks.analyze).not.toHaveBeenCalled();
  });
});
