/**
 * Weekly Brief loader.
 *
 * Briefs live as markdown files in src/content/briefs/, each with frontmatter:
 *
 *   ---
 *   date: 2026-05-15
 *   issue_number: 1
 *   title: "思无崖 Weekly Brief · 第 1 期"
 *   summary: "..."
 *   companies_covered: [xiaomi, pinduoduo]
 *   preview: public
 *   author: "@siwuya"
 *   ---
 *   # Body
 *
 * Files whose name starts with `_` or `.` are skipped so admins can keep
 * drafts in the same directory without publishing them.
 */
import fs from "node:fs/promises";
import path from "node:path";
import matter from "gray-matter";
import { remark } from "remark";
import remarkHtml from "remark-html";
import { cache } from "react";
import { listAllCompanies } from "@/lib/siwuya-data";
import { enrichBriefHtml } from "./autoLink";
import type {
  Brief,
  BriefFrontmatter,
  BriefSummary,
  LoadBriefResult,
} from "./types";

const BRIEFS_ROOT = path.join(process.cwd(), "src", "content", "briefs");

function briefSlugFromFilename(filename: string): string {
  return filename.replace(/\.md$/i, "");
}

function isValidFrontmatter(data: unknown): data is BriefFrontmatter {
  if (typeof data !== "object" || !data) return false;
  const d = data as Record<string, unknown>;
  return (
    typeof d.date === "string" &&
    typeof d.issue_number === "number" &&
    typeof d.title === "string" &&
    typeof d.summary === "string"
  );
}

async function renderMarkdown(md: string): Promise<string> {
  const file = await remark()
    .use(remarkHtml, { sanitize: false })
    .process(md);
  return String(file);
}

async function readBrief(absPath: string): Promise<LoadBriefResult> {
  let raw: string;
  try {
    raw = await fs.readFile(absPath, "utf-8");
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") {
      return { ok: false, reason: "not_found" };
    }
    throw err;
  }

  let parsed: matter.GrayMatterFile<string>;
  try {
    parsed = matter(raw);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[briefs] gray-matter parse failed: ${absPath}: ${msg}`);
    return { ok: false, reason: "parse_error", details: msg };
  }

  if (!isValidFrontmatter(parsed.data)) {
    const msg = "frontmatter missing required fields (date/issue_number/title/summary)";
    console.error(`[briefs] invalid frontmatter: ${absPath}: ${msg}`);
    return { ok: false, reason: "parse_error", details: msg };
  }

  const fm = parsed.data;
  const filename = path.basename(absPath);
  const slug = briefSlugFromFilename(filename);
  const companies = await listAllCompanies({ includeExamples: true });

  let contentHtml: string;
  try {
    const rawHtml = await renderMarkdown(parsed.content);
    contentHtml = enrichBriefHtml(rawHtml, companies);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[briefs] render failed: ${absPath}: ${msg}`);
    return { ok: false, reason: "parse_error", details: msg };
  }

  const summary: BriefSummary = {
    slug,
    date: fm.date,
    issue_number: fm.issue_number,
    title: fm.title,
    summary: fm.summary,
    companies_covered: fm.companies_covered ?? [],
    preview: fm.preview ?? "public",
    author: fm.author ?? "@siwuya",
  };

  return {
    ok: true,
    value: { ...summary, rawMarkdown: parsed.content, contentHtml },
  };
}

async function listBriefFiles(): Promise<string[]> {
  let entries: string[];
  try {
    entries = await fs.readdir(BRIEFS_ROOT);
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") {
      return [];
    }
    throw err;
  }
  // Require filename starts with YYYY-MM- so the loader ignores README.md,
  // draft files (_draft-*), and anything else that isn't a publishable issue.
  const BRIEF_FILE_RE = /^\d{4}-\d{2}-.*\.md$/i;
  return entries
    .filter((n) => BRIEF_FILE_RE.test(n) && !n.startsWith("_") && !n.startsWith("."))
    .map((n) => path.join(BRIEFS_ROOT, n));
}

export const listAllBriefs = cache(async (): Promise<BriefSummary[]> => {
  const files = await listBriefFiles();
  const results: BriefSummary[] = [];
  for (const f of files) {
    const r = await readBrief(f);
    if (r.ok) {
      // strip body from summary rows
      const { rawMarkdown: _m, contentHtml: _h, ...summary } = r.value;
      results.push(summary);
    }
  }
  return results.sort((a, b) => (a.date > b.date ? -1 : 1));
});

export const loadBriefBySlug = cache(
  async (slug: string): Promise<Brief | null> => {
    const abs = path.join(BRIEFS_ROOT, `${slug}.md`);
    const r = await readBrief(abs);
    if (!r.ok) return null;
    return r.value;
  }
);
