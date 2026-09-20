/**
 * profiles — user profile layer for the materialization commands (TASK-29
 * slice 4; AC #5).
 *
 * Profiles live at ~/.config/weavelog/profiles/<id>.json (the CLI boundary
 * owns the WEAVELOG_PROFILES_DIR seam). A profile stores choices and secret
 * REFERENCES only — never secret values:
 *
 *   { "id": "personal",
 *     "choices": { "model": "claude-sonnet-4" },
 *     "secretRefs": { "ANTHROPIC_API_KEY": "env:ANTHROPIC_API_KEY" } }
 *
 * id is lowercase path-safe ([a-z0-9][a-z0-9-]*). A secret reference names an
 * environment variable as "env:NAME" and is never resolved or persisted here.
 * Validation rules, kept simple on purpose:
 *  - a choice under a secret-pattern key (pass|token|secret|key|credential)
 *    whose value is not a reference looks like an assigned secret — error;
 *  - every secretRefs value must be a reference (env:NAME), never a stored
 *    value.
 *
 * resolveInputs applies the precedence CLI flags > confirmed init answers >
 * profile choices > package-safe defaults and returns the merged non-secret
 * map plus the secret-reference keys (references only, never resolved
 * values). tokensFromProfile maps choice keys to {{TOKEN}} candidates
 * (uppercase-underscore) for the render machinery.
 *
 * Security: the profiles directory is created 0700 and profile files 0600.
 * Reads and writes are lstat-only at the profiles-dir and profile-file level
 * (a symlink is a typed refusal, never a throw); the state module owns the
 * full per-component chain hygiene for the state tree.
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
import { homedir } from "node:os";
import { join } from "node:path";

const PROFILE_ID_PATTERN = /^[a-z0-9][a-z0-9-]*$/;
// must stay in sync with the SECRET_KEY_PATTERN in materialize-state.ts — one rule.
const SECRET_KEY_PATTERN = /pass(word)?|token|secret|key|credential/i;
const SECRET_REF_PATTERN = /^env:[A-Za-z_][A-Za-z0-9_]*$/;

export interface Profile {
  id: string;
  choices: Record<string, string>;
  secretRefs: Record<string, string>;
  updatedAt?: string;
}

export interface ProfileError {
  code: "invalid" | "symlink-refusal" | "not-directory" | "io";
  message: string;
  path: string;
}

export type ProfileResult<T> =
  | { ok: true; value: T }
  | { ok: false; error: ProfileError };

/** Env seam for tests; the CLI boundary owns it. */
export function defaultProfilesDir(): string {
  return (
    process.env.WEAVELOG_PROFILES_DIR ??
    join(homedir(), ".config", "weavelog", "profiles")
  );
}

export function profilePath(profilesDir: string, id: string): string {
  return join(profilesDir, `${id}.json`);
}

/** Validate a profile id; returns an error message, or null when valid. */
export function validateProfileId(id: string): string | null {
  if (!PROFILE_ID_PATTERN.test(id))
    return `profile id must match [a-z0-9][a-z0-9-]* (got '${id}')`;
  return null;
}

/** Validate profile shape, secret hygiene, and id; returns the normalized profile. */
export function validateProfile(
  data: unknown,
): { ok: true; profile: Profile } | { ok: false; error: string } {
  if (data === null || typeof data !== "object" || Array.isArray(data))
    return { ok: false, error: "profile must be a JSON object" };
  const o = data as Record<string, unknown>;
  if (typeof o.id !== "string")
    return { ok: false, error: "profile id is missing" };
  const idError = validateProfileId(o.id);
  if (idError) return { ok: false, error: idError };
  const choices = readStringMap(o.choices, "choices");
  if (choices === null)
    return { ok: false, error: "profile choices must be a map of strings" };
  const secretRefs = readStringMap(o.secretRefs, "secretRefs");
  if (secretRefs === null)
    return { ok: false, error: "profile secretRefs must be a map of strings" };
  if (o.updatedAt !== undefined && typeof o.updatedAt !== "string")
    return { ok: false, error: "profile updatedAt must be a string" };
  for (const [key, value] of Object.entries(choices)) {
    if (SECRET_KEY_PATTERN.test(key) && !isSecretReference(value))
      return {
        ok: false,
        error: `profile choice '${key}' looks like an assigned secret; store references in secretRefs as env:NAME`,
      };
  }
  for (const [key, value] of Object.entries(secretRefs)) {
    if (!isSecretReference(value))
      return {
        ok: false,
        error: `profile secretRef '${key}' must be a reference (env:NAME), never a stored value`,
      };
  }
  const profile: Profile = { id: o.id, choices, secretRefs };
  if (typeof o.updatedAt === "string") profile.updatedAt = o.updatedAt;
  return { ok: true, profile };
}

