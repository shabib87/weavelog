#!/usr/bin/env -S node --import tsx
/**
 * frontmatter-check — validates YAML frontmatter on ~/.agents docs.
 * Pure file parsing: no headroom, no network, no secrets.
 *
 * Default scope: ~/.agents/docs/{research,plans,spec}/*.md (README.md skipped).
 * Pass one or more directories to override the scope.
 *
 * Modes: validation (default), indexing (--index), repair (--fix).
 * --fix fills ONLY missing keys and never fabricates an empty sources list.
 *
 * Exit codes: 0 = valid, 1 = violations found, 2 = error (dir not found, parse error).
 */
import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { basename, dirname, join, parse, resolve } from "node:path";
import { parse as parseYaml } from "yaml";

const STATUSES = [
  "verified-live",
  "reviewer-corrected",
  "resolved",
  "open",
  "decided",
  "adopted",
  "superseded",
  "reviewer-approved-with-fixes-applied",
] as const;

const REQUIRED_KEYS = [
  "date",
  "topic",
  "status",
  "sources",
  "models_used_for_research",
  "supersedes",
] as const;

// Architecture schema (docs/trd/*.md, docs/adr/*.md, docs/prd/*.md)
const ARCH_STATUSES = [
  "draft",
  "in-review",
  "approved",
  "backfilled",
  "superseded",
  "archived",
] as const;

const ARCH_TYPES = ["architecture", "adr", "prd"] as const;

const ARCH_REQUIRED_KEYS = [
  "date",
  "topic",
  "status",
  "type",
  "author",
  "related_to",
  "sources",
] as const;

type Schema = "research" | "architecture";

const HELP = `Usage: bun frontmatter-check.ts [options] [dirs...]

Modes:
  (default)       Validate frontmatter in all scanned docs
  --index         Emit a JSON index of all scanned docs instead of validating
  --fix           Add missing frontmatter keys (never inserts empty sources: [])

Options:
  --schema <val>  Select frontmatter schema: research (default) | architecture
                  architecture schema applies to docs/trd/*.md, docs/adr/*.md,
 *                  docs/prd/*.md, and
                  validates: date, topic, status, type, author, related_to,
                  sources. related_to entries must resolve to existing files
                  (dangling -> ERROR) and the target's related_to must list this
                  file back (missing reciprocity -> WARNING, non-blocking).
  --source <val>  Source value for --fix when 'sources' is missing
                  (default: "(unknown — manual entry required)")
  --dry-run       With --fix: report post-fix validity without writing files
  --help          Show this help

Dirs default to ~/.agents/docs/{research,plans,spec}. README.md is skipped.
Unknown flags are rejected (exit 2). When --fix and --index are combined,
--fix applies first and the index reflects the post-fix state. If several
docs supersede the same file, superseded_by is last-wins. Files without a
date prefix in the filename are in scope; --fix dates them with today's date.
--fix mutates files in place — the safety net is git (docs/ is tracked);
use --dry-run to preview.

Schema (required keys) — research:
  date                      ISO 8601 (YYYY-MM-DD); must match the filename date prefix
  topic                     string
  status                    enum: ${STATUSES.join(" | ")}
  sources                   non-empty array
  models_used_for_research  array
  supersedes                "none" or a filename that exists in the same directory

Schema (required keys) — architecture:
  date        ISO 8601 (YYYY-MM-DD); must match the filename date prefix
  topic       string
  status      enum: ${ARCH_STATUSES.join(" | ")}
  type        enum: ${ARCH_TYPES.join(" | ")}
  milestones  required non-empty for type: prd — backlog milestone ids resolving to backlog/milestones/<id> -*.md
  author      non-empty string
  related_to  array of relative paths (resolved against the doc's directory)
  sources     non-empty array
  Cross-validation:
    - dangling related_to ref (target file missing) -> ERROR
    - missing reciprocity (target does not list this file back) -> WARNING

Optional keys: review_rounds (int), total_review_cost_usd (float),
reviewer_corrections_applied (array of strings).

Cross-validation:
  - supersedes != "none"  -> named file must exist in the same directory
  - status == "superseded" -> another scanned doc must supersede this file

Exit codes: 0 = valid, 1 = violations found, 2 = error (dir not found, parse error).`;

