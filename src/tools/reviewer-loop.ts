#!/usr/bin/env -S node --import tsx
/**
 * reviewer-loop — cross-model adversarial plan/diff review (conductor pattern).
 * Dispatches parallel independent reviews via OpenRouter to models from
 * DIFFERENT families, then prints each verdict for evidence-based merging.
 *
 * Handles the known gotchas: always-thinking models consume max_tokens on
 * reasoning (kimi-k3), so requests use reasoning.exclude + generous budgets.
 *
 * Exit codes: 0 = all reviews returned, 1 = budget cap exceeded (aborted), 2 = error.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";

const DEFAULT_MODELS = [
  "z-ai/glm-5.3-flash",
  "moonshotai/kimi-k3",
  "qwen/qwen3.8-2.4t-a95b",
  "deepseek/deepseek-v4-pro-0813",
];
const DEFAULT_RUBRIC = `You are an INDEPENDENT adversarial reviewer from a DIFFERENT model family than the author. Machines don't forgive hand-waving: flag unproven assumptions, ordering hazards, rollback gaps, and scope creep.
Standing principle checks: YAGNI (speculative infra), SRP (roles crossing duties), DRY (duplicated knowledge/config), KISS (needless complexity).
Output EXACTLY:
VERDICT: APPROVE | APPROVE-WITH-FIXES | REJECT
FINDINGS: numbered, each tagged [blocker|major|minor], one-line fix for blocker/major
REMOVED: anything to cut
<=400 words. Do not restate the artifact.`;

const HELP = `Usage: bun reviewer-loop.ts --plan <file> [options]

Options:
  --plan <file>        Artifact under review (required)
  --models <a,b>       Comma-separated OpenRouter model IDs (default: ${DEFAULT_MODELS.join(",")})
  --exclude <a,b>      Comma-separated model IDs to remove from the pool (e.g. the author's model)
  --rubric <file>      Custom rubric file (default: built-in adversarial rubric)
  --max-tokens <n>     Output budget per reviewer (default: 10000; thinking models need headroom)
  --budget-usd <n>     Estimated-cost cap across reviewers (default: 2.00)
  --report <path>      Also write combined JSON report here
  --help               Show this help

Reads the OpenRouter key from ~/.local/share/opencode/auth.json (never env).`;

export function resolveModels(
  modelsArg?: string,
  excludeArg?: string,
): string[] {
  const models = (modelsArg || DEFAULT_MODELS.join(","))
    .split(",")
    .map((m) => m.trim())
    .filter(Boolean);
  const exclude = new Set(
    (excludeArg || "")
      .split(",")
      .map((m) => m.trim())
      .filter(Boolean),
  );
  const filtered = models.filter((m) => !exclude.has(m));
  if (filtered.length === 0) {
    throw new Error("reviewer pool is empty after --exclude");
  }
  return filtered;
}

function fail(msg: string, code = 2): never {
  console.error(msg);
  process.exit(code);
}

if (
  process.argv[1] !== undefined &&
  import.meta.url === pathToFileURL(resolve(process.argv[1])).href
) {
  const argv = process.argv.slice(2);
  if (argv.includes("--help")) {
    console.log(HELP);
    process.exit(0);
  }
  function opt(flag: string): string | undefined {
    const i = argv.indexOf(flag);
    return i >= 0 ? argv[i + 1] : undefined;
  }

  const planFile = opt("--plan");
  if (!planFile) fail(`--plan <file> is required\n\n${HELP}`);
  const plan = readFileSync(planFile, "utf8");
  let models: string[];
  try {
    models = resolveModels(opt("--models"), opt("--exclude"));
  } catch (e) {
    fail(String((e as Error).message), 2);
  }
  const rubric = opt("--rubric")
    ? readFileSync(opt("--rubric") as string, "utf8")
    : DEFAULT_RUBRIC;
  const maxTokens = Number(opt("--max-tokens") || 10000);
  const budgetUsd = Number(opt("--budget-usd") || 2.0);
  const reportPath = opt("--report");

  const key = (
    JSON.parse(
      readFileSync(
        join(homedir(), ".local", "share", "opencode", "auth.json"),
        "utf8",
      ),
    ) as {
      openrouter?: { key?: string };
    }
  ).openrouter?.key;
  if (!key) fail("no openrouter key in ~/.local/share/opencode/auth.json");

  async function fetchJson(url: string, body?: unknown) {
    const res = await fetch(url, {
      method: body ? "POST" : "GET",
      headers: {
        Authorization: `Bearer ${key}`,
        ...(body ? { "Content-Type": "application/json" } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(400_000),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`);
    return res.json();
  }

  async function review(
    model: string,
  ): Promise<{ model: string; content: string; usage: any }> {
    // Always-think models (kimi, glm, qwen3.x) can empty max_tokens on reasoning;
    // instruct minimal reasoning up front and retry once with double budget on empty content.
    const sysBase = `${rubric}\nKeep internal reasoning minimal; write the final answer in plain prose.`;
    const run = async (sys: string, tokens: number) =>
      await fetchJson("https://openrouter.ai/api/v1/chat/completions", {
        model,
        messages: [
          { role: "system", content: sys },
          { role: "user", content: plan },
        ],
        max_tokens: tokens,
        temperature: 0.2,
        reasoning: { exclude: true },
      });
    let resp = await run(sysBase, maxTokens);
    let content = resp.choices?.[0]?.message?.content;
    if (content == null || content.trim() === "") {
      resp = await run(
        `${sysBase} SKIP ALL internal reasoning entirely; only output the final answer.`,
        maxTokens * 2,
      );
      content = resp.choices?.[0]?.message?.content;
    }
    return {
      model,
      content:
        content ??
        "(no content - thinking consumed budget; retry with larger --max-tokens)",
      usage: resp.usage,
    };
  }

  const catalog = (await fetchJson("https://openrouter.ai/api/v1/models").catch(
    () => ({
      data: [],
    }),
  )) as {
    data: { id: string; pricing?: { prompt?: string; completion?: string } }[];
  };
  const price = (id: string) => {
    const m = catalog.data.find((x) => x.id === id);
    return {
      inM: Number(m?.pricing?.prompt ?? 0) * 1e6,
      outM: Number(m?.pricing?.completion ?? 0) * 1e6,
    };
  };

  const results = await Promise.allSettled(models.map(review));
  let totalUsd = 0;
  const report: unknown[] = [];

  for (let i = 0; i < results.length; i++) {
    const r = results[i];
    const model = models[i];
    if (r.status === "rejected") {
      console.error(`\n===== ${model} =====\nERROR: ${String(r.reason)}`);
      continue;
    }
    const { inM, outM } = price(model);
    const costUsd =
      (r.value.usage?.prompt_tokens * inM +
        r.value.usage?.completion_tokens * outM) /
      1e6;
    totalUsd += costUsd;
    console.log(
      `\n===== ${model} =====\n${r.value.content}\n[cost ~$${costUsd.toFixed(4)}]`,
    );
    report.push({
      model,
      costUsd,
      content: r.value.content,
      usage: r.value.usage,
    });
  }

  if (reportPath) {
    writeFileSync(
      reportPath,
      `${JSON.stringify({ date: new Date().toISOString(), totalUsd, reviews: report }, null, 2)}\n`,
    );
    console.log(`\nreport: ${reportPath}`);
  }
  console.log(`total estimated cost: $${totalUsd.toFixed(4)}`);
  if (totalUsd > budgetUsd)
    fail(
      `BUDGET CAP EXCEEDED ($${totalUsd.toFixed(2)} > $${budgetUsd.toFixed(2)})`,
      1,
    );
}
