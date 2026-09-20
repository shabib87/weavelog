/**
 * init-materialize — whole-run preflight state machine and safe replacement
 * executor for `weavelog init` (TASK-29 slice 5; docs/trd/cli-vision.md
 * "Ownership and replacement").
 *
 * decideTargetAction is the per-target preflight decision function. The CLI
 * evaluates EVERY declared target before ANY write; a single refusal refuses
 * the whole run (all-or-nothing, zero writes). Rules follow the ownership
 * table:
 *
 *   absent                              -> create
 *   symlink / not a regular file        -> refuse (lstat-only, even --force)
 *   dangling replacement intent         -> refuse (no automatic recovery;
 *                                           report journal + backup paths)
 *   owned (active-profile) AND
 *     live hash == recorded state hash  -> update
 *   unowned / changed / missing state /
 *     ambiguous ownership               -> refuse; with --force, replace only
 *                                           eligible declared leaf files
 *
 * Skills targets are never force-eligible. Replacements follow steps 3-5 of
 * the contract: durable journal intent before any change, an opaque .bak
 * under <stateRoot>/backups/<run-id>/<targetId>.bak (0600, never overwritten),
 * install of the staged content, then journal completion. On a safe failure
 * the original is restored and the rollback journaled. A replacement intent
 * without a later completion/rollback line marks the target interrupted: the
 * next run refuses automatic recovery and reports the journal and backup
 * paths.
 *
 * The journal doubles as the per-target recorded-state source: the latest
 * journal line for a target carries the sha256 of the bytes we last wrote
 * (create/update intents and replacement completions). Raw home paths never
 * appear in journal lines or backup names (targetId is an opaque digest,
 * liveRel is root-relative).
 */
import type { Dirent } from "node:fs";
import {
  appendFileSync,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
} from "node:fs";
import { join, relative } from "node:path";
import { excludedBy, isSymlink, normalizeRel } from "./declared-targets.js";
import { targetIdOf } from "./materialize-state.js";

export interface DeclaredTarget {
  /** Opaque sha256 digest of the canonical live path — the state key. */
  targetId: string;
  /** Live-root-relative path; never absolute, never a raw home path. */
  liveRel: string;
  /** Absolute live path (the CLI boundary computes it from roots + seams). */
  livePath: string;
  /** Absolute managed live root this target belongs to (config root for
   * render targets, skills root for copy targets) — the parent-symlink walk
   * stops here, INCLUSIVE of the root itself. */
  liveRoot: string;
  /** Tracked-root-relative source path inside the installed payload. */
  sourceRel: string;
  /** Absolute source path in the installed payload. */
  sourcePath: string;
  kind: "render" | "copy";
  /** Declared leaf files may be force-replaced; skills never. */
  eligibleForForce: boolean;
}

export interface TargetBuildRefusal {
  liveRel: string;
  reason: string;
}

/** Everything decideTargetAction needs to know about one declared target. */
export interface TargetPreflightState {
  exists: boolean;
  isSymlink: boolean;
  isFile: boolean;
  /** sha256 of the live bytes; null when absent or not a regular file. */
  hash: string | null;
  /** An active-profile ownership receipt exists for this target. */
  owned: boolean;
  /** The ownership receipt exists but is corrupt/unreadable. */
  ownershipAmbiguous: boolean;
  /** The last journaled state hash (bytes we previously wrote). */
  recordedHash: string | null;
  /** A replacement intent without a later completion/rollback. */
  interrupted: boolean;
  interruptNote: string | null;
}

export type TargetDecision =
  | { action: "create" }
  | { action: "update" }
  | { action: "replace"; backupRef: string; liveHashBefore: string }
  | { action: "refuse"; reason: string };

/**
 * THE preflight state-machine decision function (proof point for slice 5):
 * maps one target's preflight state to create/update/replace/refuse.
 */