const KNOWN_FLAGS = new Set([
  "--help",
  "--index",
  "--fix",
  "--source",
  "--dry-run",
  "--schema",
]);
const args = process.argv.slice(2);
if (args.includes("--help")) {
  console.log(HELP);
  process.exit(0);
}
const schemaFlagIdx = args.indexOf("--schema");
if (
  schemaFlagIdx >= 0 &&
  (schemaFlagIdx + 1 >= args.length || args[schemaFlagIdx + 1].startsWith("--"))
) {
  console.error("--schema requires a value (research | architecture)");
  process.exit(2);
}
const schemaArg = schemaFlagIdx >= 0 ? args[schemaFlagIdx + 1] : "research";
if (schemaArg !== "research" && schemaArg !== "architecture") {
  console.error(
    `--schema value must be 'research' or 'architecture', got: ${schemaArg}`,
  );
  process.exit(2);
}
const schema: Schema = schemaArg as Schema;
for (const a of args) {
  if (a.startsWith("--") && !KNOWN_FLAGS.has(a)) {
    console.error(`unknown flag: ${a} (see --help)`);
    process.exit(2);
  }
}

const HOME = homedir();
const doIndex = args.includes("--index");
const doFix = args.includes("--fix");
const dryRun = args.includes("--dry-run");
const sourceFlag = args.indexOf("--source");
if (
  sourceFlag >= 0 &&
  (sourceFlag + 1 >= args.length || args[sourceFlag + 1].startsWith("--"))
) {
  console.error("--source requires a value");
  process.exit(2);
}
const fixSource =
  sourceFlag >= 0 ? args[sourceFlag + 1] : "(unknown — manual entry required)";
const dirs = args.filter(
  (a, i) =>
    !a.startsWith("--") &&
    !(schemaFlagIdx >= 0 && i === schemaFlagIdx + 1) &&
    !(sourceFlag >= 0 && i === sourceFlag + 1),
);
const scanDirs =
  dirs.length > 0
    ? dirs
    : schema === "architecture"
      ? [join(HOME, ".agents", "docs", "architecture")]
      : ["research", "plans", "spec"].map((d) =>
          join(HOME, ".agents", "docs", d),
        );

interface DocEntry {
  file: string;
  dir: string;
  raw: string;
  fm: Record<string, unknown> | null;
  body: string;
  hasFrontmatter: boolean;
}

function isoDate(v: unknown): string {
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  return String(v ?? "");
}

function parseDoc(dir: string, file: string): DocEntry {
  const raw = readFileSync(join(dir, file), "utf8")
    .replace(/\r\n/g, "\n")
    .replace(/^\uFEFF/, "");
  if (!raw.startsWith("---\n")) {
    return { file, dir, raw, fm: null, body: raw, hasFrontmatter: false };
  }
  const end = raw.indexOf("\n---", 3);
  if (end < 0) throw new Error("unterminated frontmatter block");
  const yaml = raw.slice(4, end);
  const body = raw.slice(end + 4).replace(/^\n+/, "");
  const fm = parseYaml(yaml);
  if (fm === null || typeof fm !== "object" || Array.isArray(fm)) {
    throw new Error("frontmatter is not a mapping");
  }
  return {
    file,
    dir,
    raw,
    fm: fm as Record<string, unknown>,
    body,
    hasFrontmatter: true,
  };
}

