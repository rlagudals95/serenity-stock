"use client";

import {
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";

import {
  analystComparisonLabels,
  analystInitials,
  analystStanceLabels,
  buildAnalystPresenceModel,
} from "./analyst-presence-model";
import { formatRelativeTime } from "./format";
import type { AnalystSnapshot } from "./types";

interface AnalystPresenceProps {
  analysts: AnalystSnapshot[];
  ticker: string;
  variant: "desktop" | "mobile";
}

const VIEWPORT_MARGIN = 12;
const POPOVER_GAP = 8;
const POPOVER_MAX_WIDTH = 380;
const MOBILE_MAX_WIDTH = 767;

const stanceSignals = {
  bullish: "↑",
  bearish: "↓",
  mixed: "↕",
  neutral: "−",
  unknown: "−",
} as const;

function isVariantActive(
  variant: AnalystPresenceProps["variant"],
  viewportWidth: number,
) {
  return variant === "mobile"
    ? viewportWidth <= MOBILE_MAX_WIDTH
    : viewportWidth > MOBILE_MAX_WIDTH;
}

export function AnalystPresence({
  analysts,
  ticker,
  variant,
}: AnalystPresenceProps) {
  const hasAnalysts = analysts.length > 0;
  const [popoverState, setPopoverState] = useState({
    hasAnalysts,
    open: false,
  });
  if (popoverState.hasAnalysts !== hasAnalysts) {
    setPopoverState({ hasAnalysts, open: false });
  }
  const open =
    hasAnalysts &&
    popoverState.hasAnalysts === hasAnalysts &&
    popoverState.open;
  const [panelStyle, setPanelStyle] = useState<CSSProperties>({
    left: VIEWPORT_MARGIN,
    top: VIEWPORT_MARGIN,
    width: POPOVER_MAX_WIDTH,
  });
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const descriptionId = useId();
  const model = buildAnalystPresenceModel(
    analysts,
    variant === "desktop" ? 3 : 2,
  );
  const visibleAnalystDescription = model.visible
    .map(
      (analyst) =>
        `${analyst.name} · ${analystStanceLabels[analyst.latestStance]}`,
    )
    .join(", ");
  const summaryDescription = `${visibleAnalystDescription}. 최근 관점: 긍정 ${model.counts.bullish}명, 부정 ${model.counts.bearish}명, 기타 ${model.counts.other}명. ${analystComparisonLabels[model.comparison]}.`;

  const positionPanel = useCallback((panel = panelRef.current) => {
    const trigger = triggerRef.current;
    if (!trigger) return;

    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const width = Math.min(
      POPOVER_MAX_WIDTH,
      Math.max(0, viewportWidth - VIEWPORT_MARGIN * 2),
    );
    const triggerRect = trigger.getBoundingClientRect();
    const panelHeight = panel
      ? Math.max(panel.getBoundingClientRect().height, panel.scrollHeight)
      : 0;
    const maximumLeft = Math.max(
      VIEWPORT_MARGIN,
      viewportWidth - width - VIEWPORT_MARGIN,
    );
    const left = Math.min(
      Math.max(triggerRect.left, VIEWPORT_MARGIN),
      maximumLeft,
    );
    const belowTop = Math.max(
      VIEWPORT_MARGIN,
      triggerRect.bottom + POPOVER_GAP,
    );
    const availableBelow = Math.max(
      0,
      viewportHeight - VIEWPORT_MARGIN - belowTop,
    );
    const availableAbove = Math.max(
      0,
      triggerRect.top - POPOVER_GAP - VIEWPORT_MARGIN,
    );
    const placeBelow =
      panelHeight <= availableBelow ||
      (panelHeight > availableAbove && availableBelow >= availableAbove);
    const maxHeight = placeBelow ? availableBelow : availableAbove;
    const renderedHeight = Math.min(panelHeight, maxHeight);
    const top = placeBelow
      ? belowTop
      : Math.max(
          VIEWPORT_MARGIN,
          triggerRect.top - POPOVER_GAP - renderedHeight,
        );

    const nextStyle: CSSProperties = {
      left,
      maxHeight,
      top,
      width,
    };
    setPanelStyle((currentStyle) => {
      if (
        currentStyle.left === nextStyle.left &&
        currentStyle.maxHeight === nextStyle.maxHeight &&
        currentStyle.top === nextStyle.top &&
        currentStyle.width === nextStyle.width
      ) {
        return currentStyle;
      }
      return nextStyle;
    });
  }, []);

  const setMeasuredPanel = useCallback(
    (panel: HTMLDivElement | null) => {
      panelRef.current = panel;
      if (panel) {
        positionPanel(panel);
        panel.focus();
      }
    },
    [positionPanel],
  );

  const closeAndRestoreFocus = useCallback(() => {
    setPopoverState((currentState) => ({
      ...currentState,
      open: false,
    }));
    triggerRef.current?.focus();
  }, []);

  const closeWithoutRestoringFocus = useCallback(() => {
    setPopoverState((currentState) =>
      currentState.open
        ? {
            ...currentState,
            open: false,
          }
        : currentState,
    );
  }, []);

  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        closeAndRestoreFocus();
      }
    };
    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target;
      if (
        target instanceof Node &&
        !panelRef.current?.contains(target) &&
        !triggerRef.current?.contains(target)
      ) {
        setPopoverState((currentState) => ({
          ...currentState,
          open: false,
        }));
      }
    };
    const handlePositionChange = () => positionPanel();
    const handleViewportResize = () => {
      if (!isVariantActive(variant, window.innerWidth)) {
        closeWithoutRestoringFocus();
        return;
      }
      positionPanel();
    };

    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("pointerdown", handlePointerDown);
    window.addEventListener("resize", handleViewportResize);
    window.addEventListener("scroll", handlePositionChange, true);
    const resizeObserver =
      typeof ResizeObserver === "undefined" || !panelRef.current
        ? null
        : new ResizeObserver(handlePositionChange);
    if (resizeObserver && panelRef.current) {
      resizeObserver.observe(panelRef.current);
    }

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("pointerdown", handlePointerDown);
      window.removeEventListener("resize", handleViewportResize);
      window.removeEventListener("scroll", handlePositionChange, true);
      resizeObserver?.disconnect();
    };
  }, [
    closeAndRestoreFocus,
    closeWithoutRestoringFocus,
    open,
    positionPanel,
    variant,
  ]);

  if (model.all.length === 0) {
    return <span className="analyst-presence__empty">언급 정보 없음</span>;
  }

  const handleTriggerPointerDown = (
    event: ReactPointerEvent<HTMLButtonElement>,
  ) => {
    if (event.button !== 0) return;
    positionPanel();
  };

  return (
    <div
      className={`analyst-presence analyst-presence--${variant}`}
      data-variant={variant}
    >
      <button
        aria-describedby={descriptionId}
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-label={`${ticker} 언급 분석가 ${model.all.length}명 보기`}
        className="analyst-presence__trigger"
        onClick={() =>
          setPopoverState((currentState) => ({
            ...currentState,
            open: !currentState.open,
          }))
        }
        onPointerDown={handleTriggerPointerDown}
        ref={triggerRef}
        type="button"
      >
        <span className="sr-only" id={descriptionId}>
          {summaryDescription}
        </span>
        <span className="analyst-presence__chips">
          {model.visible.map((analyst) => (
            <span
              aria-label={`${analyst.name} · ${analystStanceLabels[analyst.latestStance]}`}
              className={`analyst-presence__item analyst-presence__item--${analyst.latestStance}`}
              key={analyst.key}
            >
              <span className="analyst-presence__initials">
                {analystInitials(analyst.name)}
              </span>
              <span
                aria-hidden="true"
                className="analyst-presence__stance-signal"
              >
                {stanceSignals[analyst.latestStance]}
              </span>
              {variant === "desktop" ? (
                <span className="analyst-presence__name">{analyst.name}</span>
              ) : null}
            </span>
          ))}
          {model.hiddenCount > 0 ? (
            <span className="analyst-presence__more">
              +{model.hiddenCount}
            </span>
          ) : null}
        </span>
        <span className="analyst-presence__summary">
          {variant === "desktop" ? (
            <span className="analyst-presence__counts">
              <span>긍정 {model.counts.bullish}</span>
              <span>부정 {model.counts.bearish}</span>
              <span>기타 {model.counts.other}</span>
            </span>
          ) : null}
          <span className="analyst-presence__comparison">
            {analystComparisonLabels[model.comparison]}
          </span>
        </span>
      </button>

      {open
        ? createPortal(
            <div
              aria-label={`${ticker} 언급 분석가`}
              className="analyst-presence-popover"
              ref={setMeasuredPanel}
              role="dialog"
              style={{
                ...panelStyle,
                maxWidth: POPOVER_MAX_WIDTH,
                overflowY: "auto",
                position: "fixed",
              }}
              tabIndex={-1}
            >
              <header className="analyst-presence-popover__header">
                <strong>{ticker}</strong>
                <span>분석가 {model.all.length}명</span>
              </header>
              <ul className="analyst-presence-popover__list">
                {model.all.map((analyst) => (
                  <li
                    className="analyst-presence-popover__item"
                    key={analyst.key}
                  >
                    <div className="analyst-presence-popover__identity">
                      <strong>{analyst.name}</strong>
                      <span>@{analyst.username}</span>
                    </div>
                    <div className="analyst-presence-popover__meta">
                      <span>
                        <span aria-hidden="true">
                          {stanceSignals[analyst.latestStance]}
                        </span>{" "}
                        {analystStanceLabels[analyst.latestStance]}
                      </span>
                      <span>총 {analyst.totalMentions}회 언급</span>
                      <time dateTime={analyst.lastMentionedAt}>
                        {formatRelativeTime(analyst.lastMentionedAt)}
                      </time>
                    </div>
                    {analyst.latestSourceUrl ? (
                      <a
                        aria-label={`${analyst.name} 최근 원문`}
                        href={analyst.latestSourceUrl}
                        rel="noopener noreferrer"
                        target="_blank"
                      >
                        최근 원문
                      </a>
                    ) : null}
                  </li>
                ))}
              </ul>
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}
