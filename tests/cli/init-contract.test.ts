import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  appendFileSync,
  cpSync,
  existsSync,
  lstatSync,
  mkdirSync,
  readdirSync,
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
import { targetIdOf } from "../../src/tools/materialize-state.js";

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
  delete process.env.TMPDIR; // session TMPDIR lives inside the worktree — see slice KNOWN GOTCHA
  const dir = join(tmpdir(), `weavelog-init-${prefix}-${Date.now()}-${n++}`);
  mkdirSync(dir, { recursive: true });
  created.push(dir);
  return dir;
}

function write(path: string, content: string): void {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, content);
}

function walkFiles(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walkFiles(full));
    else out.push(full);
  }
  return out;
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
    // lets the fixture payload diverge freely (used by the update test).
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

function runSummary(f: Fixture): Record<string, unknown> {
  return (
    ledgerLines(f.state)
      .filter((l) => l.command === "init")
      .at(-1) ?? {}
  );
}

describe("cli init (ownership/preflight/replacement contract)", () => {
  test("fresh machine: every declared target is created (config render + skills copy), exit 0, no backups", () => {
    const f = makeFixture();
    const r = run(["init"], env(f));
    assert.equal(r.status, 0, r.stderr);
    // config fan-out (render targets)
    assert.ok(
      existsSync(join(f.config, "AGENTS.md")),
      "AGENTS.md rendered to config root",
    );
    assert.ok(
      existsSync(join(f.config, "opencode.jsonc")),
      "opencode.jsonc rendered",
    );
    assert.ok(
      existsSync(join(f.config, "agents", "researcher.md")),
      "agents/** rendered",
    );
    assert.ok(
      existsSync(join(f.config, "prompts", "reviewer.md")),
      "prompts/** rendered",
    );
    // skills fan-out (copy targets) — whole skill trees
    assert.ok(
      existsSync(join(f.skills, "as-tdd", "SKILL.md")),
      "as-tdd skill copied",
    );
    assert.ok(
      existsSync(join(f.skills, "as-tdd", "writing-good-tests.md")),
      "skill subtree copied verbatim",
    );
    assert.ok(
      existsSync(join(f.skills, "verify-with-criteria", "SKILL.md")),
      "verify-with-criteria skill copied",
    );
    // no backups on a clean create
    assert.equal(
      existsSync(join(f.state, "backups")),
      false,
      "no backups dir on create-all",
    );
    // per-target decisions on the run summary
    const targets = runSummary(f).targets as {
      liveRel: string;
      action: string;
    }[];
    assert.ok(
      targets.some(
        (t) => t.liveRel === "opencode.jsonc" && t.action === "create",
      ),
    );
    assert.ok(
      targets.some(
        (t) => t.liveRel === "as-tdd/SKILL.md" && t.action === "create",
      ),
    );
  });

  test("unowned file at a declared target: whole-run refusal, nonzero exit, zero writes anywhere", () => {
    const f = makeFixture();
    write(join(f.config, "opencode.jsonc"), "user-owned config\n");
    const r = run(["init"], env(f));
    assert.equal(r.status, 1);
    assert.ok(
      r.stderr.includes("opencode.jsonc"),
      "refusal names the conflict",
    );
    // zero writes: no other declared target materialized
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
    // the run itself is journaled (run summary, no per-target writes)
    assert.equal(runSummary(f).exitCode, 1);
  });

  test("owned + unchanged: re-running init is a no-op update, exit 0", () => {
    const f = makeFixture();
    const env1 = env(f);
    assert.equal(run(["init"], env1).status, 0);
    const r2 = run(["init"], env1);
    assert.equal(r2.status, 0);
    const targets = runSummary(f).targets as {
      liveRel: string;
      action: string;
    }[];
    assert.ok(
      targets.every((t) => t.action === "update"),
      "second run updates owned+unchanged targets",
    );
  });

  test("tracked changed while live untouched: update writes the new installed payload bytes", () => {
    // No dist bin: source-checkout semantics, so the AC #6 staleness guard
    // (which compares the installed payload against the repo payload) does
    // not refuse the intentionally divergent fixture payload.
    const f = makeFixture({}, { withBin: false });
    assert.equal(run(["init"], env(f)).status, 0);
    write(
      join(f.pkg, "payload", "AGENTS.md"),
      "# new installed payload AGENTS.md\n",
    );
    const r = run(["init"], env(f));
    assert.equal(r.status, 0, r.stderr);
    assert.equal(
      readFileSync(join(f.config, "AGENTS.md"), "utf8"),
      "# new installed payload AGENTS.md\n",
      "live AGENTS.md updated from the INSTALLED package payload",
    );
  });

  test("owned but changed live file: refusal, nonzero, nothing re-materialized", () => {
    const f = makeFixture();
    assert.equal(run(["init"], env(f)).status, 0);
    write(join(f.config, "opencode.jsonc"), "hand-edited after init\n");
    const r = run(["init"], env(f));
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
    assert.equal(runSummary(f).exitCode, 1);
  });

  test("missing ownership state (active-profile exists, journal gone): refusal", () => {
    const f = makeFixture();
    assert.equal(run(["init"], env(f)).status, 0);
    rmSync(join(f.state, "ledger.jsonl"), { recursive: true, force: true });
    const r = run(["init"], env(f));
    assert.equal(r.status, 1);
    assert.ok(
      r.stderr.includes("ownership"),
      "missing recorded state hash refuses (greenfield-first)",
    );
  });

  test("unowned + --force --yes (noninteractive): staged replacement, opaque 0600 .bak, journal intent+completion", () => {
    const f = makeFixture();
    const junk = "user-owned opencode config\n";
    write(join(f.config, "opencode.jsonc"), junk);
    const r = run(["init", "--force", "--yes"], env(f));
    assert.equal(r.status, 0, r.stderr);
    // live now carries the staged installed content; the old bytes are preserved
    assert.notEqual(
      readFileSync(join(f.config, "opencode.jsonc"), "utf8"),
      junk,
    );
    // backup exists under state/backups/<runId>/<targetId>.bak with mode 0600
    const completion = ledgerLines(f.state).find(
      (l) =>
        l.phase === "completion" &&
        (l.target as { liveRel: string })?.liveRel === "opencode.jsonc",
    ) as Record<string, unknown> | undefined;
    assert.ok(completion, "replacement completion journaled");
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
    // intent journaled BEFORE the change; completion after; same backupRef
    const intent = ledgerLines(f.state).find(
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
    assert.ok(
      (intent.target as { liveHashBefore: string }).liveHashBefore,
      "intent records the pre-change live hash",
    );
    // run summary records the per-target decision
    const target = (
      runSummary(f).targets as { liveRel: string; action: string }[]
    ).find((t) => t.liveRel === "opencode.jsonc");
    assert.equal(target?.action, "replaced");
  });

  test("unowned + --force without --yes (noninteractive) refuses; --yes alone refuses", () => {
    const f = makeFixture();
    write(join(f.config, "opencode.jsonc"), "user-owned\n");
    const force = run(["init", "--force"], env(f));
    assert.equal(force.status, 1);
    assert.ok(
      force.stderr.includes("opencode.jsonc"),
      "no --force --yes pair refuses",
    );
    assert.equal(
      existsSync(join(f.state, "backups")),
      false,
      "no backup created",
    );
    const yes = run(["init", "--yes"], env(f));
    assert.equal(yes.status, 1);
    assert.ok(
      yes.stderr.includes("opencode.jsonc"),
      "--yes alone never permits",
    );
    assert.equal(
      readFileSync(join(f.config, "opencode.jsonc"), "utf8"),
      "user-owned\n",
    );
  });

  test("interactive --force requires confirmation: 'n' declines, 'y' replaces", () => {
    const f = makeFixture();
    write(join(f.config, "opencode.jsonc"), "user-owned\n");
    const tty = env(f, { WEAVELOG_TTY: "1" });
    const decline = run(["init", "--force"], tty, "n\n");
    assert.equal(decline.status, 1);
    assert.ok(
      decline.stdout.includes("opencode.jsonc"),
      "prompt names the target",
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
    const accept = run(["init", "--force"], tty, "y\n");
    assert.equal(accept.status, 0, accept.stderr);
    assert.notEqual(
      readFileSync(join(f.config, "opencode.jsonc"), "utf8"),
      "user-owned\n",
    );
  });

  test("symlink target refuses even with --force --yes (lstat-only)", () => {
    const f = makeFixture();
    const targetFile = join(f.config, "somewhere", "else.jsonc");
    write(targetFile, "{}\n");
    symlinkSync(targetFile, join(f.config, "opencode.jsonc"));
    const r = run(["init", "--force", "--yes"], env(f));
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

  test("skills are never force-replaced: unowned skill file refuses even with --force --yes", () => {
    const f = makeFixture();
    const junk = "personal skill copy\n";
    write(join(f.skills, "as-tdd", "SKILL.md"), junk);
    const r = run(["init", "--force", "--yes"], env(f));
    assert.equal(r.status, 1);
    assert.ok(r.stderr.includes("as-tdd"), "refusal names the skill target");
    assert.equal(
      readFileSync(join(f.skills, "as-tdd", "SKILL.md"), "utf8"),
      junk,
    );
    assert.equal(
      existsSync(join(f.state, "backups")),
      false,
      "no backup for a refused skill",
    );
  });

  test("snapshot + active-profile ownership records written for created targets", () => {
    const f = makeFixture();
    assert.equal(run(["init"], env(f)).status, 0);
    const materialize = join(f.state, "materialize", "opencode");
    const targetIds = readdirSync(materialize);
    assert.ok(targetIds.length > 0, "per-target state dirs exist");
    for (const targetId of targetIds) {
      assert.match(
        targetId,
        /^[0-9a-f]{64}$/,
        "target dirs are opaque sha256 digests",
      );
      assert.ok(
        existsSync(join(materialize, targetId, "active-profile")),
        `${targetId} has an active-profile receipt`,
      );
      const snapshots = walkFiles(join(materialize, targetId, "snapshots"));
      assert.ok(
        snapshots.length > 0,
        `${targetId} has immutable render snapshots`,
      );
      for (const snap of snapshots) {
        const content = readFileSync(snap, "utf8");
        assert.ok(
          !content.includes(f.home),
          "snapshot never contains the raw home path",
        );
      }
    }
  });

  test("no raw home path in any state file (ledger, materialize, backups)", () => {
    const f = makeFixture();
    assert.equal(run(["init"], env(f)).status, 0);
    // force a replacement so backups exist too
    write(join(f.config, "opencode.jsonc"), "junk\n");
    const r = run(["init", "--force", "--yes"], env(f));
    assert.equal(r.status, 0, r.stderr);
    const files = walkFiles(f.state);
    assert.ok(files.length > 0, "state files exist");
    for (const file of files) {
      const content = readFileSync(file, "utf8");
      assert.ok(
        !content.includes(f.home),
        `${file} contains the raw home path`,
      );
    }
  });

  test("interrupted replacement: dangling intent refuses the next run, recovery not automatic", () => {
    const f = makeFixture();
    const first = run(["init"], env(f));
    assert.equal(first.status, 0, first.stderr);
    // simulate a crash between journal intent and completion for AGENTS.md
    const targetId = targetIdOf(join(f.config, "AGENTS.md"));
    appendFileSync(
      join(f.state, "ledger.jsonl"),
      `${JSON.stringify({
        ts: new Date().toISOString(),
        command: "init",
        runId: "crashed-run",
        phase: "intent",
        target: {
          targetId,
          liveRel: "AGENTS.md",
          action: "replaced",
          backupRef: "crashed-run/stale.bak",
          liveHashBefore: "deadbeef",
        },
      })}\n`,
    );
    const r = run(["init"], env(f));
    assert.equal(r.status, 1);
    assert.match(r.stderr, /interrupted replacement/);
  });

  test("symlinked config root is refused, nothing written through it", () => {
    const f = makeFixture();
    const outside = join(f.dir, "outside");
    mkdirSync(outside, { recursive: true });
    mkdirSync(join(f.home, ".config"), { recursive: true });
    symlinkSync(outside, f.config); // home/.config/opencode -> outside
    const r = run(["init"], env(f));
    assert.equal(r.status, 1, r.stderr);
    assert.match(r.stderr, /symlinked managed parent/);
    assert.equal(
      readdirSync(outside).length,
      0,
      "nothing written through the symlinked root",
    );
    assert.equal(
      existsSync(join(f.config, "AGENTS.md")),
      false,
      "no AGENTS.md through the symlink",
    );
    // all-or-nothing: skills targets under their own root are refused too
    assert.equal(
      existsSync(join(f.skills, "as-tdd")),
      false,
      "no skills written either",
    );
    // preflight refusals happen before phase A: only the run's ledger line lands
    assert.equal(existsSync(join(f.state, "backups")), false, "no backups dir");
    assert.equal(
      existsSync(join(f.state, "materialize")),
      false,
      "no ownership state dir",
    );
    assert.equal(runSummary(f).exitCode, 1);
  });

  test("symlinked skills root is refused, config targets untouched", () => {
    const f = makeFixture();
    const outside = join(f.dir, "outside2");
    mkdirSync(outside, { recursive: true });
    mkdirSync(join(f.home, ".agents"), { recursive: true });
    symlinkSync(outside, f.skills); // home/.agents/skills -> outside2
    const r = run(["init"], env(f));
    assert.equal(r.status, 1, r.stderr);
    assert.match(r.stderr, /symlinked managed parent/);
    assert.equal(
      readdirSync(outside).length,
      0,
      "nothing copied through the symlinked skills root",
    );
    assert.equal(
      existsSync(join(f.config, "AGENTS.md")),
      false,
      "all-or-nothing: no config target created either",
    );
    assert.equal(
      existsSync(join(f.state, "materialize")),
      false,
      "no ownership state write",
    );
    assert.equal(runSummary(f).exitCode, 1);
  });

  test("symlinked intermediate dir under the config root is refused", () => {
    const f = makeFixture();
    const outside = join(f.dir, "outside3");
    mkdirSync(outside, { recursive: true });
    mkdirSync(f.config, { recursive: true });
    symlinkSync(outside, join(f.config, "agents"));
    const r = run(["init"], env(f));
    assert.equal(r.status, 1, r.stderr);
    assert.match(r.stderr, /symlinked managed parent/);
    assert.equal(
      readdirSync(outside).length,
      0,
      "nothing written into the symlinked agents/ dir",
    );
    assert.equal(
      existsSync(join(f.config, "AGENTS.md")),
      false,
      "whole-run refusal leaves the rest of the config untouched",
    );
  });

  test("interrupted replacement with absent target refuses (no silent create)", () => {
    const f = makeFixture();
    assert.equal(run(["init"], env(f)).status, 0);
    const targetId = targetIdOf(join(f.config, "AGENTS.md"));
    appendFileSync(
      join(f.state, "ledger.jsonl"),
      `${JSON.stringify({
        ts: new Date().toISOString(),
        command: "init",
        runId: "crashed-run",
        phase: "intent",
        target: {
          targetId,
          liveRel: "AGENTS.md",
          action: "replaced",
          backupRef: "crashed-run/stale.bak",
          liveHashBefore: "deadbeef",
        },
      })}\n`,
    );
    // crash after the .bak move: the target is gone, only the intent remains
    rmSync(join(f.config, "AGENTS.md"), { force: true });
    const r = run(["init"], env(f));
    assert.equal(r.status, 1, r.stderr);
    assert.match(r.stderr, /interrupted replacement/);
    assert.equal(
      existsSync(join(f.config, "AGENTS.md")),
      false,
      "absent target with a dangling intent is never silently re-created",
    );
  });

  test("interrupted target refuses even with --force --yes", () => {
    const f = makeFixture();
    assert.equal(run(["init"], env(f)).status, 0);
    const targetId = targetIdOf(join(f.config, "AGENTS.md"));
    appendFileSync(
      join(f.state, "ledger.jsonl"),
      `${JSON.stringify({
        ts: new Date().toISOString(),
        command: "init",
        runId: "crashed-run",
        phase: "intent",
        target: {
          targetId,
          liveRel: "AGENTS.md",
          action: "replaced",
          backupRef: "crashed-run/stale.bak",
          liveHashBefore: "deadbeef",
        },
      })}\n`,
    );
    const r = run(["init", "--force", "--yes"], env(f));
    assert.equal(r.status, 1, r.stderr);
    assert.match(r.stderr, /interrupted replacement/);
  });

  test("rollback round-trip: intent + rollback receipt leaves the target owned+recorded (update path)", () => {
    const f = makeFixture();
    assert.equal(run(["init"], env(f)).status, 0);
    const agentsPath = join(f.config, "AGENTS.md");
    const targetId = targetIdOf(agentsPath);
    const liveHash = createHash("sha256")
      .update(readFileSync(agentsPath))
      .digest("hex");
    const journalLine = (
      phase: "intent" | "rollback",
      target: Record<string, unknown>,
    ) =>
      `${JSON.stringify({
        ts: new Date().toISOString(),
        command: "init",
        runId: "rolled-back-run",
        phase,
        target: { targetId, liveRel: "AGENTS.md", ...target },
      })}\n`;
    const ledger = join(f.state, "ledger.jsonl");
    appendFileSync(
      ledger,
      journalLine("intent", {
        action: "replaced",
        backupRef: "rolled-back-run/x.bak",
        liveHashBefore: liveHash,
      }),
    );
    appendFileSync(
      ledger,
      journalLine("rollback", {
        action: "rollback",
        backupRef: "rolled-back-run/x.bak",
        // the restored bytes ARE the pre-replace live bytes — the receipt the
        // CLI writes on a safe rollback
        stateHash: liveHash,
      }),
    );
    // the journal ends in the rollback state: owned + recorded -> update;
    // --force --yes is never consulted (the update branch comes first)
    const r = run(["init", "--force", "--yes"], env(f));
    assert.equal(r.status, 0, r.stderr);
    assert.ok(
      !r.stderr.includes("interrupted replacement"),
      "no interruption refusal after a completed rollback",
    );
    const targets = runSummary(f).targets as {
      liveRel: string;
      action: string;
    }[];
    assert.equal(
      targets.find((t) => t.liveRel === "AGENTS.md")?.action,
      "update",
      "rolled-back target updates instead of refusing or replacing",
    );
  });

  test("corrupt active-profile receipt refuses at the CLI level", () => {
    const f = makeFixture();
    assert.equal(run(["init"], env(f)).status, 0);
    const targetId = targetIdOf(join(f.config, "AGENTS.md"));
    const receipt = join(
      f.state,
      "materialize",
      "opencode",
      targetId,
      "active-profile",
    );
    assert.ok(existsSync(receipt), "receipt exists after init");
    writeFileSync(receipt, "{ not valid json\n");
    const r = run(["init"], env(f));
    assert.equal(r.status, 1, r.stderr);
    assert.match(r.stderr, /ownership state ambiguous/);
  });
});
