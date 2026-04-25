import type { NextRequest } from "next/server";

const ORIGIN = "https://report.siwuya.org";

// 老 URL 兜底：所有未匹配 v2 路由的请求 302 重定向到 report.siwuya.org/{path}。
//
// 历史背景：早期 r.siwuya.org 是 report.siwuya.org 的反向代理（Vercel fetch 上游
// 再回写给客户端）。Vercel serverless 出口 IP 被 Cloudflare bot-challenge 拦截，
// 反代实际上长期 403。
//
// 新策略：不再 fetch + 回写，直接 302 让浏览器自己去 report.siwuya.org。
// - 浏览器原生 UA + 真实 IP 直连 CF，不被挑战
// - 老书签 r.siwuya.org/daily/... 不死（自动跳转）
// - URL bar 落到 report.siwuya.org/...（用户后续书签更"对"）
// - 微信验证文件 public/MP_verify_*.txt 由 Vercel 静态服务，不进此 handler
//
// 例外：v2 主站自己的路由（/, /companies, /company/[slug], /brief, /beta,
// /unsubscribe, /disclaimer）有自己 page.tsx，App Router 优先匹配，不会到这里。

function buildRedirectUrl(req: NextRequest): string {
  const incoming = new URL(req.url);
  return `${ORIGIN}${incoming.pathname}${incoming.search}`;
}

function redirect(req: NextRequest): Response {
  const target = buildRedirectUrl(req);
  return new Response(null, {
    status: 302,
    headers: {
      location: target,
      "cache-control": "public, max-age=300",
      "x-redirected-by": "vercel-report-proxy",
    },
  });
}

export const GET = redirect;
export const HEAD = redirect;
// POST/PUT/DELETE/PATCH 也走 302 — 极少触发，但 302 后客户端会用相同方法继续，
// 兼容性最好的兜底。
export const POST = redirect;
export const PUT = redirect;
export const DELETE = redirect;
export const PATCH = redirect;
export const OPTIONS = redirect;

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
