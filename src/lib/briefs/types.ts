export type BriefPreview = "public" | "subscribers_only";

export interface BriefFrontmatter {
  date: string; // YYYY-MM-DD
  issue_number: number;
  title: string;
  summary: string;
  companies_covered?: string[]; // slug references
  preview?: BriefPreview; // default "public" in v2
  author?: string;
}

export interface BriefSummary {
  slug: string; // filename without .md
  date: string;
  issue_number: number;
  title: string;
  summary: string;
  companies_covered: string[];
  preview: BriefPreview;
  author: string;
}

export interface Brief extends BriefSummary {
  /** raw markdown body */
  rawMarkdown: string;
  /** safe HTML rendered from markdown */
  contentHtml: string;
}

export type LoadBriefResult =
  | { ok: true; value: Brief }
  | { ok: false; reason: "not_found" | "parse_error"; details?: string };
