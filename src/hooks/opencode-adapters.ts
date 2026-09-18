import {
  existsSync,
  mkdirSync,
  readFileSync,
  realpathSync,
  writeFileSync,
} from "node:fs";
import { join, relative, resolve } from "node:path";
import { pathToFileURL } from "node:url";

export const ADAPTER_AUDIT_FILE = "adapter-audit.jsonl";

const ADAPTERS = [
  { name: "enforce", exportName: "Enforce", hook: "enforce.js" },
  { name: "verify-gate", exportName: "default", hook: "verify-gate.js" },
  { name: "opencode-tmp", exportName: "WeavelogTmp", hook: "opencode-tmp.js" },
] as const;

export interface AdapterOptions {
  packageRoot: string;
  configRoot: string;
  stateDir: string;
}

export interface EmittedAdapter {
  name: (typeof ADAPTERS)[number]["name"];
  path: string;
  target: string;
}

export interface AdapterHealth {
  name: string;
  ok: boolean;
  detail: string;
}

export interface AdaptersHealth {
  ok: boolean;
  detail: string;
  adapters: AdapterHealth[];
}

function containedPath(root: string, target: string): boolean {
  const rel = relative(root, target);
  return rel !== "" && !rel.startsWith("..") && !rel.includes("../");
}

function loaderSource(
  name: string,
  exportName: string,
  target: string,
  auditPath: string,
): string {
  const imported =
    exportName === "default"
      ? "default as hookPlugin"
      : `${exportName} as hookPlugin`;
  return `// weavelog-opencode-adapter-v1 ${JSON.stringify({ name, target })}
import { appendFileSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { ${imported} } from ${JSON.stringify(pathToFileURL(target).href)};

const auditPath = ${JSON.stringify(auditPath)};
function receipt(outcome, event, error) {
  try {
    mkdirSync(dirname(auditPath), { recursive: true });
    appendFileSync(auditPath, JSON.stringify({
      ts: new Date().toISOString(), adapter: ${JSON.stringify(name)}, outcome,
      sessionID: event?.sessionID, callID: event?.callID,
      error: error instanceof Error ? error.message : undefined,
    }) + "\\n");
  } catch { /* A receipt failure must never turn a refusal into success. */ }
}

export default async function weavelogOpenCodeAdapter(context) {
  try {
    const hooks = await hookPlugin(context);
    receipt("loaded");
    return Object.fromEntries(Object.entries(hooks).map(([eventName, handler]) => [eventName, async (...args) => {
      try {
        const result = await handler(...args);
        receipt("gate-result", args[0]);
        return result;
      }
      catch (error) { receipt("gate-refusal", args[0], error); throw error; }
    }]));
  } catch (error) {
    receipt("adapter-load-failure", undefined, error);
    throw error;
  }
}
`;
}

function hasRequiredExport(source: string, exportName: string): boolean {
  if (exportName === "default") return /\bexport\s+default\b/.test(source);
  return new RegExp(
    `\\bexport\\s+(?:(?:async|const|class|function)\\s+)*${exportName}\\b|\\bexport\\s*\\{[^}]*\\b${exportName}\\b`,
  ).test(source);
}

export function emitOpenCodeAdapters(
  options: AdapterOptions,
): EmittedAdapter[] {
  const packageRoot = resolve(options.packageRoot);
  const pluginsDir = join(resolve(options.configRoot), "plugins");
  const auditPath = join(resolve(options.stateDir), ADAPTER_AUDIT_FILE);
  mkdirSync(pluginsDir, { recursive: true });
  return ADAPTERS.map((adapter) => {
    const target = resolve(packageRoot, "dist", "hooks", adapter.hook);
    if (!containedPath(packageRoot, target))
      throw new Error(`adapter target escaped package root: ${adapter.name}`);
    const path = join(pluginsDir, `${adapter.name}.ts`);
    writeFileSync(
      path,
      loaderSource(adapter.name, adapter.exportName, target, auditPath),
    );
    return { name: adapter.name, path, target };
  });
}

/**
 * Validate only Weavelog's generated adapter shape and its package-contained
 * compiled target. This deliberately does not import plugin code: doctor must
 * not execute a user-edited adapter as part of a health check.
 */
export function inspectOpenCodeAdapters(
  options: AdapterOptions,
): AdaptersHealth {
  const packageRoot = resolve(options.packageRoot);
  const packageReal = existsSync(packageRoot)
    ? realpathSync(packageRoot)
    : packageRoot;
  const pluginsDir = join(resolve(options.configRoot), "plugins");
  const adapters = ADAPTERS.map((adapter): AdapterHealth => {
    const path = join(pluginsDir, `${adapter.name}.ts`);
    const target = resolve(packageRoot, "dist", "hooks", adapter.hook);
    if (!existsSync(path))
      return {
        name: adapter.name,
        ok: false,
        detail: `${adapter.name}: adapter missing at ${path}; run weavelog init to repair`,
      };
    const header = readFileSync(path, "utf8").split("\n", 1)[0] ?? "";
    const match = header.match(/^\/\/ weavelog-opencode-adapter-v1 (.+)$/);
    if (!match)
      return {
        name: adapter.name,
        ok: false,
        detail: `${adapter.name}: adapter is not managed by weavelog; run weavelog init to repair`,
      };
    try {
      const metadata = JSON.parse(match[1]) as {
        name?: unknown;
        target?: unknown;
      };
      if (metadata.name !== adapter.name || metadata.target !== target)
        return {
          name: adapter.name,
          ok: false,
          detail: `${adapter.name}: adapter target differs from the installed package; run weavelog init to repair`,
        };
    } catch {
      return {
        name: adapter.name,
        ok: false,
        detail: `${adapter.name}: adapter metadata is invalid; run weavelog init to repair`,
      };
    }
    if (!existsSync(target))
      return {
        name: adapter.name,
        ok: false,
        detail: `${adapter.name}: installed compiled hook is missing; run weavelog init to repair`,
      };
    const targetReal = realpathSync(target);
    if (!containedPath(packageReal, targetReal))
      return {
        name: adapter.name,
        ok: false,
        detail: `${adapter.name}: installed hook escapes its package root; run weavelog init to repair`,
      };
    if (
      !hasRequiredExport(readFileSync(targetReal, "utf8"), adapter.exportName)
    )
      return {
        name: adapter.name,
        ok: false,
        detail: `${adapter.name}: installed hook lacks its required plugin export; run weavelog init to repair`,
      };
    return {
      name: adapter.name,
      ok: true,
      detail: `${adapter.name}: managed adapter targets installed package`,
    };
  });
  const failures = adapters.filter((adapter) => !adapter.ok);
  return {
    ok: failures.length === 0,
    detail:
      failures.length === 0
        ? "OpenCode adapters: all required adapters target the installed package"
        : failures.map((adapter) => adapter.detail).join("; "),
    adapters,
  };
}
