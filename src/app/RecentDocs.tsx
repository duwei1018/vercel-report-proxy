// Server component · 从 info-collector (report.siwuya.org) 拉最近文档
// 设计意图（Claude@2026-04-26）：v2 新门户需要「全面接入」info-collector 已有的
// 日报/公告/研究流量。/api/recent-docs 是 info-collector CF Worker 的 landing API，
// 返回最近 24 条文档（news / announcement / research / social / commentary），
// 按 published_at 倒序。v2 首页只展示前 8 条，保持门户简洁。
//
// 容错：fetch 失败 → 整个 section 静默隐藏（不污染首页）。
// 缓存：Next.js revalidate 15min，与 info-collector daemon 刷新节奏对齐。

type RecentDoc = {
  doc_type: string;
  doc_id: string;
  title: string;
  primary_entity?: string;
  published_at?: string;
  category?: string;
  importance?: string;
};

const TYPE_LABEL: Record<string, string> = {
  news: '新闻',
  announcement: '公告',
  research: '研报',
  social: '观点',
  commentary: '评论',
  event: '事件',
};

async function fetchRecentDocs(): Promise<RecentDoc[]> {
  try {
    const res = await fetch('https://report.siwuya.org/api/recent-docs', {
      next: { revalidate: 900 }, // 15 min
    });
    if (!res.ok) return [];
    const data = await res.json();
    if (!Array.isArray(data?.docs)) return [];
    return data.docs.slice(0, 8);
  } catch {
    return [];
  }
}

function formatDate(iso?: string): string {
  if (!iso) return '';
  // "2026-04-24" → "04-24"
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})/);
  return m ? `${m[2]}-${m[3]}` : iso;
}

export default async function RecentDocs() {
  const docs = await fetchRecentDocs();
  if (docs.length === 0) return null;

  return (
    <section className="recent-docs">
      <h2>最近动态</h2>
      <p className="recent-docs-sub">
        来自思无崖日报系统的近期追踪（每 15 分钟刷新）
      </p>
      <ul className="recent-docs-list">
        {docs.map((d) => (
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
                  <span className="recent-docs-date">{formatDate(d.published_at)}</span>
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
      <p className="recent-docs-more">
        <a href="https://report.siwuya.org/" target="_blank" rel="noopener">
          查看更多 →
        </a>
      </p>
    </section>
  );
}