function validate(
  doc: DocEntry,
  allFilesInDir: Set<string>,
  supersededBy: Map<string, string>,
): string[] {
  const v: string[] = [];
  const fm = doc.fm ?? {};
  for (const key of REQUIRED_KEYS) {
    if (!(key in fm)) v.push(`missing required key: ${key}`);
  }
  if ("date" in fm) {
    const d = isoDate(fm.date);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(d))
      v.push(`date is not ISO 8601 (YYYY-MM-DD): ${d}`);
    const prefix = basename(doc.file).match(/^(\d{4}-\d{2}-\d{2})-/);
    if (prefix && d !== prefix[1]) {
      v.push(`date ${d} does not match filename prefix ${prefix[1]}`);
    }
  }
  if ("topic" in fm && (typeof fm.topic !== "string" || !fm.topic.trim())) {
    v.push("topic must be a non-empty string");
  }
  if (
    "status" in fm &&
    !STATUSES.includes(fm.status as (typeof STATUSES)[number])
  ) {
    v.push(`status "${fm.status}" is not in the enum: ${STATUSES.join(" | ")}`);
  }
  if (
    "sources" in fm &&
    (!Array.isArray(fm.sources) || fm.sources.length === 0)
  ) {
    v.push("sources must be a non-empty array");
  }
  if (
    "models_used_for_research" in fm &&
    !Array.isArray(fm.models_used_for_research)
  ) {
    v.push("models_used_for_research must be an array");
  }
  if ("supersedes" in fm) {
    if (typeof fm.supersedes !== "string") {
      v.push("supersedes must be a string ('none' or a filename)");
    } else if (fm.supersedes !== "none" && !allFilesInDir.has(fm.supersedes)) {
      v.push(
        `supersedes target does not exist in the same directory: ${fm.supersedes}`,
      );
    }
  }
  if ("review_rounds" in fm && !Number.isInteger(fm.review_rounds)) {
    v.push("review_rounds must be an integer");
  }
  if (
    "total_review_cost_usd" in fm &&
    typeof fm.total_review_cost_usd !== "number"
  ) {
    v.push("total_review_cost_usd must be a number");
  }
  if (
    "reviewer_corrections_applied" in fm &&
    !Array.isArray(fm.reviewer_corrections_applied)
  ) {
    v.push("reviewer_corrections_applied must be an array");
  }
  if (
    fm.status === "superseded" &&
    !supersededBy.has(join(doc.dir, doc.file))
  ) {
    v.push("status is superseded but no scanned doc supersedes this file");
  }
  return v;
}

/** Parse a doc by absolute path (for reciprocity lookups on targets outside the scan set). */
const targetCache = new Map<string, DocEntry | null>();
function parseTarget(absPath: string): DocEntry | null {
  if (targetCache.has(absPath)) return targetCache.get(absPath) ?? null;
  if (!existsSync(absPath)) {
    targetCache.set(absPath, null);
    return null;
  }
  try {
    const doc = parseDoc(dirname(absPath), basename(absPath));
    targetCache.set(absPath, doc);
    return doc;
  } catch {
    targetCache.set(absPath, null);
    return null;
  }
}

function findMilestonesDir(startDir: string): string | null {
  let cur = resolve(startDir);
  const stop = parse(cur).root;
  while (true) {
    const candidate = join(cur, "backlog", "milestones");
    if (existsSync(candidate)) return candidate;
    if (cur === stop) return null;
    cur = dirname(cur);
  }
}

