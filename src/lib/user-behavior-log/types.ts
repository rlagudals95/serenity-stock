export type BehaviorEventName =
  | "page_view"
  | "click"
  | "impression"
  | (string & {});

export interface BehaviorLogElement {
  id?: string;
  name?: string;
  type?: string;
}

export interface BehaviorLogContext {
  path?: string;
  sessionId?: string;
  metadata?: Record<string, unknown>;
}

export interface BehaviorLogEvent extends BehaviorLogContext {
  eventName: BehaviorEventName;
  occurredAt: string;
  element?: BehaviorLogElement;
}

export interface TrackBehaviorInput extends BehaviorLogContext {
  eventName: BehaviorEventName;
  occurredAt?: string;
  element?: BehaviorLogElement;
}

export interface PageViewInput
  extends Omit<TrackBehaviorInput, "eventName" | "element"> {
  eventName?: BehaviorEventName;
}

export interface ClickInput extends Omit<TrackBehaviorInput, "eventName"> {
  eventName?: BehaviorEventName;
}

export interface ImpressionInput extends Omit<TrackBehaviorInput, "eventName"> {
  eventName?: BehaviorEventName;
}

export type BehaviorLogSender = (
  event: BehaviorLogEvent,
) => void | Promise<void>;

export interface CreateBehaviorLoggerOptions {
  send: BehaviorLogSender;
  getContext?: () => Partial<BehaviorLogContext>;
}

export interface BehaviorLogger {
  track(input: TrackBehaviorInput): Promise<BehaviorLogEvent>;
  pageView(input?: PageViewInput): Promise<BehaviorLogEvent>;
  click(input?: ClickInput): Promise<BehaviorLogEvent>;
  impression(input?: ImpressionInput): Promise<BehaviorLogEvent>;
}
