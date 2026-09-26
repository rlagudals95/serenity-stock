"use client";

export type ProductEventName = "candidate_open" | "evidence_open" | "watchlist_saved" | "review_saved" | "change_open" | "change_reviewed";
export const PRODUCT_EVENTS_KEY = "serenity.events.v1";

/** Browser-local, bounded event queue. No notes, raw posts, credentials, or external transmission. */
export function trackProductEvent(name: ProductEventName, ticker: string, surface: string) {
  try {
    const raw: unknown = JSON.parse(localStorage.getItem(PRODUCT_EVENTS_KEY) ?? "[]");
    const events = Array.isArray(raw) ? raw.slice(-249) : [];
    const event = { name, ticker, surface, at: new Date().toISOString(), version: "briefing-a" };
    localStorage.setItem(PRODUCT_EVENTS_KEY, JSON.stringify([...events, event]));
    window.dispatchEvent(new CustomEvent("serenity:product-event", { detail: event }));
  } catch {
    // Measurement must never block research or saving.
  }
}
