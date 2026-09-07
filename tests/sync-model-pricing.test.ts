import assert from "node:assert/strict";
import { type ChildProcess, spawn, spawnSync } from "node:child_process";
import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { after, before, describe, test } from "node:test";
import { fileURLToPath } from "node:url";

const BIN = fileURLToPath(
  new URL("../src/tools/sync-model-pricing.ts", import.meta.url),
);

const CATALOG = {
  data: [
    {
      id: "z-ai/glm-5.3-flash",
      pricing: {
        prompt: "7.5e-8",
        completion: "1.5e-7",
        input_cache_read: "3e-9",
      },
      context_length: 1_000_000,
    },
    {
      id: "deepseek/deepseek-v4-flash-0731",
      pricing: {
        prompt: "1.4e-7",
        completion: "2.8e-7",
        input_cache_read: "2.8e-9",
      },
      context_length: 1_000_000,
    },
  ],
};

let ModelsUrl = "http://127.0.0.1:0/api/v1/models";
let stubProc: ChildProcess | undefined;
before(async () => {
  stubProc = spawn(
    process.execPath,
    [
      "-e",
      `const http=require("node:http");const catalog=${JSON.stringify(CATALOG)};const srv=http.createServer((req,res)=>{res.writeHead(200,{"content-type":"application/json"});res.end(JSON.stringify(catalog))});srv.listen(0,"127.0.0.1",()=>{console.log("PORT:"+srv.address().port)})`,
    ],
    { stdio: ["ignore", "pipe", "inherit"] },
  );
  ModelsUrl = await new Promise((resolve, reject) => {
    const timeout = setTimeout(
      () => reject(new Error("stub server did not report port")),
      10_000,
    );
    stubProc!.stdout!.on("data", (chunk: Buffer) => {
      const match = /PORT:(\d+)/.exec(chunk.toString());
      if (match) {
        clearTimeout(timeout);
        resolve(`http://127.0.0.1:${match[1]}/api/v1/models`);
      }
    });
  });
});
after(() => {
  stubProc?.kill();
});

function run(args: string[], extraEnv: Record<string, string> = {}) {
  return spawnSync(process.execPath, ["--import", "tsx", BIN, ...args], {
    encoding: "utf8",
    env: { ...process.env, OPENROUTER_MODELS_URL: ModelsUrl, ...extraEnv },
    timeout: 120_000,
  });
}

function makeFakeLitellmDb(dir: string): string {
  const db = {
    "openrouter/deepseek/deepseek-v4-flash-0731": {
      input_cost_per_token: 1.4e-7,
      output_cost_per_token: 2.8e-7,
      cache_read_input_token_cost: 2.8e-9,
      litellm_provider: "deepseek",
      max_input_tokens: 1000000,
      mode: "chat",
    },
  };
  const p = join(dir, "model_prices.json");
  writeFileSync(p, JSON.stringify(db, null, 2));
  return p;
}

function makeFakeHome(dir: string, models: string[]): string {
  const home = join(
    dir,
    `home-${Date.now()}-${Math.random().toString(36).slice(2)}`,
  );
  mkdirSync(join(home, ".agents"), { recursive: true });
  mkdirSync(join(home, ".local", "share", "opencode"), { recursive: true });
  writeFileSync(
    join(home, ".agents", "stack-versions.json"),
    JSON.stringify({ models, updatedAt: "2026-08-15" }),
  );
  writeFileSync(
    join(home, ".local", "share", "opencode", "auth.json"),
    JSON.stringify({ openrouter: { key: "sk-or-test" } }),
  );
  return home;
}

