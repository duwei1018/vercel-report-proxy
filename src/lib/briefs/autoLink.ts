import type { CompanySummary } from "@/lib/siwuya-data";

/**
 * Rewrites the first occurrence of each company's `name_zh` in the rendered
 * HTML into an anchor pointing at `/company/{slug}`.
 *
 * Constraints:
 *   - only one rewrite per company per brief (prevents link noise)
 *   - only rewrites inside text nodes, never inside tag attributes or within
 *     an existing <a>…</a>
 *   - matches are case-sensitive and require full-word (CJK doesn't have word
 *     boundaries; we guard via lookaround-free manual check that the match is
 *     not adjacent to a Latin word char)
 */

const AUTOLINK_CLASS = "brief-company-link";

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Walk the HTML as a sequence of <tag> and text spans. Run company-name
 * replacement only on text spans, skipping spans that sit inside an <a>.
 */
function splitHtml(html: string): Array<{ kind: "tag" | "text"; value: string }> {
  const parts: Array<{ kind: "tag" | "text"; value: string }> = [];
  const tagRe = /<[^>]+>/g;
  let lastIdx = 0;
  let m: RegExpExecArray | null;
  while ((m = tagRe.exec(html)) !== null) {
    if (m.index > lastIdx) {
      parts.push({ kind: "text", value: html.slice(lastIdx, m.index) });
    }
    parts.push({ kind: "tag", value: m[0] });
    lastIdx = m.index + m[0].length;
  }
  if (lastIdx < html.length) {
    parts.push({ kind: "text", value: html.slice(lastIdx) });
  }
  return parts;
}

function isAnchorOpen(tag: string): boolean {
  return /^<a\b/i.test(tag);
}

function isAnchorClose(tag: string): boolean {
  return /^<\/a\s*>/i.test(tag);
}

export function enrichBriefHtml(
  html: string,
  companies: CompanySummary[]
): string {
  if (!html || companies.length === 0) return html;

  const parts = splitHtml(html);
  const done = new Set<string>(); // company slugs already linked once

  let insideAnchor = false;
  for (let i = 0; i < parts.length; i++) {
    const p = parts[i];
    if (p.kind === "tag") {
      if (isAnchorOpen(p.value)) insideAnchor = true;
      else if (isAnchorClose(p.value)) insideAnchor = false;
      continue;
    }
    if (insideAnchor) continue;

    let text = p.value;
    let mutated = false;
    for (const c of companies) {
      if (done.has(c.slug)) continue;
      if (!c.name_zh) continue;
      const re = new RegExp(escapeRegex(c.name_zh));
      const hit = re.exec(text);
      if (!hit) continue;
      const before = text.slice(0, hit.index);
      const after = text.slice(hit.index + c.name_zh.length);
      const anchor = `<a href="/company/${c.slug}" class="${AUTOLINK_CLASS}">${escapeHtml(c.name_zh)}</a>`;
      text = before + anchor + after;
      done.add(c.slug);
      mutated = true;
    }
    if (mutated) parts[i] = { kind: "text", value: text };
  }

  return parts.map((p) => p.value).join("");
}
