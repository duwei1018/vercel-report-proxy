/**
 * Phase 1 smoke test for the siwuya-data loader.
 *
 * Run from project root: `npx tsx scripts/smoke-loader.ts`
 *
 * Asserts:
 *   1. EXAMPLE archive loads by slug
 *   2. EXAMPLE archive loads by ticker (primary + alias)
 *   3. listAllCompanies() default hides EXAMPLE
 *   4. listAllCompanies({ includeExamples: true }) includes EXAMPLE
 *   5. Unknown slug returns null
 *   6. Schema validation rejects malformed YAML
 *
 * Exit code: 0 if all pass, 1 if any fail.
 */
import {
  listAllCompanies,
  loadCompanyBySlug,
  loadCompanyByTicker,
  validateCompany,
} from "../src/lib/siwuya-data/index";

let passed = 0;
let failed = 0;

function assert(cond: boolean, msg: string) {
  if (cond) {
    console.log(`  PASS  ${msg}`);
    passed++;
  } else {
    console.log(`  FAIL  ${msg}`);
    failed++;
  }
}

async function main() {
  console.log("Phase 1 smoke — siwuya-data loader\n");

  console.log("[1] loadCompanyBySlug('example-company')");
  const ex = await loadCompanyBySlug("example-company");
  assert(ex !== null, "EXAMPLE archive loads by slug");
  assert(ex?.identity.primary_ticker === "EXAMPLE.US", "primary_ticker correct");
  assert(ex?.identity.name_zh === "示例", "name_zh correct");
  assert(ex?._example === true, "_example flag set");
  assert(
    Array.isArray(ex?.integrity_tracking.tracked_promises) &&
      (ex?.integrity_tracking.tracked_promises.length ?? 0) >= 1,
    "tracked_promises is non-empty array"
  );

  console.log("\n[2] loadCompanyByTicker — primary + alias");
  const byPrimary = await loadCompanyByTicker("EXAMPLE.US");
  assert(byPrimary?.identity.slug === "example-company", "primary ticker resolves");
  const byAlias = await loadCompanyByTicker("示例公司");
  assert(byAlias?.identity.slug === "example-company", "alias resolves");

  console.log("\n[3] listAllCompanies() default hides EXAMPLE");
  const listDefault = await listAllCompanies();
  const examplesInDefault = listDefault.filter((c) => c.is_example);
  assert(
    examplesInDefault.length === 0,
    `EXAMPLE filtered out (got ${listDefault.length} total, ${examplesInDefault.length} examples)`
  );

  console.log("\n[4] listAllCompanies({ includeExamples: true }) includes EXAMPLE");
  const listAll = await listAllCompanies({ includeExamples: true });
  const examplesIncluded = listAll.filter((c) => c.is_example);
  assert(
    examplesIncluded.length >= 1,
    `EXAMPLE included (got ${examplesIncluded.length} examples)`
  );

  console.log("\n[5] Unknown slug returns null");
  const notFound = await loadCompanyBySlug("totally-fake-slug-xyz");
  assert(notFound === null, "unknown slug returns null");

  console.log("\n[6] validateCompany rejects malformed input");
  const malformed = { meta: { schema_version: "0.1.0" } };
  const result = validateCompany(malformed);
  assert(!result.ok, "malformed object fails schema validation");
  if (!result.ok) {
    assert(
      result.errors.length > 0,
      `errors enumerated (got ${result.errors.length})`
    );
  }

  console.log(`\n${passed} passed, ${failed} failed`);
  process.exit(failed === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error("FATAL:", err);
  process.exit(1);
});
