import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  chmodSync,
  existsSync,
  lstatSync,
  mkdirSync,
  readFileSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { afterEach, describe, test } from "node:test";
import { fileURLToPath } from "node:url";

const BIN = fileURLToPath(
  new URL("../src/tools/config-sync.ts", import.meta.url),
);

const created: string[] = [];
afterEach(() => {
  for (const dir of created.splice(0))
    rmSync(dir, { recursive: true, force: true });
});

let n = 0;
function makeDir(prefix: string): string {
  const dir = join(tmpdir(), `config-sync-test-${prefix}-${Date.now()}-${n++}`);
  mkdirSync(dir, { recursive: true });
  created.push(dir);
  return dir;
}

function sha256(text: string): string {
  return createHash("sha256").update(text).digest("hex");
}

/**
 * Manifest in the production shape: trackedRoot "." with repo-relative tracked
 * paths (AGENTS.md at the repo root, the rest under config/) — live AGENTS.md
 * maps DIRECTLY to tracked "AGENTS.md" (no per-harness duplicate).
 */
function harnessManifest(
  liveRoot: string,
  extraFiles: Record<string, string> = {},
): string {
  return `${JSON.stringify(
    {
      version: 1,
      harness: "opencode",
      liveRoot,
      trackedRoot: ".",
      files: {
        "AGENTS.md": "AGENTS.md",
        "agents/a.md": "config/agents/a.md",
        "opencode.jsonc": "config/opencode.jsonc",
        ...extraFiles,
      },
      exclusions: ["secrets/", "node_modules/"],
      pluginsDeferral: true,
    },
    null,
    2,
  )}\n`;
}

interface Fixture {
  dir: string;
  trackedRoot: string;
  liveRoot: string;
  harnessPath: string;
  statePath: string;
}

function makeFixture(
  opts: {
    trackedFiles?: Record<string, string>;
    liveFiles?: Record<string, string>;
    extraManifestFiles?: Record<string, string>;
    stateContent?: string;
  } = {},
): Fixture {
  const dir = makeDir("fx");
  const trackedRoot = join(dir, "tracked");
  const liveRoot = join(dir, "live");
  mkdirSync(join(trackedRoot, "config", "agents"), { recursive: true });
  mkdirSync(join(liveRoot, "agents"), { recursive: true });
  const harnessPath = join(dir, "harness.json");
  writeFileSync(
    harnessPath,
    harnessManifest(liveRoot, opts.extraManifestFiles),
  );
  for (const [rel, content] of Object.entries(opts.trackedFiles ?? {})) {
    writeFileSync(join(trackedRoot, rel), content);
  }
  for (const [rel, content] of Object.entries(opts.liveFiles ?? {})) {
    writeFileSync(join(liveRoot, rel), content);
  }
  const statePath = join(dir, "state", "config-materialize.json");
  if (opts.stateContent !== undefined) {
    mkdirSync(join(dir, "state"), { recursive: true });
    writeFileSync(statePath, opts.stateContent);
  }
  return { dir, trackedRoot, liveRoot, harnessPath, statePath };
}

function stateFiles(statePath: string): Record<string, string> {
  return JSON.parse(readFileSync(statePath, "utf8")).files;
}

interface RunResult {
  status: number | null;
  stdout: string;
  stderr: string;
}

function run(args: string[], env: Record<string, string> = {}): RunResult {
  return spawnSync(process.execPath, ["--import", "tsx", BIN, ...args], {
    encoding: "utf8",
    timeout: 60_000,
    env: { ...process.env, ...env },
  });
}

function syncRun(f: Fixture, extra: string[] = []): RunResult {
  return run([
    "--tracked-root",
    f.trackedRoot,
    "--live-root",
    f.liveRoot,
    "--harness-manifest",
    f.harnessPath,
    "--state",
    f.statePath,
    ...extra,
  ]);
}

const FAT = "# Global Agent Protocol\n\n(fat content)\n";
const THIN = "# Global Agent Protocol\n\n(thin content)\n";

describe("config-sync (--help)", () => {
  test("--help exits 0 and documents flags, exit codes, manifest + hash semantics", () => {
    const r = run(["--help"]);
    assert.equal(r.status, 0);
    assert.ok(r.stdout.includes("Usage: bun config-sync.ts"));
    for (const flag of [
      "--force",
      "--adopt",
      "--tracked-root",
      "--live-root",
      "--harness-manifest",
      "--state",
    ]) {
      assert.ok(r.stdout.includes(flag));
    }
    // exit code contract
    assert.ok(r.stdout.includes("ok/skip"));
    assert.ok(r.stdout.includes("drift/refusal/conflict"));
    assert.ok(r.stdout.includes("usage error"));
    // hash semantics: hash of the bytes written to live (AC #12)
    assert.ok(r.stdout.includes("bytes written to live"));
  });
});

