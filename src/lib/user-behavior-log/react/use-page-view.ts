"use client";

import { useEffect } from "react";

import type { BehaviorLogger, PageViewInput } from "../types";
import { useBehaviorLogger } from "./context";

export interface UsePageViewOptions extends PageViewInput {
  logger?: BehaviorLogger;
  enabled?: boolean;
  deps?: readonly unknown[];
}

export const usePageView = ({
  logger,
  enabled = true,
  deps = [],
  ...input
}: UsePageViewOptions) => {
  const behaviorLogger = useBehaviorLogger(logger);
  const metadataSignature = JSON.stringify(input.metadata ?? {});

  useEffect(() => {
    if (!enabled) {
      return;
    }

    void behaviorLogger.pageView(input);
    // `deps` is part of this hook's public API, so this dependency list is
    // intentionally dynamic in the same way as React's built-in hooks.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [behaviorLogger, enabled, input.path, input.sessionId, metadataSignature, ...deps]);
};
