#!/usr/bin/env -S node --import tsx
/**
 * mdconvert — route raw binary documents through Microsoft markitdown.
 *
 * Scouts and researchers must never read raw binary documents (PDF/DOCX/PPTX/
 * XLSX/EPub/...) directly. This wrapper decides text vs binary, converts binary
 * input via markitdown ({$HOME}/.local/bin/markitdown), caches the converted
 * markdown, and caps output so a document can never flood an agent's context.
 *
 * Text-vs-binary decision:
 *   - extension in the text allowlist (.md .txt .csv .json .yaml .yml .xml
 *     .html .htm .log .py .ts .js)  -> printed as-is, markitdown never invoked
 *   - any OTHER known extension      -> binary, converted
 *   - unknown/absent extension       -> first bytes sniffed for a NUL byte;
 *     NUL means binary, otherwise the file is treated as text
 *
 * Cache: converted output is written to
 *   <home>/.local/state/weavelog/mdconvert/converted/<sha1(path+mtimeNs)>-<name>.md
 * (created recursively). Only SUCCESSFUL conversions are cached, and the cache
 * holds the FULL converted markdown (the 2000-line cap applies to what is
 * PRINTED, so a cached document can still be located with grep/offset-read). A
 * re-dispatch with an unchanged file reuses the cache without re-running
 * markitdown.
 *
 * Fail contract: an unsupported extension or a failed conversion prints a text
 * stub naming the source file and converter — raw binary bytes are NEVER
 * emitted — and is NOT cached, so a re-dispatch re-attempts. A successful but
 * empty conversion prints an EMPTY marker (distinct from a failure). Printed
 * output over 2000 lines is truncated with a total-count notice (applies to
 * passthrough too).
 *
 * Exit codes: 0 = ok (passthrough, converted, cache hit, or empty result),
 * 1 = UNSUPPORTED or failed conversion, 2 = usage/error.
 *
 * Env overrides (tests/CI only; HOME is the only assumed env):
 *   MDCONVERT_BINARY    converter command (default $HOME/.local/bin/markitdown)
 *   MDCONVERT_CACHE_DIR cache root (default $HOME/.local/state/weavelog/mdconvert/converted)
 */
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
	closeSync,
	existsSync,
	mkdirSync,
	openSync,
	readFileSync,
	readSync,
	statSync,
	writeFileSync,
} from "node:fs";
import { homedir } from "node:os";
import { basename, extname, join, resolve } from "node:path";
import { pathToFileURL } from "node:url";

export const DEFAULT_MAX_LINES = 2000;
const SNIFF_BYTES = 1024;
const CONVERTER_NAME = "markitdown";

export const TEXT_EXTENSIONS = new Set([
	".md",
	".txt",
	".csv",
	".json",
	".yaml",
	".yml",
	".xml",
	".html",
	".htm",
	".log",
	".py",
	".ts",
	".js",
]);

export interface RunResult {
	status: number | null;
	stdout: string;
}

/** Injectable subprocess runner — tests stub this instead of invoking markitdown. */
export type RunCmd = (cmd: string, args: string[]) => RunResult;

export interface MdconvertOptions {
	/** Converter command. Default: $MDCONVERT_BINARY or $HOME/.local/bin/markitdown. */
	binaryPath?: string;
	/** Cache root. Default: $MDCONVERT_CACHE_DIR or $HOME/.local/state/weavelog/mdconvert/converted. */
	cacheDir?: string;
	/** Subprocess runner injection point (tests). */
	run?: RunCmd;
	/** Line cap for PRINTED output (the cache always holds full text). Default 2000. */
	maxLines?: number;
	/** Output sink. Default: process.stdout.write. */
	out?: (chunk: string | Uint8Array) => void;
}

/** Text vs binary classification: allowlist ext -> text; sniffed unknown ext -> NUL wins. */
function isBinary(file: string): boolean {
	const ext = extname(file).toLowerCase();
	if (TEXT_EXTENSIONS.has(ext)) return false;
	if (ext !== "") return true;
	// unknown/absent extension: sniff the first bytes for a NUL byte
	const fd = openSync(file, "r");
	const buf = Buffer.allocUnsafe(SNIFF_BYTES);
	let n = 0;
	try {
		n = readSync(fd, buf, 0, SNIFF_BYTES, 0);
	} finally {
		closeSync(fd);
	}
	return buf.subarray(0, n).includes(0);
}

/** Cache path: <cacheDir>/<sha1(abs path + mtimeNs)>-<basename>.md */
function cachePathFor(file: string, cacheDir: string): string {
	const abs = resolve(file);
	let mtime: string;
	try {
		mtime = statSync(abs, { bigint: true }).mtimeNs.toString();
	} catch {
		mtime = String(statSync(abs).mtimeMs);
	}
	const key = createHash("sha1").update(`${abs}:${mtime}`).digest("hex");
	return join(cacheDir, `${key}-${basename(abs)}.md`);
}

/** UNSUPPORTED stub — text only, never raw bytes. */
function unsupportedStub(source: string, converter: string): string {
	return `# mdconvert: UNSUPPORTED\n\nsource: ${source}\nconverter: ${converter}\n`;
}

