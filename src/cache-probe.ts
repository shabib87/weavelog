#!/usr/bin/env -S node --import tsx
/**
 * cache-probe — model-agnostic prompt-cache verifier through the headroom proxy.
 *
 * Runs 4 sequential requests through localhost:8788/v1 with a shared >=4K-token
 * system prefix + unique tails (varied to avoid headroom's own compression cache).
 * Reports per-request cached_tokens. Exit 0 if cache hits on >=1 of req 2-4,
 * exit 1 if no cache, exit 2 on error.
 *
 * Usage: bun cache-probe.ts --model z-ai/glm-5.3-flash [--json] [--help]
 *
 * Reads the OpenRouter key from ~/.local/share/opencode/auth.json (never env).
 */
import { readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

const HELP = `Usage: bun cache-probe.ts --model <id> [options]

Options:
  --model <id>    OpenRouter model ID (e.g. z-ai/glm-5.3-flash) (required)
  --json          Output structured JSON
  --requests <n>  Number of sequential requests (default: 4)
  --help          Show this help

Exit codes: 0 cache hit on >=1 of req 2-N, 1 no cache hits, 2 error.`;

const args = process.argv.slice(2);
if (args.includes("--help")) {
	console.log(HELP);
	process.exit(0);
}

function opt(flag: string): string | undefined {
	const i = args.indexOf(flag);
	return i >= 0 ? args[i + 1] : undefined;
}

const model = opt("--model");
const jsonOutput = args.includes("--json");
const numRequests = Number(opt("--requests") || 4);

if (!model) {
	console.error("Error: --model <id> is required\n\n" + HELP);
	process.exit(2);
}

if (model.trim() === "") {
	console.error("Error: --model value must not be empty\n\n" + HELP);
	process.exit(2);
}

// Read key from documented file location only (never env)
const authPath = join(homedir(), ".local", "share", "opencode", "auth.json");
let key: string;
try {
	const auth = JSON.parse(readFileSync(authPath, "utf8")) as {
		openrouter?: { key?: string };
	};
	key = auth.openrouter?.key ?? "";
} catch {
	console.error(`Error: cannot read OpenRouter key from ${authPath}`);
	process.exit(2);
}
if (!key) {
	console.error(`Error: no openrouter key in ${authPath}`);
	process.exit(2);
}

// Build a >=4K-token shared system prefix (repeated text ~4K tokens)
const SHARED_PREFIX = `You are a meticulous code reviewer and systems engineer. ${"Here is reference documentation you must follow. ".repeat(200)}`;

const UNIQUE_TAILS = [
	"What is the capital of France?",
	"What is 2+2?",
	"Name a primary color.",
	"What is the largest planet?",
	"What is the boiling point of water in Celsius?",
	"Name a programming language.",
	"What does CPU stand for?",
	"What is the speed of light approximately?",
];

async function probe(): Promise<number> {
	const results: Array<{
		request: number;
		prompt_tokens: number;
		cached_tokens: number;
		cache_write_tokens: number;
		completion_tokens: number;
		model: string | undefined;
	}> = [];

	for (let i = 0; i < numRequests; i++) {
		const tail = UNIQUE_TAILS[i % UNIQUE_TAILS.length]!;
		const body = {
			model,
			messages: [
				{ role: "system", content: SHARED_PREFIX },
				{ role: "user", content: tail },
			],
			max_tokens: 5,
		};

		const res = await fetch("http://localhost:8788/v1/chat/completions", {
			method: "POST",
			headers: {
				Authorization: `Bearer ${key}`,
				"Content-Type": "application/json",
			},
			body: JSON.stringify(body),
			signal: AbortSignal.timeout(60_000),
		});

		if (!res.ok) {
			const text = await res.text().catch(() => "");
			console.error(`Request ${i + 1} failed: HTTP ${res.status} ${text.slice(0, 200)}`);
			if (jsonOutput) {
				console.log(JSON.stringify({ error: `HTTP ${res.status}`, request: i + 1 }));
			}
			process.exit(2);
		}

		const data = (await res.json()) as {
			usage?: {
				prompt_tokens?: number;
				completion_tokens?: number;
				prompt_tokens_details?: {
					cached_tokens?: number;
					cache_write_tokens?: number;
				};
			};
		};

		const usage = data.usage ?? {};
		const details = usage.prompt_tokens_details ?? {};
		const entry = {
			request: i + 1,
			prompt_tokens: usage.prompt_tokens ?? 0,
			cached_tokens: details.cached_tokens ?? 0,
			cache_write_tokens: details.cache_write_tokens ?? 0,
			completion_tokens: usage.completion_tokens ?? 0,
			model,
		};
		results.push(entry);
	}

	const cacheHits = results.slice(1).filter((r) => r.cached_tokens > 0);
	const verdict = cacheHits.length > 0 ? "CACHED" : "NO_CACHE";

	if (jsonOutput) {
		console.log(
			JSON.stringify(
				{
					model,
					verdict,
					cache_hits: cacheHits.length,
					results,
				},
				null,
				2,
			),
		);
	} else {
		console.log(`Model: ${model}`);
		console.log(`Verdict: ${verdict} (${cacheHits.length} cache hits on req 2-${numRequests})`);
		for (const r of results) {
			console.log(
				`  req ${r.request}: prompt=${r.prompt_tokens} cached=${r.cached_tokens} write=${r.cache_write_tokens} completion=${r.completion_tokens}`,
			);
		}
	}

	return cacheHits.length > 0 ? 0 : 1;
}

probe()
	.then((code) => process.exit(code))
	.catch((err) => {
		console.error(`Error: ${err?.message ?? err}`);
		process.exit(2);
	});
