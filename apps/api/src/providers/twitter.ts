import { getEnv } from '../config/env.js';

interface Tweet {
  id: string;
  text: string;
  created_at: string;
  author_id: string;
  attachments?: { media_keys?: string[] };
}

interface TwitterResponse {
  data?: Tweet[];
  includes?: { media?: { media_key: string; url?: string; preview_image_url?: string }[] };
  meta?: { newest_id?: string; result_count?: number };
}

/**
 * Fetch recent tweets from a Twitter user using X API v2.
 * Returns tweets newer than sinceId if provided.
 */
export async function fetchUserTweets(
  userId: string,
  sinceId?: string | null,
  maxResults = 10
): Promise<{ tweets: Tweet[]; mediaMap: Map<string, string> }> {
  const env = getEnv();

  const params = new URLSearchParams({
    'tweet.fields': 'created_at,attachments',
    'expansions': 'attachments.media_keys',
    'media.fields': 'url,preview_image_url',
    'max_results': String(maxResults),
  });

  if (sinceId) params.set('since_id', sinceId);

  const url = `https://api.twitter.com/2/users/${userId}/tweets?${params}`;

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${env.X_API_BEARER_TOKEN}` },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`X API error ${res.status}: ${text}`);
  }

  const data = (await res.json()) as TwitterResponse;

  const mediaMap = new Map<string, string>();
  if (data.includes?.media) {
    for (const m of data.includes.media) {
      const imageUrl = m.url ?? m.preview_image_url;
      if (imageUrl) mediaMap.set(m.media_key, imageUrl);
    }
  }

  return {
    tweets: data.data ?? [],
    mediaMap,
  };
}

/**
 * Lookup a Twitter user ID by handle.
 */
export async function lookupUserId(handle: string): Promise<string | null> {
  const env = getEnv();
  const url = `https://api.twitter.com/2/users/by/username/${handle}`;

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${env.X_API_BEARER_TOKEN}` },
  });

  if (!res.ok) return null;

  const data = (await res.json()) as { data?: { id: string } };
  return data.data?.id ?? null;
}
