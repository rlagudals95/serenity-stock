import { afterEach, describe, expect, it, vi } from "vitest";

import { analyzePostWithDeepSeek, parseDeepSeekContent } from "./deepseek";

describe("parseDeepSeekContent", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("parses JSON returned directly or inside a markdown fence", () => {
    expect(parseDeepSeekContent('{"relevance":"irrelevant"}')).toEqual({
      relevance: "irrelevant",
    });
    expect(
      parseDeepSeekContent('```json\n{"relevance":"relevant"}\n```'),
    ).toEqual({ relevance: "relevant" });
  });

  it("allows enough output tokens for long multi-ticker posts", async () => {
    const timeout = vi
      .spyOn(AbortSignal, "timeout")
      .mockReturnValue(new AbortController().signal);
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          choices: [
            {
              message: {
                content: JSON.stringify({
                  relevance: "irrelevant",
                  summary_ko: null,
                  themes: [],
                  is_noise: true,
                  ticker_analyses: [],
                }),
              },
            },
          ],
        }),
        { status: 200 },
      ),
    );

    await analyzePostWithDeepSeek({
      apiKey: "test-key",
      model: "test-model",
      candidates: [],
      post: {
        x_post_id: "1",
        author_id: "2",
        author_username: "StockSavvyShay",
        text: "Long recap",
        url: "https://x.com/aleabitoreddit/status/1",
        post_type: "original",
        conversation_id: null,
        referenced_post_ids: [],
        posted_at: "2026-07-18T00:00:00.000Z",
        metrics: {},
        raw: {
          id: "1",
          author_id: "2",
          text: "Long recap",
          created_at: "2026-07-18T00:00:00.000Z",
        },
      },
    });

    const request = JSON.parse(
      String((fetchMock.mock.calls[0][1] as RequestInit).body),
    ) as {
      max_tokens: number;
      messages: Array<{ role: string; content: string }>;
    };
    expect(request.max_tokens).toBe(8_000);
    expect(JSON.parse(request.messages[1].content)).toMatchObject({
      author: "@StockSavvyShay",
    });
    expect(timeout).toHaveBeenCalledWith(120_000);
  });
});
