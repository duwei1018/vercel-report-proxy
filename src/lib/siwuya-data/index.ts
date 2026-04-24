/**
 * Public API for the siwuya-data data layer.
 *
 * Consumers (page components, API routes) should only import from this barrel,
 * not the internal modules — that way we can refactor freely below.
 */
export {
  listAllCompanies,
  loadCompanyBySlug,
  loadCompanyByTicker,
} from "./loader";

export {
  validateCompany,
  formatValidationErrors,
} from "./validator";

export type {
  CompanyArchive,
  CompanySummary,
  CompanyMeta,
  CompanyIdentity,
  CompanyClassification,
  CompanySegment,
  CompanyBusinessModel,
  CompanyMoat,
  MoatTypeEntry,
  CompanyManagement,
  CompanyChairmanCEO,
  CompanyKeyExecutive,
  CompanyIntegrityTracking,
  TrackedPromise,
  CompanyKeyRisk,
  CompanyFurtherReading,
  PrimarySource,
  ThirdPartyResearch,
  Market,
  ExchangeCode,
  MoatAssessment,
  MoatType,
  MoatStrength,
  RiskCategory,
  VerificationType,
  LoadResult,
} from "./types";

export type { ValidationResult, ValidationOk, ValidationError } from "./validator";