/** Read a profile; null when it does not exist. The profile id must match the file name. */
export function readProfile(
  profilesDir: string,
  id: string,
): ProfileResult<Profile | null> {
  const file = profilePath(profilesDir, id);
  const idError = validateProfileId(id);
  if (idError) return profileErr("invalid", idError, file);
  const dirError = checkProfilesDir(profilesDir);
  if (dirError)
    return profileErr(
      dirError.code,
      `profiles directory unusable: ${dirError.code}`,
      dirError.path,
    );
  const leaf = leafCheck(file);
  if (leaf) return profileErr(leaf.code, leaf.message, leaf.path);
  if (!existsSync(file)) return { ok: true, value: null };
  let raw: unknown;
  try {
    raw = JSON.parse(readFileSync(file, "utf8"));
  } catch (parseErr) {
    return profileErr(
      "invalid",
      `profile corrupt: ${(parseErr as Error).message}`,
      file,
    );
  }
  const validated = validateProfile(raw);
  if (!validated.ok) return profileErr("invalid", validated.error, file);
  if (validated.profile.id !== id)
    return profileErr(
      "invalid",
      `profile id '${validated.profile.id}' does not match file name '${id}'`,
      file,
    );
  return { ok: true, value: validated.profile };
}

/** Write a validated profile; refuses invalid profiles and symlinked files. */
export function writeProfile(
  profilesDir: string,
  profile: Profile,
): ProfileResult<{ path: string }> {
  const validated = validateProfile(profile);
  if (!validated.ok)
    return profileErr(
      "invalid",
      validated.error,
      profilePath(profilesDir, profile.id),
    );
  const file = profilePath(profilesDir, validated.profile.id);
  const dirError = ensureProfilesDir(profilesDir);
  if (dirError)
    return profileErr(dirError.code, dirError.message, dirError.path);
  const leaf = leafCheck(file);
  if (leaf) return profileErr(leaf.code, leaf.message, leaf.path);
  try {
    const tmp = `${file}.tmp`;
    const tmpLeaf = leafCheck(tmp);
    if (tmpLeaf) return profileErr(tmpLeaf.code, tmpLeaf.message, tmpLeaf.path);
    writeFileSync(tmp, `${JSON.stringify(validated.profile, null, 2)}\n`, {
      mode: 0o600,
    });
    renameSync(tmp, file);
  } catch (writeErr) {
    return profileErr(
      "io",
      `profile write failed: ${(writeErr as Error).message}`,
      file,
    );
  }
  return { ok: true, value: { path: file } };
}

/**
 * Merge the four input tiers by precedence — CLI flags > confirmed init
 * answers > profile choices > package-safe defaults. Keys declared in the
 * profile's secretRefs are never resolved into values: they are excluded from
 * the merged map and reported with their reference strings, so a secret value
 * can never travel through the render snapshot.
 */
export function resolveInputs(args: {
  flags: Record<string, string>;
  answers: Record<string, string>;
  profile: Profile;
  defaults: Record<string, string>;
}): { values: Record<string, string>; secretRefs: Record<string, string> } {
  const { flags, answers, profile, defaults } = args;
  const values: Record<string, string> = {
    ...defaults,
    ...profile.choices,
    ...answers,
    ...flags,
  };
  const secretRefs: Record<string, string> = { ...profile.secretRefs };
  for (const key of Object.keys(secretRefs)) delete values[key];
  return { values, secretRefs };
}

/** Map choice keys to {{TOKEN}} candidates (uppercase-underscore) for the render machinery. */
export function tokensFromProfile(profile: Profile): Record<string, string> {
  const tokens: Record<string, string> = {};
  for (const [key, value] of Object.entries(profile.choices)) {
    tokens[toTokenName(key)] = value;
  }
  return tokens;
}

// --- internals -------------------------------------------------------------

function toTokenName(key: string): string {
  return key.toUpperCase().replace(/[^A-Z0-9]+/g, "_");
}

function isSecretReference(value: string): boolean {
  return SECRET_REF_PATTERN.test(value);
}

function readStringMap(
  value: unknown,
  _name: string,
): Record<string, string> | null {
  if (value === undefined) return {};
  if (value === null || typeof value !== "object" || Array.isArray(value))
    return null;
  const o = value as Record<string, unknown>;
  if (!Object.values(o).every((v) => typeof v === "string")) return null;
  return o as Record<string, string>;
}

function profileErr(
  code: ProfileError["code"],
  message: string,
  path: string,
): ProfileResult<never> {
  return { ok: false, error: { code, message, path } };
}

function checkProfilesDir(dir: string): Omit<ProfileError, "message"> | null {
  let st: Stats | null = null;
  try {
    st = lstatSync(dir);
  } catch {
    return null;
  }
  if (st.isSymbolicLink()) return { code: "symlink-refusal", path: dir };
  if (!st.isDirectory()) return { code: "not-directory", path: dir };
  return null;
}

function ensureProfilesDir(dir: string): ProfileError | null {
  const existing = checkProfilesDir(dir);
  if (existing) return { ...existing, message: "profiles dir refused" };
  try {
    mkdirSync(dir, { recursive: true, mode: 0o700 });
  } catch (mkdirErr) {
    return {
      code: "io",
      message: `failed to create profiles dir: ${(mkdirErr as Error).message}`,
      path: dir,
    };
  }
  return null;
}

function leafCheck(file: string): {
  code: "symlink-refusal" | "not-directory";
  message: string;
  path: string;
} | null {
  let st: Stats | null = null;
  try {
    st = lstatSync(file);
  } catch {
    return null;
  }
  if (st.isSymbolicLink())
    return {
      code: "symlink-refusal",
      message: "refusing to read or write a symlinked profile file",
      path: file,
    };
  if (!st.isFile())
    return {
      code: "not-directory",
      message: "expected a regular profile file",
      path: file,
    };
  return null;
}