describe("config-sync (first-run adoption, AC #3)", () => {
  test("no state, tracked==live everywhere: baseline recorded, all skip, live untouched", () => {
    const f = makeFixture({
      trackedFiles: {
        "AGENTS.md": FAT,
        "config/agents/a.md": "agent a\n",
        "config/opencode.jsonc": "{}\n",
      },
      liveFiles: {
        "AGENTS.md": FAT,
        "agents/a.md": "agent a\n",
        "opencode.jsonc": "{}\n",
      },
    });
    const r = syncRun(f);
    assert.equal(r.status, 0);
    const report = JSON.parse(r.stdout);
    assert.equal(report.mode, "config-sync");
    assert.equal(report.adoptedBaseline, true);
    assert.equal(report.exitCode, 0);
    assert.deepEqual(report.refusals, []);
    assert.equal(report.files["AGENTS.md"].action, "skip");
    // baseline records live hashes, keyed by LIVE-relative path
    const files = stateFiles(f.statePath);
    assert.equal(files["AGENTS.md"], sha256(FAT));
    assert.equal(files["agents/a.md"], sha256("agent a\n"));
    assert.equal(files["opencode.jsonc"], sha256("{}\n"));
    // live is untouched: same bytes as before
    assert.equal(readFileSync(join(f.liveRoot, "AGENTS.md"), "utf8"), FAT);
  });

  test("no state, tracked AGENTS.md differs from live: baseline adopted, copy branch fires", () => {
    const f = makeFixture({
      trackedFiles: {
        "AGENTS.md": THIN,
        "config/agents/a.md": "agent a\n",
        "config/opencode.jsonc": "{}\n",
      },
      liveFiles: {
        "AGENTS.md": FAT,
        "agents/a.md": "agent a\n",
        "opencode.jsonc": "{}\n",
      },
    });
    const r = syncRun(f);
    assert.equal(r.status, 0);
    const report = JSON.parse(r.stdout);
    assert.equal(report.adoptedBaseline, true);
    assert.equal(report.files["AGENTS.md"].action, "copy");
    assert.equal(report.files["agents/a.md"].action, "skip");
    // live now holds the tracked bytes; manifest records the hash of what was written
    assert.equal(readFileSync(join(f.liveRoot, "AGENTS.md"), "utf8"), THIN);
    assert.equal(stateFiles(f.statePath)["AGENTS.md"], sha256(THIN));
  });

  test("second run after adoption: everything skip, adoptedBaseline false, state stable", () => {
    const f = makeFixture({
      trackedFiles: {
        "AGENTS.md": THIN,
        "config/agents/a.md": "agent a\n",
        "config/opencode.jsonc": "{}\n",
      },
      liveFiles: {
        "AGENTS.md": THIN,
        "agents/a.md": "agent a\n",
        "opencode.jsonc": "{}\n",
      },
    });
    assert.equal(syncRun(f).status, 0);
    const before = readFileSync(f.statePath, "utf8");
    const r2 = syncRun(f);
    assert.equal(r2.status, 0);
    const report = JSON.parse(r2.stdout);
    assert.equal(report.adoptedBaseline, false);
    assert.equal(report.files["AGENTS.md"].action, "skip");
    assert.equal(report.files["agents/a.md"].action, "skip");
    assert.equal(readFileSync(f.statePath, "utf8"), before);
  });
});

