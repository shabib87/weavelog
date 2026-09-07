import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, test } from "node:test";
import { fileURLToPath } from "node:url";

const BIN = fileURLToPath(
  new URL("../src/tools/frontmatter-check.ts", import.meta.url),
);

function run(args: string[]) {
  return spawnSync(process.execPath, ["--import", "tsx", BIN, ...args], {
    encoding: "utf8",
    timeout: 60_000,
  });
}

const created: string[] = [];
afterEach(() => {
  for (const dir of created.splice(0))
    rmSync(dir, { recursive: true, force: true });
});

let n = 0;
function makeDocs(files: Record<string, string>): string {
  const dir = join(tmpdir(), `frontmatter-check-test-${Date.now()}-${n++}`);
  mkdirSync(dir, { recursive: true });
  for (const [name, content] of Object.entries(files)) {
    writeFileSync(join(dir, name), content);
  }
  created.push(dir);
  return dir;
}

const VALID_DOC = `---
date: 2026-08-16
topic: Valid test doc
status: open
sources:
  - https://example.com/source
models_used_for_research:
  - z-ai/glm-5.3-flash
supersedes: none
---

# Valid
`;

const SUPERSEDED_PARENT = `---
date: 2026-08-10
topic: Old doc that was replaced
status: superseded
sources:
  - https://example.com/old
models_used_for_research: []
supersedes: none
---

# Old
`;

const SUPERSEDING_CHILD = `---
date: 2026-08-12
topic: New doc replacing the old one
status: adopted
sources:
  - https://example.com/new
models_used_for_research: []
supersedes: 2026-08-10-parent.md
---

# New
`;

describe("frontmatter-check (happy paths)", () => {
  test("--help exits 0 and shows usage, schema, and exit codes", () => {
    const r = run(["--help"]);
    assert.equal(r.status, 0);
    assert.ok(r.stdout.includes("Usage: bun frontmatter-check.ts"));
    assert.ok(r.stdout.includes("status"));
    assert.ok(r.stdout.includes("Exit codes"));
  });

  test("valid doc exits 0 with a per-file JSON report", () => {
    const dir = makeDocs({ "2026-08-16-valid.md": VALID_DOC });
    const r = run([dir]);
    assert.equal(r.status, 0);
    const report = JSON.parse(r.stdout);
    assert.equal(report.summary.scanned, 1);
    assert.equal(report.summary.invalid, 0);
    assert.equal(report.files[0].ok, true);
    assert.deepEqual(report.files[0].violations, []);
  });

  test("superseded doc with a child pointing to it is valid", () => {
    const dir = makeDocs({
      "2026-08-10-parent.md": SUPERSEDED_PARENT,
      "2026-08-12-child.md": SUPERSEDING_CHILD,
    });
    const r = run([dir]);
    assert.equal(r.status, 0);
  });

  test("--index emits a JSON index with the documented fields", () => {
    const dir = makeDocs({
      "2026-08-10-parent.md": SUPERSEDED_PARENT,
      "2026-08-12-child.md": SUPERSEDING_CHILD,
    });
    const r = run(["--index", dir]);
    assert.equal(r.status, 0);
    const index = JSON.parse(r.stdout);
    assert.equal(index.files.length, 2);
    const child = index.files.find(
      (f: { filename: string }) => f.filename === "2026-08-12-child.md",
    );
    assert.deepEqual(
      {
        date: child?.date,
        topic: child?.topic,
        status: child?.status,
        supersedes: child?.supersedes,
        directory: child?.directory,
      },
      {
        date: "2026-08-12",
        topic: "New doc replacing the old one",
        status: "adopted",
        supersedes: "2026-08-10-parent.md",
        directory: dir,
      },
    );
    const parent = index.files.find(
      (f: { filename: string }) => f.filename === "2026-08-10-parent.md",
    );
    assert.equal(parent.superseded_by, "2026-08-12-child.md");
  });

  test("--fix adds missing keys with documented defaults and never fabricates empty sources", () => {
    const dir = makeDocs({
      "2026-08-16-fixme.md": `---
date: 2026-08-16
---

# Body
`,
    });
    const r = run(["--fix", dir]);
    assert.equal(r.status, 0);
    const fixed = readFileSync(join(dir, "2026-08-16-fixme.md"), "utf8");
    assert.ok(fixed.includes("status: open"));
    assert.ok(fixed.includes("supersedes: none"));
    assert.ok(fixed.includes("models_used_for_research: []"));
    assert.ok(fixed.includes("topic: fixme"));
    assert.ok(fixed.includes("(unknown — manual entry required)"));
    assert.ok(!fixed.includes("sources: []"));
    const r2 = run([dir]);
    assert.equal(r2.status, 0);
  });

  test("--fix --source uses the provided source instead of the placeholder", () => {
    const dir = makeDocs({
      "2026-08-16-fixme.md": `---
date: 2026-08-16
topic: Has topic but no sources
status: open
models_used_for_research: []
supersedes: none
---

# Body
`,
    });
    const r = run(["--fix", "--source", "https://example.com/known", dir]);
    assert.equal(r.status, 0);
    const fixed = readFileSync(join(dir, "2026-08-16-fixme.md"), "utf8");
    assert.ok(fixed.includes('- "https://example.com/known"'));
    assert.ok(!fixed.includes("(unknown"));
  });

  test("--fix prepends a full frontmatter block to a doc that has none", () => {
    const dir = makeDocs({
      "2026-08-16-bare.md": "# Bare doc\n\nNo frontmatter at all.\n",
    });
    const r = run(["--fix", dir]);
    assert.equal(r.status, 0);
    const fixed = readFileSync(join(dir, "2026-08-16-bare.md"), "utf8");
    assert.ok(fixed.startsWith("---\n"));
    assert.ok(fixed.includes("date: 2026-08-16"));
    const r2 = run([dir]);
    assert.equal(r2.status, 0);
  });

  test("--fix preserves existing optional keys and only appends missing ones", () => {
    const dir = makeDocs({
      "2026-08-16-optional.md": `---
date: 2026-08-16
topic: Has optional keys
status: open
sources:
  - https://example.com/source
models_used_for_research: []
review_rounds: 2
total_review_cost_usd: 0.08
---

# Body
`,
    });
    const r = run(["--fix", dir]);
    assert.equal(r.status, 0);
    const fixed = readFileSync(join(dir, "2026-08-16-optional.md"), "utf8");
    assert.ok(fixed.includes("review_rounds: 2"));
    assert.ok(fixed.includes("total_review_cost_usd: 0.08"));
    assert.ok(fixed.includes("supersedes: none"));
    const r2 = run([dir]);
    assert.equal(r2.status, 0);
  });

  test("README.md is skipped and an empty dir exits 0", () => {
    const dir = makeDocs({ "README.md": "# Index, not a doc\n" });
    const r = run([dir]);
    assert.equal(r.status, 0);
    const report = JSON.parse(r.stdout);
    assert.equal(report.summary.scanned, 0);
  });
});

