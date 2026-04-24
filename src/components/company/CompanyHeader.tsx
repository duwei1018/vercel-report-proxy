import type { CompanyArchive } from "@/lib/siwuya-data";

export function CompanyHeader({ archive }: { archive: CompanyArchive }) {
  const { identity, classification, _example } = archive;
  return (
    <header className="company-header">
      {_example && (
        <div className="example-badge" aria-label="示例档案">
          [示例] 这是 schema 示例档案,不代表任何真实公司
        </div>
      )}
      <p className="company-eyebrow">
        {identity.exchange} · {identity.primary_ticker}
        {classification.gics_sector && <> · {classification.gics_sector}</>}
      </p>
      <h1 className="company-name">{identity.name_zh}</h1>
      <p className="company-name-en">
        {identity.name_en}
        {identity.name_zh_full && <> · {identity.name_zh_full}</>}
      </p>
      <p className="company-oneliner">{classification.business_one_liner_zh}</p>
    </header>
  );
}
