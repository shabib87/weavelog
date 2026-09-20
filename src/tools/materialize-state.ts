/**
 * materialize-state — ownership receipts and immutable render snapshots for
 * the materialization commands (TASK-29 slice 3; AC #5).
 *
 * Layout under the state root (the CLI boundary owns the WEAVELOG_STATE_DIR
 * seam; default ~/.local/state/weavelog):
 *
 *   materialize/<harness>/<target-id>/active-profile       profile ID + snapshot hash
 *   materialize/<harness>/<target-id>/snapshots/<profile-id>/<sha256>.json
 *
 * <target-id> is the opaque sha256 hex digest of the canonical target path —
 * never the raw path. Snapshots are content-addressed and immutable: writing
 * an existing hash is a no-op, never a rewrite. Snapshot JSON carries the
 * non-secret resolved render inputs after precedence. Path-valued token
 * values (starting with / or ~) are opaque-encoded as sha256 digests, which
 * preserves content-addressing across runs without exposing the raw path;
 * secret-ish keys (matching the same pattern the profile layer uses) are
 * replaced with a marker — never the value in any form. Safe values persist
 * verbatim. No persisted file exposes a home path or a secret value.
 *
 * Security: every directory under the state root is created 0700 and every
 * file 0600. All reads and writes are lstat-only: a symlink or a
 * non-directory anywhere in the state path chain causes a typed refusal
 * result. Errors are surfaced as results, never thrown across the boundary.
 *
 * API: pure functions with explicit roots (pass stateRoot); environment
 * seams belong to the CLI boundary, not this module.
 */

import type { Stats } from "node:fs";
import {
  existsSync,
  lstatSync,
  mkdirSync,
  readFileSync,
  renameSync,
  writeFileSync,
} from "node:fs";
import { join } from "node:path";
import { sha256Of } from "./declared-targets.js";

const SAFE_SEGMENT = /^[a-z0-9][a-z0-9-]*$/;
const TARGET_ID = /^[0-9a-f]{64}$/;
// must stay in sync with the SECRET_KEY_PATTERN in profiles.ts — one rule.
const SECRET_KEY_PATTERN = /pass(word)?|token|secret|key|credential/i;
const REDACTED_MARKER = "[redacted]";
const SNAPSHOT_SCHEMA = 1;

export interface ActiveProfile {
  profileId: string;
  snapshotSha256: string;
  updatedAt: string;
}

export interface StateError {
  code: "symlink-refusal" | "not-directory" | "invalid" | "io";
  message: string;
  path: string;
}

export type StateResult<T> =
  | { ok: true; value: T }
  | { ok: false; error: StateError };

/** Opaque sha256 hex digest of the canonical target path — the state key, never the path. */
export function targetIdOf(canonicalTargetPath: string): string {
  return sha256Of(Buffer.from(canonicalTargetPath, "utf8"));
}

/**
 * Redact resolved render inputs before persisting: path-valued values become
 * sha256 digests, secret-ish keys become the redaction marker, everything
 * else is kept verbatim.
 */
export function redactInputs(
  inputs: Record<string, string>,
): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(inputs)) {
    if (SECRET_KEY_PATTERN.test(key)) {
      out[key] = REDACTED_MARKER;
    } else if (isPathValued(value)) {
      out[key] = sha256Of(Buffer.from(value, "utf8"));
    } else {
      out[key] = value;
    }
  }
  return out;
}

/**
 * Write a content-addressed render snapshot. An existing snapshot hash is a
 * no-op (immutable): the file is never rewritten. Returns the snapshot sha256
 * and whether the snapshot was newly written.
 */
