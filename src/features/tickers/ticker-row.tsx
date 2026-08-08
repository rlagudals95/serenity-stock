"use client";

import { ArrowLeftRight, CircleHelp, MessageSquarePlus, Sparkles, TriangleAlert } from "lucide-react";
import Link from "next/link";

import { StatusPill } from "@/components/ui/status-pill";

import { AnalystPresence } from "./analyst-presence";
import {
  changeLabels,
  cumulativeSentimentLabels,
  formatKstDate,
  stanceLabels,
} from "./format";
import { SentimentDistribution } from "./sentiment-distribution";
import { SignalPerformanceCompact } from "./signal-performance";
import type { ChangeType, TickerOverview } from "./types";
import { WatchlistButton } from "./watchlist-button";

const changeIcons = {
  first_mention: Sparkles,
  new_claim: MessageSquarePlus,
  new_risk: TriangleAlert,
  stance_change: ArrowLeftRight,
  unclear: CircleHelp,
} satisfies Partial<Record<Exclude<ChangeType, null | "repeat">, typeof Sparkles>>;

function sentimentTone(value: TickerOverview["cumulativeSentiment"]) {
  if (value === "positive") return "positive";
  if (value === "negative") return "negative";
  if (value === "mixed") return "mixed";
  return "neutral";
}

function stanceTone(value: TickerOverview["latestStance"]) {
  if (value === "bullish") return "positive";
  if (value === "bearish") return "negative";
  if (value === "mixed") return "mixed";
  return "neutral";
}

export function TickerRow({ row }: { row: TickerOverview }) {
  const href = `/tickers/${row.ticker}`;
  const analysts = row.analysts ?? [];
  const sourceCount = analysts.filter((analyst) => analyst.latestSourceUrl).length;
  const latestAnalyst = [...analysts].sort((left, right) =>
    right.lastMentionedAt.localeCompare(left.lastMentionedAt),
  )[0];
  const ChangeIcon = row.changeType
    ? changeIcons[row.changeType as keyof typeof changeIcons]
    : undefined;

  return (
    <tr className="ticker-row candidate-row">
      <td className="watchlist-column">
        <WatchlistButton initialActive={row.watchlisted} ticker={row.ticker} />
      </td>
      <th className="ticker-column" scope="row">
        <Link
          aria-label={`${row.ticker} ${row.companyName}`}
          className="ticker-link"
          href={href}
        >
          <span className="ticker-symbol">{row.ticker}</span>
          <span className="company-name">{row.companyName}</span>
        </Link>
      </th>
      <td className="interest-column" data-label="관심도">
        <div className="candidate-interest">
          <strong>7일 {row.mentions7d}회</strong>
          <span>총 {row.totalMentions}회</span>
          <SentimentDistribution compact row={row} />
        </div>
      </td>
      <td className="analyst-column" data-label="인플루언서 관점">
        <AnalystPresence
          analysts={analysts}
          compact
          maxVisible={2}
          ticker={row.ticker}
          variant="desktop"
        />
        <div className="candidate-sentiment">
          <StatusPill tone={sentimentTone(row.cumulativeSentiment)}>
            {cumulativeSentimentLabels[row.cumulativeSentiment]}
          </StatusPill>
          <StatusPill tone={stanceTone(row.latestStance)}>
            {stanceLabels[row.latestStance]}
          </StatusPill>
        </div>
      </td>
      <td className="change-column" data-label="최근 변화">
        <div className="candidate-change">
          {row.changeType ? (
            <span
              className={`change-label change-label--${row.changeType}`}
              title={`기준 게시글 ${formatKstDate(row.lastMentionedAt)}`}
            >
              {ChangeIcon ? <ChangeIcon aria-hidden="true" size={14} /> : null}
              {changeLabels[row.changeType]}
            </span>
          ) : (
            <span className="empty-value">뚜렷한 변화 없음</span>
          )}
          {latestAnalyst?.latestClaim ? (
            latestAnalyst.latestSourceUrl ? (
              <a
                className="candidate-change__claim"
                href={latestAnalyst.latestSourceUrl}
                rel="noopener noreferrer"
                target="_blank"
              >
                {latestAnalyst.latestClaim}
              </a>
            ) : (
              <span className="candidate-change__claim">
                {latestAnalyst.latestClaim}
              </span>
            )
          ) : (
            <span className="candidate-change__claim">최근 원문 요약 없음</span>
          )}
          <time dateTime={row.lastMentionedAt}>
            {formatKstDate(row.lastMentionedAt, false)}
          </time>
        </div>
      </td>
      <td className="evidence-column" data-label="의견 근거">
        <div className="candidate-evidence">
          <strong>{sourceCount > 0 ? "원문 확인 가능" : "확인할 원문 없음"}</strong>
          <span>원문 {sourceCount}개</span>
          <span>
            의견 참여 {row.signalPerformance?.directionalAnalystCount ?? 0}명
          </span>
        </div>
      </td>
      <td className="market-validation-column" data-label="의견 후 주가">
        <SignalPerformanceCompact performance={row.signalPerformance} />
      </td>
    </tr>
  );
}
