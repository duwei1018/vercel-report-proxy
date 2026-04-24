import type { Subscriber } from "./types";

/**
 * Storage adapter — tries Vercel KV first, falls back to a no-op logger so the
 * form works end-to-end even before admin provisions KV env vars.
 *
 * When admin adds `KV_REST_API_URL` + `KV_REST_API_TOKEN` to Vercel env, this
 * module automatically picks the real backend on cold start. No code change.
 *
 * Keys used:
 *   beta:subscriber:{email_lowercase}  → Subscriber JSON
 *   beta:all_subscribers               → Set of lowercased emails
 *
 * The fallback path logs the event server-side with a banner so prod logs make
 * clear "this email is NOT persisted yet" — admin sees it in Vercel logs if KV
 * is missing.
 */

type KVClient = {
  get: <T>(key: string) => Promise<T | null>;
  set: (key: string, value: unknown) => Promise<unknown>;
  del: (key: string) => Promise<unknown>;
  sadd: (key: string, ...members: string[]) => Promise<number>;
  srem: (key: string, ...members: string[]) => Promise<number>;
  scard: (key: string) => Promise<number>;
  smembers: (key: string) => Promise<string[]>;
};

let kvSingleton: KVClient | null | undefined;

async function getKV(): Promise<KVClient | null> {
  if (kvSingleton !== undefined) return kvSingleton;
  // Vercel KV client reads env vars at construction; only instantiate if present.
  if (!process.env.KV_REST_API_URL || !process.env.KV_REST_API_TOKEN) {
    kvSingleton = null;
    return null;
  }
  try {
    const mod = await import("@vercel/kv");
    kvSingleton = mod.kv as unknown as KVClient;
    return kvSingleton;
  } catch (err) {
    console.error("[beta-storage] @vercel/kv import failed:", err);
    kvSingleton = null;
    return null;
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
  persisted: boolean; // false when falling back to log-only
}

export async function addSubscriber(
  subscriber: Subscriber
): Promise<AddSubscriberResult> {
  const email = normalizeEmail(subscriber.email);
  const record: Subscriber = { ...subscriber, email };
  const kv = await getKV();

  if (!kv) {
    // Fallback: log only. Status is always "new" since we have no dedup backend.
    console.warn(
      `[beta-storage] KV NOT CONFIGURED — subscriber NOT persisted: ${email}`,
      { watchlist: record.watchlist, subscribedAt: record.subscribedAt }
    );
    return { status: "new", persisted: false };
  }

  const existing = await kv.get<Subscriber>(subscriberKey(email));
  if (existing) {
    return { status: "existing", persisted: true };
  }
  await kv.set(subscriberKey(email), record);
  await kv.sadd(ALL_KEY, email);
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
  const kv = await getKV();
  if (!kv) {
    console.warn(
      `[beta-storage] KV NOT CONFIGURED — unsubscribe NOT persisted: ${normalizeEmail(email)}`
    );
    return { status: "not_found", persisted: false };
  }
  const existing = await kv.get<Subscriber>(key);
  if (!existing) {
    return { status: "not_found", persisted: true };
  }
  await kv.del(key);
  await kv.srem(ALL_KEY, normalizeEmail(email));
  return { status: "removed", persisted: true };
}

export async function countSubscribers(): Promise<number | null> {
  const kv = await getKV();
  if (!kv) return null;
  return kv.scard(ALL_KEY);
}

/**
 * List all active subscribers. Null return signals "KV not configured"; caller
 * must treat that as a refusal to fan-out, not an empty list.
 *
 * There is no "unsubscribed" flag — removeSubscriber deletes the record, so
 * anyone present here is by definition active.
 */
export async function listAllSubscribers(): Promise<Subscriber[] | null> {
  const kv = await getKV();
  if (!kv) return null;
  const emails = (await (kv as unknown as {
    smembers: (k: string) => Promise<string[]>;
  }).smembers(ALL_KEY)) ?? [];
  const out: Subscriber[] = [];
  for (const email of emails) {
    const rec = await kv.get<Subscriber>(subscriberKey(email));
    if (rec) out.push(rec);
  }
  return out;
}

export function isStorageConfigured(): boolean {
  return (
    !!process.env.KV_REST_API_URL && !!process.env.KV_REST_API_TOKEN
  );
}
