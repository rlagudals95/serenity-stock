"use client";

import {
  Check,
  ChevronDown,
  ExternalLink,
  Link2Off,
  TriangleAlert,
} from "lucide-react";
import type { KeyboardEvent, MouseEvent } from "react";
import { useState } from "react";

import { StatusPill } from "@/components/ui/status-pill";

import {
  changeLabels,
  confidenceLabel,
  formatKstDate,
  stanceLabels,
} from "../format";
import type { Opinion } from "../types";

type Feedback = "useful" | "known" | "misclassified" | null;

function isInteractive(target: EventTarget | null) {
  return (
    target instanceof HTMLElement &&
    Boolean(target.closest("a, button, input, select, textarea"))
  );
}

export function OpinionItem({ opinion }: { opinion: Opinion }) {
  const [expanded, setExpanded] = useState(false);
  const [feedback, setFeedback] = useState<Feedback>(null);

  function toggleFromItem(event: MouseEvent<HTMLElement>) {
    if (isInteractive(event.target)) return;
    setExpanded((value) => !value);
  }

  function toggleFromKeyboard(event: KeyboardEvent<HTMLElement>) {
    if (isInteractive(event.target)) return;
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      setExpanded((value) => !value);
    }
  }

  return (
    <article
      aria-label={`${formatKstDate(opinion.postedAt)} 게시글`}
      className={`opinion-item ${expanded ? "is-expanded" : ""}`}
      data-expanded={expanded}
      onClick={toggleFromItem}
      onKeyDown={toggleFromKeyboard}
      tabIndex={0}
    >
      <header className="opinion-item__header">
        <time dateTime={opinion.postedAt}>{formatKstDate(opinion.postedAt)}</time>
        <div className="opinion-labels">
          <StatusPill
            tone={
              opinion.stance === "bullish"
                ? "positive"
                : opinion.stance === "bearish"
                  ? "negative"
                  : opinion.stance === "mixed"
                    ? "mixed"
                    : "neutral"
            }
          >
            {stanceLabels[opinion.stance]}
          </StatusPill>
          {opinion.changeType ? (
            <span>{changeLabels[opinion.changeType]}</span>
          ) : null}
          <span>확신 {opinion.conviction === "high" ? "높음" : opinion.conviction === "medium" ? "보통" : "낮음"}</span>
        </div>
      </header>

      <div className="analysis-block">
        <span className="content-origin">AI 분석</span>
        <h3>{opinion.claim}</h3>
      </div>

      <div className="evidence-block">
        <span className="content-origin">원문 근거</span>
        <blockquote>{opinion.evidence}</blockquote>
      </div>

      <div className={`full-post ${expanded ? "is-expanded" : ""}`}>
        <div>
          <span className="content-origin">게시글 전체</span>
          <p>{opinion.fullText}</p>
        </div>
      </div>

      <div className="opinion-actions">
        <div className="opinion-primary-actions">
          <button
            aria-expanded={expanded}
            className="text-action"
            onClick={() => setExpanded((value) => !value)}
            type="button"
          >
            {expanded ? "전체 글 접기" : "전체 글 펼치기"}
            <ChevronDown
              aria-hidden="true"
              className={expanded ? "is-rotated" : ""}
              size={14}
            />
          </button>
          {opinion.sourceUrl ? (
            <a
              className="source-link source-link--strong"
              href={opinion.sourceUrl}
              rel="noopener noreferrer"
              target="_blank"
            >
              X에서 원문 보기
              <ExternalLink aria-hidden="true" size={13} />
            </a>
          ) : (
            <span className="source-unavailable">
              <Link2Off aria-hidden="true" size={13} />
              X 원문 이용 불가
            </span>
          )}
        </div>

        <div aria-label="분석 피드백" className="feedback-control" role="group">
          {[
            ["useful", "유용함"],
            ["known", "이미 앎"],
            ["misclassified", "오분류"],
          ].map(([value, label]) => (
            <button
              aria-pressed={feedback === value}
              className={feedback === value ? "is-selected" : ""}
              key={value}
              onClick={() =>
                setFeedback((current) =>
                  current === value ? null : (value as Feedback),
                )
              }
              type="button"
            >
              {feedback === value ? <Check aria-hidden="true" size={12} /> : null}
              {label}
            </button>
          ))}
        </div>
      </div>

      <footer className="opinion-quality">
        {opinion.reviewStatus === "needs_review" ? (
          <span className="review-needed">
            <TriangleAlert aria-hidden="true" size={13} />
            종목은 확인됨 · 의견 집계 제외
          </span>
        ) : (
          <span>자동 분석 · confidence {confidenceLabel(opinion.confidence)}</span>
        )}
      </footer>

      {feedback === "misclassified" ? (
        <div className="misclassification-panel">
          <label>
            오류 유형
            <select defaultValue="">
              <option disabled value="">
                선택
              </option>
              <option>잘못된 ticker</option>
              <option>잘못된 stance</option>
              <option>원문에 없는 claim</option>
              <option>noise</option>
              <option>기타</option>
            </select>
          </label>
          <label>
            메모
            <input placeholder="선택 사항" />
          </label>
        </div>
      ) : null}
    </article>
  );
}
