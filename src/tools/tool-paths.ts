import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";

/**
 * Single source of truth for locating tool scripts (TASK-71 standard).
 *
 * Every "where is script X" answer lives here. No other module may build
 * tool-script paths — a canary test enforces this.
 *
 * Relies on the build mirroring src/ layout into dist/ (rootDir: src):
 * - dev (tsx):  src/tools/tool-paths.ts → siblings are .ts sources
 * - compiled:   dist/tools/tool-paths.js → siblings are .js artifacts
 */

const HERE = new URL(".", import.meta.url);

/** Absolute path of the directory holding the tool scripts. */
export const toolDir = fileURLToPath(HERE);

/** Repo/package root: src/tools/../.. = package root, dist/tools/../.. = package root. */
export const repoRoot = fileURLToPath(new URL("../..", import.meta.url));

export type ToolScript = { path: string; tsx: boolean };

/** Locate a tool script by basename (no extension). Prefers compiled .js, falls back to .ts under tsx. */
export function toolScript(name: string): ToolScript {
  const js = fileURLToPath(new URL(`./${name}.js`, HERE));
  if (existsSync(js)) return { path: js, tsx: false };
  const ts = fileURLToPath(new URL(`./${name}.ts`, HERE));
  if (existsSync(ts)) return { path: ts, tsx: true };
  throw new Error(`tool-paths: no such tool script: ${name}`);
}

/** File-URL form of toolScript for dynamic import(). */
export function toolScriptHref(name: string): string {
  const js = new URL(`./${name}.js`, HERE);
  if (existsSync(js)) return js.href;
  return new URL(`./${name}.ts`, HERE).href;
}
