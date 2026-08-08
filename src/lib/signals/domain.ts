export type DirectionalStance = "bullish" | "bearish";
export type OpinionStance =
  | DirectionalStance
  | "mixed"
  | "neutral"
  | "unknown";
export type ConsensusState =
  | "positive"
  | "negative"
  | "mixed"
  | "insufficient";
export type SignalDirection = "positive" | "negative";
export type SignalTransition = "entry" | "flip" | "exit" | "none";
export type OutcomeStatus =
  | "pending"
  | "evaluable"
  | "not_evaluable"
  | "data_missing";
export type OutcomeVerdict =
  | "aligned"
  | "opposed"
  | "flat"
  | "pending"
  | "not_evaluable"
  | "data_missing";

export interface ConsensusOpinion {
  analysisId: number;
  analystKey: string;
  stance: OpinionStance;
  stanceConfidence: number;
  reviewStatus: "auto" | "approved" | "needs_review" | "rejected";
  changeType: string | null;
  postedAt: string;
  sourceUrl: string;
}

export type ConsensusSnapshot = Map<string, ConsensusOpinion>;

export interface ConsensusOptions {
  minimumAnalysts?: number;
  threshold?: number;
  minimumConfidence?: number;
  ttlDays?: number;
  asOf?: string | Date;
}

export interface ConsensusResult {
  state: ConsensusState;
  bullishAnalysts: number;
  bearishAnalysts: number;
  directionalAnalysts: number;
  positiveShare: number;
  negativeShare: number;
  votes: ConsensusOpinion[];
}

export interface MarketSession {
  sessionDate: string;
  marketOpenAt: string;
  adjustedOpen: number;
  adjustedClose: number;
}

export interface ReplayConsensusOpinion extends ConsensusOpinion {
  ticker: string;
}

export interface ReplayedSignalEvent {
  ticker: string;
  signalAt: string;
  signalType: "entry" | "flip";
  direction: SignalDirection;
  previousState: ConsensusState;
  triggerAnalysisId: number;
  directionalAnalysts: number;
  bullishAnalysts: number;
  bearishAnalysts: number;
  positiveShare: number;
  negativeShare: number;
  analystSnapshot: Array<{
    analysisId: number;
    analystKey: string;
    stance: DirectionalStance;
    postedAt: string;
    sourceUrl: string;
  }>;
  endedAt: string | null;
  endedReason: "mixed" | "insufficient" | "flipped" | null;
}

const defaultConsensusOptions = {
  minimumAnalysts: 3,
  threshold: 2 / 3,
  minimumConfidence: 0.75,
  ttlDays: 90,
};

function isCountable(
  opinion: ConsensusOpinion,
  minimumConfidence: number,
) {
  return (
    opinion.reviewStatus === "approved" ||
    (opinion.reviewStatus === "auto" &&
      opinion.stanceConfidence >= minimumConfidence)
  );
}

function isDirectional(stance: OpinionStance): stance is DirectionalStance {
  return stance === "bullish" || stance === "bearish";
}

function isNewerOpinion(
  candidate: ConsensusOpinion,
  current: ConsensusOpinion,
) {
  const candidateTime = new Date(candidate.postedAt).getTime();
  const currentTime = new Date(current.postedAt).getTime();
  return (
    candidateTime > currentTime ||
    (candidateTime === currentTime && candidate.analysisId > current.analysisId)
  );
}

export function applyOpinionToSnapshot(
  snapshot: ConsensusSnapshot,
  opinion: ConsensusOpinion,
  minimumConfidence = defaultConsensusOptions.minimumConfidence,
) {
  const next = new Map(snapshot);
  if (!isCountable(opinion, minimumConfidence)) return next;

  if (isDirectional(opinion.stance)) {
    const current = next.get(opinion.analystKey);
    if (!current || isNewerOpinion(opinion, current)) {
      next.set(opinion.analystKey, opinion);
    }
    return next;
  }

  if (!isDirectional(opinion.stance) && opinion.changeType === "stance_change") {
    next.delete(opinion.analystKey);
  }

  return next;
}

export function calculateConsensus(
  opinions: Iterable<ConsensusOpinion>,
  options: ConsensusOptions = {},
): ConsensusResult {
  const settings = { ...defaultConsensusOptions, ...options };
  const asOf = settings.asOf ? new Date(settings.asOf).getTime() : null;
  const latestByAnalyst = new Map<string, ConsensusOpinion>();

  for (const opinion of opinions) {
    if (
      !isCountable(opinion, settings.minimumConfidence) ||
      !isDirectional(opinion.stance)
    ) {
      continue;
    }
    const postedAt = new Date(opinion.postedAt).getTime();
    if (!Number.isFinite(postedAt)) continue;
    if (asOf !== null) {
      const ageDays = (asOf - postedAt) / 86_400_000;
      if (ageDays < 0 || ageDays > settings.ttlDays) continue;
    }
    const current = latestByAnalyst.get(opinion.analystKey);
    if (!current || isNewerOpinion(opinion, current)) {
      latestByAnalyst.set(opinion.analystKey, opinion);
    }
  }

  const votes = [...latestByAnalyst.values()];
  const bullishAnalysts = votes.filter(
    (opinion) => opinion.stance === "bullish",
  ).length;
  const bearishAnalysts = votes.filter(
    (opinion) => opinion.stance === "bearish",
  ).length;
  const directionalAnalysts = bullishAnalysts + bearishAnalysts;
  const positiveShare = directionalAnalysts
    ? bullishAnalysts / directionalAnalysts
    : 0;
  const negativeShare = directionalAnalysts
    ? bearishAnalysts / directionalAnalysts
    : 0;

  let state: ConsensusState = "insufficient";
  if (directionalAnalysts >= settings.minimumAnalysts) {
    if (positiveShare >= settings.threshold) state = "positive";
    else if (negativeShare >= settings.threshold) state = "negative";
    else state = "mixed";
  }

  return {
    state,
    bullishAnalysts,
    bearishAnalysts,
    directionalAnalysts,
    positiveShare,
    negativeShare,
    votes,
  };
}

