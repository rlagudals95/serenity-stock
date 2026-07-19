export interface TelegramConfig {
  botToken: string;
  chatId: string;
}

interface SuccessSummary {
  fetched: number;
  inserted: number;
  duplicates: number;
  jobsCreated: number;
  pages: number;
  occurredAt: string;
  recovered?: boolean;
}

interface FailureSummary {
  sourceKey?: string;
  error: string;
  fetched: number;
  inserted: number;
  pages: number;
  occurredAt: string;
}

type Fetcher = (
  input: string | URL | Request,
  init?: RequestInit,
) => Promise<Response>;

function kstTimestamp(value: string) {
  return new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).format(new Date(value));
}

function singleLine(value: string, maximumLength = 500) {
  return value.replace(/\s+/g, " ").trim().slice(0, maximumLength);
}

export function formatIngestionSuccess(summary: SuccessSummary) {
  return [
    summary.recovered ? "🟢 X 수집 복구" : "🟢 X 수집 완료",
    "",
    `신규 저장: ${summary.inserted}개`,
    `중복: ${summary.duplicates}개`,
    `조회: ${summary.fetched}개 / ${summary.pages}페이지`,
    `분석 작업: ${summary.jobsCreated}개`,
    `시각: ${kstTimestamp(summary.occurredAt)} KST`,
  ].join("\n");
}

export function formatIngestionFailure(summary: FailureSummary) {
  return [
    "🔴 X 수집 실패",
    "",
    `대상: ${summary.sourceKey ?? "확인 불가"}`,
    `오류: ${singleLine(summary.error) || "알 수 없는 오류"}`,
    `진행: 조회 ${summary.fetched}개 / 저장 ${summary.inserted}개 / ${summary.pages}페이지`,
    `시각: ${kstTimestamp(summary.occurredAt)} KST`,
  ].join("\n");
}

export function formatAuthenticationBlocked(summary: FailureSummary) {
  return [
    "🔴 X 인증 실패 · 수집 중단",
    "",
    `대상: ${summary.sourceKey ?? "확인 불가"}`,
    `오류: ${singleLine(summary.error) || "알 수 없는 오류"}`,
    `진행: 조회 ${summary.fetched}개 / 저장 ${summary.inserted}개 / ${summary.pages}페이지`,
    "상태: 같은 인증정보로 재시도하지 않습니다.",
    "조치: Supabase RETTIWT_API_KEY를 교체하세요.",
    `시각: ${kstTimestamp(summary.occurredAt)} KST`,
  ].join("\n");
}

export async function sendTelegramMessage(
  config: TelegramConfig,
  text: string,
  fetcher: Fetcher = fetch,
) {
  const response = await fetcher(
    `https://api.telegram.org/bot${config.botToken}/sendMessage`,
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        chat_id: config.chatId,
        text,
        disable_web_page_preview: true,
      }),
      signal: AbortSignal.timeout(15_000),
    },
  );
  const body = await response.json().catch(() => null) as {
    ok?: boolean;
    description?: string;
  } | null;

  if (!response.ok || body?.ok !== true) {
    const description = singleLine(body?.description ?? "unknown error", 200);
    throw new Error(
      `Telegram sendMessage failed (${response.status}): ${description}`,
    );
  }
}
