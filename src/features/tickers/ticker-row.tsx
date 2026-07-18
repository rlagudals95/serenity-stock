"use client";

import {
  ArrowLeftRight,
  CircleHelp,
  MessageSquarePlus,
  Sparkles,
  TriangleAlert,
} from "lucide-react";
import Link from "next/link";

import { StatusPill } from "@/components/ui/status-pill";

import {
  changeLabels,
  cumulativeSentimentLabels,
  formatKstDate,
  formatRelativeTime,
  stanceLabels,
} from "./format";
import { SentimentDistribution } from "./sentiment-distribution";
import type { ChangeType, TickerOverview } from "./types";
import { WatchlistButton } from "./watchlist-button";

const changeIcons = {
  first_mention: Sparkles,
  new_claim: MessageSquarePlus,
  new_risk: TriangleAlert,
  stance_change: ArrowLeftRight,
  unclear: CircleHelp,
} satisfies Partial<
  Record<Exclude<ChangeType, null | "repeat">, typeof Sparkles>
>;

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
  const ChangeIcon = row.changeType
    ? changeIcons[row.changeType as keyof typeof changeIcons]
    : undefined;
  const hasStanceConflict =
    (row.cumulativeSentiment === "positive" &&
      row.latestStance === "bearish") ||
    (row.cumulativeSentiment === "negative" &&
      row.latestStance === "bullish");

  return (
    <tr className="ticker-row">
      <td className="watchlist-column">
        <WatchlistButton
          initialActive={row.watchlisted}
          ticker={row.ticker}
        />
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
      <td className="number-column total-column">
        <span className="mobile-total-label">총</span>{" "}
        <span className="data-number data-number--strong">
          {row.totalMentions}
        </span>
      </td>
      <td className="distribution-column">
        <SentimentDistribution row={row} />
      </td>
      <td className="sentiment-column">
        <StatusPill tone={sentimentTone(row.cumulativeSentiment)}>
          {cumulativeSentimentLabels[row.cumulativeSentiment]}
        </StatusPill>
      </td>
      <td className="stance-column">
        <span className="inline-status">
          {hasStanceConflict ? (
            <ArrowLeftRight
              aria-label="누적 관점과 최근 의견 불일치"
              className="conflict-icon"
              size={14}
            />
          ) : null}
          <StatusPill tone={stanceTone(row.latestStance)}>
            {stanceLabels[row.latestStance]}
          </StatusPill>
        </span>
      </td>
      <td className="change-column">
        {row.changeType ? (
          <span
            className={`change-label change-label--${row.changeType}`}
            title={`기준 게시글 ${formatKstDate(row.lastMentionedAt)}`}
          >
            {ChangeIcon ? <ChangeIcon aria-hidden="true" size={14} /> : null}
            {changeLabels[row.changeType]}
          </span>
        ) : (
          <span className="empty-value">-</span>
        )}
      </td>
      <td className="number-column period-column">
        <span className="data-number">{row.mentions7d}</span>
        <span className="number-divider">/</span>
        <span className="data-number">{row.mentions30d}</span>
      </td>
      <td
        className="relative-time-column"
        title={formatKstDate(row.lastMentionedAt)}
      >
        {formatRelativeTime(row.lastMentionedAt)}
      </td>
      <td className="quality-column">
        {row.reviewCount > 0 ? (
          <span
            aria-label={`검토 필요 ${row.reviewCount}건`}
            className="quality-warning"
            title={`검토 필요 ${row.reviewCount}건`}
          >
            <CircleHelp aria-hidden="true" size={15} />
          </span>
        ) : null}
      </td>
    </tr>
  );
}
