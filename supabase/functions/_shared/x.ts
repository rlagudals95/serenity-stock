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

export interface CursorTransition {
  sinceId: string | null;
  highWaterId: string | null;
  paginationToken: string | null;
  complete: boolean;
}

export function createRettiwtClient(apiKey: string): RettiwtClient {
  return new Rettiwt({
    apiKey,
    delay: 250,
    maxRetries: 5,
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
  bootstrap = false,
}: {
  previousSinceId: string | null;
  previousHighWaterId: string | null;
  pagePostIds: string[];
  nextToken?: string;
  bootstrap?: boolean;
}): CursorTransition {
  const highWaterId = chooseNewestPostId(pagePostIds, previousHighWaterId);
  if (nextToken && !bootstrap) {
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

export async function fetchRettiwtPostPage(
  client: RettiwtClient,
  {
    userId,
    username,
    sinceId,
    paginationToken,
    pageSize = 100,
  }: {
    userId: string;
    username: string;
    sinceId?: string;
    paginationToken?: string;
    pageSize?: number;
  },
): Promise<XPostPage> {
  const count = Math.min(20, Math.max(1, pageSize));
  const page = await client.user.replies(userId, count, paginationToken);
  const mapped = page.list
    .filter((post) => post.tweetBy.id === userId)
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
  const posts = mapped.filter(
    (post) =>
      !sinceId || compareSnowflakeIds(post.x_post_id, sinceId) > 0,
  );

  return {
    posts,
    nextToken: reachedSinceId ? undefined : page.next,
  };
}
