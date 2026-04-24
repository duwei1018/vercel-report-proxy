/**
 * Hand-written TypeScript types mirroring companies/_schema/company.schema.json.
 * Phase 1 strategy: hand-write for clarity; consider `json-schema-to-typescript`
 * as a CI step in Phase 2+ if maintenance burden grows.
 *
 * See companies/_schema/VALIDATION.md for human-readable field docs.
 */

export type Market = "us" | "hk" | "cn";

export type ExchangeCode =
  | "NASDAQ"
  | "NYSE"
  | "AMEX"
  | "OTC"
  | "HKEX"
  | "SSE"
  | "SZSE"
  | "BSE"
  | "TWSE"
  | "TSE"
  | "LSE"
  | "EURONEXT"
  | "OTHER";

export type MoatAssessment = "narrow" | "wide" | "none" | "unclear";

export type MoatType =
  | "network_effects"
  | "switching_costs"
  | "intangible_assets"
  | "cost_advantage"
  | "efficient_scale"
  | "other";

export type MoatStrength = "weak" | "moderate" | "strong";

export type RiskCategory =
  | "regulatory"
  | "competitive"
  | "technology"
  | "macro"
  | "geopolitical"
  | "execution"
  | "governance"
  | "ESG"
  | "financial"
  | "other";

export type VerificationType =
  | "financial_metric"
  | "product_launch"
  | "strategic_initiative"
  | "ESG_target"
  | "other";

export interface CompanyMeta {
  schema_version: string;
  last_reviewed: string;
  reviewer: string;
  data_freshness_note: string;
}

export interface CompanyIdentity {
  primary_ticker: string;
  aliases: string[];
  name_zh: string;
  name_zh_full?: string;
  name_en: string;
  slug: string;
  exchange: ExchangeCode;
  listing_date: string;
  fiscal_year_end: string;
  reporting_currency: string;
  hq_country: string;
  hq_city: string;
  website: string;
  ir_website?: string;
}

export interface CompanyClassification {
  gics_sector: string;
  gics_industry_group: string;
  primary_business_zh: string;
  business_one_liner_zh: string;
  business_one_liner_en: string;
}

export interface CompanySegment {
  name: string;
  revenue_share_fy2024?: number;
  margin_profile?: string;
  note?: string;
}

export interface CompanyBusinessModel {
  revenue_engines: string[];
  cost_structure_notes: string;
  unit_economics_highlights: string[];
}

export interface MoatTypeEntry {
  type: MoatType;
  strength: MoatStrength;
  reasoning_zh: string;
}

export interface CompanyMoat {
  assessment: MoatAssessment;
  types: MoatTypeEntry[];
  pat_dorsey_framework: Record<string, string>;
}

export interface CompanyChairmanCEO {
  name_zh: string;
  name_en: string;
  tenure_since: string;
  background_brief: string;
}

export interface CompanyKeyExecutive {
  name_zh: string;
  name_en?: string;
  role: string;
}

export interface CompanyManagement {
  chairman_ceo: CompanyChairmanCEO;
  key_executives: CompanyKeyExecutive[];
  governance_notes: string;
}

export interface TrackedPromise {
  id: string;
  promise_zh: string;
  promise_en?: string;
  source: string;
  made_on?: string;
  due_by?: string;
  verification_type: VerificationType;
}

export interface CompanyIntegrityTracking {
  tracked_promises: TrackedPromise[];
  scoring_data_location: string;
}

export interface CompanyKeyRisk {
  category: RiskCategory;
  risk_zh: string;
}

export interface PrimarySource {
  title: string;
  url: string;
}

export interface ThirdPartyResearch {
  title: string;
  url: string;
  note?: string;
}

export interface CompanyFurtherReading {
  primary_sources: PrimarySource[];
  third_party_research: ThirdPartyResearch[];
}

/**
 * The full company-archive shape. One YAML file in companies/{us,hk,cn}/<ticker>.yaml
 * deserializes to this.
 */
export interface CompanyArchive {
  /** EXAMPLE-only marker; real profiles must NOT set this */
  _example?: boolean;

  meta: CompanyMeta;
  identity: CompanyIdentity;
  classification: CompanyClassification;
  segments?: CompanySegment[];
  business_model: CompanyBusinessModel;
  moat: CompanyMoat;
  management: CompanyManagement;
  integrity_tracking: CompanyIntegrityTracking;
  key_risks: CompanyKeyRisk[];
  further_reading: CompanyFurtherReading;
  disclaimer: string;
}

/**
 * Listing-page summary, derived from CompanyArchive. Cheap to compute,
 * cheap to render. Used by /companies grid + global Cmd+K (v3+).
 */
export interface CompanySummary {
  slug: string;
  name_zh: string;
  name_en: string;
  ticker: string;
  exchange: ExchangeCode;
  market: Market;
  one_liner_zh: string;
  gics_sector: string;
  last_reviewed: string;
  is_example: boolean;
}

/**
 * Result of attempting to load a YAML — either the parsed + validated archive,
 * or a structured error describing why it failed.
 */
export type LoadResult<T> =
  | { ok: true; value: T }
  | { ok: false; reason: "not_found" | "yaml_parse_error" | "schema_invalid"; details?: string };
