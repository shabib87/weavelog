import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import {
  chmodSync,
  cpSync,
  existsSync,
  lstatSync,
  mkdirSync,
  readFileSync,
  rmSync,
  statSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { afterEach, describe, test } from "node:test";
import { fileURLToPath } from "node:url";

const CLI = fileURLToPath(new URL("../../src/cli/index.ts", import.meta.url));
const REPO = resolve(fileURLToPath(new URL("../..", import.meta.url)));
const TSX_LOADER = fileURLToPath(import.meta.resolve("tsx"));

interface RunResult {
  status: number | null;
  stdout: string;
  stderr: string;
}

function run(
  args: string[],
  env: Record<string, string>,
  input?: string,
): RunResult {
  return spawnSync(process.execPath, ["--import", TSX_LOADER, CLI, ...args], {
    encoding: "utf8",
    timeout: 120_000,
    env: { ...process.env, ...env },
    input,
  });
}

const created: string[] = [];
const savedTmpdir = process.env.TMPDIR;
afterEach(() => {
  for (const dir of created.splice(0))
    rmSync(dir, { recursive: true, force: true });
  if (savedTmpdir === undefined) delete process.env.TMPDIR;
  else process.env.TMPDIR = savedTmpdir;
});

let n = 0;
/** Fixtures must live OUTSIDE the worktree (no package ancestor walks). */
function makeDir(prefix: string): string {
  delete process.env.TMPDIR; // session TMPDIR lives inside the worktree — slice KNOWN GOTCHA
  const dir = join(tmpdir(), `weavelog-update-${prefix}-${Date.now()}-${n++}`);
  mkdirSync(dir, { recursive: true });
  created.push(dir);
  return dir;
}

function write(path: string, content: string): void {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, content);
}

function makeFixtureInstall(
  dir: string,
  payloadOverrides: Record<string, string> = {},
  opts: { withBin?: boolean } = {},
): string {
  const pkg = join(dir, "pkg");
  write(
    join(pkg, "package.json"),
    JSON.stringify(
      {
        name: "weavelog",
        version: "0.1.0",
        bin: { weavelog: "./dist/cli/index.js" },
      },
      null,
      2,
    ),
  );
  if (opts.withBin !== false) {
    // A present bin makes checkInstallGuard compare the installed payload
    // against the repo payload; a missing bin (source-checkout semantics)
    // lets the fixture payload diverge freely (used by the payload-v2 test).
    write(join(pkg, "dist", "cli", "index.js"), "#!/usr/bin/env node\n");
  }
  cpSync(join(REPO, "payload"), join(pkg, "payload"), { recursive: true });
  for (const [rel, content] of Object.entries(payloadOverrides)) {
    write(join(pkg, "payload", rel), content);
  }
  return pkg;
}

interface Fixture {
  dir: string;
  home: string;
  config: string;
  skills: string;
  state: string;
  profiles: string;
  pkg: string;
  emptybin: string;
}

function makeFixture(
  payloadOverrides: Record<string, string> = {},
  installOpts: { withBin?: boolean } = {},
): Fixture {
  const dir = makeDir("home");
  const home = join(dir, "home");
  const emptybin = join(dir, "emptybin");
  mkdirSync(home, { recursive: true });
  mkdirSync(emptybin, { recursive: true });
  const pkg = makeFixtureInstall(dir, payloadOverrides, installOpts);
  return {
    dir,
    home,
    config: join(home, ".config", "opencode"),
    skills: join(home, ".agents", "skills"),
    state: join(dir, "state"),
    profiles: join(dir, "profiles"),
    pkg,
    emptybin,
  };
}

function env(
  f: Fixture,
  extra: Record<string, string> = {},
): Record<string, string> {
  return {
    HOME: f.home,
    WEAVELOG_STATE_DIR: f.state,
    WEAVELOG_PROFILES_DIR: f.profiles,
    WEAVELOG_PACKAGE_ROOT: f.pkg,
    PATH: f.emptybin,
    ...extra,
  };
}

function ledgerLines(state: string): Record<string, unknown>[] {
  const ledger = join(state, "ledger.jsonl");
  if (!existsSync(ledger)) return [];
  return readFileSync(ledger, "utf8")
    .trim()
    .split("\n")
    .map((line) => JSON.parse(line));
}

function updateSummary(f: Fixture): Record<string, unknown> {
  return (
    ledgerLines(f.state)
      .filter((l) => l.command === "update")
      .at(-1) ?? {}
  );
}

/** Journal lines (intent/completion) written by an update run. */
function journalLines(state: string): Record<string, unknown>[] {
  return ledgerLines(state).filter((l) => l.command === "update");
}

