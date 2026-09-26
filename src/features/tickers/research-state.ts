import { z } from "zod";

import type { OpinionSnapshot } from "./briefing-model";
import type { TickerDetail } from "./types";

export const RESEARCH_STORAGE_KEY = "serenity.research.v1";
export const RESEARCH_CHANGED = "serenity:research-changed";

const dateSchema = z.string().refine(value => Number.isFinite(Date.parse(value)));
const snapshotSchema = z.object({
  asOf: dateSchema,
  sources: z.array(z.object({
    key: z.string(), name: z.string(), stance: z.string(), claim: z.string(),
    date: dateSchema, change: z.string().nullable(), url: z.string().nullable(),
  })).max(100),
});
const recordSchema = z.object({
  note: z.string().max(10000),
  priority: z.enum(["low", "medium", "high"]),
  status: z.enum(["unreviewed", "researching", "complete", "paused"]),
  savedAt: dateSchema.nullable(),
  reviewedAt: dateSchema.nullable(),
  baseline: snapshotSchema.optional(),
});

export type ResearchRecord = z.infer<typeof recordSchema>;
export type ResearchRecords = Record<string, ResearchRecord>;
export const emptyResearch: ResearchRecord = {
  note: "", priority: "medium", status: "unreviewed", savedAt: null, reviewedAt: null,
};

export function parseResearch(raw: string | null): ResearchRecords {
  if (!raw) return {};
  try {
    const value: unknown = JSON.parse(raw);
    if (!value || typeof value !== "object" || Array.isArray(value)) return {};
    const result: ResearchRecords = {};
    for (const [ticker, data] of Object.entries(value).slice(0, 500)) {
      if (!/^[A-Z][A-Z0-9.-]{0,9}$/.test(ticker)) continue;
      const parsed = recordSchema.safeParse(data);
      if (parsed.success) result[ticker] = parsed.data;
    }
    return result;
  } catch {
    return {};
  }
}

/** setItem may throw (quota/private mode). Callers must only claim success after it returns. */
export function updateResearch(ticker: string, patch: Partial<ResearchRecord>) {
  if (!/^[A-Z][A-Z0-9.-]{0,9}$/.test(ticker)) throw new Error("Invalid ticker");
  const records = parseResearch(window.localStorage.getItem(RESEARCH_STORAGE_KEY));
  const record = recordSchema.parse({ ...emptyResearch, ...records[ticker], ...patch });
  records[ticker] = record;
  window.localStorage.setItem(RESEARCH_STORAGE_KEY, JSON.stringify(records));
  window.dispatchEvent(new Event(RESEARCH_CHANGED));
  return record;
}

export function saveResearch(ticker: string, research: TickerDetail["research"]) {
  return updateResearch(ticker, { ...research, savedAt: new Date().toISOString() });
}

export function markReviewed(ticker: string, snapshot: OpinionSnapshot) {
  return updateResearch(ticker, { baseline: snapshot, reviewedAt: new Date().toISOString() });
}
