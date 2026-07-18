import { formatRelativeTime } from "../format";
import type { TickerDetail } from "../types";

export function MetricsStrip({ ticker }: { ticker: TickerDetail }) {
  const metrics = [
    ["총 언급", ticker.totalMentions],
    ["긍정", ticker.positiveCount],
    ["부정", ticker.negativeCount],
    ["중립/혼재", ticker.neutralCount + ticker.mixedCount],
    ["7D", ticker.mentions7d],
    ["30D", ticker.mentions30d],
    ["고유 스레드", ticker.threadCount],
    ["최근 언급", formatRelativeTime(ticker.lastMentionedAt)],
  ] as const;

  return (
    <dl className="metrics-strip">
      {metrics.map(([label, value]) => (
        <div className="metric" key={label}>
          <dt>{label}</dt>
          <dd className={typeof value === "number" ? "data-number" : undefined}>
            {value}
          </dd>
        </div>
      ))}
    </dl>
  );
}
