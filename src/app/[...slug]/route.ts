import type { NextRequest } from "next/server";

const ORIGIN = "https://report.siwuya.org";

// 反代 fallback：所有未匹配 v2 路由的请求转发到 report.siwuya.org。
//
// 已知问题：Vercel serverless 出口 IP 被 Cloudflare "Just a moment..." 挑战拦截。
// 这里尽可能把客户端的真实 headers 透传，减少 CF 将此请求判为 bot 的概率，
// 但彻底修复需 admin 在 Cloudflare WAF 对 Vercel IP 段加白名单。
//
// 透传策略：原样转发浏览器相关的全部 headers（UA/Accept/Accept-Language/Cookie/Referer/
// Sec-Fetch-*/DNT），加上 X-Forwarded-For 传递真实客户端 IP 给 CF。
const FORWARDED_HEADERS = [
  "user-agent",
  "accept",
  "accept-encoding",
  "accept-language",
  "cookie",
  "referer",
  "dnt",
  "sec-ch-ua",
  "sec-ch-ua-mobile",
  "sec-ch-ua-platform",
  "sec-fetch-dest",
  "sec-fetch-mode",
  "sec-fetch-site",
  "sec-fetch-user",
  "upgrade-insecure-requests",
];

function extractClientIp(req: NextRequest): string | null {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim();
  const cfip = req.headers.get("x-real-ip");
  if (cfip) return cfip;
  return null;
}

async function proxy(req: NextRequest): Promise<Response> {
  const incoming = new URL(req.url);
  const target = `${ORIGIN}${incoming.pathname}${incoming.search}`;

  const outboundHeaders = new Headers();
  for (const name of FORWARDED_HEADERS) {
    const v = req.headers.get(name);
    if (v) outboundHeaders.set(name, v);
  }
  if (!outboundHeaders.has("user-agent")) {
    outboundHeaders.set(
      "user-agent",
      "Mozilla/5.0 (compatible; siwuya-proxy/2.0; +https://r.siwuya.org)",
    );
  }
  const clientIp = extractClientIp(req);
  if (clientIp) {
    outboundHeaders.set("x-forwarded-for", clientIp);
  }

  const upstream = await fetch(target, {
    method: req.method,
    headers: outboundHeaders,
    body:
      req.method === "GET" || req.method === "HEAD"
        ? undefined
        : await req.arrayBuffer(),
    redirect: "manual",
  });

  const responseHeaders = new Headers();
  const passthroughHeaders = [
    "content-type",
    "content-language",
    "cache-control",
    "etag",
    "last-modified",
    "location",
    "vary",
  ];
  for (const name of passthroughHeaders) {
    const v = upstream.headers.get(name);
    if (v) responseHeaders.set(name, v);
  }
  if (!responseHeaders.has("content-type")) {
    responseHeaders.set("content-type", "text/html; charset=utf-8");
  }
  if (!responseHeaders.has("cache-control")) {
    responseHeaders.set("cache-control", "public, max-age=300, s-maxage=600");
  }
  responseHeaders.set("access-control-allow-origin", "*");
  responseHeaders.set("x-proxied-by", "vercel-report-proxy");

  return new Response(upstream.body, {
    status: upstream.status,
    statusText: upstream.statusText,
    headers: responseHeaders,
  });
}

export const GET = proxy;
export const POST = proxy;
export const HEAD = proxy;
export const PUT = proxy;
export const DELETE = proxy;
export const PATCH = proxy;
export const OPTIONS = proxy;

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
