import type { CompanyArchive, RiskCategory } from "@/lib/siwuya-data";

const CATEGORY_LABEL: Record<RiskCategory, string> = {
  regulatory: "监管",
  competitive: "竞争",
  technology: "技术",
  macro: "宏观",
  geopolitical: "地缘",
  execution: "执行",
  governance: "治理",
  ESG: "ESG",
  financial: "财务",
  other: "其他",
};

export function KeyRisksSection({ archive }: { archive: CompanyArchive }) {
  if (archive.key_risks.length === 0) return null;
  return (
    <section className="company-section">
      <h2>关键风险</h2>
      <ul className="risks-list">
        {archive.key_risks.map((risk, i) => (
          <li key={i}>
            <span className="risk-category">{CATEGORY_LABEL[risk.category]}</span>
            <span className="risk-text">{risk.risk_zh}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
