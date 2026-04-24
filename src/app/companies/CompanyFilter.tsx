"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import type { CompanySummary } from "@/lib/siwuya-data";

/**
 * Render-prop client component: keeps the filter input + state colocated with
 * the listing markup that depends on it, while the parent server component
 * still owns the data fetch and grouping logic.
 *
 * 读取 URL ?q= 作为初始值，让"页底搜索框 → /companies?q=xxx"链路闭合。
 */
export function CompanyFilter({
  companies,
  children,
}: {
  companies: CompanySummary[];
  children: (filtered: CompanySummary[]) => ReactNode;
}) {
  const [query, setQuery] = useState("");

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const q = params.get("q");
    if (q) setQuery(q);
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return companies;
    return companies.filter(
      (c) =>
        c.name_zh.toLowerCase().includes(q) ||
        c.name_en.toLowerCase().includes(q) ||
        c.ticker.toLowerCase().includes(q)
    );
  }, [query, companies]);

  return (
    <>
      <div className="company-filter">
        <label htmlFor="company-search" className="visually-hidden">
          按名称或 ticker 过滤
        </label>
        <input
          id="company-search"
          type="search"
          placeholder="按名称或 ticker 过滤"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          autoComplete="off"
        />
        <span className="company-filter-count">
          {filtered.length} / {companies.length} 家
        </span>
      </div>

      {children(filtered)}
    </>
  );
}
