import Link from "next/link";
import type { Metadata } from "next";
import { SubscribeForm } from "./SubscribeForm";

export const metadata: Metadata = {
  title: "订阅 Weekly Brief · 思无崖 Beta",
  description:
    "每周五 19:00(港时)送到邮箱的价值投资连续追踪简报。Beta 期间免费。",
};

export default function BetaPage() {
  return (
    <main className="beta-page">
      <nav className="brand-mark">
        <Link href="/">← 思无崖 · siwuya</Link>
      </nav>

      <section className="beta-hero">
        <h1>思无崖 · 价值投资研究合作者</h1>
        <p className="beta-subtitle">
          每周五 19:00(港时)· 你关注公司的本周综述,送到你的邮箱。
        </p>
      </section>

      <section className="beta-value-props">
        <div>
          <h3>连续追踪</h3>
          <p>基于多年连续追踪的事件关联与因果图谱,不是单点快讯。</p>
        </div>
        <div>
          <h3>承诺兑现度</h3>
          <p>管理层公开承诺的结构化追踪,每一次跟进都留痕。</p>
        </div>
        <div>
          <h3>社区共识</h3>
          <p>社区判断与市场共识的分歧,在时间里被验证或推翻。</p>
        </div>
      </section>

      <SubscribeForm />

      <section className="beta-info">
        <ul>
          <li>Beta 期间免费,期限不设限。</li>
          <li>
            未来如转为订阅制,会提前 30 天邮件通知,Beta 用户享首期优惠。
          </li>
          <li>
            所有公司档案、研究方法论永久免费并开源在{" "}
            <a
              href="https://github.com/duwei1018/siwuya-data"
              target="_blank"
              rel="noopener noreferrer"
            >
              siwuya-data
            </a>
            。
          </li>
        </ul>
      </section>

      <footer className="disclaimer">
        <p>
          开源数据仓库:{" "}
          <a
            href="https://github.com/duwei1018/siwuya-data"
            target="_blank"
            rel="noopener noreferrer"
          >
            siwuya-data on GitHub
          </a>
        </p>
        <p>
          <Link href="/disclaimer">免责声明</Link> ·{" "}
          <Link href="/companies">浏览公司档案</Link>
        </p>
      </footer>
    </main>
  );
}
