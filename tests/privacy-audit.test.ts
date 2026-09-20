import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, test } from "node:test";
import { fileURLToPath } from "node:url";
import {
  findPrivacyOffenders,
  privacyAuditForDir,
} from "../src/tools/privacy-audit.js";

// Needles are assembled at runtime so this test file does not itself contain
// the strings the privacy scan looks for.
const PERSONAL = ["shabib", "hossain"].join("");
const SECRET = ["AKIA", "ABCDEFGHIJKLMNOP"].join("");
const GITHUB_PAT = ["github", "_pat_", "ABCDEFGHIJKLMNOPQRSTUVWX"].join("");
const OPENAI_KEY = ["sk", "-proj-", "ABCDEFGHIJKLMNOPQRSTUVWX"].join("");
const STS_KEY = ["AS", "IA", "ABCDEFGHIJKLMNOP"].join("");
const PRIVATE_KEY = ["-----BEGIN ", "ENCRYPTED ", "PRIVATE KEY-----"].join("");
const MODULE = fileURLToPath(
  new URL("../src/tools/privacy-audit.ts", import.meta.url),
);

const created: string[] = [];
afterEach(() => {
  for (const dir of created.splice(0))
    rmSync(dir, { recursive: true, force: true });
});

let n = 0;
function makeDir(prefix: string): string {
  const dir = join(tmpdir(), `privacy-audit-${prefix}-${Date.now()}-${n++}`);
  mkdirSync(dir, { recursive: true });
  created.push(dir);
  return dir;
}

function write(path: string, content: string): void {
  mkdirSync(join(path, ".."), { recursive: true });
  writeFileSync(path, content);
}

function git(args: string[], cwd: string): void {
  const r = spawnSync("git", args, { cwd, encoding: "utf8" });
  if (r.status !== 0)
    throw new Error(`git ${args.join(" ")} failed: ${r.stderr}`);
}

function makeRepo(dir: string): void {
  mkdirSync(dir, { recursive: true });
  git(["init", "-b", "main"], dir);
  git(["config", "user.email", "t@t.com"], dir);
  git(["config", "user.name", "T"], dir);
}

describe("findPrivacyOffenders", () => {
  test("returns no offenders for clean content", () => {
    assert.deepEqual(
      findPrivacyOffenders("clean.md", "# Hello\nuse ~ for home paths\n"),
      [],
    );
  });

  test("flags a personal identifier with file, line and rule", () => {
    const offenders = findPrivacyOffenders(
      "notes.md",
      `first line\ncontact ${PERSONAL} here\n`,
    );
    assert.equal(offenders.length, 1);
    assert.equal(offenders[0]?.file, "notes.md");
    assert.equal(offenders[0]?.line, 2);
    assert.equal(offenders[0]?.rule, "personal");
  });

  test("flags current secret token formats", () => {
    for (const [name, token] of [
      ["aws-akia", SECRET],
      ["aws-sts", STS_KEY],
      ["github-pat", GITHUB_PAT],
      ["openai-project", OPENAI_KEY],
      ["private-key", PRIVATE_KEY],
    ] as const) {
      const offenders = findPrivacyOffenders(
        "cfg.ts",
        `const k = "${token}";\n`,
      );
      assert.equal(offenders.length, 1, `${name} not detected`);
      assert.equal(offenders[0]?.rule, "secret");
    }
  });

  test("redacts the matched secret value", () => {
    const offenders = findPrivacyOffenders(
      "cfg.ts",
      `const k = "${SECRET}";\n`,
    );
    assert.equal(offenders[0]?.excerpt, "[redacted]");
  });

  test("redacts a personal match on a line that also carries a secret", () => {
    const offenders = findPrivacyOffenders(
      "cfg.ts",
      `contact ${PERSONAL} key ${SECRET}\n`,
    );
    assert.ok(offenders.some((o) => o.rule === "personal"));
    assert.ok(
      offenders.every((o) => o.excerpt === "[redacted]"),
      "no raw line is exposed",
    );
  });

  test("does not flag kebab-case prose that merely contains 'sk-'", () => {
    for (const line of [
      "task-validate-pre-commit-hook",
      "risk-signals-l1-escalation-triggers",
      "flask-caching-implementation-guide",
    ]) {
      assert.deepEqual(
        findPrivacyOffenders("x.md", `${line}\n`),
        [],
        `false positive on ${line}`,
      );
    }
  });

  test("the module's own source contains no scan offenders", () => {
    const content = readFileSync(MODULE, "utf8");
    assert.deepEqual(findPrivacyOffenders("privacy-audit.ts", content), []);
  });
});

