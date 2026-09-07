import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, test } from "node:test";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("..", import.meta.url));

/** TASK-71 guardrail: src/tools/tool-paths.ts is the ONLY module allowed to
 *  build tool-script paths. cli/index.ts keeps its own HERE for non-tool
 *  locations (payload temp dirs etc.). Everything else must import the
 *  helpers — no new URL(...) anywhere else in src/. */
const ALLOWED = new Set(["src/tools/tool-paths.ts", "src/cli/index.ts"]);

function walk(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(full));
    else if (statSync(full).isFile() && full.endsWith(".ts")) out.push(full);
  }
  return out;
}

describe("guardrail: tool-script path building lives only in tool-paths.ts", () => {
  test("no new URL() outside the allowed modules", () => {
    const offenders = walk(join(ROOT, "src"))
      .map((f) => relative(ROOT, f))
      .filter(
        (rel) =>
          !ALLOWED.has(rel) &&
          /new\s+URL\(/.test(readFileSync(join(ROOT, rel), "utf8")),
      );
    assert.deepEqual(offenders, []);
  });
});