export function writeSnapshot(
  stateRoot: string,
  harness: string,
  targetId: string,
  profileId: string,
  inputs: Record<string, string>,
): StateResult<{ snapshotSha256: string; written: boolean }> {
  const seg = validateSegments(harness, targetId, profileId);
  if (seg) return { ok: false, error: seg };
  const redacted = redactInputs(inputs);
  const content = serializeSnapshot(profileId, redacted);
  const sha = sha256Of(Buffer.from(content, "utf8"));
  const file = snapshotFile(stateRoot, harness, targetId, profileId, sha);
  const rootErr = ensureStateRoot(stateRoot);
  if (rootErr) return { ok: false, error: rootErr };
  const chain = ensureDirChain(
    stateRoot,
    join("materialize", harness, targetId, "snapshots", profileId),
  );
  if (chain) return { ok: false, error: chain };
  const leaf = leafFileError(file);
  if (leaf) return { ok: false, error: leaf };
  if (existsSync(file))
    return { ok: true, value: { snapshotSha256: sha, written: false } };
  try {
    const tmp = `${file}.tmp`;
    const tmpLeaf = leafFileError(tmp);
    if (tmpLeaf) return { ok: false, error: tmpLeaf };
    writeFileSync(tmp, content, { mode: 0o600 });
    renameSync(tmp, file);
  } catch (cause) {
    return {
      ok: false,
      error: err(
        "io",
        `snapshot write failed: ${(cause as Error).message}`,
        file,
      ),
    };
  }
  return { ok: true, value: { snapshotSha256: sha, written: true } };
}

/** Read a snapshot by content address; null when it does not exist. */
export function readSnapshot(
  stateRoot: string,
  harness: string,
  targetId: string,
  profileId: string,
  snapshotSha256: string,
): StateResult<{
  snapshotSha256: string;
  inputs: Record<string, string>;
} | null> {
  const seg = validateSegments(harness, targetId, profileId);
  if (seg) return { ok: false, error: seg };
  if (!TARGET_ID.test(snapshotSha256))
    return {
      ok: false,
      error: err(
        "invalid",
        `snapshot sha must be a 64-hex sha256 digest (got '${snapshotSha256}')`,
        snapshotSha256,
      ),
    };
  const file = snapshotFile(
    stateRoot,
    harness,
    targetId,
    profileId,
    snapshotSha256,
  );
  const rootErr = checkStateRoot(stateRoot);
  if (rootErr) return { ok: false, error: rootErr };
  const chain = chainError(
    stateRoot,
    join("materialize", harness, targetId, "snapshots", profileId),
  );
  if (chain) return { ok: false, error: chain };
  const leaf = leafFileError(file);
  if (leaf) return { ok: false, error: leaf };
  if (!existsSync(file)) return { ok: true, value: null };
  let raw: unknown;
  try {
    raw = JSON.parse(readFileSync(file, "utf8"));
  } catch (parseErr) {
    return {
      ok: false,
      error: err(
        "invalid",
        `snapshot corrupt: ${(parseErr as Error).message}`,
        file,
      ),
    };
  }
  const o = raw as Record<string, unknown>;
  const inputs = o.inputs;
  if (
    o.schemaVersion !== SNAPSHOT_SCHEMA ||
    typeof o.profileId !== "string" ||
    o.profileId !== profileId ||
    inputs === null ||
    typeof inputs !== "object" ||
    Array.isArray(inputs) ||
    !Object.values(inputs as Record<string, unknown>).every(
      (v) => typeof v === "string",
    )
  ) {
    return {
      ok: false,
      error: err(
        "invalid",
        `snapshot invalid: expected { schemaVersion: 1, profileId, inputs }`,
        file,
      ),
    };
  }
  return {
    ok: true,
    value: {
      snapshotSha256,
      inputs: inputs as Record<string, string>,
    },
  };
}

