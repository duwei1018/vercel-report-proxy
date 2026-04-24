import Link from "next/link";

export default function HomePage() {
  return (
    <main>
      <div className="brand-mark">思无崖 · siwuya</div>

      <h1>一个基于连续追踪的价值投资研究合作者</h1>

      <p>
        我们追踪上市公司管理层的公开承诺,记录它们在时间里的兑现度,
        并把社区共识与市场分歧的演化整理成可以反复回看的研究底稿。
      </p>

      <h2>正在建设</h2>

      <ul>
        <li>
          <Link href="/companies">浏览公司档案</Link>
          <span className="coming-soon">v2 Phase 2</span>
        </li>
        <li>
          <Link href="/brief">历期 Weekly Brief</Link>
          <span className="coming-soon">v2 Phase 4</span>
        </li>
        <li>
          <Link href="/beta">订阅 Beta</Link>
          <span className="coming-soon">v2 Phase 3</span>
        </li>
      </ul>

      <h2>开源</h2>

      <p>
        公司档案结构、诚信评分算法、研究模板均开源在{" "}
        <a
          href="https://github.com/duwei1018/siwuya-data"
          target="_blank"
          rel="noopener noreferrer"
        >
          siwuya-data
        </a>
        ,任何价值投资研究者都可以使用、贡献。
      </p>

      <footer className="disclaimer">
        <p>
          本站内容仅供研究讨论,不构成任何投资建议。详见{" "}
          <Link href="/disclaimer">免责声明</Link>。
        </p>
      </footer>
    </main>
  );
}
