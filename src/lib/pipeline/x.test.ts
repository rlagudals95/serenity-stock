import { afterEach, describe, expect, it, vi } from "vitest";

import {
  extractTickerCandidates,
  fetchXPosts,
  fetchXUser,
  mapXPost,
} from "./x";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("extractTickerCandidates", () => {
  it("extracts and deduplicates explicit cashtags", () => {
    expect(
      extractTickerCandidates("$COHR remains strong. Watching $AAOI and $COHR."),
    ).toEqual(["COHR", "AAOI"]);
  });
});

describe("fetchXUser", () => {
  it("includes top-level X API error details", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            detail: "credits depleted",
            status: 402,
            title: "Payment Required",
          }),
          {
            status: 402,
            headers: { "content-type": "application/json" },
          },
        ),
      ),
    );

    await expect(fetchXUser("aleabitoreddit", "token")).rejects.toThrow(
      "X API request failed (402): credits depleted",
    );
  });
});

describe("mapXPost", () => {
  it("maps quoted posts and prefers the full note text", () => {
    expect(
      mapXPost(
        {
          id: "123",
          author_id: "456",
          text: "truncated",
          note_tweet: { text: "$COHR full investment thesis" },
          created_at: "2026-07-18T01:00:00.000Z",
          conversation_id: "120",
          referenced_tweets: [{ id: "100", type: "quoted" }],
          public_metrics: { like_count: 12 },
        },
        "aleabitoreddit",
      ),
    ).toMatchObject({
      x_post_id: "123",
      author_id: "456",
      text: "$COHR full investment thesis",
      url: "https://x.com/aleabitoreddit/status/123",
      post_type: "quote",
      referenced_post_ids: ["100"],
    });
  });
});

describe("fetchXPosts", () => {
  it("paginates and removes duplicate post IDs before mapping", async () => {
    const page = (ids: string[], nextToken?: string) =>
      new Response(
        JSON.stringify({
          data: ids.map((id) => ({
            id,
            author_id: "456",
            text: `$TEST post ${id}`,
            created_at: "2026-07-18T01:00:00.000Z",
          })),
          meta: { next_token: nextToken, result_count: ids.length },
        }),
        {
          status: 200,
          headers: { "content-type": "application/json" },
        },
      );
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(page(["3", "2"], "next-page"))
      .mockResolvedValueOnce(page(["2", "1"]));
    vi.stubGlobal("fetch", fetchMock);

    const posts = await fetchXPosts({
      userId: "456",
      username: "aleabitoreddit",
      bearerToken: "token",
      startTime: "2026-05-18T00:00:00.000Z",
      endTime: "2026-07-18T00:00:00.000Z",
      maxResults: 10,
    });

    expect(posts.map((post) => post.x_post_id)).toEqual(["3", "2", "1"]);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(String(fetchMock.mock.calls[0][0])).toContain(
      "start_time=2026-05-18T00%3A00%3A00.000Z",
    );
    expect(String(fetchMock.mock.calls[0][0])).toContain(
      "end_time=2026-07-18T00%3A00%3A00.000Z",
    );
    expect(String(fetchMock.mock.calls[1][0])).toContain(
      "pagination_token=next-page",
    );
  });
});
