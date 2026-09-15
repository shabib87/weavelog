/** Read a Backlog task through the CLI JSON interface and check eligibility. */

import {
  claimGate,
  detectHarnessDevFromCwd,
  type ParsedTask,
  type TaskDependencyStatus,
} from "../tools/task-validate.js";

export interface RunnerTask {
  id: string;
  title: string;
  status: string;
  labels: string[];
  priority: string | null;
  type: string | null;
  dependencies: string[];
  description: string;
  acceptanceCriteria: { index: number; text: string; checked: boolean }[];
}

interface RawTask {
  id?: string;
  title?: string;
  status?: string;
  labels?: string[];
  priority?: string | null;
  type?: string | null;
  dependencies?: string[];
  description?: string | null;
  acceptanceCriteria?: { index?: number; text?: string; checked?: boolean }[];
}

/** Parse `backlog task view <id> --json`. Returns null for a missing task. */
export function parseTaskView(json: string): RunnerTask | null {
  try {
    const data = JSON.parse(json) as { task?: RawTask | null };
    const raw = data.task;
    if (!raw) return null;
    const id = raw.id;
    if (!id) return null;
    return {
      id: String(id),
      title: String(raw.title ?? ""),
      status: String(raw.status ?? ""),
      labels: (raw.labels ?? []).map(String),
      priority: raw.priority ?? null,
      type: raw.type ?? null,
      dependencies: (raw.dependencies ?? []).map(String),
      description: String(raw.description ?? ""),
      acceptanceCriteria: (raw.acceptanceCriteria ?? []).map((ac) => ({
        index: Number(ac.index ?? 0),
        text: String(ac.text ?? ""),
        checked: Boolean(ac.checked),
      })),
    };
  } catch {
    return null;
  }
}

export interface EligibilityResult {
  ok: boolean;
  errors: string[];
  warnings: string[];
}

/** The runner starts only on an eligible, already-claimed task. */
export function eligibilityErrors(
  task: RunnerTask,
  dependencies: TaskDependencyStatus[],
  harnessDev: boolean,
): EligibilityResult {
  const gate = claimGate(task as ParsedTask, { harnessDev, dependencies });
  const errors = [...gate.errors];
  if (task.status.trim().toLowerCase() !== "in progress") {
    errors.push(
      `task status is "${task.status}" — claim it (In Progress) before the runner starts`,
    );
  }
  return { ok: errors.length === 0, errors, warnings: gate.warnings };
}

export { detectHarnessDevFromCwd };
