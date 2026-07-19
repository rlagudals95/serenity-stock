import {
  parseAnalysisPayload,
  type AnalysisPayload,
} from "./analysis-schema.ts";
import type { StoredPost } from "./x.ts";

interface DeepSeekResponse {
  choices?: Array<{ message?: { content?: string | null } }>;
  usage?: {
    prompt_tokens?: number;
    completion_tokens?: number;
  };
  error?: { message?: string };
  [key: string]: unknown;
}

export interface DeepSeekAnalysis {
  payload: AnalysisPayload;
  rawResponse: DeepSeekResponse;
  inputTokens: number | null;
  outputTokens: number | null;
}

const systemPrompt = `You analyze public X posts by growth-stock analysts, including Serenity (@aleabitoreddit) and Shay Boloor (@StockSavvyShay).
Return only one JSON object. Analyze investment opinions at the post-ticker level.

Required JSON:
{
  "relevance": "relevant|partial|irrelevant",
  "summary_ko": "Korean summary or null",
  "themes": ["snake_case_theme"],
  "is_noise": false,
  "ticker_analyses": [{
    "ticker": "US listed ticker",
    "company_name": "official company name",
    "stance": "bullish|bearish|mixed|neutral|unknown",
    "claim_type": "thesis|valuation|growth|earnings|catalyst|risk|technical|positioning|other",
    "claim": "Korean claim or null",
    "evidence_from_post": ["exact verbatim excerpt from the supplied post"],
    "risks_mentioned": ["Korean risk explicitly grounded in the post"],
    "catalysts_mentioned": ["Korean catalyst explicitly grounded in the post"],
    "conviction": "low|medium|high|unknown",
    "novelty": "new|updated|repeated|unknown",
    "ticker_confidence": 0.0,
    "stance_confidence": 0.0,
    "review_status": "auto|needs_review|rejected",
    "review_reason": "ticker|stance|claim|other|null",
    "change_type": "first_mention|new_claim|new_risk|stance_change|repeat|unclear|null",
    "change_summary": "Korean change summary or null"
  }]
}

Do not invent ticker symbols, claims, risks, catalysts, or evidence. Every evidence string must be copied exactly from the supplied source text. Treat each author's history independently when classifying a first mention or viewpoint change. Do not attribute a quoted post's view to the author unless the supplied text clearly endorses it. Return at most one ticker_analyses item per ticker and no more than 25 items. If there is no investable company opinion, return an empty ticker_analyses array.`;

export function parseDeepSeekContent(content: string): unknown {
  const normalized = content
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/, "");
  return JSON.parse(normalized);
}

async function requestAnalysis({
  apiKey,
  model,
  post,
  candidates,
  correction,
}: {
  apiKey: string;
  model: string;
  post: StoredPost;
  candidates: string[];
  correction?: string;
}) {
  const response = await fetch("https://api.deepseek.com/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: systemPrompt },
        {
          role: "user",
          content: JSON.stringify({
            source: "x",
            author: `@${post.author_username ?? "unknown"}`,
            post_type: post.post_type,
            posted_at: post.posted_at,
            explicit_ticker_candidates: candidates,
            source_text: post.text,
            correction: correction ?? undefined,
          }),
        },
      ],
      response_format: { type: "json_object" },
      thinking: { type: "disabled" },
      temperature: 0.1,
      max_tokens: 8_000,
      stream: false,
    }),
    signal: AbortSignal.timeout(120_000),
  });
  const body = (await response.json()) as DeepSeekResponse;
  if (!response.ok) {
    throw new Error(
      `DeepSeek request failed (${response.status}): ${body.error?.message ?? "unknown error"}`,
    );
  }
  return body;
}

export async function analyzePostWithDeepSeek({
  apiKey,
  model,
  post,
  candidates,
}: {
  apiKey: string;
  model: string;
  post: StoredPost;
  candidates: string[];
}): Promise<DeepSeekAnalysis> {
  let correction: string | undefined;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const rawResponse = await requestAnalysis({
      apiKey,
      model,
      post,
      candidates,
      correction,
    });
    const content = rawResponse.choices?.[0]?.message?.content;
    if (!content) throw new Error("DeepSeek returned an empty analysis.");

    try {
      return {
        payload: parseAnalysisPayload(parseDeepSeekContent(content), post.text),
        rawResponse,
        inputTokens: rawResponse.usage?.prompt_tokens ?? null,
        outputTokens: rawResponse.usage?.completion_tokens ?? null,
      };
    } catch (error) {
      if (attempt === 1) throw error;
      correction =
        error instanceof Error
          ? `Previous output failed validation: ${error.message}. Return corrected JSON only.`
          : "Previous output failed validation. Return corrected JSON only.";
    }
  }
  throw new Error("DeepSeek analysis failed validation.");
}
