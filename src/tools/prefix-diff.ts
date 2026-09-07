#!/usr/bin/env -S node --import tsx
/**
 * prefix-diff — detect why provider prompt-cache prefixes are unstable.
 *
 * Loads headroom's request log JSONL, takes consecutive turn pairs, and
 * diffs the prefix (all messages except the final user message) of
 * request_messages (inbound from client). When compressed_messages is
 * available (Anthropic/batch handlers), also diffs the outbound prefix.
 * When compressed_messages is null (OpenAI handler — OpenRouter traffic),
 * uses transforms_applied + cache_read_tokens as evidence.
 *
 * Verdicts:
 *   TOKEN_MODE_HISTORY_REWRITE — request prefix stable but headroom applied
 *     content-rewriting transforms (e.g. router:text:*) and cache_read_tokens
 *     is 0 (headroom's token mode rewrote prior turns)
 *   OPENCODE_DYNAMIC_PREFIX — system message or early history changed in
 *     request_messages (client-side dynamic content)
 *   STABLE — request prefix identical and cache hits observed (or no
 *     content-rewriting transforms applied)
 *   UNKNOWN — neither condition clearly matches
 *
 * Exit codes: 0 success, 2 error (missing file, bad input, <2 entries).
 */
import { existsSync, readFileSync } from "node:fs";

const HELP = `Usage: bun prefix-diff.ts --file <jsonl> [options]

Options:
  --file <path>   Headroom request log JSONL file (required)
  --json          Output structured JSON instead of text
  --help          Show this help

Exit codes: 0 success, 2 error.`;

const args = process.argv.slice(2);
if (args.includes("--help")) {
  console.log(HELP);
  process.exit(0);
}

const fileIdx = args.indexOf("--file");
const filePath = fileIdx >= 0 ? args[fileIdx + 1] : undefined;
const jsonOutput = args.includes("--json");

if (!filePath) {
  console.error(`Error: --file <path> is required\n\n${HELP}`);
  process.exit(2);
}

if (!existsSync(filePath)) {
  console.error(`Error: cannot read file: ${filePath}`);
  process.exit(2);
}

interface LogEntry {
  request_messages?: unknown[] | null;
  compressed_messages?: unknown[] | null;
  model?: string;
  timestamp?: string;
  request_id?: string;
  transforms_applied?: string[];
  cache_read_tokens?: number;
}

function parseJsonl(content: string): LogEntry[] {
  const lines = content
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.length > 0);
  const entries: LogEntry[] = [];
  for (let i = 0; i < lines.length; i++) {
    try {
      entries.push(JSON.parse(lines[i]) as LogEntry);
    } catch {
      console.error(
        `Error: malformed JSON at line ${i + 1}: ${lines[i].slice(0, 100)}`,
      );
      process.exit(2);
    }
  }
  return entries;
}

function findFirstDiff(
  a: unknown[],
  b: unknown[],
): { index: number; detail: string } | null {
  const len = Math.min(a.length, b.length);
  for (let i = 0; i < len; i++) {
    if (JSON.stringify(a[i]) !== JSON.stringify(b[i])) {
      const aMsg = a[i] as { role?: string } | null;
      const bMsg = b[i] as { role?: string } | null;
      return {
        index: i,
        detail: `message[${i}] (role: ${aMsg?.role ?? "?"} vs ${bMsg?.role ?? "?"})`,
      };
    }
  }
  if (a.length !== b.length) {
    return {
      index: len,
      detail: `length differs (${a.length} vs ${b.length})`,
    };
  }
  return null;
}

function hasContentRewriteTransforms(transforms: string[]): boolean {
  // Cache-safe transforms (whitelist): these do NOT rewrite prior turns.
  // tool_schema_compaction is deterministic; noop means no transform; cross_turn_dedup
  // only fires on cold-prefix. Anything else (router:text, router:mixed, router:config,
  // kompress, smart_crusher) rewrites content and busts the provider cache.
  const Safe = new Set([
    "openai:chat:tool_schema_compaction",
    "router:noop",
    "router:cross_turn_dedup",
  ]);
  return transforms.some((t) => !Safe.has(t));
}

