export interface Subscriber {
  email: string;
  subscribedAt: string; // ISO 8601
  watchlist?: string; // 用户自述,非结构化
  source?: string; // "beta-landing" | future referrers
  unsubscribedAt?: string;
}

export type SubscribeResult =
  | { ok: true; status: "new" | "existing" }
  | {
      ok: false;
      reason: "invalid_email" | "internal_error";
      message: string;
    };

export type UnsubscribeResult =
  | { ok: true; status: "removed" | "not_found" }
  | {
      ok: false;
      reason: "invalid_token" | "internal_error";
      message: string;
    };
