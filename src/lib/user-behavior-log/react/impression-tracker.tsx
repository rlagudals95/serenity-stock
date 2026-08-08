"use client";

import {
  Children,
  cloneElement,
  isValidElement,
  useEffect,
  useRef,
  type ReactElement,
  type Ref,
} from "react";

import { mergeRefs } from "./ref-utils";

export interface ImpressionTrackerProps {
  children: ReactElement<{ ref?: Ref<Element> }>;
  enabled?: boolean;
  onImpression: () => void;
  threshold?: number;
  rootMargin?: string;
  triggerOnce?: boolean;
}

export const ImpressionTracker = ({
  children,
  enabled = true,
  onImpression,
  threshold = 0.5,
  rootMargin = "0px",
  triggerOnce = true,
}: ImpressionTrackerProps) => {
  const child = Children.only(children);
  const targetRef = useRef<Element | null>(null);
  const impressionCallbackRef = useRef(onImpression);
  const hasTriggeredRef = useRef(false);

  if (!isValidElement(child)) {
    throw new Error(
      "ImpressionTracker expects a single valid React element child.",
    );
  }

  useEffect(() => {
    impressionCallbackRef.current = onImpression;
  }, [onImpression]);

  useEffect(() => {
    if (
      !enabled ||
      typeof IntersectionObserver === "undefined" ||
      !targetRef.current
    ) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (
          !entry ||
          !entry.isIntersecting ||
          entry.intersectionRatio < threshold
        ) {
          return;
        }

        if (triggerOnce && hasTriggeredRef.current) {
          return;
        }

        hasTriggeredRef.current = true;
        impressionCallbackRef.current();

        if (triggerOnce) {
          observer.disconnect();
        }
      },
      {
        threshold,
        rootMargin,
      },
    );

    observer.observe(targetRef.current);

    return () => {
      observer.disconnect();
    };
  }, [enabled, rootMargin, threshold, triggerOnce]);

  /* eslint-disable react-hooks/refs -- cloneElement receives the callback ref;
     mergeRefs does not read either ref during render. */
  const trackedChild = cloneElement(child, {
    ref: mergeRefs((value: Element | null) => {
      targetRef.current = value;
    }, child.props.ref),
  });
  /* eslint-enable react-hooks/refs */

  return trackedChild;
};
