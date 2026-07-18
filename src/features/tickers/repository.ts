import { getCumulativeSentiment } from "./query";
import {
  getFixtureTickerDetail,
  tickerOverviewFixtures,
} from "./fixtures";
import type {
  ChangeType,
  Claim,
  CumulativeSentiment,
  Opinion,
  ResearchItem,
  Stance,
  TickerDetail,
  TickerOverview,
  TrendPoint,
} from "./types";

type DatabaseNumber = number | string | null | undefined;

export interface OverviewViewRow {
  ticker: string;
  company_name: string;
  total_mentions: DatabaseNumber;
  positive_count: DatabaseNumber;
  negative_count: DatabaseNumber;
  neutral_count: DatabaseNumber;
  mixed_count: DatabaseNumber;
  unknown_count: DatabaseNumber;
  cumulative_sentiment: string | null;
  latest_stance: string | null;
  latest_change_type: string | null;
  mentions_7d: DatabaseNumber;
  mentions_30d: DatabaseNumber;
  unique_threads?: DatabaseNumber;
  last_mentioned_at: string | null;
  is_watchlisted: boolean | null;
  needs_review_count: DatabaseNumber;
}

export interface TimelineViewRow {
  post_ticker_analysis_id: DatabaseNumber;
  ticker: string;
  posted_at: string;
  source_url: string | null;
  source_text: string;
  stance: string;
  claim_type: string;
  claim: string | null;
  evidence_from_post: string[] | null;
  risks_mentioned: string[] | null;
  catalysts_mentioned: string[] | null;
  conviction: string;
  novelty: string;
  stance_confidence: DatabaseNumber;
  review_status: string;
  change_type: string | null;
  change_summary: string | null;
}

const sentiments = new Set<CumulativeSentiment>([
  "positive",
  "negative",
  "mixed",
  "insufficient",
]);
const stances = new Set<Stance>([
  "bullish",
  "bearish",
  "mixed",
  "neutral",
  "unknown",
]);
const changes = new Set<Exclude<ChangeType, null>>([
  "first_mention",
  "new_claim",
  "new_risk",
  "stance_change",
  "repeat",
  "unclear",
]);

function number(value: DatabaseNumber) {
  const normalized = Number(value ?? 0);
  return Number.isFinite(normalized) ? normalized : 0;
}

function stance(value: string | null): Stance {
  return value && stances.has(value as Stance) ? (value as Stance) : "unknown";
}

function change(value: string | null): ChangeType {
  return value && changes.has(value as Exclude<ChangeType, null>)
    ? (value as Exclude<ChangeType, null>)
    : null;
}

export function mapOverviewRow(row: OverviewViewRow): TickerOverview {
  const positiveCount = number(row.positive_count);
  const negativeCount = number(row.negative_count);
  const storedSentiment =
    row.cumulative_sentiment &&
    sentiments.has(row.cumulative_sentiment as CumulativeSentiment)
      ? (row.cumulative_sentiment as CumulativeSentiment)
      : null;

  return {
    ticker: row.ticker,
    companyName: row.company_name,
    totalMentions: number(row.total_mentions),
    positiveCount,
    negativeCount,
    neutralCount: number(row.neutral_count),
    mixedCount: number(row.mixed_count),
    unknownCount: number(row.unknown_count),
    cumulativeSentiment:
      storedSentiment ??
      getCumulativeSentiment({ positiveCount, negativeCount }),
    latestStance: stance(row.latest_stance),
    changeType: change(row.latest_change_type),
    mentions7d: number(row.mentions_7d),
    mentions30d: number(row.mentions_30d),
    lastMentionedAt:
      row.last_mentioned_at ?? "1970-01-01T00:00:00.000Z",
    watchlisted: Boolean(row.is_watchlisted),
    reviewCount: number(row.needs_review_count),
  };
}

async function supabaseClient() {
  const { createClient } = await import("@/lib/supabase/server");
  return createClient();
}

async function hasSupabaseConfig() {
  const { isSupabaseConfigured } = await import("@/lib/supabase/server");
  return isSupabaseConfigured();
}

export async function getTickerOverviewRows(): Promise<TickerOverview[]> {
  if (!(await hasSupabaseConfig())) {
    return tickerOverviewFixtures;
  }

  const client = await supabaseClient();
  const { data, error } = await client
    .from("ticker_overview")
    .select("*")
    .order("total_mentions", { ascending: false });

  if (error) throw new Error(`Ticker overview query failed: ${error.message}`);
  return (data as OverviewViewRow[]).map(mapOverviewRow);
}

