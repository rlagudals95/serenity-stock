import type {
  CumulativeSentiment,
  ChangeType,
  Stance,
  TickerOverview,
  TickerQuery,
  TickerSort,
  TickerView,
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
const viewValues = new Set<TickerView>([
  "verified",
  "momentum",
  "changes",
  "all",
]);

export const defaultTickerQuery: TickerQuery = {
  q: "",
  watchlist: false,
  view: "verified",
  sentiment: "all",
  stance: "all",
  change: "all",
  period: "all",
  sort: "totalMentions",
  order: "desc",
  page: 1,
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

  if (positiveShare >= 2 / 3) {
    return "positive";
  }

  if (positiveShare <= 1 / 3) {
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
    view: oneOf(params.get("view"), viewValues, "verified"),
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
    page: Math.max(1, Number.parseInt(params.get("page") ?? "1", 10) || 1),
  };
}

const unresolvedIdentityPatterns = [
  "not a publicly traded",
  "not publicly traded",
  "ticker error",
  "no official company name",
];

export function hasPublicTickerIdentity(row: TickerOverview) {
  const name = row.companyName.toLocaleLowerCase();
  return (
    /^[A-Z][A-Z0-9.-]{0,9}$/.test(row.ticker) &&
    !unresolvedIdentityPatterns.some((pattern) => name.includes(pattern))
  );
}

function matchesView(row: TickerOverview, view: TickerView) {
  if (view === "all") return true;
  if (view === "changes") {
    return row.changeType === "new_risk" || row.changeType === "stance_change";
  }
  if (view === "momentum") {
    const analystCount = row.analysts?.length ?? 0;
    const directionalCount = row.positiveCount + row.negativeCount;
    return (
      Math.max(analystCount, directionalCount) >= 2 &&
      row.mentions7d > row.mentions30d / 4
    );
  }
  return row.cumulativeSentiment === "positive";
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

function compareVerifiedProof(left: TickerOverview, right: TickerOverview) {
  const leftVerified = (left.proofMetrics?.sampleSize ?? 0) >= 10;
  const rightVerified = (right.proofMetrics?.sampleSize ?? 0) >= 10;
  if (leftVerified !== rightVerified) return leftVerified ? -1 : 1;

  if (leftVerified && rightVerified) {
    const scoreDifference =
      (right.proofMetrics?.wilsonScore ?? -1) -
      (left.proofMetrics?.wilsonScore ?? -1);
    if (scoreDifference !== 0) return scoreDifference;
  }

  const analystDifference =
    (right.proofMetrics?.currentBullishAnalystCount ?? 0) -
    (left.proofMetrics?.currentBullishAnalystCount ?? 0);
  if (analystDifference !== 0) return analystDifference;

  const recencyDifference =
    new Date(right.lastMentionedAt).getTime() -
    new Date(left.lastMentionedAt).getTime();
  return recencyDifference || left.ticker.localeCompare(right.ticker);
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
        hasPublicTickerIdentity(row) &&
        matchesView(row, query.view) &&
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
      if (
        query.view === "verified" &&
        query.sort === "totalMentions" &&
        query.order === "desc"
      ) {
        return compareVerifiedProof(left, right);
      }

      let comparison = 0;

      if (query.view === "changes" && query.sort === "totalMentions") {
        comparison =
          new Date(left.lastMentionedAt).getTime() -
          new Date(right.lastMentionedAt).getTime();
      } else if (query.view === "momentum" && query.sort === "totalMentions") {
        comparison =
          left.mentions7d - left.mentions30d / 4 -
          (right.mentions7d - right.mentions30d / 4);
      } else if (query.sort === "ticker") {
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

export function paginateTickerRows<T>(
  rows: readonly T[],
  requestedPage: number,
  pageSize: number,
) {
  const total = rows.length;
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const page = Math.min(Math.max(1, requestedPage), pageCount);
  const start = (page - 1) * pageSize;

  return {
    rows: rows.slice(start, start + pageSize),
    page,
    pageCount,
    pageSize,
    total,
  };
}
