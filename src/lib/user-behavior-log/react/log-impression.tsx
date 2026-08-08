"use client";

import type { ReactElement } from "react";

import type { BehaviorLogger, ImpressionInput } from "../types";
import { useBehaviorLogger } from "./context";
import {
  ImpressionTracker,
  type ImpressionTrackerProps,
} from "./impression-tracker";

export interface LogImpressionProps
  extends Omit<ImpressionTrackerProps, "onImpression" | "children">,
    ImpressionInput {
  children: ReactElement<{ ref?: React.Ref<Element> }>;
  logger?: BehaviorLogger;
}

export const LogImpression = ({
  children,
  logger,
  enabled = true,
  threshold,
  rootMargin,
  triggerOnce,
  ...input
}: LogImpressionProps) => {
  const behaviorLogger = useBehaviorLogger(logger);

  return (
    <ImpressionTracker
      enabled={enabled}
      onImpression={() => {
        void behaviorLogger.impression(input);
      }}
      rootMargin={rootMargin}
      threshold={threshold}
      triggerOnce={triggerOnce}
    >
      {children}
    </ImpressionTracker>
  );
};
