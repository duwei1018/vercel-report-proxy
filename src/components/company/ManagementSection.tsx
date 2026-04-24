import type { CompanyArchive } from "@/lib/siwuya-data";

export function ManagementSection({ archive }: { archive: CompanyArchive }) {
  const { management } = archive;
  const ceo = management.chairman_ceo;
  return (
    <section className="company-section">
      <h2>管理层</h2>

      <h3>董事长 / CEO</h3>
      <p>
        <strong>
          {ceo.name_zh}
          {ceo.name_en && <> · {ceo.name_en}</>}
        </strong>
        <span className="ceo-tenure"> · 任期自 {ceo.tenure_since}</span>
      </p>
      <p>{ceo.background_brief}</p>

      {management.key_executives.length > 0 && (
        <>
          <h3>核心高管</h3>
          <ul className="executives-list">
            {management.key_executives.map((exec, i) => (
              <li key={i}>
                <strong>{exec.role}</strong> · {exec.name_zh}
                {exec.name_en && <> ({exec.name_en})</>}
              </li>
            ))}
          </ul>
        </>
      )}

      {management.governance_notes && (
        <>
          <h3>治理结构</h3>
          <p>{management.governance_notes}</p>
        </>
      )}
    </section>
  );
}