describe("config-sync (four branches per file, AC #2)", () => {
  test("tracked edited (tracked!=manifest, live==manifest): copy tracked -> live", () => {
    const f = makeFixture({
      trackedFiles: {
        "AGENTS.md": THIN,
        "config/agents/a.md": "agent a\n",
        "config/opencode.jsonc": "{}\n",
      },
      liveFiles: {
        "AGENTS.md": THIN,
        "agents/a.md": "agent a\n",
        "opencode.jsonc": "{}\n",
      },
    });
    assert.equal(syncRun(f).status, 0); // baseline
    writeFileSync(join(f.trackedRoot, "AGENTS.md"), `${THIN}edited\n`);
    const r = syncRun(f);
    assert.equal(r.status, 0);
    const report = JSON.parse(r.stdout);
    assert.equal(report.files["AGENTS.md"].action, "copy");
    assert.equal(
      readFileSync(join(f.liveRoot, "AGENTS.md"), "utf8"),
      `${THIN}edited\n`,
    );
    assert.equal(
      stateFiles(f.statePath)["AGENTS.md"],
      sha256(`${THIN}edited\n`),
    );
  });

  test("live edited (live!=manifest, tracked==manifest): refuse, name file + both fixes", () => {
    const f = makeFixture({
      trackedFiles: {
        "AGENTS.md": THIN,
        "config/agents/a.md": "agent a\n",
        "config/opencode.jsonc": "{}\n",
      },
      liveFiles: {
        "AGENTS.md": THIN,
        "agents/a.md": "agent a\n",
        "opencode.jsonc": "{}\n",
      },
    });
    assert.equal(syncRun(f).status, 0);
    writeFileSync(join(f.liveRoot, "AGENTS.md"), `${THIN}local-edit\n`);
    const r = syncRun(f);
    assert.equal(r.status, 1);
    const report = JSON.parse(r.stdout);
    assert.equal(report.exitCode, 1);
    assert.equal(report.files["AGENTS.md"].action, "local-edit");
    const refusal = report.refusals.find(
      (x: { file: string }) => x.file === "AGENTS.md",
    );
    assert.ok(refusal);
    assert.ok(refusal.fix.includes("--adopt"));
    assert.ok(refusal.fix.includes("--force"));
    // nothing mutated
    assert.equal(
      readFileSync(join(f.liveRoot, "AGENTS.md"), "utf8"),
      `${THIN}local-edit\n`,
    );
    assert.equal(readFileSync(join(f.trackedRoot, "AGENTS.md"), "utf8"), THIN);
    assert.equal(stateFiles(f.statePath)["AGENTS.md"], sha256(THIN));
  });

  test("live edited + --force: overwrite live from repo, update manifest", () => {
    const f = makeFixture({
      trackedFiles: {
        "AGENTS.md": THIN,
        "config/agents/a.md": "agent a\n",
        "config/opencode.jsonc": "{}\n",
      },
      liveFiles: {
        "AGENTS.md": THIN,
        "agents/a.md": "agent a\n",
        "opencode.jsonc": "{}\n",
      },
    });
    assert.equal(syncRun(f).status, 0);
    writeFileSync(join(f.liveRoot, "AGENTS.md"), `${THIN}local-edit\n`);
    const r = syncRun(f, ["--force"]);
    assert.equal(r.status, 0);
    assert.equal(JSON.parse(r.stdout).files["AGENTS.md"].action, "force");
    assert.equal(readFileSync(join(f.liveRoot, "AGENTS.md"), "utf8"), THIN);
    assert.equal(stateFiles(f.statePath)["AGENTS.md"], sha256(THIN));
  });

  test("live edited + --adopt: copy live into repo, update manifest", () => {
    const f = makeFixture({
      trackedFiles: {
        "AGENTS.md": THIN,
        "config/agents/a.md": "agent a\n",
        "config/opencode.jsonc": "{}\n",
      },
      liveFiles: {
        "AGENTS.md": THIN,
        "agents/a.md": "agent a\n",
        "opencode.jsonc": "{}\n",
      },
    });
    assert.equal(syncRun(f).status, 0);
    const localEdit = `${THIN}local-edit\n`;
    writeFileSync(join(f.liveRoot, "AGENTS.md"), localEdit);
    const r = syncRun(f, ["--adopt"]);
    assert.equal(r.status, 0);
    assert.equal(JSON.parse(r.stdout).files["AGENTS.md"].action, "adopt");
    assert.equal(
      readFileSync(join(f.trackedRoot, "AGENTS.md"), "utf8"),
      localEdit,
    );
    // live unchanged, manifest now records the adopted live bytes
    assert.equal(
      readFileSync(join(f.liveRoot, "AGENTS.md"), "utf8"),
      localEdit,
    );
    assert.equal(stateFiles(f.statePath)["AGENTS.md"], sha256(localEdit));
  });

  test("both differ: conflict, refuse always, no flag rescues", () => {
    const f = makeFixture({
      trackedFiles: {
        "AGENTS.md": THIN,
        "config/agents/a.md": "agent a\n",
        "config/opencode.jsonc": "{}\n",
      },
      liveFiles: {
        "AGENTS.md": THIN,
        "agents/a.md": "agent a\n",
        "opencode.jsonc": "{}\n",
      },
    });
    assert.equal(syncRun(f).status, 0);
    writeFileSync(join(f.trackedRoot, "AGENTS.md"), `${THIN}tracked-change\n`);
    writeFileSync(join(f.liveRoot, "AGENTS.md"), `${THIN}live-change\n`);
    for (const extra of [
      [],
      ["--force"],
      ["--adopt"],
      ["--force", "--adopt"],
    ]) {
      const r = syncRun(f, extra);
      assert.equal(r.status, 1);
      const report = JSON.parse(r.stdout);
      assert.equal(report.files["AGENTS.md"].action, "conflict");
      assert.equal(
        report.refusals.some((x: { file: string }) => x.file === "AGENTS.md"),
        true,
      );
    }
    // no mutation in any case
    assert.equal(
      readFileSync(join(f.trackedRoot, "AGENTS.md"), "utf8"),
      `${THIN}tracked-change\n`,
    );
    assert.equal(
      readFileSync(join(f.liveRoot, "AGENTS.md"), "utf8"),
      `${THIN}live-change\n`,
    );
  });

  test("live file deleted (tracked==manifest): local-edit refusal; --force re-materializes", () => {
    const f = makeFixture({
      trackedFiles: {
        "AGENTS.md": THIN,
        "config/agents/a.md": "agent a\n",
        "config/opencode.jsonc": "{}\n",
      },
      liveFiles: {
        "AGENTS.md": THIN,
        "agents/a.md": "agent a\n",
        "opencode.jsonc": "{}\n",
      },
    });
    assert.equal(syncRun(f).status, 0);
    rmSync(join(f.liveRoot, "AGENTS.md"));
    const r = syncRun(f);
    assert.equal(r.status, 1);
    const report = JSON.parse(r.stdout);
    assert.equal(report.files["AGENTS.md"].action, "local-edit");
    assert.ok(report.refusals[0].fix.includes("--force"));
    // --adopt cannot rescue a deletion
    const radopt = syncRun(f, ["--adopt"]);
    assert.equal(radopt.status, 1);
    // --force re-materializes
    const rforce = syncRun(f, ["--force"]);
    assert.equal(rforce.status, 0);
    assert.equal(readFileSync(join(f.liveRoot, "AGENTS.md"), "utf8"), THIN);
    assert.equal(stateFiles(f.statePath)["AGENTS.md"], sha256(THIN));
  });
});

