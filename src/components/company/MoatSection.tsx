import type { CompanyArchive, MoatAssessment, MoatStrength } from "@/lib/siwuya-data";

const ASSESSMENT_LABEL: Record<MoatAssessment, string> = {
  wide: "宽护城河",
  narrow: "窄护城河",
  none: "无护城河",
  unclear: "尚未明确",
};

const STRENGTH_LABEL: Record<MoatStrength, string> = {
  strong: "强",
  moderate: "中",
  weak: "弱",
};

export function MoatSection({ archive }: { archive: CompanyArchive }) {
  const { moat } = archive;
  const dorseyEntries = Object.entries(moat.pat_dorsey_framework);
  return (
    <section className="company-section">
      <h2>护城河</h2>
      <p className="moat-assessment">
        总体评估:<strong>{ASSESSMENT_LABEL[moat.assessment]}</strong>
      </p>

      {moat.types.length > 0 && (
        <>
          <h3>护城河类型与推理</h3>
          <ul className="moat-types">
            {moat.types.map((t, i) => (
              <li key={i}>
                <strong>{t.type}</strong> · 强度 {STRENGTH_LABEL[t.strength]}
                <p>{t.reasoning_zh}</p>
              </li>
            ))}
          </ul>
        </>
      )}

      {dorseyEntries.length > 0 && (
        <>
          <h3>Pat Dorsey 框架</h3>
          <dl className="dorsey-framework">
            {dorseyEntries.map(([key, value]) => (
              <div key={key} className="dorsey-row">
                <dt>{key}</dt>
                <dd>{value}</dd>
              </div>
            ))}
          </dl>
        </>
      )}
    </section>
  );
}
