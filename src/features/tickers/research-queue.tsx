import {
  ArrowLeftRight,
  ArrowUpRight,
  CircleHelp,
  MessageSquarePlus,
  Sparkles,
  TriangleAlert,
} from "lucide-react";
import Link from "next/link";

import { changeLabels, formatRelativeTime } from "./format";
import type {
  AnalystSnapshot,
  ChangeType,
  TickerOverview,
} from "./types";

const changeIcons = {
  first_mention: Sparkles,
  new_claim: MessageSquarePlus,
  new_risk: TriangleAlert,
  stance_change: ArrowLeftRight,
  unclear: CircleHelp,
} satisfies Partial<
  Record<Exclude<ChangeType, null | "repeat">, typeof Sparkles>
>;

const changePriority: Record<Exclude<ChangeType, null>, number> = {
  stance_change: 8,
  new_risk: 7,
  new_claim: 3,
  first_mention: 2,
  unclear: 1,
  repeat: 0,
};

function priority(row: TickerOverview) {
  return (
    (row.watchlisted ? 3 : 0) +
    (row.changeType ? changePriority[row.changeType] : 0) +
    (row.reviewCount > 0 ? 1 : 0)
  );
}

function compareRows(left: TickerOverview, right: TickerOverview) {
  const priorityDifference = priority(right) - priority(left);
  if (priorityDifference !== 0) return priorityDifference;
  return right.lastMentionedAt.localeCompare(left.lastMentionedAt);
}

function latestContext(row: TickerOverview): AnalystSnapshot | null {
  const analysts = row.analysts ?? [];
  const matching = analysts.filter(
    (analyst) => analyst.latestChangeType === row.changeType,
  );
  return (
    [...(matching.length ? matching : analysts)].sort((left, right) =>
      right.lastMentionedAt.localeCompare(left.lastMentionedAt),
    )[0] ?? null
  );
}

function queueRows(rows: TickerOverview[]) {
  return [...rows]
    .filter(
      (row) =>
        row.changeType !== null &&
        row.changeType !== "repeat" &&
        row.changeType !== "unclear",
    )
    .sort(compareRows);
}

export function ResearchQueue({ rows }: { rows: TickerOverview[] }) {
  const changes = queueRows(rows);
  const visibleChanges = changes.slice(0, 4);
  const watchlistChanges = changes.filter((row) => row.watchlisted).length;
  const riskOrFlipChanges = changes.filter(
    (row) =>
      row.changeType === "new_risk" || row.changeType === "stance_change",
  ).length;
  const reviewCount = rows.reduce((total, row) => total + row.reviewCount, 0);

  return (
    <section aria-labelledby="research-queue-title" className="research-queue">
      <header className="research-queue__header">
        <div>
          <p className="section-kicker">RESEARCH QUEUE</p>
          <h2 id="research-queue-title">우선 확인할 변화</h2>
          <p>Watchlist와 리스크·방향 전환을 먼저 정렬했습니다.</p>
        </div>
        <dl aria-label="현재 리서치 큐 요약" className="queue-summary">
          <div>
            <dt>유효 변화</dt>
            <dd>{changes.length}</dd>
          </div>
          <div>
            <dt>Watchlist</dt>
            <dd>{watchlistChanges}</dd>
          </div>
          <div>
            <dt>리스크·전환</dt>
            <dd>{riskOrFlipChanges}</dd>
          </div>
          <div>
            <dt>검토 필요</dt>
            <dd>{reviewCount}</dd>
          </div>
        </dl>
      </header>

      {visibleChanges.length ? (
        <ol className="research-queue__list">
          {visibleChanges.map((row, index) => {
            const context = latestContext(row);
            const ChangeIcon = row.changeType
              ? changeIcons[row.changeType as keyof typeof changeIcons]
              : undefined;
            const claim =
              context?.latestClaim ??
              `${row.ticker}에서 ${row.changeType ? changeLabels[row.changeType] : "새 변화"}이 감지됐습니다.`;

            return (
              <li key={row.ticker}>
                <Link
                  aria-label={`${row.ticker} ${changeLabels[row.changeType!]} 근거 확인`}
                  className={`research-queue__item research-queue__item--${row.changeType}`}
                  href={`/tickers/${row.ticker}`}
                >
                  <span aria-hidden="true" className="research-queue__rank">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <span className="research-queue__identity">
                    <span className="research-queue__ticker">
                      {row.ticker}
                      {row.watchlisted ? <span>WATCHLIST</span> : null}
                    </span>
                    <span>{row.companyName}</span>
                  </span>
                  <span className="research-queue__context">
                    <span className="research-queue__change">
                      {ChangeIcon ? (
                        <ChangeIcon aria-hidden="true" size={14} />
                      ) : null}
                      {changeLabels[row.changeType!]}
                      <span>·</span>
                      {context?.name ?? `${row.analysts?.length ?? 0}개 소스`}
                      <span>·</span>
                      {formatRelativeTime(row.lastMentionedAt)}
                    </span>
                    <strong>{claim}</strong>
                  </span>
                  <span className="research-queue__action">
                    근거 확인
                    <ArrowUpRight aria-hidden="true" size={15} />
                  </span>
                </Link>
              </li>
            );
          })}
        </ol>
      ) : (
        <div className="research-queue__empty">
          <p>현재 조건에서 우선 확인할 새 변화가 없습니다.</p>
          <span>전체 종목에서 기존 관점과 원문을 계속 탐색할 수 있습니다.</span>
        </div>
      )}
    </section>
  );
}
