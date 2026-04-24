import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Unsubscribe token scheme:
 *   token = hex(HMAC_SHA256(SECRET, email.toLowerCase()))
 *
 * We do NOT encode email into the token — the email is carried in the URL
 * query alongside. That keeps tokens short and lets the server rebuild the
 * signature without guessing which email was signed.
 *
 * Fallback mode (no BETA_UNSUBSCRIBE_SECRET env var): use a fixed dev secret
 * "siwuya-dev-secret-DO-NOT-USE-IN-PROD" so the feature still works in dev
 * and a future rotation is just an env-var change. In production, admin must
 * set the real secret before any live subscriber lands.
 */

const DEV_FALLBACK_SECRET = "siwuya-dev-secret-DO-NOT-USE-IN-PROD";

function getSecret(): string {
  const secret = process.env.BETA_UNSUBSCRIBE_SECRET;
  if (secret && secret.length >= 16) return secret;
  return DEV_FALLBACK_SECRET;
}

export function signUnsubscribeToken(email: string): string {
  return createHmac("sha256", getSecret())
    .update(email.trim().toLowerCase())
    .digest("hex");
}

export function verifyUnsubscribeToken(email: string, token: string): boolean {
  const expected = signUnsubscribeToken(email);
  if (expected.length !== token.length) return false;
  try {
    return timingSafeEqual(Buffer.from(expected, "hex"), Buffer.from(token, "hex"));
  } catch {
    return false;
  }
}
