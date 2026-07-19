import type {
  AnalystComparison,
  AnalystSnapshot,
  Stance,
} from "./types";

export interface AnalystStanceCounts {
  bullish: number;
  bearish: number;
  other: number;
}

export interface AnalystPresenceModel {
  all: AnalystSnapshot[];
  visible: AnalystSnapshot[];
  hiddenCount: number;
  counts: AnalystStanceCounts;
  comparison: AnalystComparison;
}

export const analystStanceLabels: Record<Stance, string> = {
  bullish: "긍정 의견",
  bearish: "부정 의견",
  mixed: "혼재",
  neutral: "중립",
  unknown: "판단 보류",
};

export const analystComparisonLabels: Record<AnalystComparison, string> = {
  agreement: "최근 관점 일치",
  disagreement: "관점 엇갈림",
  mixed: "관점 혼재",
  single_source: "단일 분석가",
};

export function sortAnalystSnapshots(analysts: readonly AnalystSnapshot[]) {
  return [...analysts].sort((left, right) => {
    if (left.lastMentionedAt !== right.lastMentionedAt) {
      return left.lastMentionedAt < right.lastMentionedAt ? 1 : -1;
    }
    if (left.totalMentions !== right.totalMentions) {
      return right.totalMentions - left.totalMentions;
    }
    if (left.name === right.name) return 0;
    return left.name < right.name ? -1 : 1;
  });
}

export function compareAnalystSnapshots(
  analysts: readonly AnalystSnapshot[],
): AnalystComparison {
  if (analysts.length < 2) return "single_source";

  const hasBullish = analysts.some(
    (analyst) => analyst.latestStance === "bullish",
  );
  const hasBearish = analysts.some(
    (analyst) => analyst.latestStance === "bearish",
  );
  if (hasBullish && hasBearish) return "disagreement";

  if (
    analysts.every(
      (analyst) => analyst.latestStance === analysts[0]?.latestStance,
    )
  ) {
    return "agreement";
  }
  return "mixed";
}

export function countLatestStances(
  analysts: readonly AnalystSnapshot[],
): AnalystStanceCounts {
  return analysts.reduce<AnalystStanceCounts>(
    (counts, analyst) => {
      if (analyst.latestStance === "bullish") counts.bullish += 1;
      else if (analyst.latestStance === "bearish") counts.bearish += 1;
      else counts.other += 1;
      return counts;
    },
    { bullish: 0, bearish: 0, other: 0 },
  );
}

export function buildAnalystPresenceModel(
  analysts: readonly AnalystSnapshot[],
  visibleLimit: number,
): AnalystPresenceModel {
  const all = sortAnalystSnapshots(analysts);
  const visible = all.slice(0, visibleLimit);

  return {
    all,
    visible,
    hiddenCount: all.length - visible.length,
    counts: countLatestStances(all),
    comparison: compareAnalystSnapshots(all),
  };
}

export function analystInitials(name: string) {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "?";
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return `${words[0][0]}${words.at(-1)?.[0]}`.toUpperCase();
}
