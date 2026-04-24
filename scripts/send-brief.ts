/**
 * Send a Weekly Brief by email — dry-run by default, live only with --live.
 *
 * USAGE
 *   npm run send-brief -- <slug>                 # dry-run: email goes only to TEST_EMAIL
 *   npm run send-brief -- --live <slug>          # live: fan out to all subscribers in KV
 *   npm run send-brief -- <slug> --test foo@bar  # override dry-run recipient
 *
 * REQUIRED ENV
 *   RESEND_API_KEY                               # always
 *   TEST_EMAIL                                   # dry-run recipient (default: duwei@siwuya.org)
 *   RESEND_FROM_EMAIL                            # optional; defaults to onboarding@resend.dev
 *   KV_REST_API_URL + KV_REST_API_TOKEN          # required only for --live
 *   BETA_UNSUBSCRIBE_SECRET                      # required only for --live (per-subscriber token)
 *   SITE_BASE_URL                                # optional; defaults to https://r.siwuya.org
 *
 * BEHAVIOR
 *   - Validates brief exists and parses cleanly.
 *   - dry-run: sends 1 email to TEST_EMAIL with `[DRY RUN]` subject prefix.
 *   - --live: requires KV + secret; fans out in batches of 10 with 1s sleep,
 *     writes per-run JSON log to src/content/send-logs/<slug>.log.json.
 *   - Fails fast if any required env is missing. Never silently falls back
 *     to console for live runs — we don't want "sent" reported for a fan-out
 *     that didn't actually fan out.
 */
import fs from "node:fs/promises";
import path from "node:path";
import { loadBriefBySlug, buildBriefEmail, UNSUBSCRIBE_TOKEN } from "../src/lib/briefs";
import {
  listAllSubscribers,
  signUnsubscribeToken,
  type Subscriber,
} from "../src/lib/beta";

interface CliArgs {
  slug: string | null;
  live: boolean;
  testEmail: string | null;
  help: boolean;
}

function parseArgs(argv: string[]): CliArgs {
  const args: CliArgs = { slug: null, live: false, testEmail: null, help: false };
  const rest = argv.slice(2);
  for (let i = 0; i < rest.length; i++) {
    const a = rest[i];
    if (a === "--live") args.live = true;
    else if (a === "--test") args.testEmail = rest[++i] ?? null;
    else if (a === "-h" || a === "--help") args.help = true;
    else if (!args.slug) args.slug = a;
    else {
      console.error(`unexpected arg: ${a}`);
      args.help = true;
    }
  }
  return args;
}

function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v || v.length < 1) {
    console.error(`[send-brief] missing env: ${name}`);
    process.exit(1);
  }
  return v;
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

function personalizeHtml(html: string, unsubscribeUrl: string): string {
  return html.split(UNSUBSCRIBE_TOKEN).join(unsubscribeUrl);
}

function buildUnsubscribeUrl(email: string, base: string): string {
  const token = signUnsubscribeToken(email);
  const u = new URL("/unsubscribe", base);
  u.searchParams.set("email", email);
  u.searchParams.set("token", token);
  return u.toString();
}