export function getSignalTransition(
  previous: ConsensusState,
  current: ConsensusState,
): SignalTransition {
  const previousDirectional = previous === "positive" || previous === "negative";
  const currentDirectional = current === "positive" || current === "negative";

  if (currentDirectional && current !== previous) {
    return previousDirectional ? "flip" : "entry";
  }
  if (previousDirectional && !currentDirectional) return "exit";
  return "none";
}

export function replayConsensusSignals(
  opinions: readonly ReplayConsensusOpinion[],
  options: ConsensusOptions = {},
) {
  const snapshots = new Map<string, ConsensusSnapshot>();
  const finalStates = new Map<string, ConsensusResult>();
  const activeEvents = new Map<string, ReplayedSignalEvent>();
  const events: ReplayedSignalEvent[] = [];
  const sortedOpinions = [...opinions].sort((left, right) => {
    const timeDifference =
      new Date(left.postedAt).getTime() - new Date(right.postedAt).getTime();
    return timeDifference || left.analysisId - right.analysisId;
  });

  for (const opinion of sortedOpinions) {
    const currentSnapshot = snapshots.get(opinion.ticker) ?? new Map();
    const previous =
      finalStates.get(opinion.ticker) ?? calculateConsensus([], options);
    const nextSnapshot = applyOpinionToSnapshot(
      currentSnapshot,
      opinion,
      options.minimumConfidence,
    );
    const next = calculateConsensus(nextSnapshot.values(), {
      ...options,
      asOf: opinion.postedAt,
    });
    const transition = getSignalTransition(previous.state, next.state);

    if (transition === "entry" || transition === "flip") {
      const active = activeEvents.get(opinion.ticker);
      if (active) {
        active.endedAt = opinion.postedAt;
        active.endedReason = "flipped";
      }
      const event: ReplayedSignalEvent = {
        ticker: opinion.ticker,
        signalAt: opinion.postedAt,
        signalType: transition,
        direction: next.state as SignalDirection,
        previousState: previous.state,
        triggerAnalysisId: opinion.analysisId,
        directionalAnalysts: next.directionalAnalysts,
        bullishAnalysts: next.bullishAnalysts,
        bearishAnalysts: next.bearishAnalysts,
        positiveShare: next.positiveShare,
        negativeShare: next.negativeShare,
        analystSnapshot: next.votes.map((vote) => ({
          analysisId: vote.analysisId,
          analystKey: vote.analystKey,
          stance: vote.stance as DirectionalStance,
          postedAt: vote.postedAt,
          sourceUrl: vote.sourceUrl,
        })),
        endedAt: null,
        endedReason: null,
      };
      events.push(event);
      activeEvents.set(opinion.ticker, event);
    } else if (transition === "exit") {
      const active = activeEvents.get(opinion.ticker);
      if (active) {
        active.endedAt = opinion.postedAt;
        active.endedReason = next.state as "mixed" | "insufficient";
        activeEvents.delete(opinion.ticker);
      }
    }

    snapshots.set(opinion.ticker, nextSnapshot);
    finalStates.set(opinion.ticker, next);
  }

  return { events, finalStates, snapshots };
}

export function findBaselineSession<T extends MarketSession>(
  sessions: readonly T[],
  signalAt: string | Date,
) {
  const signalTime = new Date(signalAt).getTime();
  if (!Number.isFinite(signalTime)) return null;

  return (
    [...sessions]
      .sort(
        (left, right) =>
          new Date(left.marketOpenAt).getTime() -
          new Date(right.marketOpenAt).getTime(),
      )
      .find(
        (session) => new Date(session.marketOpenAt).getTime() > signalTime,
      ) ?? null
  );
}

export function calculateSignalOutcome({
  direction,
  baselinePrice,
  targetPrice,
  matured,
  flatBand = 0.02,
}: {
  direction: SignalDirection;
  baselinePrice: number | null;
  targetPrice: number | null;
  matured: boolean;
  flatBand?: number;
}): {
  status: OutcomeStatus;
  verdict: OutcomeVerdict;
  rawReturn: number | null;
  signedReturn: number | null;
} {
  if (!matured) {
    return {
      status: "pending",
      verdict: "pending",
      rawReturn: null,
      signedReturn: null,
    };
  }
  if (
    baselinePrice === null ||
    targetPrice === null ||
    !Number.isFinite(baselinePrice) ||
    !Number.isFinite(targetPrice) ||
    baselinePrice <= 0 ||
    targetPrice <= 0
  ) {
    return {
      status: "data_missing",
      verdict: "data_missing",
      rawReturn: null,
      signedReturn: null,
    };
  }

  const rawReturn = Math.round((targetPrice / baselinePrice - 1) * 1e10) / 1e10;
  const signedReturn = direction === "positive" ? rawReturn : -rawReturn;
  const verdict: OutcomeVerdict =
    signedReturn >= flatBand
      ? "aligned"
      : signedReturn <= -flatBand
        ? "opposed"
        : "flat";

  return {
    status: "evaluable",
    verdict,
    rawReturn,
    signedReturn,
  };
}
