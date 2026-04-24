import Link from "next/link";

export default function BriefNotFound() {
  return (
    <main className="brief-page">
      <nav className="company-breadcrumb">
        <Link href="/brief">← Weekly Brief 存档</Link>
      </nav>
      <h1>没找到这期 Brief</h1>
      <p>
        这个期号可能已经归档或删除。你可以:
      </p>
      <ul>
        <li>
          返回 <Link href="/brief">Brief 存档</Link> 看所有已发布的期数
        </li>
        <li>
          还没订阅? <Link href="/beta">订阅 Beta</Link>,下期自动送到邮箱
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