describe("cli update (materialization refresh on the init contract)", () => {
  test("never-initialized machine: update creates every declared target, exit 0, journal command 'update'", () => {
    // Contract: cli-vision.md "Ownership and replacement" row 1 —
    // "| Global target is absent | Create it | Create it |" applies to the
    // update run too (the preflight contract governs init, update, and
    // scaffold; AC #3's refusal list excludes absent).
    const f = makeFixture();
    const r = run(["update"], env(f));
    assert.equal(r.status, 0, r.stderr);
    assert.ok(
      existsSync(join(f.config, "AGENTS.md")),
      "AGENTS.md created on an absent machine",
    );
    assert.ok(
      existsSync(join(f.config, "opencode.jsonc")),
      "opencode.jsonc created",
    );
    assert.ok(
      existsSync(join(f.skills, "as-tdd", "SKILL.md")),
      "skills fan-out created",
    );
    assert.equal(
      existsSync(join(f.state, "backups")),
      false,
      "no backups on a create-all run",
    );
    const summary = updateSummary(f);
    assert.equal(summary.exitCode, 0);
    const targets = summary.targets as { liveRel: string; action: string }[];
    assert.ok(
      targets.some(
        (t) => t.liveRel === "opencode.jsonc" && t.action === "create",
      ),
      "per-target decision recorded as create",
    );
    const journal = journalLines(f.state);
    assert.ok(
      journal.length > 0,
      "journal entries written with command update",
    );
    assert.ok(
      journal.every((l) => l.command === "update"),
      "every journal entry records command:update",
    );
  });

  test("fresh init then update: no-op, exit 0, all targets action 'update'", () => {
    const f = makeFixture();
    const env1 = env(f);
    assert.equal(run(["init"], env1).status, 0, "init succeeds");
    const r = run(["update"], env1);
    assert.equal(r.status, 0, r.stderr);
    const targets = updateSummary(f).targets as {
      liveRel: string;
      action: string;
    }[];
    assert.ok(
      targets.every((t) => t.action === "update"),
      "owned+unchanged targets update (re-render)",
    );
    assert.equal(
      existsSync(join(f.state, "backups")),
      false,
      "no backups on a clean refresh",
    );
  });

  test("payload v2 changed while live untouched: update writes the new installed payload bytes", () => {
    // No dist bin: source-checkout semantics, so the AC #6 staleness guard
    // does not refuse the intentionally divergent fixture payload.
    const f = makeFixture({}, { withBin: false });
    assert.equal(run(["init"], env(f)).status, 0);
    write(
      join(f.pkg, "payload", "AGENTS.md"),
      "# new installed payload AGENTS.md (v2)\n",
    );
    const r = run(["update"], env(f));
    assert.equal(r.status, 0, r.stderr);
    assert.equal(
      readFileSync(join(f.config, "AGENTS.md"), "utf8"),
      "# new installed payload AGENTS.md (v2)\n",
      "live AGENTS.md refreshed from the INSTALLED package payload",
    );
  });

  test("unowned file at a declared target: whole-run refusal, nonzero exit, zero writes anywhere", () => {
    const f = makeFixture();
    write(join(f.config, "opencode.jsonc"), "user-owned config\n");
    const r = run(["update"], env(f));
    assert.equal(r.status, 1);
    assert.ok(
      r.stderr.includes("opencode.jsonc"),
      "refusal names the conflict",
    );
    assert.equal(
      existsSync(join(f.config, "AGENTS.md")),
      false,
      "no AGENTS.md write",
    );
    assert.equal(
      existsSync(join(f.config, "agents")),
      false,
      "no agents/ write",
    );
    assert.equal(existsSync(join(f.skills, "as-tdd")), false, "no skill write");
    assert.equal(
      existsSync(join(f.state, "materialize")),
      false,
      "no ownership state write",
    );
    const summary = updateSummary(f);
    assert.equal(summary.exitCode, 1);
    assert.ok(
      (summary.targets as { action: string }[]).some(
        (t) => t.action === "refused",
      ),
      "run summary records the refusal",
    );
  });

  test("owned but changed live file: update refuses, nonzero, hand edit preserved", () => {
    const f = makeFixture();
    assert.equal(run(["init"], env(f)).status, 0);
    write(join(f.config, "opencode.jsonc"), "hand-edited after init\n");
    const r = run(["update"], env(f));
    assert.equal(r.status, 1);
    assert.ok(
      r.stderr.includes("opencode.jsonc"),
      "refusal names the changed target",
    );
    assert.equal(
      readFileSync(join(f.config, "opencode.jsonc"), "utf8"),
      "hand-edited after init\n",
      "the hand edit is never overwritten",
    );
    assert.equal(updateSummary(f).exitCode, 1);
  });

  test("unowned + --force --yes (noninteractive): staged replacement, opaque 0600 .bak, journal command 'update'", () => {
    const f = makeFixture();
    const junk = "user-owned opencode config\n";
    write(join(f.config, "opencode.jsonc"), junk);
    const r = run(["update", "--force", "--yes"], env(f));
    assert.equal(r.status, 0, r.stderr);
    assert.notEqual(
      readFileSync(join(f.config, "opencode.jsonc"), "utf8"),
      junk,
      "live carries the staged installed content",
    );
    const completion = journalLines(f.state).find(
      (l) =>
        l.phase === "completion" &&
        (l.target as { liveRel: string })?.liveRel === "opencode.jsonc",
    ) as Record<string, unknown> | undefined;
    assert.ok(completion, "replacement completion journaled as update");
    const backup = join(
      f.state,
      "backups",
      (completion.target as { backupRef: string }).backupRef,
    );
    assert.ok(existsSync(backup), "opaque backup path exists");
    assert.equal(backup.endsWith(".bak"), true, "backup uses the .bak suffix");
    assert.equal(
      backup.includes(f.home),
      false,
      "backup name is opaque (no raw home path)",
    );
    assert.equal(statSync(backup).mode & 0o777, 0o600, "backup file is 0600");
    assert.equal(
      readFileSync(backup, "utf8"),
      junk,
      "backup preserves the prior bytes",
    );
    const intent = journalLines(f.state).find(
      (l) =>
        l.phase === "intent" &&
        (l.target as { liveRel: string })?.liveRel === "opencode.jsonc",
    ) as Record<string, unknown> | undefined;
    assert.ok(intent, "replacement intent journaled");
    assert.equal(
      (intent.target as { backupRef: string }).backupRef,
      (completion.target as { backupRef: string }).backupRef,
      "intent and completion share the backup reference",
    );
    const target = (
      updateSummary(f).targets as { liveRel: string; action: string }[]
    ).find((t) => t.liveRel === "opencode.jsonc");
    assert.equal(target?.action, "replaced");
  });

  test("interactive --force requires TTY confirmation: 'n' declines, 'y' replaces (WEAVELOG_TTY seam)", () => {
    const f = makeFixture();
    write(join(f.config, "opencode.jsonc"), "user-owned\n");
    const tty = env(f, { WEAVELOG_TTY: "1" });
    const decline = run(["update", "--force"], tty, "n\n");
    assert.equal(decline.status, 1);
    assert.ok(
      decline.stdout.includes("opencode.jsonc"),
      "prompt names the target",
    );
    assert.ok(
      decline.stdout.includes("weavelog update:"),
      "prompt names the update command",
    );
    assert.ok(
      decline.stdout.toLowerCase().includes("replace"),
      "prompt shows the replacement warning",
    );
    assert.equal(
      readFileSync(join(f.config, "opencode.jsonc"), "utf8"),
      "user-owned\n",
    );
    assert.equal(
      existsSync(join(f.state, "backups")),
      false,
      "declined: no backup",
    );
    const accept = run(["update", "--force"], tty, "y\n");
    assert.equal(accept.status, 0, accept.stderr);
    assert.notEqual(
      readFileSync(join(f.config, "opencode.jsonc"), "utf8"),
      "user-owned\n",
    );
  });

  test("--yes alone never permits a replacement; --force alone refuses noninteractive", () => {
    const f = makeFixture();
    write(join(f.config, "opencode.jsonc"), "user-owned\n");
    const yes = run(["update", "--yes"], env(f));
    assert.equal(yes.status, 1);
    assert.ok(
      yes.stderr.includes("opencode.jsonc"),
      "--yes alone never permits",
    );
    const force = run(["update", "--force"], env(f));
    assert.equal(force.status, 1);
    assert.ok(
      force.stderr.includes("opencode.jsonc"),
      "--force without --yes refuses noninteractive",
    );
    assert.equal(
      existsSync(join(f.state, "backups")),
      false,
      "no backup created",
    );
    assert.equal(
      readFileSync(join(f.config, "opencode.jsonc"), "utf8"),
      "user-owned\n",
    );
  });

  test("symlink target refuses even with --force --yes (lstat-only)", () => {
    const f = makeFixture();
    const targetFile = join(f.config, "somewhere", "else.jsonc");
    write(targetFile, "{}\n");
    symlinkSync(targetFile, join(f.config, "opencode.jsonc"));
    const r = run(["update", "--force", "--yes"], env(f));
    assert.equal(r.status, 1);
    assert.ok(
      r.stderr.includes("opencode.jsonc"),
      "refusal names the symlink target",
    );
    assert.equal(
      lstatSync(join(f.config, "opencode.jsonc")).isSymbolicLink(),
      true,
      "symlink never followed or replaced",
    );
  });

  test("AC #6 fields: ledger records resolvedPackageRoot + resolvedBinPath on success and refusal paths", () => {
    // success path
    const f = makeFixture();
    const env1 = env(f);
    assert.equal(run(["update"], env1).status, 0);
    const okSummary = updateSummary(f);
    assert.equal(okSummary.resolvedPackageRoot, f.pkg, "resolvedPackageRoot");
    assert.equal(
      okSummary.resolvedBinPath,
      join(f.pkg, "dist", "cli", "index.js"),
      "resolvedBinPath",
    );
    // refusal path
    const f2 = makeFixture();
    write(join(f2.config, "opencode.jsonc"), "user-owned\n");
    assert.equal(run(["update"], env(f2)).status, 1);
    const refuseSummary = updateSummary(f2);
    assert.equal(refuseSummary.exitCode, 1);
    assert.equal(refuseSummary.resolvedPackageRoot, f2.pkg);
    assert.equal(
      refuseSummary.resolvedBinPath,
      join(f2.pkg, "dist", "cli", "index.js"),
    );
  });

  test("missing ownership state (active-profile exists, journal gone): update refuses", () => {
    const f = makeFixture();
    assert.equal(run(["init"], env(f)).status, 0);
    rmSync(join(f.state, "ledger.jsonl"), { recursive: true, force: true });
    const r = run(["update"], env(f));
    assert.equal(r.status, 1);
    assert.ok(
      r.stderr.includes("ownership"),
      "missing recorded state hash refuses (greenfield-first)",
    );
  });
});

