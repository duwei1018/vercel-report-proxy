import Link from "next/link";

export const metadata = {
  title: "免责声明 · 思无崖",
};

export default function DisclaimerPage() {
  return (
    <main>
      <div className="brand-mark">
        <Link href="/">← 思无崖 · siwuya</Link>
      </div>

      <h1>免责声明</h1>

      <h2>研究性质</h2>
      <p>
        思无崖(siwuya.org)发布的所有内容——包括公司档案、Weekly Brief、
        承诺追踪记录、诚信评分——均为我们对公开信息进行结构化整理与判断的
        <strong>研究成果</strong>,目的是为价值投资研究者提供可反复回看的
        长期参考底稿。
      </p>

      <h2>不构成投资建议</h2>
      <p>
        本站任何内容都<strong>不构成</strong>对任何证券、衍生品或其他金融
        产品的购买、持有、出售建议,也不构成任何形式的财务、税务、法律意见。
        投资决策应当基于读者自身的判断与具备资质的专业人士提供的建议。
      </p>

      <h2>数据局限</h2>
      <p>
        本站使用的所有数据均来自公开渠道(交易所披露、公司财报、监管文件、
        公开报道等)。我们尽力保证数据的及时性与准确性,但不对其完整性、
        无错性、无遗漏作任何承诺。如发现错误,欢迎{" "}
        <a href="mailto:report@siwuya.org">来信指正</a>。
      </p>

      <h2>判断的边界</h2>
      <p>
        诚信评分、承诺兑现度评估等判断性内容均带有作者署名(judged_by)与
        推理过程(reasoning),欢迎挑战与讨论。我们不主张这些判断是终局结论,
        而是将其作为<strong>可被反驳的工作假设</strong>呈现。
      </p>

      <h2>立场披露</h2>
      <p>
        本站作者及其关联方可能持有或交易所讨论公司的证券。这种持仓不会
        改变研究判断,但读者应当知晓这一可能性。重大持仓变化将在相关研究
        中明示。
      </p>

      <h2>更新</h2>
      <p>本声明可能随服务演进而更新,以本页最新版本为准。</p>

      <footer className="disclaimer">
        <p>
          <Link href="/">← 返回首页</Link>
        </p>
      </footer>
    </main>
  );
}
