import { hasPublicTickerIdentity } from "./query";
import { sourceHref, type BriefEvidence } from "./briefing-model";
import type { AnalystSnapshot, TickerOverview } from "./types";

export interface RecommendationContext {
  lens: "evidence" | "change" | "growth" | "compare";
  label: string;
  need: string;
  reason: string;
  evidence: BriefEvidence;
  bullishCount: number;
  bearishCount: number;
  completedSamples: number;
}

function usableSources(row: TickerOverview) {
  return [...new Map((row.analysts ?? []).map(a => [a.key, a])).values()]
    .filter(a => a.latestClaim?.trim() && sourceHref(a.latestSourceUrl) && Number.isFinite(Date.parse(a.lastMentionedAt)));
}
function evidence(a: AnalystSnapshot): BriefEvidence {
  return { text: a.latestClaim!.trim(), author: a.name, date: a.lastMentionedAt, url: sourceHref(a.latestSourceUrl) };
}

// Explicit text matching is a browsing lens, not an inferred investment horizon or risk score.
const growthPatterns = [
  { pattern: /반복\s*매출|recurring revenue/i, topic: "반복 매출", weight: 3 },
  { pattern: /채택\s*확대|adoption|구조적\s*성장|structural growth/i, topic: "채택 확대·구조적 성장", weight: 2 },
  { pattern: /시장.{0,6}확대|고객.{0,6}다변화|장기.{0,6}성장|market expansion/i, topic: "시장·고객 확대", weight: 1 },
];

/** Select distinct source-backed stocks across needs. Never use mention volume as return probability. */
export function selectBriefingCandidates(rows: TickerOverview[]) {
  const pool = rows.filter(hasPublicTickerIdentity).map(row => {
    const sources = usableSources(row);
    const bullish = sources.filter(a => a.latestStance === "bullish")
      .sort((a, b) => b.lastMentionedAt.localeCompare(a.lastMentionedAt) || a.key.localeCompare(b.key));
    const bearish = sources.filter(a => a.latestStance === "bearish");
    const growth = bullish.flatMap(source => growthPatterns
      .filter(rule => rule.pattern.test(source.latestClaim!))
      .map(rule => ({ source, ...rule })))
      .sort((a, b) => b.weight - a.weight || b.source.lastMentionedAt.localeCompare(a.source.lastMentionedAt))[0];
    const change = bullish.find(a => a.latestChangeType === "new_claim" || a.latestChangeType === "first_mention");
    return { row, bullish, bearish, growth, change };
  }).filter(item => item.bullish.length > item.bearish.length && item.row.latestStance !== "bearish");

  type Entry = typeof pool[number];
  const picks: Array<{ row: TickerOverview; recommendation: RecommendationContext }> = [];
  const used = new Set<string>();
  function take(item: Entry | undefined, lens: RecommendationContext["lens"], label: string, need: string, reason: string, source?: AnalystSnapshot) {
    if (!item) return;
    used.add(item.row.ticker);
    picks.push({ row: item.row, recommendation: {
      lens, label, need, reason, evidence: evidence(source ?? item.bullish[0]),
      bullishCount: item.bullish.length, bearishCount: item.bearish.length,
      completedSamples: item.row.proofMetrics?.sampleSize ?? 0,
    } });
  }
  const byBreadth = (a: Entry, b: Entry) => b.bullish.length - a.bullish.length ||
    b.bullish[0].lastMentionedAt.localeCompare(a.bullish[0].lastMentionedAt) || a.row.ticker.localeCompare(b.row.ticker);
  const broad = [...pool].filter(p => p.bullish.length >= 2).sort(byBreadth)[0];
  take(broad, "evidence", "여러 의견 비교", "근거를 비교하며 고르고 싶다면", broad ? `추적 중인 ${broad.bullish.length}명의 긍정 의견을 비교할 수 있어 선정했어요.${broad.bearish.length ? ` 반대 의견 ${broad.bearish.length}명도 함께 확인하세요.` : " 의견 수가 수익을 보장하지는 않아요."}` : "");

  // Reserve a growth candidate before filling the change slot so one stock cannot occupy two needs.
  const growth = pool.filter(p => !used.has(p.row.ticker) && p.growth)
    .sort((a, b) => b.growth!.weight - a.growth!.weight || byBreadth(a, b))[0];
  const change = pool.filter(p => !used.has(p.row.ticker) && p.row.ticker !== growth?.row.ticker && p.change)
    .sort((a, b) => b.change!.lastMentionedAt.localeCompare(a.change!.lastMentionedAt) || byBreadth(a, b))[0];
  take(change, "change", "새 변화 포착", "변화에서 투자 기회를 찾고 싶다면", change ? `${change.change!.name}의 ${change.change!.latestChangeType === "first_mention" ? "첫 언급" : "새 주장"}이 있어 선정했어요. 아래 확인 항목이 실제로 진행되는지 살펴보세요.` : "", change?.change);
  take(growth, "growth", "사업 성장 추적", "기업의 성장을 길게 보고 싶다면", growth ? `${growth.growth!.source.name}의 의견에 ${growth.growth!.topic} 근거가 있어 선정했어요. 사업의 변화가 실적으로 이어지는지 추적할 후보예요.` : "", growth?.growth?.source);

  for (const item of [...pool].filter(p => !used.has(p.row.ticker)).sort(byBreadth)) {
    if (picks.length >= 3) break;
    if (used.has(item.row.ticker)) continue;
    take(item, "compare", "추가 관점 비교", "다른 종목의 근거도 비교하고 싶다면", `원문이 있는 긍정 의견 ${item.bullish.length}개를 확인할 수 있어 비교 후보로 골랐어요. 특정 투자 방식에 맞는 근거는 더 확인해야 해요.`);
  }
  return picks;
}
