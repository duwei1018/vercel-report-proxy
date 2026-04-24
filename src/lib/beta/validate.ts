/**
 * Minimal RFC-5321-ish email validator. We deliberately don't pull zod or
 * validator.js — this runs per-submit at internet scale, and a regex plus a
 * few boundary checks is plenty for an address we're about to show to the user
 * if it's invalid.
 *
 * Accepts: local@domain.tld (1+ char local, dot-containing domain)
 * Rejects: missing @, leading/trailing dots, empty parts, > 254 total, > 64 local
 */
const EMAIL_RE =
  /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]*[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]*[a-zA-Z0-9])?)+$/;

export function isValidEmail(raw: unknown): raw is string {
  if (typeof raw !== "string") return false;
  const s = raw.trim();
  if (s.length < 6 || s.length > 254) return false;
  const at = s.indexOf("@");
  if (at < 1 || at > 64) return false;
  if (s.includes("..")) return false;
  if (s.startsWith(".") || s.endsWith(".")) return false;
  return EMAIL_RE.test(s);
}
