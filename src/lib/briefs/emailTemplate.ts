import type { Brief } from "./types";

/**
 * Renders an inline-CSS HTML email for a Brief. The `{UNSUBSCRIBE_URL}` token
 * is a literal placeholder — `scripts/send-brief.ts` replaces it per
 * subscriber with a signed URL before sending.
 *
 * Design constraints:
 *   - max 600px width, centered
 *   - all styles inline (Gmail/163/QQ/Outlook strip <head> styles)
 *   - no <script>, no external <link>, no web fonts
 *   - serif-first font-family to match siwuya.org
 *   - links use #7A5C42 to stay readable under light + dark mode previews
 */

const UNSUBSCRIBE_PLACEHOLDER = "{UNSUBSCRIBE_URL}";
export const UNSUBSCRIBE_TOKEN = UNSUBSCRIBE_PLACEHOLDER;

const BODY_OPEN = `<body style="background:#FAF8F3;color:#3E2F24;font-family:'Noto Serif SC','Source Han Serif SC',Georgia,serif;margin:0;padding:0;line-height:1.8;">`;

const LINK_STYLE = "color:#7A5C42;text-decoration:underline;";

export interface BuildBriefEmailInput {
  brief: Brief;
  siteBaseUrl: string; // e.g. https://r.siwuya.org
}

export interface BriefEmailOutput {
  html: string;
  subject: string;
}

function rewriteCompanyLinks(html: string, siteBaseUrl: string): string {
  // autoLink produced /company/{slug} relative URLs. For email we need absolute.
  return html.replace(
    /href="\/company\/([^"]+)"/g,
    `href="${siteBaseUrl}/company/$1" style="${LINK_STYLE}"`
  );
}

function briefUrl(slug: string, base: string): string {
  return `${base}/brief/${slug}`;
}

export function buildBriefEmail(input: BuildBriefEmailInput): BriefEmailOutput {
  const { brief, siteBaseUrl } = input;
  const content = rewriteCompanyLinks(brief.contentHtml, siteBaseUrl);
  const permalink = briefUrl(brief.slug, siteBaseUrl);
  const disclaimerUrl = `${siteBaseUrl}/disclaimer`;
  const companiesUrl = `${siteBaseUrl}/companies`;

  const html = `<!doctype html>
<html lang="zh-CN">
<head><meta charset="utf-8"><title>${escapeHtml(brief.title)}</title></head>
${BODY_OPEN}
<div style="max-width:600px;margin:0 auto;padding:40px 24px;">

  <div style="border-bottom:1px solid #E8DFD2;padding-bottom:16px;margin-bottom:28px;">
    <div style="font-size:13px;color:#7C6A58;letter-spacing:0.05em;">思无崖 · 第 ${brief.issue_number} 期 · ${escapeHtml(brief.date)}</div>
    <h1 style="font-size:26px;margin:10px 0 8px;font-weight:600;">${escapeHtml(brief.title)}</h1>
    <p style="font-size:15px;color:#5C4332;margin:0;">${escapeHtml(brief.summary)}</p>
  </div>

  <div style="font-size:16px;">${content}</div>

  <div style="margin-top:36px;padding:16px 20px;background:rgba(232,223,210,0.35);border-left:3px solid #7A5C42;border-radius:6px;font-size:14px;">
    <p style="margin:0 0 6px;">📂 在网页上读这一期: <a href="${permalink}" style="${LINK_STYLE}">${permalink.replace(/^https?:\/\//, "")}</a></p>
    <p style="margin:0;">🏢 浏览已追踪公司: <a href="${companiesUrl}" style="${LINK_STYLE}">${companiesUrl.replace(/^https?:\/\//, "")}</a></p>
  </div>

  <div style="border-top:1px solid #E8DFD2;margin-top:40px;padding-top:20px;font-size:13px;color:#7C6A58;line-height:1.6;">
    <p style="margin:0 0 8px;">本邮件来自 思无崖 · siwuya.org,仅供研究讨论,不构成任何投资建议。<a href="${disclaimerUrl}" style="color:#7C6A58;">免责声明</a></p>
    <p style="margin:0;">不想再收到? <a href="${UNSUBSCRIBE_PLACEHOLDER}" style="color:#7C6A58;">一键退订</a></p>
  </div>

</div>
</body></html>`;

  return { html, subject: brief.title };
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
