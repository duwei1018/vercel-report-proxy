import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";

import { loadCompanyBySlug } from "@/lib/siwuya-data";
import { CompanyHeader } from "@/components/company/CompanyHeader";
import { BusinessModelSection } from "@/components/company/BusinessModelSection";
import { MoatSection } from "@/components/company/MoatSection";
import { ManagementSection } from "@/components/company/ManagementSection";
import { IntegrityTrackerStub } from "@/components/company/IntegrityTrackerStub";
import { KeyRisksSection } from "@/components/company/KeyRisksSection";
import { FurtherReadingSection } from "@/components/company/FurtherReadingSection";
import { DisclaimerFooter } from "@/components/company/DisclaimerFooter";
import { FooterSearch } from "@/components/FooterSearch";
import RecentDocs from "../../RecentDocs";

type Params = { slug: string };

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { slug } = await params;
  const archive = await loadCompanyBySlug(slug);
  if (!archive) {
    notFound();
  }
  const id = archive.identity;
  return {
    title: `${id.name_zh}(${id.primary_ticker}) · 公司档案 · 思无崖`,
    description: archive.classification.business_one_liner_zh,
  };
}

export default async function CompanyDetailPage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { slug } = await params;
  const archive = await loadCompanyBySlug(slug);
  if (!archive) notFound();

  return (
    <main className="company-page">
      <nav className="company-breadcrumb">
        <Link href="/companies">← 公司档案库</Link>
      </nav>

      <CompanyHeader archive={archive} />
      <BusinessModelSection archive={archive} />
      <MoatSection archive={archive} />
      <ManagementSection archive={archive} />
      <IntegrityTrackerStub archive={archive} />
      <KeyRisksSection archive={archive} />
      <FurtherReadingSection archive={archive} />
      <RecentDocs
        limit={6}
        heading="近期动态"
        subheading="思无崖日报系统近期追踪的市场文档"
        moreLink={false}
      />
      <FooterSearch />
      <DisclaimerFooter lastReviewed={archive.meta.last_reviewed} />
    </main>
  );
}
