"use client";

import { usePathname } from "next/navigation";
import type { PropsWithChildren } from "react";

import { appBehaviorLogger } from "../app-behavior-logger";
import { BehaviorLoggerProvider } from "./context";
import { usePageView } from "./use-page-view";

export function AppBehaviorLoggerProvider({ children }: PropsWithChildren) {
  return (
    <BehaviorLoggerProvider logger={appBehaviorLogger}>
      {children}
    </BehaviorLoggerProvider>
  );
}

export function BehaviorPageViewTracker() {
  const pathname = usePathname();

  usePageView({
    path: pathname || "/",
  });

  return null;
}
