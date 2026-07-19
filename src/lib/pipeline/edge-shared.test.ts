import { afterEach, describe, expect, it, vi } from "vitest";

import { isCronAuthorized } from "../../../supabase/functions/_shared/auth";
import { parseDeepSeekContent } from "../../../supabase/functions/_shared/deepseek";
import {
  RettiwtSource,
  XSourceAuthenticationError,
  createXPostSource,
  chooseNewestPostId,
  fetchRettiwtPostPage,
  fetchRettiwtUser,
  mapRettiwtTweet,
  nextCursorState,
  rettiwtDelayMs,
  type RettiwtClient,
} from "../../../supabase/functions/_shared/x";
import {
  alertDueCutoff,
  alertRetryMinutes,
  authenticationAlertEventKey,
  credentialFingerprint,
  parseIngestionMode,
  runAlertEventKey,
  shouldContactX,
} from "../../../supabase/functions/_shared/ingestion-control";
import {
  normalizeScheduleClaim,
  type ScheduleClaim,
} from "../../../supabase/functions/_shared/database";

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

  it("parses scheduled and manual ingestion modes", () => {
    expect(parseIngestionMode({ mode: "scheduled" })).toBe("scheduled");
    expect(parseIngestionMode({ mode: "manual" })).toBe("manual");
    expect(parseIngestionMode({})).toBe("manual");
    expect(() => parseIngestionMode({ mode: "other" })).toThrow(
      "Unsupported ingestion mode: other",
    );
  });

  it("uses capped Telegram retry delays", () => {
    expect([0, 1, 2, 3, 10].map(alertRetryMinutes)).toEqual([
      5, 15, 60, 60, 60,
    ]);
  });

  it("allows a small clock skew when claiming due Telegram alerts", () => {
    expect(alertDueCutoff(Date.parse("2026-07-19T14:15:15.000Z"))).toBe(
      "2026-07-19T14:15:20.000Z",
    );
  });

  it("hashes credentials without returning the credential", async () => {
    const fingerprint = await credentialFingerprint("secret-cookie-value");
    expect(fingerprint).toMatch(/^[a-f0-9]{64}$/);
    expect(fingerprint).not.toContain("secret-cookie-value");
  });

  it("builds stable alert event keys", () => {
    expect(authenticationAlertEventKey("ingest-x", "abc")).toBe(
      "ingest-x:auth:abc",
    );
    expect(runAlertEventKey("ingest-x", "run-1")).toBe(
      "ingest-x:run:run-1",
    );
  });

  it("contacts X only for due or changed credentials", () => {
    expect(shouldContactX("due")).toBe(true);
    expect(shouldContactX("credential_changed")).toBe(true);
    expect(shouldContactX("not_due")).toBe(false);
    expect(shouldContactX("auth_blocked")).toBe(false);
  });

  it("normalizes the single-row schedule RPC response", () => {
    expect(
      normalizeScheduleClaim([
        {
          decision: "not_due",
          next_run_at: "2026-07-19T13:00:00.000Z",
          delay_minutes: null,
        },
      ]),
    ).toEqual({
      decision: "not_due",
      nextRunAt: "2026-07-19T13:00:00.000Z",
      delayMinutes: null,
    } satisfies ScheduleClaim);
  });

  it("rejects an invalid schedule decision", () => {
    expect(() =>
      normalizeScheduleClaim([{ decision: "unknown" }]),
    ).toThrow("Invalid pipeline schedule claim response");
  });

  it("provides the same Rettiwt source boundary in Edge", async () => {
    const apiKey = Buffer.from(
      "auth_token=auth;ct0=csrf;twid=u%3D123;",
    ).toString("base64");
    expect(rettiwtDelayMs(() => 0)).toBe(750);
    expect(
      createXPostSource({
        provider: "rettiwt",
        apiKey,
        random: () => 0,
      }),
    ).toBeInstanceOf(RettiwtSource);

    const client: RettiwtClient = {
      user: {
        details: vi.fn().mockRejectedValue({ status: 401 }),
        replies: vi.fn(),
      },
    };
    await expect(
      new RettiwtSource(client).resolveUser("test"),
    ).rejects.toBeInstanceOf(XSourceAuthenticationError);
  });

  it("translates invalid Rettiwt credentials during Edge source creation", () => {
    expect(() =>
      createXPostSource({
        provider: "rettiwt",
        apiKey: "not-a-rettiwt-key",
      }),
    ).toThrow(XSourceAuthenticationError);
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
