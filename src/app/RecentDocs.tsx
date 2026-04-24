'use client';

// Client component · 从 info-collector (report.siwuya.org) 拉最近文档
// 设计意图（Claude@2026-04-24）：v2 新门户需要「全面接入」info-collector 已有的
// 日报/公告/研究流量。/api/recent-docs 是 info-collector CF Worker 的 landing API,
// 返回最近 24 条文档（news / announcement / research / social / commentary）,
// 按 published_at 倒序。
//
// 为何 client 而非 server：Vercel serverless 出口 IP 被 Cloudflare bot-challenge 拦下
// （实测 /daily/* 反代同病因），server-side fetch 几乎必挂。改由访客浏览器直接跨域
// fetch，报头走真实浏览器 UA，CF 不挑战。API 已有 `Access-Control-Allow-Origin: *`。
//
// 容错：fetch 失败 / 非预期 schema / 空数组 → 整个 section 静默隐藏（不污染首页）。
// 缓存：浏览器 HTTP cache + API 的 `Cache-Control: public, max-age=60`。

import { useEffect, useState } from 'react';

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

function formatDate(iso?: string): string {
  if (!iso) return '';
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})/);
  return m ? `${m[2]}-${m[3]}` : iso;
}

type Props = {
  limit?: number;
  heading?: string;
  subheading?: string;
  moreLink?: boolean;
};

export default function RecentDocs({
  limit = 8,
  heading = '最近动态',
  subheading = '来自思无崖日报系统的近期追踪',
  moreLink = true,
}: Props) {
  const [docs, setDocs] = useState<RecentDoc[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch('https://report.siwuya.org/api/recent-docs')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (cancelled) return;
        if (!data || !Array.isArray(data.docs)) {
          setDocs([]);
          return;
        }
        setDocs(data.docs.slice(0, limit));
      })
      .catch(() => {
        if (!cancelled) setDocs([]);
      });
    return () => {
      cancelled = true;
    };
  }, [limit]);

  if (docs === null || docs.length === 0) return null;

  return (
    <section className="recent-docs">
      <h2>{heading}</h2>
      <p className="recent-docs-sub">{subheading}</p>
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
      {moreLink ? (
        <p className="recent-docs-more">
          <a href="https://report.siwuya.org/" target="_blank" rel="noopener">
            查看更多 →
          </a>
        </p>
      ) : null}
    </section>
  );
}
