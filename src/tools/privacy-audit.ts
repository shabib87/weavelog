import { spawnSync } from "node:child_process";
import { readFileSync, realpathSync, statSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

/**
 * privacy-audit — deterministic content scan for personal identifiers and
 * secret patterns (TASK-73).
 *
 * The shipped rules are identity-free: generic absolute home paths and secret
 * patterns. A user's own identifiers are loaded at runtime from an untracked
 * local needle file (`WEAVELOG_PRIVACY_NEEDLES`), so no personal literal is
 * committed or packaged. Repo-specific excludes live in an optional
 * `.weavelog-privacy-excludes` file at the workspace root (not shipped).
 *
 * Two source modes:
 * - "worktree": scan the working-tree content of tracked files (`check`).
 * - "index": scan staged content (`check --pre-commit`), so a staged secret
 *   cannot be hidden by editing the working tree afterwards.
 */

export type PrivacyScope = "personal" | "secret";

export interface PrivacyRule {
  id: string;
  scope: PrivacyScope;
  pattern: RegExp;
}

export interface PrivacyOffender {
  file: string;
  line: number;
  rule: string;
  excerpt: string;
}

export interface PrivacyAuditResult {
  status: "pass" | "fail" | "skip";
  offenders: PrivacyOffender[];
  filesScanned: number;
  detail: string;
}

export type PrivacySource = "worktree" | "index";

/** Identity-free rules shipped with the package. */
export const GENERIC_PRIVACY_RULES: PrivacyRule[] = [
  {
    id: "home-path",
    scope: "personal",
    // Absolute macOS home paths, excluding obvious synthetic fixture names.
    pattern:
      /\/Users\/(?!(?:x|me|test|someone|you|yourname|name)\b)[A-Za-z0-9._-]+/,
  },
  { id: "secret", scope: "secret", pattern: /(AKIA|ASIA)[0-9A-Z]{16}/ },
  { id: "secret", scope: "secret", pattern: /gh[pousr]_[A-Za-z0-9]{36,}/ },
  { id: "secret", scope: "secret", pattern: /github_pat_[A-Za-z0-9_]{20,}/ },
  {
    id: "secret",
    scope: "secret",
    pattern:
      /(?<![A-Za-z0-9])sk-(or-v1-[0-9a-f]{64}|proj-[A-Za-z0-9_-]{24,}|ant-(api|oat)\d+-[A-Za-z0-9_-]{24,}|[A-Za-z0-9]{24,})/,
  },
  { id: "secret", scope: "secret", pattern: /xox[baprs]-[A-Za-z0-9-]{10,}/ },
  { id: "secret", scope: "secret", pattern: /AIza[0-9A-Za-z_-]{35}/ },
  { id: "secret", scope: "secret", pattern: /(sk|rk)_live_[A-Za-z0-9]{16,}/ },
  {
    id: "secret",
    scope: "secret",
    pattern:
      /-----BEGIN (RSA |EC |OPENSSH |DSA |ENCRYPTED |PGP )*PRIVATE KEY( BLOCK)?-----/,
  },
];

/**
 * Shipped excludes. Attribution files legitimately name the author, and frozen
 * provenance is not shipped. The module excludes itself (it contains the rule
 * sources). Nothing project-specific ships here — a workspace adds its own
 * excludes via `.weavelog-privacy-excludes`.
 */
export const PRIVACY_PERSONAL_EXCLUDES: string[] = [
  "LICENSE",
  "NOTICE",
  "ATTRIBUTION.md",
  "docs/archive/",
  "src/tools/privacy-audit.ts",
  "src/tools/privacy-audit.js",
];

export const PRIVACY_SECRET_EXCLUDES: string[] = [
  "docs/archive/",
  "src/tools/privacy-audit.ts",
  "src/tools/privacy-audit.js",
];

export const REPO_EXCLUDES_FILE = ".weavelog-privacy-excludes";

const MAX_EXCERPT = 120;
const MAX_FILE_BYTES = 5 * 1024 * 1024;
const MAX_GIT_BUFFER = 256 * 1024 * 1024;

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Parse a needles/excludes file: one entry per line, `#` comments, blanks skipped. */
export function parseLines(text: string): string[] {
  return text
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && !line.startsWith("#"));
}

