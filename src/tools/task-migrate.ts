#!/usr/bin/env -S node --import tsx
/**
 * task-migrate — ONE-SHOT label-vocabulary migration (TASK-51 AC #16).
 *
 * Reads OPEN tasks from backlog/tasks (To Do / In Progress / In Review; Done
 * tasks are untouched) and computes the per-task FULL remapped label set,
 * applied ONCE via `backlog task edit <id> --label <full-comma-set>` with
 * replace semantics.
 *
 * Mapping (case-insensitive; output is the canonical vocabulary casing):
 *   - reserved labels carry over as-is: spec-approved, housekeeping, merged,
 *     wayfinder:map (and dispatched/stuck).
 *   - harness ABSORBS: infra tooling enforce worktree inner-harness proxy
 *     pi-sharing skill-install architect architecture diagramming docs skills.
 *   - general labels (harness dogfood deferred) are kept.
 *   - v1 and v2 are DROPPED, and tasks WITHOUT a milestone get `-m m-6` (the
 *     version milestone) in the SAME pass; human-assigned milestones always
 *     win (AC #18).
 *   - immediate -> `--priority High`; bugfix -> `--type bug`;
 *     cleanup/maintenance -> `--type chore`.
 *   - any other unknown label is dropped with a WARN line (the mapping is
 *     TOTAL per AC #16 — the closed vocabulary admits only the two tiers).
 *
 * Modes: dry-run DEFAULT (prints the structured plan + summary, never touches
 * the backlog); --execute actually runs the backlog edit commands.
 *
 * Exit codes: 0 ok, 2 usage/error.
 * Env: TASK_MIGRATE_BACKLOG — backlog binary path (default ~/.bun/bin/backlog;
 * tests only). TASK_MIGRATE_DIR — repo root with backlog/tasks (default
 * process.cwd(); tests only).
 */
import { spawnSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { parse as parseYaml } from "yaml";
import {
  GENERAL_LABELS,
  normalizeLabel,
  RESERVED_LABELS,
  VERSION_MILESTONE_ID,
} from "./task-validate.js";

const HELP = `Usage: bun task-migrate.ts [--execute] [--help]

One-shot TASK-51 label migration (AC #16). Reads open tasks from
backlog/tasks, computes the full remapped label set per task, and (with
--execute) applies it once via 'backlog task edit <id> --label <full-set>'
with replace semantics. Reserved labels carry over; harness ABSORBS
infra/tooling/enforce/worktree/inner-harness/proxy/pi-sharing/skill-install/
architect/architecture/diagramming/docs/skills; v1/v2 are dropped and tasks
without a milestone get -m m-6 in the same pass (human-assigned milestones
win); immediate -> --priority High;
bugfix -> --type bug; cleanup/maintenance -> --type chore. Done tasks are
untouched. dry-run is the default mode and never modifies anything.

Exit codes: 0 ok, 2 usage/error
Env: TASK_MIGRATE_BACKLOG — backlog binary path (default ~/.bun/bin/backlog)
Env: TASK_MIGRATE_DIR — repo root with backlog/tasks (default: cwd)`;

const HARNESS_ABSORBED_LABELS: readonly string[] = [
  "infra",
  "tooling",
  "enforce",
  "worktree",
  "inner-harness",
  "proxy",
  "pi-sharing",
  "skill-install",
  "architect",
  "architecture",
  "diagramming",
  "docs",
  "skills",
];
const MIGRATION_DROPPED_LABELS: readonly string[] = ["v1", "v2"];
const IMMEDIATE_LABEL = "immediate";
const BUGFIX_LABEL = "bugfix";
const HOUSEKEEPING_LABELS: readonly string[] = ["cleanup", "maintenance"];

interface TaskMeta {
  id: string;
  status: string;
  labels: string[];
  milestone: string | null;
  type?: string | null;
}

function parseTaskMeta(content: string): TaskMeta | null {
  const m = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!m) return null;
  let fm: Record<string, unknown>;
  try {
    fm = (parseYaml(m[1]) ?? {}) as Record<string, unknown>;
  } catch {
    return null;
  }
  if (fm === null || typeof fm.id !== "string") return null;
  return {
    id: fm.id,
    status: typeof fm.status === "string" ? fm.status : "",
    labels: Array.isArray(fm.labels) ? fm.labels.map(String) : [],
    milestone:
      typeof fm.milestone === "string" && fm.milestone.trim()
        ? fm.milestone
        : null,
  };
}

