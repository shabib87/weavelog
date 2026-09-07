import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { after, before, describe, test } from "node:test";
import { fileURLToPath } from "node:url";

const BIN = fileURLToPath(
  new URL("../src/tools/prefix-diff.ts", import.meta.url),
);
const TMP = join(tmpdir(), `prefix-diff-test-${Date.now()}`);

function run(args: string[]) {
  return spawnSync(process.execPath, ["--import", "tsx", BIN, ...args], {
    encoding: "utf8",
    timeout: 10_000,
  });
}

function writeJsonl(filename: string, entries: Record<string, unknown>[]) {
  const path = join(TMP, filename);
  writeFileSync(path, entries.map((e) => JSON.stringify(e)).join("\n") + "\n");
  return path;
}

function makeEntry(opts: {
  model?: string;
  request_messages?: unknown[];
  compressed_messages?: unknown[];
  cache_read_tokens?: number;
  transforms_applied?: string[];
}) {
  return {
    request_id: `req-${Math.random().toString(36).slice(2)}`,
    timestamp: new Date().toISOString(),
    provider: "openrouter",
    model: opts.model ?? "z-ai/glm-5.3-flash",
    input_tokens_original: 1000,
    input_tokens_optimized: 900,
    output_tokens: 100,
    tokens_saved: 100,
    savings_percent: 10,
    optimization_latency_ms: 5,
    total_latency_ms: 500,
    tags: {},
    cache_hit: false,
    transforms_applied: opts.transforms_applied ?? [],
    cache_read_tokens: opts.cache_read_tokens ?? 0,
    cache_write_tokens: 0,
    uncached_input_tokens: 900,
    waste_signals: null,
    request_messages: opts.request_messages ?? null,
    compressed_messages: opts.compressed_messages ?? null,
    response_content: null,
    error: null,
    turn_id: null,
  };
}