export function decideTargetAction(
  state: TargetPreflightState,
  opts: {
    force: boolean;
    eligibleForForce: boolean;
    runId: string;
    targetId: string;
  },
): TargetDecision {
  // An absent target with a dangling replacement intent is NOT a fresh
  // machine — the crashed run moved the original to a .bak; refuse and
  // report instead of silently re-creating (cli-vision.md recovery rule).
  if (state.interrupted)
    return refuse(
      `interrupted replacement — automatic recovery refused; see ${state.interruptNote ?? "the run journal"} and the backups/ dir`,
    );
  if (!state.exists) return { action: "create" };
  if (state.isSymlink)
    return refuse(
      "symlink target — never followed or replaced (lstat-only), even with --force",
    );
  if (!state.isFile)
    return refuse(
      "not a regular file — directory or special file at a declared leaf target is ambiguous",
    );
  if (state.ownershipAmbiguous)
    return refuse(
      "ownership state ambiguous — active-profile receipt corrupt or unreadable",
    );
  if (
    state.owned &&
    state.recordedHash !== null &&
    state.hash === state.recordedHash
  )
    return { action: "update" };

  let reason: string;
  if (!state.owned)
    reason =
      "unowned — no active-profile ownership receipt; no silent adoption";
  else if (state.recordedHash === null)
    reason =
      "missing ownership state — owned target has no recorded state hash";
  else
    reason =
      "changed since the last materialization (live bytes differ from the recorded state)";

  if (opts.force && opts.eligibleForForce) {
    return {
      action: "replace",
      backupRef: `${opts.runId}/${opts.targetId}.bak`,
      liveHashBefore: state.hash ?? "",
    };
  }
  return refuse(
    opts.eligibleForForce
      ? `${reason} — use --force for an eligible declared leaf file`
      : `${reason} — skills are never force-replaced`,
  );
}

// --- run journal -----------------------------------------------------------

export interface JournalTarget {
  targetId: string;
  liveRel: string;
  /** create | update | replaced | rollback */
  action: string;
  stateHash?: string;
  backupRef?: string;
  liveHashBefore?: string;
}

export interface JournalEntry {
  ts: string;
  command: string;
  runId: string;
  phase: "intent" | "completion" | "rollback";
  target: JournalTarget;
}

/** Append a durable journal line (creates the state root 0700 when needed). */
export function writeJournal(stateDir: string, entry: JournalEntry): void {
  mkdirSync(stateDir, { recursive: true, mode: 0o700 });
  appendFileSync(join(stateDir, "ledger.jsonl"), `${JSON.stringify(entry)}\n`, {
    mode: 0o600,
  });
}

/**
 * The recorded state for one target, derived from the run journal: the last
 * journaled stateHash (the bytes we wrote) and whether a replacement intent
 * is dangling (interrupted run). Corrupt lines are skipped — a journal read
 * is never fatal.
 */
export function journalStateFor(
  stateDir: string,
  targetId: string,
): {
  recordedHash: string | null;
  interrupted: boolean;
  interruptNote: string | null;
} {
  const ledger = join(stateDir, "ledger.jsonl");
  if (!existsSync(ledger))
    return { recordedHash: null, interrupted: false, interruptNote: null };
  let recordedHash: string | null = null;
  let interrupted = false;
  let interruptNote: string | null = null;
  for (const line of readFileSync(ledger, "utf8").split("\n")) {
    if (!line.trim()) continue;
    let entry: JournalEntry | null = null;
    try {
      entry = JSON.parse(line) as JournalEntry;
    } catch {
      continue; // corrupt journal line — never fatal for a read
    }
    const t = entry?.target;
    if (!t || t.targetId !== targetId) continue;
    if (entry.phase === "intent" && t.action === "replaced") {
      interrupted = true;
      interruptNote = `ledger.jsonl (intent at ${entry.ts}), backup ${t.backupRef ?? "unknown"}`;
    } else {
      interrupted = false;
      if (typeof t.stateHash === "string" && t.stateHash !== "")
        recordedHash = t.stateHash;
    }
  }
  return { recordedHash, interrupted, interruptNote };
}

// --- declared target building ----------------------------------------------

/**
 * Build the render targets from the manifest `files` map: each entry is one
 * declared leaf file. Entries that escape a root, sit under an exclusion,
 * or point at a missing/symlinked tracked source become build refusals.
 */
