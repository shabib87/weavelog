import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, test } from "node:test";
import { fileURLToPath } from "node:url";
import { resolveModels, runReviewLoop } from "../src/tools/reviewer-loop.ts";

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

// --- Fake-provider loop tests (in-memory fetch/auth/plan; no network, no spend) ---

const MODEL_A = "fake/model-a";
const MODEL_B = "fake/model-b";

const PRICED_CATALOG = {
  data: [
    {
      id: MODEL_A,
      pricing: { prompt: "0.0000001", completion: "0.0000001" }, // $0.10 per 1M tokens
    },
    {
      id: MODEL_B,
      pricing: { prompt: "0.0000001", completion: "0.0000001" },
    },
  ],
};

function chatResponse(content: string | null, usage?: unknown): Response {
  return new Response(
    JSON.stringify({
      choices: [{ message: { content } }],
      ...(usage === undefined ? {} : { usage }),
    }),
    { status: 200 },
  );
}

interface ScriptedCall {
  url: string;
  init?: RequestInit;
}

/**
 * Fake fetch: GET /models serves the catalog; POST /chat/completions serves
 * per-model scripted responses in attempt order.
 */
function makeFakeFetch(
  scripts: Map<string, Response[]>,
  catalog: unknown = PRICED_CATALOG,
  onCall?: (call: ScriptedCall) => void,
): typeof fetch {
  return ((url: string | URL, init?: RequestInit) => {
    onCall?.({ url: String(url), init });
    const urlStr = String(url);
    if (urlStr.includes("/models")) {
      return Promise.resolve(
        new Response(JSON.stringify(catalog), { status: 200 }),
      );
    }
    const body = JSON.parse(String(init?.body ?? "{}")) as { model: string };
    const queue = scripts.get(body.model);
    if (!queue || queue.length === 0) {
      return Promise.reject(
        new Error(`no scripted response for ${body.model}`),
      );
    }
    return Promise.resolve(queue.shift() as Response);
  }) as typeof fetch;
}

const BASE_DEPS = {
  plan: "# plan under review",
  rubric: "test rubric",
  maxTokens: 100,
  budgetUsd: 2.0,
  authKey: "sk-injected-test-key",
};

