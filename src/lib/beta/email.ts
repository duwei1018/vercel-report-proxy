import { signUnsubscribeToken } from "./tokens";

/**
 * Email sender — tries Resend first, falls back to console-log so the form
 * flow is observable end-to-end without RESEND_API_KEY.
 *
 * Resend lets you send from onboarding@resend.dev without verifying a domain.
 * We default to that unless admin sets RESEND_FROM_EMAIL. Phase 4 should
 * switch to a verified brief@siwuya.org sender.
 */

const DEFAULT_FROM = "思无崖 <onboarding@resend.dev>";

export interface SendWelcomeInput {
  email: string;
  watchlist?: string;
  siteBaseUrl: string; // e.g. https://r.siwuya.org
}

export interface SendWelcomeResult {
  sent: boolean;
  provider: "resend" | "console";
  error?: string;
}

function nextFridayIsoDate(now = new Date()): string {
  const d = new Date(now);
  const day = d.getUTCDay(); // 0=Sun..5=Fri..6=Sat
  const delta = (5 - day + 7) % 7 || 7; // always next Friday, not today
  d.setUTCDate(d.getUTCDate() + delta);
  return d.toISOString().slice(0, 10);
}

function buildUnsubscribeUrl(email: string, base: string): string {
  const token = signUnsubscribeToken(email);
  const u = new URL("/unsubscribe", base);
  u.searchParams.set("email", email);
  u.searchParams.set("token", token);
  return u.toString();
}

function buildTextBody({
  email,
  siteBaseUrl,
}: SendWelcomeInput): string {
  const friday = nextFridayIsoDate();
  const unsub = buildUnsubscribeUrl(email, siteBaseUrl);
  return [
    "朋友你好:",
    "",
    "感谢你订阅思无崖 Beta。",
    "",
    `下一期 Weekly Brief 将于 ${friday} 19:00(港时)发送到这个邮箱。`,
    "",
    "在那之前你可以:",
    "",
    `• 浏览公司档案库 ${siteBaseUrl}/companies`,
    `• 查看开源数据仓库 https://github.com/duwei1018/siwuya-data`,
    `• 阅读诚信评分方法论 https://github.com/duwei1018/siwuya-data/tree/main/integrity_framework`,
    "",
    "如果你希望我们优先追踪某家公司,或有任何反馈,直接回复这封邮件。",
    "",
    "— 思无崖",
    "",
    "—",
    "Beta 期间免费,期限不设限。未来如转为订阅制,我们会提前 30 天邮件通知,",
    "Beta 用户享首期优惠。所有公司档案与研究方法论永久免费且开源。",
    "",
    `退订:${unsub}`,
  ].join("\n");
}

function buildHtmlBody(input: SendWelcomeInput): string {
  const { email, siteBaseUrl } = input;
  const friday = nextFridayIsoDate();
  const unsub = buildUnsubscribeUrl(email, siteBaseUrl);
  return `<!doctype html>
<html lang="zh-CN"><body style="font-family: 'Noto Serif SC', Georgia, serif; font-size:16px; line-height:1.8; color:#3E2F24; background:#FAF8F3; max-width:640px; margin:2em auto; padding:0 20px;">
<p>朋友你好:</p>
<p>感谢你订阅<strong>思无崖 Beta</strong>。</p>
<p>下一期 Weekly Brief 将于 <strong>${friday} 19:00(港时)</strong> 发送到这个邮箱。</p>
<p>在那之前你可以:</p>
<ul>
  <li><a href="${siteBaseUrl}/companies" style="color:#7A5C42;">浏览公司档案库</a></li>
  <li><a href="https://github.com/duwei1018/siwuya-data" style="color:#7A5C42;">开源数据仓库 siwuya-data</a></li>
  <li><a href="https://github.com/duwei1018/siwuya-data/tree/main/integrity_framework" style="color:#7A5C42;">诚信评分方法论</a></li>
</ul>
<p>如果你希望我们优先追踪某家公司,或有任何反馈,直接回复这封邮件即可。</p>
<p>— 思无崖</p>
<hr style="border:none; border-top:1px solid #E8DFD2; margin:2em 0;">
<p style="font-size:13px; color:#7C6A58;">
Beta 期间免费,期限不设限。未来如转为订阅制,我们会提前 30 天邮件通知,
Beta 用户享首期优惠。所有公司档案与研究方法论永久免费且开源。
</p>
<p style="font-size:13px; color:#7C6A58;">
不想收到后续邮件? <a href="${unsub}" style="color:#7C6A58;">一键退订</a>
</p>
</body></html>`;
}

export async function sendWelcomeEmail(
  input: SendWelcomeInput
): Promise<SendWelcomeResult> {
  const text = buildTextBody(input);
  const html = buildHtmlBody(input);
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL || DEFAULT_FROM;

  if (!apiKey) {
    console.warn(
      `[beta-email] RESEND_API_KEY NOT CONFIGURED — welcome email NOT sent to ${input.email}`
    );
    console.info(`[beta-email] would-send subject: 思无崖 Beta · 欢迎加入`);
    console.info(`[beta-email] would-send from: ${from}`);
    console.info(`[beta-email] text body:\n${text}`);
    return { sent: false, provider: "console" };
  }

  try {
    const mod = await import("resend");
    const client = new mod.Resend(apiKey);
    const result = await client.emails.send({
      from,
      to: input.email,
      subject: "思无崖 Beta · 欢迎加入",
      text,
      html,
    });
    if (result.error) {
      console.error("[beta-email] Resend API error:", result.error);
      return {
        sent: false,
        provider: "resend",
        error: result.error.message ?? "unknown",
      };
    }
    return { sent: true, provider: "resend" };
  } catch (err) {
    console.error("[beta-email] Resend send threw:", err);
    return {
      sent: false,
      provider: "resend",
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

export function isEmailConfigured(): boolean {
  return !!process.env.RESEND_API_KEY;
}