describe("frontmatter-check (unhappy paths)", () => {
  test("missing required keys exits 1 and names each missing key", () => {
    const dir = makeDocs({
      "2026-08-16-broken.md": `---
date: 2026-08-16
topic: Missing keys
---

# Broken
`,
    });
    const r = run([dir]);
    assert.equal(r.status, 1);
    const report = JSON.parse(r.stdout);
    const violations = report.files[0].violations.join("\n");
    assert.ok(violations.includes("status"));
    assert.ok(violations.includes("sources"));
    assert.ok(violations.includes("models_used_for_research"));
    assert.ok(violations.includes("supersedes"));
  });

  test("invalid status enum value exits 1", () => {
    const dir = makeDocs({
      "2026-08-16-badstatus.md": VALID_DOC.replace(
        "status: open",
        "status: banana",
      ),
    });
    const r = run([dir]);
    assert.equal(r.status, 1);
    assert.ok(r.stdout.includes("banana"));
  });

  test("empty sources array exits 1", () => {
    const dir = makeDocs({
      "2026-08-16-emptysources.md": VALID_DOC.replace(
        "sources:\n  - https://example.com/source",
        "sources: []",
      ),
    });
    const r = run([dir]);
    assert.equal(r.status, 1);
    assert.ok(r.stdout.includes("sources"));
  });

  test("supersedes pointing at a nonexistent file exits 1", () => {
    const dir = makeDocs({
      "2026-08-16-orphan-ref.md": VALID_DOC.replace(
        "supersedes: none",
        "supersedes: 2026-01-01-ghost.md",
      ),
    });
    const r = run([dir]);
    assert.equal(r.status, 1);
    assert.ok(r.stdout.includes("2026-01-01-ghost.md"));
  });

  test("status superseded with no child pointing to it exits 1", () => {
    const dir = makeDocs({ "2026-08-10-parent.md": SUPERSEDED_PARENT });
    const r = run([dir]);
    assert.equal(r.status, 1);
    assert.ok(r.stdout.includes("superseded"));
  });

  test("frontmatter date not matching the filename prefix exits 1", () => {
    const dir = makeDocs({ "2026-08-11-mismatch.md": VALID_DOC });
    const r = run([dir]);
    assert.equal(r.status, 1);
    assert.ok(r.stdout.includes("2026-08-11"));
  });

  test("malformed YAML frontmatter exits 2 with the file named", () => {
    const dir = makeDocs({
      "2026-08-16-malformed.md": `---
date: [unclosed
---

# Malformed
`,
    });
    const r = run([dir]);
    assert.equal(r.status, 2);
    assert.ok(r.stderr.includes("2026-08-16-malformed.md"));
  });

  test("nonexistent directory exits 2", () => {
    const r = run([join(tmpdir(), "frontmatter-check-does-not-exist")]);
    assert.equal(r.status, 2);
  });
});

