import { getCumulativeSentiment } from "./query";
import {
  getFixtureTickerDetail,
  tickerOverviewFixtures,
} from "./fixtures";
import type {
  AnalystComparison,
  AnalystProfile,
  AnalystSnapshot,
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
import { analystProfiles as analystProfileFixtures } from "./analysts";

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
  analyst_change_type?: string | null;
  analyst_key?: string | null;
  analyst_name?: string | null;
  x_username?: string | null;
}

export interface AnalystSummaryViewRow {
  ticker: string;
  analyst_key: string;
  analyst_name: string;
  x_username: string;
  total_mentions: DatabaseNumber;
  positive_count: DatabaseNumber;
  negative_count: DatabaseNumber;
  neutral_count: DatabaseNumber;
  mixed_count: DatabaseNumber;
  unknown_count: DatabaseNumber;
  latest_stance: string | null;
  latest_claim: string | null;
  latest_change_type: string | null;
  first_mentioned_at: string | null;
  last_mentioned_at: string | null;
  latest_source_url: string | null;
}

interface AnalystProfileRow {
  analyst_key: string;
  display_name: string;
  x_username: string;
  follower_label: string | null;
  description_ko: string;
  focus_areas: string[] | null;
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

export function mapOverviewRow(
  row: OverviewViewRow,
  analysts: AnalystSnapshot[] = [],
): TickerOverview {
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
    analysts,
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
  const [overviewResult, analystResult] = await Promise.all([
    client
      .from("ticker_overview")
      .select("*")
      .order("total_mentions", { ascending: false }),
    client
      .from("ticker_analyst_summary")
      .select("*")
      .order("last_mentioned_at", { ascending: false }),
  ]);

  if (overviewResult.error) {
    throw new Error(`Ticker overview query failed: ${overviewResult.error.message}`);
  }
  if (analystResult.error) {
    throw new Error(`Analyst summary query failed: ${analystResult.error.message}`);
  }

  const analystsByTicker = groupAnalysts(
    (analystResult.data ?? []) as AnalystSummaryViewRow[],
  );
  return ((overviewResult.data ?? []) as OverviewViewRow[]).map((row) =>
    mapOverviewRow(row, analystsByTicker.get(row.ticker) ?? []),
  );
}

export async function getAnalystProfiles(): Promise<AnalystProfile[]> {
  if (!(await hasSupabaseConfig())) {
    return analystProfileFixtures;
  }

  const client = await supabaseClient();
  const { data, error } = await client
    .from("analyst_profiles")
    .select(
      "analyst_key,display_name,x_username,follower_label,description_ko,focus_areas",
    )
    .eq("active", true)
    .order("sort_order");
  if (error) {
    throw new Error(`Analyst profile query failed: ${error.message}`);
  }

  return ((data ?? []) as AnalystProfileRow[]).map((row) => ({
    key: row.analyst_key,
    name: row.display_name,
    username: row.x_username,
    followerLabel: row.follower_label ?? "공개 X 계정",
    description: row.description_ko,
    focusAreas: row.focus_areas ?? [],
  }));
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
    changeType: change(row.analyst_change_type ?? row.change_type),
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
    analyst: analystIdentity(row),
  };
}

function analystIdentity(row: TimelineViewRow) {
  const username = row.x_username ?? "unknown";
  return {
    key: row.analyst_key ?? username.toLocaleLowerCase(),
    name: row.analyst_name ?? `@${username}`,
    username,
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
        analyst: analystIdentity(row),
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
      changeType: change(row.analyst_change_type ?? row.change_type),
      text: row.claim ?? "",
      sourceUrl: row.source_url ?? "#",
      analyst: analystIdentity(row),
    }));
}

function mapAnalystSummaryRow(
  row: AnalystSummaryViewRow,
): AnalystSnapshot {
  const positiveCount = number(row.positive_count);
  const negativeCount = number(row.negative_count);

  return {
    key: row.analyst_key,
    name: row.analyst_name,
    username: row.x_username,
    totalMentions: number(row.total_mentions),
    positiveCount,
    negativeCount,
    neutralCount: number(row.neutral_count),
    mixedCount: number(row.mixed_count),
    unknownCount: number(row.unknown_count),
    cumulativeSentiment: getCumulativeSentiment({
      positiveCount,
      negativeCount,
    }),
    latestStance: stance(row.latest_stance),
    latestClaim: row.latest_claim,
    latestChangeType: change(row.latest_change_type),
    firstMentionedAt:
      row.first_mentioned_at ?? "1970-01-01T00:00:00.000Z",
    lastMentionedAt:
      row.last_mentioned_at ?? "1970-01-01T00:00:00.000Z",
    latestSourceUrl: row.latest_source_url,
  };
}

function groupAnalysts(rows: AnalystSummaryViewRow[]) {
  const grouped = new Map<string, AnalystSnapshot[]>();
  for (const row of rows) {
    const current = grouped.get(row.ticker) ?? [];
    current.push(mapAnalystSummaryRow(row));
    grouped.set(row.ticker, current);
  }
  return grouped;
}

function compareAnalysts(analysts: AnalystSnapshot[]): AnalystComparison {
  if (analysts.length < 2) return "single_source";

  const directional = analysts
    .map((analyst) => analyst.latestStance)
    .filter((value) => value === "bullish" || value === "bearish");
  if (new Set(directional).size > 1) return "disagreement";
  if (
    analysts.every(
      (analyst) => analyst.latestStance === analysts[0]?.latestStance,
    )
  ) {
    return "agreement";
  }
  return "mixed";
}

export function buildSupabaseTickerDetail(
  rawOverview: OverviewViewRow,
  timeline: TimelineViewRow[],
  analystRows: AnalystSummaryViewRow[] = [],
): TickerDetail {
  const analysts = analystRows.map(mapAnalystSummaryRow);
  const overview = mapOverviewRow(rawOverview, analysts);
  const opinions = timeline.map(mapOpinion);
  const first = timeline[0];

  return {
    ...overview,
    analysts,
    threadCount: number(rawOverview.unique_threads),
    lastAnalysisAt: overview.lastMentionedAt,
    analystComparison: compareAnalysts(analysts),
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
  const [
    { data: overviewData, error: overviewError },
    timelineResult,
    analystResult,
  ] =
    await Promise.all([
      client
        .from("ticker_overview")
        .select("*")
        .eq("ticker", normalized)
        .maybeSingle(),
      client
        .from("ticker_opinion_timeline_v2")
        .select("*")
        .eq("ticker", normalized)
        .order("posted_at", { ascending: false })
        .limit(100),
      client
        .from("ticker_analyst_summary")
        .select("*")
        .eq("ticker", normalized)
        .order("last_mentioned_at", { ascending: false }),
    ]);

  if (overviewError) {
    throw new Error(`Ticker detail query failed: ${overviewError.message}`);
  }
  if (timelineResult.error) {
    throw new Error(`Ticker timeline query failed: ${timelineResult.error.message}`);
  }
  if (analystResult.error) {
    throw new Error(`Ticker analyst query failed: ${analystResult.error.message}`);
  }
  if (!overviewData) return undefined;

  const rawOverview = overviewData as OverviewViewRow;
  const timeline = (timelineResult.data ?? []) as TimelineViewRow[];
  const analysts = (analystResult.data ?? []) as AnalystSummaryViewRow[];
  return buildSupabaseTickerDetail(rawOverview, timeline, analysts);
}
