import Link from "next/link";
import type { Metadata } from "next";

import { listAllCompanies } from "@/lib/siwuya-data";
import type { CompanySummary, Market } from "@/lib/siwuya-data";
import { CompanyFilter } from "./CompanyFilter";

export const metadata: Metadata = {
  title: "公司档案库 · 思无崖",
  description:
    "思无崖追踪上市公司的业务模型、护城河、管理层与公开承诺。开源数据库,欢迎社区贡献。",
};

const MARKET_LABEL: Record<Market, string> = {
  cn: "A 股",
  hk: "港股",
  us: "美股",
};

const MARKET_ORDER: Market[] = ["cn", "hk", "us"];

function inferMarket(s: CompanySummary): Market {
  // EXAMPLE 档案 toSummary 时被赋了 "us" 的 market 槽位,但实际不属任何市场。
  // 单独抽出展示在"示例"分组,而不是混入美股列表。
  if (s.is_example) return s.market;
  return s.market;
}

export default async function CompaniesIndexPage() {
  // 当前真实公司 0;按 ADDENDUM_2 §3.1 把 EXAMPLE 卡片作为格式参考显示。
  const summaries = await listAllCompanies({ includeExamples: true });
  const realCompanies = summaries.filter((s) => !s.is_example);
  const exampleCompanies = summaries.filter((s) => s.is_example);

  const grouped = new Map<Market, CompanySummary[]>();
  for (const market of MARKET_ORDER) grouped.set(market, []);
  for (const summary of realCompanies) {
    const market = inferMarket(summary);
    grouped.get(market)?.push(summary);
  }

  return (
    <main className="companies-index">
      <nav className="brand-mark">
        <Link href="/">← 思无崖 · siwuya</Link>
      </nav>

      <h1>公司档案库</h1>
      <p className="lead">
        我们追踪上市公司的业务模型、护城河、管理层与公开承诺。
        所有档案以开源仓库 siwuya-data 为唯一数据源。
      </p>

      {realCompanies.length === 0 ? (
        <section className="empty-state">
          <h2>正在建立</h2>
          <p>
            公司档案库刚启动,目前还没有真实公司档案。下方的示例卡片展示了一份完整档案
            的结构与字段,可作为贡献参考。
          </p>
          <p>
            欢迎通过 GitHub PR 提交新公司档案:{" "}
            <a
              href="https://github.com/duwei1018/siwuya-data/blob/main/CONTRIBUTING.md"
              target="_blank"
              rel="noopener noreferrer"
            >
              贡献指南
            </a>
          </p>
        </section>
      ) : (
        <CompanyFilter companies={realCompanies}>
          {(filtered) =>
            MARKET_ORDER.map((market) => {
              const list = filtered.filter((c) => inferMarket(c) === market);
              if (list.length === 0) return null;
              return (
                <section key={market} className="market-group">
                  <h2>{MARKET_LABEL[market]}</h2>
                  <ul className="company-list">
                    {list.map((s) => (
                      <CompanyCard key={s.slug} summary={s} />
                    ))}
                  </ul>
                </section>
              );
            })
          }
        </CompanyFilter>
      )}

      {exampleCompanies.length > 0 && (
        <section className="market-group examples-group">
          <h2>示例档案</h2>
          <p className="examples-note">
            以下为虚构档案,用于展示完整字段结构。
          </p>
          <ul className="company-list">
            {exampleCompanies.map((s) => (
              <CompanyCard key={s.slug} summary={s} isExample />
            ))}
          </ul>
        </section>
      )}

      <footer className="disclaimer">
        <p>
          档案数据开源于{" "}
          <a
            href="https://github.com/duwei1018/siwuya-data"
            target="_blank"
            rel="noopener noreferrer"
          >
            siwuya-data
          </a>
          。本站不构成任何投资建议,详见{" "}
          <Link href="/disclaimer">免责声明</Link>。
        </p>
      </footer>
    </main>
  );
}

function CompanyCard({
  summary,
  isExample = false,
}: {
  summary: CompanySummary;
  isExample?: boolean;
}) {
  return (
    <li className="company-card">
      <Link href={`/company/${summary.slug}`} className="company-card-link">
        <div className="company-card-head">
          <span className="company-card-name">{summary.name_zh}</span>
          <span className="company-card-ticker">{summary.ticker}</span>
          {isExample && <span className="company-card-tag">[示例]</span>}
        </div>
        <p className="company-card-oneliner">{summary.one_liner_zh}</p>
        <p className="company-card-meta">
          {summary.gics_sector && <>{summary.gics_sector} · </>}
          更新于 {summary.last_reviewed}
        </p>
      </Link>
    </li>
  );
}