describe("cli versions (renamed version-report)", () => {
  const manifest = JSON.parse(
    readFileSync(join(REPO, "weavelog.json"), "utf8"),
  ) as {
    tools: Record<string, { version: string }>;
  };

  function fakeBin(dir: string, name: string, version: string): string {
    const p = join(dir, name);
    writeFileSync(p, `#!/bin/sh\nprintf '%s\\n' '${version}'\n`);
    chmodSync(p, 0o755);
    return p;
  }

  function binsEnv(f: Fixture): Record<string, string> {
    const bins = join(f.dir, "bins");
    mkdirSync(bins, { recursive: true });
    // diagram-design.present requires the skills dir to exist (git-skill check)
    const skills = join(f.dir, "skills");
    mkdirSync(join(skills, "diagram-design"), { recursive: true });
    return {
      WEAVELOG_SKILLS_DIR: skills,
      WEAVELOG_HEADROOM_BIN: fakeBin(
        bins,
        "headroom",
        manifest.tools.headroom.version,
      ),
      WEAVELOG_BACKLOG_BIN: fakeBin(
        bins,
        "backlog",
        manifest.tools.backlog.version,
      ),
      WEAVELOG_MARKITDOWN_BIN: fakeBin(
        bins,
        "markitdown",
        manifest.tools.markitdown.version,
      ),
      WEAVELOG_OPENCODE_BIN: fakeBin(
        bins,
        "opencode",
        manifest.tools.opencode.version,
      ),
      WEAVELOG_PI_BIN: fakeBin(bins, "pi", manifest.tools.pi.version),
    };
  }

  test("--help exits 0 with usage text (renamed from update)", () => {
    const f = makeFixture();
    const r = run(["versions", "--help"], env(f));
    assert.equal(r.status, 0);
    assert.ok(r.stdout.includes("Usage"));
    assert.ok(
      r.stdout.includes("weavelog.json"),
      "version-report help retained",
    );
  });

  test("healthy machine: exits 0, reports pass lines, ledger command 'versions'", () => {
    const f = makeFixture();
    const r = run(["versions"], env(f, binsEnv(f)));
    assert.equal(r.status, 0, r.stderr);
    assert.ok(r.stdout.includes("[pass]"), "per-check pass lines printed");
    assert.ok(
      r.stdout.includes("healthy setup"),
      "healthy summary retained from the old update report",
    );
    const summary = ledgerLines(f.state).at(-1) as Record<string, unknown>;
    assert.equal(summary.command, "versions");
    assert.equal(summary.exitCode, 0);
  });

  test("drift: exits 1, report-only (nothing changed), ledger command 'versions'", () => {
    const f = makeFixture();
    const bins = join(f.dir, "bins");
    mkdirSync(bins, { recursive: true });
    const b = binsEnv(f);
    b.WEAVELOG_BACKLOG_BIN = fakeBin(bins, "backlog", "9.9.9");
    const r = run(["versions"], env(f, b));
    assert.equal(r.status, 1);
    assert.ok(
      r.stderr.includes("drift found (report-only; nothing was changed)"),
      "refusal message retained from the old update report",
    );
    const summary = ledgerLines(f.state).at(-1) as Record<string, unknown>;
    assert.equal(summary.command, "versions");
    assert.equal(summary.exitCode, 1);
    assert.equal(
      (summary.filesTouched as unknown[]).length,
      0,
      "report-only: nothing touched",
    );
  });
});
