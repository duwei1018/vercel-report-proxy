/**
 * AJV-based validator for company-archive YAMLs against company.schema.json.
 *
 * Used both at:
 *   - Runtime by loader.ts (warns on schema-invalid YAML, returns null instead of crashing)
 *   - Dev / CI time by scripts/validate-companies.ts (fails the build on any invalid file)
 */
import Ajv2020 from "ajv/dist/2020.js";
import addFormats from "ajv-formats";
import schema from "../../content/siwuya-data/companies/_schema/company.schema.json";
import type { CompanyArchive } from "./types";

const ajv = new Ajv2020({
  allErrors: true,
  strict: false,
  validateFormats: true,
});
addFormats(ajv);

const validateFn = ajv.compile<CompanyArchive>(schema as object);

export interface ValidationOk {
  ok: true;
  value: CompanyArchive;
}

export interface ValidationError {
  ok: false;
  errors: Array<{
    path: string;
    message: string;
  }>;
}

export type ValidationResult = ValidationOk | ValidationError;

export function validateCompany(raw: unknown): ValidationResult {
  if (validateFn(raw)) {
    return { ok: true, value: raw as CompanyArchive };
  }
  const errs = (validateFn.errors ?? []).map((e) => ({
    path: e.instancePath || "<root>",
    message: e.message ?? "unknown",
  }));
  return { ok: false, errors: errs };
}

export function formatValidationErrors(result: ValidationError): string {
  return result.errors
    .map((e) => `  [${e.path}] ${e.message}`)
    .join("\n");
}