describe("config-sync (never deletes, exclusions, untracked live files)", () => {
  test("untracked live files (incl. secrets/ and node_modules/) survive a sync untouched", () => {
    const f = makeFixture({
      trackedFiles: {
        "AGENTS.md": THIN,
        "config/agents/a.md": "agent a\n",
        "config/opencode.jsonc": "{}\n",
      },
      liveFiles: {
        "AGENTS.md": THIN,
        "agents/a.md": "agent a\n",
        "opencode.jsonc": "{}\n",
      },
    });
    writeFileSync(join(f.liveRoot, "untracked.txt"), "keep me\n");
    mkdirSync(join(f.liveRoot, "secrets"), { recursive: true });
    writeFileSync(join(f.liveRoot, "secrets", "auth.json"), "secret\n");
    mkdirSync(join(f.liveRoot, "node_modules", "pkg"), { recursive: true });
    writeFileSync(
      join(f.liveRoot, "node_modules", "pkg", "index.js"),
      "module\n",
    );
    const r = syncRun(f);
    assert.equal(r.status, 0);
    assert.equal(
      readFileSync(join(f.liveRoot, "untracked.txt"), "utf8"),
      "keep me\n",
    );
    assert.equal(
      readFileSync(join(f.liveRoot, "secrets", "auth.json"), "utf8"),
      "secret\n",
    );
    assert.equal(
      readFileSync(join(f.liveRoot, "node_modules", "pkg", "index.js"), "utf8"),
      "module\n",
    );
  });

  test("manifest entry under an excluded prefix is refused, nothing mutated", () => {
    const f = makeFixture({
      trackedFiles: {
        "AGENTS.md": THIN,
        "config/agents/a.md": "agent a\n",
        "config/opencode.jsonc": "{}\n",
      },
      liveFiles: {
        "AGENTS.md": THIN,
        "agents/a.md": "agent a\n",
        "opencode.jsonc": "{}\n",
      },
      extraManifestFiles: { "secrets/leak.json": "secrets/leak.json" },
    });
    mkdirSync(join(f.liveRoot, "secrets"), { recursive: true });
    writeFileSync(join(f.liveRoot, "secrets", "leak.json"), "nope\n");
    const r = syncRun(f);
    assert.equal(r.status, 1);
    assert.equal(
      JSON.parse(r.stdout).refusals.some(
        (x: { file: string }) => x.file === "secrets/leak.json",
      ),
      true,
    );
    assert.equal(
      readFileSync(join(f.liveRoot, "secrets", "leak.json"), "utf8"),
      "nope\n",
    );
  });
});

describe("config-sync (manifest format, AC #4 + AC #12)", () => {
  test("state file is { version, updatedAt, files: { <live-relative>: sha256 } }", () => {
    const f = makeFixture({
      trackedFiles: {
        "AGENTS.md": THIN,
        "config/agents/a.md": "agent a\n",
        "config/opencode.jsonc": "{}\n",
      },
      liveFiles: {
        "AGENTS.md": THIN,
        "agents/a.md": "agent a\n",
        "opencode.jsonc": "{}\n",
      },
    });
    assert.equal(syncRun(f).status, 0);
    const state = JSON.parse(readFileSync(f.statePath, "utf8"));
    assert.equal(state.version, 1);
    assert.equal(typeof state.updatedAt, "string");
    assert.ok(state.files);
    // keyed by LIVE-relative path (AGENTS.md, not opencode-AGENTS.md)
    assert.equal(state.files["AGENTS.md"], sha256(THIN));
    assert.equal(state.files["agents/a.md"], sha256("agent a\n"));
    // hash equals sha256 of the bytes live holds (== bytes written to live)
    assert.equal(
      state.files["AGENTS.md"],
      createHash("sha256")
        .update(readFileSync(join(f.liveRoot, "AGENTS.md")))
        .digest("hex"),
    );
  });

  test("corrupt existing state file: exit 2 naming the state path", () => {
    const f = makeFixture({
      trackedFiles: { "AGENTS.md": THIN },
      liveFiles: { "AGENTS.md": THIN },
      stateContent: "{ corrupt\n",
    });
    const r = syncRun(f);
    assert.equal(r.status, 2);
    assert.ok(r.stderr.includes("config-materialize.json"));
  });
});