function validateArch(doc: DocEntry): {
  violations: string[];
  warnings: string[];
} {
  const v: string[] = [];
  const w: string[] = [];
  const fm = doc.fm ?? {};
  for (const key of ARCH_REQUIRED_KEYS) {
    if (!(key in fm)) v.push(`missing required key: ${key}`);
  }
  if ("date" in fm) {
    const d = isoDate(fm.date);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(d))
      v.push(`date is not ISO 8601 (YYYY-MM-DD): ${d}`);
    const prefix = basename(doc.file).match(/^(\d{4}-\d{2}-\d{2})-/);
    if (prefix && d !== prefix[1]) {
      v.push(`date ${d} does not match filename prefix ${prefix[1]}`);
    }
  }
  if ("topic" in fm && (typeof fm.topic !== "string" || !fm.topic.trim())) {
    v.push("topic must be a non-empty string");
  }
  if (
    "status" in fm &&
    !ARCH_STATUSES.includes(fm.status as (typeof ARCH_STATUSES)[number])
  ) {
    v.push(
      `status "${fm.status}" is not in the architecture enum: ${ARCH_STATUSES.join(" | ")}`,
    );
  }
  if ("type" in fm) {
    if (!ARCH_TYPES.includes(fm.type as (typeof ARCH_TYPES)[number])) {
      v.push(`type "${fm.type}" is not in the enum: ${ARCH_TYPES.join(" | ")}`);
    }
  }
  if ("author" in fm && (typeof fm.author !== "string" || !fm.author.trim())) {
    v.push("author must be a non-empty string");
  }
  if (fm.type === "prd") {
    const ms = fm.milestones;
    if (!Array.isArray(ms) || ms.length === 0) {
      v.push(
        'type "prd" requires a non-empty milestones array of backlog milestone ids (e.g. "m-7")',
      );
    } else {
      const msDir = findMilestonesDir(doc.dir);
      for (const entry of ms) {
        if (typeof entry !== "string" || !/^m-\d+$/.test(entry)) {
          v.push(
            `milestones entry must be a milestone id like "m-7": ${JSON.stringify(entry)}`,
          );
          continue;
        }
        const matched =
          msDir !== null
            ? readdirSync(msDir).find((f) => f.startsWith(`${entry} `))
            : undefined;
        if (!matched) {
          v.push(
            `dangling milestones ref (no backlog/milestones/${entry} - *.md file under the doc's repo root): ${entry}`,
          );
          continue;
        }
        if (msDir) {
          // id/filename agreement: the milestone file's own `id:` frontmatter
          // must equal the filename-derived id (ADR-005 linkage, loop 5).
          try {
            const raw = readFileSync(join(msDir, matched), "utf8");
            const mfm = parseYaml(raw.split(/^---\n/m)[1] ?? "") as {
              id?: unknown;
            };
            if (typeof mfm?.id === "string" && mfm.id !== entry) {
              v.push(
                `milestone file ${matched} declares id "${mfm.id}" but its filename and the brief's milestones entry say "${entry}" — rename the file or fix the id`,
              );
            }
          } catch {
            v.push(`milestone file ${matched} is unreadable`);
          }
        }
      }
    }
  }

  if (
    "sources" in fm &&
    (!Array.isArray(fm.sources) || fm.sources.length === 0)
  ) {
    v.push("sources must be a non-empty array");
  }
  if ("related_to" in fm) {
    if (!Array.isArray(fm.related_to)) {
      v.push("related_to must be an array of relative paths");
    } else {
      const thisAbs = resolve(join(doc.dir, doc.file));
      const thisBasename = basename(doc.file);
      for (const entry of fm.related_to) {
        if (typeof entry !== "string") {
          v.push(`related_to entry must be a string: ${JSON.stringify(entry)}`);
          continue;
        }
        const targetAbs = resolve(join(doc.dir, entry));
        if (!existsSync(targetAbs)) {
          v.push(`dangling related_to ref (target missing): ${entry}`);
          continue;
        }
        const target = parseTarget(targetAbs);
        const targetRel = target?.fm?.related_to;
        if (!target || !Array.isArray(targetRel)) {
          w.push(
            `missing reciprocity: ${entry} does not list this file in its related_to`,
          );
          continue;
        }
        const reciprocal = targetRel.some((e: unknown) => {
          if (typeof e !== "string") return false;
          if (e === thisBasename) return true;
          const resolvedFromTarget = resolve(join(target.dir, e));
          return resolvedFromTarget === thisAbs;
        });
        if (!reciprocal) {
          w.push(
            `missing reciprocity: ${entry} does not list this file in its related_to`,
          );
        }
      }
    }
  }
  return { violations: v, warnings: w };
}

function yamlScalar(s: string): string {
  // quote anything beyond a plain-safe charset so ': ', '#', leading specials,
  // and placeholder strings can never corrupt the emitted YAML
  if (/^[A-Za-z0-9][A-Za-z0-9\-_./~]*$/.test(s)) return s;
  return `"${s.replaceAll("\\", "\\\\").replaceAll('"', '\\"')}"`;
}

function yamlValue(key: string, value: unknown): string {
  if (Array.isArray(value)) {
    if (value.length === 0) return `${key}: []`;
    return `${key}:\n${value.map((i) => `  - ${yamlScalar(String(i))}`).join("\n")}`;
  }
  return `${key}: ${yamlScalar(String(value))}`;
}