const OPEN_STATUSES: ReadonlySet<string> = new Set([
  "to do",
  "in progress",
  "in review",
]);

export interface TaskPlan {
  id: string;
  oldLabels: string[];
  newLabels: string[];
  milestone: string | null;
  priority: string | null;
  type: string | null;
  noop: boolean;
  warnings: string[];
}

export interface MigrationSummary {
  open: number;
  changed: number;
  noop: number;
  warnings: number;
}

export interface MigrationPlanResult {
  plans: TaskPlan[];
  summary: MigrationSummary;
}

/** Canonical vocabulary spelling for a label (null when not in the vocabulary). */
function canonicalVocabularyLabel(label: string): string | null {
  const n = normalizeLabel(label);
  for (const r of RESERVED_LABELS) {
    if (normalizeLabel(r) === n) return r;
  }
  for (const g of GENERAL_LABELS) {
    if (normalizeLabel(g) === n) return g;
  }
  return null;
}

function computeTaskPlan(meta: TaskMeta): TaskPlan {
  const out: string[] = [];
  const seen = new Set<string>();
  const warnings: string[] = [];
  let milestone: string | null = null;
  let priority: string | null = null;
  let type: string | null = null;
  const add = (label: string) => {
    const n = normalizeLabel(label);
    if (!seen.has(n)) {
      seen.add(n);
      out.push(label);
    }
  };

  for (const raw of meta.labels) {
    const n = normalizeLabel(raw);
    if (MIGRATION_DROPPED_LABELS.includes(n)) {
      // AC #18: human-assigned milestones always win — the version
      // milestone is only assigned when the task has NO milestone.
      if (milestone === null && meta.milestone === null)
        milestone = VERSION_MILESTONE_ID;
      continue;
    }
    if (HARNESS_ABSORBED_LABELS.includes(n)) {
      add("harness");
      continue;
    }
    if (n === IMMEDIATE_LABEL) {
      if (priority === null) priority = "High";
      continue;
    }
    if (n === BUGFIX_LABEL) {
      if (type === null && meta.type !== "bug") type = "bug";
      continue;
    }
    if (HOUSEKEEPING_LABELS.includes(n)) {
      if (type === null) type = "chore";
      continue;
    }
    const canon = canonicalVocabularyLabel(raw);
    if (canon) add(canon);
    else warnings.push(`dropped unknown label "${raw}"`);
  }

  const oldNorm = new Set(meta.labels.map(normalizeLabel));
  const newNorm = new Set(out.map(normalizeLabel));
  const sameLabels =
    oldNorm.size === newNorm.size && [...oldNorm].every((l) => newNorm.has(l));
  const noop =
    sameLabels && milestone === null && priority === null && type === null;

  return {
    id: meta.id,
    oldLabels: meta.labels,
    newLabels: out,
    milestone,
    priority,
    type,
    noop,
    warnings,
  };
}

/** Read and plan the migration over <baseDir>/backlog/tasks. Never mutates. */
export function planMigration(baseDir: string): MigrationPlanResult {
  const tasksDir = join(baseDir, "backlog", "tasks");
  const plans: TaskPlan[] = [];
  if (!existsSync(tasksDir)) {
    return { plans, summary: { open: 0, changed: 0, noop: 0, warnings: 0 } };
  }
  let entries: string[];
  try {
    entries = readdirSync(tasksDir).filter((f) => f.endsWith(".md"));
  } catch {
    return { plans, summary: { open: 0, changed: 0, noop: 0, warnings: 0 } };
  }
  for (const f of entries) {
    const meta = parseTaskMeta(readFileSync(join(tasksDir, f), "utf8"));
    if (!meta || !OPEN_STATUSES.has(normalizeLabel(meta.status))) continue;
    plans.push(computeTaskPlan(meta));
  }
  const changed = plans.filter((p) => !p.noop).length;
  const noop = plans.filter((p) => p.noop).length;
  const warnings = plans.reduce((acc, p) => acc + p.warnings.length, 0);
  return {
    plans,
    summary: { open: plans.length, changed, noop, warnings },
  };
}