describe("config-sync (usage errors and missing files, exit codes)", () => {
  test("unknown flag exits 2 with the flag named", () => {
    const r = run(["--froce"]);
    assert.equal(r.status, 2);
    assert.ok(r.stderr.includes("--froce"));
  });

  test("--tracked-root with no value exits 2", () => {
    const r = run(["--tracked-root"]);
    assert.equal(r.status, 2);
    assert.ok(r.stderr.includes("--tracked-root"));
  });

  test("missing harness manifest exits 2 naming the path", () => {
    const f = makeFixture({
      trackedFiles: { "AGENTS.md": THIN },
      liveFiles: { "AGENTS.md": THIN },
    });
    rmSync(f.harnessPath);
    const r = syncRun(f);
    assert.equal(r.status, 2);
    assert.ok(r.stderr.includes("harness.json"));
  });

  test("unparseable harness manifest exits 2", () => {
    const f = makeFixture({
      trackedFiles: { "AGENTS.md": THIN },
      liveFiles: { "AGENTS.md": THIN },
    });
    writeFileSync(f.harnessPath, "{ not json\n");
    const r = syncRun(f);
    assert.equal(r.status, 2);
  });

  test("harness manifest with bad schema (version 2, no files) exits 2", () => {
    const f = makeFixture({
      trackedFiles: { "AGENTS.md": THIN },
      liveFiles: { "AGENTS.md": THIN },
    });
    writeFileSync(f.harnessPath, JSON.stringify({ version: 2, harness: "x" }));
    const r = syncRun(f);
    assert.equal(r.status, 2);
  });

  test("missing tracked file (live exists, baseline exists): exit 2 naming the tracked file", () => {
    const f = makeFixture({
      trackedFiles: {
        "AGENTS.md": THIN,
        "config/agents/a.md": "agent a\n",
        "config/opencode.jsonc": "{}\n",
      },
      liveFiles: {
        "AGENTS.md": THIN,
        "agents/a.md": "agent a\n",
        "opencode.jsonc": "{}\n",
      },
    });
    assert.equal(syncRun(f).status, 0);
    rmSync(join(f.trackedRoot, "AGENTS.md"));
    const r = syncRun(f);
    assert.equal(r.status, 2);
    assert.ok(r.stderr.includes("AGENTS.md"));
    // live untouched by the failure
    assert.equal(readFileSync(join(f.liveRoot, "AGENTS.md"), "utf8"), THIN);
  });

  test("no baseline + tracked exists + live missing: materialize (forward-only copy)", () => {
    const f = makeFixture({
      trackedFiles: {
        "AGENTS.md": THIN,
        "config/agents/a.md": "agent a\n",
        "config/opencode.jsonc": "{}\n",
      },
      liveFiles: { "agents/a.md": "agent a\n", "opencode.jsonc": "{}\n" }, // AGENTS.md never on live
    });
    const r = syncRun(f);
    assert.equal(r.status, 0);
    const report = JSON.parse(r.stdout);
    assert.equal(report.files["AGENTS.md"].action, "copy");
    assert.equal(readFileSync(join(f.liveRoot, "AGENTS.md"), "utf8"), THIN);
    assert.equal(stateFiles(f.statePath)["AGENTS.md"], sha256(THIN));
  });

  test("both tracked and live missing: skip, exit 0, no state entry", () => {
    const f = makeFixture({
      trackedFiles: { "AGENTS.md": THIN, "config/opencode.jsonc": "{}\n" },
      liveFiles: { "AGENTS.md": THIN, "opencode.jsonc": "{}\n" },
    });
    const r = syncRun(f);
    assert.equal(r.status, 0);
    assert.equal(JSON.parse(r.stdout).files["agents/a.md"].action, "skip");
    assert.equal(stateFiles(f.statePath)["agents/a.md"], undefined);
  });
});

// ---------------------------------------------------------------------------
// Reviewer fix round (TASK-23): crash recovery, path normalization, flag
// expansion, symlink safety, exclusion-aware adoption, escape messages
// ---------------------------------------------------------------------------

const IS_ROOT = typeof process.getuid === "function" && process.getuid() === 0;

