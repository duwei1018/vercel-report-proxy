import Link from "next/link";

// 提升 404 用户体验：除了贡献 CTA，额外展示 info-collector 近期文档
// 让访客有内容可以消费，降低直接流失率
// （Claude@2026-04-26）

type RecentDoc = {
  doc_type: string;
  doc_id: string;
  title: string;
  primary_entity?: string;
  published_at?: string;
};

const TYPE_LABEL: Record<string, string> = {
  news: "新闻",
  announcement: "公告",
  research: "研报",
  social: "观点",
  commentary: "评论",
  event: "事件",
};

async function fetchRecent(): Promise<RecentDoc[]> {
  try {
    const res = await fetch("https://report.siwuya.org/api/recent-docs", {
      next: { revalidate: 900 },
    });
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data?.docs) ? data.docs.slice(0, 6) : [];
  } catch {
    return [];
  }
}

function fmt(iso?: string): string {
  if (!iso) return "";
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})/);
  return m ? `${m[2]}-${m[3]}` : iso;
}

export default async function CompanyNotFound() {
  const recent = await fetchRecent();
  return (
    <main className="company-page">
      <nav className="company-breadcrumb">
        <Link href="/companies">← 公司档案库</Link>
      </nav>
      <h1>未找到这家公司的档案</h1>
      <p>
        我们的公司档案库还在建立中。如果你想看到这家公司的档案,可以:
      </p>
      <ul>
        <li>
          浏览<Link href="/companies">现有档案</Link>
        </li>
        <li>
          提交 PR 到{" "}
          <a
            href="https://github.com/duwei1018/siwuya-data"
            target="_blank"
            rel="noopener noreferrer"
          >
            siwuya-data
          </a>{" "}
          为这家公司新增档案
        </li>
      </ul>

      {recent.length > 0 && (
        <section className="recent-docs" style={{ marginTop: 40 }}>
          <h2>看看最新动态</h2>
          <p className="recent-docs-sub">
            思无崖日报系统近期追踪的文档,也许有你感兴趣的公司
          </p>
          <ul className="recent-docs-list">
            {recent.map((d) => (
              <li key={d.doc_id} className="recent-docs-item">
                <a
                  href={`https://report.siwuya.org/doc/${d.doc_type}/${d.doc_id}`}
                  target="_blank"
                  rel="noopener"
                >
                  <span className="recent-docs-meta">
                    <span className="recent-docs-type">
                      {TYPE_LABEL[d.doc_type] ?? d.doc_type}
                    </span>
                    {d.published_at ? (
                      <span className="recent-docs-date">{fmt(d.published_at)}</span>
                    ) : null}
                    {d.primary_entity ? (
                      <span className="recent-docs-entity">{d.primary_entity}</span>
                    ) : null}
                  </span>
                  <span className="recent-docs-title">{d.title}</span>
                </a>
              </li>
            ))}
          </ul>
        </section>
      )}

      <footer className="disclaimer" style={{ marginTop: 32 }}>
        <p>
          <Link href="/">← 返回首页</Link>
        </p>
      </footer>
    </main>
  );
}
