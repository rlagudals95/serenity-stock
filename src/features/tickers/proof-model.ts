import type {
  TickerOverview,
  TickerProofCase,
  TickerProofMetrics,
  TickerProofOverview,
} from "./types";

export const MINIMUM_PROOF_SAMPLE = 10;

export type ProofDisplay =
  | {
      state: "verified";
      label: string;
      detail: string;
      rate: number;
    }
  | {
      state: "building" | "empty";
      label: string;
      detail: string;
      rate: null;
    };

export function proofDisplay(
  metrics?: Pick<TickerProofMetrics, "hitCount" | "sampleSize"> | null,
): ProofDisplay {
  const sampleSize = metrics?.sampleSize ?? 0;
  const hitCount = Math.min(metrics?.hitCount ?? 0, sampleSize);

  if (sampleSize >= MINIMUM_PROOF_SAMPLE) {
    const rate = hitCount / sampleSize;
    return {
      state: "verified",
      label: `${Math.round(rate * 100)}%`,
      detail: `판정 완료 ${sampleSize}건`,
      rate,
    };
  }

  if (sampleSize > 0) {
    return {
      state: "building",
      label: "검증 중",
      detail: `판정 완료 ${sampleSize}건`,
      rate: null,
    };
  }

  return {
    state: "empty",
    label: "검증 중",
    detail: "완료된 판정 없음",
    rate: null,
  };
}

function latestSource(row: TickerOverview) {
  return [...(row.analysts ?? [])]
    .filter((analyst) => analyst.latestSourceUrl)
    .sort((left, right) =>
      right.lastMentionedAt.localeCompare(left.lastMentionedAt),
    )[0]?.latestSourceUrl ?? null;
}

function analystName(row: TickerOverview) {
  const bullish = (row.analysts ?? []).filter(
    (analyst) => analyst.latestStance === "bullish",
  );
  if (bullish.length === 0) return null;
  if (bullish.length === 1) return bullish[0].name;
  return `${bullish[0].name} 외 ${bullish.length - 1}명`;
}

function sortCases(cases: TickerProofCase[]) {
  return cases.sort((left, right) => {
    const resultOrder = (right.resultAt ?? right.signalAt).localeCompare(
      left.resultAt ?? left.signalAt,
    );
    return resultOrder || left.ticker.localeCompare(right.ticker);
  });
}

export function buildProofOverview(
  rows: readonly TickerOverview[],
): TickerProofOverview {
  const evaluable = rows.filter(
    (row) =>
      row.signalPerformance?.direction === "positive" &&
      row.signalPerformance.outcome20dStatus === "evaluable" &&
      row.signalPerformance.outcome20dRawReturn !== null,
  );
  const completedCases = sortCases(
    evaluable
      .filter(
        (row) => (row.signalPerformance?.outcome20dRawReturn ?? 0) > 0,
      )
      .map((row) => ({
        ticker: row.ticker,
        companyName: row.companyName,
        analystName: analystName(row),
        signalAt: row.signalPerformance!.signalAt,
        resultAt: row.signalPerformance!.latestPriceDate,
        returnValue: row.signalPerformance!.outcome20dRawReturn!,
        sourceUrl: latestSource(row),
        state: "completed" as const,
      })),
  ).slice(0, 3);

  if (evaluable.length > 0) {
    const hitCount = evaluable.filter(
      (row) => (row.signalPerformance?.outcome20dRawReturn ?? 0) > 0,
    ).length;
    return {
      state: completedCases.length > 0 ? "completed" : "empty",
      completedCount: evaluable.length,
      hitCount,
      missCount: evaluable.length - hitCount,
      latestResultAt:
        evaluable
          .map((row) => row.signalPerformance?.latestPriceDate)
          .filter((value): value is string => Boolean(value))
          .sort((left, right) => right.localeCompare(left))[0] ?? null,
      cases: completedCases,
    };
  }

  const trackingCases = sortCases(
    rows
      .filter(
        (row) =>
          row.signalPerformance?.direction === "positive" &&
          (row.signalPerformance.rawReturnToDate ?? 0) > 0,
      )
      .map((row) => ({
        ticker: row.ticker,
        companyName: row.companyName,
        analystName: analystName(row),
        signalAt: row.signalPerformance!.signalAt,
        resultAt: row.signalPerformance!.latestPriceDate,
        returnValue: row.signalPerformance!.rawReturnToDate!,
        sourceUrl: latestSource(row),
        state: "tracking" as const,
      })),
  ).slice(0, 3);

  return {
    state: trackingCases.length > 0 ? "tracking" : "empty",
    completedCount: 0,
    hitCount: 0,
    missCount: 0,
    latestResultAt: null,
    cases: trackingCases,
  };
}
