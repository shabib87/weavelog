import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { after, before, describe, test } from "node:test";
import { fileURLToPath } from "node:url";

const BIN = fileURLToPath(new URL("../src/cache-probe.ts", import.meta.url));
const TMP = join(tmpdir(), `cache-probe-test-${Date.now()}`);

function run(args: string[]) {
	return spawnSync(process.execPath, ["--import", "tsx", BIN, ...args], {
		encoding: "utf8",
		timeout: 30_000,
	});
}

describe("cache-probe (happy paths)", () => {
	test("--help exits 0 and shows usage", () => {
		const r = run(["--help"]);
		assert.equal(r.status, 0);
		assert.ok(r.stdout.includes("Usage:"));
		assert.ok(r.stdout.includes("--model"));
	});
});

describe("cache-probe (unhappy paths)", () => {
	test("missing --model exits 2 with a clear error", () => {
		const r = run([]);
		assert.equal(r.status, 2);
		assert.ok(r.stderr.toLowerCase().includes("--model"));
	});

	test("empty --model value exits 2", () => {
		const r = run(["--model", ""]);
		assert.equal(r.status, 2);
		assert.ok(r.stderr.toLowerCase().includes("model"));
	});
});

before(() => {
	mkdirSync(TMP, { recursive: true });
});

after(() => {
	rmSync(TMP, { recursive: true, force: true });
});
