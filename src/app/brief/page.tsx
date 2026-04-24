import Link from "next/link";
import type { Metadata } from "next";
import { listAllBriefs } from "@/lib/briefs";

export const metadata: Metadata = {
  title: "Weekly Brief 存档 · 思无崖",
  description:
    "思无崖 Weekly Brief 历期存档。每周五 19:00(港时)发出,订阅后直达邮箱。",
};

export default async function BriefIndexPage() {
  const briefs = await listAllBriefs();
  const hasReal = briefs.some((b) => b.issue_number > 0);

  return (
    <main className="brief-index">
      <nav className="brand-mark">
        <Link href="/">← 思无崖 · siwuya</Link>
      </nav>

      <h1>Weekly Brief 存档</h1>
      <p className="lead">
        每周五 19:00(港时)发一份 Weekly Brief 到订阅者邮箱 ·{" "}
        <Link href="/beta">订阅入口</Link>
      </p>

      {briefs.length === 0 ? (
        <section className="empty-state">
          <h2>还没有公开的 Brief</h2>
          <p>
            第一期正式 Brief 将在 2026-05-15 19:00(港时)发出。那之前你可以{" "}
            <Link href="/beta">先订阅 Beta</Link>,首期开版时自动收到。
          </p>
        </section>
      ) : (
        <ul className="brief-list">
          {briefs.map((b) => (
            <li key={b.slug} className="brief-card">
              <Link href={`/brief/${b.slug}`} className="brief-card-link">
                <div className="brief-card-meta">
                  <span className="brief-card-issue">
                    {b.issue_number === 0 ? "样稿" : `第 ${b.issue_number} 期`}
                  </span>
                  <span className="brief-card-date">· {b.date}</span>
                </div>
                <h2 className="brief-card-title">{b.title}</h2>
                <p className="brief-card-summary">{b.summary}</p>
                {b.companies_covered.length > 0 && (
                  <p className="brief-card-companies">
                    涵盖: {b.companies_covered.join("、")}
                  </p>
                )}
              </Link>
            </li>
          ))}
        </ul>
      )}

      {!hasReal && briefs.length > 0 && (
        <p className="brief-notice">
          目前只有样稿。第一期正式 Brief 将在 2026-05-15 发出。
        </p>
      )}

      <footer className="disclaimer">
        <p>
          <Link href="/">← 返回首页</Link> ·{" "}
          <Link href="/beta">订阅 Beta</Link> ·{" "}
          <Link href="/disclaimer">免责声明</Link>
        </p>
      </footer>
    </main>
  );
}
