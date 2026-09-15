#!/usr/bin/env -S node --import tsx
/**
 * reviewer-loop — cross-model adversarial plan/diff review (conductor pattern).
 * Dispatches parallel independent reviews via OpenRouter to models from
 * DIFFERENT families, then prints each verdict for evidence-based merging.
 *
 * Handles the known gotchas: always-thinking models consume max_tokens on
 * reasoning (kimi-k3), so requests use reasoning.exclude + generous budgets.
 *
 * Honesty contract: reported usage and estimated cost include every billed
 * attempt (including retries); a reviewer that fails or yields no usable
 * response after the allowed retry is recorded as a failure and fails the
 * run; missing pricing or usage data is reported as an unknown cost, never
 * as a known zero; the --budget-usd cap is a POST-RUN check and does not
 * prevent spending. Failure records redact credentials.
 *
 * Exit codes: 0 = all reviews returned within the estimated budget,
 * 1 = estimated-cost cap exceeded (post-run check), 2 = error (a required
 * reviewer failed or some costs are unknown, so the budget cannot pass).
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
  --budget-usd <n>     Post-run estimated-cost cap across reviewers (default: 2.00). Checked only
                       AFTER all reviews complete, so it does not prevent spending — it fails the
                       run when the estimated total exceeds the cap. Costs with missing pricing or
                       usage data are unknown and cannot pass the cap.
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

export interface Usage {
  prompt_tokens?: number;
  completion_tokens?: number;
  total_tokens?: number;
}

export interface ReviewRecord {
  model: string;
  content: string;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
  costUsd: number | null;
}

export interface FailureRecord {
  model: string;
  error: string;
}

export interface LoopResult {
  exitCode: number;
  reviews: ReviewRecord[];
  failures: FailureRecord[];
  totalUsd: number | null;
  budgetUsd: number;
  budgetExceeded: boolean;
  budgetIndeterminate: boolean;
}

export interface RunLoopDeps {
  models: string[];
  plan: string;
  rubric?: string;
  maxTokens?: number;
  budgetUsd?: number;
  authKey: string;
  fetchImpl?: typeof fetch;
}

function redact(text: string, secrets: string[]): string {
  let out = text.replace(/Bearer\s+\S+/gi, "Bearer [REDACTED]");
  for (const s of secrets) {
    if (s.length > 0) out = out.split(s).join("[REDACTED]");
  }
  return out;
}

function hasBilledUsage(
  u: Usage | undefined,
): u is { prompt_tokens: number; completion_tokens: number } {
  return (
    typeof u?.prompt_tokens === "number" &&
    typeof u?.completion_tokens === "number"
  );
}

export async function runReviewLoop(deps: RunLoopDeps): Promise<LoopResult> {
  const doFetch = deps.fetchImpl ?? fetch;
  const maxTokens = deps.maxTokens ?? 10_000;
  const budgetUsd = deps.budgetUsd ?? 2.0;
  const rubric = deps.rubric ?? DEFAULT_RUBRIC;
  const secrets = [deps.authKey];

  const fetchJson = async (url: string, body?: unknown): Promise<unknown> => {
    const res = await doFetch(url, {
      method: body ? "POST" : "GET",
      headers: {
        Authorization: `Bearer ${deps.authKey}`,
        ...(body ? { "Content-Type": "application/json" } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(400_000),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`);
    return res.json();
  };

  interface ChatCompletionResponse {
    choices?: { message?: { content?: string | null } }[];
    usage?: Usage;
  }

  const runRequest = async (
    model: string,
    sys: string,
    tokens: number,
  ): Promise<ChatCompletionResponse> =>
    (await fetchJson("https://openrouter.ai/api/v1/chat/completions", {
      model,
      messages: [
        { role: "system", content: sys },
        { role: "user", content: deps.plan },
      ],
      max_tokens: tokens,
      temperature: 0.2,
      reasoning: { exclude: true },
    })) as ChatCompletionResponse;

  const sysBase = `${rubric}\nKeep internal reasoning minimal; write the final answer in plain prose.`;

  interface AttemptResult {
    content: string;
    promptTokens: number;
    completionTokens: number;
    usageKnown: boolean;
  }

  const review = async (model: string): Promise<AttemptResult> => {
    // Always-think models (kimi, glm, qwen3.x) can empty max_tokens on reasoning;
    // instruct minimal reasoning up front and retry once with double budget on empty content.
    const usages: (Usage | undefined)[] = [];
    const attempt = async (
      sys: string,
      tokens: number,
    ): Promise<string | null | undefined> => {
      const resp = await runRequest(model, sys, tokens);
      usages.push(resp.usage);
      return resp.choices?.[0]?.message?.content;
    };
    let content = await attempt(sysBase, maxTokens);
    if (content == null || content.trim() === "") {
      content = await attempt(
        `${sysBase} SKIP ALL internal reasoning entirely; only output the final answer.`,
        maxTokens * 2,
      );
    }
    if (content == null || content.trim() === "") {
      throw new Error(
        "no usable response after the allowed retry (empty content)",
      );
    }
    let usageKnown = usages.length > 0;
    let promptTokens = 0;
    let completionTokens = 0;
    for (const u of usages) {
      if (!hasBilledUsage(u)) {
        usageKnown = false;
        break;
      }
      promptTokens += u.prompt_tokens;
      completionTokens += u.completion_tokens;
    }
    return { content, promptTokens, completionTokens, usageKnown };
  };

  const catalog = (await fetchJson("https://openrouter.ai/api/v1/models").catch(
    () => ({ data: [] }),
  )) as {
    data: { id: string; pricing?: { prompt?: string; completion?: string } }[];
  };
  const price = (id: string): { inM: number; outM: number } | null => {
    const m = catalog.data.find((x) => x.id === id);
    const inStr = m?.pricing?.prompt;
    const outStr = m?.pricing?.completion;
    if (
      typeof inStr !== "string" ||
      typeof outStr !== "string" ||
      inStr.trim() === "" ||
      outStr.trim() === ""
    ) {
      return null;
    }
    const inM = Number(inStr) * 1e6;
    const outM = Number(outStr) * 1e6;
    if (!Number.isFinite(inM) || !Number.isFinite(outM)) return null;
    return { inM, outM };
  };

  const results = await Promise.allSettled(deps.models.map(review));
  const reviews: ReviewRecord[] = [];
  const failures: FailureRecord[] = [];

  for (let i = 0; i < results.length; i++) {
    const r = results[i];
    const model = deps.models[i];
    if (r.status === "rejected") {
      failures.push({ model, error: redact(String(r.reason), secrets) });
      continue;
    }
    const p = price(model);
    const costUsd =
      p !== null && r.value.usageKnown
        ? (r.value.promptTokens * p.inM + r.value.completionTokens * p.outM) /
          1e6
        : null;
    reviews.push({
      model,
      content: r.value.content,
      usage: {
        prompt_tokens: r.value.promptTokens,
        completion_tokens: r.value.completionTokens,
        total_tokens: r.value.promptTokens + r.value.completionTokens,
      },
      costUsd,
    });
  }

  const anyUnknownCost = reviews.some((x) => x.costUsd === null);
  const totalUsd: number | null =
    reviews.length === 0 || anyUnknownCost
      ? null
      : reviews.reduce((sum, x) => sum + (x.costUsd as number), 0);
  const budgetExceeded =
    failures.length === 0 && totalUsd !== null && totalUsd > budgetUsd;
  const budgetIndeterminate = failures.length === 0 && totalUsd === null;

  return {
    exitCode:
      failures.length > 0
        ? 2
        : budgetIndeterminate
          ? 2
          : budgetExceeded
            ? 1
            : 0,
    reviews,
    failures,
    totalUsd,
    budgetUsd,
    budgetExceeded,
    budgetIndeterminate,
  };
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

  const result = await runReviewLoop({
    models,
    plan,
    rubric,
    maxTokens,
    budgetUsd,
    authKey: key,
  });

  for (const rev of result.reviews) {
    const costLine =
      rev.costUsd === null
        ? "[cost unknown]"
        : `[cost ~$${rev.costUsd.toFixed(4)}]`;
    console.log(`\n===== ${rev.model} =====\n${rev.content}\n${costLine}`);
  }
  for (const f of result.failures) {
    console.error(`\n===== ${f.model} =====\nERROR: ${f.error}`);
  }

  if (reportPath) {
    writeFileSync(
      reportPath,
      `${JSON.stringify(
        {
          date: new Date().toISOString(),
          totalUsd: result.totalUsd,
          reviews: result.reviews,
          failures: result.failures,
        },
        null,
        2,
      )}\n`,
    );
    console.log(`\nreport: ${reportPath}`);
  }

  console.log(
    result.totalUsd === null
      ? "total estimated cost: unknown"
      : `total estimated cost: $${result.totalUsd.toFixed(4)}`,
  );
  if (result.budgetIndeterminate) {
    console.error(
      "BUDGET CHECK INDETERMINATE: some costs are unknown, so the estimated-cost cap cannot be verified",
    );
  }
  if (result.budgetExceeded) {
    console.error(
      `BUDGET CAP EXCEEDED ($${result.totalUsd?.toFixed(2)} > $${result.budgetUsd.toFixed(2)})`,
    );
  }
  process.exit(result.exitCode);
}
