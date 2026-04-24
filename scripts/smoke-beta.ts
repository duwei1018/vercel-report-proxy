/**
 * Smoke test for Phase 3 adapters — storage, email, tokens, email validator.
 * Runs without KV or RESEND_API_KEY: exercises the fallback paths.
 *
 *   npm run smoke:beta
 */
import {
  isValidEmail,
  signUnsubscribeToken,
  verifyUnsubscribeToken,
  addSubscriber,
  removeSubscriber,
  sendWelcomeEmail,
  isStorageConfigured,
  isEmailConfigured,
} from "../src/lib/beta";

let passed = 0;
let failed = 0;
function assert(cond: unknown, label: string): void {
  if (cond) {
    console.log(`  PASS  ${label}`);
    passed++;
  } else {
    console.error(`  FAIL  ${label}`);
    failed++;
  }
}

async function main() {
  console.log("[1] isValidEmail");
  assert(isValidEmail("foo@bar.com"), "simple email");
  assert(isValidEmail("user.name+tag@example.co.uk"), "plus-and-dots email");
  assert(!isValidEmail(""), "empty rejected");
  assert(!isValidEmail("foo"), "no @ rejected");
  assert(!isValidEmail("foo@bar"), "no TLD rejected");
  assert(!isValidEmail("..foo@bar.com"), "leading dot rejected");
  assert(!isValidEmail("foo@.com"), "@ followed by dot rejected");
  assert(!isValidEmail(123 as unknown), "non-string rejected");

  console.log("[2] signUnsubscribeToken / verifyUnsubscribeToken");
  const email = "test@example.com";
  const tok = signUnsubscribeToken(email);
  assert(tok.length === 64, "sha256 hex length 64");
  assert(verifyUnsubscribeToken(email, tok), "valid token verifies");
  assert(
    verifyUnsubscribeToken("TEST@example.com", tok),
    "case-insensitive email verifies"
  );
  assert(!verifyUnsubscribeToken(email, "a".repeat(64)), "bad token rejected");
  assert(!verifyUnsubscribeToken("other@example.com", tok), "other email rejected");
  assert(!verifyUnsubscribeToken(email, "short"), "short token rejected");

  console.log("[3] addSubscriber fallback (KV not configured)");
  assert(!isStorageConfigured(), "storage fallback (no KV env)");
  const r1 = await addSubscriber({
    email: "sub1@example.com",
    subscribedAt: new Date().toISOString(),
    watchlist: "小米 拼多多",
    source: "smoke-test",
  });
  assert(r1.status === "new" && r1.persisted === false, "fallback reports new + not-persisted");

  console.log("[4] removeSubscriber fallback");
  const r2 = await removeSubscriber("sub1@example.com");
  assert(
    r2.status === "not_found" && r2.persisted === false,
    "fallback reports not-found + not-persisted"
  );

  console.log("[5] sendWelcomeEmail fallback (Resend not configured)");
  assert(!isEmailConfigured(), "email fallback (no RESEND_API_KEY)");
  const r3 = await sendWelcomeEmail({
    email: "sub1@example.com",
    siteBaseUrl: "https://r.siwuya.org",
  });
  assert(
    !r3.sent && r3.provider === "console",
    "fallback reports unsent + console provider"
  );

  console.log("");
  console.log(`${passed} passed, ${failed} failed`);
  if (failed > 0) process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
