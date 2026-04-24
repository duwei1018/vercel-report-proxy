import Link from "next/link";

/**
 * 页底搜索框：原生 form GET → /companies?q=xxx
 * 单页底部一处，不是全站 Cmd+K nav bar（后者是 v3 范围）。
 * 服务端组件，无 JS 依赖，JS 禁用时也可用。
 */
export function FooterSearch() {
  return (
    <section className="footer-search">
      <form action="/companies" method="get" role="search">
        <label htmlFor="footer-search-q" className="visually-hidden">
          搜索公司档案
        </label>
        <input
          id="footer-search-q"
          type="search"
          name="q"
          placeholder="搜索公司档案（名称 / ticker）"
          autoComplete="off"
        />
        <button type="submit" className="footer-search-btn">
          搜索
        </button>
      </form>
      <p className="footer-search-hint">
        只搜索档案库内已收录的公司。没找到？
        <Link href="/companies">浏览全部</Link> · 或{" "}
        <a
          href="https://github.com/duwei1018/siwuya-data"
          target="_blank"
          rel="noopener noreferrer"
        >
          贡献新档案
        </a>
        。
      </p>
    </section>
  );
}
