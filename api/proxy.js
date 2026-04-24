/**
 * Vercel Serverless Function — 反代 report.siwuya.org
 * 所有请求透传到 Cloudflare Worker，国内外均可访问。
 */

const ORIGIN = "https://report.siwuya.org";

export default async function handler(req, res) {
  const url = new URL(req.url, `https://${req.headers.host}`);

  // 微信服务号域名验证
  if (url.pathname === "/MP_verify_hsjYs8mSvaUfyI1z.txt") {
    res.setHeader("Content-Type", "text/plain");
    return res.status(200).send("hsjYs8mSvaUfyI1z");
  }

  const targetUrl = `${ORIGIN}${url.pathname}${url.search}`;

  try {
    const resp = await fetch(targetUrl, {
      method: req.method,
      headers: {
        "User-Agent": req.headers["user-agent"] || "VercelProxy/1.0",
        "Accept": req.headers["accept"] || "*/*",
        "Accept-Encoding": req.headers["accept-encoding"] || "",
      },
    });

    // 透传响应头
    const contentType = resp.headers.get("content-type") || "text/html; charset=utf-8";
    res.setHeader("Content-Type", contentType);
    res.setHeader("Cache-Control", "public, max-age=300, s-maxage=600");
    res.setHeader("Access-Control-Allow-Origin", "*");

    const body = await resp.text();
    res.status(resp.status).send(body);
  } catch (err) {
    res.status(502).send(`Proxy error: ${err.message}`);
  }
}