function determineVerdict(
  req1: unknown[],
  req2: unknown[],
  comp1: unknown[],
  comp2: unknown[],
  transforms1: string[],
  transforms2: string[],
  cacheRead1: number,
  cacheRead2: number,
): {
  verdict: string;
  request_stable: boolean;
  compressed_stable: boolean;
  request_diff: { index: number; detail: string } | null;
  compressed_diff: { index: number; detail: string } | null;
  evidence: string;
} {
  const prefixLen = Math.min(req1.length, Math.max(req2.length - 1, 0));
  const reqSlice1 = req1.slice(0, prefixLen);
  const reqSlice2 = req2.slice(0, prefixLen);

  const requestDiff = findFirstDiff(reqSlice1, reqSlice2);
  const requestStable = requestDiff === null;

  let compressedDiff: { index: number; detail: string } | null = null;
  let compressedStable = true;

  if (comp1.length > 0 || comp2.length > 0) {
    const compSlice1 = comp1.slice(0, prefixLen);
    const compSlice2 = comp2.slice(0, prefixLen);
    compressedDiff = findFirstDiff(compSlice1, compSlice2);
    compressedStable = compressedDiff === null;
  }

  const contentRewrite =
    hasContentRewriteTransforms(transforms1) ||
    hasContentRewriteTransforms(transforms2);
  const cacheHits = cacheRead1 > 0 || cacheRead2 > 0;

  let verdict: string;
  let evidence: string;

  if (!requestStable) {
    verdict = "OPENCODE_DYNAMIC_PREFIX";
    evidence = `request prefix changed at ${requestDiff?.detail}`;
  } else if (comp1.length === 0 && comp2.length === 0) {
    if (contentRewrite && !cacheHits) {
      verdict = "TOKEN_MODE_HISTORY_REWRITE";
      evidence = `request prefix stable, content-rewriting transforms applied (${[...new Set([...transforms1, ...transforms2])].filter((t) => !["openai:chat:tool_schema_compaction", "router:noop", "router:cross_turn_dedup"].includes(t)).join(", ")}), cache_read_tokens=0`;
    } else {
      verdict = "STABLE";
      evidence = cacheHits
        ? `request prefix stable, cache hits observed (cache_read_tokens: ${cacheRead1}, ${cacheRead2})`
        : `request prefix stable, no content-rewriting transforms detected`;
    }
  } else if (!compressedStable) {
    verdict = "TOKEN_MODE_HISTORY_REWRITE";
    evidence = `request prefix stable but compressed prefix differs at ${compressedDiff?.detail}`;
  } else {
    verdict = "STABLE";
    evidence = `both request and compressed prefixes stable`;
  }

  return {
    verdict,
    request_stable: requestStable,
    compressed_stable: compressedStable,
    request_diff: requestDiff,
    compressed_diff: compressedDiff,
    evidence,
  };
}

const raw = readFileSync(filePath, "utf8");
const entries = parseJsonl(raw);

if (entries.length < 2) {
  console.error(
    `Error: need at least 2 entries to diff (got ${entries.length})`,
  );
  process.exit(2);
}

const pairs: Array<{
  pair: [number, number];
  verdict: string;
  request_stable: boolean;
  compressed_stable: boolean;
  request_diff: { index: number; detail: string } | null;
  compressed_diff: { index: number; detail: string } | null;
  evidence: string;
}> = [];

for (let i = 0; i < entries.length - 1; i++) {
  const e1 = entries[i];
  const e2 = entries[i + 1];

  const req1 = e1.request_messages ?? [];
  const req2 = e2.request_messages ?? [];
  const comp1 = e1.compressed_messages ?? [];
  const comp2 = e2.compressed_messages ?? [];
  const transforms1 = e1.transforms_applied ?? [];
  const transforms2 = e2.transforms_applied ?? [];
  const cacheRead1 = e1.cache_read_tokens ?? 0;
  const cacheRead2 = e2.cache_read_tokens ?? 0;

  const result = determineVerdict(
    req1,
    req2,
    comp1,
    comp2,
    transforms1,
    transforms2,
    cacheRead1,
    cacheRead2,
  );
  pairs.push({ pair: [i, i + 1], ...result });
}

const verdicts = pairs.map((p) => p.verdict);
const overallVerdict = verdicts.every((v) => v === "STABLE")
  ? "STABLE"
  : verdicts.some((v) => v === "OPENCODE_DYNAMIC_PREFIX")
    ? "OPENCODE_DYNAMIC_PREFIX"
    : verdicts.some((v) => v === "TOKEN_MODE_HISTORY_REWRITE")
      ? "TOKEN_MODE_HISTORY_REWRITE"
      : "UNKNOWN";

if (jsonOutput) {
  console.log(JSON.stringify({ verdict: overallVerdict, pairs }, null, 2));
} else {
  console.log(`Verdict: ${overallVerdict}`);
  for (const p of pairs) {
    console.log(
      `  pair[${p.pair[0]}→${p.pair[1]}]: ${p.verdict} — ${p.evidence}` +
        (p.request_diff ? ` | request_diff: ${p.request_diff.detail}` : "") +
        (p.compressed_diff
          ? ` | compressed_diff: ${p.compressed_diff.detail}`
          : ""),
    );
  }
}
process.exit(0);
