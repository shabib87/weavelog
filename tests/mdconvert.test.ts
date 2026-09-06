import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import {
	chmodSync,
	existsSync,
	mkdtempSync,
	readdirSync,
	readFileSync,
	rmSync,
	writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { afterEach, describe, test } from "node:test";
import { fileURLToPath } from "node:url";
import { mdconvert, type RunCmd } from "../src/mdconvert.ts";

const BIN = fileURLToPath(new URL("../src/mdconvert.ts", import.meta.url));

const dirs: string[] = [];
afterEach(() => {
	for (const d of dirs.splice(0)) rmSync(d, { recursive: true, force: true });
});

function tmpDir(prefix: string): string {
	const d = mkdtempSync(join(tmpdir(), prefix));
	dirs.push(d);
	return d;
}

function runCli(
	args: string[],
	env: Record<string, string> = {},
): { status: number | null; stdout: string; stderr: string } {
	const r = spawnSync(process.execPath, ["--import", "tsx", BIN, ...args], {
		encoding: "utf8",
		env: { ...process.env, ...env },
		timeout: 60_000,
	});
	return { status: r.status, stdout: r.stdout || "", stderr: r.stderr || "" };
}

interface FakeOpts {
	stdout?: string;
	status?: number;
	logFile?: string;
}

function fakeRunner(opts: FakeOpts = {}) {
	let invocations = 0;
	const run: RunCmd = (_cmd, _args) => {
		invocations += 1;
		if (opts.logFile) writeFileSync(opts.logFile, "invoked\n", { flag: "a" });
		return { status: opts.status ?? 0, stdout: opts.stdout ?? "# Converted\n" };
	};
	return { run, invocations: () => invocations };
}

function fakeConverterScript(
	dir: string,
	opts: { stdout?: string; exit?: number; logFile?: string } = {},
): string {
	const p = join(dir, "fake-markitdown.sh");
	const lines = ["#!/bin/sh"];
	if (opts.logFile) lines.push(`printf "invoked\\n" >> "${opts.logFile}"`);
	lines.push(`printf '%s' '${opts.stdout ?? "# Fake converted\n"}'`);
	if (opts.exit !== undefined) lines.push(`exit ${opts.exit}`);
	writeFileSync(p, lines.join("\n") + "\n");
	chmodSync(p, 0o755);
	return p;
}

function binaryDoc(dir: string, name = "sample.doox", marker = "BINARY-SECRET"): string {
	const p = join(dir, name);
	writeFileSync(
		p,
		Buffer.concat([
			Buffer.from([0x50, 0x4b, 0x03, 0x04]),
			Buffer.from(marker),
			Buffer.from([0x00, 0x41]),
		]),
	);
	return p;
}

function capture(): {
	out: (c: string | Uint8Array) => void;
	text: () => string;
} {
	let s = "";
	return {
		out: (c) => {
			s += typeof c === "string" ? c : Buffer.from(c).toString("utf8");
		},
		text: () => s,
	};
}

describe("mdconvert (CLI)", () => {
	test("--help exits 0 and shows usage", () => {
		const r = runCli(["--help"]);
		assert.equal(r.status, 0);
		assert.ok(r.stdout.includes("Usage: bun mdconvert.ts"));
	});

	test("no arguments is a usage error (exit 2)", () => {
		const r = runCli([]);
		assert.equal(r.status, 2);
		assert.ok(r.stderr.includes("usage"));
	});

	test("extra arguments is a usage error (exit 2)", () => {
		const r = runCli(["a.txt", "b.txt"]);
		assert.equal(r.status, 2);
		assert.ok(r.stderr.includes("usage"));
	});

	test("missing file exits 2 with a clear error", () => {
		const r = runCli([join(tmpDir("md-nowhere"), "nope.pdf")]);
		assert.equal(r.status, 2);
		assert.ok(r.stderr.includes("not found"));
	});

	test("directory argument is a usage error (exit 2)", () => {
		const dir = tmpDir("md-dir");
		const r = runCli([dir]);
		assert.equal(r.status, 2);
		assert.ok(r.stderr.includes("not a file"));
	});
});

describe("mdconvert (text passthrough)", () => {
	test("allowlisted extension is printed as-is without invoking the converter", async () => {
		const dir = tmpDir("md-text");
		const file = join(dir, "notes.md");
		writeFileSync(file, "# Notes\n\nplain text\n");
		const fake = fakeRunner({ logFile: join(dir, "invocations.log") });
		const cap = capture();
		const code = await mdconvert(file, {
			run: fake.run,
			cacheDir: join(dir, "cache"),
			out: cap.out,
		});
		assert.equal(code, 0);
		assert.equal(cap.text(), "# Notes\n\nplain text\n");
		assert.equal(fake.invocations(), 0);
		assert.equal(existsSync(join(dir, "invocations.log")), false);
	});

	test("unknown extension without NUL bytes passes through as text", async () => {
		const dir = tmpDir("md-sniff");
		const file = join(dir, "README");
		writeFileSync(file, "no extension, no NUL");
		const fake = fakeRunner();
		const cap = capture();
		const code = await mdconvert(file, {
			run: fake.run,
			cacheDir: join(dir, "cache"),
			out: cap.out,
		});
		assert.equal(code, 0);
		assert.equal(cap.text(), "no extension, no NUL");
		assert.equal(fake.invocations(), 0);
	});

	test("unknown extension with a NUL byte in the first bytes is binary and converts", async () => {
		const dir = tmpDir("md-nul");
		const file = join(dir, "blob");
		writeFileSync(
			file,
			Buffer.concat([Buffer.from("head"), Buffer.from([0x00]), Buffer.from("tail")]),
		);
		const fake = fakeRunner({ stdout: "# from blob\n" });
		const cap = capture();
		const cacheDir = join(dir, "cache");
		const code = await mdconvert(file, {
			run: fake.run,
			cacheDir,
			out: cap.out,
		});
		assert.equal(code, 0);
		assert.equal(fake.invocations(), 1);
		assert.equal(cap.text(), "# from blob\n");
		assert.equal(readdirSync(cacheDir).length, 1);
	});

	test("text passthrough writes no cache file", async () => {
		const dir = tmpDir("md-nocache");
		const file = join(dir, "data.json");
		writeFileSync(file, '{"a": 1}\n');
		const cacheDir = join(dir, "cache");
		const code = await mdconvert(file, { cacheDir, out: capture().out });
		assert.equal(code, 0);
		assert.equal(existsSync(cacheDir), false);
	});

	test("CLI: text file does not invoke the converter even when it would fail", () => {
		const dir = tmpDir("md-cli-text");
		const file = join(dir, "readme.txt");
		writeFileSync(file, "hello\n");
		const r = runCli([file], { MDCONVERT_BINARY: "/bin/false" });
		assert.equal(r.status, 0);
		assert.equal(r.stdout, "hello\n");
	});
});

describe("mdconvert (binary conversion + cache)", () => {
	test("binary doc converts and caches a <sha1>-<basename>.md under the cache dir", async () => {
		const dir = tmpDir("md-conv");
		const file = binaryDoc(dir);
		const cacheDir = join(dir, "cache", "converted");
		const fake = fakeRunner({ stdout: "# Converted Title\n\nbody text\n" });
		const cap = capture();
		const code = await mdconvert(file, {
			run: fake.run,
			cacheDir,
			out: cap.out,
		});
		assert.equal(code, 0);
		assert.equal(cap.text(), "# Converted Title\n\nbody text\n");
		assert.equal(fake.invocations(), 1);
		const entries = readdirSync(cacheDir);
		assert.equal(entries.length, 1);
		assert.match(entries[0], /^[0-9a-f]{40}-sample\.doox\.md$/);
		assert.equal(
			readFileSync(join(cacheDir, entries[0]), "utf8"),
			"# Converted Title\n\nbody text\n",
		);
	});

	test("default cache layout is <home>/.local/state/flightlead/mdconvert/converted and is created recursively", () => {
		const dir = tmpDir("md-layout");
		const file = binaryDoc(dir, "report.doox");
		const fakeHome = join(dir, "fake-home");
		const r = runCli([file], {
			HOME: fakeHome,
			MDCONVERT_BINARY: fakeConverterScript(dir, { stdout: "# hi\n" }),
		});
		assert.equal(r.status, 0);
		assert.equal(r.stdout, "# hi\n");
		const cacheDir = join(fakeHome, ".local", "state", "flightlead", "mdconvert", "converted");
		assert.equal(existsSync(cacheDir), true);
		assert.equal(readdirSync(cacheDir).length, 1);
	});

	test("cache reuse: second run with unchanged mtime does not re-invoke the converter", async () => {
		const dir = tmpDir("md-reuse");
		const file = binaryDoc(dir);
		const fake = fakeRunner({
			stdout: "# v1\n",
			logFile: join(dir, "invocations.log"),
		});
		const cacheDir = join(dir, "cache");
		const first = capture();
		const code1 = await mdconvert(file, {
			run: fake.run,
			cacheDir,
			out: first.out,
		});
		assert.equal(code1, 0);
		const second = capture();
		const code2 = await mdconvert(file, {
			run: fake.run,
			cacheDir,
			out: second.out,
		});
		assert.equal(code2, 0);
		assert.equal(fake.invocations(), 1);
		assert.equal(second.text(), first.text());
		assert.equal(readFileSync(join(dir, "invocations.log"), "utf8"), "invoked\n");
	});

	test("CLI: re-dispatch reuses the cache (marker file written exactly once)", () => {
		const dir = tmpDir("md-cli-reuse");
		const file = binaryDoc(dir, "doc.pdf");
		const logFile = join(dir, "invocations.log");
		const env = {
			HOME: join(dir, "fake-home"),
			MDCONVERT_BINARY: fakeConverterScript(dir, {
				stdout: "# pdf\n",
				logFile,
			}),
			MDCONVERT_CACHE_DIR: join(dir, "cache"),
		};
		const r1 = runCli([file], env);
		assert.equal(r1.status, 0);
		const r2 = runCli([file], env);
		assert.equal(r2.status, 0);
		assert.equal(readFileSync(logFile, "utf8"), "invoked\n");
	});

	test("changed mtime produces a new cache key and re-converts", async () => {
		const dir = tmpDir("md-mtime");
		const file = binaryDoc(dir, "again.doox");
		const cacheDir = join(dir, "cache");
		const fake = fakeRunner();
		const code1 = await mdconvert(file, {
			run: fake.run,
			cacheDir,
			out: capture().out,
		});
		assert.equal(code1, 0);
		writeFileSync(file, Buffer.from("PK\u0003\u0004changed\u0000bytes"));
		const code2 = await mdconvert(file, {
			run: fake.run,
			cacheDir,
			out: capture().out,
		});
		assert.equal(code2, 0);
		assert.equal(fake.invocations(), 2);
		assert.equal(readdirSync(cacheDir).length, 2);
	});

	test("a failed conversion is NOT cached: a later working converter succeeds on re-dispatch", async () => {
		const dir = tmpDir("md-stub-nocache");
		const file = binaryDoc(dir, "tricky.doox");
		const cacheDir = join(dir, "cache");
		const failRun: RunCmd = () => ({ status: 1, stdout: "" });
		const code1 = await mdconvert(file, {
			run: failRun,
			cacheDir,
			out: capture().out,
		});
		assert.equal(code1, 1);
		assert.equal(existsSync(cacheDir), false);
		const okRun: RunCmd = () => ({ status: 0, stdout: "# would-convert\n" });
		const cap = capture();
		const code2 = await mdconvert(file, { run: okRun, cacheDir, out: cap.out });
		assert.equal(code2, 0);
		assert.equal(cap.text(), "# would-convert\n");
		assert.ok(!cap.text().includes("UNSUPPORTED"));
	});
});

describe("mdconvert (UNSUPPORTED stays text-only)", () => {
	test("conversion failure prints a stub to stdout, exits 1, caches nothing, raw bytes never emitted", async () => {
		const dir = tmpDir("md-fail");
		const file = binaryDoc(dir, "bad.doox", "RAW-BYTES-SECRET");
		const cacheDir = join(dir, "cache");
		const fake = fakeRunner({ status: 1, stdout: "" });
		const cap = capture();
		const code = await mdconvert(file, {
			run: fake.run,
			cacheDir,
			out: cap.out,
		});
		assert.equal(code, 1);
		assert.ok(cap.text().includes("# mdconvert: UNSUPPORTED"));
		assert.ok(cap.text().includes(`source: ${resolve(file)}`));
		assert.ok(cap.text().includes("markitdown"));
		assert.ok(!cap.text().includes("RAW-BYTES-SECRET"));
		assert.equal(existsSync(cacheDir), false);
	});

	test("CLI: unsupported conversion exits 1 with a stub and never the raw bytes", () => {
		const dir = tmpDir("md-cli-fail");
		const file = binaryDoc(dir, "bad.pdf", "RAW-BYTES-SECRET");
		const r = runCli([file], {
			HOME: join(dir, "fake-home"),
			MDCONVERT_BINARY: fakeConverterScript(dir, { exit: 1 }),
			MDCONVERT_CACHE_DIR: join(dir, "cache"),
		});
		assert.equal(r.status, 1);
		assert.ok(r.stdout.includes("# mdconvert: UNSUPPORTED"));
		assert.ok(!r.stdout.includes("RAW-BYTES-SECRET"));
	});

	test("missing converter binary is a failed conversion (exit 1), not a crash", async () => {
		const dir = tmpDir("md-nobin");
		const file = binaryDoc(dir);
		const cap = capture();
		const code = await mdconvert(file, {
			binaryPath: join(dir, "no-such-markitdown"),
			cacheDir: join(dir, "cache"),
			out: cap.out,
		});
		assert.equal(code, 1);
		assert.ok(cap.text().includes("UNSUPPORTED"));
	});
});

describe("mdconvert (output cap)", () => {
	function longOutput(lineCount: number): string {
		return Array.from({ length: lineCount }, (_, i) => `line ${i}`).join("\n");
	}

	test("output over 2000 lines is truncated on print with a notice; the cache holds the FULL text", async () => {
		const dir = tmpDir("md-cap");
		const file = binaryDoc(dir, "big.doox");
		const cacheDir = join(dir, "cache");
		const full = `${longOutput(2500)}\n`;
		const fake = fakeRunner({ stdout: full });
		const cap = capture();
		const code = await mdconvert(file, {
			run: fake.run,
			cacheDir,
			out: cap.out,
		});
		assert.equal(code, 0);
		assert.ok(cap.text().includes("<!-- mdconvert: truncated 2000/2500 lines -->"));
		assert.equal(cap.text().split("\n").length, 2002);
		const entries = readdirSync(cacheDir);
		assert.equal(entries.length, 1);
		assert.equal(readFileSync(join(cacheDir, entries[0]), "utf8"), full);
	});

	test("successful but empty converter output prints an EMPTY marker and caches nothing", async () => {
		const dir = tmpDir("md-empty");
		const file = binaryDoc(dir);
		const cacheDir = join(dir, "cache");
		const fake = fakeRunner({ stdout: "" });
		const cap = capture();
		const code = await mdconvert(file, { run: fake.run, cacheDir, out: cap.out });
		assert.equal(code, 0);
		assert.ok(cap.text().includes("# mdconvert: EMPTY"));
		assert.ok(cap.text().includes(`source: ${resolve(file)}`));
		assert.equal(existsSync(cacheDir), false);
	});

	test("text passthrough over the cap is truncated with a notice (token-flood guard)", async () => {
		const dir = tmpDir("md-cap-text");
		const file = join(dir, "big.log");
		const log = Array.from({ length: 2100 }, (_, i) => `log ${i}`).join("\n") + "\n";
		writeFileSync(file, log);
		const cap = capture();
		const code = await mdconvert(file, { cacheDir: join(dir, "cache"), out: cap.out });
		assert.equal(code, 0);
		assert.ok(cap.text().includes("<!-- mdconvert: truncated 2000/2100 lines -->"));
		assert.equal(cap.text().split("\n").length, 2002);
	});

	test("output within the cap is passed through unchanged", async () => {
		const dir = tmpDir("md-nocap");
		const file = binaryDoc(dir);
		const fake = fakeRunner({ stdout: "small\noutput\n" });
		const cap = capture();
		const code = await mdconvert(file, {
			run: fake.run,
			cacheDir: join(dir, "cache"),
			out: cap.out,
		});
		assert.equal(code, 0);
		assert.equal(cap.text(), "small\noutput\n");
		assert.ok(!cap.text().includes("truncated"));
	});

	test("exactly-at-cap output (2000 lines) is not truncated", async () => {
		const dir = tmpDir("md-exactcap");
		const file = binaryDoc(dir);
		const exact = longOutput(2000);
		const fake = fakeRunner({ stdout: exact });
		const cap = capture();
		const code = await mdconvert(file, {
			run: fake.run,
			cacheDir: join(dir, "cache"),
			out: cap.out,
		});
		assert.equal(code, 0);
		assert.equal(cap.text(), exact);
		assert.ok(!cap.text().includes("truncated"));
	});

	test("large converted output (>1MB) is not dropped by the subprocess buffer cap", () => {
		const dir = tmpDir("md-big");
		const file = binaryDoc(dir, "big.pdf");
		const big = Array.from({ length: 300_000 }, (_, i) => `line ${i}`).join("\n");
		const script = join(dir, "big-markitdown.sh");
		writeFileSync(script, `#!/bin/sh\nprintf '%s' '${big}'\n`);
		chmodSync(script, 0o755);
		const r = runCli([file], {
			HOME: join(dir, "fake-home"),
			MDCONVERT_BINARY: script,
			MDCONVERT_CACHE_DIR: join(dir, "cache"),
		});
		assert.equal(r.status, 0);
		assert.ok(r.stdout.includes("<!-- mdconvert: truncated 2000/300000 lines -->"));
	});
});
