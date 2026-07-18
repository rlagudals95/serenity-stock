export interface XPost {
  id: string;
  author_id: string;
  text: string;
  note_tweet?: { text?: string };
  created_at: string;
  conversation_id?: string;
  referenced_tweets?: Array<{
    id: string;
    type: "retweeted" | "quoted" | "replied_to";
  }>;
  public_metrics?: Record<string, number>;
}

export interface StoredPost {
  x_post_id: string;
  author_id: string;
  text: string;
  url: string;
  post_type: "original" | "reply" | "quote" | "repost";
  conversation_id: string | null;
  referenced_post_ids: string[];
  posted_at: string;
  metrics: Record<string, number>;
  raw: XPost;
}

export interface XPostPage {
  posts: StoredPost[];
  nextToken?: string;
}

interface XUser {
  id: string;
  username: string;
  name: string;
  public_metrics?: {
    followers_count?: number;
  };
}

interface XResponse<T> {
  data?: T;
  detail?: string;
  title?: string;
  errors?: Array<{ detail?: string; title?: string }>;
  meta?: {
    newest_id?: string;
    next_token?: string;
    result_count?: number;
  };
}

export function extractTickerCandidates(text: string) {
  const tickers = new Set<string>();
  for (const match of text.matchAll(/\$([A-Z][A-Z0-9.-]{0,9})\b/g)) {
    tickers.add(match[1]);
  }
  return [...tickers];
}

function postType(post: XPost): StoredPost["post_type"] {
  const references = post.referenced_tweets ?? [];
  if (references.some((reference) => reference.type === "retweeted")) {
    return "repost";
  }
  if (references.some((reference) => reference.type === "quoted")) {
    return "quote";
  }
  if (references.some((reference) => reference.type === "replied_to")) {
    return "reply";
  }
  return "original";
}

export function mapXPost(post: XPost, username: string): StoredPost {
  return {
    x_post_id: post.id,
    author_id: post.author_id,
    text: post.note_tweet?.text?.trim() || post.text,
    url: `https://x.com/${username}/status/${post.id}`,
    post_type: postType(post),
    conversation_id: post.conversation_id ?? null,
    referenced_post_ids: (post.referenced_tweets ?? []).map(
      (reference) => reference.id,
    ),
    posted_at: post.created_at,
    metrics: post.public_metrics ?? {},
    raw: post,
  };
}

async function xResponse<T>(
  url: URL,
  bearerToken: string,
): Promise<XResponse<T>> {
  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${bearerToken}`,
      "User-Agent": "serenity-investment-intelligence/0.1",
    },
    signal: AbortSignal.timeout(20_000),
  });
  const body = (await response.json()) as XResponse<T>;

  if (!response.ok) {
    const detail =
      body.detail ??
      body.errors?.[0]?.detail ??
      body.title ??
      body.errors?.[0]?.title;
    throw new Error(
      `X API request failed (${response.status})${detail ? `: ${detail}` : ""}`,
    );
  }

  return body;
}

async function xRequest<T>(
  url: URL,
  bearerToken: string,
  emptyValue?: T,
): Promise<T> {
  const body = await xResponse<T>(url, bearerToken);
  if (body.data !== undefined) return body.data;
  if (emptyValue !== undefined) return emptyValue;
  throw new Error("X API response did not include data.");
}

export function fetchXUser(username: string, bearerToken: string) {
  const url = new URL(
    `https://api.x.com/2/users/by/username/${encodeURIComponent(username)}`,
  );
  url.searchParams.set("user.fields", "id,name,username,public_metrics");
  return xRequest<XUser>(url, bearerToken);
}

export async function fetchXPostPage({
  userId,
  username,
  bearerToken,
  sinceId,
  startTime,
  endTime,
  paginationToken,
  pageSize,
}: {
  userId: string;
  username: string;
  bearerToken: string;
  sinceId?: string;
  startTime?: string;
  endTime?: string;
  paginationToken?: string;
  pageSize: number;
}): Promise<XPostPage> {
  const url = new URL(`https://api.x.com/2/users/${userId}/tweets`);
  url.searchParams.set(
    "max_results",
    String(Math.min(100, Math.max(10, pageSize))),
  );
  url.searchParams.set(
    "tweet.fields",
    [
      "id",
      "text",
      "author_id",
      "created_at",
      "conversation_id",
      "referenced_tweets",
      "public_metrics",
      "note_tweet",
    ].join(","),
  );
  if (sinceId) url.searchParams.set("since_id", sinceId);
  if (startTime) url.searchParams.set("start_time", startTime);
  if (endTime) url.searchParams.set("end_time", endTime);
  if (paginationToken) {
    url.searchParams.set("pagination_token", paginationToken);
  }

  const body = await xResponse<XPost[]>(url, bearerToken);
  return {
    posts: (body.data ?? []).map((post) => mapXPost(post, username)),
    nextToken: body.meta?.next_token,
  };
}

export async function fetchXPosts({
  userId,
  username,
  bearerToken,
  sinceId,
  startTime,
  endTime,
  maxResults,
}: {
  userId: string;
  username: string;
  bearerToken: string;
  sinceId?: string;
  startTime?: string;
  endTime?: string;
  maxResults: number;
}) {
  const postsById = new Map<string, StoredPost>();
  const seenPaginationTokens = new Set<string>();
  let paginationToken: string | undefined;

  while (postsById.size < maxResults) {
    const remaining = maxResults - postsById.size;
    const page = await fetchXPostPage({
      userId,
      username,
      bearerToken,
      sinceId,
      startTime,
      endTime,
      paginationToken,
      pageSize: remaining,
    });
    for (const post of page.posts) {
      postsById.set(post.x_post_id, post);
    }

    const nextToken = page.nextToken;
    if (!nextToken || postsById.size >= maxResults) break;
    if (seenPaginationTokens.has(nextToken)) {
      throw new Error("X API returned a repeated pagination token.");
    }
    seenPaginationTokens.add(nextToken);
    paginationToken = nextToken;
  }

  return [...postsById.values()].slice(0, maxResults);
}
