export type CumulativeSentiment =
  | "positive"
  | "negative"
  | "mixed"
  | "insufficient";

export type Stance = "bullish" | "bearish" | "mixed" | "neutral" | "unknown";

export type ChangeType =
  | "first_mention"
  | "new_claim"
  | "new_risk"
  | "stance_change"
  | "repeat"
  | "unclear"
  | null;

export type TickerSort =
  | "totalMentions"
  | "positiveCount"
  | "negativeCount"
  | "mentions7d"
  | "mentions30d"
  | "lastMentionedAt"
  | "ticker";

export interface TickerOverview {
  ticker: string;
  companyName: string;
  totalMentions: number;
  positiveCount: number;
  negativeCount: number;
  neutralCount: number;
  mixedCount: number;
  unknownCount: number;
  cumulativeSentiment: CumulativeSentiment;
  latestStance: Stance;
  changeType: ChangeType;
  mentions7d: number;
  mentions30d: number;
  lastMentionedAt: string;
  watchlisted: boolean;
  reviewCount: number;
}

export interface TickerQuery {
  q: string;
  watchlist: boolean;
  sentiment: CumulativeSentiment | "all";
  stance: Stance | "all";
  change: Exclude<ChangeType, null> | "none" | "all";
  period: "24h" | "7d" | "30d" | "all";
  sort: TickerSort;
  order: "asc" | "desc";
}

export interface Claim {
  id: string;
  date: string;
  stance: Stance;
  changeType: ChangeType;
  text: string;
  sourceUrl: string;
  repeatCount?: number;
}

export interface ResearchItem {
  id: string;
  text: string;
  date: string;
  sourceUrl: string;
}

export interface TrendPoint {
  date: string;
  positive: number;
  negative: number;
  other: number;
}

export interface Opinion {
  id: string;
  postedAt: string;
  stance: Stance;
  changeType: ChangeType;
  claimType: "thesis" | "risk" | "catalyst" | "valuation" | "other";
  novelty: "new" | "repeat" | "unclear";
  conviction: "high" | "medium" | "low";
  claim: string;
  evidence: string;
  fullText: string;
  sourceUrl: string | null;
  confidence: number;
  reviewStatus: "auto" | "approved" | "needs_review";
}

export interface TickerDetail extends TickerOverview {
  threadCount: number;
  lastAnalysisAt: string;
  recentChange: {
    summary: string;
    confidence: number;
    currentSourceUrl: string;
    previousSourceUrl: string | null;
  };
  claims: Claim[];
  risks: ResearchItem[];
  catalysts: ResearchItem[];
  trend: TrendPoint[];
  opinions: Opinion[];
  research: {
    priority: "low" | "medium" | "high";
    status: "unreviewed" | "researching" | "complete" | "paused";
    note: string;
  };
}
