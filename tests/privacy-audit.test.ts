import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, test } from "node:test";
import { fileURLToPath } from "node:url";
import {
  buildPrivacyRules,
  findPrivacyOffenders,
  parseLines,
  privacyAuditForDir,
} from "../src/tools/privacy-audit.js";

// All needles/tokens here are synthetic; the real identity never appears.
const NEEDLE = ["Test", "Person"].join("");
const SECRET = ["AKIA", "ABCDEFGHIJKLMNOP"].join("");
const GITHUB_PAT = ["github", "_pat_", "ABCDEFGHIJKLMNOPQRSTUVWX"].join("");
const OPENAI_KEY = ["sk", "-proj-", "ABCDEFGHIJKLMNOPQRSTUVWX"].join("");
const STS_KEY = ["AS", "IA", "ABCDEFGHIJKLMNOP"].join("");
const PRIVATE_KEY = ["-----BEGIN ", "ENCRYPTED ", "PRIVATE KEY-----"].join("");
const HOME_PATH = ["/Users/", "realuser", "/project"].join("");
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

describe("parseLines / buildPrivacyRules", () => {
  test("ignores blank lines and comments", () => {
    assert.deepEqual(parseLines("# c\n\n  a  \nb\n"), ["a", "b"]);
  });

  test("adds a personal-name rule only when needles exist", () => {
    assert.equal(
      buildPrivacyRules([]).some((r) => r.id === "personal-name"),
      false,
    );
    assert.equal(
      buildPrivacyRules([NEEDLE]).some((r) => r.id === "personal-name"),
      true,
    );
  });
});