function editArgs(plan: TaskPlan): string[] {
  const args = ["task", "edit", plan.id];
  // backlog's `--label ""` exits 0 but does NOT clear labels; an empty
  // remapped set must use --clear-labels instead.
  if (plan.newLabels.length === 0) args.push("--clear-labels");
  else args.push("--label", plan.newLabels.join(","));
  if (plan.milestone !== null) args.push("-m", plan.milestone);
  if (plan.priority !== null) args.push("--priority", plan.priority);
  if (plan.type !== null) args.push("--type", plan.type);
  return args;
}

export interface RunMigrationOptions {
  baseDir: string;
  execute: boolean;
  backlog: string;
}

export interface RunMigrationResult {
  exitCode: number;
  lines: string[];
  failed: string[];
}

/** Run the migration: prints the structured plan; with execute=true applies it
 * via the backlog binary. Never touches the backlog in dry-run. */
export function runMigration(options: RunMigrationOptions): RunMigrationResult {
  const { plans, summary } = planMigration(options.baseDir);
  const lines: string[] = [];
  const failed: string[] = [];
  for (const plan of plans) {
    for (const w of plan.warnings) lines.push(`WARN ${plan.id}: ${w}`);
    const flags: string[] = [];
    if (plan.milestone !== null) flags.push(`milestone=${plan.milestone}`);
    if (plan.priority !== null) flags.push(`priority=${plan.priority}`);
    if (plan.type !== null) flags.push(`type=${plan.type}`);
    if (plan.noop) {
      lines.push(`NOOP ${plan.id}`);
      continue;
    }
    const labelPart =
      plan.newLabels.length > 0 ? plan.newLabels.join(",") : "(none)";
    lines.push(
      `PLAN ${plan.id} labels=${labelPart}${flags.length > 0 ? ` ${flags.join(" ")}` : ""}`,
    );
    if (options.execute) {
      const r = spawnSync(options.backlog, editArgs(plan), {
        encoding: "utf8",
        timeout: 30_000,
      });
      if (r.status !== 0) {
        failed.push(
          `${plan.id}: ${(r.stderr || r.stdout || "backlog edit failed").trim()}`,
        );
      }
    }
  }
  lines.push(
    `SUMMARY open=${summary.open} changed=${summary.changed} noop=${summary.noop} warnings=${summary.warnings}`,
  );
  for (const line of lines) console.log(line);
  if (failed.length > 0) {
    for (const f of failed) console.error(`  - ${f}`);
    console.error(`Blocked: ${failed.length} backlog edit(s) failed.`);
    return { exitCode: 2, lines, failed };
  }
  return { exitCode: 0, lines, failed };
}

function main(): void {
  const args = process.argv.slice(2);
  if (args.includes("--help")) {
    console.log(HELP);
    process.exit(0);
  }
  if (args.some((a) => a.startsWith("--") && a !== "--execute")) {
    console.error(
      `task-migrate: unknown flag: ${args.find((a) => a.startsWith("--") && a !== "--execute")}`,
    );
    console.error(HELP);
    process.exit(2);
  }
  if (args.length > 1) {
    console.error("task-migrate: expected no positional arguments");
    console.error(HELP);
    process.exit(2);
  }
  const execute = args.includes("--execute");
  const backlog =
    process.env.TASK_MIGRATE_BACKLOG ??
    join(homedir(), ".bun", "bin", "backlog");
  const baseDir = process.env.TASK_MIGRATE_DIR ?? process.cwd();
  const tasksDir = join(baseDir, "backlog", "tasks");
  if (!existsSync(tasksDir)) {
    console.error(`task-migrate: no backlog/tasks at ${tasksDir}`);
    process.exit(2);
  }
  const result = runMigration({ baseDir, execute, backlog });
  process.exit(result.exitCode);
}

if (
  process.argv[1] !== undefined &&
  import.meta.url === pathToFileURL(resolve(process.argv[1])).href
) {
  main();
}
