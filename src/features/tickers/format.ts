import type { ChangeType, CumulativeSentiment, Stance } from "./types";

export const cumulativeSentimentLabels: Record<
  CumulativeSentiment,
  string
> = {
  positive: "긍정 우세",
  negative: "부정 우세",
  mixed: "혼재",
  insufficient: "판단 부족",
};

export const stanceLabels: Record<Stance, string> = {
  bullish: "긍정 의견",
  bearish: "부정 의견",
  mixed: "혼재",
  neutral: "중립",
  unknown: "의견 없음",
};

export const changeLabels: Record<Exclude<ChangeType, null>, string> = {
  first_mention: "신규 종목",
  new_claim: "새 주장",
  new_risk: "새 리스크",
  stance_change: "방향 전환",
  repeat: "반복",
  unclear: "불명확",
};

export function formatKstDate(value: string, includeYear = true) {
  return new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    year: includeYear ? "numeric" : undefined,
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(value));
}

export function formatRelativeTime(value: string) {
  const difference = new Date(value).getTime() - Date.now();
  const absolute = Math.abs(difference);
  const formatter = new Intl.RelativeTimeFormat("ko", { numeric: "auto" });

  if (absolute < 60 * 60 * 1000) {
    return formatter.format(Math.round(difference / (60 * 1000)), "minute");
  }

  if (absolute < 24 * 60 * 60 * 1000) {
    return formatter.format(Math.round(difference / (60 * 60 * 1000)), "hour");
  }

  return formatter.format(
    Math.round(difference / (24 * 60 * 60 * 1000)),
    "day",
  );
}

export function confidenceLabel(value: number) {
  if (value >= 0.85) return "높음";
  if (value >= 0.75) return "보통";
  return "검토 필요";
}
