/** Run record + ledger persistence. The controller never marks work Done. */

import { appendFileSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { CommandResult } from "./evidence.js";
import type { StageName } from "./stages.js";
import type { RunStatus, RunStatusSnapshot } from "./status.js";
import type { AgentModelIdentity } from "./types.js";

export type RunOutcome = "succeeded" | "failed" | "refused" | "awaiting-human";

export interface RunRecord {
  taskId: string;
  title: string;
  worktreePath: string;
  outcome: RunOutcome;
  finalStage: StageName;
  rework: number;
  reasons: string[];
  identities: AgentModelIdentity[];
  commands: CommandResult[];
  agentOutputs: { stage: StageName; text: string }[];
  startedAt: string;
  endedAt: string;
  recordPath?: string;
  /** Worktree-local `.weavelog/runs/<run-id>/status.json` for this run. */
  statusPath?: string;
  /** Every status transition captured during the run, oldest first. */
  statusHistory?: RunStatusSnapshot[];
  /** Terminal status snapshot for the run. */
  finalStatus?: RunStatus;
}

export interface LedgerEntry {
  ts: string;
  command: "runner";
  args: string[];
  filesTouched: string[];
  decisions: string[];
  errors: string[];
  exitCode: number;
}

function ensureDir(dir: string): void {
  mkdirSync(dir, { recursive: true });
}

/** Write the run record under `<stateDir>/runs/` and return its path. */
export function writeRunRecord(stateDir: string, record: RunRecord): string {
  const dir = join(stateDir, "runs");
  ensureDir(dir);
  const stamp = record.endedAt.replace(/[:.]/g, "-");
  record.recordPath = join(dir, `${record.taskId}-${stamp}.json`);
  writeFileSync(record.recordPath, `${JSON.stringify(record, null, 2)}\n`);
  return record.recordPath;
}

/** Append one line to the shared ledger (same schema as the CLI ledger). */
export function appendLedger(stateDir: string, entry: LedgerEntry): string {
  ensureDir(stateDir);
  const path = join(stateDir, "ledger.jsonl");
  appendFileSync(path, `${JSON.stringify(entry)}\n`);
  return path;
}

/** Process exit code for a terminal outcome (0 only for verified success/gate). */
export function outcomeExitCode(outcome: RunOutcome): number {
  return outcome === "awaiting-human" || outcome === "succeeded" ? 0 : 1;
}
