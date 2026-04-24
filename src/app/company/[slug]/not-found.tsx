import Link from "next/link";
import RecentDocs from "../../RecentDocs";

// 提升 404 用户体验：除了贡献 CTA，额外展示 info-collector 近期文档
// 让访客有内容可以消费，降低直接流失率。
// 复用 RecentDocs（client component），服务端 fetch 会被 CF 挑战，server 版不渲染。

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

      <RecentDocs
        limit={6}
        heading="看看最新动态"
        subheading="思无崖日报系统近期追踪的文档,也许有你感兴趣的公司"
      />

      <footer className="disclaimer" style={{ marginTop: 32 }}>
        <p>
          <Link href="/">← 返回首页</Link>
        </p>
      </footer>
    </main>
  );
}