/** Write the active-profile ownership receipt pointing at the immutable snapshot. */
export function writeActiveProfile(
  stateRoot: string,
  harness: string,
  targetId: string,
  record: ActiveProfile,
): StateResult<{ path: string }> {
  const seg = validateSegments(harness, targetId);
  if (seg) return { ok: false, error: seg };
  if (!SAFE_SEGMENT.test(record.profileId))
    return {
      ok: false,
      error: err(
        "invalid",
        `active-profile profileId must be a lowercase path-safe segment (got '${record.profileId}')`,
        "",
      ),
    };
  if (!TARGET_ID.test(record.snapshotSha256))
    return {
      ok: false,
      error: err(
        "invalid",
        `active-profile snapshotSha256 must be a 64-hex sha256 digest (got '${record.snapshotSha256}')`,
        "",
      ),
    };
  if (typeof record.updatedAt !== "string" || record.updatedAt === "")
    return {
      ok: false,
      error: err(
        "invalid",
        "active-profile updatedAt must be a non-empty string",
        "",
      ),
    };
  const file = activeProfileFile(stateRoot, harness, targetId);
  const rootErr = ensureStateRoot(stateRoot);
  if (rootErr) return { ok: false, error: rootErr };
  const chain = ensureDirChain(
    stateRoot,
    join("materialize", harness, targetId),
  );
  if (chain) return { ok: false, error: chain };
  const leaf = leafFileError(file);
  if (leaf) return { ok: false, error: leaf };
  try {
    const tmp = `${file}.tmp`;
    const tmpLeaf = leafFileError(tmp);
    if (tmpLeaf) return { ok: false, error: tmpLeaf };
    writeFileSync(tmp, `${JSON.stringify(record, null, 2)}\n`, { mode: 0o600 });
    renameSync(tmp, file);
  } catch (cause) {
    return {
      ok: false,
      error: err(
        "io",
        `active-profile write failed: ${(cause as Error).message}`,
        file,
      ),
    };
  }
  return { ok: true, value: { path: file } };
}

/** Read the active-profile receipt; null when no ownership state exists. */
export function readActiveProfile(
  stateRoot: string,
  harness: string,
  targetId: string,
): StateResult<ActiveProfile | null> {
  const seg = validateSegments(harness, targetId);
  if (seg) return { ok: false, error: seg };
  const file = activeProfileFile(stateRoot, harness, targetId);
  const rootErr = checkStateRoot(stateRoot);
  if (rootErr) return { ok: false, error: rootErr };
  const chain = chainError(stateRoot, join("materialize", harness, targetId));
  if (chain) return { ok: false, error: chain };
  const leaf = leafFileError(file);
  if (leaf) return { ok: false, error: leaf };
  if (!existsSync(file)) return { ok: true, value: null };
  let raw: unknown;
  try {
    raw = JSON.parse(readFileSync(file, "utf8"));
  } catch (parseErr) {
    return {
      ok: false,
      error: err(
        "invalid",
        `active-profile corrupt: ${(parseErr as Error).message}`,
        file,
      ),
    };
  }
  const o = raw as Record<string, unknown>;
  if (
    typeof o.profileId !== "string" ||
    typeof o.snapshotSha256 !== "string" ||
    !TARGET_ID.test(o.snapshotSha256) ||
    typeof o.updatedAt !== "string"
  ) {
    return {
      ok: false,
      error: err(
        "invalid",
        "active-profile invalid: expected { profileId, snapshotSha256, updatedAt }",
        file,
      ),
    };
  }
  return {
    ok: true,
    value: {
      profileId: o.profileId,
      snapshotSha256: o.snapshotSha256,
      updatedAt: o.updatedAt,
    },
  };
}

// --- internals -------------------------------------------------------------

function isPathValued(value: string): boolean {
  return value === "~" || value.startsWith("~/") || value.startsWith("/");
}

function serializeSnapshot(
  profileId: string,
  redacted: Record<string, string>,
): string {
  // sorted keys: identical inputs in any order produce the same content hash
  const inputs: Record<string, string> = {};
  for (const key of Object.keys(redacted).sort()) inputs[key] = redacted[key];
  return `${JSON.stringify(
    { schemaVersion: SNAPSHOT_SCHEMA, profileId, inputs },
    null,
    2,
  )}\n`;
}

function validateSegments(
  harness: string,
  targetId: string,
  profileId?: string,
): StateError | null {
  if (!SAFE_SEGMENT.test(harness))
    return err(
      "invalid",
      `harness id must be a lowercase path-safe segment (got '${harness}')`,
      harness,
    );
  if (!TARGET_ID.test(targetId))
    return err(
      "invalid",
      `target id must be a 64-hex sha256 digest (got '${targetId}')`,
      targetId,
    );
  if (profileId !== undefined && !SAFE_SEGMENT.test(profileId))
    return err(
      "invalid",
      `profile id must be a lowercase path-safe segment (got '${profileId}')`,
      profileId,
    );
  return null;
}

