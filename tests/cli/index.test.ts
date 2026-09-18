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
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, test } from "node:test";
import { fileURLToPath } from "node:url";

const CLI = fileURLToPath(new URL("../../src/cli/index.ts", import.meta.url));
const DIST = fileURLToPath(new URL("../../dist/cli/index.js", import.meta.url));
const REPO = fileURLToPath(new URL("../..", import.meta.url));
const TSX_LOADER = fileURLToPath(import.meta.resolve("tsx"));

interface RunResult {
  status: number | null;
  stdout: string;
  stderr: string;
}

function run(
  args: string[],
  opts: { env?: Record<string, string>; cwd?: string } = {},
): RunResult {
  return spawnSync(process.execPath, ["--import", TSX_LOADER, CLI, ...args], {
    encoding: "utf8",
    timeout: 120_000,
    env: { ...process.env, ...opts.env },
    cwd: opts.cwd,
  });
}

const created: string[] = [];
afterEach(() => {
  for (const dir of created.splice(0))
    rmSync(dir, { recursive: true, force: true });
});

let n = 0;
function makeDir(prefix: string): string {
  const dir = join(tmpdir(), `weavelog-cli-${prefix}-${Date.now()}-${n++}`);
  mkdirSync(dir, { recursive: true });
  created.push(dir);
  return dir;
}

function write(path: string, content: string): void {
  mkdirSync(join(path, ".."), { recursive: true });
  writeFileSync(path, content);
}

function lastLedgerLine(stateDir: string): Record<string, unknown> {
  const ledger = readFileSync(join(stateDir, "ledger.jsonl"), "utf8")
    .trim()
    .split("\n");
  return JSON.parse(ledger[ledger.length - 1]);
}

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

