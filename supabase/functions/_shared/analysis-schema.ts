import { z } from "zod";

function boundedStringArray(maximum: number) {
  return z
    .array(z.string().trim().min(1))
    .transform((values) => [...new Set(values)].slice(0, maximum));
}

const tickerAnalysisSchema = z.object({
  ticker: z
    .string()
    .trim()
    .transform((ticker) => ticker.toUpperCase())
    .pipe(z.string().regex(/^[A-Z][A-Z0-9.-]{0,9}$/)),
  company_name: z.string().trim().min(1),
  stance: z.enum(["bullish", "bearish", "mixed", "neutral", "unknown"]),
  claim_type: z.enum([
    "thesis",
    "valuation",
    "growth",
    "earnings",
    "catalyst",
    "risk",
    "technical",
    "positioning",
    "other",
  ]),
  claim: z.string().trim().nullable(),
  evidence_from_post: boundedStringArray(5),
  risks_mentioned: boundedStringArray(5),
  catalysts_mentioned: boundedStringArray(5),
  conviction: z.enum(["low", "medium", "high", "unknown"]),
  novelty: z.enum(["new", "updated", "repeated", "unknown"]),
  ticker_confidence: z.number().min(0).max(1),
  stance_confidence: z.number().min(0).max(1),
  review_status: z.enum(["auto", "approved", "needs_review", "rejected"]),
  review_reason: z
    .enum(["ticker", "stance", "claim", "other"])
    .nullable()
    .default(null),
  change_type: z
    .enum([
      "first_mention",
      "new_claim",
      "new_risk",
      "stance_change",
      "repeat",
      "unclear",
    ])
    .nullable(),
  change_summary: z.string().trim().nullable(),
});

const analysisPayloadSchema = z.object({
  relevance: z.enum(["relevant", "partial", "irrelevant"]),
  summary_ko: z.string().trim().nullable(),
  themes: boundedStringArray(10),
  is_noise: z.boolean(),
  ticker_analyses: z
    .array(tickerAnalysisSchema)
    .transform((values) =>
      [...new Map(values.map((value) => [value.ticker, value])).values()].slice(
        0,
        25,
      ),
    ),
});

export type AnalysisPayload = z.infer<typeof analysisPayloadSchema>;

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function flexibleTextPattern(value: string) {
  return value
    .trim()
    .split(/\s+/)
    .map(escapeRegExp)
    .join("\\s+(?:[-*•]\\s+)?");
}

function findExactSourceExcerpt(sourceText: string, evidence: string) {
  if (sourceText.includes(evidence)) return evidence;

  const evidenceSegments = evidence
    .split(/\s*(?:\.{3}|…)\s*/u)
    .map((segment) => segment.trim())
    .filter(Boolean);
  const whitespaceFlexiblePattern = evidenceSegments
    .map(flexibleTextPattern)
    .join("[\\s\\S]{1,240}?");
  const match = sourceText.match(new RegExp(whitespaceFlexiblePattern, "iu"));
  return match?.[0] ?? null;
}

export function parseAnalysisPayload(input: unknown, sourceText: string) {
  const parsed = analysisPayloadSchema.parse(input);
  for (const analysis of parsed.ticker_analyses) {
    const groundedEvidence = analysis.evidence_from_post
      .map((evidence) => findExactSourceExcerpt(sourceText, evidence))
      .filter((evidence): evidence is string => Boolean(evidence));
    if (groundedEvidence.length < analysis.evidence_from_post.length) {
      analysis.review_status = "needs_review";
      analysis.review_reason ??= "claim";
    }
    analysis.evidence_from_post = groundedEvidence;
  }
  return parsed;
}