describe("config-sync (crash recovery, AC review finding 1)", () => {
  test("partial-failure (later copy throws): state stays stale, re-run converges to skip, not conflict", {
    skip: IS_ROOT,
  }, () => {
    const f = makeFixture({
      trackedFiles: {
        "AGENTS.md": THIN,
        "config/agents/a.md": "agent a\n",
        "config/opencode.jsonc": "{}\n",
      },
      liveFiles: {
        "AGENTS.md": THIN,
        "agents/a.md": "agent a\n",
        "opencode.jsonc": "{}\n",
      },
    });
    assert.equal(syncRun(f).status, 0); // baseline
    // edit the FIRST manifest file (copied before the throw) and a LATER one
    const trackedEdit = `${THIN}tracked-edit\n`;
    writeFileSync(join(f.trackedRoot, "AGENTS.md"), trackedEdit);
    writeFileSync(
      join(f.trackedRoot, "config", "agents", "a.md"),
      "agent a edited\n",
    );
    // make the LATER live file read-only so its copy throws mid-run
    // (a read-only dir does NOT block writes to existing files on macOS)
    const blockedLive = join(f.liveRoot, "agents", "a.md");
    chmodSync(blockedLive, 0o444);
    try {
      const crash = syncRun(f);
      assert.notEqual(crash.status, 0);
    } finally {
      chmodSync(blockedLive, 0o644); // restore perms
    }
    // crash happened mid-apply: live got AGENTS.md but the state was never written
    assert.equal(
      readFileSync(join(f.liveRoot, "AGENTS.md"), "utf8"),
      trackedEdit,
    );
    assert.equal(stateFiles(f.statePath)["AGENTS.md"], sha256(THIN)); // stale baseline
    // state file is still valid JSON (atomic tmp+rename: no partial write landed)
    assert.doesNotThrow(() => JSON.parse(readFileSync(f.statePath, "utf8")));
    assert.equal(existsSync(`${f.statePath}.tmp`), false);
    // re-run with fixed perms: tracked==live -> skip (+ re-recorded), NOT conflict
    const r = syncRun(f);
    assert.equal(r.status, 0);
    const report = JSON.parse(r.stdout);
    assert.equal(report.files["AGENTS.md"].action, "skip");
    assert.equal(report.files["agents/a.md"].action, "copy");
    assert.equal(stateFiles(f.statePath)["AGENTS.md"], sha256(trackedEdit));
    assert.equal(
      stateFiles(f.statePath)["agents/a.md"],
      sha256("agent a edited\n"),
    );
    // atomic write leaves no tmp file behind
    assert.equal(existsSync(`${f.statePath}.tmp`), false);
  });

  test("tracked==live but manifest stale (crash recovery): skip AND manifest re-recorded", () => {
    const f = makeFixture({
      trackedFiles: {
        "AGENTS.md": THIN,
        "config/agents/a.md": "agent a\n",
        "config/opencode.jsonc": "{}\n",
      },
      liveFiles: {
        "AGENTS.md": THIN,
        "agents/a.md": "agent a\n",
        "opencode.jsonc": "{}\n",
      },
    });
    assert.equal(syncRun(f).status, 0); // baseline
    // simulate a crash: live was updated to match tracked, but the state was not written
    const trackedEdit = `${THIN}tracked-edit\n`;
    writeFileSync(join(f.trackedRoot, "AGENTS.md"), trackedEdit);
    writeFileSync(join(f.liveRoot, "AGENTS.md"), trackedEdit);
    const r = syncRun(f);
    assert.equal(r.status, 0);
    const report = JSON.parse(r.stdout);
    assert.equal(report.files["AGENTS.md"].action, "skip");
    assert.deepEqual(report.refusals, []);
    assert.equal(stateFiles(f.statePath)["AGENTS.md"], sha256(trackedEdit)); // manifest re-recorded
  });

  test("conflict refusal message names the state-file delete escape", () => {
    const f = makeFixture({
      trackedFiles: {
        "AGENTS.md": THIN,
        "config/agents/a.md": "agent a\n",
        "config/opencode.jsonc": "{}\n",
      },
      liveFiles: {
        "AGENTS.md": THIN,
        "agents/a.md": "agent a\n",
        "opencode.jsonc": "{}\n",
      },
    });
    assert.equal(syncRun(f).status, 0);
    writeFileSync(join(f.trackedRoot, "AGENTS.md"), `${THIN}tracked-change\n`);
    writeFileSync(join(f.liveRoot, "AGENTS.md"), `${THIN}live-change\n`);
    const r = syncRun(f);
    assert.equal(r.status, 1);
    const refusal = JSON.parse(r.stdout).refusals.find(
      (x: { file: string }) => x.file === "AGENTS.md",
    );
    assert.ok(refusal.fix.includes("state file"));
  });

  test("local-edit refusal message names the state-file delete escape", () => {
    const f = makeFixture({
      trackedFiles: {
        "AGENTS.md": THIN,
        "config/agents/a.md": "agent a\n",
        "config/opencode.jsonc": "{}\n",
      },
      liveFiles: {
        "AGENTS.md": THIN,
        "agents/a.md": "agent a\n",
        "opencode.jsonc": "{}\n",
      },
    });
    assert.equal(syncRun(f).status, 0);
    writeFileSync(join(f.liveRoot, "AGENTS.md"), `${THIN}local-edit\n`);
    const r = syncRun(f);
    assert.equal(r.status, 1);
    const refusal = JSON.parse(r.stdout).refusals.find(
      (x: { file: string }) => x.file === "AGENTS.md",
    );
    assert.ok(refusal.fix.includes("state file"));
  });
});

