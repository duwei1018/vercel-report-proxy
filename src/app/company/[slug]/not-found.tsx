import Link from "next/link";

export default function CompanyNotFound() {
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
      <footer className="disclaimer">
        <p>
          <Link href="/">← 返回首页</Link>
        </p>
      </footer>
    </main>
  );
}
