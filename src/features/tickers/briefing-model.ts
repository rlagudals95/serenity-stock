import type { AnalystSnapshot, TickerDetail, TickerOverview } from "./types";
import type { RecommendationContext } from "./briefing-selection";

export interface BriefEvidence {
  text: string;
  author: string;
  date: string;
  url: string | null;
}

export interface OpinionSnapshot {
  asOf: string;
  sources: Array<{
    key: string;
    name: string;
    stance: string;
    claim: string;
    date: string;
    change: string | null;
    url: string | null;
  }>;
}

export interface TickerBrief {
  ticker: string;
  companyName: string;
  watchlisted: boolean;
  asOf: string;
  expectation: BriefEvidence | null;
  risk: BriefEvidence | null;
  nextCheck: BriefEvidence | null;
  snapshot: OpinionSnapshot;
  recommendation?: RecommendationContext;
}

export function sourceHref(url: string | null | undefined) {
  if (!url) return null;
  try {
    const parsed = new URL(url);
    return parsed.protocol === "https:" || parsed.protocol === "http:" ? url : null;
  } catch {
    return null;
  }
}

function analystEvidence(analyst: AnalystSnapshot | undefined): BriefEvidence | null {
  return analyst?.latestClaim?.trim() ? {
    text: analyst.latestClaim.trim(), author: analyst.name,
    date: analyst.lastMentionedAt, url: sourceHref(analyst.latestSourceUrl),
  } : null;
}

export function opinionSnapshot(row: TickerOverview): OpinionSnapshot {
  return {
    asOf: row.lastMentionedAt,
    sources: [...(row.analysts ?? [])].sort((a, b) => a.key.localeCompare(b.key)).map(a => ({
      key: a.key, name: a.name, stance: a.latestStance,
      claim: a.latestClaim?.trim() ?? "", date: a.lastMentionedAt,
      change: a.latestChangeType, url: sourceHref(a.latestSourceUrl),
    })),
  };
}

export function buildTickerBrief(row: TickerOverview, detail?: TickerDetail): TickerBrief {
  const analysts = [...(row.analysts ?? [])].sort((a, b) => b.lastMentionedAt.localeCompare(a.lastMentionedAt));
  const risk = detail?.risks[0];
  const catalyst = detail?.catalysts[0];
  const claim = detail?.claims.find(c => c.stance === "bullish");
  return {
    ticker: row.ticker, companyName: row.companyName, watchlisted: row.watchlisted,
    asOf: row.lastMentionedAt,
    expectation: analystEvidence(analysts.find(a => a.latestStance === "bullish" && a.latestClaim)) ??
      (claim ? { text: claim.text, author: claim.analyst.name, date: claim.date, url: sourceHref(claim.sourceUrl) } : null),
    risk: risk ? { text: risk.text, author: risk.analyst.name, date: risk.date, url: sourceHref(risk.sourceUrl) } :
      analystEvidence(analysts.find(a => a.latestStance === "bearish" && a.latestClaim)),
    nextCheck: catalyst ? { text: catalyst.text, author: catalyst.analyst.name, date: catalyst.date, url: sourceHref(catalyst.sourceUrl) } : null,
    snapshot: opinionSnapshot(row),
  };
}

const meaningfulChanges = new Set(["new_claim", "new_risk", "stance_change", "first_mention"]);
const normalized = (value: string) => value.replace(/\s+/g, " ").trim();

/** Compare authored content, never counts or timestamps alone. Historical backfill is not a new update. */
export function findOpinionChanges(before: OpinionSnapshot | undefined, current: OpinionSnapshot) {
  if (!before) return [];
  return current.sources.flatMap(source => {
    const old = before.sources.find(item => item.key === source.key);
    if (!source.claim || !source.change || !meaningfulChanges.has(source.change)) return [];
    const cutoff = old?.date ?? before.asOf;
    const date = Date.parse(source.date);
    const previousDate = Date.parse(cutoff);
    if (!Number.isFinite(date) || !Number.isFinite(previousDate) || date <= previousDate) return [];
    if (old && normalized(source.claim) === normalized(old.claim) && source.stance === old.stance) return [];
    return [{ before: old ?? null, after: source }];
  }).sort((a, b) => {
    const priority = (value: string | null) => value === "new_risk" ? 2 : value === "stance_change" ? 1 : 0;
    return priority(b.after.change) - priority(a.after.change) || b.after.date.localeCompare(a.after.date);
  });
}

export function isStale(asOf: string, now = Date.now()) {
  return !Number.isFinite(Date.parse(asOf)) || now - Date.parse(asOf) > 7 * 24 * 60 * 60 * 1000;
}
