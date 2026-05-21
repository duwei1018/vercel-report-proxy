const reports = [
  {
    title: "Apple v4.3 PUBLIC",
    subtitle: "Recommended short edition, about 32 pages.",
    tag: "PUBLIC",
    href: "https://report.siwuya.org/r2/report-series/apple-v43/AAPL_report_public_v4_3.html",
    md: "https://report.siwuya.org/r2/report-series/apple-v43/AAPL_report_public_v4_3.md",
    docx: "https://report.siwuya.org/r2/report-series/apple-v43/AAPL_report_public_v4_3.docx",
  },
  {
    title: "Apple v4.3 Complete",
    subtitle: "Full research edition, about 104 pages.",
    tag: "COMPLETE",
    href: "https://report.siwuya.org/r2/report-series/apple-v43/AAPL_report_complete_v4_3.html",
    md: "https://report.siwuya.org/r2/report-series/apple-v43/AAPL_report_complete_v4_3.md",
    docx: "https://report.siwuya.org/r2/report-series/apple-v43/AAPL_report_complete_v4_3.docx",
  },
  {
    title: "Apple internal v4.1",
    subtitle: "Internal long-form edition, about 94 pages.",
    tag: "INTERNAL",
    href: "https://report.siwuya.org/r2/report-series/apple-v43/AAPL_report_internal_v4_1.html",
    md: "https://report.siwuya.org/r2/report-series/apple-v43/AAPL_report_internal_v4_1.md",
    docx: "https://report.siwuya.org/r2/report-series/apple-v43/AAPL_report_internal_v4_1.docx",
  },
];

const nextSeries = [
  ["PDD v1.0", "Reserved for the post 2026-05-28 package."],
  ["MSFT v4", "5family June narrative slot."],
  ["GOOGL v4", "5family June narrative slot."],
  ["AMZN v4", "5family June narrative slot."],
  ["Costco v4", "5family June narrative slot."],
];

export default function AppleV43SeriesPage() {
  return (
    <main className="report-series-v43">
      <div className="series-topline">
        <a href="/" className="series-brand">
          SiWuYa Reports
        </a>
        <span>Apple v4.3 series · 2026-05-21</span>
      </div>

      <header className="series-hero">
        <h1>Apple v4.3 Report Series</h1>
        <p>
          One entry for the PUBLIC edition, the complete edition, and the
          internal v4.1 long-form edition. Follow-on PDD and 5family slots are
          staged on the same surface.
        </p>
      </header>

      <section className="series-grid" aria-label="Apple report editions">
        {reports.map((report) => (
          <article className="series-card" key={report.title}>
            <div className="series-tag">{report.tag}</div>
            <h2>{report.title}</h2>
            <p>{report.subtitle}</p>
            <div className="series-links">
              <a className="primary" href={report.href}>
                Read HTML
              </a>
              <a href={report.md}>MD</a>
              <a href={report.docx}>DOCX</a>
            </div>
          </article>
        ))}
      </section>

      <section className="series-next" aria-label="Next report series">
        <h2>Next series</h2>
        <div className="series-placeholder-grid">
          {nextSeries.map(([name, note]) => (
            <div className="series-placeholder" key={name}>
              <strong>{name}</strong>
              <span>{note}</span>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
