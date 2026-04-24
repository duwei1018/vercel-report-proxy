import Link from "next/link";
import type { Metadata } from "next";
import { UnsubscribeConfirm } from "./UnsubscribeConfirm";

export const metadata: Metadata = {
  title: "退订 · 思无崖 Weekly Brief",
  robots: { index: false, follow: false },
};

type SearchParams = Promise<{ email?: string; token?: string }>;

export default async function UnsubscribePage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const email = typeof params.email === "string" ? params.email : "";
  const token = typeof params.token === "string" ? params.token : "";

  return (
    <main className="unsubscribe-page">
      <nav className="brand-mark">
        <Link href="/">← 思无崖 · siwuya</Link>
      </nav>

      <h1>退订 Weekly Brief</h1>

      {!email || !token ? (
        <>
          <p className="beta-feedback beta-feedback-error" role="alert">
            退订链接不完整或已过期。请在最近一封邮件底部重新点退订链接。
          </p>
          <p>
            如果你不再想收到邮件但退订链接失效,直接回信{" "}
            <a href="mailto:report@siwuya.org">report@siwuya.org</a> 告诉我们,
            我们会人工移除。
          </p>
        </>
      ) : (
        <UnsubscribeConfirm email={email} token={token} />
      )}

      <footer className="disclaimer">
        <p>
          <Link href="/">← 返回首页</Link> ·{" "}
          <Link href="/beta">重新订阅</Link>
        </p>
      </footer>
    </main>
  );
}