describe("prefix-diff (happy paths)", () => {
  test("--help exits 0 and shows usage", () => {
    const r = run(["--help"]);
    assert.equal(r.status, 0);
    assert.ok(r.stdout.includes("Usage:"));
  });

  test("TOKEN_MODE_HISTORY_REWRITE: request prefix stable but compressed prefix differs", () => {
    const sys = { role: "system", content: "You are a helpful assistant." };
    const user1 = { role: "user", content: "List files in this directory." };
    const assistant1 = {
      role: "assistant",
      content: "Here are the files: file1.ts, file2.ts",
    };
    const user2 = { role: "user", content: "Read file1.ts" };

    const entry1 = makeEntry({
      request_messages: [sys, user1],
      compressed_messages: [sys, user1],
    });
    const entry2 = makeEntry({
      request_messages: [sys, user1, assistant1, user2],
      compressed_messages: [
        sys,
        { role: "user", content: "[compressed] List files..." },
        { role: "assistant", content: "[compressed] Here are files..." },
        user2,
      ],
    });

    const file = writeJsonl("rewrite.jsonl", [entry1, entry2]);
    const r = run(["--file", file]);
    assert.equal(r.status, 0);
    assert.ok(r.stdout.includes("TOKEN_MODE_HISTORY_REWRITE"));
  });

  test("STABLE: both request and compressed prefixes are identical", () => {
    const sys = { role: "system", content: "You are a helpful assistant." };
    const user1 = { role: "user", content: "List files in this directory." };
    const assistant1 = {
      role: "assistant",
      content: "Here are the files: file1.ts, file2.ts",
    };
    const user2 = { role: "user", content: "Read file1.ts" };

    const entry1 = makeEntry({
      request_messages: [sys, user1],
      compressed_messages: [sys, user1],
    });
    const entry2 = makeEntry({
      request_messages: [sys, user1, assistant1, user2],
      compressed_messages: [sys, user1, assistant1, user2],
    });

    const file = writeJsonl("stable.jsonl", [entry1, entry2]);
    const r = run(["--file", file]);
    assert.equal(r.status, 0);
    assert.ok(r.stdout.includes("STABLE"));
  });

  test("TOKEN_MODE_HISTORY_REWRITE (OpenAI handler): null compressed_messages + content transforms + zero cache", () => {
    const sys = { role: "system", content: "You are a helpful assistant." };
    const user1 = { role: "user", content: "List files." };
    const assistant1 = { role: "assistant", content: "Here are files." };
    const user2 = { role: "user", content: "Read file1." };

    const entry1 = makeEntry({
      request_messages: [sys, user1],
      transforms_applied: [
        "router:text:0.86",
        "openai:chat:tool_schema_compaction",
      ],
      cache_read_tokens: 0,
    });
    const entry2 = makeEntry({
      request_messages: [sys, user1, assistant1, user2],
      transforms_applied: [
        "router:text:0.84",
        "openai:chat:tool_schema_compaction",
      ],
      cache_read_tokens: 0,
    });

    const file = writeJsonl("openai-rewrite.jsonl", [entry1, entry2]);
    const r = run(["--file", file]);
    assert.equal(r.status, 0);
    assert.ok(r.stdout.includes("TOKEN_MODE_HISTORY_REWRITE"));
  });

  test("TOKEN_MODE_HISTORY_REWRITE (real transforms): router:mixed + router:config with zero cache", () => {
    const sys = { role: "system", content: "You are a helpful assistant." };
    const user1 = { role: "user", content: "List files." };
    const assistant1 = { role: "assistant", content: "Here are files." };
    const user2 = { role: "user", content: "Read file1." };

    const entry1 = makeEntry({
      request_messages: [sys, user1],
      transforms_applied: [
        "router:mixed:0.82",
        "openai:chat:tool_schema_compaction",
      ],
      cache_read_tokens: 0,
    });
    const entry2 = makeEntry({
      request_messages: [sys, user1, assistant1, user2],
      transforms_applied: [
        "router:config:0.36",
        "openai:chat:tool_schema_compaction",
      ],
      cache_read_tokens: 0,
    });

    const file = writeJsonl("real-rewrite.jsonl", [entry1, entry2]);
    const r = run(["--file", file]);
    assert.equal(r.status, 0);
    assert.ok(r.stdout.includes("TOKEN_MODE_HISTORY_REWRITE"));
  });

  test("STABLE (OpenAI handler): null compressed_messages + no content transforms", () => {
    const sys = { role: "system", content: "You are a helpful assistant." };
    const user1 = { role: "user", content: "List files." };
    const user2 = { role: "user", content: "Read file1." };

    const entry1 = makeEntry({
      request_messages: [sys, user1],
      transforms_applied: ["openai:chat:tool_schema_compaction"],
      cache_read_tokens: 500,
    });
    const entry2 = makeEntry({
      request_messages: [sys, user1, user2],
      transforms_applied: ["openai:chat:tool_schema_compaction"],
      cache_read_tokens: 800,
    });

    const file = writeJsonl("openai-stable.jsonl", [entry1, entry2]);
    const r = run(["--file", file]);
    assert.equal(r.status, 0);
    assert.ok(r.stdout.includes("STABLE"));
  });

  test("OPENCODE_DYNAMIC_PREFIX: system message changed in request_messages", () => {
    const sysV1 = {
      role: "system",
      content: "You are a helpful assistant. Date: 2026-08-15",
    };
    const sysV2 = {
      role: "system",
      content: "You are a helpful assistant. Date: 2026-08-16",
    };
    const user1 = { role: "user", content: "List files." };
    const user2 = { role: "user", content: "Read file1.ts" };

    const entry1 = makeEntry({
      request_messages: [sysV1, user1],
      compressed_messages: [sysV1, user1],
    });
    const entry2 = makeEntry({
      request_messages: [sysV2, user1, user2],
      compressed_messages: [sysV2, user1, user2],
    });

    const file = writeJsonl("dynamic-prefix.jsonl", [entry1, entry2]);
    const r = run(["--file", file]);
    assert.equal(r.status, 0);
    assert.ok(r.stdout.includes("OPENCODE_DYNAMIC_PREFIX"));
  });

  test("--json outputs structured JSON", () => {
    const sys = { role: "system", content: "System prompt." };
    const user1 = { role: "user", content: "Turn 1." };
    const user2 = { role: "user", content: "Turn 2." };

    const entry1 = makeEntry({
      request_messages: [sys, user1],
      compressed_messages: [sys, user1],
    });
    const entry2 = makeEntry({
      request_messages: [sys, user1, user2],
      compressed_messages: [sys, user1, user2],
    });

    const file = writeJsonl("json-output.jsonl", [entry1, entry2]);
    const r = run(["--file", file, "--json"]);
    assert.equal(r.status, 0);
    const parsed = JSON.parse(r.stdout);
    assert.equal(parsed.verdict, "STABLE");
    assert.ok(Object.hasOwn(parsed, "pairs"));
    assert.equal(Array.isArray(parsed.pairs), true);
  });
});

describe("prefix-diff (unhappy paths)", () => {
  test("missing --file exits 2 with a clear error", () => {
    const r = run([]);
    assert.equal(r.status, 2);
    assert.ok(r.stderr.toLowerCase().includes("--file"));
  });

  test("nonexistent file exits 2 with a read error", () => {
    const r = run(["--file", "/nonexistent/path/to/file.jsonl"]);
    assert.equal(r.status, 2);
    assert.ok(r.stderr.toLowerCase().includes("error"));
  });

  test("JSONL with fewer than 2 entries exits 2 (cannot diff)", () => {
    const entry = makeEntry({
      request_messages: [{ role: "system", content: "sys" }],
      compressed_messages: [{ role: "system", content: "sys" }],
    });
    const file = writeJsonl("single.jsonl", [entry]);
    const r = run(["--file", file]);
    assert.equal(r.status, 2);
    assert.ok(r.stderr.toLowerCase().includes("at least 2"));
  });

  test("malformed JSON exits 2 (not uncaught throw)", () => {
    const path = join(TMP, "malformed.jsonl");
    writeFileSync(path, '{"valid": true}\n{invalid json}\n{"also": true}\n');
    const r = run(["--file", path]);
    assert.equal(r.status, 2);
    assert.ok(r.stderr.toLowerCase().includes("malformed"));
  });
});

before(() => {
  mkdirSync(TMP, { recursive: true });
});

after(() => {
  rmSync(TMP, { recursive: true, force: true });
});
