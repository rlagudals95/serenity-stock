"use client";

import { useMemo, useSyncExternalStore } from "react";
import { parseResearch, RESEARCH_CHANGED, RESEARCH_STORAGE_KEY } from "./research-state";

function subscribe(notify: () => void) {
  window.addEventListener("storage", notify);
  window.addEventListener(RESEARCH_CHANGED, notify);
  return () => {
    window.removeEventListener("storage", notify);
    window.removeEventListener(RESEARCH_CHANGED, notify);
  };
}
function getSnapshot() {
  try { return window.localStorage.getItem(RESEARCH_STORAGE_KEY); }
  catch { return null; }
}
const serverSnapshot = () => null;
const readySnapshot = () => true;
const notReadySnapshot = () => false;

export function useResearch() {
  const raw = useSyncExternalStore(subscribe, getSnapshot, serverSnapshot);
  const ready = useSyncExternalStore(subscribe, readySnapshot, notReadySnapshot);
  return { records: useMemo(() => parseResearch(raw), [raw]), ready };
}
