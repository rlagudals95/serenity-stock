import type { TickerOverview } from "./types";

export function SentimentDistribution({
  row,
  compact = false,
}: {
  row: TickerOverview;
  compact?: boolean;
}) {
  const counts = [
    ["positive", row.positiveCount],
    ["mixed", row.mixedCount],
    ["neutral", row.neutralCount + row.unknownCount],
    ["negative", row.negativeCount],
  ] as const;
  const total = counts.reduce((sum, [, count]) => sum + count, 0);
  const label = `긍정 ${row.positiveCount}건, 부정 ${row.negativeCount}건, 혼재 ${row.mixedCount}건, 중립 ${row.neutralCount}건, 판단 불가 ${row.unknownCount}건`;

  return (
    <div className={`sentiment-cell ${compact ? "is-compact" : ""}`}>
      <div className="sentiment-cell__counts">
        <span className="data-number sentiment-positive">
          +{row.positiveCount}
        </span>
        <span className="data-number sentiment-negative">
          -{row.negativeCount}
        </span>
      </div>
      {!compact ? (
        <div aria-label={label} className="sentiment-bar" role="img">
          {counts.map(([tone, count]) =>
            count > 0 ? (
              <span
                className={`sentiment-bar__segment sentiment-bar__segment--${tone}`}
                key={tone}
                style={{ width: `${(count / total) * 100}%` }}
              />
            ) : null,
          )}
        </div>
      ) : (
        <span aria-label={label} className="sr-only" role="img" />
      )}
    </div>
  );
}