describe("frontmatter-check (reviewer fix round)", () => {
  test("--source with no value exits 2 instead of writing 'undefined'", () => {
    const r = run(["--fix", "--source"]);
    assert.equal(r.status, 2);
    assert.ok(r.stderr.includes("--source"));
    const dir = makeDocs({
      "2026-08-16-fixme.md": "---\ndate: 2026-08-16\n---\n\n# Body\n",
    });
    const r2 = run(["--fix", "--source", "--dry-run", dir]);
    assert.equal(r2.status, 2);
  });

  test("--fix quotes scalars so a source containing ': ' still re-validates", () => {
    const dir = makeDocs({
      "2026-08-16-fixme.md": "---\ndate: 2026-08-16\n---\n\n# Body\n",
    });
    const r = run(["--fix", "--source", "review note: see ticket 42", dir]);
    assert.equal(r.status, 0);
    const fixed = readFileSync(join(dir, "2026-08-16-fixme.md"), "utf8");
    assert.ok(fixed.includes('  - "review note: see ticket 42"'));
    const r2 = run([dir]);
    assert.equal(r2.status, 0);
  });

  test("--dry-run reports post-fix validity without writing the file", () => {
    const dir = makeDocs({
      "2026-08-16-fixme.md": "---\ndate: 2026-08-16\n---\n\n# Body\n",
    });
    const before = readFileSync(join(dir, "2026-08-16-fixme.md"), "utf8");
    const r = run(["--fix", "--dry-run", dir]);
    assert.equal(r.status, 0);
    assert.equal(
      readFileSync(join(dir, "2026-08-16-fixme.md"), "utf8"),
      before,
    );
  });

  test("superseded check is per-directory: a child in another dir does not satisfy it", () => {
    const dirA = makeDocs({ "2026-08-12-child.md": SUPERSEDING_CHILD });
    const dirB = makeDocs({ "2026-08-10-parent.md": SUPERSEDED_PARENT });
    const r = run([dirA, dirB]);
    assert.equal(r.status, 1);
    const report = JSON.parse(r.stdout);
    const parent = report.files.find((f: { file: string }) =>
      f.file.includes("parent"),
    );
    assert.equal(parent.ok, false);
  });

  test("CRLF frontmatter parses and validates like LF", () => {
    const dir = makeDocs({
      "2026-08-16-crlf.md": VALID_DOC.replaceAll("\n", "\r\n"),
    });
    const r = run([dir]);
    assert.equal(r.status, 0);
  });

  test("unknown flags exit 2 with the flag named", () => {
    const dir = makeDocs({ "2026-08-16-valid.md": VALID_DOC });
    const r = run(["--indx", dir]);
    assert.equal(r.status, 2);
    assert.ok(r.stderr.includes("--indx"));
  });
});

