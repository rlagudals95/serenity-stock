"use client";

import Link from "next/link";
import type {
  AnchorHTMLAttributes,
  ComponentPropsWithoutRef,
  MouseEventHandler,
} from "react";

import { appBehaviorLogger } from "../app-behavior-logger";
import type {
  BehaviorEventName,
  BehaviorLogElement,
} from "../types";
import { LogClick } from "./log-click";

interface TrackingProps {
  eventName: BehaviorEventName;
  element?: BehaviorLogElement;
  metadata?: Record<string, unknown>;
}

export type TrackedLinkProps = ComponentPropsWithoutRef<typeof Link> &
  TrackingProps;

export function TrackedLink({
  eventName,
  element,
  metadata,
  href,
  ...props
}: TrackedLinkProps) {
  const destination = typeof href === "string" ? href : href.pathname ?? "/";

  return (
    <LogClick
      element={{ id: destination, type: "link", ...element }}
      eventName={eventName}
      logger={appBehaviorLogger}
      metadata={{ destination, ...metadata }}
    >
      <Link href={href} {...props} />
    </LogClick>
  );
}

export type TrackedExternalLinkProps = Omit<
  AnchorHTMLAttributes<HTMLAnchorElement>,
  "href"
> &
  TrackingProps & {
    href: string;
  };

export function TrackedExternalLink({
  eventName,
  element,
  metadata,
  href,
  onClick,
  ...props
}: TrackedExternalLinkProps) {
  return (
    <LogClick
      element={{ id: href, type: "external-link", ...element }}
      eventName={eventName}
      logger={appBehaviorLogger}
      metadata={{ destination: href, ...metadata }}
    >
      <a
        href={href}
        onClick={onClick as MouseEventHandler<HTMLElement>}
        {...props}
      />
    </LogClick>
  );
}
