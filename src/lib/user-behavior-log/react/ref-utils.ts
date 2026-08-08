"use client";

import type { MutableRefObject, Ref } from "react";

export const mergeRefs =
  <T,>(...refs: Array<Ref<T> | undefined>) =>
  (value: T | null) => {
    for (const ref of refs) {
      if (!ref) {
        continue;
      }

      if (typeof ref === "function") {
        ref(value);
        continue;
      }

      (ref as MutableRefObject<T | null>).current = value;
    }
  };
