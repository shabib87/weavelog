import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import {
  cpSync,
  existsSync,
  mkdirSync,
  readFileSync,
  rmSync,
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
  opts: { env?: Record<string, string> } = {},
): RunResult {
  return spawnSync(process.execPath, ["--import", TSX_LOADER, CLI, ...args], {
    encoding: "utf8",
    timeout: 120_000,
    env: { ...process.env, ...opts.env },
  });
}

const created: string[] = [];
afterEach(() => {
  for (const dir of created.splice(0))
    rmSync(dir, { recursive: true, force: true });
});

let n = 0;
function makeDir(prefix: string): string {
  const dir = join(
    tmpdir(),
    `weavelog-install-guard-${prefix}-${Date.now()}-${n++}`,
  );
  mkdirSync(dir, { recursive: true });
  created.push(dir);
  return dir;
}

function write(path: string, content: string): void {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, content);
}

/** Fake installed weavelog package: package.json, dist/cli/index.js (exists), payload/. */
function makeFakeInstall(
  dir: string,
  payloadFiles: Record<string, string>,
): string {
  write(
    join(dir, "package.json"),
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
  write(join(dir, "dist", "cli", "index.js"), "#!/usr/bin/env node\n");
  for (const [rel, content] of Object.entries(payloadFiles)) {
    write(join(dir, "payload", rel), content);
  }
  return dir;
}

function lastLedgerLine(stateDir: string): Record<string, unknown> {
  const ledger = readFileSync(join(stateDir, "ledger.jsonl"), "utf8")
    .trim()
    .split("\n");
  return JSON.parse(ledger[ledger.length - 1]);
}

describe("cli install guard (AC #6)", () => {
  test("sync run report records resolvedPackageRoot and resolvedBinPath", () => {
    const dir = makeDir("sync-report");
    const config = join(dir, "config");
    const state = join(dir, "state");
    const emptyPath = join(dir, "empty-path");
    mkdirSync(emptyPath, { recursive: true });
    const env = {
      WEAVELOG_CONFIG_HOME: config,
      WEAVELOG_STATE_DIR: state,
      PATH: emptyPath,
    };
    const r = run(["sync"], { env });
    assert.equal(r.status, 0);
    const report = JSON.parse(r.stdout);
    assert.equal(report.resolvedPackageRoot, REPO);
    assert.equal(report.resolvedBinPath, join(REPO, "dist", "cli", "index.js"));
  });

  test("sync refuses before materializing when another install shadows the resolved bin on PATH", () => {
    const dir = makeDir("shadow");
    const config = join(dir, "config");
    const state = join(dir, "state");
    const running = makeFakeInstall(join(dir, "running"), {
      "AGENTS.md": "# fresh payload\n",
    });
    const shadowPkg = join(dir, "shadow-pkg");
    write(
      join(shadowPkg, "package.json"),
      JSON.stringify({ name: "weavelog", version: "0.1.0" }, null, 2),
    );
    const shadowBin = join(shadowPkg, "bin");
    write(join(shadowBin, "weavelog"), "#!/usr/bin/env node\n");
    const env = {
      WEAVELOG_CONFIG_HOME: config,
      WEAVELOG_STATE_DIR: state,
      WEAVELOG_PACKAGE_ROOT: running,
      PATH: shadowBin,
    };
    const r = run(["sync"], { env });
    assert.equal(r.status, 1);
    assert.ok(r.stderr.includes("shadow"), r.stderr);
    assert.equal(
      existsSync(join(config, "opencode.jsonc")),
      false,
      "nothing materialized before the refusal",
    );
  });

  test("sync refuses when the installed payload differs from the repo payload being materialized", () => {
    const dir = makeDir("stale");
    const config = join(dir, "config");
    const state = join(dir, "state");
    const running = makeFakeInstall(join(dir, "running"), {
      "AGENTS.md": "# stale installed payload\n",
    });
    const clean = makeDir("clean");
    const env = {
      WEAVELOG_CONFIG_HOME: config,
      WEAVELOG_STATE_DIR: state,
      WEAVELOG_PACKAGE_ROOT: running,
      PATH: clean,
    };
    const r = run(["sync"], { env });
    assert.equal(r.status, 1);
    assert.ok(
      r.stderr.includes("rebuild") || r.stderr.includes("reinstall"),
      r.stderr,
    );
    assert.equal(
      existsSync(join(config, "opencode.jsonc")),
      false,
      "nothing materialized before the refusal",
    );
  });

  test("init records the same report fields and does not refuse a consistent installed package", () => {
    const dir = makeDir("init-ok");
    const live = join(dir, "live");
    const config = join(dir, "config");
    const state = join(dir, "state");
    const running = join(dir, "installed");
    mkdirSync(running, { recursive: true });
    cpSync(join(REPO, "payload"), join(running, "payload"), {
      recursive: true,
    });
    write(
      join(running, "package.json"),
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
    write(join(running, "dist", "cli", "index.js"), "#!/usr/bin/env node\n");
    const clean = makeDir("clean");
    const env = {
      HOME: dir,
      WEAVELOG_LIVE_ROOT: live,
      WEAVELOG_CONFIG_HOME: config,
      WEAVELOG_STATE_DIR: state,
      WEAVELOG_PACKAGE_ROOT: running,
      PATH: clean,
    };
    const r = run(["init"], { env });
    assert.equal(r.status, 0);
    const ledger = lastLedgerLine(state);
    assert.equal(ledger.command, "init");
    assert.equal(ledger.resolvedPackageRoot, "~/installed");
    assert.equal(ledger.resolvedBinPath, "~/installed/dist/cli/index.js");
  });
});
