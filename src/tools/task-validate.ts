#!/usr/bin/env -S node --import tsx
/**
 * task-validate — single source of truth for backlog task quality validation.
 *
 * Three surfaces import it (injectable-runner pattern: the checks are pure
 * exported functions, so unit tests need no subprocess):
 *   1. task-flow.ts claim gate — refuses To Do -> In Progress when the task is
 *      missing spec quality (empty/placeholder description, zero ACs, EARS
 *      violations, or the spec-approved HITL marker).
 *   2. Pre-commit hook — `bun bin/src/task-validate.ts --pre-commit` blocks a
 *      commit when a staged backlog/tasks/task-*.md reduces the acceptance
 *      criteria of a spec-approved task (AC-gutting).
 *   3. plugins/enforce.ts Hook 10 — nudge on `backlog task create` on any
 *      branch (missing description / zero --ac / --no-dod-defaults).
 *
 * Exit codes (CLI): 0 ok / no violation, 1 violation (AC-gutting blocked),
 * 2 usage. Env: none.
 */
import { spawnSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { basename, join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { parse as parseYaml } from "yaml";

export const SPEC_APPROVED_LABEL = "spec-approved";
export const HOUSEKEEPING_TYPES = new Set(["chore", "docs", "spike"]);

/**
 * CLOSED LABEL VOCABULARY (TASK-51 AC #11/#17).
 *
 * Reserved tier: machinery-only — valid labels, but they are SET BY MACHINERY
 * (conductor, wayfinder skill, claim/close flows) as a procedural rule, never
 * hand-set by an agent:
 *   - spec-approved  HITL spec gate marker (claim gate requires it)
 *   - dispatched/stuck/merged  conductor dispatch state
 *   - housekeeping  chore/docs/spike class marker
 *   - wayfinder:map  wayfinder decision-map membership marker
 *
 * General tier: the only hand-settable labels an agent may assign, evaluated
 * against the decision table (decideGeneralLabel, AC #15):
 *   - harness    work modifies the harness itself (file-path rule)
 *   - dogfood    deliverable is real work verified through the harness
 *   - deferred   explicit revive trigger recorded
 *
 * Matching is case-insensitive EVERYWHERE (vocabulary membership, spec-approved
 * checks, priority checks). Unknown labels are a validation failure at the
 * claim gate, create gate (Hook 10), and pre-commit path.
 */
export const RESERVED_LABELS: ReadonlySet<string> = new Set([
  "spec-approved",
  "dispatched",
  "stuck",
  "merged",
  "housekeeping",
  "wayfinder:map",
]);
export const GENERAL_LABELS: ReadonlySet<string> = new Set([
  "harness",
  "dogfood",
  "deferred",
]);

/** Normalize a label for vocabulary/priority matching (case-insensitive). */
export function normalizeLabel(label: string): string {
  return String(label ?? "")
    .trim()
    .toLowerCase();
}

export function isReservedLabel(label: string): boolean {
  return RESERVED_LABELS.has(normalizeLabel(label));
}

export function isGeneralLabel(label: string): boolean {
  return GENERAL_LABELS.has(normalizeLabel(label));
}

/** True when the label is in the closed vocabulary (reserved or general tier). */
export function isKnownLabel(label: string): boolean {
  return isReservedLabel(label) || isGeneralLabel(label);
}

/** Labels outside the closed vocabulary, preserving the caller's casing. */
export function unknownLabels(labels: string[] | null | undefined): string[] {
  return (labels ?? []).filter((label) => !isKnownLabel(label));
}

/**
 * HARNESS-DEV CONTEXT DETECTION (AC #17).
 *
 * The canonical repo list: the agents-harness repo and the weavelog dev repo.
 * A working repo is a harness-dev context when a git remote URL matches a
 * canonical repo (basename match, case-insensitive, tolerating `.git` and a
 * `-dev`/`.dev` dev-repo suffix), OR — only when the repo has NO remotes —
 * the git repo ROOT's basename matches a canonical repo, OR the backlog
 * project_name from backlog/config.yml matches (works inside worktrees), OR
 * a config param opts in explicitly. Remote URL is the primary signal (repo
 * identity, not local layout); the root-basename signal exists for bare
 * clones / worktrees that carry no remote, and the config.yml signal covers
 * worktrees whose root basename is the task id (both the ~/.agents repo and
 * its worktrees land here today).
 * Detection is the CALLER's choice of evidence: guards pass the best they have
 * (remote URLs from `git remote -v`, or an explicit config override — the
 * injectable hook unit tests use). When harness-dev, harness and dogfood are
 * settable per the decision table; when NOT harness-dev, harness and dogfood
 * are a validation FAILURE (not a warning) at claim, create gate, and
 * pre-commit.
 */
export const HARNESS_DEV_REPOS: readonly string[] = [
  "agents-harness",
  "weavelog",
];

function repoNameFromUrl(url: string): string {
  const clean = url.trim().replace(/\/+$/, "");
  const m = clean.match(/[/:]([^/:]+)$/);
  const name = (m ? m[1] : clean).replace(/\.git$/, "");
  return normalizeLabel(name);
}

function matchesHarnessDevRepo(name: string): boolean {
  const n = normalizeLabel(name);
  return HARNESS_DEV_REPOS.some(
    (canonical) =>
      n === canonical || n === `${canonical}-dev` || n === `${canonical}.dev`,
  );
}

export interface HarnessDevInput {
  remoteUrls?: string[];
  /** Git repo ROOT's basename (secondary signal — used only when the repo
   * has NO remotes, e.g. a worktree or a not-yet-pushed clone). */
  repoRootName?: string;
  /** Backlog project_name from backlog/config.yml (tertiary signal — fires
   * when the repo has no remotes AND the root basename does not match; this
   * works inside every worktree because config.yml is shared content). */
  backlogProjectName?: string;
  config?: { harnessDev?: boolean };
}

export function isHarnessDevContext(input: HarnessDevInput = {}): boolean {
  if (input.config?.harnessDev !== undefined) return input.config.harnessDev;
  const urls = input.remoteUrls ?? [];
  // Remote URL match is the PRIMARY signal (repo identity, not local layout).
  // When remotes exist but none match, identity is decided — no fallback.
  if (urls.some((url) => matchesHarnessDevRepo(repoNameFromUrl(url))))
    return true;
  if (urls.length > 0) return false;
  // Secondary: a repo with NO remotes whose git ROOT basename matches a
  // canonical repo (the bare-clone case). Tertiary: the backlog project_name
  // from config.yml (the worktree case — root basename is the task id, but
  // config.yml is shared with the main repo). A differently-named remote
  // cannot be overruled by either fallback.
  if (matchesHarnessDevRepo(String(input.repoRootName ?? ""))) return true;
  return matchesHarnessDevRepo(String(input.backlogProjectName ?? ""));
}

/** Read the backlog project_name from <repoRoot>/backlog/config.yml (null when
 * unreadable or absent — never throws). */
export function readBacklogProjectName(repoRoot: string): string | null {
  try {
    const configPath = join(repoRoot, "backlog", "config.yml");
    if (!existsSync(configPath)) return null;
    const parsed = parseYaml(readFileSync(configPath, "utf8")) as {
      project_name?: unknown;
    } | null;
    if (parsed && typeof parsed.project_name === "string")
      return parsed.project_name;
    return null;
  } catch {
    return null;
  }
}

/**
 * Detect harness-dev from a working directory by reading `git remote -v`;
 * when the repo has no remotes, falls back to the git repo ROOT's basename
 * (via `git rev-parse --show-toplevel`) against the canonical repo list, and
 * finally to the backlog project_name from the repo root's
 * backlog/config.yml (works inside worktrees). Remote URL wins over local
 * layout whenever any remote exists.
 * Fails open to false on git machinery errors (callers that treat harness-dev
 * as the gate's precondition must not depend on git succeeding — a repo we
 * cannot identify is not a canonical harness repo).
 */
export function detectHarnessDevFromCwd(
  cwd = process.cwd(),
  runner: GitRunner = defaultGitRunner,
): boolean {
  const r = runner(["remote", "-v"], { cwd });
  if (r.status !== 0) return false;
  const urls = (r.stdout || "")
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean);
  if (urls.length > 0) return isHarnessDevContext({ remoteUrls: urls });
  const root = runner(["rev-parse", "--show-toplevel"], { cwd });
  if (root.status !== 0) return false;
  const rootPath = (root.stdout || "").trim().split("\n")[0] ?? "";
  return isHarnessDevContext({
    repoRootName: basename(rootPath),
    backlogProjectName: readBacklogProjectName(rootPath) ?? undefined,
  });
}

/**
 * GENERAL-LABEL DECISION TABLE (AC #15) — canonical first-match reference.
 *
 * Order matters (mechanical-first, gate-ratified in SPEC v4.1):
 *   1. harness  — the task modifies bin/ or plugins/ or config/ or AGENTS.md
 *                 or docs/trd/, docs/adr/, docs/prd/ or the stack manifest (stack-versions.json
 *                 legacy / weavelog.json current) (file-path rule
 *                 against the task's modified-file paths, case-insensitive)
 *   2. dogfood  — the deliverable is real work run through the harness as the
 *                 verification subject
 *   3. deferred — the task records an explicit revive trigger
 *   4. no match — no label
 *
 * LIMITS (declared, per SPEC v4.1 B4): gates enforce vocabulary membership
 * only — this table is NOT enforced by the gates. Application is agent duty
 * audited by spot check; this function is the canonical reference used by the
 * migration and tests. The file-path rule is best-effort: a task that modifies
 * harness code through a path outside the list will not match "harness" here,
 * and the agent may apply the label on judgment — spot check reconciles.
 */
export type GeneralLabelDecision = "harness" | "dogfood" | "deferred" | null;

export const HARNESS_PATH_RULES: readonly string[] = [
  "bin/",
  "plugins/",
  "config/",
  "docs/trd/",
  "docs/adr/",
  "docs/prd/",
  "AGENTS.md",
  "stack-versions.json",
  "weavelog.json",
];

export interface LabelDecisionInput {
  /** Modified-file paths (project-root relative) recorded on the task. */
  modifiedPaths: string[];
  /** True when the deliverable is real work verified through the harness. */
  deliverableVerifiedThroughHarness?: boolean;
  /** Explicit revive trigger text (deferred tasks record one). */
  reviveTrigger?: string | null;
}

export function decidesHarnessPath(modifiedPaths: string[]): boolean {
  return (modifiedPaths ?? []).some((p) => {
    const path = normalizeLabel(p);
    return HARNESS_PATH_RULES.some((rule) => {
      const r = normalizeLabel(rule);
      return r.endsWith("/") ? path.startsWith(r) : path === r;
    });
  });
}

export function decideGeneralLabel(
  input: LabelDecisionInput,
): GeneralLabelDecision {
  if (decidesHarnessPath(input.modifiedPaths ?? [])) return "harness";
  if (input.deliverableVerifiedThroughHarness) return "dogfood";
  if (String(input.reviveTrigger ?? "").trim()) return "deferred";
  return null;
}

/**
 * MILESTONE DECISION TABLE (AC #18) — canonical first-match reference.
 *
 * Fires ONLY when the task's milestone field is empty (human-assigned
 * milestones always win). Version scope OUTRANKS wayfinder map membership by
 * design. Workflow agents never create milestones — when the target milestone
 * does not exist the agent warns and assigns none (the optional milestoneExists
 * probe encodes that here).
 *
 * LIMITS: like the label table, application is agent duty audited by spot
 * check; the version-scope row is migration-time-only (the one-shot migration
 * assigns it in the same pass it drops v1/v2 labels, and the human creates and
 * names the version milestone before migration runs). The wayfinder row yields
 * a name-derived milestone (wayfinderMilestoneName); the wayfinder skill
 * creates one milestone per map at map setup. Scaffolded workspaces ship no
 * default milestone table.
 */
export const VERSION_MILESTONE_ID = "m-6";
export const VERSION_SCOPE_LABELS: readonly string[] = ["v1", "v2"];

/** One wayfinder milestone per map, name-derived (reference convention). */
export function wayfinderMilestoneName(mapName: string): string {
  return `wayfinder:${normalizeLabel(mapName)}`;
}

export interface MilestoneDecisionInput {
  labels: string[];
  currentMilestone: string | null;
  /** Map identifier when the task belongs to a wayfinder decision map. */
  wayfinderMap?: string | null;
  /** Optional probe — when provided and false for the target, assign none. */
  milestoneExists?: (milestone: string) => boolean;
}

export interface MilestoneDecision {
  milestone: string | null;
  reason: string;
}

export function decideMilestone(
  input: MilestoneDecisionInput,
): MilestoneDecision {
  if (String(input.currentMilestone ?? "").trim()) {
    return {
      milestone: null,
      reason: `task already has milestone ${input.currentMilestone} — human-assigned milestones win, leave unchanged`,
    };
  }
  const labels = input.labels ?? [];
  const hasVersionScope = labels.some((label) =>
    VERSION_SCOPE_LABELS.includes(normalizeLabel(label)),
  );
  if (hasVersionScope) {
    if (input.milestoneExists && !input.milestoneExists(VERSION_MILESTONE_ID)) {
      return {
        milestone: null,
        reason: `version milestone ${VERSION_MILESTONE_ID} does not exist — warn and assign none (never create milestones)`,
      };
    }
    return {
      milestone: VERSION_MILESTONE_ID,
      reason:
        "version scope (v1/v2) — migration-time-only signal assigning the version milestone",
    };
  }
  if (String(input.wayfinderMap ?? "").trim()) {
    const mapName = String(input.wayfinderMap);
    const target = wayfinderMilestoneName(mapName);
    if (input.milestoneExists && !input.milestoneExists(target)) {
      return {
        milestone: null,
        reason: `wayfinder map milestone ${target} does not exist — warn and assign none (never create milestones)`,
      };
    }
    return {
      milestone: target,
      reason: `task belongs to wayfinder decision map ${mapName} — assign the map milestone`,
    };
  }
  return {
    milestone: null,
    reason:
      "no version scope and no wayfinder map — none (no milestone assigned)",
  };
}

/**
 * SCAFFOLDED-WORKSPACE VOCABULARY (AC #17) — the consumable contract for the
 * future weavelog scaffold command (no scaffold command exists yet).
 * A scaffolded workspace is NOT a harness development repo, so the generated
 * task vocabulary is the reserved set plus the fixed default general label
 * (deferred) ONLY — no harness, no dogfood. A scaffold config may add further
 * general labels explicitly.
 */
export function scaffoldVocabulary(): {
  reserved: readonly string[];
  general: readonly string[];
} {
  return {
    reserved: [...RESERVED_LABELS],
    general: ["deferred"],
  };
}

/** EARS gate: an AC must START with an uppercase WHEN/IF/WHILE (anchored,
 * case-sensitive) and contain an uppercase THEN token. */
/** EARS gate: an AC must START with an uppercase WHEN/IF/WHILE (anchored,
 * case-sensitive) and contain an uppercase THEN token. */
export const EARS_START_RE = /^(WHEN|IF|WHILE)\b/;
export const EARS_THEN_RE = /\bTHEN\b/;

export const DESCRIPTION_PLACEHOLDER = "No description provided";
export const CREATE_MODE_PLACEHOLDER_PREFIX = "(created by --create mode";

export interface ParsedTask {
  description?: string | null;
  acceptanceCriteria?: Array<{ text?: string }>;
  type?: string | null;
  labels?: string[];
  priority?: string | null;
  dependencies?: string[];
}

export interface GateResult {
  ok: boolean;
  errors: string[];
  warnings: string[];
}

/** Case-insensitive label membership helper. */
export function hasLabel(
  labels: string[] | null | undefined,
  label: string,
): boolean {
  return (labels ?? []).some(
    (l) => normalizeLabel(l) === normalizeLabel(label),
  );
}

/** Configured priority set (AC #14) — the backlog CLI default set
 * (High/Medium/Low). Matching is case-insensitive: frontmatter 'high' vs CLI
 * 'High' both pass. */
export const CONFIGURED_PRIORITIES: ReadonlySet<string> = new Set([
  "high",
  "medium",
  "low",
]);

export function priorityOk(priority: string | null | undefined): boolean {
  if (priority === null || priority === undefined) return false;
  const p = String(priority).trim().toLowerCase();
  return p !== "" && CONFIGURED_PRIORITIES.has(p);
}

/**
 * DAG check (AC #13): a dependency's resolved status. Done deps are read from
 * backlog/tasks AND backlog/completed AND backlog/archive (all count as
 * satisfied). A dep found in none of the three locations is declared
 * unverified — it may live on another branch (cross-branch deps cannot be
 * confirmed from the local working copy).
 */
export interface TaskDependencyStatus {
  id: string;
  found: boolean;
  /** Frontmatter status when readable; null when missing or unreadable. */
  status: string | null;
  /** True when the file was not found locally (declared unverified). */
  crossBranch: boolean;
}

export interface DependencyResolutionOptions {
  baseDir?: string;
  scopes?: readonly string[];
}

const DEFAULT_DEP_SCOPES: readonly string[] = ["tasks", "completed", "archive"];

function escapeRegExpId(id: string): string {
  return id.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Resolve dependency ids to their status by scanning backlog/<scope>/ for
 * files whose name starts with `task-<lowercase-id>` (backlog filename
 * convention). Reads frontmatter via parseTaskFile. */
export function resolveDependencyStatuses(
  ids: string[],
  options: DependencyResolutionOptions = {},
): TaskDependencyStatus[] {
  const baseDir = options.baseDir ?? process.cwd();
  const scopes = options.scopes ?? DEFAULT_DEP_SCOPES;
  const results: TaskDependencyStatus[] = [];
  for (const id of ids) {
    const prefix = String(id).toLowerCase();
    const re = new RegExp(`^${escapeRegExpId(prefix)}\\b`);
    let status: string | null = null;
    inner: for (const scope of scopes) {
      const dir = join(baseDir, "backlog", scope);
      if (!existsSync(dir)) continue;
      let entries: string[];
      try {
        entries = readdirSync(dir).filter((f) => f.endsWith(".md"));
      } catch {
        continue;
      }
      for (const f of entries) {
        if (re.test(f)) {
          const meta = parseTaskFile(readFileSync(join(dir, f), "utf8"));
          status = meta.status;
          break inner;
        }
      }
    }
    results.push(
      status === null
        ? { id: id, found: false, status: null, crossBranch: true }
        : { id, found: true, status, crossBranch: false },
    );
  }
  return results;
}

export interface ClaimGateOptions {
  /** Harness-dev context (AC #17) — when false, harness/dogfood labels are a
   * validation FAILURE. Defaults to false. */
  harnessDev?: boolean;
  /** Resolved dependency statuses (AC #13). When omitted, DAG checks are
   * skipped (backward-compatible callers that cannot resolve). */
  dependencies?: TaskDependencyStatus[];
}

export function isPlaceholderDescription(description: string): boolean {
  const d = (description ?? "").trim();
  return (
    d === DESCRIPTION_PLACEHOLDER ||
    d.startsWith(CREATE_MODE_PLACEHOLDER_PREFIX)
  );
}

/** EARS shape: anchored uppercase WHEN/IF/WHILE at the string start (multi-line
 * ACs allowed — THEN may appear on a later line), plus an uppercase THEN. */
export function earsShapeOk(text: string): boolean {
  return EARS_START_RE.test(text) && EARS_THEN_RE.test(text);
}

export function isSpecApproved(labels: string[] | null | undefined): boolean {
  return (labels ?? []).some(
    (label) => String(label).toLowerCase() === SPEC_APPROVED_LABEL,
  );
}

/** Claim gate for the To Do -> In Progress transition (task-flow.ts claim).
 * Errors refuse the transition; warnings (EARS shape on housekeeping types,
 * dependency resolution gaps) are advisory only.
 *
 * v5 checks (AC #11 #13 #14 #17): closed label vocabulary, harness-dev
 * context for harness/dogfood labels, configured priority set (missing or
 * mismatched priority refuses), and the DAG check (an unmet — not Done —
 * dependency refuses; missing/cross-branch targets warn; a Done dep is
 * SATISFIED). */
export function claimGate(
  task: ParsedTask,
  options: ClaimGateOptions = {},
): GateResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  const description = (task.description ?? "").trim();
  if (!description) {
    errors.push(
      'description is empty — add one with `backlog task edit <id> -d "what & why"`',
    );
  } else if (isPlaceholderDescription(description)) {
    errors.push(
      'description is still the creation-time placeholder ("No description provided" / "--create mode") — replace it with a real spec before claiming',
    );
  }

  const acs = task.acceptanceCriteria ?? [];
  if (acs.length === 0) {
    errors.push(
      'task has zero acceptance criteria — add EARS criteria with `backlog task edit <id> --ac "WHEN ... THEN ..."`',
    );
  }

  const housekeeping = HOUSEKEEPING_TYPES.has(
    String(task.type ?? "").toLowerCase(),
  );
  for (const ac of acs) {
    const text = String(ac.text ?? "").trim();
    if (text && !earsShapeOk(text)) {
      const preview = text.length > 60 ? `${text.slice(0, 57)}…` : text;
      const msg = `AC "${preview}" is not EARS-shaped — must start with WHEN/IF/WHILE (case-sensitive) and contain an uppercase THEN`;
      if (housekeeping) warnings.push(msg);
      else errors.push(msg);
    }
  }

  // AC #11: closed label vocabulary — unknown labels refuse the claim.
  const unknown = unknownLabels(task.labels);
  if (unknown.length > 0) {
    errors.push(
      `label(s) outside the closed vocabulary: ${unknown.join(", ")} — reserved (machinery-only): ${[...RESERVED_LABELS].join(", ")}; general (hand-settable): ${[...GENERAL_LABELS].join(", ")}; remove or replace them before claiming`,
    );
  }

  // AC #17: harness-dev context — harness/dogfood are a FAILURE (not a
  // warning) outside a canonical harness repo.
  const harnessDev = options.harnessDev === true;
  if (!harnessDev) {
    if (hasLabel(task.labels, "harness")) {
      errors.push(
        'label "harness" is only settable in a harness-dev context (canonical harness repos: agents-harness, weavelog) — this repo is not detected as one; remove the label or record the harness-dev context',
      );
    }
    if (hasLabel(task.labels, "dogfood")) {
      errors.push(
        'label "dogfood" is only settable in a harness-dev context (canonical harness repos: agents-harness, weavelog) — this repo is not detected as one; remove the label or record the harness-dev context',
      );
    }
  }

  // AC #14: priority determinism — missing or off-set priority refuses claim.
  const priority = task.priority;
  if (
    priority === null ||
    priority === undefined ||
    String(priority).trim() === ""
  ) {
    errors.push(
      `task has no priority — set one from the configured set (${[...CONFIGURED_PRIORITIES].join(", ")}) with \`backlog task edit <id> --priority High\``,
    );
  } else if (!priorityOk(priority)) {
    errors.push(
      `priority "${priority}" is outside the configured set (${[...CONFIGURED_PRIORITIES].join(", ")}, case-insensitive) — fix with \`backlog task edit <id> --priority High\``,
    );
  }

  // AC #13: DAG check — an unmet (not Done) dependency refuses; missing or
  // cross-branch/unreadable targets warn; a Done dep is SATISFIED. Skipped
  // entirely when no resolution was provided (backward-compatible callers).
  const resolved = options.dependencies;
  const depIds = task.dependencies ?? [];
  if (resolved && depIds.length > 0) {
    const byId = new Map(resolved.map((d) => [String(d.id).toLowerCase(), d]));
    for (const depId of depIds) {
      const dep = byId.get(String(depId).toLowerCase());
      if (!dep) continue; // resolver did not return this id — nothing to say
      const status = String(dep.status ?? "").trim();
      if (!status) {
        if (dep.found) {
          warnings.push(
            `dependency ${dep.id} status is unreadable (cross-branch file) — declared unverified`,
          );
        } else {
          warnings.push(
            `dependency ${dep.id} not found in backlog/tasks, backlog/completed, or backlog/archive (may live on another branch) — declared unverified`,
          );
        }
        continue;
      }
      if (status.toLowerCase() === "done") continue; // SATISFIED
      errors.push(
        `dependency ${dep.id} is not Done (status: ${status}) — claim refuses until ${dep.id} is Done; a Done dep is satisfied`,
      );
    }
  }

  if (!isSpecApproved(task.labels)) {
    errors.push(
      `spec-approved label missing — human spec review (checkpoint #1) is not recorded; after human approval add it with \`backlog task edit <id> -l ${SPEC_APPROVED_LABEL}\``,
    );
  }

  return { ok: errors.length === 0, errors, warnings };
}

export interface CreateArgsParse {
  hasDescription: boolean;
  acCount: number;
  hasNoDodDefaults: boolean;
  /** Labels captured from -l/--label/--labels (comma-separated/repeatable). */
  labels: string[];
  /** Priority from --priority (null when absent). */
  priority: string | null;
  /** Dependency ids from --dep/--depends-on (comma-separated/repeatable). */
  deps: string[];
}

/** Parse a `backlog task create` command (raw string or pre-tokenized argv).
 * Handles `--flag value`, `--flag=value`, and single-/double-quoted values.
 * Punts on a flag whose value is the next flag (`--ac --no-dod-defaults`). */
export function parseTaskCreateArgs(input: string | string[]): CreateArgsParse {
  const tokens = tokenizeCreateArgs(input);
  let hasDescription = false;
  let acCount = 0;
  let hasNoDodDefaults = false;
  const labels: string[] = [];
  let priority: string | null = null;
  const deps: string[] = [];

  const collectComma = (out: string[], value: string | undefined) => {
    if (value === undefined || value.startsWith("--") || value.trim() === "")
      return;
    out.push(
      ...value
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
    );
  };

  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i];
    if (t === "--no-dod-defaults") {
      hasNoDodDefaults = true;
      continue;
    }
    if (t === "-d" || t === "--description" || t === "--desc") {
      const v = tokens[i + 1];
      if (v !== undefined && !v.startsWith("--")) hasDescription = true;
      continue;
    }
    if (t.startsWith("--description=") || t.startsWith("--desc=")) {
      if (t.slice(t.indexOf("=") + 1).length > 0) hasDescription = true;
      continue;
    }
    if (t === "--ac" || t === "--acceptance-criteria") {
      const v = tokens[i + 1];
      if (v !== undefined && !v.startsWith("--")) acCount++;
      continue;
    }
    if (t.startsWith("--ac=") || t.startsWith("--acceptance-criteria=")) {
      if (t.slice(t.indexOf("=") + 1).length > 0) acCount++;
      continue;
    }
    if (t === "-l" || t === "--label" || t === "--labels") {
      collectComma(labels, tokens[i + 1]);
      continue;
    }
    if (t.startsWith("--label=") || t.startsWith("--labels=")) {
      collectComma(labels, t.slice(t.indexOf("=") + 1));
      continue;
    }
    if (t === "--priority") {
      const v = tokens[i + 1];
      if (v !== undefined && !v.startsWith("--")) priority = v;
      continue;
    }
    if (t.startsWith("--priority=")) {
      const v = t.slice(t.indexOf("=") + 1);
      if (v) priority = v;
      continue;
    }
    if (t === "--dep" || t === "--depends-on") {
      collectComma(deps, tokens[i + 1]);
      continue;
    }
    if (t.startsWith("--dep=") || t.startsWith("--depends-on=")) {
      collectComma(deps, t.slice(t.indexOf("=") + 1));
    }
  }
  return { hasDescription, acCount, hasNoDodDefaults, labels, priority, deps };
}

