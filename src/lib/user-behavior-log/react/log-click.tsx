"use client";

import {
  Children,
  cloneElement,
  isValidElement,
  type MouseEventHandler,
  type ReactElement,
} from "react";

import type { BehaviorLogger, ClickInput } from "../types";
import { useBehaviorLogger } from "./context";

export interface LogClickProps extends ClickInput {
  children: ReactElement<{ onClick?: MouseEventHandler<HTMLElement> }>;
  logger?: BehaviorLogger;
  enabled?: boolean;
}

export const LogClick = ({
  children,
  logger,
  enabled = true,
  ...input
}: LogClickProps) => {
  const behaviorLogger = useBehaviorLogger(logger);

  if (!isValidElement(children)) {
    throw new Error("LogClick expects a single valid React element child.");
  }

  const child = Children.only(children);

  return cloneElement(child, {
    onClick: (event) => {
      child.props.onClick?.(event);

      if (event.defaultPrevented || !enabled) {
        return;
      }

      void behaviorLogger.click(input);
    },
  });
};