describe("privacyAuditForDir", () => {
  test("passes on a clean git working tree", () => {
    const dir = makeDir("clean");
    makeRepo(dir);
    write(join(dir, "notes.md"), "# clean\n");
    git(["add", "."], dir);
    const r = privacyAuditForDir(dir);
    assert.equal(r.status, "pass");
    assert.deepEqual(r.offenders, []);
    assert.ok(r.filesScanned >= 1);
  });

  test("fails naming the tracked file and matched pattern", () => {
    const dir = makeDir("dirty");
    makeRepo(dir);
    write(join(dir, "notes.md"), `contact ${PERSONAL}\n`);
    git(["add", "."], dir);
    const r = privacyAuditForDir(dir);
    assert.equal(r.status, "fail");
    assert.ok(r.offenders.some((o) => o.file === "notes.md"));
    assert.ok(
      r.offenders.some((o) => o.rule === "personal"),
      "offender names the matched rule",
    );
    assert.ok(r.detail.includes("notes.md"), "detail names the file");
    assert.ok(r.detail.includes("[personal]"), "detail names the pattern");
  });

  test("honors personal excludes", () => {
    const dir = makeDir("excluded");
    makeRepo(dir);
    write(join(dir, "backlog", "task.md"), `contact ${PERSONAL}\n`);
    git(["add", "."], dir);
    const r = privacyAuditForDir(dir);
    assert.equal(r.status, "pass");
  });

  test("still scans personally-excluded files for secrets", () => {
    const dir = makeDir("readme-secret");
    makeRepo(dir);
    write(join(dir, "README.md"), `token ${SECRET}\n`);
    git(["add", "."], dir);
    const r = privacyAuditForDir(dir);
    assert.equal(r.status, "fail");
    assert.ok(r.offenders.some((o) => o.file === "README.md"));
  });

  test("index source catches a staged secret hidden by a clean working tree", () => {
    const dir = makeDir("index");
    makeRepo(dir);
    write(join(dir, "notes.md"), `token ${SECRET}\n`);
    git(["add", "."], dir);
    write(join(dir, "notes.md"), "clean\n");
    assert.equal(
      privacyAuditForDir(dir, { source: "worktree" }).status,
      "pass",
      "worktree scan does not see the staged secret",
    );
    const r = privacyAuditForDir(dir, { source: "index" });
    assert.equal(r.status, "fail");
    assert.ok(r.offenders.some((o) => o.file === "notes.md"));
  });

  test("skips outside a git working tree root", () => {
    const dir = makeDir("nogit");
    write(join(dir, "notes.md"), "clean\n");
    const r = privacyAuditForDir(dir);
    assert.equal(r.status, "skip");
  });

  test("index source fails closed when a tracked path contains a newline", () => {
    const dir = makeDir("newline");
    makeRepo(dir);
    write(join(dir, "evil\nname.md"), "clean\n");
    git(["add", "."], dir);
    const r = privacyAuditForDir(dir, { source: "index" });
    assert.equal(r.status, "fail");
    assert.ok(r.detail.includes("newline"), "detail explains the refusal");
  });

  test("skips a nested directory inside a repo instead of scanning the parent", () => {
    const dir = makeDir("nested");
    makeRepo(dir);
    write(join(dir, "notes.md"), `contact ${PERSONAL}\n`);
    mkdirSync(join(dir, "src"), { recursive: true });
    git(["add", "."], dir);
    const r = privacyAuditForDir(join(dir, "src"));
    assert.equal(r.status, "skip");
    assert.ok(r.detail.includes("root"), "detail explains the nested skip");
  });
});
