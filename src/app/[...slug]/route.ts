import type { NextRequest } from "next/server";

const ORIGIN = "https://report.siwuya.org";

async function proxy(req: NextRequest): Promise<Response> {
  const incoming = new URL(req.url);
  const target = `${ORIGIN}${incoming.pathname}${incoming.search}`;

  const upstream = await fetch(target, {
    method: req.method,
    headers: {
      "User-Agent": req.headers.get("user-agent") ?? "VercelProxy/2.0",
      Accept: req.headers.get("accept") ?? "*/*",
      "Accept-Encoding": req.headers.get("accept-encoding") ?? "",
      "Accept-Language": req.headers.get("accept-language") ?? "",
    },
    body:
      req.method === "GET" || req.method === "HEAD"
        ? undefined
        : await req.arrayBuffer(),
    redirect: "manual",
  });

  const headers = new Headers();
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
    if (v) headers.set(name, v);
  }
  if (!headers.has("content-type")) {
    headers.set("content-type", "text/html; charset=utf-8");
  }
  if (!headers.has("cache-control")) {
    headers.set("cache-control", "public, max-age=300, s-maxage=600");
  }
  headers.set("access-control-allow-origin", "*");
  headers.set("x-proxied-by", "vercel-report-proxy");

  return new Response(upstream.body, {
    status: upstream.status,
    statusText: upstream.statusText,
    headers,
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
