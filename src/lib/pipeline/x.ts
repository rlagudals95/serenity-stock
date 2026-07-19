import { Rettiwt } from "rettiwt-api";

export interface RettiwtUser {
  id: string;
  userName: string;
}

export interface RettiwtTweet {
  id: string;
  fullText: string;
  createdAt: string;
  conversationId: string;
  tweetBy: RettiwtUser;
  url?: string;
  likeCount?: number;
  replyCount?: number;
  retweetCount?: number;
  viewCount?: number;
  quoteCount?: number;
  bookmarkCount?: number;
  replyTo?: string;
  quoted?: { id: string };
  retweetedTweet?: { id: string };
  toJSON?: () => Record<string, unknown>;
}

interface RettiwtTimelinePage {
  list: RettiwtTweet[];
  next?: string;
}

export interface RettiwtClient {
  user: {
    details(username: string): Promise<RettiwtUser | undefined>;
    replies(
      userId: string,
      count?: number,
      cursor?: string,
    ): Promise<RettiwtTimelinePage>;
  };
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
  raw: Record<string, unknown>;
}

export interface XPostPage {
  posts: StoredPost[];
  nextToken?: string;
}

export function createRettiwtClient(apiKey: string): RettiwtClient {
  return new Rettiwt({
    apiKey,
    delay: 250,
    maxRetries: 2,
    timeout: 20_000,
  }) as unknown as RettiwtClient;
}

export function extractTickerCandidates(text: string) {
  const tickers = new Set<string>();
  for (const match of text.matchAll(/\$([A-Z][A-Z0-9.-]{0,9})\b/g)) {
    tickers.add(match[1]);
  }
  return [...tickers];
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

function metrics(tweet: RettiwtTweet) {
  const entries = [
    ["like_count", tweet.likeCount],
    ["reply_count", tweet.replyCount],
    ["retweet_count", tweet.retweetCount],
    ["view_count", tweet.viewCount],
    ["quote_count", tweet.quoteCount],
    ["bookmark_count", tweet.bookmarkCount],
  ] as const;

  const result: Record<string, number> = {};
  for (const [key, value] of entries) {
    if (typeof value === "number") result[key] = value;
  }
  return result;
}

function rawTweet(tweet: RettiwtTweet) {
  const value = tweet.toJSON?.() ?? tweet;
  return JSON.parse(JSON.stringify(value)) as Record<string, unknown>;
}

export function mapRettiwtTweet(
  tweet: RettiwtTweet,
  username: string,
): StoredPost {
  const referencedPostIds = [
    tweet.retweetedTweet?.id,
    tweet.quoted?.id,
    tweet.replyTo,
  ].filter((id): id is string => Boolean(id));

  return {
    x_post_id: tweet.id,
    author_id: tweet.tweetBy.id,
    author_username: username,
    text: tweet.fullText,
    url: `https://x.com/${username}/status/${tweet.id}`,
    post_type: tweet.retweetedTweet
      ? "repost"
      : tweet.quoted
        ? "quote"
        : tweet.replyTo
          ? "reply"
          : "original",
    conversation_id: tweet.conversationId || null,
    referenced_post_ids: [...new Set(referencedPostIds)],
    posted_at: tweet.createdAt,
    metrics: metrics(tweet),
    raw: rawTweet(tweet),
  };
}

export async function fetchRettiwtUser(
  client: RettiwtClient,
  username: string,
) {
  const user = await client.user.details(username);
  if (!user?.id) {
    throw new Error(`Rettiwt did not return a profile for @${username}.`);
  }
  return { id: user.id, username: user.userName || username };
}

export async function fetchRettiwtPostPage(
  client: RettiwtClient,
  {
    userId,
    username,
    sinceId,
    startTime,
    endTime,
    paginationToken,
    pageSize = 100,
  }: {
    userId: string;
    username: string;
    sinceId?: string;
    startTime?: string;
    endTime?: string;
    paginationToken?: string;
    pageSize?: number;
  },
): Promise<XPostPage> {
  const count = Math.min(20, Math.max(1, pageSize));
  const page = await client.user.replies(userId, count, paginationToken);
  const mapped = page.list
    .map((post) => mapRettiwtTweet(post, username))
    .sort((left, right) =>
      compareSnowflakeIds(right.x_post_id, left.x_post_id)
    );

  if (sinceId && !paginationToken && mapped.length > 0) {
    const newestId = mapped[0].x_post_id;
    if (compareSnowflakeIds(newestId, sinceId) < 0) {
      throw new Error(
        `Rettiwt timeline for @${username} is older than stored cursor ${sinceId}.`,
      );
    }
  }

  const reachedSinceId = sinceId
    ? mapped.some((post) => compareSnowflakeIds(post.x_post_id, sinceId) <= 0)
    : false;
  const reachedStartTime = startTime
    ? mapped.some((post) => post.posted_at < startTime)
    : false;
  const posts = mapped.filter((post) => {
    if (sinceId && compareSnowflakeIds(post.x_post_id, sinceId) <= 0) {
      return false;
    }
    if (startTime && post.posted_at < startTime) return false;
    if (endTime && post.posted_at > endTime) return false;
    return true;
  });

  return {
    posts,
    nextToken: reachedSinceId || reachedStartTime ? undefined : page.next,
  };
}

export async function fetchRettiwtPosts(
  client: RettiwtClient,
  {
    userId,
    username,
    sinceId,
    startTime,
    endTime,
    maxResults,
  }: {
    userId: string;
    username: string;
    sinceId?: string;
    startTime?: string;
    endTime?: string;
    maxResults: number;
  },
) {
  const postsById = new Map<string, StoredPost>();
  const seenPaginationTokens = new Set<string>();
  let paginationToken: string | undefined;

  while (postsById.size < maxResults) {
    const remaining = maxResults - postsById.size;
    const page = await fetchRettiwtPostPage(client, {
      userId,
      username,
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
      throw new Error("Rettiwt returned a repeated timeline cursor.");
    }
    seenPaginationTokens.add(nextToken);
    paginationToken = nextToken;
  }

  return [...postsById.values()].slice(0, maxResults);
}
