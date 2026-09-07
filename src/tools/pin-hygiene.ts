import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * Pin-hygiene guardrail (TASK-59): deterministic boundary for the
 * exact-pin dependency standard. Convention says "no caret ranges in a
 * weavelog-managed repo"; this check makes the convention machine-checked
 * so drift is blocked at pre-commit, not discovered at merge gate.
 *
 * A repo is weavelog-managed iff a weavelog.json manifest sits at its
 * root (foreign repos with their own conventions are skipped, matching
 * the pre-commit hook's presence-guard philosophy).
 */

const EXACT_VERSION = /^\d+\.\d+\.\d+(-[0-9A-Za-z.-]+)?(\+[0-9A-Za-z.-]+)?$/;

export type HygieneStatus = "pass" | "fail" | "skip";

export interface PinOffender {
  name: string;
  spec: string;
  section: string;
}

export interface PinHygieneResult {
  status: HygieneStatus;
  offenders: PinOffender[];
  detail: string;
}

export interface PackageJsonShape {
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  optionalDependencies?: Record<string, string>;
}

export function isExactVersion(spec: string): boolean {
  return typeof spec === "string" && EXACT_VERSION.test(spec.trim());
}

export function checkPinHygiene(
  pkg: PackageJsonShape | null,
  lockfilePresent: boolean,
): PinHygieneResult {
  if (pkg === null) {
    return {
      status: "skip",
      offenders: [],
      detail: "pin-hygiene skipped: no package.json",
    };
  }
  const offenders: PinOffender[] = [];
  const sections = [
    "dependencies",
    "devDependencies",
    "optionalDependencies",
  ] as const;
  for (const section of sections) {
    const deps: unknown = pkg[section];
    if (!deps || typeof deps !== "object") continue;
    for (const [name, spec] of Object.entries(
      deps as Record<string, unknown>,
    )) {
      if (!isExactVersion(spec as string)) {
        offenders.push({
          name,
          spec: String(spec),
          section,
        });
      }
    }
  }
  if (offenders.length > 0) {
    const named = offenders
      .map((o) => `${o.name}@${o.spec} (${o.section})`)
      .join(", ");
    return {
      status: "fail",
      offenders,
      detail: `pin-hygiene: non-exact version ranges — pin exactly (no ^ ~ * ranges): ${named}`,
    };
  }
  if (!lockfilePresent) {
    return {
      status: "fail",
      offenders,
      detail: "pin-hygiene: package-lock.json missing — commit the lockfile",
    };
  }
  return {
    status: "pass",
    offenders,
    detail: "pin-hygiene: direct deps exact-pinned, lockfile present",
  };
}

/**
 * Directory-level wrapper used by the CLI. Reads package.json and
 * package-lock.json from `dir`; skips unless weavelog.json marks the dir
 * as a weavelog-managed repo (or `requireManifest` is false for the
 * check command, where the manifest is a precondition).
 */
export function pinHygieneForDir(
  dir: string,
  requireManifest: boolean,
): PinHygieneResult {
  const manifestPath = join(dir, "weavelog.json");
  if (requireManifest && !existsSync(manifestPath)) {
    return {
      status: "skip",
      offenders: [],
      detail:
        "pin-hygiene skipped: not a weavelog-managed repo (no weavelog.json)",
    };
  }
  const pkgPath = join(dir, "package.json");
  let pkg: PackageJsonShape | null = null;
  if (existsSync(pkgPath)) {
    try {
      pkg = JSON.parse(readFileSync(pkgPath, "utf8")) as PackageJsonShape;
    } catch (err) {
      return {
        status: "fail",
        offenders: [],
        detail: `pin-hygiene: package.json unparseable: ${(err as Error).message}`,
      };
    }
  }
  return checkPinHygiene(pkg, existsSync(join(dir, "package-lock.json")));
}

/**
 * difit pointer check (TASK-59): the merge-gate doc must invoke difit at
 * the exact pinned version (`npx difit@X`), matching the weavelog.json
 * manifest. Pointer-style check (no network, no binary) mirroring the
 * diagram-design pin approach.
 */
export interface PointerCheckResult {
  ok: boolean;
  detail: string;
}

export function checkDifitPointer(
  pinnedVersion: string,
  docsContent: string | null,
): PointerCheckResult {
  if (!pinnedVersion) {
    return {
      ok: false,
      detail: "difit.pointer: pinned version empty in weavelog.json",
    };
  }
  if (docsContent === null) {
    return {
      ok: false,
      detail: `difit.pointer: merge-gate doc missing (pinned ${pinnedVersion})`,
    };
  }
  const escaped = pinnedVersion.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const anchored = new RegExp(`npx difit@${escaped}(?![0-9.])`);
  if (anchored.test(docsContent)) {
    return {
      ok: true,
      detail: `difit.pointer: doc pins npx difit@${pinnedVersion}`,
    };
  }
  const found = [
    ...new Set(
      [...docsContent.matchAll(/npx difit@?([0-9][^\s)"']*)?/g)].map(
        (m) => m[0],
      ),
    ),
  ];
  return {
    ok: false,
    detail: `difit.pointer: doc must invoke npx difit@${pinnedVersion}; found: ${found.length > 0 ? found.join(", ") : "(no difit invocation)"}`,
  };
}
