"use server";

import { headers } from "next/headers";
import {
  addSubscriber,
  isValidEmail,
  sendWelcomeEmail,
} from "@/lib/beta";
import type { SubscribeResult } from "@/lib/beta";

function siteBaseUrl(proto: string | null, host: string | null): string {
  // Vercel sets x-forwarded-* on every request. Fall back to r.siwuya.org so
  // email links are valid even if we're called from a CLI smoke test.
  if (host) {
    const protocol = proto || "https";
    return `${protocol}://${host}`;
  }
  return "https://r.siwuya.org";
}

export async function subscribeToBeta(
  _prev: SubscribeResult | null,
  formData: FormData
): Promise<SubscribeResult> {
  const rawEmail = formData.get("email");
  const rawWatchlist = formData.get("watchlist");

  if (!isValidEmail(rawEmail)) {
    return {
      ok: false,
      reason: "invalid_email",
      message: "邮箱格式看起来不对,麻烦再检查一下。",
    };
  }
  const email = (rawEmail as string).trim().toLowerCase();
  const watchlist =
    typeof rawWatchlist === "string" && rawWatchlist.trim()
      ? rawWatchlist.trim().slice(0, 500)
      : undefined;

  try {
    const hdr = await headers();
    const baseUrl = siteBaseUrl(
      hdr.get("x-forwarded-proto"),
      hdr.get("x-forwarded-host") ?? hdr.get("host")
    );

    const storeResult = await addSubscriber({
      email,
      subscribedAt: new Date().toISOString(),
      watchlist,
      source: "beta-landing",
    });

    if (storeResult.status === "existing") {
      // 重复订阅不报错,也不重发欢迎邮件(spec 3.7)。
      return { ok: true, status: "existing" };
    }

    // First-time (or not-yet-persisted) subscriber → try welcome email.
    // Failures don't block the success response — we already accepted the address.
    const sendResult = await sendWelcomeEmail({ email, watchlist, siteBaseUrl: baseUrl });
    if (!sendResult.sent) {
      console.warn(
        `[beta/subscribe] welcome email not sent (provider=${sendResult.provider}) for ${email}: ${sendResult.error ?? "no api key"}`
      );
    }

    return { ok: true, status: "new" };
  } catch (err) {
    console.error("[beta/subscribe] unexpected error:", err);
    return {
      ok: false,
      reason: "internal_error",
      message: "系统临时有点问题,稍后再试一下,或来信 report@siwuya.org。",
    };
  }
}