/** Compile a personal-name rule from local needles (empty -> no rule). */
export function buildPrivacyRules(needles: string[]): PrivacyRule[] {
  const rules = [...GENERIC_PRIVACY_RULES];
  if (needles.length > 0) {
    rules.push({
      id: "personal-name",
      scope: "personal",
      pattern: new RegExp(needles.map(escapeRegExp).join("|"), "i"),
    });
  }
  return rules;
}

/** Default location of the untracked personal needle file. */
export function defaultNeedlesPath(): string {
  const base =
    process.env.WEAVELOG_CONFIG_HOME ?? join(homedir(), ".config", "weavelog");
  return join(base, "privacy-needles.txt");
}

type NeedleLoad =
  | { ok: true; needles: string[]; detail: string }
  | { ok: false; detail: string };

function loadNeedles(path: string): NeedleLoad {
  let text: string;
  try {
    text = readFileSync(path, "utf8");
  } catch (err) {
    const code = (err as NodeJS.ErrnoException).code;
    if (code === "ENOENT") {
      return {
        ok: true,
        needles: [],
        detail: "personal-name scan skipped (no local needle file)",
      };
    }
    return {
      ok: false,
      detail: `personal needle file unreadable (${(err as Error).message}); privacy scan failed closed`,
    };
  }
  return {
    ok: true,
    needles: parseLines(text),
    detail: "personal-name scan enabled from local needle file",
  };
}

function repoExcludes(root: string): string[] {
  try {
    return parseLines(readFileSync(join(root, REPO_EXCLUDES_FILE), "utf8"));
  } catch {
    return [];
  }
}

function excerptFor(line: string): string {
  const trimmed = line.trim();
  return trimmed.length > MAX_EXCERPT
    ? `${trimmed.slice(0, MAX_EXCERPT)}…`
    : trimmed;
}

/** Every rule match in `content`, tagged with file/line. Pure, no excludes. */
export function findPrivacyOffenders(
  file: string,
  content: string,
  rules: PrivacyRule[] = GENERIC_PRIVACY_RULES,
): PrivacyOffender[] {
  const offenders: PrivacyOffender[] = [];
  const lines = content.split("\n");
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i] ?? "";
    // Redact whenever the line carries a secret, even if the matched rule is
    // personal, so no secret value reaches the console or ledger.
    const lineHasSecret = rules.some(
      (r) => r.scope === "secret" && r.pattern.test(line),
    );
    for (const rule of rules) {
      if (rule.pattern.test(line)) {
        offenders.push({
          file,
          line: i + 1,
          rule: rule.id,
          excerpt:
            rule.scope === "secret" || lineHasSecret
              ? "[redacted]"
              : excerptFor(line),
        });
      }
    }
  }
  return offenders;
}

function isExcluded(rel: string, excludes: string[]): boolean {
  return excludes.some((e) =>
    e.endsWith("/") ? rel.startsWith(e) : rel === e,
  );
}

/**
 * Scan one file's content, applying per-scope excludes. Use this when the
 * caller walks files itself (e.g. the payload/docs test).
 */
export function scanFile(
  file: string,
  content: string,
  opts: {
    rules?: PrivacyRule[];
    personalExcludes?: string[];
    secretExcludes?: string[];
  } = {},
): PrivacyOffender[] {
  const rules = opts.rules ?? GENERIC_PRIVACY_RULES;
  const personalExcludes = opts.personalExcludes ?? PRIVACY_PERSONAL_EXCLUDES;
  const secretExcludes = opts.secretExcludes ?? PRIVACY_SECRET_EXCLUDES;
  const scopeById = new Map(rules.map((r) => [r.id, r.scope]));
  return findPrivacyOffenders(file, content, rules).filter((o) => {
    const scope = scopeById.get(o.rule);
    if (scope === "personal") return !isExcluded(file, personalExcludes);
    if (scope === "secret") return !isExcluded(file, secretExcludes);
    return true;
  });
}