describe("config-sync (path normalization, AC review finding 2)", () => {
  test("traversal entry (../ escapes the root): exit 2, nothing written", () => {
    const f = makeFixture({
      trackedFiles: {
        "AGENTS.md": THIN,
        "config/agents/a.md": "agent a\n",
        "config/opencode.jsonc": "{}\n",
      },
      liveFiles: {
        "AGENTS.md": THIN,
        "agents/a.md": "agent a\n",
        "opencode.jsonc": "{}\n",
      },
      extraManifestFiles: { "../escape.txt": "../escape.txt" },
    });
    const r = syncRun(f);
    assert.equal(r.status, 2);
    assert.ok(r.stderr.includes("escapes"));
    assert.equal(existsSync(join(f.dir, "escape.txt")), false);
    assert.equal(existsSync(f.statePath), false); // refused before any state write
  });

  test("absolute rel in the manifest escapes the root: exit 2", () => {
    const f = makeFixture({
      trackedFiles: {
        "AGENTS.md": THIN,
        "config/agents/a.md": "agent a\n",
        "config/opencode.jsonc": "{}\n",
      },
      liveFiles: {
        "AGENTS.md": THIN,
        "agents/a.md": "agent a\n",
        "opencode.jsonc": "{}\n",
      },
      extraManifestFiles: { "/etc/passwd": "AGENTS.md" },
    });
    const r = syncRun(f);
    assert.equal(r.status, 2);
    assert.ok(r.stderr.includes("escapes"));
  });

  test("agents/../secrets/x normalizes to secrets/x and is excluded", () => {
    const f = makeFixture({
      trackedFiles: {
        "AGENTS.md": THIN,
        "config/agents/a.md": "agent a\n",
        "config/opencode.jsonc": "{}\n",
      },
      liveFiles: {
        "AGENTS.md": THIN,
        "agents/a.md": "agent a\n",
        "opencode.jsonc": "{}\n",
      },
      extraManifestFiles: {
        "agents/../secrets/x.json": "agents/../secrets/x.json",
      },
    });
    mkdirSync(join(f.liveRoot, "secrets"), { recursive: true });
    writeFileSync(join(f.liveRoot, "secrets", "x.json"), "nope\n");
    const r = syncRun(f);
    assert.equal(r.status, 1);
    const report = JSON.parse(r.stdout);
    assert.equal(
      report.refusals.some(
        (x: { file: string }) => x.file === "secrets/x.json",
      ),
      true,
    );
    assert.equal(
      readFileSync(join(f.liveRoot, "secrets", "x.json"), "utf8"),
      "nope\n",
    );
  });

  test("legit entries with ./ dot segments normalize and sync normally", () => {
    const f = makeFixture({
      trackedFiles: {
        "AGENTS.md": THIN,
        "config/agents/a.md": "agent a\n",
        "config/opencode.jsonc": "{}\n",
        "config/agents/b.md": "agent b\n",
      },
      liveFiles: {
        "AGENTS.md": THIN,
        "agents/a.md": "agent a\n",
        "opencode.jsonc": "{}\n",
        "agents/b.md": "agent b\n",
      },
      extraManifestFiles: { "agents/./b.md": "config/agents/./b.md" },
    });
    const r = syncRun(f);
    assert.equal(r.status, 0);
    const report = JSON.parse(r.stdout);
    assert.equal(report.files["agents/b.md"].action, "skip");
    assert.deepEqual(report.refusals, []);
  });
});

describe("config-sync (flag path expansion, AC review finding 3)", () => {
  test("~/... flag values expand via HOME (--harness-manifest, --live-root, --state)", () => {
    const fakeHome = makeDir("home");
    const trackedRoot = join(fakeHome, "tracked");
    mkdirSync(join(trackedRoot, "config", "agents"), { recursive: true });
    writeFileSync(join(trackedRoot, "AGENTS.md"), THIN);
    writeFileSync(join(trackedRoot, "config", "agents", "a.md"), "agent a\n");
    writeFileSync(join(trackedRoot, "config", "opencode.jsonc"), "{}\n");
    writeFileSync(
      join(fakeHome, "harness.json"),
      harnessManifest(join(fakeHome, "live")),
    );
    const r = run(
      [
        "--tracked-root",
        trackedRoot,
        "--live-root",
        "~/live",
        "--harness-manifest",
        "~/harness.json",
        "--state",
        "~/state/config-materialize.json",
      ],
      { HOME: fakeHome },
    );
    assert.equal(r.status, 0);
    const report = JSON.parse(r.stdout);
    assert.equal(report.liveRoot, join(fakeHome, "live"));
    assert.equal(
      report.state,
      join(fakeHome, "state", "config-materialize.json"),
    );
    assert.equal(existsSync(join(fakeHome, "live", "AGENTS.md")), true);
    assert.equal(existsSync(join(fakeHome, "live", "opencode.jsonc")), true);
    assert.equal(
      existsSync(join(fakeHome, "state", "config-materialize.json")),
      true,
    );
  });
});