export function declaredTargetsFromFiles(args: {
  liveRoot: string;
  trackedRoot: string;
  files: Record<string, string>;
  exclusions: string[];
}): { targets: DeclaredTarget[]; refusals: TargetBuildRefusal[] } {
  const targets: DeclaredTarget[] = [];
  const refusals: TargetBuildRefusal[] = [];
  for (const [liveRaw, trackedRaw] of Object.entries(args.files)) {
    const liveRel = assertContained(args.liveRoot, liveRaw);
    const trackedRel = assertContained(args.trackedRoot, trackedRaw);
    if (liveRel === null || trackedRel === null) {
      refusals.push({
        liveRel: liveRaw,
        reason: `manifest path escapes its root: live '${liveRaw}' / tracked '${trackedRaw}'`,
      });
      continue;
    }
    const excluded =
      excludedBy(liveRel, args.exclusions) ??
      excludedBy(trackedRel, args.exclusions);
    if (excluded !== null) {
      refusals.push({
        liveRel,
        reason: `path is under an excluded prefix ('${excluded}') in the harness manifest`,
      });
      continue;
    }
    const sourcePath = join(args.trackedRoot, trackedRel);
    if (!existsSync(sourcePath)) {
      refusals.push({
        liveRel,
        reason: `tracked source missing in the installed package: ${trackedRel}`,
      });
      continue;
    }
    if (isSymlink(sourcePath)) {
      refusals.push({
        liveRel,
        reason: `tracked source is a symlink (never copied through links): ${trackedRel}`,
      });
      continue;
    }
    const livePath = join(args.liveRoot, liveRel);
    targets.push({
      targetId: targetIdOf(livePath),
      liveRel,
      livePath,
      liveRoot: args.liveRoot,
      sourceRel: trackedRel,
      sourcePath,
      kind: "render",
      eligibleForForce: true,
    });
  }
  return { targets, refusals };
}

/**
 * Build the copy targets from the manifest `skills` section: every file under
 * every declared skill dir becomes a declared leaf target. Skills are never
 * force-eligible; a symlink in the tracked tree refuses.
 */
export function declaredTargetsFromSkills(args: {
  liveRoot: string;
  trackedRoot: string;
  dirs: string[];
}): { targets: DeclaredTarget[]; refusals: TargetBuildRefusal[] } {
  const targets: DeclaredTarget[] = [];
  const refusals: TargetBuildRefusal[] = [];
  for (const dir of args.dirs) {
    const contained = assertContained(args.liveRoot, dir);
    if (contained === null) {
      refusals.push({
        liveRel: dir,
        reason: `declared skill dir escapes its live root: ${dir}`,
      });
      continue;
    }
    const sourceRoot = join(args.trackedRoot, dir);
    if (isSymlink(sourceRoot)) {
      refusals.push({
        liveRel: dir,
        reason: `declared skill dir is a symlink (never copied through links): skills/${dir}`,
      });
      continue;
    }
    if (!existsSync(sourceRoot)) {
      refusals.push({
        liveRel: dir,
        reason: `declared skill dir missing in the installed package: skills/${dir}`,
      });
      continue;
    }
    for (const full of walkFilesWithRefusals(sourceRoot, refusals, dir)) {
      const rel = relative(sourceRoot, full);
      if (isSymlink(full)) {
        refusals.push({
          liveRel: join(dir, rel),
          reason: `tracked skill file is a symlink (never copied through links): skills/${dir}/${rel}`,
        });
        continue;
      }
      const livePath = join(args.liveRoot, dir, rel);
      targets.push({
        targetId: targetIdOf(livePath),
        liveRel: join(dir, rel),
        livePath,
        liveRoot: args.liveRoot,
        sourceRel: join("skills", dir, rel),
        sourcePath: full,
        kind: "copy",
        eligibleForForce: false,
      });
    }
  }
  return { targets, refusals };
}

// --- internals -------------------------------------------------------------

function refuse(reason: string): { action: "refuse"; reason: string } {
  return { action: "refuse", reason };
}

function assertContained(root: string, rel: string): string | null {
  const normalized = normalizeRel(root, rel);
  if (
    normalized === "" ||
    normalized.startsWith("..") ||
    normalized.includes("../")
  )
    return null;
  return normalized;
}

/** Directory walk that classifies every Dirent: regular files are returned;
 * symlinks and special entries are surfaced as refusals (never silently
 * skipped — a skipped file would materialize an incomplete skill). */
function walkFilesWithRefusals(
  dir: string,
  refusals: TargetBuildRefusal[],
  liveRelPrefix: string,
): string[] {
  const out: string[] = [];
  let entries: Dirent[];
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch {
    return out;
  }
  for (const entry of entries) {
    if (entry.name === ".DS_Store") continue;
    const full = join(dir, entry.name);
    if (entry.isSymbolicLink() || (!entry.isFile() && !entry.isDirectory())) {
      refusals.push({
        liveRel: join(liveRelPrefix, entry.name),
        reason: `tracked skill entry is a symlink or special file (never copied through links): ${liveRelPrefix}/${entry.name}`,
      });
      continue;
    }
    if (entry.isDirectory())
      out.push(
        ...walkFilesWithRefusals(
          full,
          refusals,
          join(liveRelPrefix, entry.name),
        ),
      );
    else out.push(full);
  }
  return out;
}
