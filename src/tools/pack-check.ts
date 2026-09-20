import { existsSync, readFileSync } from "node:fs";
import { basename } from "node:path";
import { fileURLToPath } from "node:url";

/**
 * Pack check (TASK-63 AC#7): asserts an `npm pack --dry-run --json` manifest
 * ships a fresh build (`dist/cli/index.js`), the payload, and zero backlog
 * files. Wired into `prepack` and CI so a bad tarball cannot ship.
 */

export interface PackCheckResult {
  ok: boolean;
  files: string[];
  failures: string[];
  detail: string;
}

export function parsePackJson(text: string): string[] {
  const parsed: unknown = JSON.parse(text);
  if (!Array.isArray(parsed)) {
    throw new Error("npm pack manifest must be a JSON array");
  }
  const files: string[] = [];
  for (const entry of parsed) {
    const list = (entry as { files?: Array<{ path?: string }> }).files ?? [];
    for (const file of list) {
      if (file && typeof file.path === "string") files.push(file.path);
    }
  }
  return files;
}

export function checkPackContents(files: string[]): PackCheckResult {
  const normalized = files.map((f) => f.replace(/^\.\//, ""));
  const failures: string[] = [];
  if (normalized.length === 0) {
    failures.push("tarball contains no files");
  }
  if (!normalized.includes("dist/cli/index.js")) {
    failures.push("missing dist/cli/index.js (build did not run before pack)");
  }
  if (!normalized.some((f) => f.startsWith("payload/"))) {
    failures.push("missing payload/ files");
  }
  const backlog = normalized.filter(
    (f) => f.startsWith("backlog/") || f.includes("/backlog/"),
  );
  if (backlog.length > 0) {
    failures.push(`backlog files must not ship: ${backlog.join(", ")}`);
  }
  const ok = failures.length === 0;
  return {
    ok,
    files: normalized,
    failures,
    detail: ok
      ? `pack-check: ${normalized.length} files, dist+payload present, no backlog`
      : `pack-check: ${failures.join("; ")}`,
  };
}

export function packCheckForFile(path: string): PackCheckResult {
  try {
    if (!existsSync(path)) {
      throw new Error(`pack manifest not found: ${path}`);
    }
    return checkPackContents(parsePackJson(readFileSync(path, "utf8")));
  } catch (err) {
    return {
      ok: false,
      files: [],
      failures: [],
      detail: `pack-check: ${(err as Error).message}`,
    };
  }
}

function main(): void {
  const [path] = process.argv.slice(2);
  if (!path) {
    console.error(
      "pack-check: usage: node --import tsx src/tools/pack-check.ts <pack.json>",
    );
    process.exit(2);
  }
  const result = packCheckForFile(path);
  console.log(result.detail);
  process.exit(result.ok ? 0 : 1);
}

if (
  process.argv[1] &&
  basename(fileURLToPath(import.meta.url)) === basename(process.argv[1])
) {
  main();
}
