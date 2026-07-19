import { afterEach, describe, expect, it, vi } from "vitest";

import { isCronAuthorized } from "../../../supabase/functions/_shared/auth";
import { parseDeepSeekContent } from "../../../supabase/functions/_shared/deepseek";
import {
  chooseNewestPostId,
  fetchXUser,
  mapXPost,
  nextCursorState,
} from "../../../supabase/functions/_shared/x";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("Edge Function shared helpers", () => {
  it("authorizes only the exact cron secret", async () => {
    expect(await isCronAuthorized("correct-secret", "correct-secret")).toBe(
      true,
    );
    expect(await isCronAuthorized("wrong-secret", "correct-secret")).toBe(
      false,
    );
    expect(await isCronAuthorized(null, "correct-secret")).toBe(false);
  });

  it("strips a markdown JSON fence from DeepSeek output", () => {
    expect(parseDeepSeekContent("```json\n{\"relevance\":\"irrelevant\"}\n```"))
      .toEqual({ relevance: "irrelevant" });
  });

  it("maps long-form X note text and quote metadata", () => {
    expect(
      mapXPost(
        {
          id: "200",
          author_id: "42",
          text: "truncated",
          note_tweet: { text: "full post" },
          created_at: "2026-07-19T00:00:00.000Z",
          referenced_tweets: [{ id: "100", type: "quoted" }],
        },
        "aleabitoreddit",
      ),
    ).toMatchObject({
      x_post_id: "200",
      text: "full post",
      post_type: "quote",
      referenced_post_ids: ["100"],
      url: "https://x.com/aleabitoreddit/status/200",
      author_username: "aleabitoreddit",
    });
  });

  it("resolves a tracked username to the X user id on first ingestion", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          data: { id: "987", username: "StockSavvyShay" },
        }),
        { status: 200 },
      ),
    );
    vi.stubGlobal("fetch", fetchMock);

    await expect(fetchXUser("StockSavvyShay", "token")).resolves.toEqual({
      id: "987",
      username: "StockSavvyShay",
    });
    expect(String(fetchMock.mock.calls[0][0])).toContain(
      "/users/by/username/StockSavvyShay",
    );
  });

  it("selects the numerically newest X snowflake id", () => {
    expect(chooseNewestPostId(["9", "100", "21"], "80")).toBe("100");
  });

  it("commits the high-water id only when pagination is complete", () => {
    expect(
      nextCursorState({
        previousSinceId: "100",
        previousHighWaterId: null,
        pagePostIds: ["130", "120"],
        nextToken: "page-2",
      }),
    ).toMatchObject({
      sinceId: "100",
      highWaterId: "130",
      paginationToken: "page-2",
      complete: false,
    });

    expect(
      nextCursorState({
        previousSinceId: "100",
        previousHighWaterId: "130",
        pagePostIds: ["110"],
        nextToken: undefined,
      }),
    ).toEqual({
      sinceId: "130",
      highWaterId: null,
      paginationToken: null,
      complete: true,
    });
  });
});
