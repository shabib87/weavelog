import assert from "node:assert/strict";
import { type ChildProcess, spawn, spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  chmodSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { after, before, describe, test } from "node:test";
import { fileURLToPath } from "node:url";
import {
  checkConfigDrift,
  checkDiagramDesign,
  checkExtensionPresent,
  checkMarkitdown,
  checkOpencodeConfig,
  checkPiModelsConfig,
  checkPointerTargets,
  checkProxyHealth,
  checkProxyMode,
  checkRosterDrift,
  checkThresholds,
  type ProxyFetch,
  parseJsonc,
  type RosterSnapshot,
  runProxyChecks,
  stripJsoncComments,
} from "../src/tools/stack-check.ts";

const BIN = fileURLToPath(
  new URL("../src/tools/stack-check.ts", import.meta.url),
);

const STACK_MANIFEST = {
  headroom: "0.1.0",
  backlogMd: "1.2.3",
  markitdown: "0.1.7",
  opencodeApp: "9.9.9",
  piApp: "0.0.0",
  diagramDesignCommit: "deadbeef",
  diagramDesignRepo: "test/diagram-design",
  models: ["test-model-a", "test-model-b"],
  updatedAt: "2026-09-01",
};

// Stub HTTP server (separate subprocess — never in-process): serves the
// OpenRouter models catalog and the npm backlog.md latest endpoint the full
// stack-check run fetches, so CLI wiring tests are hermetic.
let ModelsUrl = "";
let NpmUrl = "";
let stubProc: ChildProcess | undefined;
before(async () => {
  stubProc = spawn(
    process.execPath,
    [
      "-e",
      `const http=require("node:http");
const models={data:[{id:"test-model-a",expiration_date:"2032-01-01T00:00:00.000Z",pricing:{prompt:"0.000001",completion:"0.000002"}},{id:"test-model-b",expiration_date:"2032-01-01T00:00:00.000Z",pricing:{prompt:"0.000003",completion:"0.000001"}}]};
const srv=http.createServer((req,res)=>{
  res.writeHead(200,{"content-type":"application/json"});
  if(req.url.startsWith("/api/v1/models")) res.end(JSON.stringify(models));
  else if(req.url.startsWith("/backlog.md/latest")) res.end(JSON.stringify({version:"1.2.3"}));
  else res.end("{}");
});
srv.listen(0,"127.0.0.1",()=>{console.log("PORT:"+srv.address().port)})`,
    ],
    { stdio: ["ignore", "pipe", "inherit"] },
  );
  const port = await new Promise<string>((resolve, reject) => {
    const timeout = setTimeout(
      () => reject(new Error("stub server did not report port")),
      10_000,
    );
    stubProc?.stdout?.on("data", (chunk: Buffer) => {
      const match = /PORT:(\d+)/.exec(chunk.toString());
      if (match) {
        clearTimeout(timeout);
        resolve(match[1]);
      }
    });
  });
  ModelsUrl = `http://127.0.0.1:${port}/api/v1/models`;
  NpmUrl = `http://127.0.0.1:${port}/backlog.md/latest`;
});
after(() => {
  stubProc?.kill();
});

function initGitRepo(dir: string): string {
  mkdirSync(dir, { recursive: true });
  spawnSync("git", ["init"], { cwd: dir, encoding: "utf8" });
  spawnSync("git", ["config", "user.email", "t@t.com"], {
    cwd: dir,
    encoding: "utf8",
  });
  spawnSync("git", ["config", "user.name", "T"], {
    cwd: dir,
    encoding: "utf8",
  });
  writeFileSync(join(dir, "README.md"), "# test\n");
  spawnSync("git", ["add", "."], { cwd: dir, encoding: "utf8" });
  spawnSync("git", ["commit", "-m", "init"], { cwd: dir, encoding: "utf8" });
  return spawnSync("git", ["-C", dir, "rev-parse", "HEAD"], {
    encoding: "utf8",
  }).stdout.trim();
}

function run(args: string[], extraEnv: Record<string, string> = {}) {
  return spawnSync(process.execPath, ["--import", "tsx", BIN, ...args], {
    encoding: "utf8",
    env: { ...process.env, ...extraEnv },
    timeout: 60_000,
  });
}

const HEADROOM_SCRIPT = `#!/bin/sh
if [ "$1" = "--version" ]; then echo "headroom, version 0.1.0"; fi
if [ "$1" = "update" ]; then echo "0.1.0"; fi
`;

// Roster snapshot fixtures matching the stub catalog prices above (TASK-75).
function rosterSnapshot(
  roster: Record<string, { prompt: string; completion: string }>,
  familySlugs: Record<string, string[]> = { "test-family": [] },
): RosterSnapshot {
  return {
    generatedAt: "2026-09-07",
    source: "stub",
    monitoredFamilies: Object.keys(familySlugs),
    roster,
    familySlugs,
  };
}
const ROSTER_SNAPSHOT_CLEAN = rosterSnapshot({
  "test-model-a": { prompt: "0.000001", completion: "0.000002" },
  "test-model-b": { prompt: "0.000003", completion: "0.000001" },
});

// Fixture HOME shaped like the live harness home: manifest, OpenRouter key,
// and fake binaries for the checks that shell out.
function makeStackHome(): string {
  const home = join(
    tmpdir(),
    `stack-home-${Date.now()}-${Math.random().toString(36).slice(2)}`,
  );
  mkdirSync(join(home, ".agents"), { recursive: true });
  writeFileSync(
    join(home, ".agents", "stack-versions.json"),
    `${JSON.stringify(STACK_MANIFEST, null, 2)}\n`,
  );
  mkdirSync(join(home, ".local", "share", "opencode"), { recursive: true });
  writeFileSync(
    join(home, ".local", "share", "opencode", "auth.json"),
    JSON.stringify({ openrouter: { key: "sk-or-test" } }),
  );
  mkdirSync(join(home, ".local", "bin"), { recursive: true });
  writeFileSync(join(home, ".local", "bin", "headroom"), HEADROOM_SCRIPT);
  chmodSync(join(home, ".local", "bin", "headroom"), 0o755);
  writeFileSync(
    join(home, ".local", "bin", "markitdown"),
    '#!/bin/sh\necho "markitdown 0.1.7"\n',
  );
  chmodSync(join(home, ".local", "bin", "markitdown"), 0o755);
  mkdirSync(join(home, ".bun", "bin"), { recursive: true });
  writeFileSync(
    join(home, ".bun", "bin", "backlog"),
    '#!/bin/sh\necho "1.2.3"\n',
  );
  chmodSync(join(home, ".bun", "bin", "backlog"), 0o755);
  writeFileSync(
    join(home, ".local", "bin", "fake-pricing"),
    '#!/bin/sh\necho "pricing ok"\n',
  );
  chmodSync(join(home, ".local", "bin", "fake-pricing"), 0o755);
  writeFileSync(
    join(home, "roster-snapshot.json"),
    `${JSON.stringify(ROSTER_SNAPSHOT_CLEAN, null, 2)}\n`,
  );
  return home;
}

function stackRun(args: string[], extraEnv: Record<string, string> = {}) {
  const home = makeStackHome();
  const r = run(args, {
    HOME: home,
    STACK_CHECK_OPENROUTER_MODELS_URL: ModelsUrl,
    STACK_CHECK_NPM_REGISTRY_URL: NpmUrl,
    STACK_CHECK_PRICING_BIN: join(home, ".local", "bin", "fake-pricing"),
    STACK_CHECK_ROSTER_SNAPSHOT: join(home, "roster-snapshot.json"),
    HEADROOM_UPDATE_CHECK: "off",
    ...extraEnv,
  });
  return { r, home };
}

describe("stack-check (happy paths)", () => {
  test("--help exits 0 and shows usage", () => {
    const r = run(["--help"]);
    assert.equal(r.status, 0);
    assert.ok(r.stdout.includes("Usage: bun stack-check.ts"));
  });

  test("full run produces a JSON report and exits 0 or 1", () => {
    const { r, home } = stackRun([
      "--no-notify",
      "--json",
      join(tmpdir(), `stack-check-test-${Date.now()}.json`),
    ]);
    assert.ok([0, 1].includes(r.status as number));
    assert.ok(r.stdout.includes("report:"));
    const reportPath = r.stdout.split("report: ")[1]?.split("\n")[0];
    assert.ok(reportPath);
    assert.equal(existsSync(reportPath as string), true);
    const report = JSON.parse(readFileSync(reportPath as string, "utf8"));
    assert.ok(Object.hasOwn(report, "checks"));
    assert.ok(Object.hasOwn(report, "drift"));
    rmSync(home, { recursive: true, force: true });
  });

  test("report includes a backlogMd check with current and latest versions", () => {
    const { r, home } = stackRun([
      "--no-notify",
      "--json",
      join(tmpdir(), `stack-check-backlog-${Date.now()}.json`),
    ]);
    assert.ok([0, 1].includes(r.status as number));
    const reportPath = r.stdout.split("report: ")[1]?.split("\n")[0];
    assert.ok(reportPath);
    assert.equal(existsSync(reportPath as string), true);
    const report = JSON.parse(readFileSync(reportPath as string, "utf8"));
    assert.ok(Object.hasOwn(report.checks, "backlogMd"));
    assert.equal(report.checks.backlogMd.current, "1.2.3");
    assert.equal(report.checks.backlogMd.latest, "1.2.3");
    rmSync(home, { recursive: true, force: true });
  });

  test("report no longer checks superpowers (plugin removed 2026-08-16)", () => {
    const { r, home } = stackRun([
      "--no-notify",
      "--json",
      join(tmpdir(), `stack-check-nosp-${Date.now()}.json`),
    ]);
    const reportPath = r.stdout.split("report: ")[1]?.split("\n")[0];
    assert.ok(reportPath);
    assert.equal(existsSync(reportPath as string), true);
    const report = JSON.parse(readFileSync(reportPath as string, "utf8"));
    assert.equal(Object.hasOwn(report.checks, "superpowers"), false);
    assert.ok(
      !JSON.stringify(report.checks.opencode ?? {}).includes(
        "superpowersPlugin",
      ),
    );
    rmSync(home, { recursive: true, force: true });
  });

  test("report includes a markitdown check with current and manifest versions", () => {
    const { r, home } = stackRun([
      "--no-notify",
      "--json",
      join(tmpdir(), `stack-check-markitdown-${Date.now()}.json`),
    ]);
    assert.ok([0, 1].includes(r.status as number));
    const reportPath = r.stdout.split("report: ")[1]?.split("\n")[0];
    assert.ok(reportPath);
    assert.equal(existsSync(reportPath as string), true);
    const report = JSON.parse(readFileSync(reportPath as string, "utf8"));
    assert.ok(Object.hasOwn(report.checks, "markitdown"));
    assert.equal(report.checks.markitdown.current, "0.1.7");
    assert.equal(report.checks.markitdown.manifest, "0.1.7");
    rmSync(home, { recursive: true, force: true });
  });

  test("report includes the roster drift check; clean snapshot adds no drift", () => {
    const { r, home } = stackRun([
      "--no-notify",
      "--json",
      join(tmpdir(), `stack-check-roster-${Date.now()}.json`),
    ]);
    assert.ok([0, 1].includes(r.status as number));
    const reportPath = r.stdout.split("report: ")[1]?.split("\n")[0];
    assert.ok(reportPath);
    const report = JSON.parse(readFileSync(reportPath as string, "utf8"));
    assert.ok(Object.hasOwn(report.checks, "rosterDrift"));
    assert.equal(report.checks.rosterDrift.rosterSize, 2);
    assert.equal(report.checks.rosterDrift.newMonitoredSlugs.length, 0);
    assert.ok(
      !report.drift.some((d: string) => d.startsWith("roster:")),
      `unexpected roster drift: ${JSON.stringify(report.drift)}`,
    );
    rmSync(home, { recursive: true, force: true });
  });

  test("roster price delta >=10% produces drift and a blocking decision brief", () => {
    // live prompt for test-model-a is 0.000001; pinning 0.000002 = 100% delta
    const deltaHome = join(
      tmpdir(),
      `stack-home-delta-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    );
    mkdirSync(deltaHome, { recursive: true });
    writeFileSync(
      join(deltaHome, "roster-snapshot.json"),
      JSON.stringify(
        rosterSnapshot({
          "test-model-a": { prompt: "0.000002", completion: "0.000002" },
          "test-model-b": { prompt: "0.000003", completion: "0.000001" },
        }),
      ),
    );
    const { r, home } = stackRun(
      [
        "--no-notify",
        "--json",
        join(tmpdir(), `stack-check-roster-delta-${Date.now()}.json`),
      ],
      { STACK_CHECK_ROSTER_SNAPSHOT: join(deltaHome, "roster-snapshot.json") },
    );
    assert.equal(r.status, 1);
    const reportPath = r.stdout.split("report: ")[1]?.split("\n")[0];
    assert.ok(reportPath);
    const report = JSON.parse(readFileSync(reportPath as string, "utf8"));
    assert.ok(
      report.drift.some((d: string) =>
        d.includes("price delta >=10% on test-model-a"),
      ),
    );
    const decisions = report.checks.rosterDrift.decisions as string[];
    assert.ok(
      decisions.some(
        (d) => d.includes("blocking") && d.includes("test-model-a"),
      ),
    );
    assert.ok(r.stderr.includes("ROSTER DECISION BRIEF"));
    rmSync(home, { recursive: true, force: true });
    rmSync(deltaHome, { recursive: true, force: true });
  });
});

describe("checkRosterDrift (roster drift gate, pure)", () => {
  const live = [
    {
      id: "z-ai/glm-5.3-flash",
      pricing: { prompt: "0.000000075", completion: "0.00000025" },
    },
    {
      id: "z-ai/glm-5.3",
      pricing: { prompt: "0.0000014", completion: "0.0000044" },
    },
    {
      id: "qwen/qwen3.8-flash",
      pricing: { prompt: "0.00000015", completion: "0.00000047" },
    },
  ];
  const snap = rosterSnapshot(
    {
      "z-ai/glm-5.3-flash": { prompt: "0.000000075", completion: "0.00000025" },
      "z-ai/glm-5.3": { prompt: "0.0000014", completion: "0.0000044" },
      "qwen/qwen3.8-flash": { prompt: "0.00000015", completion: "0.00000047" },
    },
    {
      "z-ai": ["z-ai/glm-5.3-flash", "z-ai/glm-5.3"],
      qwen: ["qwen/qwen3.8-flash"],
    },
  );

  test("identical catalog -> no drift, no decisions", () => {
    const res = checkRosterDrift(snap, live);
    assert.equal(res.drift.length, 0);
    assert.equal(res.decisions.length, 0);
  });

  test(">=10% price delta on a roster model -> drift + blocking decision", () => {
    const bumped = structuredClone(live);
    bumped[0].pricing.prompt = "0.00000009"; // +20%
    const res = checkRosterDrift(snap, bumped);
    assert.ok(
      res.drift.some((d) =>
        d.includes("price delta >=10% on z-ai/glm-5.3-flash"),
      ),
    );
    assert.equal(res.decisions.length, 1);
    assert.ok(res.decisions[0].includes("blocking"));
  });

  test("sub-threshold price delta -> no drift", () => {
    const bumped = structuredClone(live);
    bumped[0].pricing.prompt = "0.000000078"; // +4%
    const res = checkRosterDrift(snap, bumped);
    assert.equal(res.drift.length, 0);
  });

  test("exactly 10% delta breaches the gate (>=, not >)", () => {
    const bumped = structuredClone(live);
    bumped[0].pricing.prompt = "0.0000000825"; // +10% exactly
    const res = checkRosterDrift(snap, bumped);
    assert.ok(res.drift.some((d) => d.includes("price delta >=10%")));
  });

  test("removed/renamed roster slug -> drift + blocking decision", () => {
    const res = checkRosterDrift(snap, live.slice(1));
    assert.ok(
      res.drift.some(
        (d) =>
          d.includes("removed/renamed") && d.includes("z-ai/glm-5.3-flash"),
      ),
    );
    assert.ok(res.decisions.some((d) => d.includes("z-ai/glm-5.3-flash")));
  });

  test("new slug in a monitored family -> drift + blocking decision", () => {
    const withNew = [
      ...live,
      {
        id: "z-ai/glm-6-preview",
        pricing: { prompt: "0.001", completion: "0.002" },
      },
    ];
    const res = checkRosterDrift(snap, withNew);
    assert.ok(
      res.drift.some((d) =>
        d.includes("new slug in monitored family: z-ai/glm-6-preview"),
      ),
    );
    assert.equal(res.decisions.length, 1);
  });

  test("slug outside monitored families is ignored", () => {
    const withNew = [
      ...live,
      {
        id: "vendorx/model-9",
        pricing: { prompt: "0.001", completion: "0.002" },
      },
    ];
    const res = checkRosterDrift(snap, withNew);
    assert.equal(res.drift.length, 0);
  });

  test("missing or malformed live pricing is skipped, never a crash", () => {
    const bad = [
      { id: "z-ai/glm-5.3-flash" },
      { id: "z-ai/glm-5.3", pricing: { prompt: "abc", completion: "" } },
      {
        id: "qwen/qwen3.8-flash",
        pricing: { prompt: "0.00000015", completion: "0.00000047" },
      },
    ];
    const res = checkRosterDrift(snap, bad);
    assert.equal(res.drift.length, 0);
    assert.equal(res.decisions.length, 0);
  });
});

describe("stack-check (unhappy paths)", () => {
  test("missing manifest exits 2 with a clear error", () => {
    const fakeHome = join(tmpdir(), `stack-check-nohome-${Date.now()}`);
    mkdirSync(join(fakeHome, ".agents"), { recursive: true });
    const r = run([], { HOME: fakeHome });
    assert.equal(r.status, 2);
    assert.ok(r.stderr.includes("manifest missing"));
    rmSync(fakeHome, { recursive: true, force: true });
  });
});

describe("checkDiagramDesign (drift detection)", () => {
  test("no drift when installed HEAD matches pinned", () => {
    const dir = join(tmpdir(), `stack-check-dd-match-${Date.now()}`);
    const full = initGitRepo(dir);
    const short = full.slice(0, 7);
    const { check, drift } = checkDiagramDesign(short, dir);
    assert.deepEqual(drift, []);
    assert.equal(check.installed, true);
    assert.equal(check.pinned, short);
    assert.equal(check.current, full);
    rmSync(dir, { recursive: true, force: true });
  });

  test("drift when installed HEAD differs from pinned", () => {
    const dir = join(tmpdir(), `stack-check-dd-drift-${Date.now()}`);
    const full = initGitRepo(dir);
    const { check, drift } = checkDiagramDesign("deadbeef", dir);
    assert.ok(
      drift.includes(`diagram-design skill ${full} != pinned deadbeef`),
    );
    assert.equal(check.installed, true);
    rmSync(dir, { recursive: true, force: true });
  });

  test("drift when skill directory is missing", () => {
    const missing = join(
      tmpdir(),
      `stack-check-dd-missing-${Date.now()}`,
      "diagram-design",
    );
    const { check, drift } = checkDiagramDesign("ac490fd", missing);
    assert.ok(drift.includes(`diagram-design skill missing at ${missing}`));
    assert.equal(check.installed, false);
    assert.equal(check.current, null);
  });

  test("drift when pinned commit is empty in manifest", () => {
    const dir = join(tmpdir(), `stack-check-dd-empty-${Date.now()}`);
    initGitRepo(dir);
    const { drift } = checkDiagramDesign("", dir);
    assert.ok(drift.includes("diagram-design pinned commit empty in manifest"));
    rmSync(dir, { recursive: true, force: true });
  });

  test("drift when skill directory lacks git metadata", () => {
    const empty = join(tmpdir(), `stack-check-dd-nogit-${Date.now()}`);
    mkdirSync(empty, { recursive: true });
    const { check, drift } = checkDiagramDesign("ac490fd", empty);
    assert.ok(
      drift.includes(
        `diagram-design git metadata unavailable at ${empty} (pinned ac490fd)`,
      ),
    );
    assert.equal(check.installed, true);
    rmSync(empty, { recursive: true, force: true });
  });
});

describe("checkDiagramDesign (main() wiring)", () => {
  test("spawned run reads skills via STACK_CHECK_SKILLS_DIR", () => {
    const skills = join(tmpdir(), `stack-check-dd-int-${Date.now()}`);
    const full = initGitRepo(join(skills, "diagram-design"));
    const { r, home } = stackRun(
      [
        "--no-notify",
        "--json",
        join(tmpdir(), `stack-check-dd-int-${Date.now()}.json`),
      ],
      { STACK_CHECK_SKILLS_DIR: skills },
    );
    assert.ok([0, 1].includes(r.status as number));
    const reportPath = r.stdout.split("report: ")[1]?.split("\n")[0];
    assert.ok(reportPath);
    assert.equal(existsSync(reportPath as string), true);
    const report = JSON.parse(readFileSync(reportPath as string, "utf8"));
    assert.ok(report.checks.diagramDesign);
    assert.equal(report.checks.diagramDesign.installed, true);
    assert.equal(report.checks.diagramDesign.current, full);
    assert.equal(
      (report.drift as string[]).some(
        (d) => d.startsWith("diagram-design skill") && d.includes("!= pinned"),
      ),
      true,
    );
    rmSync(skills, { recursive: true, force: true });
    rmSync(home, { recursive: true, force: true });
  });
});

describe("checkMarkitdown (drift detection)", () => {
  function fakeMarkitdown(dir: string, version = "0.1.7"): string {
    const p = join(dir, "markitdown");
    writeFileSync(p, `#!/bin/sh\necho "markitdown ${version}"\n`);
    chmodSync(p, 0o755);
    return p;
  }

  test("no drift when installed version matches manifest", () => {
    const dir = mkdtempSync(join(tmpdir(), `stack-check-mi-match-`));
    try {
      const { check, drift } = checkMarkitdown(fakeMarkitdown(dir), "0.1.7");
      assert.deepEqual(drift, []);
      assert.equal(check.current, "0.1.7");
      assert.equal(check.manifest, "0.1.7");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("version prefix is stripped and drift names manifest -> installed", () => {
    const dir = mkdtempSync(join(tmpdir(), `stack-check-mi-drift-`));
    try {
      const { check, drift } = checkMarkitdown(
        fakeMarkitdown(dir, "0.2.0"),
        "0.1.7",
      );
      assert.equal(check.current, "0.2.0");
      assert.ok(drift.includes("markitdown 0.1.7 -> 0.2.0"));
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("missing binary is drift and reports (missing)", () => {
    const missing = join(
      tmpdir(),
      `stack-check-mi-missing-${Date.now()}`,
      "markitdown",
    );
    const { check, drift } = checkMarkitdown(missing, "0.1.7");
    assert.equal(check.current, "(missing)");
    assert.ok(
      drift.includes(
        `markitdown binary missing at ${missing} (manifest 0.1.7)`,
      ),
    );
  });

  test("plain version output without the prefix is normalized", () => {
    const dir = mkdtempSync(join(tmpdir(), `stack-check-mi-plain-`));
    try {
      const p = join(dir, "markitdown");
      writeFileSync(p, '#!/bin/sh\necho "0.1.7"\n');
      chmodSync(p, 0o755);
      const { check, drift } = checkMarkitdown(p, "0.1.7");
      assert.equal(check.current, "0.1.7");
      assert.deepEqual(drift, []);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("unset manifest key reports an explicit missing-key drift (not a bogus -> install)", () => {
    const dir = mkdtempSync(join(tmpdir(), `stack-check-mi-unset-`));
    try {
      const { check, drift } = checkMarkitdown(fakeMarkitdown(dir), "");
      assert.equal(check.manifest, "(unset)");
      assert.ok(
        drift.includes("markitdown manifest key missing (installed 0.1.7)"),
      );
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

// ---------------------------------------------------------------------------
// stack-check proxy doctor (TASK-20 ACs #4 and #5)
// ---------------------------------------------------------------------------

const PI_BASE = "http://127.0.0.1:8788/v1";
const OPENCODE_BASE = "http://localhost:8788/v1";
const PROXY_HOST = "http://127.0.0.1:8788";

interface StubFetchOpts {
  health?: unknown;
  stats?: unknown;
  healthThrow?: boolean;
  statsThrow?: boolean;
  healthStatus?: number;
  statsStatus?: number;
}

function makeStubFetch(opts: StubFetchOpts): ProxyFetch {
  return (url: string) => {
    if (url.endsWith("/health")) {
      if (opts.healthThrow)
        return Promise.reject(new Error("network failure: connection refused"));
      return Promise.resolve({
        ok: (opts.healthStatus ?? 200) < 400,
        status: opts.healthStatus ?? 200,
        json: async () => (opts.health === undefined ? {} : opts.health),
      });
    }
    if (url.endsWith("/stats")) {
      if (opts.statsThrow)
        return Promise.reject(new Error("network failure: connection refused"));
      return Promise.resolve({
        ok: (opts.statsStatus ?? 200) < 400,
        status: opts.statsStatus ?? 200,
        json: async () => (opts.stats === undefined ? {} : opts.stats),
      });
    }
    return Promise.resolve({ ok: false, status: 404, json: async () => ({}) });
  };
}

interface FixtureOpts {
  modelsJson?: string;
  opencodeJsonc?: string;
  extDir?: boolean;
  settingsJson?: string;
}

function proxyFixture(opts: FixtureOpts) {
  const dir = mkdtempSync(join(tmpdir(), `stack-check-proxy-${Date.now()}-`));
  const piModelsPath = join(dir, "models.json");
  const opencodeConfigPath = join(dir, "opencode.jsonc");
  const extDir = join(dir, "extensions", "headroom");
  const settingsPath = join(dir, "settings.json");
  if (opts.modelsJson !== undefined)
    writeFileSync(piModelsPath, opts.modelsJson);
  if (opts.opencodeJsonc !== undefined)
    writeFileSync(opencodeConfigPath, opts.opencodeJsonc);
  if (opts.extDir) mkdirSync(extDir, { recursive: true });
  if (opts.settingsJson !== undefined)
    writeFileSync(settingsPath, opts.settingsJson);
  return {
    dir,
    piModelsPath,
    opencodeConfigPath,
    extDir,
    settingsPath,
    cleanup: () => rmSync(dir, { recursive: true, force: true }),
  };
}

const ALL_GREEN_MODELS = JSON.stringify({
  providers: { openrouter: { baseUrl: PI_BASE } },
});
const ALL_GREEN_OPENCODE = JSON.stringify({
  provider: { openrouter: { options: { baseURL: OPENCODE_BASE } } },
});
const ALL_GREEN_SETTINGS = JSON.stringify({
  minContextTokens: 100000,
  minMessageChars: 10000,
});

describe("stack-check proxy doctor (stripJsoncComments + parseJsonc)", () => {
  test("strips // line comments outside strings", () => {
    const out = stripJsoncComments('{\n"a": 1 // comment\n}');
    assert.deepEqual(JSON.parse(out), { a: 1 });
  });

  test("strips /* block comments */", () => {
    const out = stripJsoncComments('{\n/* hi */"a": 1\n}');
    assert.deepEqual(JSON.parse(out), { a: 1 });
  });

  test("preserves // inside string values (URLs)", () => {
    const out = stripJsoncComments(
      '{\n"url": "https://openrouter.ai/api/v1"\n}',
    );
    assert.deepEqual(JSON.parse(out), {
      url: "https://openrouter.ai/api/v1",
    });
  });

  test("preserves // inside strings even with trailing line-comment-like text", () => {
    const out = stripJsoncComments('{\n"u": "http://x // not a comment"\n}');
    assert.deepEqual(JSON.parse(out), { u: "http://x // not a comment" });
  });

  test("parseJsonc parses valid JSONC with mixed comments", () => {
    const v = parseJsonc('{\n// line\n"a":1, /* block */\n"b":"x"\n}') as {
      a: number;
      b: string;
    };
    assert.equal(v.a, 1);
    assert.equal(v.b, "x");
  });

  test("parseJsonc throws on invalid JSON after stripping", () => {
    assert.throws(() => parseJsonc('{\n"a": // bad\n}'));
  });
});

describe("stack-check proxy doctor (pure checks)", () => {
  test("checkProxyHealth passes when ready:true", () => {
    const { check, drift } = checkProxyHealth(
      { status: "healthy", ready: true },
      PROXY_HOST,
    );
    assert.deepEqual(drift, []);
    assert.equal(check.healthy, true);
  });

  test("checkProxyHealth fails when ready:false", () => {
    const { check, drift } = checkProxyHealth(
      { status: "unhealthy", ready: false },
      PROXY_HOST,
    );
    assert.equal(drift.length, 1);
    assert.ok(drift[0].includes("not healthy"));
    assert.equal(check.healthy, false);
  });

  test("checkProxyHealth passes when status:healthy even without ready", () => {
    const { drift } = checkProxyHealth({ status: "healthy" }, PROXY_HOST);
    assert.deepEqual(drift, []);
  });

  test("checkProxyMode passes when summary.mode === cache", () => {
    const { check, drift } = checkProxyMode(
      { summary: { mode: "cache" } },
      "cache",
      PROXY_HOST,
    );
    assert.deepEqual(drift, []);
    assert.equal(check.mode, "cache");
  });

  test("checkProxyMode fails on wrong mode (token)", () => {
    const { check, drift } = checkProxyMode(
      { summary: { mode: "token" } },
      "cache",
      PROXY_HOST,
    );
    assert.equal(drift.length, 1);
    assert.ok(drift[0].includes("mode is 'token'"));
    assert.ok(drift[0].includes("cache"));
    assert.equal(check.mode, "token");
  });

  test("checkProxyMode fails when summary.mode missing", () => {
    const { drift } = checkProxyMode({ summary: {} }, "cache", PROXY_HOST);
    assert.equal(drift.length, 1);
    assert.ok(drift[0].includes("missing summary.mode"));
  });

  test("checkProxyHealth fails on empty object (no ready/status)", () => {
    const { check, drift } = checkProxyHealth({}, PROXY_HOST);
    assert.equal(check.healthy, false);
    assert.equal(drift.length, 1);
  });

  test("checkProxyMode missing summary.mode names a restart fix (launchctl kickstart)", () => {
    const { drift } = checkProxyMode({ summary: {} }, "cache", PROXY_HOST);
    assert.ok(drift[0].includes("launchctl kickstart"));
  });

  test("checkPiModelsConfig passes on correct baseUrl", () => {
    const { drift } = checkPiModelsConfig(
      { providers: { openrouter: { baseUrl: PI_BASE } } },
      PI_BASE,
    );
    assert.deepEqual(drift, []);
  });

  test("checkPiModelsConfig fails on wrong baseUrl", () => {
    const { drift } = checkPiModelsConfig(
      {
        providers: { openrouter: { baseUrl: "https://openrouter.ai/api/v1" } },
      },
      PI_BASE,
    );
    assert.equal(drift.length, 1);
    assert.ok(drift[0].includes("baseUrl is"));
    assert.ok(drift[0].includes("expected"));
  });

  test("checkPiModelsConfig fails on missing baseUrl", () => {
    const { drift } = checkPiModelsConfig(
      { providers: { openrouter: {} } },
      PI_BASE,
    );
    assert.equal(drift.length, 1);
    assert.ok(drift[0].includes("missing"));
  });

  test("checkOpencodeConfig passes on correct baseURL", () => {
    const { drift } = checkOpencodeConfig(
      { provider: { openrouter: { options: { baseURL: OPENCODE_BASE } } } },
      OPENCODE_BASE,
    );
    assert.deepEqual(drift, []);
  });

  test("checkOpencodeConfig fails on wrong baseURL", () => {
    const { drift } = checkOpencodeConfig(
      {
        provider: {
          openrouter: { options: { baseURL: "https://openrouter.ai/api/v1" } },
        },
      },
      OPENCODE_BASE,
    );
    assert.equal(drift.length, 1);
    assert.ok(drift[0].includes("baseURL is"));
    assert.ok(drift[0].includes("expected"));
  });

  test("checkOpencodeConfig fails on missing baseURL", () => {
    const { drift } = checkOpencodeConfig(
      { provider: { openrouter: { options: {} } } },
      OPENCODE_BASE,
    );
    assert.equal(drift.length, 1);
    assert.ok(drift[0].includes("missing"));
  });

  test("checkExtensionPresent passes when dir exists", () => {
    const dir = mkdtempSync(join(tmpdir(), "ext-ok-"));
    const { check, drift } = checkExtensionPresent(dir);
    assert.deepEqual(drift, []);
    assert.equal(check.present, true);
    rmSync(dir, { recursive: true, force: true });
  });

  test("checkExtensionPresent fails when dir missing", () => {
    const missing = join(tmpdir(), `ext-missing-${Date.now()}`);
    const { check, drift } = checkExtensionPresent(missing);
    assert.equal(drift.length, 1);
    assert.ok(drift[0].includes("extension missing"));
    assert.equal(check.present, false);
  });

  test("checkThresholds passes at min values", () => {
    const { drift } = checkThresholds(
      { minContextTokens: 100000, minMessageChars: 10000 },
      100000,
      10000,
    );
    assert.deepEqual(drift, []);
  });

  test("checkThresholds fails when minContextTokens too low", () => {
    const { drift } = checkThresholds(
      { minContextTokens: 20000, minMessageChars: 10000 },
      100000,
      10000,
    );
    assert.equal(
      drift.some((d) => d.includes("minContextTokens is 20000")),
      true,
    );
  });

  test("checkThresholds fails when minMessageChars too low", () => {
    const { drift } = checkThresholds(
      { minContextTokens: 100000, minMessageChars: 0 },
      100000,
      10000,
    );
    assert.equal(
      drift.some((d) => d.includes("minMessageChars is 0")),
      true,
    );
  });

  test("checkThresholds fails when both missing (empty object)", () => {
    const { drift } = checkThresholds({}, 100000, 10000);
    assert.equal(drift.length, 2);
    assert.equal(
      drift.some(
        (d) => d.includes("minContextTokens") && d.includes("missing"),
      ),
      true,
    );
    assert.equal(
      drift.some((d) => d.includes("minMessageChars") && d.includes("missing")),
      true,
    );
  });

  test("checkThresholds fails when values are non-numeric (string)", () => {
    const { drift } = checkThresholds(
      { minContextTokens: "100000", minMessageChars: "10000" } as unknown,
      100000,
      10000,
    );
    assert.equal(drift.length, 2);
  });
});

describe("stack-check proxy doctor (runProxyChecks orchestration)", () => {
  test("all-pass returns empty drift", async () => {
    const f = proxyFixture({
      modelsJson: ALL_GREEN_MODELS,
      opencodeJsonc: ALL_GREEN_OPENCODE,
      extDir: true,
      settingsJson: ALL_GREEN_SETTINGS,
    });
    try {
      const { checks, drift } = await runProxyChecks({
        proxyBaseUrl: PROXY_HOST,
        expectedMode: "cache",
        piExpectedBaseUrl: PI_BASE,
        opencodeExpectedBaseUrl: OPENCODE_BASE,
        piModelsPath: f.piModelsPath,
        opencodeConfigPath: f.opencodeConfigPath,
        extDir: f.extDir,
        settingsPath: f.settingsPath,
        minContextTokens: 100000,
        minMessageChars: 10000,
        fetchFn: makeStubFetch({
          health: { status: "healthy", ready: true },
          stats: { summary: { mode: "cache" } },
        }),
      });
      assert.deepEqual(drift, []);
      assert.ok(checks.proxyHealth);
      assert.ok(checks.proxyMode);
      assert.ok(checks.piModels);
      assert.ok(checks.opencode);
      assert.ok(checks.headroomExtension);
      assert.ok(checks.thresholds);
    } finally {
      f.cleanup();
    }
  });

  test("unhealthy proxy produces a drift naming the fix", async () => {
    const f = proxyFixture({
      modelsJson: ALL_GREEN_MODELS,
      opencodeJsonc: ALL_GREEN_OPENCODE,
      extDir: true,
      settingsJson: ALL_GREEN_SETTINGS,
    });
    try {
      const { drift } = await runProxyChecks({
        proxyBaseUrl: PROXY_HOST,
        expectedMode: "cache",
        piExpectedBaseUrl: PI_BASE,
        opencodeExpectedBaseUrl: OPENCODE_BASE,
        piModelsPath: f.piModelsPath,
        opencodeConfigPath: f.opencodeConfigPath,
        extDir: f.extDir,
        settingsPath: f.settingsPath,
        minContextTokens: 100000,
        minMessageChars: 10000,
        fetchFn: makeStubFetch({
          health: { status: "unhealthy", ready: false },
          stats: { summary: { mode: "cache" } },
        }),
      });
      assert.equal(
        drift.some((d) => d.includes("not healthy")),
        true,
      );
    } finally {
      f.cleanup();
    }
  });

  test("wrong mode (token) produces a drift naming cache", async () => {
    const f = proxyFixture({
      modelsJson: ALL_GREEN_MODELS,
      opencodeJsonc: ALL_GREEN_OPENCODE,
      extDir: true,
      settingsJson: ALL_GREEN_SETTINGS,
    });
    try {
      const { drift } = await runProxyChecks({
        proxyBaseUrl: PROXY_HOST,
        expectedMode: "cache",
        piExpectedBaseUrl: PI_BASE,
        opencodeExpectedBaseUrl: OPENCODE_BASE,
        piModelsPath: f.piModelsPath,
        opencodeConfigPath: f.opencodeConfigPath,
        extDir: f.extDir,
        settingsPath: f.settingsPath,
        minContextTokens: 100000,
        minMessageChars: 10000,
        fetchFn: makeStubFetch({
          health: { status: "healthy", ready: true },
          stats: { summary: { mode: "token" } },
        }),
      });
      assert.equal(
        drift.some((d) => d.includes("mode is 'token'")),
        true,
      );
    } finally {
      f.cleanup();
    }
  });

  test("network failure on /health produces a drift", async () => {
    const f = proxyFixture({
      modelsJson: ALL_GREEN_MODELS,
      opencodeJsonc: ALL_GREEN_OPENCODE,
      extDir: true,
      settingsJson: ALL_GREEN_SETTINGS,
    });
    try {
      const { drift } = await runProxyChecks({
        proxyBaseUrl: PROXY_HOST,
        expectedMode: "cache",
        piExpectedBaseUrl: PI_BASE,
        opencodeExpectedBaseUrl: OPENCODE_BASE,
        piModelsPath: f.piModelsPath,
        opencodeConfigPath: f.opencodeConfigPath,
        extDir: f.extDir,
        settingsPath: f.settingsPath,
        minContextTokens: 100000,
        minMessageChars: 10000,
        fetchFn: makeStubFetch({ healthThrow: true, stats: {} }),
      });
      assert.equal(
        drift.some((d) => d.includes("/health")),
        true,
      );
      assert.equal(
        drift.some((d) => d.includes("cannot reach")),
        true,
      );
    } finally {
      f.cleanup();
    }
  });

  test("network failure on /stats produces a drift", async () => {
    const f = proxyFixture({
      modelsJson: ALL_GREEN_MODELS,
      opencodeJsonc: ALL_GREEN_OPENCODE,
      extDir: true,
      settingsJson: ALL_GREEN_SETTINGS,
    });
    try {
      const { drift } = await runProxyChecks({
        proxyBaseUrl: PROXY_HOST,
        expectedMode: "cache",
        piExpectedBaseUrl: PI_BASE,
        opencodeExpectedBaseUrl: OPENCODE_BASE,
        piModelsPath: f.piModelsPath,
        opencodeConfigPath: f.opencodeConfigPath,
        extDir: f.extDir,
        settingsPath: f.settingsPath,
        minContextTokens: 100000,
        minMessageChars: 10000,
        fetchFn: makeStubFetch({
          health: { status: "healthy", ready: true },
          statsThrow: true,
        }),
      });
      assert.equal(
        drift.some((d) => d.includes("/stats")),
        true,
      );
    } finally {
      f.cleanup();
    }
  });

  test("missing pi models.json produces a drift naming the create fix", async () => {
    const f = proxyFixture({
      opencodeJsonc: ALL_GREEN_OPENCODE,
      extDir: true,
      settingsJson: ALL_GREEN_SETTINGS,
    });
    try {
      const { drift } = await runProxyChecks({
        proxyBaseUrl: PROXY_HOST,
        expectedMode: "cache",
        piExpectedBaseUrl: PI_BASE,
        opencodeExpectedBaseUrl: OPENCODE_BASE,
        piModelsPath: f.piModelsPath,
        opencodeConfigPath: f.opencodeConfigPath,
        extDir: f.extDir,
        settingsPath: f.settingsPath,
        minContextTokens: 100000,
        minMessageChars: 10000,
        fetchFn: makeStubFetch({
          health: { status: "healthy", ready: true },
          stats: { summary: { mode: "cache" } },
        }),
      });
      assert.equal(
        drift.some((d) => d.includes("pi models.json missing")),
        true,
      );
    } finally {
      f.cleanup();
    }
  });

  test("wrong pi baseUrl produces a drift naming the fix", async () => {
    const f = proxyFixture({
      modelsJson: JSON.stringify({
        providers: {
          openrouter: { baseUrl: "https://openrouter.ai/api/v1" },
        },
      }),
      opencodeJsonc: ALL_GREEN_OPENCODE,
      extDir: true,
      settingsJson: ALL_GREEN_SETTINGS,
    });
    try {
      const { drift } = await runProxyChecks({
        proxyBaseUrl: PROXY_HOST,
        expectedMode: "cache",
        piExpectedBaseUrl: PI_BASE,
        opencodeExpectedBaseUrl: OPENCODE_BASE,
        piModelsPath: f.piModelsPath,
        opencodeConfigPath: f.opencodeConfigPath,
        extDir: f.extDir,
        settingsPath: f.settingsPath,
        minContextTokens: 100000,
        minMessageChars: 10000,
        fetchFn: makeStubFetch({
          health: { status: "healthy", ready: true },
          stats: { summary: { mode: "cache" } },
        }),
      });
      assert.equal(
        drift.some((d) => d.includes("baseUrl is")),
        true,
      );
    } finally {
      f.cleanup();
    }
  });

  test("missing opencode config produces a drift naming the create fix", async () => {
    const f = proxyFixture({
      modelsJson: ALL_GREEN_MODELS,
      extDir: true,
      settingsJson: ALL_GREEN_SETTINGS,
    });
    try {
      const { drift } = await runProxyChecks({
        proxyBaseUrl: PROXY_HOST,
        expectedMode: "cache",
        piExpectedBaseUrl: PI_BASE,
        opencodeExpectedBaseUrl: OPENCODE_BASE,
        piModelsPath: f.piModelsPath,
        opencodeConfigPath: f.opencodeConfigPath,
        extDir: f.extDir,
        settingsPath: f.settingsPath,
        minContextTokens: 100000,
        minMessageChars: 10000,
        fetchFn: makeStubFetch({
          health: { status: "healthy", ready: true },
          stats: { summary: { mode: "cache" } },
        }),
      });
      assert.equal(
        drift.some((d) => d.includes("opencode config missing")),
        true,
      );
    } finally {
      f.cleanup();
    }
  });

  test("wrong opencode baseURL produces a drift naming the fix", async () => {
    const f = proxyFixture({
      modelsJson: ALL_GREEN_MODELS,
      opencodeJsonc: JSON.stringify({
        provider: {
          openrouter: {
            options: { baseURL: "https://openrouter.ai/api/v1" },
          },
        },
      }),
      extDir: true,
      settingsJson: ALL_GREEN_SETTINGS,
    });
    try {
      const { drift } = await runProxyChecks({
        proxyBaseUrl: PROXY_HOST,
        expectedMode: "cache",
        piExpectedBaseUrl: PI_BASE,
        opencodeExpectedBaseUrl: OPENCODE_BASE,
        piModelsPath: f.piModelsPath,
        opencodeConfigPath: f.opencodeConfigPath,
        extDir: f.extDir,
        settingsPath: f.settingsPath,
        minContextTokens: 100000,
        minMessageChars: 10000,
        fetchFn: makeStubFetch({
          health: { status: "healthy", ready: true },
          stats: { summary: { mode: "cache" } },
        }),
      });
      assert.equal(
        drift.some((d) => d.includes("baseURL is")),
        true,
      );
    } finally {
      f.cleanup();
    }
  });

  test("missing extension dir produces a drift naming the restore fix", async () => {
    const f = proxyFixture({
      modelsJson: ALL_GREEN_MODELS,
      opencodeJsonc: ALL_GREEN_OPENCODE,
      extDir: false,
      settingsJson: ALL_GREEN_SETTINGS,
    });
    try {
      const { drift } = await runProxyChecks({
        proxyBaseUrl: PROXY_HOST,
        expectedMode: "cache",
        piExpectedBaseUrl: PI_BASE,
        opencodeExpectedBaseUrl: OPENCODE_BASE,
        piModelsPath: f.piModelsPath,
        opencodeConfigPath: f.opencodeConfigPath,
        extDir: f.extDir,
        settingsPath: f.settingsPath,
        minContextTokens: 100000,
        minMessageChars: 10000,
        fetchFn: makeStubFetch({
          health: { status: "healthy", ready: true },
          stats: { summary: { mode: "cache" } },
        }),
      });
      assert.equal(
        drift.some((d) => d.includes("extension missing")),
        true,
      );
    } finally {
      f.cleanup();
    }
  });

  test("missing settings.json produces a drift naming the create fix", async () => {
    const f = proxyFixture({
      modelsJson: ALL_GREEN_MODELS,
      opencodeJsonc: ALL_GREEN_OPENCODE,
      extDir: true,
    });
    try {
      const { drift } = await runProxyChecks({
        proxyBaseUrl: PROXY_HOST,
        expectedMode: "cache",
        piExpectedBaseUrl: PI_BASE,
        opencodeExpectedBaseUrl: OPENCODE_BASE,
        piModelsPath: f.piModelsPath,
        opencodeConfigPath: f.opencodeConfigPath,
        extDir: f.extDir,
        settingsPath: f.settingsPath,
        minContextTokens: 100000,
        minMessageChars: 10000,
        fetchFn: makeStubFetch({
          health: { status: "healthy", ready: true },
          stats: { summary: { mode: "cache" } },
        }),
      });
      assert.equal(
        drift.some((d) => d.includes("settings missing")),
        true,
      );
    } finally {
      f.cleanup();
    }
  });

  test("wrong thresholds produce a drift naming the raise fix", async () => {
    const f = proxyFixture({
      modelsJson: ALL_GREEN_MODELS,
      opencodeJsonc: ALL_GREEN_OPENCODE,
      extDir: true,
      settingsJson: JSON.stringify({
        minContextTokens: 50000,
        minMessageChars: 500,
      }),
    });
    try {
      const { drift } = await runProxyChecks({
        proxyBaseUrl: PROXY_HOST,
        expectedMode: "cache",
        piExpectedBaseUrl: PI_BASE,
        opencodeExpectedBaseUrl: OPENCODE_BASE,
        piModelsPath: f.piModelsPath,
        opencodeConfigPath: f.opencodeConfigPath,
        extDir: f.extDir,
        settingsPath: f.settingsPath,
        minContextTokens: 100000,
        minMessageChars: 10000,
        fetchFn: makeStubFetch({
          health: { status: "healthy", ready: true },
          stats: { summary: { mode: "cache" } },
        }),
      });
      assert.equal(
        drift.some((d) => d.includes("minContextTokens is 50000")),
        true,
      );
      assert.equal(
        drift.some((d) => d.includes("minMessageChars is 500")),
        true,
      );
    } finally {
      f.cleanup();
    }
  });

  test("JSON parse error on pi models.json produces a drift", async () => {
    const f = proxyFixture({
      modelsJson: "{ broken json",
      opencodeJsonc: ALL_GREEN_OPENCODE,
      extDir: true,
      settingsJson: ALL_GREEN_SETTINGS,
    });
    try {
      const { drift } = await runProxyChecks({
        proxyBaseUrl: PROXY_HOST,
        expectedMode: "cache",
        piExpectedBaseUrl: PI_BASE,
        opencodeExpectedBaseUrl: OPENCODE_BASE,
        piModelsPath: f.piModelsPath,
        opencodeConfigPath: f.opencodeConfigPath,
        extDir: f.extDir,
        settingsPath: f.settingsPath,
        minContextTokens: 100000,
        minMessageChars: 10000,
        fetchFn: makeStubFetch({
          health: { status: "healthy", ready: true },
          stats: { summary: { mode: "cache" } },
        }),
      });
      assert.equal(
        drift.some(
          (d) => d.includes("cannot parse") && d.includes("models.json"),
        ),
        true,
      );
    } finally {
      f.cleanup();
    }
  });

  test("JSONC parse error on opencode config produces a drift", async () => {
    const f = proxyFixture({
      modelsJson: ALL_GREEN_MODELS,
      opencodeJsonc: "{ broken",
      extDir: true,
      settingsJson: ALL_GREEN_SETTINGS,
    });
    try {
      const { drift } = await runProxyChecks({
        proxyBaseUrl: PROXY_HOST,
        expectedMode: "cache",
        piExpectedBaseUrl: PI_BASE,
        opencodeExpectedBaseUrl: OPENCODE_BASE,
        piModelsPath: f.piModelsPath,
        opencodeConfigPath: f.opencodeConfigPath,
        extDir: f.extDir,
        settingsPath: f.settingsPath,
        minContextTokens: 100000,
        minMessageChars: 10000,
        fetchFn: makeStubFetch({
          health: { status: "healthy", ready: true },
          stats: { summary: { mode: "cache" } },
        }),
      });
      assert.equal(
        drift.some((d) => d.includes("cannot parse") && d.includes("opencode")),
        true,
      );
    } finally {
      f.cleanup();
    }
  });

  test("JSON parse error on settings.json produces a drift", async () => {
    const f = proxyFixture({
      modelsJson: ALL_GREEN_MODELS,
      opencodeJsonc: ALL_GREEN_OPENCODE,
      extDir: true,
      settingsJson: "{ broken",
    });
    try {
      const { drift } = await runProxyChecks({
        proxyBaseUrl: PROXY_HOST,
        expectedMode: "cache",
        piExpectedBaseUrl: PI_BASE,
        opencodeExpectedBaseUrl: OPENCODE_BASE,
        piModelsPath: f.piModelsPath,
        opencodeConfigPath: f.opencodeConfigPath,
        extDir: f.extDir,
        settingsPath: f.settingsPath,
        minContextTokens: 100000,
        minMessageChars: 10000,
        fetchFn: makeStubFetch({
          health: { status: "healthy", ready: true },
          stats: { summary: { mode: "cache" } },
        }),
      });
      assert.equal(
        drift.some((d) => d.includes("cannot parse") && d.includes("settings")),
        true,
      );
    } finally {
      f.cleanup();
    }
  });

  test("opencode JSONC with comments parses correctly (real-world shape)", async () => {
    const f = proxyFixture({
      modelsJson: ALL_GREEN_MODELS,
      opencodeJsonc: `{
  // opencode config
  "provider": {
    "openrouter": {
      "options": {
        "baseURL": "${OPENCODE_BASE}" /* inline */
      }
    }
  }
}`,
      extDir: true,
      settingsJson: ALL_GREEN_SETTINGS,
    });
    try {
      const { drift } = await runProxyChecks({
        proxyBaseUrl: PROXY_HOST,
        expectedMode: "cache",
        piExpectedBaseUrl: PI_BASE,
        opencodeExpectedBaseUrl: OPENCODE_BASE,
        piModelsPath: f.piModelsPath,
        opencodeConfigPath: f.opencodeConfigPath,
        extDir: f.extDir,
        settingsPath: f.settingsPath,
        minContextTokens: 100000,
        minMessageChars: 10000,
        fetchFn: makeStubFetch({
          health: { status: "healthy", ready: true },
          stats: { summary: { mode: "cache" } },
        }),
      });
      assert.deepEqual(drift, []);
    } finally {
      f.cleanup();
    }
  });

  // --- Fix 1: HTTP >= 400 must not say "start it" ---

  test("HTTP 500 on /health produces a drift naming proxy logs, not 'start it'", async () => {
    const f = proxyFixture({
      modelsJson: ALL_GREEN_MODELS,
      opencodeJsonc: ALL_GREEN_OPENCODE,
      extDir: true,
      settingsJson: ALL_GREEN_SETTINGS,
    });
    try {
      const { drift } = await runProxyChecks({
        proxyBaseUrl: PROXY_HOST,
        expectedMode: "cache",
        piExpectedBaseUrl: PI_BASE,
        opencodeExpectedBaseUrl: OPENCODE_BASE,
        piModelsPath: f.piModelsPath,
        opencodeConfigPath: f.opencodeConfigPath,
        extDir: f.extDir,
        settingsPath: f.settingsPath,
        minContextTokens: 100000,
        minMessageChars: 10000,
        fetchFn: makeStubFetch({
          healthStatus: 500,
          stats: { summary: { mode: "cache" } },
        }),
      });
      assert.equal(
        drift.some((d) => d.includes("HTTP 500")),
        true,
      );
      assert.equal(
        drift.some((d) => d.includes("start it")),
        false,
      );
      assert.equal(
        drift.some((d) => d.includes("launchctl load")),
        false,
      );
    } finally {
      f.cleanup();
    }
  });

  test("HTTP 503 on /stats produces a drift naming proxy logs, not 'start it'", async () => {
    const f = proxyFixture({
      modelsJson: ALL_GREEN_MODELS,
      opencodeJsonc: ALL_GREEN_OPENCODE,
      extDir: true,
      settingsJson: ALL_GREEN_SETTINGS,
    });
    try {
      const { drift } = await runProxyChecks({
        proxyBaseUrl: PROXY_HOST,
        expectedMode: "cache",
        piExpectedBaseUrl: PI_BASE,
        opencodeExpectedBaseUrl: OPENCODE_BASE,
        piModelsPath: f.piModelsPath,
        opencodeConfigPath: f.opencodeConfigPath,
        extDir: f.extDir,
        settingsPath: f.settingsPath,
        minContextTokens: 100000,
        minMessageChars: 10000,
        fetchFn: makeStubFetch({
          health: { status: "healthy", ready: true },
          statsStatus: 503,
        }),
      });
      assert.equal(
        drift.some((d) => d.includes("HTTP 503")),
        true,
      );
      assert.equal(
        drift.some((d) => d.includes("start it")),
        false,
      );
      assert.equal(
        drift.some((d) => d.includes("launchctl load")),
        false,
      );
    } finally {
      f.cleanup();
    }
  });

  // --- Fix 3: null-parse silent pass ---

  test("null body on /health produces 'invalid structure' drift", async () => {
    const f = proxyFixture({
      modelsJson: ALL_GREEN_MODELS,
      opencodeJsonc: ALL_GREEN_OPENCODE,
      extDir: true,
      settingsJson: ALL_GREEN_SETTINGS,
    });
    try {
      const { drift } = await runProxyChecks({
        proxyBaseUrl: PROXY_HOST,
        expectedMode: "cache",
        piExpectedBaseUrl: PI_BASE,
        opencodeExpectedBaseUrl: OPENCODE_BASE,
        piModelsPath: f.piModelsPath,
        opencodeConfigPath: f.opencodeConfigPath,
        extDir: f.extDir,
        settingsPath: f.settingsPath,
        minContextTokens: 100000,
        minMessageChars: 10000,
        fetchFn: makeStubFetch({
          health: null,
          stats: { summary: { mode: "cache" } },
        }),
      });
      assert.equal(
        drift.some((d) => d.includes("invalid structure")),
        true,
      );
    } finally {
      f.cleanup();
    }
  });

  test("null body on /stats produces 'invalid structure' drift", async () => {
    const f = proxyFixture({
      modelsJson: ALL_GREEN_MODELS,
      opencodeJsonc: ALL_GREEN_OPENCODE,
      extDir: true,
      settingsJson: ALL_GREEN_SETTINGS,
    });
    try {
      const { drift } = await runProxyChecks({
        proxyBaseUrl: PROXY_HOST,
        expectedMode: "cache",
        piExpectedBaseUrl: PI_BASE,
        opencodeExpectedBaseUrl: OPENCODE_BASE,
        piModelsPath: f.piModelsPath,
        opencodeConfigPath: f.opencodeConfigPath,
        extDir: f.extDir,
        settingsPath: f.settingsPath,
        minContextTokens: 100000,
        minMessageChars: 10000,
        fetchFn: makeStubFetch({
          health: { status: "healthy", ready: true },
          stats: null,
        }),
      });
      assert.equal(
        drift.some((d) => d.includes("invalid structure")),
        true,
      );
    } finally {
      f.cleanup();
    }
  });

  test("null in pi models.json produces 'invalid structure' drift (no silent pass)", async () => {
    const f = proxyFixture({
      modelsJson: "null",
      opencodeJsonc: ALL_GREEN_OPENCODE,
      extDir: true,
      settingsJson: ALL_GREEN_SETTINGS,
    });
    try {
      const { drift } = await runProxyChecks({
        proxyBaseUrl: PROXY_HOST,
        expectedMode: "cache",
        piExpectedBaseUrl: PI_BASE,
        opencodeExpectedBaseUrl: OPENCODE_BASE,
        piModelsPath: f.piModelsPath,
        opencodeConfigPath: f.opencodeConfigPath,
        extDir: f.extDir,
        settingsPath: f.settingsPath,
        minContextTokens: 100000,
        minMessageChars: 10000,
        fetchFn: makeStubFetch({
          health: { status: "healthy", ready: true },
          stats: { summary: { mode: "cache" } },
        }),
      });
      assert.equal(
        drift.some((d) => d.includes("invalid structure")),
        true,
      );
    } finally {
      f.cleanup();
    }
  });

  test("null in opencode config produces 'invalid structure' drift (no silent pass)", async () => {
    const f = proxyFixture({
      modelsJson: ALL_GREEN_MODELS,
      opencodeJsonc: "null",
      extDir: true,
      settingsJson: ALL_GREEN_SETTINGS,
    });
    try {
      const { drift } = await runProxyChecks({
        proxyBaseUrl: PROXY_HOST,
        expectedMode: "cache",
        piExpectedBaseUrl: PI_BASE,
        opencodeExpectedBaseUrl: OPENCODE_BASE,
        piModelsPath: f.piModelsPath,
        opencodeConfigPath: f.opencodeConfigPath,
        extDir: f.extDir,
        settingsPath: f.settingsPath,
        minContextTokens: 100000,
        minMessageChars: 10000,
        fetchFn: makeStubFetch({
          health: { status: "healthy", ready: true },
          stats: { summary: { mode: "cache" } },
        }),
      });
      assert.equal(
        drift.some((d) => d.includes("invalid structure")),
        true,
      );
    } finally {
      f.cleanup();
    }
  });

  test("null in settings.json produces 'invalid structure' drift (no silent pass)", async () => {
    const f = proxyFixture({
      modelsJson: ALL_GREEN_MODELS,
      opencodeJsonc: ALL_GREEN_OPENCODE,
      extDir: true,
      settingsJson: "null",
    });
    try {
      const { drift } = await runProxyChecks({
        proxyBaseUrl: PROXY_HOST,
        expectedMode: "cache",
        piExpectedBaseUrl: PI_BASE,
        opencodeExpectedBaseUrl: OPENCODE_BASE,
        piModelsPath: f.piModelsPath,
        opencodeConfigPath: f.opencodeConfigPath,
        extDir: f.extDir,
        settingsPath: f.settingsPath,
        minContextTokens: 100000,
        minMessageChars: 10000,
        fetchFn: makeStubFetch({
          health: { status: "healthy", ready: true },
          stats: { summary: { mode: "cache" } },
        }),
      });
      assert.equal(
        drift.some((d) => d.includes("invalid structure")),
        true,
      );
    } finally {
      f.cleanup();
    }
  });

  // --- Fix 4: unreachable proxy leaves no checks entry ---

  test("network failure on /health records checks.proxyHealth with reachable:false", async () => {
    const f = proxyFixture({
      modelsJson: ALL_GREEN_MODELS,
      opencodeJsonc: ALL_GREEN_OPENCODE,
      extDir: true,
      settingsJson: ALL_GREEN_SETTINGS,
    });
    try {
      const { checks, drift } = await runProxyChecks({
        proxyBaseUrl: PROXY_HOST,
        expectedMode: "cache",
        piExpectedBaseUrl: PI_BASE,
        opencodeExpectedBaseUrl: OPENCODE_BASE,
        piModelsPath: f.piModelsPath,
        opencodeConfigPath: f.opencodeConfigPath,
        extDir: f.extDir,
        settingsPath: f.settingsPath,
        minContextTokens: 100000,
        minMessageChars: 10000,
        fetchFn: makeStubFetch({
          healthThrow: true,
          stats: { summary: { mode: "cache" } },
        }),
      });
      assert.equal(
        drift.some((d) => d.includes("/health")),
        true,
      );
      assert.equal(
        drift.some((d) => d.includes("cannot reach")),
        true,
      );
      assert.equal(
        (checks.proxyHealth as Record<string, unknown>).reachable,
        false,
      );
    } finally {
      f.cleanup();
    }
  });

  test("network failure on /stats records checks.proxyMode with reachable:false", async () => {
    const f = proxyFixture({
      modelsJson: ALL_GREEN_MODELS,
      opencodeJsonc: ALL_GREEN_OPENCODE,
      extDir: true,
      settingsJson: ALL_GREEN_SETTINGS,
    });
    try {
      const { checks, drift } = await runProxyChecks({
        proxyBaseUrl: PROXY_HOST,
        expectedMode: "cache",
        piExpectedBaseUrl: PI_BASE,
        opencodeExpectedBaseUrl: OPENCODE_BASE,
        piModelsPath: f.piModelsPath,
        opencodeConfigPath: f.opencodeConfigPath,
        extDir: f.extDir,
        settingsPath: f.settingsPath,
        minContextTokens: 100000,
        minMessageChars: 10000,
        fetchFn: makeStubFetch({
          health: { status: "healthy", ready: true },
          statsThrow: true,
        }),
      });
      assert.equal(
        drift.some((d) => d.includes("/stats")),
        true,
      );
      assert.equal(
        (checks.proxyMode as Record<string, unknown>).reachable,
        false,
      );
    } finally {
      f.cleanup();
    }
  });
});

describe("stack-check proxy doctor (CLI --proxy)", () => {
  const proxyEnv = (
    f: ReturnType<typeof proxyFixture>,
  ): Record<string, string> => ({
    HOME: makeStackHome(),
    STACK_CHECK_PI_DIR: f.dir,
    STACK_CHECK_OPENCODE_CONFIG: f.opencodeConfigPath,
    STACK_CHECK_HEADROOM_EXT: f.extDir,
    STACK_CHECK_HEADROOM_SETTINGS: f.settingsPath,
    STACK_CHECK_PI_BASE_URL: PI_BASE,
    STACK_CHECK_OPENCODE_BASE_URL: OPENCODE_BASE,
  });

  test("--help mentions --proxy", () => {
    const r = run(["--help"]);
    assert.equal(r.status, 0);
    assert.ok(r.stdout.includes("--proxy"));
  });

  test("--help mentions proxy report default filename stack-check-proxy-<date>.json", () => {
    const r = run(["--help"]);
    assert.equal(r.status, 0);
    assert.ok(r.stdout.includes("stack-check-proxy-"));
  });

  test("--help notes independent base URL env tracking", () => {
    const r = run(["--help"]);
    assert.equal(r.status, 0);
    assert.ok(r.stdout.includes("track independently"));
  });

  test("--proxy with all-green env-overridden configs writes a structured report", () => {
    const f = proxyFixture({
      modelsJson: ALL_GREEN_MODELS,
      opencodeJsonc: ALL_GREEN_OPENCODE,
      extDir: true,
      settingsJson: ALL_GREEN_SETTINGS,
    });
    const reportPath = join(
      tmpdir(),
      `stack-check-proxy-cli-${Date.now()}.json`,
    );
    try {
      const r = run(
        ["--proxy", "--no-notify", "--json", reportPath],
        proxyEnv(f),
      );
      // Proxy may be up (0) or down (1); both are valid report outcomes.
      assert.ok([0, 1].includes(r.status as number));
      assert.ok(r.stdout.includes("report:"));
      assert.equal(existsSync(reportPath), true);
      const report = JSON.parse(readFileSync(reportPath, "utf8")) as {
        checks: Record<string, unknown>;
        drift: string[];
      };
      assert.ok(Object.hasOwn(report.checks, "proxyHealth"));
      assert.ok(Object.hasOwn(report.checks, "proxyMode"));
      assert.ok(Object.hasOwn(report.checks, "piModels"));
      assert.ok(Object.hasOwn(report.checks, "opencode"));
      assert.ok(Object.hasOwn(report.checks, "headroomExtension"));
      assert.ok(Object.hasOwn(report.checks, "thresholds"));
      assert.equal(Array.isArray(report.drift), true);
    } finally {
      f.cleanup();
      rmSync(reportPath, { force: true });
    }
  });

  test("--proxy with broken pi config exits 1 and names the fix", () => {
    const f = proxyFixture({
      modelsJson: JSON.stringify({
        providers: { openrouter: { baseUrl: "https://wrong.example/v1" } },
      }),
      opencodeJsonc: ALL_GREEN_OPENCODE,
      extDir: true,
      settingsJson: ALL_GREEN_SETTINGS,
    });
    const reportPath = join(
      tmpdir(),
      `stack-check-proxy-bad-${Date.now()}.json`,
    );
    try {
      const r = run(
        ["--proxy", "--no-notify", "--json", reportPath],
        proxyEnv(f),
      );
      // pi baseUrl wrong is a guaranteed drift; proxy may add more.
      assert.equal(r.status, 1);
      assert.equal(existsSync(reportPath), true);
      const report = JSON.parse(readFileSync(reportPath, "utf8")) as {
        drift: string[];
      };
      assert.equal(
        report.drift.some((d) => d.includes("baseUrl is")),
        true,
      );
    } finally {
      f.cleanup();
      rmSync(reportPath, { force: true });
    }
  });
});

// ---------------------------------------------------------------------------
// stack-check config drift + pointer checks (TASK-23 ACs #5 and #10)
// ---------------------------------------------------------------------------

function makeConfigFixture(opts: {
  tracked?: Record<string, string>;
  live?: Record<string, string>;
  manifestFiles?: Record<string, string>;
  exclusions?: string[];
  manifestContent?: string;
}) {
  const dir = join(
    tmpdir(),
    `stack-check-config-${Date.now()}-${Math.random().toString(36).slice(2)}`,
  );
  const trackedRoot = join(dir, "tracked");
  const liveRoot = join(dir, "live");
  mkdirSync(join(trackedRoot, "config", "agents"), { recursive: true });
  mkdirSync(join(liveRoot, "agents"), { recursive: true });
  for (const rel of [
    ...Object.keys(opts.tracked ?? {}),
    ...Object.keys(opts.live ?? {}),
  ]) {
    mkdirSync(dirname(join(trackedRoot, rel)), { recursive: true });
    mkdirSync(dirname(join(liveRoot, rel)), { recursive: true });
  }
  for (const [rel, content] of Object.entries(opts.tracked ?? {})) {
    writeFileSync(join(trackedRoot, rel), content);
  }
  for (const [rel, content] of Object.entries(opts.live ?? {})) {
    writeFileSync(join(liveRoot, rel), content);
  }
  // production layout: the manifest lives at <root>/config/harnesses/opencode.json
  // and the tracked root is the manifest's trackedRoot resolved against <root>
  // (trackedRoot "." -> <root> itself), mirroring config-sync's defaults.
  const manifestPath = join(
    trackedRoot,
    "config",
    "harnesses",
    "opencode.json",
  );
  mkdirSync(join(trackedRoot, "config", "harnesses"), { recursive: true });
  writeFileSync(
    manifestPath,
    opts.manifestContent ??
      JSON.stringify({
        version: 1,
        harness: "opencode",
        liveRoot: liveRoot,
        trackedRoot: ".",
        files: opts.manifestFiles ?? {
          "AGENTS.md": "AGENTS.md",
          "agents/a.md": "config/agents/a.md",
        },
        exclusions: opts.exclusions ?? ["secrets/"],
        pluginsDeferral: true,
      }),
  );
  return {
    dir,
    trackedRoot,
    liveRoot,
    manifestPath,
    cleanup: () => rmSync(dir, { recursive: true, force: true }),
  };
}

describe("checkConfigDrift (config/ vs live per harness manifest)", () => {
  test("no drift when every manifest file matches byte-for-byte", () => {
    const f = makeConfigFixture({
      tracked: { "AGENTS.md": "thin\n", "config/agents/a.md": "a\n" },
      live: { "AGENTS.md": "thin\n", "agents/a.md": "a\n" },
    });
    try {
      const { drift, check } = checkConfigDrift({
        trackedRoot: f.trackedRoot,
        liveRoot: f.liveRoot,
        harnessManifestPath: f.manifestPath,
      });
      assert.deepEqual(drift, []);
      assert.equal(
        check.files["AGENTS.md"].tracked,
        createHash("sha256").update("thin\n").digest("hex"),
      );
    } finally {
      f.cleanup();
    }
  });

  test("tracked edited: drift names the file and both fixes (re-materialize OR commit)", () => {
    const f = makeConfigFixture({
      tracked: { "AGENTS.md": "tracked-edited\n", "config/agents/a.md": "a\n" },
      live: { "AGENTS.md": "live\n", "agents/a.md": "a\n" },
    });
    try {
      const { drift } = checkConfigDrift({
        trackedRoot: f.trackedRoot,
        liveRoot: f.liveRoot,
        harnessManifestPath: f.manifestPath,
      });
      assert.equal(drift.length, 1);
      assert.ok(drift[0].includes("AGENTS.md"));
      assert.ok(drift[0].includes("weavelog sync"));
      assert.ok(drift[0].includes("commit"));
    } finally {
      f.cleanup();
    }
  });

  test("live edited: drift names the file with both fixes", () => {
    const f = makeConfigFixture({
      tracked: { "AGENTS.md": "tracked\n", "config/agents/a.md": "a\n" },
      live: { "AGENTS.md": "live-edited\n", "agents/a.md": "a\n" },
    });
    try {
      const { drift } = checkConfigDrift({
        trackedRoot: f.trackedRoot,
        liveRoot: f.liveRoot,
        harnessManifestPath: f.manifestPath,
      });
      assert.equal(drift.length, 1);
      assert.ok(drift[0].includes("AGENTS.md"));
      assert.ok(drift[0].includes("weavelog sync"));
      assert.ok(drift[0].includes("commit"));
    } finally {
      f.cleanup();
    }
  });

  test("tracked file missing: drift names the missing tracked path", () => {
    const f = makeConfigFixture({
      tracked: { "config/agents/a.md": "a\n" },
      live: { "AGENTS.md": "live\n", "agents/a.md": "a\n" },
    });
    try {
      const { drift } = checkConfigDrift({
        trackedRoot: f.trackedRoot,
        liveRoot: f.liveRoot,
        harnessManifestPath: f.manifestPath,
      });
      assert.equal(drift.length, 1);
      assert.ok(drift[0].includes("AGENTS.md"));
    } finally {
      f.cleanup();
    }
  });

  test("live file missing: drift names the missing live path", () => {
    const f = makeConfigFixture({
      tracked: { "AGENTS.md": "tracked\n", "config/agents/a.md": "a\n" },
      live: { "agents/a.md": "a\n" },
    });
    try {
      const { drift } = checkConfigDrift({
        trackedRoot: f.trackedRoot,
        liveRoot: f.liveRoot,
        harnessManifestPath: f.manifestPath,
      });
      assert.equal(drift.length, 1);
      assert.ok(drift[0].includes("AGENTS.md"));
    } finally {
      f.cleanup();
    }
  });

  test("harness manifest missing: drift names the manifest path", () => {
    const f = makeConfigFixture({
      tracked: { "AGENTS.md": "tracked\n" },
      live: { "AGENTS.md": "live\n" },
    });
    try {
      rmSync(f.manifestPath);
      const { drift } = checkConfigDrift({
        trackedRoot: f.trackedRoot,
        liveRoot: f.liveRoot,
        harnessManifestPath: f.manifestPath,
      });
      assert.equal(drift.length, 1);
      assert.ok(drift[0].includes("harness manifest"));
      assert.ok(drift[0].includes(f.manifestPath));
    } finally {
      f.cleanup();
    }
  });

  test("unparseable harness manifest: drift", () => {
    const f = makeConfigFixture({
      tracked: { "AGENTS.md": "tracked\n" },
      live: { "AGENTS.md": "live\n" },
      manifestContent: "{ broken\n",
    });
    try {
      const { drift } = checkConfigDrift({
        trackedRoot: f.trackedRoot,
        liveRoot: f.liveRoot,
        harnessManifestPath: f.manifestPath,
      });
      assert.equal(drift.length, 1);
      assert.ok(drift[0].includes("unparseable"));
    } finally {
      f.cleanup();
    }
  });

  test("excluded manifest rels are skipped: no drift even when bytes differ", () => {
    const f = makeConfigFixture({
      tracked: {
        "AGENTS.md": "tracked\n",
        "config/agents/a.md": "a\n",
        "secrets/leak.json": "tracked-secret\n",
      },
      live: {
        "AGENTS.md": "tracked\n",
        "agents/a.md": "a\n",
        "secrets/leak.json": "live-secret\n",
      },
      manifestFiles: {
        "AGENTS.md": "AGENTS.md",
        "agents/a.md": "config/agents/a.md",
        "secrets/leak.json": "secrets/leak.json",
      },
    });
    try {
      const { drift, check } = checkConfigDrift({
        trackedRoot: f.trackedRoot,
        liveRoot: f.liveRoot,
        harnessManifestPath: f.manifestPath,
      });
      // the excluded file differs but must never surface as drift
      assert.deepEqual(drift, []);
      assert.ok(check.files["secrets/leak.json"]);
    } finally {
      f.cleanup();
    }
  });

  test("agents/../secrets/x normalizes to secrets/x and is excluded by checkConfigDrift", () => {
    const f = makeConfigFixture({
      tracked: {
        "AGENTS.md": "tracked\n",
        "config/agents/a.md": "a\n",
        "secrets/x.json": "t\n",
      },
      live: {
        "AGENTS.md": "tracked\n",
        "agents/a.md": "a\n",
        "secrets/x.json": "l\n",
      },
      manifestFiles: {
        "AGENTS.md": "AGENTS.md",
        "agents/a.md": "config/agents/a.md",
        "agents/../secrets/x.json": "agents/../secrets/x.json",
      },
    });
    try {
      const { drift } = checkConfigDrift({
        trackedRoot: f.trackedRoot,
        liveRoot: f.liveRoot,
        harnessManifestPath: f.manifestPath,
      });
      // normalized to secrets/x -> excluded -> no drift despite byte difference
      assert.deepEqual(drift, []);
    } finally {
      f.cleanup();
    }
  });

  test("manifest rel escaping the roots: drift entry naming the escape, legit entries unaffected", () => {
    const f = makeConfigFixture({
      tracked: { "AGENTS.md": "tracked\n", "config/agents/a.md": "a\n" },
      live: { "AGENTS.md": "tracked\n", "agents/a.md": "a\n" },
      manifestFiles: {
        "AGENTS.md": "AGENTS.md",
        "agents/a.md": "config/agents/a.md",
        "../escape.txt": "../escape.txt",
      },
    });
    try {
      const { drift } = checkConfigDrift({
        trackedRoot: f.trackedRoot,
        liveRoot: f.liveRoot,
        harnessManifestPath: f.manifestPath,
      });
      assert.equal(
        drift.some((d) => d.includes("escape.txt") && d.includes("escapes")),
        true,
      );
      // legit in-root entries must not be flagged
      assert.equal(
        drift.some(
          (d) => d.includes("AGENTS.md") && d.includes("config drift"),
        ),
        false,
      );
    } finally {
      f.cleanup();
    }
  });

  test("drift fix hint names the weavelog sync surface, not cwd-relative", () => {
    const f = makeConfigFixture({
      tracked: { "AGENTS.md": "tracked-edited\n", "config/agents/a.md": "a\n" },
      live: { "AGENTS.md": "live\n", "agents/a.md": "a\n" },
    });
    try {
      const { drift } = checkConfigDrift({
        trackedRoot: f.trackedRoot,
        liveRoot: f.liveRoot,
        harnessManifestPath: f.manifestPath,
      });
      assert.ok(drift[0].includes("weavelog sync"));
      // the old author-instance hint form is gone
      assert.ok(!drift[0].includes("bin/src/config-sync.ts"));
    } finally {
      f.cleanup();
    }
  });
});

describe("checkPointerTargets (thin global AGENTS.md pointer validation, AC #10)", () => {
  test("backtick-quoted existing ~/ and / targets: no drift", () => {
    const home = join(tmpdir(), `stack-check-ptr-home-${Date.now()}`);
    mkdirSync(join(home, "exists"), { recursive: true });
    try {
      const content = "read `~/exists` and `/etc/hosts` now";
      const { drift } = checkPointerTargets(content, "/fake/AGENTS.md", home);
      assert.deepEqual(drift, []);
    } finally {
      rmSync(home, { recursive: true, force: true });
    }
  });

  test("missing pointer target: drift names source file, expanded path, both fixes", () => {
    const home = join(tmpdir(), `stack-check-ptr-missing-${Date.now()}`);
    mkdirSync(home, { recursive: true });
    try {
      const content = "see `~/nope/not-here`";
      const { drift, check } = checkPointerTargets(
        content,
        "/Users/x/.config/opencode/AGENTS.md",
        home,
      );
      assert.equal(drift.length, 1);
      assert.ok(drift[0].includes("AGENTS.md"));
      assert.ok(drift[0].includes(join(home, "nope", "not-here")));
      assert.ok(drift[0].includes("weavelog sync"));
      assert.ok(drift[0].includes("commit"));
      assert.equal(check.pointers[0].exists, false);
    } finally {
      rmSync(home, { recursive: true, force: true });
    }
  });

  test("ignores unquoted paths and backtick-quoted relative paths", () => {
    const home = join(tmpdir(), `stack-check-ptr-ignore-${Date.now()}`);
    mkdirSync(home, { recursive: true });
    try {
      const content =
        "read ~/unquoted and `relative/path` but not ~/quoted-either";
      const { drift, check } = checkPointerTargets(
        content,
        "/fake/AGENTS.md",
        home,
      );
      assert.deepEqual(drift, []);
      assert.deepEqual(check.pointers, []);
    } finally {
      rmSync(home, { recursive: true, force: true });
    }
  });
});

describe("stack-check config drift (CLI wiring, env overrides)", () => {
  test("drifted config file appears in the report with both fixes", () => {
    const f = makeConfigFixture({
      tracked: { "AGENTS.md": "tracked\n", "config/agents/a.md": "a\n" },
      live: { "AGENTS.md": "drifted-live\n", "agents/a.md": "a\n" },
    });
    const reportPath = join(
      tmpdir(),
      `stack-check-config-cli-${Date.now()}.json`,
    );
    try {
      const { r, home } = stackRun(["--no-notify", "--json", reportPath], {
        STACK_CHECK_CONFIG_DIR: f.trackedRoot,
        STACK_CHECK_CONFIG_LIVE_DIR: f.liveRoot,
      });
      // the deliberate config drift forces exit 1
      assert.ok([1, 2].includes(r.status as number));
      assert.equal(existsSync(reportPath), true);
      const report = JSON.parse(readFileSync(reportPath, "utf8")) as {
        checks: { configSync?: Record<string, unknown> };
        drift: string[];
      };
      assert.ok(report.checks.configSync);
      assert.equal(
        report.drift.some(
          (d) => d.includes("AGENTS.md") && d.includes("weavelog sync"),
        ),
        true,
      );
      rmSync(home, { recursive: true, force: true });
    } finally {
      f.cleanup();
      rmSync(reportPath, { force: true });
    }
  });

  test("clean env-overridden config: no config drift lines in the report", () => {
    const f = makeConfigFixture({
      tracked: { "AGENTS.md": "same\n", "config/agents/a.md": "a\n" },
      live: { "AGENTS.md": "same\n", "agents/a.md": "a\n" },
    });
    const reportPath = join(
      tmpdir(),
      `stack-check-config-clean-${Date.now()}.json`,
    );
    try {
      const { r, home } = stackRun(["--no-notify", "--json", reportPath], {
        STACK_CHECK_CONFIG_DIR: f.trackedRoot,
        STACK_CHECK_CONFIG_LIVE_DIR: f.liveRoot,
      });
      assert.ok([0, 1, 2].includes(r.status as number));
      assert.equal(existsSync(reportPath), true);
      const report = JSON.parse(readFileSync(reportPath, "utf8")) as {
        checks: { configSync?: Record<string, unknown> };
        drift: string[];
      };
      assert.ok(report.checks.configSync);
      assert.equal(
        report.drift.some((d) => d.startsWith("config drift")),
        false,
      );
      rmSync(home, { recursive: true, force: true });
    } finally {
      f.cleanup();
      rmSync(reportPath, { force: true });
    }
  });
});
