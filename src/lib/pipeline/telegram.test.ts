import { describe, expect, it, vi } from "vitest";

import {
  formatAuthenticationBlocked,
  formatIngestionFailure,
  formatIngestionSuccess,
  sendTelegramMessage,
} from "../../../supabase/functions/_shared/telegram";

describe("Telegram ingestion notifications", () => {
  it("formats a concise successful collection summary", () => {
    expect(
      formatIngestionSuccess({
        fetched: 3,
        inserted: 2,
        duplicates: 1,
        jobsCreated: 2,
        pages: 2,
        occurredAt: "2026-07-19T12:04:48.000Z",
      }),
    ).toContain(
      "🟢 X 수집 완료\n\n신규 저장: 2개\n중복: 1개\n조회: 3개 / 2페이지\n분석 작업: 2개",
    );
  });

  it("labels the first successful run after a failure as recovered", () => {
    expect(
      formatIngestionSuccess({
        fetched: 0,
        inserted: 0,
        duplicates: 0,
        jobsCreated: 0,
        pages: 2,
        occurredAt: "2026-07-19T12:04:48.000Z",
        recovered: true,
      }),
    ).toContain("🟢 X 수집 복구");
  });

  it("formats a failure without exposing raw payloads or credentials", () => {
    const message = formatIngestionFailure({
      sourceKey: "x:stocksavvyshay",
      error: "Rettiwt authentication failed",
      fetched: 0,
      inserted: 0,
      pages: 1,
      occurredAt: "2026-07-19T12:04:48.000Z",
    });

    expect(message).toContain("🔴 X 수집 실패");
    expect(message).toContain("대상: x:stocksavvyshay");
    expect(message).toContain("오류: Rettiwt authentication failed");
  });

  it("states that authentication failure stops X collection", () => {
    const message = formatAuthenticationBlocked({
      sourceKey: "x:stocksavvyshay",
      error: "Rettiwt authentication failed",
      fetched: 0,
      inserted: 0,
      pages: 1,
      occurredAt: "2026-07-19T12:04:48.000Z",
    });

    expect(message).toContain("🔴 X 인증 실패 · 수집 중단");
    expect(message).toContain("같은 인증정보로 재시도하지 않습니다");
    expect(message).toContain("Supabase RETTIWT_API_KEY를 교체");
    expect(message).not.toMatch(/auth_token|ct0|twid|fingerprint/i);
  });

  it("posts JSON through sendMessage and sanitizes Telegram errors", async () => {
    const fetcher = vi.fn().mockResolvedValueOnce(
      new Response(JSON.stringify({ ok: true }), { status: 200 }),
    );

    await sendTelegramMessage(
      { botToken: "bot-secret", chatId: "123" },
      "collection complete",
      fetcher,
    );

    expect(fetcher).toHaveBeenCalledWith(
      "https://api.telegram.org/botbot-secret/sendMessage",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          chat_id: "123",
          text: "collection complete",
          disable_web_page_preview: true,
        }),
      }),
    );

    const failingFetcher = vi.fn().mockResolvedValueOnce(
      new Response(
        JSON.stringify({ ok: false, description: "chat not found" }),
        { status: 400 },
      ),
    );
    await expect(
      sendTelegramMessage(
        { botToken: "must-not-leak", chatId: "missing" },
        "test",
        failingFetcher,
      ),
    ).rejects.toThrow("Telegram sendMessage failed (400): chat not found");
  });
});