function versionEnv(dir: string): Record<string, string> {
  const bins = join(dir, "bins");
  mkdirSync(bins, { recursive: true });
  return {
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

const CHECK_PLIST = "com.weavelog.check.plist";

function fakePlist(path: string, nodePath: string): void {
  write(
    path,
    `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0"><dict>
<key>Label</key><string>com.weavelog.check</string>
<key>ProgramArguments</key>
<array>
<string>${nodePath}</string>
<string>${DIST}</string>
<string>check</string>
<string>--stack-only</string>
</array>
</dict></plist>
`,
  );
}

function initFixture(
  withDiagramDesign: boolean,
  extraLiveFiles: Record<string, string> = {},
): {
  dir: string;
  live: string;
  config: string;
  state: string;
} {
  const dir = makeDir("init");
  const live = join(dir, "live");
  const config = join(dir, "config");
  const state = join(dir, "state");
  mkdirSync(live, { recursive: true });
  for (const [rel, content] of Object.entries(extraLiveFiles)) {
    write(join(live, rel), content);
  }
  write(
    join(live, ".env"),
    `WEAVELOG_HOME=${live}\nWEAVELOG_CONFIG_HOME=${config}\n`,
  );
  if (withDiagramDesign) {
    mkdirSync(join(dir, "code", "diagram-design", "skills", "diagram-design"), {
      recursive: true,
    });
  }
  return { dir, live, config, state };
}

describe("cli (--help)", () => {
  for (const cmd of [
    "init",
    "sync",
    "update",
    "check",
    "doctor",
    "scaffold",
    "stats",
  ]) {
    test(`${cmd} --help exits 0 with usage text`, () => {
      const r = run([cmd, "--help"]);
      assert.equal(r.status, 0);
      assert.ok(r.stdout.includes("Usage"));
    });
  }
  test("bare --help exits 0 with the command list", () => {
    const r = run(["--help"]);
    assert.equal(r.status, 0);
    assert.ok(r.stdout.includes("init"));
    assert.ok(r.stdout.includes("scaffold"));
  });
});

describe("cli init", () => {
  test("materializes both managed OpenCode adapters from this installed package", () => {
    const f = initFixture(true);
    const r = run(["init"], {
      env: { WEAVELOG_LIVE_ROOT: f.live, WEAVELOG_STATE_DIR: f.state },
    });
    assert.equal(r.status, 0);
    for (const adapter of ["enforce", "verify-gate"]) {
      const adapterPath = join(f.config, "plugins", `${adapter}.ts`);
      assert.ok(existsSync(adapterPath), `${adapter} adapter materialized`);
      assert.ok(
        readFileSync(adapterPath, "utf8").includes(join(REPO, "dist", "hooks")),
        `${adapter} targets this installed package`,
      );
    }
  });

  test("materializes config + skills + AGENTS.md, resolves .env tokens, symlinks diagram-design, writes ledger", () => {
    const f = initFixture(true);
    const r = run(["init"], {
      env: { WEAVELOG_LIVE_ROOT: f.live, WEAVELOG_STATE_DIR: f.state },
    });
    assert.equal(r.status, 0);
    assert.ok(
      existsSync(join(f.config, "opencode.jsonc")),
      "opencode.jsonc materialized",
    );
    assert.ok(
      existsSync(join(f.config, "AGENTS.md")),
      "live AGENTS.md written",
    );
    assert.ok(
      existsSync(join(f.live, "skills", "as-tdd", "SKILL.md")),
      "skills materialized",
    );
    const researcher = readFileSync(
      join(f.config, "agents", "researcher.md"),
      "utf8",
    );
    assert.ok(
      researcher.includes(f.live),
      "WEAVELOG_HOME token resolved from .env",
    );
    const implementer = readFileSync(
      join(f.config, "agents", "implementer.md"),
      "utf8",
    );
    assert.ok(
      implementer.includes(f.config),
      "WEAVELOG_CONFIG_HOME token resolved from .env",
    );
    assert.ok(
      !researcher.includes("{{"),
      "no unresolved tokens in researcher.md",
    );
    assert.equal(
      lstatSync(join(f.live, "skills", "diagram-design")).isSymbolicLink(),
      true,
      "diagram-design symlink created when host target exists",
    );
    const entry = lastLedgerLine(f.state);
    assert.equal(entry.command, "init");
    assert.equal(entry.exitCode, 0);
    assert.ok(
      Array.isArray(entry.filesTouched) && entry.filesTouched.length > 0,
    );
    assert.ok(
      entry.filesTouched.some((p: string) => p.endsWith("opencode.jsonc")),
    );
    for (const key of [
      "ts",
      "command",
      "args",
      "filesTouched",
      "decisions",
      "errors",
      "exitCode",
    ]) {
      assert.ok(key in entry, `ledger line has ${key}`);
    }
  });

  test("re-init on a materialized live root is a no-op exit 0 (managed files unchanged)", () => {
    const f = initFixture(true);
    const env = { WEAVELOG_LIVE_ROOT: f.live, WEAVELOG_STATE_DIR: f.state };
    assert.equal(run(["init"], { env }).status, 0);
    const r2 = run(["init"], { env });
    assert.equal(r2.status, 0);
  });

  test("diagram-design symlink skipped with a warning when the host target is absent", () => {
    const f = initFixture(false);
    const r = run(["init"], {
      env: { WEAVELOG_LIVE_ROOT: f.live, WEAVELOG_STATE_DIR: f.state },
    });
    assert.equal(r.status, 0);
    assert.equal(existsSync(join(f.live, "skills", "diagram-design")), false);
    assert.ok(
      r.stdout.includes("diagram-design"),
      "skip condition recorded in output",
    );
    const entry = lastLedgerLine(f.state);
    assert.ok(
      entry.decisions.some((d: string) => d.includes("diagram-design")),
      "skip decision recorded in ledger",
    );
  });

  test("init refuses on an existing unversioned live file (non-zero + ledger), --force proceeds without deleting it", () => {
    const f = initFixture(false, { "notes.txt": "personal notes\n" });
    const env = { WEAVELOG_LIVE_ROOT: f.live, WEAVELOG_STATE_DIR: f.state };
    const r = run(["init"], { env });
    assert.equal(r.status, 3);
    assert.ok(
      (r.stdout + r.stderr).includes("notes.txt"),
      "refusal names the file",
    );
    assert.equal(lastLedgerLine(f.state).exitCode, 3);
    const force = run(["init", "--force"], { env });
    assert.equal(force.status, 0);
    assert.equal(
      readFileSync(join(f.live, "notes.txt"), "utf8"),
      "personal notes\n",
    );
    assert.ok(
      existsSync(join(f.config, "opencode.jsonc")),
      "forced init materialized config",
    );
  });
});

describe("cli sync", () => {
  test("first sync materializes repo payload to the live config dir; re-sync is a no-op exit 0", () => {
    const dir = makeDir("sync");
    const config = join(dir, "config");
    const state = join(dir, "state");
    const env = { WEAVELOG_CONFIG_HOME: config, WEAVELOG_STATE_DIR: state };
    const r = run(["sync"], { env });
    assert.equal(r.status, 0);
    assert.ok(
      existsSync(join(config, "opencode.jsonc")),
      "payload config materialized to live",
    );
    assert.ok(
      existsSync(join(config, "AGENTS.md")),
      "payload AGENTS.md materialized",
    );
    assert.equal(lastLedgerLine(state).command, "sync");
    assert.equal(lastLedgerLine(state).exitCode, 0);
    const r2 = run(["sync"], { env });
    assert.equal(r2.status, 0);
  });

  test("sync resolves template tokens from the live-root .env (AC#4 resolved-value assertions)", () => {
    const dir = makeDir("sync-resolved");
    const live = join(dir, "live");
    const config = join(dir, "config");
    const state = join(dir, "state");
    mkdirSync(live, { recursive: true });
    writeFileSync(
      join(live, ".env"),
      `WEAVELOG_HOME=${live}\nWEAVELOG_CONFIG_HOME=${config}\n`,
    );
    const r = run(["sync"], {
      env: {
        WEAVELOG_LIVE_ROOT: live,
        WEAVELOG_CONFIG_HOME: config,
        WEAVELOG_STATE_DIR: state,
      },
    });
    assert.equal(r.status, 0);
    const researcher = readFileSync(
      join(config, "agents", "researcher.md"),
      "utf8",
    );
    assert.ok(
      researcher.includes(`${live}/docs/research/**`),
      "WEAVELOG_HOME resolved from .env",
    );
    assert.ok(
      !researcher.includes("{{WEAVELOG_HOME}}"),
      "no raw tokens in materialized file",
    );
    const implementer = readFileSync(
      join(config, "agents", "implementer.md"),
      "utf8",
    );
    assert.ok(
      implementer.includes(config),
      "WEAVELOG_CONFIG_HOME resolved from .env",
    );
    const agents = readFileSync(join(config, "AGENTS.md"), "utf8");
    assert.ok(
      agents.includes("weavelog sync"),
      "AGENTS.md template materialized",
    );
  });
});

describe("cli doctor", () => {
  test("doctor fails loudly when required OpenCode adapters are absent", () => {
    const dir = makeDir("doctor-missing-adapters");
    const bins = versionEnv(dir);
    const env = {
      HOME: dir,
      WEAVELOG_LIVE_ROOT: join(dir, "live"),
      WEAVELOG_CONFIG_HOME: join(dir, "config"),
      WEAVELOG_STATE_DIR: join(dir, "state"),
      WEAVELOG_CHECK_PLIST: join(dir, "no-plist.plist"),
      WEAVELOG_SKILLS_DIR: join(dir, "skills"),
      ...bins,
    };
    const r = run(["doctor"], { env });
    assert.notEqual(r.status, 0);
    assert.match(r.stdout, /opencode\.adapters/);
    assert.match(r.stdout, /weavelog init/);
  });

  test("doctor on a clean fixture exits 0 (plist absent -> node-path guard skipped)", () => {
    const dir = makeDir("doctor");
    const bins = versionEnv(dir);
    const live = join(dir, "live");
    const config = join(dir, "config");
    const state = join(dir, "state");
    mkdirSync(live, { recursive: true });
    const env = {
      HOME: dir,
      WEAVELOG_LIVE_ROOT: live,
      WEAVELOG_CONFIG_HOME: config,
      WEAVELOG_STATE_DIR: state,
      WEAVELOG_CHECK_PLIST: join(dir, "no-plist.plist"),
      WEAVELOG_SKILLS_DIR: join(dir, "skills"),
      ...bins,
      // Absent headroom keeps proxy.health on its documented skip path instead
      // of a real localhost:8788 request that depends on the host machine.
      WEAVELOG_HEADROOM_BIN: join(dir, "no-headroom"),
    };
    // Required adapters are materialized by init, exactly as doctor's own
    // repair hint instructs, so the fixture reflects a real supported profile.
    const init = run(["init"], { env });
    assert.equal(init.status, 0, `init failed: ${init.stderr}`);
    const r = run(["doctor"], { env });
    assert.equal(r.status, 0);
    assert.match(r.stdout, /\[pass\] opencode\.adapters/);
    assert.match(r.stdout, /\[warn\] proxy\.health .*skipped/);
    assert.ok(r.stdout.includes("path-guard"), "guard subcheck reported");
  });

  test("doctor with a fake plist pinning a missing node path fails loudly", () => {
    const dir = makeDir("doctor-missing-node");
    const bins = versionEnv(dir);
    const missingNode = join(dir, "nvm", "node-missing", "bin", "node");
    fakePlist(join(dir, "Library", "LaunchAgents", CHECK_PLIST), missingNode);
    const env = {
      HOME: dir,
      WEAVELOG_LIVE_ROOT: join(dir, "live"),
      WEAVELOG_CONFIG_HOME: join(dir, "config"),
      WEAVELOG_STATE_DIR: join(dir, "state"),
      WEAVELOG_CHECK_PLIST: join(dir, "Library", "LaunchAgents", CHECK_PLIST),
      WEAVELOG_SKILLS_DIR: join(dir, "skills"),
      ...bins,
    };
    const r = run(["doctor"], { env });
    assert.notEqual(r.status, 0);
    assert.ok(
      (r.stdout + r.stderr).includes(missingNode),
      "loud message names the pinned node path",
    );
  });

  test("doctor with a fake plist pinning a valid current node path passes the guard", () => {
    const dir = makeDir("doctor-valid-node");
    const bins = versionEnv(dir);
    fakePlist(
      join(dir, "Library", "LaunchAgents", CHECK_PLIST),
      process.execPath,
    );
    const env = {
      HOME: dir,
      WEAVELOG_LIVE_ROOT: join(dir, "live"),
      WEAVELOG_CONFIG_HOME: join(dir, "config"),
      WEAVELOG_STATE_DIR: join(dir, "state"),
      WEAVELOG_CHECK_PLIST: join(dir, "Library", "LaunchAgents", CHECK_PLIST),
      WEAVELOG_SKILLS_DIR: join(dir, "skills"),
      ...bins,
      // Absent headroom keeps proxy.health on its documented skip path instead
      // of a real localhost:8788 request that depends on the host machine.
      WEAVELOG_HEADROOM_BIN: join(dir, "no-headroom"),
    };
    const init = run(["init"], { env });
    assert.equal(init.status, 0, `init failed: ${init.stderr}`);
    const r = run(["doctor"], { env });
    assert.equal(r.status, 0);
    assert.match(r.stdout, /\[pass\] opencode\.adapters/);
    assert.match(r.stdout, /\[warn\] proxy\.health .*skipped/);
  });
});

describe("cli check", () => {
  test("check --stack-only exits 0 on a fixture with matching pinned versions", () => {
    const dir = makeDir("check");
    const skills = join(dir, "skills");
    mkdirSync(join(skills, "diagram-design"), { recursive: true });
    const env = {
      HOME: dir,
      WEAVELOG_LIVE_ROOT: join(dir, "live"),
      WEAVELOG_STATE_DIR: join(dir, "state"),
      WEAVELOG_CHECK_PLIST: join(dir, "no-plist.plist"),
      WEAVELOG_SKILLS_DIR: skills,
      ...versionEnv(dir),
    };
    const init = run(["init"], { env });
    assert.equal(init.status, 0, `init failed: ${init.stderr}`);
    const r = run(["check", "--stack-only"], { env });
    assert.equal(r.status, 0, r.stdout + r.stderr);
  });

  test("check --stack-only exits 1 when a pinned version drifts", () => {
    const dir = makeDir("check-drift");
    const skills = join(dir, "skills");
    mkdirSync(join(skills, "diagram-design"), { recursive: true });
    const env = {
      HOME: dir,
      WEAVELOG_LIVE_ROOT: join(dir, "live"),
      WEAVELOG_STATE_DIR: join(dir, "state"),
      WEAVELOG_CHECK_PLIST: join(dir, "no-plist.plist"),
      WEAVELOG_SKILLS_DIR: skills,
      ...versionEnv(dir),
    };
    const bins = join(dir, "bins");
    writeFileSync(
      join(bins, "headroom"),
      "#!/bin/sh\nprintf '%s\\n' '9.9.9'\n",
    );
    chmodSync(join(bins, "headroom"), 0o755);
    const r = run(["check", "--stack-only"], { env });
    assert.notEqual(r.status, 0);
    assert.ok(r.stdout.includes("headroom"), "drift output names the tool");
  });
});

describe("cli check --pre-commit (pin-hygiene gate)", () => {
  test("fails naming the offending dep in a weavelog-managed repo with a caret pin", () => {
    const dir = makeDir("precommit-managed-bad");
    write(join(dir, "weavelog.json"), JSON.stringify({ tools: {} }));
    write(
      join(dir, "package.json"),
      JSON.stringify({ devDependencies: { tsx: "^4.23.1" } }),
    );
    const r = run(["check", "--pre-commit"], {
      cwd: dir,
      env: { WEAVELOG_STATE_DIR: join(dir, "state") },
    });
    assert.equal(r.status, 1);
    assert.ok(r.stderr.includes("deps.pin-hygiene"), "names the check id");
    assert.ok(r.stderr.includes("tsx@^4.23.1"), "names the offending dep");
  });

  test("fails on a missing lockfile in a managed repo with exact pins", () => {
    const dir = makeDir("precommit-managed-nolock");
    write(join(dir, "weavelog.json"), JSON.stringify({ tools: {} }));
    write(
      join(dir, "package.json"),
      JSON.stringify({ dependencies: { yaml: "2.9.0" } }),
    );
    const r = run(["check", "--pre-commit"], {
      cwd: dir,
      env: { WEAVELOG_STATE_DIR: join(dir, "state") },
    });
    assert.equal(r.status, 1);
    assert.ok(r.stderr.includes("package-lock.json missing"));
  });

  test("skips the pin gate in a foreign repo (no weavelog.json) and lets task-validate decide", () => {
    const dir = makeDir("precommit-foreign");
    write(
      join(dir, "package.json"),
      JSON.stringify({ dependencies: { left_pad: "^1.0.0" } }),
    );
    const r = run(["check", "--pre-commit"], {
      cwd: dir,
      env: { WEAVELOG_STATE_DIR: join(dir, "state") },
    });
    assert.ok(r.stdout.includes("[skip] deps.pin-hygiene"), "skip is visible");
    assert.equal(r.status, 0);
  });

  test("proceeds past the pin gate in a managed repo with exact pins and a lockfile", () => {
    const dir = makeDir("precommit-managed-ok");
    write(join(dir, "weavelog.json"), JSON.stringify({ tools: {} }));
    write(
      join(dir, "package.json"),
      JSON.stringify({ dependencies: { yaml: "2.9.0" } }),
    );
    write(join(dir, "package-lock.json"), "{}");
    const r = run(["check", "--pre-commit"], {
      cwd: dir,
      env: { WEAVELOG_STATE_DIR: join(dir, "state") },
    });
    assert.ok(r.stdout.includes("deps.pin-hygiene"), "gate line is visible");
    assert.equal(r.status, 0);
  });
});

describe("cli difit.pointer", () => {
  test("check --stack-only exits 1 naming difit.pointer when the doc loses the pin", () => {
    const dir = makeDir("difit-doc");
    const skills = join(dir, "skills");
    mkdirSync(join(skills, "diagram-design"), { recursive: true });
    const badDoc = join(dir, "worktree-discipline.md");
    write(badDoc, "the conductor opens `npx difit --background`");
    const env = {
      HOME: dir,
      WEAVELOG_LIVE_ROOT: join(dir, "live"),
      WEAVELOG_STATE_DIR: join(dir, "state"),
      WEAVELOG_CHECK_PLIST: join(dir, "no-plist.plist"),
      WEAVELOG_SKILLS_DIR: skills,
      WEAVELOG_DIFIT_DOC: badDoc,
      ...versionEnv(dir),
    };
    const r = run(["check", "--stack-only"], { env });
    assert.equal(r.status, 1);
    assert.ok(r.stdout.includes("difit.pointer"), "names the check id");
  });

  test("check --stack-only passes difit.pointer when the doc pins the manifest version", () => {
    const dir = makeDir("difit-doc-ok");
    const skills = join(dir, "skills");
    mkdirSync(join(skills, "diagram-design"), { recursive: true });
    const doc = join(dir, "worktree-discipline.md");
    const pinned = manifest.tools.difit.version;
    write(doc, `run \`npx difit@${pinned} --background\``);
    const env = {
      HOME: dir,
      WEAVELOG_LIVE_ROOT: join(dir, "live"),
      WEAVELOG_STATE_DIR: join(dir, "state"),
      WEAVELOG_CHECK_PLIST: join(dir, "no-plist.plist"),
      WEAVELOG_SKILLS_DIR: skills,
      WEAVELOG_DIFIT_DOC: doc,
      ...versionEnv(dir),
    };
    const r = run(["check", "--stack-only"], { env });
    assert.equal(r.status, 0);
    assert.ok(r.stdout.includes("difit.pointer"));
  });
});

describe("cli scaffold", () => {
  test("scaffold --project creates dir + git repo + AGENTS.md stub + .env.example, exits 0", () => {
    const dir = makeDir("scaffold");
    const env = {
      WEAVELOG_STATE_DIR: join(dir, "state"),
      WEAVELOG_BACKLOG_BIN: join(dir, "no-backlog"),
    };
    const r = spawnSync(
      process.execPath,
      ["--import", TSX_LOADER, CLI, "scaffold", "--project", "myproj"],
      {
        encoding: "utf8",
        timeout: 120_000,
        env: { ...process.env, ...env },
        cwd: dir,
      },
    );
    assert.equal(r.status, 0);
    assert.ok(existsSync(join(dir, "myproj", ".git")), "git repo initialized");
    assert.ok(
      existsSync(join(dir, "myproj", "AGENTS.md")),
      "AGENTS.md stub written",
    );
    assert.ok(
      existsSync(join(dir, "myproj", ".env.example")),
      ".env.example copied",
    );
    assert.equal(lastLedgerLine(join(dir, "state")).exitCode, 0);
  });
});

describe("cli check risk-signals (TASK-78, ADR-004 L0->L1 detector)", () => {
  function git(args: string[], cwd: string): void {
    const r = spawnSync("git", args, { cwd, encoding: "utf8" });
    if (r.status !== 0)
      throw new Error(`git ${args.join(" ")} failed: ${r.stderr}`);
  }

  /** Repo on branch task/x with one commit on main + a protected-path change. */
  function makeTaskRepo(dir: string): void {
    mkdirSync(dir, { recursive: true });
    git(["init", "-b", "main"], dir);
    git(["config", "user.email", "t@t.com"], dir);
    git(["config", "user.name", "T"], dir);
    write(join(dir, "README.md"), "# base\n");
    git(["add", "."], dir);
    git(["commit", "-m", "base"], dir);
    git(["checkout", "-b", "task/T-1"], dir);
    write(join(dir, "src", "auth", "login.ts"), "export const ok = 1;\n");
    git(["add", "."], dir);
    git(["commit", "-m", "touch auth path"], dir);
  }

  function stateEnv(dir: string): Record<string, string> {
    return {
      HOME: dir,
      WEAVELOG_STATE_DIR: join(dir, "state"),
      WEAVELOG_LIVE_ROOT: join(dir, "live"),
    };
  }

  function seedLedger(dir: string, entries: object[]): void {
    mkdirSync(join(dir, "state"), { recursive: true });
    writeFileSync(
      join(dir, "state", "ledger.jsonl"),
      `${entries.map((e) => JSON.stringify(e)).join("\n")}\n`,
    );
  }

  test("escalates L1 on a protected-path diff, with file:line evidence and a logged record", () => {
    const dir = makeDir("risk-escalate");
    makeTaskRepo(dir);
    seedLedger(dir, [{ command: "check", exitCode: 0 }]);
    const r = run(["check"], { cwd: dir, env: stateEnv(dir) });
    assert.ok(
      r.stdout.includes("L1:protected-path"),
      `expected escalation in output: ${r.stdout}\n${r.stderr}`,
    );
    assert.ok(r.stdout.includes("src/auth/login.ts"), "names the evidence");
    assert.ok(
      r.stdout.includes("risk-signals"),
      "check names the risk-signals id",
    );
    const escalationLog = readFileSync(
      join(dir, "state", "escalations.jsonl"),
      "utf8",
    );
    const record = JSON.parse(escalationLog.trim().split("\n").pop() ?? "{}");
    assert.equal(record.level, "L1");
    assert.equal(record.reasonCode, "L1:protected-path");
    assert.deepEqual(record.triggers, ["protected-path"]);
  });

  test("stays L0 when the diff has no risk signals", () => {
    const dir = makeDir("risk-clean");
    mkdirSync(dir, { recursive: true });
    git(["init", "-b", "main"], dir);
    git(["config", "user.email", "t@t.com"], dir);
    git(["config", "user.name", "T"], dir);
    write(join(dir, "README.md"), "# base\n");
    git(["add", "."], dir);
    git(["commit", "-m", "base"], dir);
    git(["checkout", "-b", "task/T-2"], dir);
    write(join(dir, "src", "util", "math.ts"), "export const sum = 2;\n");
    git(["add", "."], dir);
    git(["commit", "-m", "touch util path"], dir);
    seedLedger(dir, [{ command: "check", exitCode: 0 }]);
    const r = run(["check"], { cwd: dir, env: stateEnv(dir) });
    assert.ok(
      r.stdout.includes("L0:no-risk-signals"),
      `expected L0 in output: ${r.stdout}\n${r.stderr}`,
    );
    assert.equal(existsSync(join(dir, "state", "escalations.jsonl")), false);
  });

  test("fails closed when the run ledger is absent", () => {
    const dir = makeDir("risk-noleader");
    makeTaskRepo(dir);
    mkdirSync(join(dir, "state"), { recursive: true }); // state dir, no ledger
    const r = run(["check"], { cwd: dir, env: stateEnv(dir) });
    assert.ok(
      r.stdout.includes("fail closed") && r.stdout.includes("ledger absent"),
      `expected fail-closed ledger skip: ${r.stdout}\n${r.stderr}`,
    );
  });

  test("fails closed when the merge base cannot be determined", () => {
    const dir = makeDir("risk-nobase");
    // Deliberately non-main branch with no main and no origin/main
    // -> no determinable merge base -> fail closed.
    mkdirSync(dir, { recursive: true });
    git(["init", "-b", "develop"], dir);
    git(["config", "user.email", "t@t.com"], dir);
    git(["config", "user.name", "T"], dir);
    write(join(dir, "README.md"), "# base\n");
    git(["add", "."], dir);
    git(["commit", "-m", "base"], dir);
    seedLedger(dir, [{ command: "check", exitCode: 0 }]);
    const r = run(["check"], { cwd: dir, env: stateEnv(dir) });
    assert.ok(
      r.stdout.includes("fail closed") &&
        r.stdout.includes("cannot determine merge base"),
      `expected fail-closed merge-base skip: ${r.stdout}\n${r.stderr}`,
    );
  });

  test("reports an explicit skip on main (no task diff context)", () => {
    const dir = makeDir("risk-main");
    mkdirSync(dir, { recursive: true });
    git(["init", "-b", "main"], dir);
    git(["config", "user.email", "t@t.com"], dir);
    git(["config", "user.name", "T"], dir);
    write(join(dir, "README.md"), "# base\n");
    git(["add", "."], dir);
    git(["commit", "-m", "base"], dir);
    seedLedger(dir, [{ command: "check", exitCode: 0 }]);
    const r = run(["check"], { cwd: dir, env: stateEnv(dir) });
    assert.ok(
      r.stdout.includes("[skip] risk-signals"),
      `expected explicit skip on main: ${r.stdout}\n${r.stderr}`,
    );
  });

  test("retry-failures from the ledger fire the signal at the threshold", () => {
    const dir = makeDir("risk-retry");
    makeTaskRepo(dir);
    seedLedger(dir, [
      { command: "check", exitCode: 0 },
      { command: "check", exitCode: 1 },
      { command: "check", exitCode: 1 },
    ]);
    const r = run(["check"], { cwd: dir, env: stateEnv(dir) });
    // protected-path + retry streak both fire on this fixture
    assert.ok(
      r.stdout.includes("L1:protected-path+retry-failures"),
      `expected combined escalation: ${r.stdout}\n${r.stderr}`,
    );
  });

  test("a deleted protected file still escalates (TASK-78 review regression)", () => {
    const dir = makeDir("risk-deleted");
    // The protected file EXISTS IN BASE; the task branch deletes it —
    // the highest-risk touch must not be invisible.
    mkdirSync(join(dir, "src", "auth"), { recursive: true });
    git(["init", "-b", "main"], dir);
    git(["config", "user.email", "t@t.com"], dir);
    git(["config", "user.name", "T"], dir);
    write(join(dir, "README.md"), "# base\n");
    write(join(dir, "src", "auth", "login.ts"), "export const ok = 1;\n");
    git(["add", "."], dir);
    git(["commit", "-m", "base with auth guard"], dir);
    git(["checkout", "-b", "task/T-1"], dir);
    git(["rm", "src/auth/login.ts"], dir);
    git(["commit", "-m", "delete auth guard"], dir);
    seedLedger(dir, [{ command: "check", exitCode: 0 }]);
    const r = run(["check"], { cwd: dir, env: stateEnv(dir) });
    assert.ok(
      r.stdout.includes("L1:protected-path") &&
        r.stdout.includes("src/auth/login.ts"),
      `expected escalation for deleted protected file: ${r.stdout}\n${r.stderr}`,
    );
  });

  test("an untracked protected file still escalates (TASK-78 review regression)", () => {
    const dir = makeDir("risk-untracked");
    makeTaskRepo(dir);
    // untracked file: never appears in `git diff <base>`
    write(join(dir, "src", "secrets", "keys.json"), "{}\n");
    seedLedger(dir, [{ command: "check", exitCode: 0 }]);
    const r = run(["check"], { cwd: dir, env: stateEnv(dir) });
    assert.ok(
      r.stdout.includes("L1:protected-path") &&
        r.stdout.includes("src/secrets/keys.json"),
      `expected escalation for untracked protected file: ${r.stdout}\n${r.stderr}`,
    );
  });

  test("a self-inflicted failure streak does not sustain escalation (TASK-78 review regression)", () => {
    const dir = makeDir("risk-selfloop");
    // clean diff vs base (no protected paths), but the ledger shows two
    // consecutive check failures caused ONLY by the risk-signals gate —
    // the gate must not feed itself: result stays L0.
    mkdirSync(dir, { recursive: true });
    git(["init", "-b", "main"], dir);
    git(["config", "user.email", "t@t.com"], dir);
    git(["config", "user.name", "T"], dir);
    write(join(dir, "README.md"), "# base\n");
    git(["add", "."], dir);
    git(["commit", "-m", "base"], dir);
    git(["checkout", "-b", "task/T-3"], dir);
    write(join(dir, "src", "util", "math.ts"), "export const sum = 2;\n");
    git(["add", "."], dir);
    git(["commit", "-m", "touch util path"], dir);
    seedLedger(dir, [
      { command: "check", exitCode: 0 },
      {
        command: "check",
        exitCode: 1,
        errors: ["risk-signals: L1:protected-path — escalate ..."],
      },
      {
        command: "check",
        exitCode: 1,
        errors: ["risk-signals: L1:protected-path — escalate ..."],
      },
    ]);
    const r = run(["check"], { cwd: dir, env: stateEnv(dir) });
    assert.ok(
      r.stdout.includes("L0:no-risk-signals"),
      `expected L0 despite self-inflicted streak: ${r.stdout}\n${r.stderr}`,
    );
  });

  test("malformed WEAVELOG_RISK_FAILING_TESTS fails closed (TASK-78 review regression)", () => {
    const dir = makeDir("risk-badenv");
    makeTaskRepo(dir);
    seedLedger(dir, [{ command: "check", exitCode: 0 }]);
    const r = run(["check"], {
      cwd: dir,
      env: { ...stateEnv(dir), WEAVELOG_RISK_FAILING_TESTS: "three" },
    });
    assert.ok(
      r.stdout.includes("fail closed") && r.stdout.includes('got "three"'),
      `expected fail-closed env handling: ${r.stdout}\n${r.stderr}`,
    );
  });
});

describe("cli built artifact", () => {
  test("built CLI runs as an executable package bin", {
    skip: !existsSync(DIST),
  }, () => {
    const dir = makeDir("cli-bin");
    const packageRoot = join(dir, "package");
    cpSync(join(REPO, "dist"), join(packageRoot, "dist"), {
      recursive: true,
    });
    const executable = join(packageRoot, "dist", "cli", "index.js");
    chmodSync(executable, 0o755);
    const r = spawnSync(executable, ["--help"], {
      encoding: "utf8",
      timeout: 30_000,
      env: { ...process.env, WEAVELOG_STATE_DIR: join(dir, "state") },
    });
    assert.equal(r.status, 0, r.stderr);
    assert.match(r.stdout, /Usage: weavelog/);
  });

  test("dist/cli/index.js runs under plain node --help", {
    skip: !existsSync(DIST),
  }, () => {
    const r = spawnSync(process.execPath, [DIST, "--help"], {
      encoding: "utf8",
      timeout: 60_000,
    });
    assert.equal(r.status, 0);
    assert.ok(r.stdout.includes("Usage"));
  });
});
