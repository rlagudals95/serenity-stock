import type {
  BehaviorLogContext,
  BehaviorLogEvent,
  BehaviorLogger,
  ClickInput,
  CreateBehaviorLoggerOptions,
  ImpressionInput,
  PageViewInput,
  TrackBehaviorInput,
} from "./types";

const mergeMetadata = (
  baseMetadata?: Record<string, unknown>,
  nextMetadata?: Record<string, unknown>,
) => {
  const merged = {
    ...(baseMetadata ?? {}),
    ...(nextMetadata ?? {}),
  };

  return Object.keys(merged).length > 0 ? merged : undefined;
};

const resolvePath = (
  context: Partial<BehaviorLogContext>,
  input: Partial<BehaviorLogContext>,
) => {
  if (input.path) {
    return input.path;
  }

  if (context.path) {
    return context.path;
  }

  if (typeof window !== "undefined") {
    return `${window.location.pathname}${window.location.search}`;
  }

  return "/";
};

export const createBehaviorLogger = (
  options: CreateBehaviorLoggerOptions,
): BehaviorLogger => {
  const track = async (input: TrackBehaviorInput) => {
    const context = options.getContext?.() ?? {};
    const event: BehaviorLogEvent = {
      eventName: input.eventName,
      path: resolvePath(context, input),
      sessionId: input.sessionId ?? context.sessionId,
      metadata: mergeMetadata(context.metadata, input.metadata),
      element: input.element,
      occurredAt: input.occurredAt ?? new Date().toISOString(),
    };

    await options.send(event);
    return event;
  };

  const pageView = (input: PageViewInput = {}) =>
    track({
      ...input,
      eventName: input.eventName ?? "page_view",
    });

  const click = (input: ClickInput = {}) =>
    track({
      ...input,
      eventName: input.eventName ?? "click",
    });

  const impression = (input: ImpressionInput = {}) =>
    track({
      ...input,
      eventName: input.eventName ?? "impression",
    });

  return {
    track,
    pageView,
    click,
    impression,
  };
};