async function sendOne(params: {
  from: string;
  to: string;
  subject: string;
  html: string;
  apiKey: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const { from, to, subject, html, apiKey } = params;
  const mod = await import("resend");
  const client = new mod.Resend(apiKey);
  const result = await client.emails.send({ from, to, subject, html });
  if (result.error) {
    return { ok: false, error: result.error.message ?? "unknown" };
  }
  return { ok: true };
}

async function dryRun(
  slug: string,
  testEmail: string,
  live: boolean // always false when routed here; signature kept for symmetry
): Promise<void> {
  void live;
  const apiKey = requireEnv("RESEND_API_KEY");
  const from = process.env.RESEND_FROM_EMAIL || "思无崖 <onboarding@resend.dev>";
  const siteBaseUrl = process.env.SITE_BASE_URL || "https://r.siwuya.org";

  const brief = await loadBriefBySlug(slug);
  if (!brief) {
    console.error(`[send-brief] brief not found: ${slug}`);
    process.exit(2);
  }

  const { html, subject } = buildBriefEmail({ brief, siteBaseUrl });
  const unsub = buildUnsubscribeUrl(testEmail, siteBaseUrl);
  const personalizedHtml = personalizeHtml(html, unsub);

  console.log(`[send-brief] DRY RUN → ${testEmail}`);
  console.log(`[send-brief]   subject: [DRY RUN] ${subject}`);
  console.log(`[send-brief]   from: ${from}`);
  console.log(`[send-brief]   html bytes: ${personalizedHtml.length}`);

  const r = await sendOne({
    from,
    to: testEmail,
    subject: `[DRY RUN] ${subject}`,
    html: personalizedHtml,
    apiKey,
  });
  if (!r.ok) {
    console.error(`[send-brief] ✗ failed: ${r.error}`);
    process.exit(3);
  }
  console.log(`[send-brief] ✓ dry-run email sent to ${testEmail}`);
}

interface LiveLog {
  brief_slug: string;
  sent_at: string;
  total_subscribers: number;
  successful_count: number;
  failed_count: number;
  failed: Array<{ email: string; error: string }>;
}

async function liveFanOut(slug: string): Promise<void> {
  const apiKey = requireEnv("RESEND_API_KEY");
  requireEnv("KV_REST_API_URL");
  requireEnv("KV_REST_API_TOKEN");
  requireEnv("BETA_UNSUBSCRIBE_SECRET");
  const from = process.env.RESEND_FROM_EMAIL || "思无崖 <onboarding@resend.dev>";
  const siteBaseUrl = process.env.SITE_BASE_URL || "https://r.siwuya.org";

  const brief = await loadBriefBySlug(slug);
  if (!brief) {
    console.error(`[send-brief] brief not found: ${slug}`);
    process.exit(2);
  }

  const subscribers: Subscriber[] | null = await listAllSubscribers();
  if (subscribers === null) {
    console.error(`[send-brief] KV not reachable — aborting live fan-out`);
    process.exit(4);
  }
  if (subscribers.length === 0) {
    console.error(`[send-brief] 0 active subscribers — nothing to send`);
    process.exit(5);
  }

  const { html, subject } = buildBriefEmail({ brief, siteBaseUrl });
  console.log(`[send-brief] LIVE fan-out`);
  console.log(`[send-brief]   brief: ${slug} (${brief.title})`);
  console.log(`[send-brief]   subject: ${subject}`);
  console.log(`[send-brief]   from: ${from}`);
  console.log(`[send-brief]   subscribers: ${subscribers.length}`);

  const BATCH = 10;
  const failed: Array<{ email: string; error: string }> = [];
  let successful = 0;

  for (let i = 0; i < subscribers.length; i += BATCH) {
    const batch = subscribers.slice(i, i + BATCH);
    await Promise.all(
      batch.map(async (sub) => {
        const unsub = buildUnsubscribeUrl(sub.email, siteBaseUrl);
        const personalized = personalizeHtml(html, unsub);
        const r = await sendOne({
          from,
          to: sub.email,
          subject,
          html: personalized,
          apiKey,
        });
        if (r.ok) {
          successful++;
        } else {
          failed.push({ email: sub.email, error: r.error });
        }
      })
    );
    if (i + BATCH < subscribers.length) await sleep(1000);
    process.stdout.write(
      `\r[send-brief]   ${Math.min(i + BATCH, subscribers.length)}/${subscribers.length} processed · ${successful} ok · ${failed.length} failed`
    );
  }
  process.stdout.write("\n");

  const log: LiveLog = {
    brief_slug: slug,
    sent_at: new Date().toISOString(),
    total_subscribers: subscribers.length,
    successful_count: successful,
    failed_count: failed.length,
    failed,
  };
  const logDir = path.join(process.cwd(), "src", "content", "send-logs");
  await fs.mkdir(logDir, { recursive: true });
  const logPath = path.join(logDir, `${slug}.log.json`);
  await fs.writeFile(logPath, JSON.stringify(log, null, 2) + "\n", "utf-8");
  console.log(`[send-brief] log written: ${logPath}`);

  if (failed.length > 0) {
    console.log(`[send-brief] ✗ ${failed.length} failed addresses — see log`);
    process.exit(failed.length === subscribers.length ? 6 : 0);
  }
  console.log(`[send-brief] ✓ all ${successful} delivered`);
}

function printHelp(): void {
  console.log(`Usage:
  npm run send-brief -- <slug>              # dry-run (TEST_EMAIL only)
  npm run send-brief -- --live <slug>       # live fan-out to KV subscribers
  npm run send-brief -- <slug> --test a@b   # override dry-run recipient

Required env:
  RESEND_API_KEY                            # always
  TEST_EMAIL                                # dry-run default recipient
  KV_REST_API_URL + KV_REST_API_TOKEN       # --live only
  BETA_UNSUBSCRIBE_SECRET                   # --live only

Optional:
  RESEND_FROM_EMAIL    (default: 思无崖 <onboarding@resend.dev>)
  SITE_BASE_URL        (default: https://r.siwuya.org)
`);
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv);
  if (args.help || !args.slug) {
    printHelp();
    process.exit(args.slug ? 0 : 1);
  }
  if (args.live) {
    await liveFanOut(args.slug);
    return;
  }
  const testEmail =
    args.testEmail || process.env.TEST_EMAIL || "duwei@siwuya.org";
  await dryRun(args.slug, testEmail, false);
}

main().catch((err) => {
  console.error("[send-brief] fatal:", err);
  process.exit(10);
});
