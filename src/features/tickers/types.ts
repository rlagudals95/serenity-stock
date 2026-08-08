export type CumulativeSentiment =
  | "positive"
  | "negative"
  | "mixed"
  | "insufficient";

export type Stance = "bullish" | "bearish" | "mixed" | "neutral" | "unknown";

export type AnalystKey = "serenity" | "shay_boloor" | (string & {});

export type SourceRole = "opinion" | "context" | "news" | "risk";

export type AnalystComparison =
  | "agreement"
  | "disagreement"
  | "mixed"
  | "single_source";

export interface AnalystProfile {
  key: AnalystKey;
  name: string;
  username: string;
  followerLabel: string;
  description: string;
  focusAreas: string[];
  sourceRole: SourceRole;
  consensusEligible: boolean;
}

export interface AnalystSnapshot {
  key: AnalystKey;
  name: string;
  username: string;
  totalMentions: number;
  positiveCount: number;
  negativeCount: number;
  neutralCount: number;
  mixedCount: number;
  unknownCount: number;
  cumulativeSentiment: CumulativeSentiment;
  latestStance: Stance;
  latestClaim: string | null;
  latestChangeType: ChangeType;
  firstMentionedAt: string;
  lastMentionedAt: string;
  latestSourceUrl: string | null;
}

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

export type TickerView = "verified" | "momentum" | "changes" | "all";

export interface MarketQuote {
  price: number;
  change: number;
  changePercent: number;
  previousClose: number;
  asOf: string;
  currency: "USD";
  provider: "finnhub" | "nasdaq" | "fixture";
}

export type ConsensusSignalDirection = "positive" | "negative";

export type SignalOutcomeStatus =
  | "pending"
  | "evaluable"
  | "not_evaluable"
  | "data_missing";

export type SignalOutcomeVerdict =
  | "aligned"
  | "opposed"
  | "flat"
  | "pending"
  | "not_evaluable"
  | "data_missing";

export interface PriceTrendPoint {
  date: string;
  close: number;
}

export interface TickerSignalPerformance {
  direction: ConsensusSignalDirection;
  signalAt: string;
  directionalAnalystCount: number;
  bullishAnalystCount: number;
  bearishAnalystCount: number;
  entrySessionDate: string | null;
  entryAdjustedOpen: number | null;
  latestPriceDate: string | null;
  latestAdjustedClose: number | null;
  rawReturnToDate: number | null;
  outcome20dStatus: SignalOutcomeStatus | null;
  outcome20dRawReturn: number | null;
  outcome20dVerdict: SignalOutcomeVerdict | null;
  calculationVersion: string;
  priceProvider: string | null;
  priceTrend: readonly PriceTrendPoint[];
}

export interface TickerProofMetrics {
  currentBullishAnalystCount: number;
  hitCount: number;
  sampleSize: number;
  hitRate: number | null;
  wilsonScore: number | null;
}

export interface TickerProofCase {
  ticker: string;
  companyName: string;
  analystName: string | null;
  signalAt: string;
  resultAt: string | null;
  returnValue: number;
  sourceUrl: string | null;
  state: "completed" | "tracking";
}

export interface TickerProofOverview {
  state: "completed" | "tracking" | "empty";
  completedCount: number;
  hitCount: number;
  missCount: number;
  latestResultAt: string | null;
  cases: TickerProofCase[];
}

export interface TickerOverview {
  ticker: string;
  companyName: string;
  marketQuote?: MarketQuote | null;
  signalPerformance?: TickerSignalPerformance | null;
  proofMetrics?: TickerProofMetrics | null;
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
  analysts?: AnalystSnapshot[];
}

export interface TickerQuery {
  q: string;
  watchlist: boolean;
  view: TickerView;
  sentiment: CumulativeSentiment | "all";
  stance: Stance | "all";
  change: Exclude<ChangeType, null> | "none" | "all";
  period: "24h" | "7d" | "30d" | "all";
  sort: TickerSort;
  order: "asc" | "desc";
  page: number;
}

export interface Claim {
  id: string;
  date: string;
  stance: Stance;
  changeType: ChangeType;
  text: string;
  sourceUrl: string;
  repeatCount?: number;
  analyst: Pick<AnalystSnapshot, "key" | "name" | "username">;
}

export interface ResearchItem {
  id: string;
  text: string;
  date: string;
  sourceUrl: string;
  analyst: Pick<AnalystSnapshot, "key" | "name" | "username">;
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
  analyst: Pick<AnalystSnapshot, "key" | "name" | "username">;
}

export interface TickerDetail extends TickerOverview {
  analysts: AnalystSnapshot[];
  threadCount: number;
  lastAnalysisAt: string;
  analystComparison: AnalystComparison;
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