function mapOpinion(row: TimelineViewRow): Opinion {
  const novelty =
    row.novelty === "new"
      ? "new"
      : row.novelty === "repeated"
        ? "repeat"
        : "unclear";
  const conviction =
    row.conviction === "high" || row.conviction === "medium"
      ? row.conviction
      : "low";
  const claimType = ["thesis", "risk", "catalyst", "valuation"].includes(
    row.claim_type,
  )
    ? (row.claim_type as Opinion["claimType"])
    : "other";

  return {
    id: String(row.post_ticker_analysis_id),
    postedAt: row.posted_at,
    stance: stance(row.stance),
    changeType: change(row.change_type),
    claimType,
    novelty,
    conviction,
    claim: row.claim ?? "명확한 claim이 추출되지 않았습니다.",
    evidence: row.evidence_from_post?.[0] ?? row.source_text,
    fullText: row.source_text,
    sourceUrl: row.source_url,
    confidence: number(row.stance_confidence),
    reviewStatus:
      row.review_status === "approved" ||
      row.review_status === "needs_review"
        ? row.review_status
        : "auto",
  };
}

function uniqueResearchItems(
  rows: TimelineViewRow[],
  field: "risks_mentioned" | "catalysts_mentioned",
): ResearchItem[] {
  const seen = new Set<string>();
  const items: ResearchItem[] = [];

  for (const row of rows) {
    for (const text of row[field] ?? []) {
      const normalized = text.trim();
      if (!normalized || seen.has(normalized)) continue;
      seen.add(normalized);
      items.push({
        id: `${row.post_ticker_analysis_id}-${field}-${items.length}`,
        text: normalized,
        date: row.posted_at,
        sourceUrl: row.source_url ?? "#",
      });
      if (items.length === 5) return items;
    }
  }

  return items;
}

function buildTrend(rows: TimelineViewRow[]): TrendPoint[] {
  const grouped = new Map<string, TrendPoint>();

  for (const row of rows) {
    const date = row.posted_at.slice(0, 10);
    const current = grouped.get(date) ?? {
      date,
      positive: 0,
      negative: 0,
      other: 0,
    };
    const value = stance(row.stance);
    if (value === "bullish") current.positive += 1;
    else if (value === "bearish") current.negative += 1;
    else current.other += 1;
    grouped.set(date, current);
  }

  return [...grouped.values()]
    .sort((left, right) => left.date.localeCompare(right.date))
    .slice(-90);
}

function buildClaims(rows: TimelineViewRow[]): Claim[] {
  return rows
    .filter((row) => row.claim)
    .slice(0, 5)
    .map((row) => ({
      id: String(row.post_ticker_analysis_id),
      date: row.posted_at,
      stance: stance(row.stance),
      changeType: change(row.change_type),
      text: row.claim ?? "",
      sourceUrl: row.source_url ?? "#",
    }));
}

export function buildSupabaseTickerDetail(
  rawOverview: OverviewViewRow,
  timeline: TimelineViewRow[],
): TickerDetail {
  const overview = mapOverviewRow(rawOverview);
  const opinions = timeline.map(mapOpinion);
  const first = timeline[0];

  return {
    ...overview,
    threadCount: number(rawOverview.unique_threads),
    lastAnalysisAt: overview.lastMentionedAt,
    recentChange: {
      summary:
        first?.change_summary ??
        first?.claim ??
        "최근 유효한 변화가 기록되지 않았습니다.",
      confidence: number(first?.stance_confidence),
      currentSourceUrl: first?.source_url ?? "#",
      previousSourceUrl: timeline[1]?.source_url ?? null,
    },
    claims: buildClaims(timeline),
    risks: uniqueResearchItems(timeline, "risks_mentioned"),
    catalysts: uniqueResearchItems(timeline, "catalysts_mentioned"),
    trend: buildTrend(timeline),
    opinions,
    research: {
      priority: "medium",
      status: "unreviewed",
      note: "",
    },
  };
}

export async function getTickerDetail(
  ticker: string,
): Promise<TickerDetail | undefined> {
  const normalized = ticker.toUpperCase();
  if (!(await hasSupabaseConfig())) {
    return getFixtureTickerDetail(normalized);
  }

  const client = await supabaseClient();
  const [{ data: overviewData, error: overviewError }, timelineResult] =
    await Promise.all([
      client
        .from("ticker_overview")
        .select("*")
        .eq("ticker", normalized)
        .maybeSingle(),
      client
        .from("ticker_opinion_timeline")
        .select("*")
        .eq("ticker", normalized)
        .order("posted_at", { ascending: false })
        .limit(100),
    ]);

  if (overviewError) {
    throw new Error(`Ticker detail query failed: ${overviewError.message}`);
  }
  if (timelineResult.error) {
    throw new Error(`Ticker timeline query failed: ${timelineResult.error.message}`);
  }
  if (!overviewData) return undefined;

  const rawOverview = overviewData as OverviewViewRow;
  const timeline = (timelineResult.data ?? []) as TimelineViewRow[];
  return buildSupabaseTickerDetail(rawOverview, timeline);
}