describe("findPrivacyOffenders", () => {
  test("returns no offenders for clean content", () => {
    assert.deepEqual(
      findPrivacyOffenders("clean.md", "# Hello\nuse ~ for home paths\n"),
      [],
    );
  });

  test("flags a generic absolute home path but not synthetic fixtures", () => {
    const hit = findPrivacyOffenders("notes.md", `path ${HOME_PATH}\n`);
    assert.equal(hit.length, 1);
    assert.equal(hit[0]?.rule, "home-path");
    assert.deepEqual(
      findPrivacyOffenders("x.md", "see /Users/x and /Users/me\n"),
      [],
    );
  });

  test("matches home paths case-insensitively", () => {
    const hit = findPrivacyOffenders("notes.md", "path /users/realuser/x\n");
    assert.equal(hit.length, 1);
    assert.equal(hit[0]?.rule, "home-path");
  });

  test("flags a personal name when the local needle rule is built", () => {
    const rules = buildPrivacyRules([NEEDLE]);
    const hit = findPrivacyOffenders(
      "notes.md",
      `contact ${NEEDLE} here\n`,
      rules,
    );
    assert.equal(hit.length, 1);
    assert.equal(hit[0]?.rule, "personal-name");
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

  test("redacts a personal match on a line that also carries a secret", () => {
    const rules = buildPrivacyRules([NEEDLE]);
    const offenders = findPrivacyOffenders(
      "cfg.ts",
      `contact ${NEEDLE} key ${SECRET}\n`,
      rules,
    );
    assert.ok(offenders.some((o) => o.rule === "personal-name"));
    assert.ok(offenders.every((o) => o.excerpt === "[redacted]"));
  });

  test("does not flag kebab-case prose that merely contains 'sk-'", () => {
    for (const line of [
      "task-validate-pre-commit-hook",
      "risk-signals-l1-escalation-triggers",
      "flask-caching-implementation-guide",
    ]) {
      assert.deepEqual(findPrivacyOffenders("x.md", `${line}\n`), []);
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
    const r = privacyAuditForDir(dir, { needles: [] });
    assert.equal(r.status, "pass");
    assert.deepEqual(r.offenders, []);
    assert.ok(r.filesScanned >= 1);
  });

  test("fails naming the tracked file and matched pattern", () => {
    const dir = makeDir("dirty");
    makeRepo(dir);
    write(join(dir, "notes.md"), `path ${HOME_PATH}\n`);
    git(["add", "."], dir);
    const r = privacyAuditForDir(dir, { needles: [] });
    assert.equal(r.status, "fail");
    assert.ok(r.offenders.some((o) => o.file === "notes.md"));
    assert.ok(r.offenders.some((o) => o.rule === "home-path"));
    assert.ok(r.detail.includes("notes.md"));
  });

  test("honors a repo-local excludes file", () => {
    const dir = makeDir("excluded");
    makeRepo(dir);
    write(join(dir, ".weavelog-privacy-excludes"), "backlog/\n");
    write(join(dir, "backlog", "task.md"), `path ${HOME_PATH}\n`);
    git(["add", "."], dir);
    const r = privacyAuditForDir(dir, { needles: [] });
    assert.equal(r.status, "pass");
  });

  test("still scans personally-excluded files for secrets", () => {
    const dir = makeDir("readme-secret");
    makeRepo(dir);
    write(join(dir, "README.md"), `token ${SECRET}\n`);
    git(["add", "."], dir);
    const r = privacyAuditForDir(dir, { needles: [] });
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
      privacyAuditForDir(dir, { source: "worktree", needles: [] }).status,
      "pass",
    );
    const r = privacyAuditForDir(dir, { source: "index", needles: [] });
    assert.equal(r.status, "fail");
    assert.ok(r.offenders.some((o) => o.file === "notes.md"));
  });

  test("skips personal-name scanning when no needle file exists", () => {
    const dir = makeDir("noneedles");
    makeRepo(dir);
    write(join(dir, "notes.md"), `contact ${NEEDLE}\n`);
    git(["add", "."], dir);
    const r = privacyAuditForDir(dir, { needlesPath: join(dir, "absent.txt") });
    assert.equal(r.status, "pass");
    assert.ok(r.detail.includes("skipped"));
  });

  test("reads the needle file from WEAVELOG_PRIVACY_NEEDLES", () => {
    const dir = makeDir("envneedles");
    makeRepo(dir);
    write(join(dir, "notes.md"), `contact ${NEEDLE}\n`);
    git(["add", "."], dir);
    const needlesFile = join(dir, "needles.txt");
    write(needlesFile, `${NEEDLE}\n`);
    const prev = process.env.WEAVELOG_PRIVACY_NEEDLES;
    process.env.WEAVELOG_PRIVACY_NEEDLES = needlesFile;
    try {
      const r = privacyAuditForDir(dir);
      assert.equal(r.status, "fail");
      assert.ok(r.offenders.some((o) => o.rule === "personal-name"));
    } finally {
      if (prev === undefined) delete process.env.WEAVELOG_PRIVACY_NEEDLES;
      else process.env.WEAVELOG_PRIVACY_NEEDLES = prev;
    }
  });

  test("reports an empty needle file as skipped, not enabled", () => {
    const dir = makeDir("emptyneedles");
    makeRepo(dir);
    write(join(dir, "notes.md"), "clean\n");
    git(["add", "."], dir);
    const needlesFile = join(dir, "needles.txt");
    write(needlesFile, "# only a comment\n");
    const r = privacyAuditForDir(dir, { needlesPath: needlesFile });
    assert.equal(r.status, "pass");
    assert.ok(r.detail.includes("skipped"), r.detail);
  });

  test("a repo-local exclude cannot suppress the secret scope", () => {
    const dir = makeDir("exclude-secret");
    makeRepo(dir);
    write(join(dir, ".weavelog-privacy-excludes"), "secret.md\n");
    write(join(dir, "secret.md"), `token ${SECRET}\n`);
    git(["add", "."], dir);
    const r = privacyAuditForDir(dir, { needles: [] });
    assert.equal(r.status, "fail");
    assert.ok(r.offenders.some((o) => o.file === "secret.md"));
  });

  test("fails closed when the needle file is unreadable", () => {
    const dir = makeDir("badneedles");
    makeRepo(dir);
    write(join(dir, "notes.md"), "clean\n");
    git(["add", "."], dir);
    mkdirSync(join(dir, "as-dir"), { recursive: true });
    const r = privacyAuditForDir(dir, { needlesPath: join(dir, "as-dir") });
    assert.equal(r.status, "fail");
    assert.ok(r.detail.includes("failed closed"));
  });

  test("skips outside a git working tree root", () => {
    const dir = makeDir("nogit");
    write(join(dir, "notes.md"), "clean\n");
    const r = privacyAuditForDir(dir, { needles: [] });
    assert.equal(r.status, "skip");
  });

  test("skips a nested directory inside a repo instead of scanning the parent", () => {
    const dir = makeDir("nested");
    makeRepo(dir);
    write(join(dir, "notes.md"), `path ${HOME_PATH}\n`);
    mkdirSync(join(dir, "src"), { recursive: true });
    git(["add", "."], dir);
    const r = privacyAuditForDir(join(dir, "src"), { needles: [] });
    assert.equal(r.status, "skip");
    assert.ok(r.detail.includes("root"));
  });

  test("index source fails closed when a tracked path contains a newline", () => {
    const dir = makeDir("newline");
    makeRepo(dir);
    write(join(dir, "evil\nname.md"), "clean\n");
    git(["add", "."], dir);
    const r = privacyAuditForDir(dir, { source: "index", needles: [] });
    assert.equal(r.status, "fail");
    assert.ok(r.detail.includes("newline"));
  });
});
