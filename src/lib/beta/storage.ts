import type { Subscriber } from "./types";

/**
 * Storage adapter — uses node-redis against Vercel's Redis Marketplace
 * integration (Redis Inc.). Reads the single `REDIS_URL` env var that the
 * integration auto-injects.
 *
 * Falls back to a no-op logger so the form still works end-to-end before admin
 * provisions Redis. When Redis is available on cold start, this module picks
 * the real backend automatically; no code change when env appears.
 *
 * Previous implementation used `@vercel/kv` which requires
 * `KV_REST_API_URL` + `KV_REST_API_TOKEN`. The current 2026 Vercel Redis
 * Marketplace only provides `REDIS_URL` (TCP) — switched to node-redis.
 *
 * Keys used:
 *   beta:subscriber:{email_lowercase}  → Subscriber JSON
 *   beta:all_subscribers               → Set of lowercased emails
 */

type RedisClient = {
  get: (key: string) => Promise<string | null>;
  set: (key: string, value: string) => Promise<unknown>;
  del: (key: string) => Promise<number>;
  sAdd: (key: string, member: string) => Promise<number>;
  sRem: (key: string, member: string) => Promise<number>;
  sCard: (key: string) => Promise<number>;
  sMembers: (key: string) => Promise<string[]>;
  isReady: boolean;
  connect: () => Promise<unknown>;
};

let clientSingleton: RedisClient | null | undefined;
let connectPromise: Promise<unknown> | null = null;

async function getRedis(): Promise<RedisClient | null> {
  if (clientSingleton !== undefined) {
    if (clientSingleton && !clientSingleton.isReady) {
      // Reconnect if the socket dropped between invocations.
      try {
        if (!connectPromise) connectPromise = clientSingleton.connect();
        await connectPromise;
      } catch (err) {
        console.error("[beta-storage] Redis reconnect failed:", err);
        clientSingleton = null;
      } finally {
        connectPromise = null;
      }
    }
    return clientSingleton;
  }

  const url = process.env.REDIS_URL;
  if (!url) {
    clientSingleton = null;
    return null;
  }

  try {
    const { createClient } = await import("redis");
    const client = createClient({
      url,
      socket: {
        connectTimeout: 5_000,
        reconnectStrategy: (retries) => Math.min(retries * 50, 500),
      },
    });
    client.on("error", (err) => {
      console.error("[beta-storage] Redis client error:", err);
    });
    connectPromise = client.connect();
    await connectPromise;
    clientSingleton = client as unknown as RedisClient;
    return clientSingleton;
  } catch (err) {
    console.error("[beta-storage] Redis client init failed:", err);
    clientSingleton = null;
    return null;
  } finally {
    connectPromise = null;
  }
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function subscriberKey(email: string): string {
  return `beta:subscriber:${normalizeEmail(email)}`;
}

const ALL_KEY = "beta:all_subscribers";

export interface AddSubscriberResult {
  status: "new" | "existing";
  persisted: boolean;
}

export async function addSubscriber(
  subscriber: Subscriber
): Promise<AddSubscriberResult> {
  const email = normalizeEmail(subscriber.email);
  const record: Subscriber = { ...subscriber, email };
  const redis = await getRedis();

  if (!redis) {
    console.warn(
      `[beta-storage] Redis NOT CONFIGURED — subscriber NOT persisted: ${email}`,
      { watchlist: record.watchlist, subscribedAt: record.subscribedAt }
    );
    return { status: "new", persisted: false };
  }

  const existing = await redis.get(subscriberKey(email));
  if (existing) {
    return { status: "existing", persisted: true };
  }
  await redis.set(subscriberKey(email), JSON.stringify(record));
  await redis.sAdd(ALL_KEY, email);
  return { status: "new", persisted: true };
}

export interface RemoveSubscriberResult {
  status: "removed" | "not_found";
  persisted: boolean;
}

export async function removeSubscriber(
  email: string
): Promise<RemoveSubscriberResult> {
  const key = subscriberKey(email);
  const redis = await getRedis();
  if (!redis) {
    console.warn(
      `[beta-storage] Redis NOT CONFIGURED — unsubscribe NOT persisted: ${normalizeEmail(email)}`
    );
    return { status: "not_found", persisted: false };
  }
  const existing = await redis.get(key);
  if (!existing) {
    return { status: "not_found", persisted: true };
  }
  await redis.del(key);
  await redis.sRem(ALL_KEY, normalizeEmail(email));
  return { status: "removed", persisted: true };
}

export async function countSubscribers(): Promise<number | null> {
  const redis = await getRedis();
  if (!redis) return null;
  return redis.sCard(ALL_KEY);
}

/**
 * List all active subscribers. Null return signals "Redis not configured";
 * caller must treat that as a refusal to fan-out, not an empty list.
 */
export async function listAllSubscribers(): Promise<Subscriber[] | null> {
  const redis = await getRedis();
  if (!redis) return null;
  const emails = (await redis.sMembers(ALL_KEY)) ?? [];
  const out: Subscriber[] = [];
  for (const email of emails) {
    const raw = await redis.get(subscriberKey(email));
    if (!raw) continue;
    try {
      out.push(JSON.parse(raw) as Subscriber);
    } catch (err) {
      console.warn(
        `[beta-storage] Corrupt subscriber JSON skipped for ${email}:`,
        err
      );
    }
  }
  return out;
}

export function isStorageConfigured(): boolean {
  return !!process.env.REDIS_URL;
}
