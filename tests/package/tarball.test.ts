import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { describe, test } from "node:test";
import { fileURLToPath } from "node:url";

/**
 * Exclusion contract: docs/trd/cli-vision.md §"Package exclusions".
 * These path segments are excluded from the built package at EVERY depth,
 * plus every docs/research subtree. The predicate is the oracle both for the
 * synthetic unit cases and for the real `npm pack --dry-run` file list, so a
 * regression in either the allowlist or the rule is caught.
 */

const EXCLUDED_SEGMENTS = [
  "secrets",
  "backlog",
  "state",
  "reports",
  "logs",
  ".worktrees",
  "node_modules",
] as const;

/** True when a package-relative path violates the package-exclusion contract. */
export function isExcludedPackPath(relPath: string): boolean {
  const segments = relPath.split("/");
  for (let i = 0; i < segments.length; i++) {
    if ((EXCLUDED_SEGMENTS as readonly string[]).includes(segments[i]))
      return true;
    // docs/research subtrees are excluded at any package depth too.
    if (segments[i] === "docs" && segments[i + 1] === "research") return true;
  }
  return false;
}

const REPO = resolve(fileURLToPath(new URL("../..", import.meta.url)));
const NPM = process.platform === "win32" ? "npm.cmd" : "npm";

interface PackFile {
  path: string;
}
interface PackManifest {
  files: PackFile[];
}

function npmPackFileList(): string[] {
  // The session TMPDIR lives inside the worktree (.weavelog-tmp/). Strip it so
  // npm stages the dry-run tarball outside the walked project tree.
  const env = { ...process.env };
  delete env.TMPDIR;
  const r = spawnSync(NPM, ["pack", "--dry-run", "--json"], {
    cwd: REPO,
    encoding: "utf8",
    env,
    timeout: 120_000,
  });
  assert.equal(r.status, 0, `npm pack --dry-run failed: ${r.stderr}`);
  const parsed = JSON.parse(r.stdout) as PackManifest[];
  assert.equal(
    parsed.length,
    1,
    "npm pack --dry-run --json must emit exactly one manifest entry",
  );
  return parsed[0].files.map((f) => f.path);
}

let packedPathsCache: string[] | null = null;
function packedPaths(): string[] {
  if (packedPathsCache === null) packedPathsCache = npmPackFileList();
  return packedPathsCache;
}

describe("package exclusion predicate (cli-vision §Package exclusions)", () => {
  test("excludes protected segments at any depth", () => {
    const excluded = [
      "secrets/foo",
      "payload/skills/x/secrets/a",
      "backlog/tasks/task-1.md",
      "docs/research/foo.md",
      "payload/skills/x/docs/research/a.md",
      "state/weavelog/ledger.jsonl",
      "payload/config/state/x.json",
      "reports/session-1.md",
      "logs/run.log",
      ".worktrees/TASK-29/foo.md",
      "node_modules/pkg/index.js",
      "payload/skills/x/node_modules/y/z.js",
    ];
    for (const p of excluded)
      assert.equal(isExcludedPackPath(p), true, `expected ${p} excluded`);
  });

  test("allows shipped control metadata and artifacts", () => {
    const allowed = [
      "package.json",
      "weavelog.json",
      "dist/cli/index.js",
      "dist/hooks/enforce.js",
      "payload/AGENTS.md",
      "payload/config/harnesses/opencode.json",
      "payload/config/opencode.jsonc",
      "docs/trd/cli-vision.md",
      "docs/adr/0008-cli-distribution-contract.md",
      "README.md",
      ".env.example",
    ];
    for (const p of allowed)
      assert.equal(isExcludedPackPath(p), false, `expected ${p} allowed`);
  });
});

describe("packed tarball honors package exclusions (AC #2)", () => {
  test("no packaged path contains an excluded segment at any depth", () => {
    const violations = packedPaths().filter((p) => isExcludedPackPath(p));
    assert.deepEqual(
      violations,
      [],
      "packed paths must not contain excluded segments",
    );
  });

  test("harness manifest ships as control metadata", () => {
    assert.ok(
      packedPaths().includes("payload/config/harnesses/opencode.json"),
      "the harness manifest must be packaged so init/update can read it",
    );
  });

  test("core artifacts ship (allowlist smoke)", () => {
    const paths = packedPaths();
    for (const expected of [
      "weavelog.json",
      "package.json",
      "payload/AGENTS.md",
      "payload/config/opencode.jsonc",
    ]) {
      assert.ok(paths.includes(expected), `${expected} must be packaged`);
    }
  });

  test("dist output is packaged when built", () => {
    const distDir = join(REPO, "dist");
    if (existsSync(distDir)) {
      assert.ok(
        packedPaths().some((p) => p.startsWith("dist/")),
        "built dist/ output must be packaged",
      );
      return;
    }
    // Source worktree without a build: the allowlist must still declare dist/.
    const pkg = JSON.parse(
      readFileSync(join(REPO, "package.json"), "utf8"),
    ) as { files?: string[] };
    assert.ok(
      pkg.files?.includes("dist/"),
      "package.json files allowlist must declare dist/ for built output",
    );
  });
});
