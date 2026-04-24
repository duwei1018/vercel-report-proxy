import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";

import { loadBriefBySlug } from "@/lib/briefs";

type Params = { slug: string };

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { slug } = await params;
  const brief = await loadBriefBySlug(slug);
  if (!brief) return { title: "未找到 · 思无崖 Weekly Brief" };
  return {
    title: `${brief.title} · 思无崖`,
    description: brief.summary,
  };
}

export default async function BriefDetailPage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { slug } = await params;
  const brief = await loadBriefBySlug(slug);
  if (!brief) notFound();

  return (
    <main className="brief-page">
      <nav className="company-breadcrumb">
        <Link href="/brief">← Weekly Brief 存档</Link>
      </nav>

      <header className="brief-header">
        <p className="brief-eyebrow">
          思无崖 · {brief.issue_number === 0 ? "样稿" : `第 ${brief.issue_number} 期`}{" "}
          · {brief.date}
        </p>
        <h1 className="brief-title">{brief.title}</h1>
        <p className="brief-summary">{brief.summary}</p>
        <p className="brief-author">署名 {brief.author}</p>
      </header>

      <article
        className="brief-body"
        // content already sanitized-by-omission: admin-authored markdown + remark-html default
        dangerouslySetInnerHTML={{ __html: brief.contentHtml }}
      />

      <section className="brief-cta">
        <p>
          这份 Brief 是{" "}
          <strong>
            {brief.preview === "public" ? "公开样稿" : "订阅者专享"}
          </strong>
          。如果你希望每期第一时间收到:
        </p>
        <p>
          <Link href="/beta" className="beta-submit">
            订阅 Weekly Brief →
          </Link>
        </p>
      </section>

      <footer className="disclaimer">
        <p>
          本内容仅供研究讨论,不构成任何投资建议。详见{" "}
          <Link href="/disclaimer">免责声明</Link>。
        </p>
        <p>
          <Link href="/brief">← 所有 Brief</Link> ·{" "}
          <Link href="/companies">浏览公司档案</Link>
        </p>
      </footer>
    </main>
  );
}
