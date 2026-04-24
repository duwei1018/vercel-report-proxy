import type { CompanyArchive } from "@/lib/siwuya-data";

export function FurtherReadingSection({ archive }: { archive: CompanyArchive }) {
  const { primary_sources, third_party_research } = archive.further_reading;
  if (primary_sources.length === 0 && third_party_research.length === 0) {
    return null;
  }
  return (
    <section className="company-section">
      <h2>延伸阅读</h2>

      {primary_sources.length > 0 && (
        <>
          <h3>一手资料</h3>
          <ul className="reading-list">
            {primary_sources.map((source, i) => (
              <li key={i}>
                <a href={source.url} target="_blank" rel="noopener noreferrer">
                  {source.title}
                </a>
              </li>
            ))}
          </ul>
        </>
      )}

      {third_party_research.length > 0 && (
        <>
          <h3>第三方研究</h3>
          <ul className="reading-list">
            {third_party_research.map((item, i) => (
              <li key={i}>
                <a href={item.url} target="_blank" rel="noopener noreferrer">
                  {item.title}
                </a>
                {item.note && <p className="reading-note">{item.note}</p>}
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}