export interface CreateGateOptions {
  /** When false (or unset), the whole check fails open — Hook 10 must never
   * block outside a backlog project (AC #13). */
  isBacklogProject?: boolean;
  /** Harness-dev context (AC #17) — harness/dogfood labels refuse when false. */
  harnessDev?: boolean;
  /** The id of the task being created (self-dep detection). */
  selfId?: string;
  /** Existing task id -> dependency ids (cycle detection). */
  existingDepMap?: Record<string, string[]>;
  /** Resolved statuses of the create's deps (missing / dep-on-Done / cross-branch warns). */
  dependencyStatuses?: TaskDependencyStatus[];
}

export interface CreateGateResult {
  ok: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * CREATE GATE (AC #11 #13 #14 #17) — creation-time quality check used by
 * Hook 10. REFUSES (errors): unknown labels, harness/dogfood outside a
 * harness-dev context, self-dep, and cycles the new task would close. WARNS
 * (warnings): missing dep targets, dep-on-Done, cross-branch/unreadable deps,
 * and missing/off-set priority (create-time is warn-only for priority; the
 * claim gate refuses). FAILS OPEN entirely when isBacklogProject is false.
 * Cycle detection uses the optional existingDepMap (id -> deps) — without it,
 * only self-dep is detectable at the create surface (the CLI command itself
 * carries no graph state).
 */
export function createGateCheck(
  input: CreateArgsParse,
  options: CreateGateOptions = {},
): CreateGateResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (options.isBacklogProject === false) return { ok: true, errors, warnings }; // fail-open

  // AC #11: closed label vocabulary.
  const unknown = unknownLabels(input.labels);
  if (unknown.length > 0) {
    errors.push(
      `label(s) outside the closed vocabulary: ${unknown.join(", ")} — reserved (machinery-only): ${[...RESERVED_LABELS].join(", ")}; general (hand-settable): ${[...GENERAL_LABELS].join(", ")}`,
    );
  }

  // AC #17: harness-dev context.
  const harnessDev = options.harnessDev === true;
  if (!harnessDev) {
    if (hasLabel(input.labels, "harness")) {
      errors.push(
        'label "harness" is only settable in a harness-dev context (agents-harness / weavelog)',
      );
    }
    if (hasLabel(input.labels, "dogfood")) {
      errors.push(
        'label "dogfood" is only settable in a harness-dev context (agents-harness / weavelog)',
      );
    }
  }

  // AC #13: self-dep + cycle refusal.
  const selfId = String(options.selfId ?? "");
  const deps = input.deps ?? [];
  if (
    selfId &&
    deps.some((d) => String(d).toLowerCase() === selfId.toLowerCase())
  ) {
    errors.push(`self-dependency: task ${selfId} depends on itself (AC #13)`);
  }
  if (options.existingDepMap && selfId) {
    const lowerSelf = selfId.toLowerCase();
    // Normalize the caller's graph keys once (case-insensitive access).
    const graph = new Map<string, string[]>();
    for (const [id, depsOf] of Object.entries(options.existingDepMap)) {
      graph.set(
        id.toLowerCase(),
        (depsOf ?? []).map((d) => String(d).toLowerCase()),
      );
    }
    // A cycle exists when a new dep can reach selfId through existing edges.
    const reachable = new Set<string>();
    // Seed the walk with deps other than selfId (selfId is self-dep above).
    const stack = deps
      .map((d) => String(d).toLowerCase())
      .filter((d) => d !== lowerSelf);
    let cycle = false;
    while (stack.length > 0 && !cycle) {
      const cur = stack.pop();
      if (cur === undefined) break;
      if (cur === lowerSelf) {
        cycle = true;
        break;
      }
      if (reachable.has(cur)) continue;
      reachable.add(cur);
      for (const next of graph.get(cur) ?? []) {
        stack.push(next);
      }
    }
    if (cycle) {
      errors.push(
        `dependency cycle: creating ${selfId} with deps [${deps.join(", ")}] closes a cycle through the existing task graph (AC #13)`,
      );
    }
  }

  // AC #13: missing target / dep-on-Done / cross-branch warns.
  const statuses = options.dependencyStatuses;
  if (statuses) {
    const byId = new Map(statuses.map((d) => [String(d.id).toLowerCase(), d]));
    for (const depId of deps) {
      const dep = byId.get(String(depId).toLowerCase());
      if (!dep) continue;
      const status = String(dep.status ?? "").trim();
      if (!status) {
        if (dep.found) {
          warnings.push(
            `dependency ${dep.id} status is unreadable (cross-branch file) — declared unverified`,
          );
        } else {
          warnings.push(
            `dependency ${dep.id} not found in backlog/tasks, backlog/completed, or backlog/archive (may live on another branch) — declared unverified`,
          );
        }
        continue;
      }
      if (status.toLowerCase() === "done") {
        warnings.push(
          `dependency ${dep.id} is already Done — depending on a Done task is allowed but likely unintended (AC #13)`,
        );
      }
    }
  }

  // AC #14: create-time priority warning (claim refuses; create warns).
  const priority = input.priority;
  if (
    priority === null ||
    priority === undefined ||
    String(priority).trim() === ""
  ) {
    warnings.push(
      `no priority set — pick from the configured set (${[...CONFIGURED_PRIORITIES].join(", ")}) with --priority High; the claim gate refuses without one`,
    );
  } else if (!priorityOk(priority)) {
    warnings.push(
      `priority "${priority}" is outside the configured set (${[...CONFIGURED_PRIORITIES].join(", ")}, case-insensitive)`,
    );
  }

  return { ok: errors.length === 0, errors, warnings };
}

function tokenizeCreateArgs(input: string | string[]): string[] {
  if (Array.isArray(input)) {
    // A single-element array that still carries quotes/whitespace is the
    // raw command string; pre-tokenized argv is used as-is.
    if (input.length === 1 && /[\s'"`]/.test(input[0])) {
      return tokenizeString(input[0]);
    }
    return input;
  }
  return tokenizeString(input);
}

function tokenizeString(cmd: string): string[] {
  const tokens: string[] = [];
  let cur = "";
  let started = false;
  let single = false;
  let double = false;
  for (let i = 0; i < cmd.length; i++) {
    const c = cmd[i];
    if (c === "'" && !double) {
      single = !single;
      started = true;
      continue;
    }
    if (c === '"' && !single) {
      double = !double;
      started = true;
      continue;
    }
    if ((c === " " || c === "\t" || c === "\n") && !single && !double) {
      if (started) {
        tokens.push(cur);
        cur = "";
        started = false;
      }
      continue;
    }
    cur += c;
    started = true;
  }
  if (started) tokens.push(cur);
  return tokens;
}

/** task edit flags that mutate the acceptance-criteria list. */
export const AC_MUTATION_FLAGS = [
  "--clear-ac",
  "--remove-ac",
  "--acceptance-criteria",
];

/** AC-gutting gate: true when a spec-approved task's edit carries an
 * AC-mutating flag (--clear-ac / --remove-ac / --acceptance-criteria). */
export function acMutationCheck(
  args: string[],
  isSpecApproved: boolean,
): boolean {
  if (!isSpecApproved) return false;
  return args.some(
    (a) =>
      AC_MUTATION_FLAGS.includes(a) || a.startsWith("--acceptance-criteria="),
  );
}

export interface TaskFileMeta {
  labels: string[];
  type: string | null;
  /** Frontmatter status (null when absent/unreadable). */
  status: string | null;
}

export interface GitRun {
  status: number | null;
  stdout: string;
  stderr: string;
}

type GitRunner = (args: string[], opts?: { cwd?: string }) => GitRun;

const defaultGitRunner: GitRunner = (args, opts) => {
  const r = spawnSync("git", args, {
    encoding: "utf8",
    cwd: opts?.cwd,
    timeout: 15_000,
  });
  return { status: r.status, stdout: r.stdout || "", stderr: r.stderr || "" };
};

/** Frontmatter + AC-section parsing for backlog task files. */
export function parseTaskFile(content: string): TaskFileMeta {
  try {
    const fm = parseFrontmatter(content);
    const labels = Array.isArray(fm.labels) ? fm.labels.map(String) : [];
    const type = typeof fm.type === "string" ? fm.type : null;
    const status = typeof fm.status === "string" ? fm.status : null;
    return { labels, type, status };
  } catch {
    return { labels: [], type: null, status: null };
  }
}

function parseFrontmatter(content: string): Record<string, unknown> {
  const m = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!m) return {};
  return (parseYaml(m[1]) ?? {}) as Record<string, unknown>;
}

/** Count unchecked/checked AC checkbox lines in the AC section (or the whole
 * file when the section markers are absent). */
export function countAcceptanceCriteria(content: string): number {
  const section = content.match(/<!-- AC:BEGIN -->([\s\S]*?)<!-- AC:END -->/);
  const body = section ? section[1] : content;
  let count = 0;
  for (const line of body.split("\n")) {
    if (/^\s*-\s*\[[ xX]\]/.test(line)) count++;
  }
  return count;
}

export interface PreCommitResult {
  exitCode: number;
  blocked: string[];
}

export interface PreCommitOptions {
  /** Harness-dev context (AC #17) — false means staged harness/dogfood labels block. */
  harnessDev?: boolean;
}

const TASK_FILE_RE = /^backlog\/tasks\/task-.*\.md$/;

/** Pre-commit check: block when a staged backlog task file reduces the AC
 * count of a spec-approved task (HEAD vs index), adds a label outside the
 * closed vocabulary (AC #11), or carries a harness/dogfood label outside a
 * harness-dev context (AC #17). Fail-open on git machinery errors (a broken
 * git must not block unrelated commits). */
export function preCommitCheck(
  runner: GitRunner = defaultGitRunner,
  cwd = process.cwd(),
  options: PreCommitOptions = {},
): PreCommitResult {
  const blocked: string[] = [];

  const staged = runner(
    ["diff", "--cached", "--name-only", "--diff-filter=ACM"],
    { cwd },
  );
  if (staged.status !== 0) return { exitCode: 0, blocked }; // fail-open
  const files = (staged.stdout || "")
    .split("\n")
    .map((s) => s.trim())
    .filter((s) => TASK_FILE_RE.test(s));
  if (files.length === 0) return { exitCode: 0, blocked };

  const harnessDev = options.harnessDev === true;
  for (const file of files) {
    const indexSide = runner(["show", `:${file}`], { cwd });
    if (indexSide.status !== 0) continue; // deleted/not in index — nothing to gut
    const headSide = runner(["show", `HEAD:${file}`], { cwd });
    const headContent = headSide.status === 0 ? headSide.stdout : null;

    const { labels } = parseTaskFile(indexSide.stdout);

    // AC #11: unknown labels on a STAGED task file block the commit
    // (mirrors the claim gate; pre-commit is the third surface).
    const unknown = unknownLabels(labels);
    if (unknown.length > 0) {
      blocked.push(
        `${file}: label(s) outside the closed vocabulary: ${unknown.join(", ")} (AC #11)`,
      );
      continue;
    }
    // AC #17: harness/dogfood outside a harness-dev context block.
    if (!harnessDev) {
      const contextLabels = labels.filter(
        (l) => hasLabel([l], "harness") || hasLabel([l], "dogfood"),
      );
      if (contextLabels.length > 0) {
        blocked.push(
          `${file}: label(s) ${contextLabels.join(", ")} require a harness-dev context (AC #17)`,
        );
        continue;
      }
    }

    if (!isSpecApproved(labels)) continue;

    const newCount = countAcceptanceCriteria(indexSide.stdout);
    const oldCount =
      headContent === null ? 0 : countAcceptanceCriteria(headContent);
    if (newCount < oldCount) {
      blocked.push(
        `${file}: AC count dropped ${oldCount} -> ${newCount} on a spec-approved task (AC-gutting)`,
      );
    }
  }
  return { exitCode: blocked.length > 0 ? 1 : 0, blocked };
}

const HELP = `Usage: bun task-validate.ts --pre-commit
       bun task-validate.ts --help

--pre-commit  git pre-commit mode: blocks when staged backlog/tasks/task-*.md
              files reduce acceptance criteria on a spec-approved task, carry
              labels outside the closed vocabulary (AC #11), or carry
              harness/dogfood labels outside a harness-dev context (AC #17).
              Harness-dev context is detected from the cwd (git remotes, repo
              root basename, or backlog config project_name).

Exit codes: 0 ok / no violation, 1 violation blocked, 2 usage`;

function main(): void {
  const args = process.argv.slice(2);
  if (args.includes("--help")) {
    console.log(HELP);
    process.exit(0);
  }
  if (args.includes("--pre-commit")) {
    const result = preCommitCheck(undefined, process.cwd(), {
      harnessDev: detectHarnessDevFromCwd(process.cwd()),
    });
    if (result.exitCode === 1) {
      for (const b of result.blocked) console.error(`  - ${b}`);
      console.error(
        "Blocked: staged backlog task file violates label vocabulary (AC #11), harness-dev context (AC #17), or reduces spec-approved acceptance criteria (AC-gutting).",
      );
      console.error(
        'Fix the labels with `backlog task edit <id> -l <labels>`, or restore the ACs with `backlog task edit <id> --ac "WHEN ... THEN ..."`.',
      );
      process.exit(1);
    }
    process.exit(0);
  }
  console.error(HELP);
  process.exit(2);
}

if (
  process.argv[1] !== undefined &&
  import.meta.url === pathToFileURL(resolve(process.argv[1])).href
) {
  main();
}