/** Apply the line cap; keeps the total line count for the truncation notice. */
function applyCap(content: string, maxLines: number): { text: string; total: number } {
	const lines = content.replace(/\n$/, "").split("\n");
	if (lines.length <= maxLines) {
		return { text: content, total: lines.length };
	}
	const kept = lines.slice(0, maxLines).join("\n");
	return {
		text: `${kept}\n---\n<!-- mdconvert: truncated ${maxLines}/${lines.length} lines -->`,
		total: lines.length,
	};
}

export async function mdconvert(file: string, opts: MdconvertOptions = {}): Promise<number> {
	const home = process.env.HOME ?? homedir();
	const binaryPath =
		opts.binaryPath ?? process.env.MDCONVERT_BINARY ?? join(home, ".local", "bin", CONVERTER_NAME);
	const cacheDir =
		opts.cacheDir ??
		process.env.MDCONVERT_CACHE_DIR ??
		join(home, ".local", "state", "weavelog", "mdconvert", "converted");
	const run: RunCmd =
		opts.run ??
		((cmd: string, args: string[]): RunResult => {
			const r = spawnSync(cmd, args, {
				encoding: "utf8",
				timeout: 120_000,
				maxBuffer: 64 * 1024 * 1024,
			});
			return { status: r.status, stdout: r.stdout || "" };
		});
	const maxLines = opts.maxLines ?? DEFAULT_MAX_LINES;
	const out =
		opts.out ??
		((chunk: string | Uint8Array): void => {
			process.stdout.write(chunk);
		});

	if (!existsSync(file)) {
		console.error(`mdconvert: file not found: ${file} (see --help)`);
		return 2;
	}
	if (statSync(file).isDirectory()) {
		console.error(`mdconvert: not a file: ${file} (see --help)`);
		return 2;
	}

	// text passthrough: bytes as-is, capped, no conversion, no cache
	if (!isBinary(file)) {
		out(applyCap(readFileSync(file, "utf8"), maxLines).text);
		return 0;
	}

	const cachePath = cachePathFor(file, cacheDir);
	if (existsSync(cachePath)) {
		out(applyCap(readFileSync(cachePath, "utf8"), maxLines).text);
		return 0;
	}

	const result = run(binaryPath, [file]);
	if (result.status !== 0) {
		console.error(
			`mdconvert: conversion failed (${basename(binaryPath)} exited ${result.status}) — nothing cached`,
		);
		out(unsupportedStub(resolve(file), basename(binaryPath)));
		return 1;
	}
	if (!result.stdout.trim()) {
		out(`# mdconvert: EMPTY\n\nsource: ${resolve(file)}\nconverter: ${basename(binaryPath)}\n`);
		return 0;
	}

	mkdirSync(cacheDir, { recursive: true });
	writeFileSync(cachePath, result.stdout);
	out(applyCap(result.stdout, maxLines).text);
	return 0;
}

const HELP = `Usage: bun mdconvert.ts [--help] <file>

Route a raw binary document (PDF/DOCX/PPTX/XLSX/EPub/...) through Microsoft
markitdown and print the converted markdown — binary documents are never read
directly by agents.

Text-vs-binary decision:
  text allowlist (.md .txt .csv .json .yaml .yml .xml .html .htm .log .py .ts .js):
      the file is printed as-is; markitdown is never invoked
  any other known extension: converted via markitdown
  unknown/absent extension: first bytes sniffed for a NUL byte —
      NUL means binary, otherwise the file is treated as text

Cache: converted output is written to
  <home>/.local/state/weavelog/mdconvert/converted/<sha1(path+mtimeNs)>-<name>.md
  (created recursively). Only SUCCESSFUL conversions are cached, and the cache
  holds the FULL markdown — the 2000-line cap applies to what is PRINTED, so a
  cached document can still be located with grep/offset-read. A re-dispatch on
  an unchanged file reuses the cache.

Safety: unsupported or failed conversions print a text stub naming the source
and converter — raw binary bytes are never emitted — and are NOT cached, so a
re-dispatch re-attempts the conversion. A successful but empty result prints an
EMPTY marker (distinct from a failure). Printed output over 2000 lines is
truncated with a notice naming the total line count (passthrough included).

Exit codes: 0 = ok (passthrough, converted, cache hit, or empty result),
1 = UNSUPPORTED or failed conversion, 2 = usage/error (bad args, missing file,
not a file).

Env overrides (tests/CI only):
  MDCONVERT_BINARY    converter command (default $HOME/.local/bin/markitdown)
  MDCONVERT_CACHE_DIR cache root (default $HOME/.local/state/weavelog/mdconvert/converted)`;

if (
	process.argv[1] !== undefined &&
	import.meta.url === pathToFileURL(resolve(process.argv[1])).href
) {
	const args = process.argv.slice(2);
	if (args.includes("--help")) {
		console.log(HELP);
		process.exit(0);
	}
	if (args.length !== 1) {
		console.error(
			"mdconvert: expected exactly one file argument — usage: bun mdconvert.ts <file> (see --help)",
		);
		process.exit(2);
	}
	mdconvert(args[0])
		.then((code) => process.exit(code))
		.catch((err) => {
			console.error("mdconvert error:", err?.message ?? err);
			process.exit(2);
		});
}
