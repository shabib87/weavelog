/**
 * declared-targets — shared declared-target contract for the materialization
 * commands.
 *
 * Every command that materializes a harness manifest (config-sync today;
 * init/update on the same contract) reads, normalizes, and evaluates the same
 * declared targets. This module is that one shared implementation: harness
 * manifest reading + validation, home expansion, path normalization, exclusion
 * evaluation, lstat symlink safety, and the sha256 helpers. Behavior must not
 * drift between commands.
 *
 * readHarnessManifest is script-facing: on a missing, unparseable, or invalid
 * manifest it prints to stderr and exits 2, matching the config-sync exit-code
 * contract.
 */
import { createHash } from "node:crypto";
import { existsSync, lstatSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join, relative, resolve } from "node:path";

const HOME = homedir();

/** Expand a leading "~" (or a bare "~") to the home directory. */
export function expandHome(p: string): string {
  if (p === "~") return HOME;
  if (p.startsWith("~/")) return join(HOME, p.slice(2));
  return p;
}

/** Normalize a manifest-relative path against a root; returns the clean relative form. */
export function normalizeRel(root: string, rel: string): string {
  return relative(root, resolve(root, rel));
}

/** First exclusion prefix matching the (normalized) rel, or null. */
export function excludedBy(rel: string, exclusions: string[]): string | null {
  return exclusions.find((ex) => rel.startsWith(ex)) ?? null;
}

/** lstat-based symlink test: missing paths are not symlinks; never follows links. */
export function isSymlink(p: string): boolean {
  try {
    return lstatSync(p).isSymbolicLink();
  } catch {
    return false; // missing is not a symlink
  }
}

export function sha256Of(buf: Buffer): string {
  return createHash("sha256").update(buf).digest("hex");
}

export function sha256File(p: string): string {
  return sha256Of(readFileSync(p));
}

/** The strict JSON harness manifest: which package files map to which live targets. */
export interface HarnessManifest {
  version: number;
  harness: string;
  liveRoot: string;
  trackedRoot: string;
  files: Record<string, string>;
  exclusions: string[];
  pluginsDeferral: boolean;
  /**
   * Optional skills fan-out section (init/update contract; config-sync
   * ignores it): whole skill dirs copied verbatim from the tracked root to
   * the skills live root. Control metadata only — never copied live.
   */
  skills?: SkillTargets;
}

/** Skills fan-out: declared skill dirs under trackedRoot copied to liveRoot. */
export interface SkillTargets {
  liveRoot: string;
  trackedRoot: string;
  dirs: string[];
}

export function readHarnessManifest(path: string): HarnessManifest {
  if (!existsSync(path)) {
    console.error(`harness manifest missing: ${path} (see --help)`);
    process.exit(2);
  }
  let raw: unknown;
  try {
    raw = JSON.parse(readFileSync(path, "utf8"));
  } catch (err) {
    console.error(
      `harness manifest unparseable: ${path}: ${(err as Error).message}`,
    );
    process.exit(2);
  }
  const errors: string[] = [];
  const o = raw as Record<string, unknown>;
  if (o.version !== 1)
    errors.push(`version must be 1 (got ${JSON.stringify(o.version)})`);
  if (typeof o.harness !== "string" || !o.harness.trim())
    errors.push("harness must be a non-empty string");
  if (typeof o.liveRoot !== "string" || !o.liveRoot.trim())
    errors.push("liveRoot must be a non-empty string");
  if (typeof o.trackedRoot !== "string" || !o.trackedRoot.trim())
    errors.push("trackedRoot must be a non-empty string");
  if (
    o.files === null ||
    typeof o.files !== "object" ||
    Array.isArray(o.files) ||
    Object.keys(o.files as Record<string, unknown>).length === 0
  ) {
    errors.push(
      "files must be a non-empty object mapping live-relative -> tracked-relative paths",
    );
  } else {
    for (const [live, tracked] of Object.entries(
      o.files as Record<string, unknown>,
    )) {
      if (typeof tracked !== "string" || !tracked.trim())
        errors.push(
          `files.${live} must be a non-empty tracked-relative path string`,
        );
    }
  }
  if (
    !Array.isArray(o.exclusions) ||
    !o.exclusions.every((x) => typeof x === "string")
  )
    errors.push("exclusions must be an array of strings");
  if (typeof o.pluginsDeferral !== "boolean")
    errors.push("pluginsDeferral must be a boolean");
  let skills: SkillTargets | undefined;
  if (o.skills !== undefined) {
    const s = o.skills as Record<string, unknown>;
    if (s === null || typeof s !== "object" || Array.isArray(s)) {
      errors.push("skills must be an object { liveRoot, trackedRoot, dirs }");
    } else {
      if (typeof s.liveRoot !== "string" || !s.liveRoot.trim())
        errors.push("skills.liveRoot must be a non-empty string");
      if (typeof s.trackedRoot !== "string" || !s.trackedRoot.trim())
        errors.push("skills.trackedRoot must be a non-empty string");
      if (
        !Array.isArray(s.dirs) ||
        s.dirs.length === 0 ||
        !s.dirs.every((x) => typeof x === "string" && x.trim().length > 0)
      )
        errors.push("skills.dirs must be a non-empty array of strings");
    }
  }
  if (errors.length) {
    console.error(
      `harness manifest invalid: ${path}\n  ${errors.join("\n  ")}`,
    );
    process.exit(2);
  }
  if (o.skills !== undefined && skills === undefined) {
    const s = o.skills as Record<string, string | string[]>;
    skills = {
      liveRoot: s.liveRoot as string,
      trackedRoot: s.trackedRoot as string,
      dirs: s.dirs as string[],
    };
  }
  return {
    version: o.version as number,
    harness: o.harness as string,
    liveRoot: o.liveRoot as string,
    trackedRoot: o.trackedRoot as string,
    files: o.files as Record<string, string>,
    exclusions: o.exclusions as string[],
    pluginsDeferral: o.pluginsDeferral as boolean,
    ...(skills ? { skills } : {}),
  };
}
