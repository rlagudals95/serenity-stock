import { sourceHref, type OpinionSnapshot } from "./briefing-model";
import type { Opinion } from "./types";

/** One latest view per person; repeated posts never become extra votes. */
export function latestInfluencerViews(snapshot: OpinionSnapshot) {
  const latest = new Map<string, OpinionSnapshot["sources"][number]>();
  const timestamp = (date: string) => Date.parse(date) || 0;
  for (const source of snapshot.sources) {
    const previous = latest.get(source.key);
    if (!previous || timestamp(source.date) > timestamp(previous.date)) {
      latest.set(source.key, { ...source, claim: source.claim.trim(), url: sourceHref(source.url) });
    }
  }
  return [...latest.values()].sort((a, b) => timestamp(b.date) - timestamp(a.date));
}

export function supportingInfluencers(snapshot: OpinionSnapshot) {
  return latestInfluencerViews(snapshot).filter(source => source.stance === "bullish" && source.claim && source.url);
}

/** Do not attach another post's evidence to a person's latest claim. */
export function matchingOpinion(source: OpinionSnapshot["sources"][number], opinions: Opinion[]) {
  if (!source.url) return undefined;
  return opinions.find(opinion => opinion.analyst.key === source.key && sourceHref(opinion.sourceUrl) === source.url && opinion.claim.trim() === source.claim);
}

export function influencerInitials(name: string) {
  return name.trim().split(/\s+/).slice(0, 2).map(part => part[0]).join("").toUpperCase();
}
