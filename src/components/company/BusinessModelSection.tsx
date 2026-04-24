import type { CompanyArchive } from "@/lib/siwuya-data";

function formatShare(share?: number): string {
  if (typeof share !== "number") return "";
  return `${(share * 100).toFixed(0)}%`;
}

export function BusinessModelSection({ archive }: { archive: CompanyArchive }) {
  const { business_model, segments } = archive;
  return (
    <section className="company-section">
      <h2>业务模型</h2>

      {segments && segments.length > 0 && (
        <>
          <h3>分部收入构成</h3>
          <ul className="segments-list">
            {segments.map((seg) => (
              <li key={seg.name}>
                <strong>{seg.name}</strong>
                {typeof seg.revenue_share_fy2024 === "number" && (
                  <span className="segment-share">
                    {" "}· {formatShare(seg.revenue_share_fy2024)}
                  </span>
                )}
                {seg.margin_profile && <> · {seg.margin_profile}</>}
                {seg.note && <p className="segment-note">{seg.note}</p>}
              </li>
            ))}
          </ul>
        </>
      )}

      <h3>收入引擎</h3>
      <ul>
        {business_model.revenue_engines.map((engine, i) => (
          <li key={i}>{engine}</li>
        ))}
      </ul>

      {business_model.cost_structure_notes && (
        <>
          <h3>成本结构</h3>
          <p>{business_model.cost_structure_notes}</p>
        </>
      )}

      {business_model.unit_economics_highlights.length > 0 && (
        <>
          <h3>单位经济</h3>
          <ul>
            {business_model.unit_economics_highlights.map((point, i) => (
              <li key={i}>{point}</li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}
