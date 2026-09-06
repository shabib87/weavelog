#!/usr/bin/env -S node --import tsx
/**
 * headroom-compress — thin helper for POST /v1/compress via fetch(), no SDK dependency.
 *
 * The proxy compresses LLM traffic (opencode -> proxy -> OpenRouter); this helper lets
 * scripts compress handoff data that never crosses the proxy (subagent results, file
 * batches) before it enters an agent's context.
 *
 * Fail-open contract: if the proxy is down, errors, or returns garbage, the original
 * messages are returned unchanged with zeroed metrics. This function never throws —
 * scripts must not crash because headroom is unavailable.
 *
 * Exit codes (CLI): 0 = help shown, 2 = unknown flag.
 */

import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

export interface CompressMessage {
	role: string;
	content: string;
}

export interface CompressOptions {
	/** Model whose tokenizer/config the proxy compresses for. Default: z-ai/glm-5.3-flash */
	model?: string;
	/** "ccr" emits <<ccr:...>> markers + writes to the CCR store. Unset = marker-free. */
	mode?: "ccr";
	/** Leading messages already cached upstream — never recompressed. */
	frozen_message_count?: number;
	/** Target compression ratio (0..1). */
	target_ratio?: number;
	/** Trailing messages protected from compression. */
	protect_recent?: number;
	/** Proxy base URL. Default: http://localhost:8788 */
	baseUrl?: string;
}

export interface CompressResult {
	messages: CompressMessage[];
	tokens_before: number;
	tokens_after: number;
	tokens_saved: number;
	compression_ratio: number;
	transforms_applied: string[];
	ccr_hashes: string[];
}

const DEFAULT_BASE_URL = "http://localhost:8788";

function failOpen(messages: CompressMessage[]): CompressResult {
	return {
		messages,
		tokens_before: 0,
		tokens_after: 0,
		tokens_saved: 0,
		compression_ratio: 0,
		transforms_applied: [],
		ccr_hashes: [],
	};
}

function isValidResult(data: unknown): data is CompressResult {
	if (!data || typeof data !== "object") return false;
	const d = data as Record<string, unknown>;
	if (!Array.isArray(d.messages)) return false;
	for (const m of d.messages) {
		if (!m || typeof m !== "object") return false;
		const msg = m as Record<string, unknown>;
		if (typeof msg.role !== "string" || typeof msg.content !== "string") return false;
	}
	for (const k of ["tokens_before", "tokens_after", "tokens_saved", "compression_ratio"] as const) {
		if (typeof d[k] !== "number" || !Number.isFinite(d[k])) return false;
	}
	if (!Array.isArray(d.transforms_applied) || !Array.isArray(d.ccr_hashes)) return false;
	return true;
}

export async function headroomCompress(
	messages: CompressMessage[],
	options: CompressOptions = {},
): Promise<CompressResult> {
	const {
		model = "z-ai/glm-5.3-flash",
		mode,
		frozen_message_count,
		target_ratio,
		protect_recent,
		baseUrl = DEFAULT_BASE_URL,
	} = options;
	const config: Record<string, unknown> = {};
	if (mode !== undefined) config.mode = mode;
	if (Number.isFinite(frozen_message_count)) config.frozen_message_count = frozen_message_count;
	if (Number.isFinite(target_ratio)) config.target_ratio = target_ratio;
	if (Number.isFinite(protect_recent)) config.protect_recent = protect_recent;
	try {
		const res = await fetch(`${baseUrl}/v1/compress`, {
			method: "POST",
			headers: { "content-type": "application/json" },
			body: JSON.stringify({ messages, model, config }),
			signal: AbortSignal.timeout(30_000),
		});
		if (!res.ok) return failOpen(messages);
		const data: unknown = await res.json();
		if (!isValidResult(data)) return failOpen(messages);
		return data;
	} catch {
		return failOpen(messages);
	}
}

const HELP = `Usage: bun headroom-compress.ts --help

Thin helper for POST http://localhost:8788/v1/compress via fetch() — no SDK dependency.
Import it; do not shell out:

  import { headroomCompress } from "./headroom-compress.js";
  const r = await headroomCompress(messages, { mode: "ccr", frozen_message_count: 4 });

Endpoint: POST <baseUrl>/v1/compress  (baseUrl default http://localhost:8788)
Request:  { messages: [{role, content}], model, config: { ...knobs } }

Config knobs (all optional):
  model                 default "z-ai/glm-5.3-flash"
  mode                  "ccr" = <<ccr:...>> markers + CCR store write; unset = marker-free
  frozen_message_count  leading messages already cached upstream (never recompressed —
                        resend previously-forwarded compressed messages, not originals)
  target_ratio          target compression ratio (0..1)
  protect_recent        trailing messages protected from compression
  baseUrl               override the proxy base URL

Response (snake_case): { messages, tokens_before, tokens_after, tokens_saved,
  compression_ratio, transforms_applied, ccr_hashes }

Fail-open: if the proxy is down, errors, or returns garbage, the original messages are
returned unchanged with zeroed metrics. headroomCompress() never throws.

Exit codes: 0 = help shown, 2 = unknown flag.`;

if (
	process.argv[1] !== undefined &&
	import.meta.url === pathToFileURL(resolve(process.argv[1])).href
) {
	const args = process.argv.slice(2);
	if (args.length === 0 || args.includes("--help")) {
		console.log(HELP);
		process.exit(0);
	}
	console.error(`unknown argument: ${args[0]} (see --help)`);
	process.exit(2);
}