describe("sync-model-pricing (happy paths)", () => {
  test("--help exits 0 and shows usage", () => {
    const r = run(["--help"]);
    assert.equal(r.status, 0);
    assert.ok(r.stdout.includes("Usage: bun sync-model-pricing.ts"));
  });

  test("--apply injects entries with cache pricing and is idempotent", () => {
    const work = join(tmpdir(), `smp-apply-${Date.now()}`);
    mkdirSync(work, { recursive: true });
    const dbPath = makeFakeLitellmDb(work);
    const home = makeFakeHome(work, ["z-ai/glm-5.3-flash"]);
    const r = run(["--apply", "--litellm-db", dbPath], { HOME: home });
    assert.equal(r.status, 0);
    const db = JSON.parse(readFileSync(dbPath, "utf8"));
    const e = db["openrouter/z-ai/glm-5.3-flash"];
    assert.notEqual(e, undefined);
    assert.ok(e.input_cost_per_token > 1e-8);
    assert.ok(e.input_cost_per_token < 1e-5);
    assert.ok(e.output_cost_per_token > 1e-8);
    assert.ok(e.cache_read_input_token_cost > 0);
    assert.equal(e.headroom_synced, true);
    const r2 = run(["--apply", "--litellm-db", dbPath], { HOME: home });
    assert.equal(r2.status, 0);
    const db2 = JSON.parse(readFileSync(dbPath, "utf8"));
    assert.equal(
      db2["openrouter/z-ai/glm-5.3-flash"].input_cost_per_token,
      e.input_cost_per_token,
    );
    rmSync(work, { recursive: true, force: true });
  });

  test("--check exits 0 when all manifest models are priced", () => {
    const work = join(tmpdir(), `smp-check-ok-${Date.now()}`);
    mkdirSync(work, { recursive: true });
    const dbPath = makeFakeLitellmDb(work);
    const home = makeFakeHome(work, ["deepseek/deepseek-v4-flash-0731"]);
    const r = run(["--check", "--litellm-db", dbPath], { HOME: home });
    assert.equal(r.status, 0);
    rmSync(work, { recursive: true, force: true });
  });
});

describe("sync-model-pricing (unhappy paths)", () => {
  test("--check exits 1 when a manifest model is missing from the DB", () => {
    const work = join(tmpdir(), `smp-check-miss-${Date.now()}`);
    mkdirSync(work, { recursive: true });
    const dbPath = makeFakeLitellmDb(work);
    const home = makeFakeHome(work, ["z-ai/glm-5.3-flash"]);
    const r = run(["--check", "--litellm-db", dbPath], { HOME: home });
    assert.equal(r.status, 1);
    assert.ok(r.stdout.includes("z-ai/glm-5.3-flash"));
    rmSync(work, { recursive: true, force: true });
  });

  test("--check exits 1 when a synced entry has a stale price", () => {
    const work = join(tmpdir(), `smp-check-stale-${Date.now()}`);
    mkdirSync(work, { recursive: true });
    const dbPath = makeFakeLitellmDb(work);
    const db = JSON.parse(readFileSync(dbPath, "utf8"));
    db["openrouter/z-ai/glm-5.3-flash"] = {
      input_cost_per_token: 1e-9,
      output_cost_per_token: 1e-9,
      headroom_synced: true,
    };
    writeFileSync(dbPath, JSON.stringify(db));
    const home = makeFakeHome(work, ["z-ai/glm-5.3-flash"]);
    const r = run(["--check", "--litellm-db", dbPath], { HOME: home });
    assert.equal(r.status, 1);
    assert.ok(r.stdout.toLowerCase().includes("stale"));
    rmSync(work, { recursive: true, force: true });
  });

  test("missing manifest exits 2", () => {
    const work = join(tmpdir(), `smp-nomanifest-${Date.now()}`);
    mkdirSync(join(work, ".local", "share", "opencode"), { recursive: true });
    writeFileSync(
      join(work, ".local", "share", "opencode", "auth.json"),
      JSON.stringify({ openrouter: { key: "sk-or-test" } }),
    );
    const r = run(["--check"], { HOME: work });
    assert.equal(r.status, 2);
    assert.ok(r.stderr.includes("manifest missing"));
    rmSync(work, { recursive: true, force: true });
  });
});
