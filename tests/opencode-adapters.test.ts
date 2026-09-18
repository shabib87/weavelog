import assert from "node:assert/strict";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, test } from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";
import {
  emitOpenCodeAdapters,
  inspectOpenCodeAdapters,
} from "../src/hooks/opencode-adapters.ts";

const created: string[] = [];
const REPO = fileURLToPath(new URL("../", import.meta.url));

afterEach(() => {
  for (const dir of created.splice(0))
    rmSync(dir, { recursive: true, force: true });
});

function fixture(name: string): string {
  const dir = join(tmpdir(), `weavelog-opencode-adapter-${name}-${Date.now()}`);
  mkdirSync(join(dir, "installed", "dist", "hooks"), { recursive: true });
  mkdirSync(join(dir, "config"), { recursive: true });
  created.push(dir);
  return dir;
}

test("emitted enforce adapter loads its installed-package target and records a gate refusal", async () => {
  const dir = fixture("enforce");
  const packageRoot = join(dir, "installed");
  const configRoot = join(dir, "config");
  const stateDir = join(dir, "state");
  const hookPath = join(packageRoot, "dist", "hooks", "enforce.js");
  writeFileSync(
    hookPath,
    `export async function Enforce() {
      return { "tool.execute.before": async () => { throw new Error("intentional enforce trip"); } };
    }\n`,
  );

  const adapters = emitOpenCodeAdapters({ packageRoot, configRoot, stateDir });
  assert.equal(adapters.length, 3);
  const enforce = adapters.find((adapter) => adapter.name === "enforce");
  assert.ok(enforce);
  assert.ok(existsSync(enforce.path));
  assert.ok(
    readFileSync(enforce.path, "utf8").includes(pathToFileURL(hookPath).href),
  );

  const loaded = await import(
    `${pathToFileURL(enforce.path).href}?test=${Date.now()}`
  );
  const hooks = await loaded.default({});
  await assert.rejects(
    hooks["tool.execute.before"]({}, { args: {} }),
    /intentional enforce trip/,
  );

  const receipt = readFileSync(join(stateDir, "adapter-audit.jsonl"), "utf8");
  assert.match(receipt, /"adapter":"enforce"/);
  assert.match(receipt, /"outcome":"gate-refusal"/);
});

test("emitted opencode-tmp adapter loads its installed-package target and sets a safe shell TMPDIR", async () => {
  const dir = fixture("tmp");
  const packageRoot = join(dir, "installed");
  const configRoot = join(dir, "config");
  const stateDir = join(dir, "state");
  const hookPath = join(packageRoot, "dist", "hooks", "opencode-tmp.js");
  writeFileSync(
    hookPath,
    `export const WeavelogTmp = async () => ({
      "shell.env": async (input, output) => {
        output.env.TMPDIR = input.cwd + "/.weavelog-tmp/fallback";
      },
    });\n`,
  );

  const adapters = emitOpenCodeAdapters({ packageRoot, configRoot, stateDir });
  const tmp = adapters.find((adapter) => adapter.name === "opencode-tmp");
  assert.ok(tmp);
  assert.ok(existsSync(tmp.path));
  assert.ok(
    readFileSync(tmp.path, "utf8").includes(pathToFileURL(hookPath).href),
  );

  const loaded = await import(
    `${pathToFileURL(tmp.path).href}?test=${Date.now()}`
  );
  const hooks = await loaded.default({});
  const output = { env: {} as Record<string, string> };
  await hooks["shell.env"]({ cwd: dir, sessionID: "s1" }, output);
  assert.equal(output.env.TMPDIR, join(dir, ".weavelog-tmp", "fallback"));

  const receipt = readFileSync(join(stateDir, "adapter-audit.jsonl"), "utf8");
  assert.match(receipt, /"adapter":"opencode-tmp"/);
  assert.match(receipt, /"outcome":"gate-result"/);
});

test("missing installed verify-gate target fails health with a named init repair and no personal fallback", () => {
  const dir = fixture("missing-target");
  const packageRoot = join(dir, "installed");
  const configRoot = join(dir, "config");
  const stateDir = join(dir, "state");
  writeFileSync(
    join(packageRoot, "dist", "hooks", "enforce.js"),
    "export const Enforce = async () => ({ });\n",
  );
  emitOpenCodeAdapters({ packageRoot, configRoot, stateDir });

  const personal = join(dir, "personal", ".agents", "bin", "verify-gate.js");
  mkdirSync(join(personal, ".."), { recursive: true });
  writeFileSync(personal, "export default async () => ({ });\n");

  const health = inspectOpenCodeAdapters({ packageRoot, configRoot, stateDir });
  assert.equal(health.ok, false);
  assert.match(health.detail, /verify-gate/);
  assert.match(health.detail, /weavelog init/);
  assert.ok(!health.detail.includes(personal));
});

