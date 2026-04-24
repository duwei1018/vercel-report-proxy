import Link from "next/link";

export function DisclaimerFooter({ lastReviewed }: { lastReviewed?: string }) {
  return (
    <footer className="disclaimer">
      <p>
        本档案为研究底稿,不构成任何投资建议。
        {lastReviewed && <> 最后审阅:{lastReviewed}。</>}
        {" "}
        详见 <Link href="/disclaimer">免责声明</Link>。
      </p>
      <p>
        档案数据开源于{" "}
        <a
          href="https://github.com/duwei1018/siwuya-data"
          target="_blank"
          rel="noopener noreferrer"
        >
          siwuya-data
        </a>
        ,欢迎社区贡献新公司档案。
      </p>
    </footer>
  );
}