describe("reviewer-loop runReviewLoop (fake providers)", () => {
  test("AC1: every reviewer failing exits nonzero and records each failure", async () => {
    const result = await runReviewLoop({
      ...BASE_DEPS,
      models: [MODEL_A, MODEL_B],
      fetchImpl: ((url: string | URL, _init?: RequestInit) => {
        if (String(url).includes("/models")) {
          return Promise.resolve(
            new Response(JSON.stringify(PRICED_CATALOG), { status: 200 }),
          );
        }
        return Promise.reject(new Error("HTTP 500: upstream exploded"));
      }) as typeof fetch,
    });
    assert.equal(result.exitCode !== 0, true);
    assert.equal(result.failures.length, 2);
    assert.deepEqual(
      result.failures.map((f) => f.model).sort(),
      [MODEL_A, MODEL_B].sort(),
    );
    assert.ok(result.failures[0].error.includes("HTTP 500"));
    assert.equal(result.reviews.length, 0);
  });

  test("AC1: empty content after the allowed retry is a failure, not a placeholder success", async () => {
    const fetchImpl = makeFakeFetch(
      new Map([[MODEL_A, [chatResponse(""), chatResponse(null)]]]),
    );
    const result = await runReviewLoop({
      ...BASE_DEPS,
      models: [MODEL_A],
      fetchImpl,
    });
    assert.equal(result.exitCode, 2);
    assert.equal(result.failures.length, 1);
    assert.equal(result.failures[0].model, MODEL_A);
    assert.equal(result.reviews.length, 0);
  });

  test("AC2: retry usage sums every billed attempt (0.10 + 0.05 = 0.15 fails a 0.06 cap)", async () => {
    const fetchImpl = makeFakeFetch(
      new Map([
        [
          MODEL_A,
          [
            chatResponse("", {
              prompt_tokens: 500_000,
              completion_tokens: 500_000,
              total_tokens: 1_000_000,
            }),
            chatResponse("VERDICT: APPROVE", {
              prompt_tokens: 250_000,
              completion_tokens: 250_000,
              total_tokens: 500_000,
            }),
          ],
        ],
      ]),
    );
    const result = await runReviewLoop({
      ...BASE_DEPS,
      budgetUsd: 0.06,
      models: [MODEL_A],
      fetchImpl,
    });
    assert.equal(result.exitCode, 1); // budget cap exceeded, not pass
    assert.equal(result.budgetExceeded, true);
    assert.equal(result.reviews.length, 1);
    const usage = result.reviews[0].usage;
    assert.equal(usage.prompt_tokens, 750_000);
    assert.equal(usage.completion_tokens, 750_000);
    assert.ok(Math.abs(result.reviews[0].costUsd - 0.15) < 1e-9);
    assert.ok(Math.abs((result.totalUsd as number) - 0.15) < 1e-9);
  });

  test("AC3: missing catalog pricing names the cost unknown and cannot pass the budget check", async () => {
    const fetchImpl = makeFakeFetch(
      new Map([
        [
          MODEL_A,
          [
            chatResponse("VERDICT: APPROVE", {
              prompt_tokens: 100_000,
              completion_tokens: 100_000,
              total_tokens: 200_000,
            }),
          ],
        ],
      ]),
      { data: [] }, // catalog unreachable/empty
    );
    const result = await runReviewLoop({
      ...BASE_DEPS,
      models: [MODEL_A],
      fetchImpl,
    });
    assert.equal(result.exitCode !== 0, true);
    assert.equal(result.reviews.length, 1);
    assert.equal(result.reviews[0].costUsd, null);
    assert.equal(result.totalUsd, null);
    assert.equal(result.budgetIndeterminate, true);
    assert.equal(result.budgetExceeded, false);
  });

  test("AC3: missing usage data names the cost unknown instead of claiming a zero cost", async () => {
    const fetchImpl = makeFakeFetch(
      new Map([
        [MODEL_A, [chatResponse("VERDICT: APPROVE")]], // no usage field
      ]),
    );
    const result = await runReviewLoop({
      ...BASE_DEPS,
      models: [MODEL_A],
      fetchImpl,
    });
    assert.equal(result.exitCode !== 0, true);
    assert.equal(result.reviews[0].costUsd, null);
    assert.equal(result.totalUsd, null);
    assert.equal(result.budgetIndeterminate, true);
  });

  test("AC4: --help states the budget check runs after reviews and does not prevent spend", () => {
    const r = run(["--help"]);
    assert.equal(r.status, 0);
    assert.match(r.stdout, /after all reviews/i);
    assert.match(r.stdout, /does not prevent spending/);
  });

  test("AC1: failure records never contain the auth key or Bearer tokens", async () => {
    const result = await runReviewLoop({
      ...BASE_DEPS,
      models: [MODEL_A],
      fetchImpl: ((_url: string | URL, _init?: RequestInit) =>
        Promise.reject(
          new Error("HTTP 401: invalid Bearer sk-injected-test-key header"),
        )) as typeof fetch,
    });
    assert.equal(result.exitCode, 2);
    const serialized = JSON.stringify(result);
    assert.equal(serialized.includes("sk-injected-test-key"), false);
    assert.ok(result.failures[0].error.includes("[REDACTED]"));
  });

  test("AC5: successful reviews report verdict content, known costs and exit 0", async () => {
    const fetchImpl = makeFakeFetch(
      new Map([
        [
          MODEL_A,
          [
            chatResponse("VERDICT: APPROVE", {
              prompt_tokens: 100_000,
              completion_tokens: 100_000,
              total_tokens: 200_000,
            }),
          ],
        ],
        [
          MODEL_B,
          [
            chatResponse("VERDICT: REJECT", {
              prompt_tokens: 200_000,
              completion_tokens: 100_000,
              total_tokens: 300_000,
            }),
          ],
        ],
      ]),
    );
    const result = await runReviewLoop({
      ...BASE_DEPS,
      models: [MODEL_A, MODEL_B],
      fetchImpl,
    });
    assert.equal(result.exitCode, 0);
    assert.equal(result.failures.length, 0);
    assert.equal(result.reviews.length, 2);
    assert.equal(result.reviews[0].content, "VERDICT: APPROVE");
    assert.equal(result.reviews[1].content, "VERDICT: REJECT");
    assert.ok(Math.abs(result.reviews[0].costUsd - 0.02) < 1e-9);
    assert.ok(Math.abs(result.reviews[1].costUsd - 0.03) < 1e-9);
    assert.ok(Math.abs((result.totalUsd as number) - 0.05) < 1e-9);
    assert.equal(result.budgetIndeterminate, false);
  });
});
