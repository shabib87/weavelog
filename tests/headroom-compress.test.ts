import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { createServer, type Server } from "node:http";
import { afterEach, describe, test } from "node:test";
import { fileURLToPath } from "node:url";
import { headroomCompress } from "../src/tools/headroom-compress.ts";

const BIN = fileURLToPath(
  new URL("../src/tools/headroom-compress.ts", import.meta.url),
);

const servers: Server[] = [];
afterEach(() => {
  for (const s of servers.splice(0)) {
    s.closeAllConnections();
    s.close();
  }
});

const proxyUp = await fetch("http://localhost:8788/health", {
  signal: AbortSignal.timeout(5_000),
})
  .then((r) => r.ok)
  .catch(() => false);

const SKIP_LIVE = proxyUp ? false : "requires live headroom proxy";

interface Msg {
  role: string;
  content: string;
}

const LOREM =
  "lorem ipsum dolor sit amet consectetur adipiscing elit sed do eiusmod tempor incididunt ut labore et dolore magna aliqua ";

function mockToolResults(count: number, loremRepeats: number): Msg[] {
  const chunk = LOREM.repeat(loremRepeats);
  return Array.from({ length: count }, (_, i) => ({
    role: "user",
    content: `tool result ${i}: ${chunk}`,
  }));
}

describe("headroom-compress (happy paths, live proxy)", () => {
  test("compresses a 2K-token payload with tokens_saved > 0", {
    skip: SKIP_LIVE,
  }, async () => {
    const messages = mockToolResults(50, 3);
    const r = await headroomCompress(messages);
    assert.ok(r.tokens_saved > 0);
    assert.ok(r.tokens_before > r.tokens_after);
    assert.equal(r.messages.length, messages.length);
  });

  test('mode "ccr" populates ccr_hashes', {
    skip: SKIP_LIVE,
    timeout: 60_000,
  }, async () => {
    const messages = mockToolResults(20, 40);
    const r = await headroomCompress(messages, { mode: "ccr" });
    assert.equal(Array.isArray(r.ccr_hashes), true);
    assert.ok(r.ccr_hashes.length > 0);
  });

  test("frozen_message_count 4 of 6 leaves the first 4 messages unchanged", {
    skip: SKIP_LIVE,
  }, async () => {
    const messages = mockToolResults(6, 10);
    const r = await headroomCompress(messages, { frozen_message_count: 4 });
    assert.deepEqual(r.messages.slice(0, 4), messages.slice(0, 4));
  });

  test("large 10K-token payload compresses with tokens_saved > 0", {
    skip: SKIP_LIVE,
    timeout: 60_000,
  }, async () => {
    const messages = mockToolResults(20, 20);
    const r = await headroomCompress(messages);
    assert.ok(r.tokens_saved > 0);
  });
});

describe("headroom-compress (unhappy paths)", () => {
  test("proxy down: returns original messages with zeroed metrics, does not throw", async () => {
    const messages = mockToolResults(3, 50);
    const r = await headroomCompress(messages, {
      baseUrl: "http://127.0.0.1:9",
    });
    assert.deepEqual(r.messages, messages);
    assert.equal(r.tokens_saved, 0);
    assert.equal(r.tokens_before, 0);
    assert.equal(r.tokens_after, 0);
    assert.deepEqual(r.transforms_applied, []);
    assert.deepEqual(r.ccr_hashes, []);
  });

  test("proxy returns HTTP error: fail-open with original messages", async () => {
    const messages = mockToolResults(3, 50);
    const r = await headroomCompress(messages, {
      baseUrl: "http://127.0.0.1:9",
    });
    assert.deepEqual(r.messages, messages);
  });

  test("--help exits 0 and documents endpoint, knobs, and response shape", () => {
    const r = spawnSync(process.execPath, ["--import", "tsx", BIN, "--help"], {
      encoding: "utf8",
      timeout: 60_000,
    });
    assert.equal(r.status, 0);
    assert.ok(r.stdout.includes("/v1/compress"));
    assert.ok(r.stdout.includes("frozen_message_count"));
    assert.ok(r.stdout.includes("tokens_saved"));
    assert.ok(r.stdout.includes("Fail-open"));
  });
});

describe("headroom-compress (reviewer fix round)", () => {
  function stubServer(
    body: unknown,
    capture?: { request?: unknown },
  ): Promise<string> {
    return new Promise((resolve) => {
      const server = createServer(async (req, res) => {
        let raw = "";
        for await (const chunk of req) raw += chunk;
        if (capture && raw) capture.request = JSON.parse(raw);
        const payload = typeof body === "string" ? body : JSON.stringify(body);
        res.writeHead(200, { "content-type": "application/json" });
        res.end(payload);
      });
      servers.push(server);
      server.listen(0, "127.0.0.1", () => {
        const addr = server.address();
        const port = typeof addr === "object" && addr !== null ? addr.port : 0;
        resolve(`http://127.0.0.1:${port}`);
      });
    });
  }

  test("200 with malformed body shape fails open with original messages", async () => {
    const baseUrl = await stubServer({ foo: "bar" });
    const messages = mockToolResults(3, 1);
    const r = await headroomCompress(messages, { baseUrl });
    assert.deepEqual(r.messages, messages);
    assert.equal(r.tokens_saved, 0);
  });

  test("200 with non-string message content fails open", async () => {
    const baseUrl = await stubServer({
      messages: [{ role: "user", content: 42 }],
      tokens_before: 10,
      tokens_after: 5,
      tokens_saved: 5,
      compression_ratio: 0.5,
      transforms_applied: [],
      ccr_hashes: [],
    });
    const messages = mockToolResults(3, 1);
    const r = await headroomCompress(messages, { baseUrl });
    assert.deepEqual(r.messages, messages);
  });

  test("200 with valid shape passes through", async () => {
    const compressed = [{ role: "user", content: "compressed" }];
    const baseUrl = await stubServer({
      messages: compressed,
      tokens_before: 100,
      tokens_after: 10,
      tokens_saved: 90,
      compression_ratio: 0.1,
      transforms_applied: ["router:text:0.1"],
      ccr_hashes: [],
    });
    const r = await headroomCompress(mockToolResults(3, 1), { baseUrl });
    assert.deepEqual(r.messages, compressed);
    assert.equal(r.tokens_saved, 90);
  });

  test("non-finite numeric knobs are not forwarded to the proxy", async () => {
    const capture: { request?: { config?: Record<string, unknown> } } = {};
    const baseUrl = await stubServer(
      {
        messages: [],
        tokens_before: 0,
        tokens_after: 0,
        tokens_saved: 0,
        compression_ratio: 1,
        transforms_applied: [],
        ccr_hashes: [],
      },
      capture,
    );
    await headroomCompress(mockToolResults(2, 1), {
      baseUrl,
      target_ratio: Number.NaN,
      frozen_message_count: Number.POSITIVE_INFINITY,
      protect_recent: 2,
    });
    assert.deepEqual(capture.request?.config, { protect_recent: 2 });
  });
});