function gitEnv(): NodeJS.ProcessEnv {
  const env = { ...process.env };
  delete env.GIT_DIR;
  delete env.GIT_WORK_TREE;
  return env;
}

function gitOutput(root: string, args: string[]): string | null {
  const r = spawnSync("git", args, {
    cwd: root,
    encoding: "utf8",
    timeout: 30_000,
    maxBuffer: 64 * 1024 * 1024,
    env: gitEnv(),
  });
  if (r.status !== 0 || r.error) return null;
  return r.stdout ?? "";
}

function realpathOr(value: string): string {
  try {
    return realpathSync(value);
  } catch {
    return value;
  }
}

type TrackedFiles =
  | { ok: true; files: string[] }
  | { ok: false; skip: boolean; detail: string };

/**
 * List tracked files when `root` is the top of a git working tree. Outside a
 * repository or in a nested directory the scan is skipped; a `git ls-files`
 * failure inside the worktree root fails closed so the gate never silently
 * passes.
 */
function trackedFiles(root: string): TrackedFiles {
  const top = gitOutput(root, ["rev-parse", "--show-toplevel"]);
  if (top === null) {
    return {
      ok: false,
      skip: true,
      detail: "not a git working tree; privacy scan skipped",
    };
  }
  if (realpathOr(top.trim()) !== realpathOr(root)) {
    return {
      ok: false,
      skip: true,
      detail: "not the git working-tree root; privacy scan skipped",
    };
  }
  const out = gitOutput(root, ["ls-files", "-z"]);
  if (out === null) {
    return {
      ok: false,
      skip: false,
      detail: "git ls-files failed; privacy scan failed closed",
    };
  }
  return { ok: true, files: out.split("\0").filter(Boolean) };
}

interface ReadResult {
  contents: Map<string, string>;
  /** Files intentionally not scanned (binary or oversized). */
  skipped: number;
  /** Non-null means the gate must fail closed. */
  error: string | null;
}

/** Read staged (index) content in one `git cat-file --batch` call. */
function readIndexContents(root: string, files: string[]): ReadResult {
  const contents = new Map<string, string>();
  let skipped = 0;
  if (files.length === 0) return { contents, skipped, error: null };
  // `cat-file --batch` takes newline-delimited requests, so a path containing
  // a newline would desync the response stream. Fail closed instead.
  if (files.some((f) => f.includes("\n") || f.includes("\r"))) {
    return {
      contents,
      skipped,
      error: "tracked path contains a newline; privacy scan failed closed",
    };
  }
  const input = `${files.map((f) => `:${f}`).join("\n")}\n`;
  const r = spawnSync("git", ["cat-file", "--batch"], {
    cwd: root,
    input,
    timeout: 60_000,
    maxBuffer: MAX_GIT_BUFFER,
    env: gitEnv(),
  });
  if (r.status !== 0 || r.error || !Buffer.isBuffer(r.stdout)) {
    return {
      contents,
      skipped,
      error: "git cat-file failed; privacy scan failed closed",
    };
  }
  const buf = r.stdout;
  let off = 0;
  let i = 0;
  while (off < buf.length && i < files.length) {
    const nl = buf.indexOf(0x0a, off);
    if (nl < 0) break;
    const header = buf.toString("utf8", off, nl);
    off = nl + 1;
    const rel = files[i++] as string;
    const parts = header.split(" ");
    const size = Number(parts[2]);
    if (parts.length !== 3 || !Number.isInteger(size) || size < 0) {
      return {
        contents,
        skipped,
        error:
          "git cat-file returned a malformed header; privacy scan failed closed",
      };
    }
    const content = buf.toString("utf8", off, off + size);
    off += size + 1;
    if (size > MAX_FILE_BYTES || content.includes("\0")) {
      skipped++;
      continue;
    }
    contents.set(rel, content);
  }
  if (i < files.length) {
    return {
      contents,
      skipped,
      error: "git cat-file stream ended early; privacy scan failed closed",
    };
  }
  return { contents, skipped, error: null };
}

