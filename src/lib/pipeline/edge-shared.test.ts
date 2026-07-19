import { afterEach, describe, expect, it, vi } from "vitest";

import { isCronAuthorized } from "../../../supabase/functions/_shared/auth";
import { parseDeepSeekContent } from "../../../supabase/functions/_shared/deepseek";
import {
  chooseNewestPostId,
  fetchRettiwtPostPage,
  fetchRettiwtUser,
  mapRettiwtTweet,
  nextCursorState,
  type RettiwtClient,
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
      mapRettiwtTweet(
        {
          id: "200",
          fullText: "full post",
          createdAt: "2026-07-19T00:00:00.000Z",
          conversationId: "200",
          tweetBy: { id: "42", userName: "aleabitoreddit" },
          quoted: { id: "100" },
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

  it("resolves a tracked username through Rettiwt on first ingestion", async () => {
    const client: RettiwtClient = {
      user: {
        details: vi.fn().mockResolvedValue({
          id: "987",
          userName: "StockSavvyShay",
        }),
        replies: vi.fn(),
      },
    };

    await expect(
      fetchRettiwtUser(client, "StockSavvyShay"),
    ).resolves.toEqual({
      id: "987",
      username: "StockSavvyShay",
    });
    expect(client.user.details).toHaveBeenCalledWith(
      "StockSavvyShay",
    );
  });

  it("rejects a stale Rettiwt timeline instead of silently missing posts", async () => {
    const client: RettiwtClient = {
      user: {
        details: vi.fn(),
        replies: vi.fn().mockResolvedValue({
          list: [
            {
              id: "99",
              fullText: "stale post",
              createdAt: "2026-07-18T00:00:00.000Z",
              conversationId: "99",
              tweetBy: { id: "42", userName: "aleabitoreddit" },
            },
          ],
        }),
      },
    };

    await expect(
      fetchRettiwtPostPage(client, {
        userId: "42",
        username: "aleabitoreddit",
        sinceId: "100",
      }),
    ).rejects.toThrow(
      "Rettiwt timeline for @aleabitoreddit is older than stored cursor 100.",
    );
  });

  it("excludes contextual posts that do not belong to the tracked user", async () => {
    const client: RettiwtClient = {
      user: {
        details: vi.fn(),
        replies: vi.fn().mockResolvedValue({
          list: [
            {
              id: "101",
              fullText: "tracked post",
              createdAt: "2026-07-19T00:00:00.000Z",
              conversationId: "101",
              tweetBy: { id: "42", userName: "aleabitoreddit" },
            },
            {
              id: "102",
              fullText: "context from another user",
              createdAt: "2026-07-19T00:01:00.000Z",
              conversationId: "101",
              tweetBy: { id: "99", userName: "contextAuthor" },
            },
          ],
        }),
      },
    };

    await expect(
      fetchRettiwtPostPage(client, {
        userId: "42",
        username: "aleabitoreddit",
      }),
    ).resolves.toMatchObject({
      posts: [
        expect.objectContaining({
          x_post_id: "101",
          author_id: "42",
        }),
      ],
    });
  });

  it("passes through Rettiwt's string pagination cursor", async () => {
    const client: RettiwtClient = {
      user: {
        details: vi.fn(),
        replies: vi.fn().mockResolvedValue({
          list: [
            {
              id: "101",
              fullText: "new post",
              createdAt: "2026-07-19T00:00:00.000Z",
              conversationId: "101",
              tweetBy: { id: "42", userName: "aleabitoreddit" },
            },
          ],
          next: "page-2",
        }),
      },
    };

    await expect(
      fetchRettiwtPostPage(client, {
        userId: "42",
        username: "aleabitoreddit",
      }),
    ).resolves.toMatchObject({ nextToken: "page-2" });
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

  it("commits the first page immediately when bootstrapping a new source", () => {
    expect(
      nextCursorState({
        previousSinceId: null,
        previousHighWaterId: null,
        pagePostIds: ["130", "120"],
        nextToken: "historical-page-2",
        bootstrap: true,
      }),
    ).toEqual({
      sinceId: "130",
      highWaterId: null,
      paginationToken: null,
      complete: true,
    });
  });
});