function fixDoc(doc: DocEntry): void {
  const fm: Record<string, unknown> = { ...(doc.fm ?? {}) };
  const requiredKeys =
    schema === "architecture" ? ARCH_REQUIRED_KEYS : REQUIRED_KEYS;
  const missing = requiredKeys.filter((k) => !(k in fm));
  if (missing.length === 0) return;
  const prefix = basename(doc.file).match(/^(\d{4}-\d{2}-\d{2})-(.+)\.md$/);
  const defaults: Record<string, unknown> =
    schema === "architecture"
      ? {
          date: prefix ? prefix[1] : new Date().toISOString().slice(0, 10),
          topic: prefix
            ? prefix[2].replaceAll("-", " ")
            : basename(doc.file, ".md"),
          status: "draft",
          type: "architecture",
          author: "(unknown — manual entry required)",
          related_to: [],
          sources: [fixSource],
        }
      : {
          date: prefix ? prefix[1] : new Date().toISOString().slice(0, 10),
          topic: prefix
            ? prefix[2].replaceAll("-", " ")
            : basename(doc.file, ".md"),
          status: "open",
          sources: [fixSource],
          models_used_for_research: [],
          supersedes: "none",
        };
  const lines = missing.map((k) => yamlValue(k, defaults[k])).join("\n");
  let out: string;
  if (doc.hasFrontmatter) {
    // append missing keys before the closing ---; existing keys are never rewritten
    const end = doc.raw.indexOf("\n---", 3);
    out = `${doc.raw.slice(0, end)}\n${lines}${doc.raw.slice(end)}`;
  } else {
    const block = requiredKeys.map((k) => yamlValue(k, defaults[k])).join("\n");
    out = `---\n${block}\n---\n\n${doc.body}`;
  }
  if (!dryRun) writeFileSync(join(doc.dir, doc.file), out);
  for (const k of missing) fm[k] = defaults[k];
  doc.fm = fm;
  doc.hasFrontmatter = true;
}

function main() {
  for (const dir of scanDirs) {
    if (!existsSync(dir)) {
      console.error(`directory not found: ${dir}`);
      process.exit(2);
    }
  }

  const docs: DocEntry[] = [];
  const parseErrors: string[] = [];
  for (const dir of scanDirs) {
    for (const file of readdirSync(dir).filter(
      (f) => f.endsWith(".md") && f !== "README.md",
    )) {
      try {
        docs.push(parseDoc(dir, file));
      } catch (err) {
        parseErrors.push(`${join(dir, file)}: ${(err as Error).message}`);
      }
    }
  }
  if (parseErrors.length) {
    console.error(`frontmatter parse errors:\n  ${parseErrors.join("\n  ")}`);
    process.exit(2);
  }

  // cross-file map: which doc is superseded by which child (per-directory keys)
  const supersededBy = new Map<string, string>();
  for (const doc of docs) {
    const s = doc.fm?.supersedes;
    if (typeof s === "string" && s !== "none")
      supersededBy.set(join(doc.dir, s), doc.file);
  }

  if (doFix) {
    const requiredKeys =
      schema === "architecture" ? ARCH_REQUIRED_KEYS : REQUIRED_KEYS;
    for (const doc of docs) {
      const missing = requiredKeys.some((k) => !(k in (doc.fm ?? {})));
      if (!doc.hasFrontmatter || missing) fixDoc(doc);
    }
  }

  if (doIndex) {
    const files = docs.map((doc) => ({
      filename: doc.file,
      date: isoDate(doc.fm?.date),
      topic: doc.fm?.topic ?? null,
      status: doc.fm?.status ?? null,
      type: doc.fm?.type ?? null,
      author: doc.fm?.author ?? null,
      related_to: doc.fm?.related_to ?? null,
      supersedes: doc.fm?.supersedes ?? null,
      superseded_by: supersededBy.get(join(doc.dir, doc.file)) ?? null,
      models: doc.fm?.models_used_for_research ?? [],
      review_rounds: doc.fm?.review_rounds ?? null,
      directory: doc.dir,
    }));
    console.log(JSON.stringify({ files }, null, 2));
    process.exit(0);
  }

  const files = docs.map((doc) => {
    if (!doc.hasFrontmatter) {
      return {
        file: join(doc.dir, doc.file),
        ok: false,
        violations: ["missing frontmatter block"],
        warnings: [],
      };
    }
    if (schema === "architecture") {
      const { violations, warnings } = validateArch(doc);
      return {
        file: join(doc.dir, doc.file),
        ok: violations.length === 0,
        violations,
        warnings,
      };
    }
    const dirFiles = new Set(
      docs.filter((d) => d.dir === doc.dir).map((d) => d.file),
    );
    const violations = validate(doc, dirFiles, supersededBy);
    return {
      file: join(doc.dir, doc.file),
      ok: violations.length === 0,
      violations,
      warnings: [],
    };
  });
  const invalid = files.filter((f) => !f.ok).length;
  console.log(
    JSON.stringify(
      {
        files,
        summary: {
          scanned: files.length,
          valid: files.length - invalid,
          invalid,
        },
      },
      null,
      2,
    ),
  );
  process.exit(invalid ? 1 : 0);
}

main();