test("emitted verify-gate adapter records a report-only gate result", async () => {
  const dir = fixture("verify-result");
  const packageRoot = join(dir, "installed");
  const configRoot = join(dir, "config");
  const stateDir = join(dir, "state");
  writeFileSync(
    join(packageRoot, "dist", "hooks", "verify-gate.js"),
    `export default async function VerifyGatePlugin() {
      return { "tool.execute.after": async () => undefined };
    }\n`,
  );
  emitOpenCodeAdapters({ packageRoot, configRoot, stateDir });
  const adapterPath = join(configRoot, "plugins", "verify-gate.ts");
  const loaded = await import(
    `${pathToFileURL(adapterPath).href}?test=${Date.now()}`
  );
  const hooks = await loaded.default({});
  await hooks["tool.execute.after"]({ sessionID: "s1", callID: "c1" }, {});

  const receipt = readFileSync(join(stateDir, "adapter-audit.jsonl"), "utf8");
  assert.match(receipt, /"adapter":"verify-gate"/);
  assert.match(receipt, /"outcome":"gate-result"/);
  assert.match(receipt, /"sessionID":"s1"/);
});

test("health rejects a compiled hook that lacks its required plugin export", () => {
  const dir = fixture("bad-export");
  const packageRoot = join(dir, "installed");
  const configRoot = join(dir, "config");
  const stateDir = join(dir, "state");
  writeFileSync(
    join(packageRoot, "dist", "hooks", "enforce.js"),
    "export const notEnforce = async () => ({ });\n",
  );
  writeFileSync(
    join(packageRoot, "dist", "hooks", "verify-gate.js"),
    "export default async () => ({ });\n",
  );
  emitOpenCodeAdapters({ packageRoot, configRoot, stateDir });

  const health = inspectOpenCodeAdapters({ packageRoot, configRoot, stateDir });
  assert.equal(health.ok, false);
  assert.match(health.detail, /enforce.*export/i);
  assert.match(health.detail, /weavelog init/);
});

test("compiled package adapters load the real enforce and verify-gate refusals", async () => {
  const dir = fixture("compiled-package");
  const configRoot = join(dir, "config");
  const stateDir = join(dir, "state");
  const adapters = emitOpenCodeAdapters({
    packageRoot: REPO,
    configRoot,
    stateDir,
  });
  const enforcePath = adapters.find(
    (adapter) => adapter.name === "enforce",
  )?.path;
  const verifyPath = adapters.find(
    (adapter) => adapter.name === "verify-gate",
  )?.path;
  assert.ok(enforcePath);
  assert.ok(verifyPath);
  const enforce = await import(
    `${pathToFileURL(enforcePath).href}?test=${Date.now()}`
  );
  const enforceHooks = await enforce.default({
    $: () => ({
      quiet: () => ({ nothrow: async () => ({ exitCode: 0, text: () => "" }) }),
    }),
  });
  await assert.rejects(
    enforceHooks["tool.execute.before"](
      { tool: "bash", sessionID: "enforce", callID: "1" },
      { args: { command: "rm -rf ~/.headroom" } },
    ),
    /headroom proxy state/,
  );
  const verify = await import(
    `${pathToFileURL(verifyPath).href}?test=${Date.now()}`
  );
  const verifyHooks = await verify.default({});
  for (let i = 0; i < 11; i++)
    await verifyHooks["tool.execute.before"](
      { tool: "read", sessionID: "verify", callID: String(i) },
      { args: {} },
    );
  await assert.rejects(
    verifyHooks["tool.execute.before"](
      { tool: "edit", sessionID: "verify", callID: "write" },
      { args: { filePath: "/repo/src/example.ts" } },
    ),
    /verification gate/,
  );
  const tmpPath = adapters.find(
    (adapter) => adapter.name === "opencode-tmp",
  )?.path;
  assert.ok(tmpPath);
  const tmp = await import(`${pathToFileURL(tmpPath).href}?test=${Date.now()}`);
  const tmpHooks = await tmp.default({});
  const tmpOutput = { env: {} as Record<string, string> };
  await tmpHooks["shell.env"]({ cwd: dir, sessionID: "tmp" }, tmpOutput);
  assert.ok(tmpOutput.env.TMPDIR.startsWith(join(dir, ".weavelog", "runs")));
  const receipts = readFileSync(join(stateDir, "adapter-audit.jsonl"), "utf8");
  assert.match(receipts, /"adapter":"enforce"/);
  assert.match(receipts, /"adapter":"verify-gate"/);
  assert.match(receipts, /"adapter":"opencode-tmp"/);
  assert.match(receipts, /"outcome":"gate-refusal"/);
});
