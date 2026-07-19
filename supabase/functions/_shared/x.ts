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
  author_username?: string;
  text: string;
  url: string;
  post_type: "original" | "reply" | "quote" | "repost";
  conversation_id: string | null;
  referenced_post_ids: string[];
  posted_at: string;
  metrics: Record<string, number>;
  raw: XPost;
}

interface XResponse<T> {
  data?: T;
  detail?: string;
  title?: string;
  errors?: Array<{ detail?: string; title?: string }>;
  meta?: {
    next_token?: string;
  };
}

interface XUser {
  id: string;
  username: string;
}

export interface XPostPage {
  posts: StoredPost[];
  nextToken?: string;
}

export interface CursorTransition {
  sinceId: string | null;
  highWaterId: string | null;
  paginationToken: string | null;
  complete: boolean;
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
    author_username: username,
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

export async function fetchXUser(
  username: string,
  bearerToken: string,
): Promise<XUser> {
  const url = new URL(
    `https://api.x.com/2/users/by/username/${encodeURIComponent(username)}`,
  );
  url.searchParams.set("user.fields", "id,username");
  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${bearerToken}`,
      "User-Agent": "serenity-investment-intelligence/0.1",
    },
    signal: AbortSignal.timeout(20_000),
  });
  const body = (await response.json()) as XResponse<XUser>;
  if (!response.ok) {
    const detail =
      body.detail ??
      body.errors?.[0]?.detail ??
      body.title ??
      body.errors?.[0]?.title ??
      "unknown error";
    throw new Error(`X API request failed (${response.status}): ${detail}`);
  }
  if (!body.data?.id) {
    throw new Error(`X user lookup did not return an id for @${username}.`);
  }
  return body.data;
}

function compareSnowflakeIds(left: string, right: string) {
  try {
    const leftId = BigInt(left);
    const rightId = BigInt(right);
    return leftId === rightId ? 0 : leftId > rightId ? 1 : -1;
  } catch {
    return left.localeCompare(right);
  }
}

export function chooseNewestPostId(
  postIds: string[],
  current: string | null = null,
) {
  return postIds.reduce<string | null>(
    (newest, postId) =>
      !newest || compareSnowflakeIds(postId, newest) > 0 ? postId : newest,
    current,
  );
}

export function nextCursorState({
  previousSinceId,
  previousHighWaterId,
  pagePostIds,
  nextToken,
}: {
  previousSinceId: string | null;
  previousHighWaterId: string | null;
  pagePostIds: string[];
  nextToken?: string;
}): CursorTransition {
  const highWaterId = chooseNewestPostId(pagePostIds, previousHighWaterId);
  if (nextToken) {
    return {
      sinceId: previousSinceId,
      highWaterId,
      paginationToken: nextToken,
      complete: false,
    };
  }
  return {
    sinceId: highWaterId ?? previousSinceId,
    highWaterId: null,
    paginationToken: null,
    complete: true,
  };
}

export async function fetchXPostPage({
  userId,
  username,
  bearerToken,
  sinceId,
  paginationToken,
  pageSize = 100,
}: {
  userId: string;
  username: string;
  bearerToken: string;
  sinceId?: string;
  paginationToken?: string;
  pageSize?: number;
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
  if (paginationToken) {
    url.searchParams.set("pagination_token", paginationToken);
  }

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${bearerToken}`,
      "User-Agent": "serenity-investment-intelligence/0.1",
    },
    signal: AbortSignal.timeout(20_000),
  });
  const body = (await response.json()) as XResponse<XPost[]>;
  if (!response.ok) {
    const detail =
      body.detail ??
      body.errors?.[0]?.detail ??
      body.title ??
      body.errors?.[0]?.title ??
      "unknown error";
    throw new Error(`X API request failed (${response.status}): ${detail}`);
  }

  return {
    posts: (body.data ?? []).map((post) => mapXPost(post, username)),
    nextToken: body.meta?.next_token,
  };
}
