import { NextResponse } from "next/server";

// 临时诊断端点：只报告 env 变量是否存在（不回显 value），用于排查 /beta flow。
// 不含秘密，可以公开访问。
// 完成 E2E 验收后删除（见 task 列表）。

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const redisUrl = process.env.REDIS_URL ?? "";
  return NextResponse.json({
    ok: true,
    env: {
      REDIS_URL: !!process.env.REDIS_URL,
      REDIS_URL_scheme: redisUrl.split(":")[0] || null,
      REDIS_URL_host_suffix: redisUrl
        .replace(/^.*@/, "")
        .split(":")[0]
        ?.split(".")
        .slice(-2)
        .join(".") || null,
      RESEND_API_KEY: !!process.env.RESEND_API_KEY,
      RESEND_API_KEY_prefix: (process.env.RESEND_API_KEY ?? "").slice(0, 3),
      RESEND_FROM_EMAIL: process.env.RESEND_FROM_EMAIL ?? null,
      TEST_EMAIL: process.env.TEST_EMAIL ?? null,
      BETA_UNSUBSCRIBE_SECRET: !!process.env.BETA_UNSUBSCRIBE_SECRET,
      BETA_UNSUBSCRIBE_SECRET_prefix: (
        process.env.BETA_UNSUBSCRIBE_SECRET ?? ""
      ).slice(0, 6),
      NODE_ENV: process.env.NODE_ENV ?? null,
      VERCEL_ENV: process.env.VERCEL_ENV ?? null,
      VERCEL_GIT_COMMIT_SHA: (process.env.VERCEL_GIT_COMMIT_SHA ?? "").slice(0, 7),
    },
  });
}
