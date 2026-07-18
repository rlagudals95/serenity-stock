import type {
  CumulativeSentiment,
  ChangeType,
  Stance,
  TickerOverview,
  TickerQuery,
  TickerSort,
} from "./types";

const sentimentValues = new Set<CumulativeSentiment>([
  "positive",
  "negative",
  "mixed",
  "insufficient",
]);
const stanceValues = new Set<Stance>([
  "bullish",
  "bearish",
  "mixed",
  "neutral",
  "unknown",
]);
const changeValues = new Set<Exclude<ChangeType, null>>([
  "first_mention",
  "new_claim",
  "new_risk",
  "stance_change",
  "repeat",
  "unclear",
]);
const sortValues = new Set<TickerSort>([
  "totalMentions",
  "positiveCount",
  "negativeCount",
  "mentions7d",
  "mentions30d",
  "lastMentionedAt",
  "ticker",
]);

export const defaultTickerQuery: TickerQuery = {
  q: "",
  watchlist: false,
  sentiment: "all",
  stance: "all",
  change: "all",
  period: "all",
  sort: "totalMentions",
  order: "desc",
};

export function getCumulativeSentiment({
  positiveCount,
  negativeCount,
}: {
  positiveCount: number;
  negativeCount: number;
}): CumulativeSentiment {
  const directionalCount = positiveCount + negativeCount;

  if (directionalCount < 3) {
    return "insufficient";
  }

  const positiveShare = positiveCount / directionalCount;

  if (positiveShare >= 0.65) {
    return "positive";
  }

  if (positiveShare <= 0.35) {
    return "negative";
  }

  return "mixed";
}

function oneOf<T extends string>(
  value: string | null,
  values: Set<T>,
  fallback: T,
): T {
  return value && values.has(value as T) ? (value as T) : fallback;
}

export function parseTickerQuery(params: URLSearchParams): TickerQuery {
  const period = oneOf(
    params.get("period"),
    new Set<TickerQuery["period"]>(["24h", "7d", "30d", "all"]),
    "all",
  );
  const rawChange = params.get("change");
  const change =
    rawChange === "none" ||
    (rawChange && changeValues.has(rawChange as Exclude<ChangeType, null>))
      ? (rawChange as TickerQuery["change"])
      : "all";

  return {
    q: params.get("q")?.trim() ?? "",
    watchlist: params.get("watchlist") === "true",
    sentiment: oneOf(
      params.get("sentiment"),
      new Set([...sentimentValues, "all"] as const),
      "all",
    ),
    stance: oneOf(
      params.get("stance"),
      new Set([...stanceValues, "all"] as const),
      "all",
    ),
    change,
    period,
    sort: oneOf(params.get("sort"), sortValues, "totalMentions"),
    order: params.get("order") === "asc" ? "asc" : "desc",
  };
}

function matchesPeriod(
  row: TickerOverview,
  period: TickerQuery["period"],
  now: Date,
): boolean {
  if (period === "all") {
    return true;
  }

  const duration = period === "24h" ? 1 : period === "7d" ? 7 : 30;
  const cutoff = new Date(now);
  cutoff.setUTCDate(cutoff.getUTCDate() - duration);

  return new Date(row.lastMentionedAt) >= cutoff;
}

export function applyTickerQuery<T extends TickerOverview>(
  rows: readonly T[],
  input: Partial<TickerQuery>,
  now = new Date(),
): T[] {
  const query = { ...defaultTickerQuery, ...input };
  const term = query.q.trim().toLocaleLowerCase();
  const direction = query.order === "asc" ? 1 : -1;

  return rows
    .filter((row) => {
      const matchesSearch =
        term.length === 0 ||
        row.ticker.toLocaleLowerCase().startsWith(term) ||
        row.companyName.toLocaleLowerCase().includes(term);

      return (
        matchesSearch &&
        (!query.watchlist || row.watchlisted) &&
        (query.sentiment === "all" ||
          row.cumulativeSentiment === query.sentiment) &&
        (query.stance === "all" || row.latestStance === query.stance) &&
        (query.change === "all" ||
          (query.change === "none"
            ? row.changeType === null
            : row.changeType === query.change)) &&
        matchesPeriod(row, query.period, now)
      );
    })
    .sort((left, right) => {
      let comparison = 0;

      if (query.sort === "ticker") {
        comparison = left.ticker.localeCompare(right.ticker);
      } else if (query.sort === "lastMentionedAt") {
        comparison =
          new Date(left.lastMentionedAt).getTime() -
          new Date(right.lastMentionedAt).getTime();
      } else {
        comparison = left[query.sort] - right[query.sort];
      }

      return comparison === 0
        ? left.ticker.localeCompare(right.ticker)
        : comparison * direction;
    });
}