describe("config-sync (symlink safety, AC review finding 4)", () => {
  test("symlinked live file: exit 2 refusal, nothing written through the link", () => {
    const f = makeFixture({
      trackedFiles: {
        "AGENTS.md": THIN,
        "config/agents/a.md": "agent a\n",
        "config/opencode.jsonc": "{}\n",
      },
      liveFiles: {
        "AGENTS.md": THIN,
        "agents/a.md": "agent a\n",
        "opencode.jsonc": "{}\n",
      },
    });
    assert.equal(syncRun(f).status, 0); // baseline
    const target = join(f.dir, "outside-target.md");
    writeFileSync(target, "outside\n");
    rmSync(join(f.liveRoot, "AGENTS.md"));
    symlinkSync(target, join(f.liveRoot, "AGENTS.md"));
    // a tracked edit would otherwise be written through the link
    writeFileSync(join(f.trackedRoot, "AGENTS.md"), `${THIN}edited\n`);
    const r = syncRun(f);
    assert.equal(r.status, 2);
    assert.ok(r.stderr.includes("symlink"));
    // no write through the link: target untouched, live still a link
    assert.equal(readFileSync(target, "utf8"), "outside\n");
    assert.equal(
      lstatSync(join(f.liveRoot, "AGENTS.md")).isSymbolicLink(),
      true,
    );
  });

  test("symlinked tracked file: exit 2 refusal", () => {
    const f = makeFixture({
      trackedFiles: {
        "AGENTS.md": THIN,
        "config/agents/a.md": "agent a\n",
        "config/opencode.jsonc": "{}\n",
      },
      liveFiles: {
        "AGENTS.md": THIN,
        "agents/a.md": "agent a\n",
        "opencode.jsonc": "{}\n",
      },
    });
    const target = join(f.dir, "outside-tracked.md");
    writeFileSync(target, "outside\n");
    rmSync(join(f.trackedRoot, "AGENTS.md"));
    symlinkSync(target, join(f.trackedRoot, "AGENTS.md"));
    const r = syncRun(f);
    assert.equal(r.status, 2);
    assert.ok(r.stderr.includes("symlink"));
  });
});

describe("config-sync (exclusion-aware adoption, AC review finding 5)", () => {
  test("first-run adoption skips excluded rels: refused entry has no baseline hash", () => {
    const f = makeFixture({
      trackedFiles: {
        "AGENTS.md": THIN,
        "config/agents/a.md": "agent a\n",
        "config/opencode.jsonc": "{}\n",
      },
      liveFiles: {
        "AGENTS.md": THIN,
        "agents/a.md": "agent a\n",
        "opencode.jsonc": "{}\n",
      },
      extraManifestFiles: { "secrets/leak.json": "secrets/leak.json" },
    });
    mkdirSync(join(f.liveRoot, "secrets"), { recursive: true });
    writeFileSync(join(f.liveRoot, "secrets", "leak.json"), "nope\n");
    const r = syncRun(f);
    assert.equal(r.status, 1);
    const report = JSON.parse(r.stdout);
    assert.equal(report.adoptedBaseline, true);
    const refused = report.files["secrets/leak.json"];
    assert.equal(refused.action, "refused");
    assert.equal(refused.manifestSha256, null); // adoption skipped it — no baseline recorded
  });
});

// ---------------------------------------------------------------------------
// trackedRoot "." alignment (TASK-23 AC #13): the DEFAULT tracked root is
// resolved from the manifest's trackedRoot against the REPO ROOT (the dir
// containing bin/) — not the script dir (bin/src/) and not the cwd. The
// fixture-based tests above always pass --tracked-root; this test exercises
// the default path config-sync uses in production.
// ---------------------------------------------------------------------------

describe("config-sync (default trackedRoot resolution, trackedRoot '.')", () => {
  test("default trackedRoot resolves '.' against the repo root; AGENTS.md at the repo root is found", () => {
    const dir = makeDir("default-root");
    const liveRoot = join(dir, "live");
    mkdirSync(liveRoot, { recursive: true });
    const statePath = join(dir, "state", "config-materialize.json");
    // repo root as config-sync computes it: the dir containing bin/ (bin/src/../..)
    const repoRoot = resolve(
      join(fileURLToPath(new URL("..", import.meta.url))),
    );
    const harness = join(dir, "harness.json");
    writeFileSync(
      harness,
      `${JSON.stringify(
        {
          version: 1,
          harness: "opencode",
          liveRoot,
          trackedRoot: ".",
          files: { "AGENTS.md": "AGENTS.md" },
          exclusions: ["secrets/", "node_modules/"],
          pluginsDeferral: true,
        },
        null,
        2,
      )}\n`,
    );
    // NO --tracked-root flag: the default resolution is under test
    const r = run([
      "--harness-manifest",
      harness,
      "--live-root",
      liveRoot,
      "--state",
      statePath,
    ]);
    assert.equal(r.status, 0);
    const report = JSON.parse(r.stdout);
    // "." resolves against the REPO ROOT (dir containing bin/), not bin/src/ or cwd
    assert.equal(report.trackedRoot, repoRoot);
    // containment accepts a path directly under "." — AGENTS.md at the repo root is found
    assert.equal(report.files["AGENTS.md"].action, "copy");
    assert.equal(
      readFileSync(join(liveRoot, "AGENTS.md"), "utf8"),
      readFileSync(join(repoRoot, "AGENTS.md"), "utf8"),
    );
  });
});
