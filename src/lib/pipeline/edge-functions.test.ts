import { describe, expect, it, vi } from "vitest";

import {
  invokeScheduledFunction,
  runHostedSync,
} from "./edge-functions";

const config = {
  supabaseUrl: "https://serenity.supabase.co/",
  cronSecret: "cron-secret",
};

describe("hosted pipeline invocation", () => {
  it("sends the custom cron secret to the selected Edge Function", async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(JSON.stringify({ status: "completed" }), { status: 200 }),
    );

    await invokeScheduledFunction("ingest-x", config, fetcher);

    expect(fetcher).toHaveBeenCalledWith(
      "https://serenity.supabase.co/functions/v1/ingest-x",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          "x-serenity-cron-secret": "cron-secret",
        }),
      }),
    );
  });

  it("runs ingestion before analysis", async () => {
    const calls: string[] = [];
    const fetcher = vi.fn<typeof fetch>().mockImplementation(async (input) => {
      calls.push(String(input));
      return new Response(
        JSON.stringify({ status: "completed", counts: {} }),
        { status: 200 },
      );
    });

    await runHostedSync(config, fetcher);

    expect(calls.map((url) => url.split("/").at(-1))).toEqual([
      "ingest-x",
      "analyze-posts",
    ]);
  });

  it("does not run analysis when ingestion fails", async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(JSON.stringify({ error: { message: "X unavailable" } }), {
        status: 503,
      }),
    );

    await expect(runHostedSync(config, fetcher)).rejects.toThrow(
      "X unavailable",
    );
    expect(fetcher).toHaveBeenCalledTimes(1);
  });
});
