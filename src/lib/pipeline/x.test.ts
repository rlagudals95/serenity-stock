import { describe, expect, it, vi } from "vitest";

import {
  extractTickerCandidates,
  fetchRettiwtPostPage,
  fetchRettiwtPosts,
  fetchRettiwtUser,
  mapRettiwtTweet,
  type RettiwtClient,
  type RettiwtTweet,
} from "./x";

function tweet(
  id: string,
  overrides: Partial<RettiwtTweet> = {},
): RettiwtTweet {
  return {
    id,
    fullText: `$TEST post ${id}`,
    createdAt: "2026-07-18T01:00:00.000Z",
    conversationId: id,
    tweetBy: {
      id: "456",
      userName: "aleabitoreddit",
    },
    url: `https://x.com/aleabitoreddit/status/${id}`,
    likeCount: 12,
    replyCount: 3,
    retweetCount: 4,
    viewCount: 500,
    ...overrides,
  };
}

function clientWithPages(
  pages: Array<{
    list: RettiwtTweet[];
    next?: string;
  }>,
): RettiwtClient {
  return {
    user: {
      details: vi.fn().mockResolvedValue({
        id: "456",
        userName: "aleabitoreddit",
      }),
      replies: vi.fn().mockImplementation(async () => {
        const page = pages.shift();
        if (!page) throw new Error("unexpected replies request");
        return page;
      }),
    },
  };
}

describe("extractTickerCandidates", () => {
  it("extracts and deduplicates explicit cashtags", () => {
    expect(
      extractTickerCandidates("$COHR remains strong. Watching $AAOI and $COHR."),
    ).toEqual(["COHR", "AAOI"]);
  });
});

describe("fetchRettiwtUser", () => {
  it("resolves a username through the Rettiwt client", async () => {
    const client = clientWithPages([]);

    await expect(fetchRettiwtUser(client, "aleabitoreddit")).resolves.toEqual({
      id: "456",
      username: "aleabitoreddit",
    });
    expect(client.user.details).toHaveBeenCalledWith("aleabitoreddit");
  });

  it("rejects a missing Rettiwt profile", async () => {
    const client = clientWithPages([]);
    vi.mocked(client.user.details).mockResolvedValueOnce(undefined);

    await expect(fetchRettiwtUser(client, "missing")).rejects.toThrow(
      "Rettiwt did not return a profile for @missing.",
    );
  });
});

describe("mapRettiwtTweet", () => {
  it("maps long-form quote data and public metrics", () => {
    expect(
      mapRettiwtTweet(
        tweet("123", {
          fullText: "$COHR full investment thesis",
          conversationId: "120",
          quoted: { id: "100" },
          toJSON: () => ({ id: "123", source: "rettiwt" }),
        }),
        "aleabitoreddit",
      ),
    ).toMatchObject({
      x_post_id: "123",
      author_id: "456",
      author_username: "aleabitoreddit",
      text: "$COHR full investment thesis",
      url: "https://x.com/aleabitoreddit/status/123",
      post_type: "quote",
      conversation_id: "120",
      referenced_post_ids: ["100"],
      metrics: {
        like_count: 12,
        reply_count: 3,
        retweet_count: 4,
        view_count: 500,
      },
      raw: { id: "123", source: "rettiwt" },
    });
  });

  it("classifies a repost before its nested quote metadata", () => {
    expect(
      mapRettiwtTweet(
        tweet("123", {
          quoted: { id: "100" },
          retweetedTweet: { id: "90" },
        }),
        "aleabitoreddit",
      ),
    ).toMatchObject({
      post_type: "repost",
      referenced_post_ids: ["90", "100"],
    });
  });
});

describe("fetchRettiwtPostPage", () => {
  it("excludes contextual posts written by other users", async () => {
    const client = clientWithPages([
      {
        list: [
          tweet("103"),
          tweet("104", {
            tweetBy: {
              id: "999",
              userName: "contextAuthor",
            },
          }),
        ],
      },
    ]);

    const page = await fetchRettiwtPostPage(client, {
      userId: "456",
      username: "aleabitoreddit",
    });

    expect(page.posts.map((post) => post.x_post_id)).toEqual(["103"]);
  });

  it("sorts newest first, removes posts at the stored cursor, and stops paging", async () => {
    const client = clientWithPages([
      {
        list: [tweet("101"), tweet("103"), tweet("102")],
        next: "page-2",
      },
    ]);

    const page = await fetchRettiwtPostPage(client, {
      userId: "456",
      username: "aleabitoreddit",
      sinceId: "101",
      pageSize: 100,
    });

    expect(page.posts.map((post) => post.x_post_id)).toEqual(["103", "102"]);
    expect(page.nextToken).toBeUndefined();
    expect(client.user.replies).toHaveBeenCalledWith("456", 20, undefined);
  });

  it("rejects a first page older than the stored cursor", async () => {
    const client = clientWithPages([
      {
        list: [tweet("99"), tweet("98")],
      },
    ]);

    await expect(
      fetchRettiwtPostPage(client, {
        userId: "456",
        username: "aleabitoreddit",
        sinceId: "100",
        pageSize: 100,
      }),
    ).rejects.toThrow(
      "Rettiwt timeline for @aleabitoreddit is older than stored cursor 100.",
    );
  });

  it("filters a historical page by the requested time range", async () => {
    const client = clientWithPages([
      {
        list: [
          tweet("103", { createdAt: "2026-07-19T00:00:00.000Z" }),
          tweet("102", { createdAt: "2026-07-18T12:00:00.000Z" }),
          tweet("101", { createdAt: "2026-07-17T00:00:00.000Z" }),
        ],
        next: "page-2",
      },
    ]);

    const page = await fetchRettiwtPostPage(client, {
      userId: "456",
      username: "aleabitoreddit",
      startTime: "2026-07-18T00:00:00.000Z",
      endTime: "2026-07-19T00:00:00.000Z",
      pageSize: 100,
    });

    expect(page.posts.map((post) => post.x_post_id)).toEqual(["103", "102"]);
    expect(page.nextToken).toBeUndefined();
  });
});

describe("fetchRettiwtPosts", () => {
  it("paginates with Rettiwt cursors and removes duplicate IDs", async () => {
    const client = clientWithPages([
      {
        list: [tweet("3"), tweet("2")],
        next: "next-page",
      },
      {
        list: [tweet("2"), tweet("1")],
      },
    ]);

    const posts = await fetchRettiwtPosts(client, {
      userId: "456",
      username: "aleabitoreddit",
      maxResults: 10,
    });

    expect(posts.map((post) => post.x_post_id)).toEqual(["3", "2", "1"]);
    expect(client.user.replies).toHaveBeenNthCalledWith(
      2,
      "456",
      8,
      "next-page",
    );
  });
});
