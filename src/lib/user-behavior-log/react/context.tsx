"use client";

import { createContext, useContext, type PropsWithChildren } from "react";

import type { BehaviorLogger } from "../types";

const BehaviorLoggerContext = createContext<BehaviorLogger | null>(null);

export const BehaviorLoggerProvider = ({
  logger,
  children,
}: PropsWithChildren<{ logger: BehaviorLogger }>) => (
  <BehaviorLoggerContext.Provider value={logger}>
    {children}
  </BehaviorLoggerContext.Provider>
);

export const useBehaviorLogger = (logger?: BehaviorLogger) => {
  const contextLogger = useContext(BehaviorLoggerContext);
  const resolvedLogger = logger ?? contextLogger;

  if (!resolvedLogger) {
    throw new Error(
      "Behavior logger is not available. Pass logger explicitly or wrap with BehaviorLoggerProvider.",
    );
  }

  return resolvedLogger;
};