/** Read working-tree content of tracked files. */
function readWorktreeContents(root: string, files: string[]): ReadResult {
  const contents = new Map<string, string>();
  let skipped = 0;
  for (const rel of files) {
    const full = join(root, rel);
    let stat: ReturnType<typeof statSync>;
    try {
      stat = statSync(full);
    } catch {
      continue; // tracked file absent from the working tree: nothing to scan
    }
    if (!stat.isFile() || stat.size > MAX_FILE_BYTES) {
      skipped++;
      continue;
    }
    let content: string;
    try {
      content = readFileSync(full, "utf8");
    } catch {
      return {
        contents,
        skipped,
        error: `unreadable tracked file ${rel}; privacy scan failed closed`,
      };
    }
    if (content.includes("\0")) {
      skipped++;
      continue;
    }
    contents.set(rel, content);
  }
  return { contents, skipped, error: null };
}

/**
 * Scan every tracked file under `root` for privacy offenders. Fails closed
 * inside a git working tree; skips (with a reason) outside one.
 */
export function privacyAuditForDir(
  root: string,
  opts: {
    rules?: PrivacyRule[];
    needles?: string[];
    needlesPath?: string;
    personalExcludes?: string[];
    secretExcludes?: string[];
    source?: PrivacySource;
  } = {},
): PrivacyAuditResult {
  const source = opts.source ?? "worktree";
  let needleDetail = "";
  let rules = opts.rules;
  if (rules === undefined) {
    if (opts.needles !== undefined) {
      rules = buildPrivacyRules(opts.needles);
      needleDetail =
        opts.needles.length > 0
          ? "personal-name scan enabled"
          : "personal-name scan skipped (no needles)";
    } else {
      const loaded = loadNeedles(opts.needlesPath ?? defaultNeedlesPath());
      if (!loaded.ok) {
        return {
          status: "fail",
          offenders: [],
          filesScanned: 0,
          detail: loaded.detail,
        };
      }
      rules = buildPrivacyRules(loaded.needles);
      needleDetail = loaded.detail;
    }
  }
  const personalExcludes = opts.personalExcludes ?? [
    ...PRIVACY_PERSONAL_EXCLUDES,
    ...repoExcludes(root),
  ];
  const secretExcludes = opts.secretExcludes ?? PRIVACY_SECRET_EXCLUDES;
  const tracked = trackedFiles(root);
  if (!tracked.ok) {
    return {
      status: tracked.skip ? "skip" : "fail",
      offenders: [],
      filesScanned: 0,
      detail: tracked.detail,
    };
  }
  const read =
    source === "index"
      ? readIndexContents(root, tracked.files)
      : readWorktreeContents(root, tracked.files);
  if (read.error !== null) {
    return {
      status: "fail",
      offenders: [],
      filesScanned: read.contents.size,
      detail: read.error,
    };
  }
  const offenders: PrivacyOffender[] = [];
  for (const [rel, content] of read.contents) {
    offenders.push(
      ...scanFile(rel, content, { rules, personalExcludes, secretExcludes }),
    );
  }
  const scanned = read.contents.size;
  const skipNote = read.skipped > 0 ? `, ${read.skipped} binary/oversized` : "";
  const needleNote = needleDetail ? `; ${needleDetail}` : "";
  if (offenders.length === 0) {
    return {
      status: "pass",
      offenders,
      filesScanned: scanned,
      detail: `clean (${scanned} tracked file${scanned === 1 ? "" : "s"} scanned${skipNote}${needleNote})`,
    };
  }
  const summary = offenders
    .slice(0, 10)
    .map((o) => `${o.file}:${o.line} [${o.rule}] ${o.excerpt}`)
    .join("; ");
  const more =
    offenders.length > 10 ? `; (+${offenders.length - 10} more)` : "";
  return {
    status: "fail",
    offenders,
    filesScanned: scanned,
    detail: `${offenders.length} offender(s): ${summary}${more}`,
  };
}
