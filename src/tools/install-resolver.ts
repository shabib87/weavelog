/**
 * install-resolver — resolve the running weavelog install and guard
 * materialization against stale or shadowed installs (TASK-29 AC #6).
 *
 * resolveInstalledPackage walks up from the running CLI entry to the nearest
 * package.json named "weavelog" and returns the package root, the resolved bin
 * path (dist/cli/index.js), and the payload root. The WEAVELOG_PACKAGE_ROOT
 * environment seam (the same seam packageRootValue() uses in the CLI) points
 * the resolver at an explicit package when set.
 *
 * findPathShadows scans PATH for other weavelog executables that resolve to a
 * DIFFERENT package root than the running bin. Candidates are inspected with
 * lstat only — symlink targets are read via readlink, but file contents are
 * never followed or read.
 *
 * The staleness helpers compare installed payload hashes against repo payload
 * hashes for the same relative paths; any repo file whose installed hash
 * differs (including a missing file) is stale.
 */

import type { Dirent, Stats } from "node:fs";
import {
  existsSync,
  lstatSync,
  readdirSync,
  readFileSync,
  readlinkSync,
} from "node:fs";
import { dirname, isAbsolute, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { sha256File } from "./declared-targets.js";

export interface InstalledPackage {
  packageRoot: string;
  binPath: string;
  payloadRoot: string;
}

/**
 * Resolve the package the running CLI entry belongs to: the nearest ancestor
 * package.json named "weavelog" with a payload directory. Returns null when
 * running from a source checkout without a package payload context.
 * WEAVELOG_PACKAGE_ROOT, when set, names the package explicitly.
 */
export function resolveInstalledPackage(
  entryHref: string = import.meta.url,
): InstalledPackage | null {
  const seam = process.env.WEAVELOG_PACKAGE_ROOT;
  if (seam) {
    const root = resolve(seam);
    const pkg = readWeavelogPackage(root);
    return pkg === null ? null : packageInfo(root, pkg);
  }
  let dir = entryDir(entryHref);
  for (let i = 0; i < 64; i++) {
    const pkg = readWeavelogPackage(dir);
    if (pkg !== null) return packageInfo(dir, pkg);
    const parent = dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return null;
}

/**
 * Scan PATH for other `weavelog` executables that resolve to a DIFFERENT
 * package root than the running bin; returns the shadowing candidate paths.
 * Candidates are checked with lstat only — symlink chains are read via
 * readlink (metadata), never followed for content. A candidate whose package
 * root cannot be determined (a stray script, not a package install) is
 * reported as a shadow: it would still intercept `weavelog` on PATH.
 */
export function findPathShadows(binPath: string, pathEnv: string): string[] {
  const runningRoot = packageRootFor(binPath);
  if (runningRoot === null) return [];
  const resolvedBin = resolve(binPath);
  const shadows: string[] = [];
  const seen = new Set<string>();
  for (const dir of pathEnv.split(":")) {
    if (!dir) continue;
    const candidate = join(dir, "weavelog");
    if (seen.has(candidate)) continue;
    const file = resolveCandidate(candidate);
    if (file === null) continue;
    if (file === resolvedBin) continue; // the running bin itself
    const root = packageRootFor(file);
    if (root === runningRoot) continue; // same install under another name
    seen.add(candidate);
    shadows.push(candidate);
  }
  return shadows;
}

/**
 * Relative paths whose repo (source) content differs from the installed
 * payload — the set that would materialize different bytes than the installed
 * package carries. A repo file missing from the installed payload is stale; an
 * installed-only file is not (it is never materialized from the repo).
 */
export function stalePayloadFiles(
  installed: Record<string, string>,
  repo: Record<string, string>,
): string[] {
  return Object.keys(repo).filter((rel) => installed[rel] !== repo[rel]);
}

/** sha256 of every regular payload file, keyed by payload-relative path. */
export function hashPayloadFiles(payloadRoot: string): Record<string, string> {
  const hashes: Record<string, string> = {};
  for (const full of walkRegularFiles(payloadRoot)) {
    hashes[relative(payloadRoot, full)] = sha256File(full);
  }
  return hashes;
}

// --- internals -------------------------------------------------------------

function entryDir(entryHref: string): string {
  if (entryHref.startsWith("file:")) return dirname(fileURLToPath(entryHref));
  return dirname(resolve(entryHref)); // plain path input (e.g. argv[1]-style)
}

function readWeavelogPackage(root: string): Record<string, unknown> | null {
  const pkgPath = join(root, "package.json");
  if (!existsSync(pkgPath)) return null;
  try {
    const pkg = JSON.parse(readFileSync(pkgPath, "utf8")) as Record<
      string,
      unknown
    >;
    if (pkg.name === "weavelog") return pkg;
  } catch {
    // unparseable package.json is not a weavelog package — keep looking
  }
  return null;
}

function packageInfo(
  root: string,
  pkg: Record<string, unknown>,
): InstalledPackage | null {
  const payloadRoot = join(root, "payload");
  if (!existsSync(payloadRoot)) return null; // no package payload context
  const binValue = pkg.bin;
  let binRel: string;
  if (typeof binValue === "string" && binValue) {
    binRel = binValue;
  } else if (
    binValue !== null &&
    typeof binValue === "object" &&
    typeof (binValue as Record<string, unknown>).weavelog === "string"
  ) {
    binRel = (binValue as Record<string, string>).weavelog;
  } else {
    binRel = "dist/cli/index.js";
  }
  return {
    packageRoot: root,
    binPath: resolve(root, binRel),
    payloadRoot,
  };
}

function packageRootFor(filePath: string): string | null {
  let dir = dirname(filePath);
  for (let i = 0; i < 64; i++) {
    if (readWeavelogPackage(dir) !== null) return dir;
    const parent = dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return null;
}

/** Resolve a PATH candidate to a regular file path via lstat + bounded readlink hops. */
function resolveCandidate(candidate: string): string | null {
  let cur = candidate;
  for (let hop = 0; hop < 16; hop++) {
    let st: Stats;
    try {
      st = lstatSync(cur);
    } catch {
      return null; // missing
    }
    if (st.isSymbolicLink()) {
      let target: string;
      try {
        target = readlinkSync(cur);
      } catch {
        return null; // unreadable link — cannot resolve, not a candidate
      }
      cur = isAbsolute(target) ? target : resolve(dirname(cur), target);
      continue;
    }
    if (!st.isFile()) return null; // directory or special file — not an executable
    return resolve(cur);
  }
  return null; // symlink chain too long or cyclic
}

function walkRegularFiles(dir: string): string[] {
  const out: string[] = [];
  let entries: Dirent[];
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch {
    return out; // missing or unreadable root: no payload files
  }
  for (const entry of entries) {
    if (entry.name === ".DS_Store") continue;
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      out.push(...walkRegularFiles(full));
    } else if (entry.isFile()) {
      out.push(full); // symlinks are never followed
    }
  }
  return out;
}
