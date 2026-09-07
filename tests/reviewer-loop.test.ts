import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, test } from "node:test";
import { fileURLToPath } from "node:url";
import { resolveModels } from "../src/tools/reviewer-loop.ts";

const BIN = fileURLToPath(
  new URL("../src/tools/reviewer-loop.ts", import.meta.url),
);

// Note: full-loop behavior (parallel reviews, budget cap) is exercised manually via
// the runbook verification battery because it costs real model tokens. These tests
// gate the CLI contract and the model-selection logic without spending anything.

function run(args: string[]) {
  return spawnSync(process.execPath, ["--import", "tsx", BIN, ...args], {
    encoding: "utf8",
    timeout: 30_000,
  });
}

describe("resolveModels (model selection)", () => {
  test("defaults to the 4 frontier models when no args", () => {
    assert.deepEqual(resolveModels(), [
      "z-ai/glm-5.3-flash",
      "moonshotai/kimi-k3",
      "qwen/qwen3.8-2.4t-a95b",
      "deepseek/deepseek-v4-pro-0813",
    ]);
  });

  test("--exclude removes a model from the default pool", () => {
    assert.deepEqual(resolveModels(undefined, "z-ai/glm-5.3-flash"), [
      "moonshotai/kimi-k3",
      "qwen/qwen3.8-2.4t-a95b",
      "deepseek/deepseek-v4-pro-0813",
    ]);
  });

  test("--exclude removes a model from an explicit pool", () => {
    assert.deepEqual(resolveModels("a,b,c", "b"), ["a", "c"]);
  });

  test("--exclude of a model not in the pool is a no-op", () => {
    assert.deepEqual(resolveModels("a,b", "c"), ["a", "b"]);
  });

  test("trims whitespace in both models and exclude", () => {
    assert.deepEqual(resolveModels(" a , b ", " b "), ["a"]);
  });

  test("throws when --exclude empties the pool", () => {
    assert.throws(() => resolveModels("a", "a"), /empty after --exclude/);
  });

  test("throws when --exclude empties the default pool", () => {
    assert.throws(
      () =>
        resolveModels(
          undefined,
          "z-ai/glm-5.3-flash,moonshotai/kimi-k3,qwen/qwen3.8-2.4t-a95b,deepseek/deepseek-v4-pro-0813",
        ),
      /empty after --exclude/,
    );
  });
});

describe("reviewer-loop (happy paths)", () => {
  test("--help exits 0 and shows usage including --exclude", () => {
    const r = run(["--help"]);
    assert.equal(r.status, 0);
    assert.ok(r.stdout.includes("Usage: bun reviewer-loop.ts"));
    assert.ok(r.stdout.includes("--exclude"));
  });
});

describe("reviewer-loop (unhappy paths)", () => {
  test("missing --plan exits 2 with a clear error", () => {
    const r = run(["--models", "z-ai/glm-5.3-flash"]);
    assert.equal(r.status, 2);
    assert.ok(r.stderr.includes("--plan <file> is required"));
  });

  test("nonexistent plan file exits with a read error (not a silent pass)", () => {
    const r = run(["--plan", join(tmpdir(), `no-such-plan-${Date.now()}.md`)]);
    assert.notEqual(r.status, 0);
    assert.ok(!r.stdout.includes("VERDICT:"));
  });

  test("--exclude emptying the pool exits 2 before any network call", () => {
    const plan = join(tmpdir(), `plan-${Date.now()}.md`);
    writeFileSync(plan, "# test plan\n");
    const r = run([
      "--plan",
      plan,
      "--models",
      "z-ai/glm-5.3-flash",
      "--exclude",
      "z-ai/glm-5.3-flash",
    ]);
    assert.equal(r.status, 2);
    assert.ok(r.stderr.includes("empty after --exclude"));
  });
});