describe("frontmatter-check --schema (architecture)", () => {
  const ArchValidA = `---
date: 2026-08-20
topic: Loop factory architecture
status: draft
type: architecture
author: conductor
related_to:
  - ./2026-08-20-b.md
sources:
  - https://example.com/arch-a
---
`;
  const ArchValidBRecip = `---
date: 2026-08-20
topic: Loop factory detail
status: in-review
type: adr
author: conductor
related_to:
  - ./2026-08-20-a.md
sources:
  - https://example.com/arch-b
---
`;
  const ArchValidBNoRecip = `---
date: 2026-08-20
topic: Loop factory detail
status: in-review
type: adr
author: conductor
related_to: []
sources:
  - https://example.com/arch-b
---
`;

  test("--help mentions --schema and the architecture schema", () => {
    const r = run(["--help"]);
    assert.equal(r.status, 0);
    assert.ok(r.stdout.includes("--schema"));
    assert.ok(r.stdout.includes("architecture"));
  });

  test("unknown --schema value exits 2", () => {
    const dir = makeDocs({ "2026-08-20-a.md": ArchValidA });
    const r = run(["--schema", "banana", dir]);
    assert.equal(r.status, 2);
    assert.ok(r.stderr.includes("--schema"));
  });

  test("valid arch doc with reciprocal related_to exits 0 and no warnings", () => {
    const dir = makeDocs({
      "2026-08-20-a.md": ArchValidA,
      "2026-08-20-b.md": ArchValidBRecip,
    });
    const r = run(["--schema", "architecture", dir]);
    assert.equal(r.status, 0);
    const report = JSON.parse(r.stdout);
    assert.equal(report.summary.invalid, 0);
    const a = report.files.find((f: { file: string }) =>
      f.file.includes("2026-08-20-a.md"),
    );
    assert.equal(a.ok, true);
    assert.deepEqual(a.violations, []);
    assert.deepEqual(a.warnings, []);
  });

  test("valid arch doc with non-reciprocal related_to exits 0 BUT warnings non-empty", () => {
    const dir = makeDocs({
      "2026-08-20-a.md": ArchValidA,
      "2026-08-20-b.md": ArchValidBNoRecip,
    });
    const r = run(["--schema", "architecture", dir]);
    assert.equal(r.status, 0);
    const report = JSON.parse(r.stdout);
    assert.equal(report.summary.invalid, 0);
    const a = report.files.find((f: { file: string }) =>
      f.file.includes("2026-08-20-a.md"),
    );
    assert.equal(a.ok, true);
    assert.ok(a.warnings.length > 0);
    assert.ok(a.warnings.join("\n").includes("reciprocity"));
  });

  test("dangling related_to (target missing) exits 1 and names the broken ref", () => {
    const dir = makeDocs({
      "2026-08-20-a.md": ArchValidA,
    });
    const r = run(["--schema", "architecture", dir]);
    assert.equal(r.status, 1);
    const report = JSON.parse(r.stdout);
    const a = report.files.find((f: { file: string }) =>
      f.file.includes("2026-08-20-a.md"),
    );
    assert.equal(a.ok, false);
    assert.ok(a.violations.join("\n").includes("2026-08-20-b.md"));
  });

  test("status not in architecture enum exits 1", () => {
    const dir = makeDocs({
      "2026-08-20-a.md": ArchValidA.replace("status: draft", "status: open"),
      "2026-08-20-b.md": ArchValidBRecip,
    });
    const r = run(["--schema", "architecture", dir]);
    assert.equal(r.status, 1);
    assert.ok(r.stdout.includes("open"));
  });

  test("missing required key author exits 1", () => {
    const doc = ArchValidA.split("\n")
      .filter((l) => !l.startsWith("author:"))
      .join("\n");
    const dir = makeDocs({
      "2026-08-20-a.md": doc,
      "2026-08-20-b.md": ArchValidBRecip,
    });
    const r = run(["--schema", "architecture", dir]);
    assert.equal(r.status, 1);
    assert.ok(r.stdout.includes("author"));
  });

  test("missing required key type exits 1", () => {
    const doc = ArchValidA.split("\n")
      .filter((l) => !l.startsWith("type:"))
      .join("\n");
    const dir = makeDocs({
      "2026-08-20-a.md": doc,
      "2026-08-20-b.md": ArchValidBRecip,
    });
    const r = run(["--schema", "architecture", dir]);
    assert.equal(r.status, 1);
    assert.ok(r.stdout.includes("type"));
  });

  test("type not in {architecture, adr} exits 1", () => {
    const dir = makeDocs({
      "2026-08-20-a.md": ArchValidA.replace(
        "type: architecture",
        "type: recipe",
      ),
      "2026-08-20-b.md": ArchValidBRecip,
    });
    const r = run(["--schema", "architecture", dir]);
    assert.equal(r.status, 1);
    assert.ok(r.stdout.includes("recipe"));
  });

  test("empty related_to [] is valid (no dangling, no reciprocity check)", () => {
    const dir = makeDocs({ "2026-08-20-solo.md": ArchValidBNoRecip });
    const r = run(["--schema", "architecture", dir]);
    assert.equal(r.status, 0);
    const report = JSON.parse(r.stdout);
    assert.equal(report.files[0].ok, true);
    assert.deepEqual(report.files[0].warnings, []);
  });

  test("date not matching filename prefix exits 1", () => {
    const dir = makeDocs({
      "2026-08-11-mismatch.md": ArchValidA,
      "2026-08-20-b.md": ArchValidBRecip,
    });
    const r = run(["--schema", "architecture", dir]);
    assert.equal(r.status, 1);
    assert.ok(r.stdout.includes("2026-08-11"));
  });

  test("default schema (research) still applies when --schema omitted", () => {
    const dir = makeDocs({ "2026-08-16-valid.md": VALID_DOC });
    const r = run([dir]);
    assert.equal(r.status, 0);
  });
});
