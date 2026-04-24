/**
 * YAML company-archive loader for siwuya-data.
 *
 * Strategy:
 *   - Read companies/{us,hk,cn}/*.yaml from the siwuya-data submodule
 *   - Parse with js-yaml, validate against the JSON schema
 *   - Wrap in React `cache()` so repeated reads in the same request hit memo
 *   - Schema-invalid YAML logs a warning and is treated as "not found" — we
 *     never crash the page, since one bad profile shouldn't take the site down
 *
 * Path resolution:
 *   - In Next.js (server), `process.cwd()` is the project root (vercel-report-proxy/)
 *   - The siwuya-data git submodule lives at src/content/siwuya-data
 *   - On Vercel, the submodule is checked out automatically before build
 *     (Vercel Git integration follows .gitmodules)
 */
import fs from "node:fs/promises";
import path from "node:path";
import yaml from "js-yaml";
import { cache } from "react";
import type { CompanyArchive, CompanySummary, Market, LoadResult } from "./types";
import { validateCompany, formatValidationErrors } from "./validator";

const DATA_ROOT = path.join(
  process.cwd(),
  "src",
  "content",
  "siwuya-data"
);

const COMPANIES_ROOT = path.join(DATA_ROOT, "companies");
const MARKETS: Market[] = ["us", "hk", "cn"];

// ---------- internal helpers ----------

async function readYaml(absPath: string): Promise<LoadResult<CompanyArchive>> {
  let raw: string;
  try {
    raw = await fs.readFile(absPath, "utf-8");
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") {
      return { ok: false, reason: "not_found" };
    }
    throw err;
  }

  let parsed: unknown;
  try {
    parsed = yaml.load(raw, { filename: absPath });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[siwuya-data] YAML parse error in ${absPath}: ${msg}`);
    return { ok: false, reason: "yaml_parse_error", details: msg };
  }

  const result = validateCompany(parsed);
  if (!result.ok) {
    console.error(
      `[siwuya-data] schema invalid: ${absPath}\n${formatValidationErrors(result)}`
    );
    return {
      ok: false,
      reason: "schema_invalid",
      details: formatValidationErrors(result),
    };
  }
  return { ok: true, value: result.value };
}

async function listYamlFiles(dir: string): Promise<string[]> {
  let entries: string[];
  try {
    entries = await fs.readdir(dir);
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") {
      return [];
    }
    throw err;
  }
  return entries
    .filter((n) => n.endsWith(".yaml") && !n.startsWith("."))
    .map((n) => path.join(dir, n));
}

function toSummary(
  archive: CompanyArchive,
  market: Market
): CompanySummary {
  return {
    slug: archive.identity.slug,
    name_zh: archive.identity.name_zh,
    name_en: archive.identity.name_en,
    ticker: archive.identity.primary_ticker,
    exchange: archive.identity.exchange,
    market,
    one_liner_zh: archive.classification.business_one_liner_zh,
    gics_sector: archive.classification.gics_sector,
    last_reviewed: archive.meta.last_reviewed,
    is_example: archive._example === true,
  };
}

// ---------- public API ----------

/**
 * Walk every market dir, load + validate every YAML, return summaries.
 * Schema-invalid files are silently skipped (with a server-side warning log).
 *
 * Use `includeExamples: true` to include EXAMPLE archives (default false:
 * production listing pages should hide them).
 */
export const listAllCompanies = cache(
  async (
    options: { includeExamples?: boolean } = {}
  ): Promise<CompanySummary[]> => {
    const includeExamples = options.includeExamples === true;
    const summaries: CompanySummary[] = [];

    for (const market of MARKETS) {
      const dir = path.join(COMPANIES_ROOT, market);
      const files = await listYamlFiles(dir);
      for (const file of files) {
        const result = await readYaml(file);
        if (!result.ok) continue;
        const summary = toSummary(result.value, market);
        if (summary.is_example && !includeExamples) continue;
        summaries.push(summary);
      }
    }

    if (includeExamples) {
      const examplesDir = path.join(COMPANIES_ROOT, "_examples");
      const files = await listYamlFiles(examplesDir);
      for (const file of files) {
        const result = await readYaml(file);
        if (!result.ok) continue;
        // EXAMPLE archives get an arbitrary "us" market slot for typing,
        // but consumers should branch on `is_example` first.
        summaries.push(toSummary(result.value, "us"));
      }
    }

    return summaries.sort((a, b) =>
      a.last_reviewed > b.last_reviewed ? -1 : 1
    );
  }
);

/**
 * Look up a single archive by its `identity.slug`. Walks every market dir
 * + _examples until it finds a match. Returns null if not found or invalid.
 */
export const loadCompanyBySlug = cache(
  async (slug: string): Promise<CompanyArchive | null> => {
    const searchRoots = [
      ...MARKETS.map((m) => path.join(COMPANIES_ROOT, m)),
      path.join(COMPANIES_ROOT, "_examples"),
    ];

    for (const root of searchRoots) {
      const files = await listYamlFiles(root);
      for (const file of files) {
        const result = await readYaml(file);
        if (!result.ok) continue;
        if (result.value.identity.slug === slug) {
          return result.value;
        }
      }
    }
    return null;
  }
);

/**
 * Look up by ticker (exact or alias). Useful for /company/AAPL style URLs
 * where the user may pass a ticker rather than slug.
 */
export const loadCompanyByTicker = cache(
  async (ticker: string): Promise<CompanyArchive | null> => {
    const needle = ticker.trim();
    if (!needle) return null;

    const searchRoots = [
      ...MARKETS.map((m) => path.join(COMPANIES_ROOT, m)),
      path.join(COMPANIES_ROOT, "_examples"),
    ];

    for (const root of searchRoots) {
      const files = await listYamlFiles(root);
      for (const file of files) {
        const result = await readYaml(file);
        if (!result.ok) continue;
        const id = result.value.identity;
        if (
          id.primary_ticker === needle ||
          id.aliases.some((a) => a === needle)
        ) {
          return result.value;
        }
      }
    }
    return null;
  }
);
