"use client";

import { createBehaviorLogger } from "./create-behavior-logger";
import type { BehaviorLogEvent } from "./types";

export const MAX_STORED_BEHAVIOR_EVENTS = 200;
export const USER_BEHAVIOR_LOG_STORAGE_KEY =
  "serenity:user-behavior-log:events:v1";
const USER_BEHAVIOR_SESSION_KEY = "serenity:user-behavior-log:session:v1";

const isBehaviorLogEvent = (value: unknown): value is BehaviorLogEvent =>
  Boolean(
    value &&
      typeof value === "object" &&
      "eventName" in value &&
      typeof value.eventName === "string" &&
      "occurredAt" in value &&
      typeof value.occurredAt === "string",
  );

export function readStoredBehaviorLogEvents(): BehaviorLogEvent[] {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const raw = window.localStorage.getItem(USER_BEHAVIOR_LOG_STORAGE_KEY);
    if (!raw) {
      return [];
    }

    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter(isBehaviorLogEvent) : [];
  } catch {
    return [];
  }
}

export function storeBehaviorLogEvent(event: BehaviorLogEvent) {
  if (typeof window === "undefined") {
    return;
  }

  try {
    const events = [...readStoredBehaviorLogEvents(), event].slice(
      -MAX_STORED_BEHAVIOR_EVENTS,
    );
    window.localStorage.setItem(
      USER_BEHAVIOR_LOG_STORAGE_KEY,
      JSON.stringify(events),
    );
  } catch {
    // Behavior logging is best effort and must not interrupt product flows.
  }
}

const createSessionId = () => {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `session-${Date.now()}-${Math.random().toString(36).slice(2)}`;
};

const getBehaviorSessionId = () => {
  if (typeof window === "undefined") {
    return undefined;
  }

  try {
    const existing = window.sessionStorage.getItem(USER_BEHAVIOR_SESSION_KEY);
    if (existing) {
      return existing;
    }

    const sessionId = createSessionId();
    window.sessionStorage.setItem(USER_BEHAVIOR_SESSION_KEY, sessionId);
    return sessionId;
  } catch {
    return createSessionId();
  }
};

export const appBehaviorLogger = createBehaviorLogger({
  getContext: () => ({
    sessionId: getBehaviorSessionId(),
  }),
  send: storeBehaviorLogEvent,
});
