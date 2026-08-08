"use client";

import type { ReactNode } from "react";

import type { BehaviorLogger, PageViewInput } from "../types";
import { usePageView } from "./use-page-view";

export interface LogPageViewProps extends PageViewInput {
  children?: ReactNode;
  logger?: BehaviorLogger;
  enabled?: boolean;
  deps?: readonly unknown[];
}

export const LogPageView = ({
  children,
  logger,
  enabled,
  deps,
  ...input
}: LogPageViewProps) => {
  usePageView({
    logger,
    enabled,
    deps,
    ...input,
  });

  return <>{children ?? null}</>;
};