function targetDir(
  stateRoot: string,
  harness: string,
  targetId: string,
): string {
  return join(stateRoot, "materialize", harness, targetId);
}

function snapshotFile(
  stateRoot: string,
  harness: string,
  targetId: string,
  profileId: string,
  sha: string,
): string {
  return join(
    targetDir(stateRoot, harness, targetId),
    "snapshots",
    profileId,
    `${sha}.json`,
  );
}

function activeProfileFile(
  stateRoot: string,
  harness: string,
  targetId: string,
): string {
  return join(targetDir(stateRoot, harness, targetId), "active-profile");
}

function err(
  code: StateError["code"],
  message: string,
  path: string,
): StateError {
  return { code, message, path };
}

/** Read-only lstat walk over the directory components of a state rel. */
function chainError(stateRoot: string, rel: string): StateError | null {
  const parts = rel.split("/").filter((p) => p !== "" && p !== ".");
  let cur = stateRoot;
  for (const part of parts) {
    if (part === "..")
      return err(
        "invalid",
        "refusing '..' in the state path chain",
        join(cur, part),
      );
    cur = join(cur, part);
    let st: Stats | null = null;
    try {
      st = lstatSync(cur);
    } catch {
      continue; // missing component — a read treats it as absent
    }
    if (st.isSymbolicLink())
      return err(
        "symlink-refusal",
        "refusing to read through a symlink in the state path",
        cur,
      );
    if (!st.isDirectory())
      return err(
        "not-directory",
        "expected a directory in the state path",
        cur,
      );
  }
  return null;
}

/** Create each missing directory component as 0700, refusing symlinks/non-dirs. */
function ensureDirChain(stateRoot: string, rel: string): StateError | null {
  const parts = rel.split("/").filter((p) => p !== "" && p !== ".");
  let cur = stateRoot;
  for (const part of parts) {
    if (part === "..")
      return err(
        "invalid",
        "refusing '..' in the state path chain",
        join(cur, part),
      );
    cur = join(cur, part);
    let st: Stats | null = null;
    try {
      st = lstatSync(cur);
    } catch {
      try {
        mkdirSync(cur, { mode: 0o700 });
      } catch (mkdirErr) {
        return err(
          "io",
          `failed to create state directory: ${(mkdirErr as Error).message}`,
          cur,
        );
      }
      continue;
    }
    if (st.isSymbolicLink())
      return err(
        "symlink-refusal",
        "refusing to create state through a symlink",
        cur,
      );
    if (!st.isDirectory())
      return err(
        "not-directory",
        "expected a directory in the state path",
        cur,
      );
  }
  return null;
}

function checkStateRoot(stateRoot: string): StateError | null {
  let st: Stats | null = null;
  try {
    st = lstatSync(stateRoot);
  } catch {
    return null; // missing root — reads treat it as absent
  }
  if (st.isSymbolicLink())
    return err("symlink-refusal", "state root is a symlink", stateRoot);
  if (!st.isDirectory())
    return err("not-directory", "state root is not a directory", stateRoot);
  return null;
}

function ensureStateRoot(stateRoot: string): StateError | null {
  let st: Stats | null = null;
  try {
    st = lstatSync(stateRoot);
  } catch {
    try {
      mkdirSync(stateRoot, { mode: 0o700 });
    } catch (mkdirErr) {
      return err(
        "io",
        `failed to create state root: ${(mkdirErr as Error).message}`,
        stateRoot,
      );
    }
    return null;
  }
  if (st.isSymbolicLink())
    return err("symlink-refusal", "state root is a symlink", stateRoot);
  if (!st.isDirectory())
    return err("not-directory", "state root is not a directory", stateRoot);
  return null;
}

/** Refuse to touch a leaf that is a symlink or not a regular file. */
function leafFileError(file: string): StateError | null {
  let st: Stats | null = null;
  try {
    st = lstatSync(file);
  } catch {
    return null; // missing — the writer creates it
  }
  if (st.isSymbolicLink())
    return err(
      "symlink-refusal",
      "refusing to read or write a symlink in the state path",
      file,
    );
  if (!st.isFile())
    return err("not-directory", "expected a regular file", file);
  return null;
}
