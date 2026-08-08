import {
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  CheckCircle2,
  CircleDashed,
  Clock3,
  MinusCircle,
  XCircle,
} from "lucide-react";
import type { CSSProperties } from "react";

import { StatusPill } from "@/components/ui/status-pill";

import type {
  SignalOutcomeVerdict,
  TickerSignalPerformance,
} from "./types";

function formatPercent(value: number) {
  const sign = value > 0 ? "+" : "";
  return `${sign}${(value * 100).toFixed(1)}%`;
}

function formatPrice(value: number) {
  return `$${value.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function directionLabel(performance: TickerSignalPerformance) {
  return performance.direction === "positive" ? "긍정 신호" : "부정 신호";
}

function supportLabel(performance: TickerSignalPerformance) {
  const alignedCount =
    performance.direction === "positive"
      ? performance.bullishAnalystCount
      : performance.bearishAnalystCount;
  const direction = performance.direction === "positive" ? "긍정" : "부정";
  return `${performance.directionalAnalystCount}명 중 ${alignedCount}명 ${direction}`;
}

const outcomeLabels: Record<SignalOutcomeVerdict, string> = {
  aligned: "방향 일치",
  opposed: "방향 불일치",
  flat: "큰 변화 없음",
  pending: "평가 중",
  not_evaluable: "평가 제외",
  data_missing: "가격 확인 필요",
};

function OutcomeIcon({ verdict }: { verdict: SignalOutcomeVerdict }) {
  if (verdict === "aligned") return <CheckCircle2 aria-hidden="true" size={15} />;
  if (verdict === "opposed") return <XCircle aria-hidden="true" size={15} />;
  if (verdict === "flat") return <MinusCircle aria-hidden="true" size={15} />;
  if (verdict === "pending") return <Clock3 aria-hidden="true" size={15} />;
  return <CircleDashed aria-hidden="true" size={15} />;
}

export function PriceTrendCell({
  performance,
}: {
  performance?: TickerSignalPerformance | null;
}) {
  const points = performance?.priceTrend ?? [];
  const first = points[0];
  const latest = points.at(-1);

  if (!first || !latest || first.close <= 0) {
    return (
      <div className="price-trend-cell price-trend-cell--empty">
        <strong>가격 추세 없음</strong>
        <span>일봉 적재 전</span>
      </div>
    );
  }

  const values = points.map((point) => point.close);
  const minimum = Math.min(...values);
  const maximum = Math.max(...values);
  const range = maximum - minimum;
  const change = latest.close / first.close - 1;
  const ariaLabel = `최근 20거래일 가격 추세, ${first.date} ${formatPrice(first.close)}에서 ${latest.date} ${formatPrice(latest.close)}, ${formatPercent(change)}`;

  return (
    <div className="price-trend-cell">
      <div
        aria-label={ariaLabel}
        className={`price-trend-bars price-trend-bars--${change >= 0 ? "up" : "down"}`}
        role="img"
      >
        {points.map((point) => {
          const level = range === 0 ? 50 : 12 + ((point.close - minimum) / range) * 88;
          return (
            <i
              aria-hidden="true"
              key={point.date}
              style={{ "--trend-level": `${level}%` } as CSSProperties}
            />
          );
        })}
      </div>
      <div className="price-trend-cell__value">
        <strong>{formatPrice(latest.close)}</strong>
        <span className={change >= 0 ? "is-positive" : "is-negative"}>
          20D {formatPercent(change)}
        </span>
      </div>
      <time dateTime={latest.date}>{formatDate(latest.date)} 종가</time>
    </div>
  );
}

export function SignalSummaryCell({
  performance,
}: {
  performance?: TickerSignalPerformance | null;
}) {
  if (!performance) {
    return (
      <div className="signal-summary signal-summary--empty">
        <strong>활성 신호 없음</strong>
        <span>2/3 합의 전</span>
      </div>
    );
  }

  return (
    <div className="signal-summary">
      <StatusPill
        tone={performance.direction === "positive" ? "positive" : "negative"}
      >
        {directionLabel(performance)}
      </StatusPill>
      <span>{supportLabel(performance)}</span>
    </div>
  );
}

export function SignalReturnCell({
  performance,
}: {
  performance?: TickerSignalPerformance | null;
}) {
  if (!performance) {
    return (
      <div className="signal-return signal-return--empty">
        <strong>성과 계산 전</strong>
        <span>활성 신호 필요</span>
      </div>
    );
  }

  if (
    performance.rawReturnToDate === null ||
    !performance.entrySessionDate ||
    !performance.latestPriceDate
  ) {
    return (
      <div className="signal-return signal-return--empty">
        <strong>가격 적재 중</strong>
        <span>기준 거래일 확인 필요</span>
      </div>
    );
  }

  const tone =
    performance.rawReturnToDate > 0
      ? "positive"
      : performance.rawReturnToDate < 0
        ? "negative"
        : "flat";

  return (
    <div className={`signal-return signal-return--${tone}`}>
      <strong>{formatPercent(performance.rawReturnToDate)}</strong>
      <span>
        {formatDate(performance.entrySessionDate)} →{" "}
        {formatDate(performance.latestPriceDate)}
      </span>
    </div>
  );
}

export function SignalOutcomeCell({
  performance,
}: {
  performance?: TickerSignalPerformance | null;
}) {
  if (!performance) {
    return (
      <div className="signal-outcome signal-outcome--empty">
        <CircleDashed aria-hidden="true" size={15} />
        <span>평가 대상 없음</span>
      </div>
    );
  }

  const verdict = performance.outcome20dVerdict ?? "pending";
  const detail =
    performance.outcome20dStatus === "evaluable" &&
    performance.outcome20dRawReturn !== null
      ? formatPercent(performance.outcome20dRawReturn)
      : verdict === "pending"
        ? "20거래일 후 판정"
        : "데이터 확인 필요";

  return (
    <div className={`signal-outcome signal-outcome--${verdict}`}>
      <span className="signal-outcome__label">
        <OutcomeIcon verdict={verdict} />
        {outcomeLabels[verdict]}
      </span>
      <span>{detail}</span>
    </div>
  );
}

export function SignalPerformanceCompact({
  performance,
}: {
  performance?: TickerSignalPerformance | null;
}) {
  if (!performance) {
    return (
      <span className="signal-performance-compact__empty">
        비교할 합의 없음
      </span>
    );
  }

  return (
    <div className="signal-performance-compact">
      <SignalSummaryCell performance={performance} />
      <SignalReturnCell performance={performance} />
      <SignalOutcomeCell performance={performance} />
    </div>
  );
}

export function SignalPerformanceHero({
  performance,
}: {
  performance?: TickerSignalPerformance | null;
}) {
  if (!performance) {
    return (
      <section className="signal-hero signal-hero--empty">
        <div>
          <span className="signal-hero__label">현재 종합 신호</span>
          <strong>활성 신호 없음</strong>
        </div>
        <p>최소 2명의 방향성 의견과 2/3 합의가 필요합니다.</p>
      </section>
    );
  }

  const hasPricePath =
    performance.entryAdjustedOpen !== null &&
    performance.latestAdjustedClose !== null &&
    performance.rawReturnToDate !== null;
  const verdict = performance.outcome20dVerdict ?? "pending";
  const returnTone =
    (performance.rawReturnToDate ?? 0) > 0
      ? "positive"
      : (performance.rawReturnToDate ?? 0) < 0
        ? "negative"
        : "flat";

  return (
    <section className="signal-hero" aria-label="현재 종합 신호와 시장 반응">
      <div className="signal-hero__signal">
        <span className="signal-hero__label">현재 종합 신호</span>
        <StatusPill
          tone={performance.direction === "positive" ? "positive" : "negative"}
        >
          {directionLabel(performance)}
        </StatusPill>
        <p>
          <time dateTime={performance.signalAt}>{formatDate(performance.signalAt)}</time>
          {" 형성 · "}
          {supportLabel(performance)}
        </p>
      </div>

      <ArrowRight aria-hidden="true" className="signal-hero__arrow" size={18} />

      <div className="signal-hero__market">
        <span className="signal-hero__label">신호 이후 시장 반응</span>
        {hasPricePath ? (
          <>
            <div className="signal-hero__price-path">
              <span>기준가 {formatPrice(performance.entryAdjustedOpen!)}</span>
              <ArrowRight aria-hidden="true" size={14} />
              <span>최근 종가 {formatPrice(performance.latestAdjustedClose!)}</span>
            </div>
            <strong className={`signal-hero__return signal-hero__return--${returnTone}`}>
              {returnTone === "positive" ? (
                <ArrowUpRight aria-hidden="true" size={17} />
              ) : returnTone === "negative" ? (
                <ArrowDownRight aria-hidden="true" size={17} />
              ) : null}
              {formatPercent(performance.rawReturnToDate!)}
            </strong>
          </>
        ) : (
          <strong className="signal-hero__pending">기준 가격 적재 중</strong>
        )}
      </div>

      <div className={`signal-hero__outcome signal-hero__outcome--${verdict}`}>
        <span className="signal-hero__label">1개월 결과</span>
        <strong>
          <OutcomeIcon verdict={verdict} />
          {outcomeLabels[verdict]}
        </strong>
        <p>
          {performance.latestPriceDate
            ? `가격 기준 ${formatDate(performance.latestPriceDate)}`
            : "20거래일 평가 대기"}
        </p>
      </div>
    </section>
  );
}
