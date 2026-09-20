import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { extname, join } from "node:path";
import { test } from "node:test";
import { scanFile } from "../../src/tools/privacy-audit.js";

const TEXT_EXTENSIONS = new Set([
  ".md",
  ".txt",
  ".json",
  ".jsonc",
  ".yaml",
  ".yml",
  ".toml",
  ".ts",
  ".js",
  ".sh",
]);

const SKIP_DIRS = new Set(["node_modules", ".git", "dist"]);

function walkTextFiles(dir: string): string[] {
  const files: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const stat = statSync(full);
    if (stat.isDirectory()) {
      if (SKIP_DIRS.has(entry)) continue;
      files.push(...walkTextFiles(full));
    } else if (stat.isFile() && TEXT_EXTENSIONS.has(extname(entry))) {
      files.push(full);
    }
  }
  return files;
}

for (const root of ["payload", "docs"]) {
  test(`${root} contains no personal identifiers or secrets`, () => {
    const offenders: string[] = [];
    for (const file of walkTextFiles(root)) {
      const content = readFileSync(file, "utf8");
      for (const o of scanFile(file, content)) {
        offenders.push(`${o.file}:${o.line} [${o.rule}] ${o.excerpt}`);
      }
    }
    assert.deepEqual(offenders, []);
  });
}
