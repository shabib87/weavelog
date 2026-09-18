/** Bounded controller: ordered stages, evidence checks, no commit/merge. */

import { randomUUID } from "node:crypto";
import type { TaskDependencyStatus } from "../tools/task-validate.js";
import {
  type CommandResult,
  type ExecRunner,
  isRefusalCommand,
  isRefusalText,
  parseReviewVerdict,
} from "./evidence.js";
import {
  appendLedger,
  type LedgerEntry,
  outcomeExitCode,
  type RunOutcome,
  type RunRecord,
  writeRunRecord,
} from "./record.js";
import {
  evaluateStage,
  nextStage,
  type RunEvidence,
  type StageName,
} from "./stages.js";
import {
  type RunStatus,
  type RunStatusSnapshot,
  type RunStatusState,
  runStatusPath,
  type SessionStatusUpdate,
  writeRunStatus,
} from "./status.js";
import { eligibilityErrors, type RunnerTask } from "./task.js";
import type {
  AgentModelIdentity,
  AgentResult,
  AgentSession,
  AgentSessionFactory,
} from "./types.js";
import { createRunRoot } from "./workspace.js";

export interface ControllerDeps {
  exec: ExecRunner;
  sessions: AgentSessionFactory;
  stateDir: string;
  now?: () => Date;
}

export interface ControllerInput {
  task: RunnerTask;
  dependencies: TaskDependencyStatus[];
  worktreePath: string;
  harnessDev?: boolean;
  maxRework?: number;
  commands?: { command: string; args: string[] }[];
  agents?: { implementer: string; reviewer: string };
  /** Cancellation signal; when aborted the controller stops and records it. */
  signal?: AbortSignal;
  /** Per-agent-stage timeout (ms). 0 disables it. */
  stageTimeoutMs?: number;
  /** Per-run id for `.weavelog/runs/<run-id>`; generated when omitted. */
  runId?: string;
  /** Skip the mutating implement stage for an already-complete target diff. */
  implementationReady?: boolean;
}

const DEFAULT_STAGE_TIMEOUT_MS = 1_800_000;

/**
 * Race a stage prompt against cancellation and a timeout. Both paths abort the
 * session and reject, so the controller records the run instead of hanging.
 */
async function promptWithGuards(
  session: AgentSession,
  prompt: { agent: string; text: string },
  input: ControllerInput,
): Promise<AgentResult> {
  const timeoutMs = input.stageTimeoutMs ?? DEFAULT_STAGE_TIMEOUT_MS;
  const signal = input.signal;
  if (!signal && timeoutMs <= 0) return session.prompt(prompt);

  let timer: ReturnType<typeof setTimeout> | undefined;
  let onAbort: (() => void) | undefined;
  const stop = new Promise<never>((_resolve, reject) => {
    if (signal) {
      onAbort = () => {
        session.abort().catch(() => {});
        reject(new Error("cancelled by abort signal"));
      };
      if (signal.aborted) onAbort();
      else signal.addEventListener("abort", onAbort, { once: true });
    }
    if (timeoutMs > 0) {
      timer = setTimeout(() => {
        session.abort().catch(() => {});
        reject(new Error(`timed out after ${timeoutMs}ms`));
      }, timeoutMs);
    }
  });

  try {
    return await Promise.race([session.prompt(prompt), stop]);
  } finally {
    if (timer) clearTimeout(timer);
    if (signal && onAbort) signal.removeEventListener("abort", onAbort);
  }
}

export const DEFAULT_COMMANDS: { command: string; args: string[] }[] = [
  { command: "npm", args: ["test"] },
  { command: "npm", args: ["run", "lint"] },
  { command: "npm", args: ["run", "typecheck"] },
];

export const DEFAULT_AGENTS = {
  implementer: "implementer",
  reviewer: "diff-reviewer-glm",
};

function implementPrompt(task: RunnerTask): string {
  const acs = task.acceptanceCriteria
    .map((ac) => `${ac.index}. ${ac.text}`)
    .join("\n");
  return [
    `You are the implementer for backlog task ${task.id}: ${task.title}.`,
    "",
    `Outcome: ${task.description}`,
    "",
    "Acceptance criteria:",
    acs,
    "",
    "Work only inside this worktree. Do not commit, merge, push, or mark the task Done.",
    "You must not use rtk or other wrappers that write outside the worktree.",
    "Use standard commands and $TMPDIR only for scratch files.",
    "When finished, reply with a short summary. If a hook or permission refuses an",
    "operation, reply with the refusal text and stop.",
  ].join("\n");
}

function reviewPrompt(task: RunnerTask, commands: CommandResult[]): string {
  const commandEvidence = commands
    .map(
      (result) =>
        `${result.command} ${result.args.join(" ")}: exit ${result.exitCode}`,
    )
    .join("\n");
  return [
    `Independently review the current diff for backlog task ${task.id}: ${task.title}.`,
    "You did not write this code. Report only what you can verify from the diff and",
    "the recorded command results below.",
    "",
    "Verified command evidence:",
    commandEvidence,
    "",
    "Do not rerun commands or create scratch or temporary files.",
    "Use read-only inspection of the current diff and source files.",
    "Output a final line starting with",
    '"VERDICT:" followed by APPROVE, APPROVE-WITH-FIXES, or REJECT.',
    "Do not modify files.",
    "You must not use rtk or other wrappers that write outside the worktree.",
  ].join("\n");
}

interface ImplementRun {
  evidence: { agentCompleted: boolean; refused: boolean; error?: string };
  identity: AgentModelIdentity;
  text: string;
}

async function runImplement(
  deps: ControllerDeps,
  input: ControllerInput,
  agent: string,
  tmpDir: string,
  onStatus: (update: SessionStatusUpdate) => void,
): Promise<ImplementRun> {
  let session: AgentSession | undefined;
  try {
    session = await deps.sessions.start({
      cwd: input.worktreePath,
      title: `runner ${input.task.id} implement`,
      tmpDir,
      onStatus,
    });
    const result: AgentResult = await promptWithGuards(
      session,
      { agent, text: implementPrompt(input.task) },
      input,
    );
    const refused =
      isRefusalText(result.text) ||
      (result.error ? isRefusalText(result.error.message) : false);
    const agentCompleted = !result.error && !refused;
    return {
      evidence: {
        agentCompleted,
        refused,
        error: result.error?.message ?? (refused ? result.text : undefined),
      },
      identity: result.identity,
      text: result.text,
    };
  } catch (error) {
    return {
      evidence: {
        agentCompleted: false,
        refused: false,
        error: (error as Error).message,
      },
      identity: { agent },
      text: "",
    };
  } finally {
    await session?.close().catch(() => {});
  }
}

interface ReviewRun {
  evidence: {
    verdict: ReturnType<typeof parseReviewVerdict>;
    text: string;
    identity: AgentModelIdentity;
  };
  identity: AgentModelIdentity;
  text: string;
}

async function runReview(
  deps: ControllerDeps,
  input: ControllerInput,
  agent: string,
  tmpDir: string,
  commands: CommandResult[],
  onStatus: (update: SessionStatusUpdate) => void,
): Promise<ReviewRun> {
  let session: AgentSession | undefined;
  try {
    session = await deps.sessions.start({
      cwd: input.worktreePath,
      title: `runner ${input.task.id} review`,
      tmpDir,
      onStatus,
    });
    const result: AgentResult = await promptWithGuards(
      session,
      { agent, text: reviewPrompt(input.task, commands) },
      input,
    );
    return {
      evidence: {
        verdict: parseReviewVerdict(result.text),
        text: result.text,
        identity: result.identity,
      },
      identity: result.identity,
      text: result.text,
    };
  } catch (error) {
    const identity: AgentModelIdentity = { agent };
    return {
      evidence: { verdict: "UNKNOWN", text: "", identity },
      identity,
      text: `reviewer error: ${(error as Error).message}`,
    };
  } finally {
    await session?.close().catch(() => {});
  }
}

/** Terminal run outcome as a persisted status state. */
function terminalStatusState(outcome: RunOutcome): RunStatusState {
  if (outcome === "refused") return "refused";
  if (outcome === "awaiting-human") return "awaiting-human";
  return "failed";
}

function runVerify(
  deps: ControllerDeps,
  input: ControllerInput,
  commands: { command: string; args: string[] }[],
): { commands: CommandResult[]; refusal?: string } {
  const results = commands.map((c) =>
    deps.exec.run(c.command, c.args, { cwd: input.worktreePath }),
  );
  const refused = results.find(isRefusalCommand);
  return {
    commands: results,
    refusal: refused
      ? `verify refused: ${refused.stderr || refused.stdout}`
      : undefined,
  };
}

/**
 * Run one bounded task through implement -> verify -> review -> human-gate.
 * TypeScript checks each stage's evidence; a missing or failed check refuses.
 * The controller never commits, merges, publishes, or marks work Done.
 */
export async function runController(
  deps: ControllerDeps,
  input: ControllerInput,
): Promise<RunRecord> {
  const now = deps.now ?? (() => new Date());
  const startedAt = now().toISOString();
  const task = input.task;
  const commands = input.commands ?? DEFAULT_COMMANDS;
  const agents = input.agents ?? DEFAULT_AGENTS;
  const maxRework = input.implementationReady ? 0 : (input.maxRework ?? 1);
  const runId = input.runId ?? randomUUID();

  let statusPath: string | undefined;
  try {
    statusPath = runStatusPath(input.worktreePath, runId);
  } catch {
    statusPath = undefined;
  }
  let statusPersisted = false;
  const statusHistory: RunStatusSnapshot[] = [];
  let finalStatus: RunStatus | undefined;
  /**
   * Capture the run status transition, then best-effort persist it. A write
   * failure (for example when the run temp dir cannot be created) must never
   * mask the controller outcome; the captured history still reaches the durable
   * run record.
   */
  const writeStatus = (
    state: RunStatusState,
    at: StageName,
    extra: { attempt?: number; message?: string } = {},
  ): void => {
    const snapshot: RunStatus = {
      taskId: task.id,
      runId,
      stage: at,
      state,
      attempt: extra.attempt,
      message: extra.message,
      startedAt,
      updatedAt: now().toISOString(),
    };
    statusHistory.push({ ...snapshot, at: snapshot.updatedAt });
    finalStatus = snapshot;
    if (!statusPath) return;
    try {
      writeRunStatus(statusPath, snapshot);
      statusPersisted = true;
    } catch {
      // Status is advisory; the run record remains the source of truth.
    }
  };
  const stageStatus =
    (at: StageName) =>
    (update: SessionStatusUpdate): void =>
      writeStatus(update.state, at, {
        attempt: update.attempt,
        message: update.message,
      });

  const reasons: string[] = [];
  const identities: AgentModelIdentity[] = [];
  const allCommands: CommandResult[] = [];
  const agentOutputs: { stage: StageName; text: string }[] = [];
  const evidence: RunEvidence = {};
  let rework = 0;
  let stage: StageName = input.implementationReady ? "verify" : "implement";
  let outcome: RunOutcome = "failed";
  let tmpDir = "";

  const eligibility = eligibilityErrors(
    task,
    input.dependencies,
    input.harnessDev ?? false,
  );
  try {
    tmpDir = createRunRoot(input.worktreePath, runId).tmp;
    if (!eligibility.ok) {
      reasons.push(...eligibility.errors);
      outcome = "refused";
    } else {
      while (true) {
        if (input.signal?.aborted) {
          reasons.push("cancelled: abort signal received");
          outcome = "failed";
          break;
        }

        if (stage === "human-gate") {
          reasons.push(
            "awaiting human merge approval — controller stopped at the merge gate",
          );
          outcome = "awaiting-human";
          break;
        }

        if (stage === "implement") {
          const run = await runImplement(
            deps,
            input,
            agents.implementer,
            tmpDir,
            stageStatus("implement"),
          );
          evidence.implement = run.evidence;
          identities.push(run.identity);
          agentOutputs.push({ stage: "implement", text: run.text });
          if (run.evidence.refused) {
            reasons.push(
              `implement refused: ${run.evidence.error ?? "refusal"}`,
            );
            outcome = "refused";
            break;
          }
        } else if (stage === "verify") {
          const run = runVerify(deps, input, commands);
          evidence.verify = { commands: run.commands };
          allCommands.push(...run.commands);
          if (run.refusal) {
            reasons.push(run.refusal);
            outcome = "refused";
            break;
          }
        } else if (stage === "review") {
          const run = await runReview(
            deps,
            input,
            agents.reviewer,
            tmpDir,
            allCommands,
            stageStatus("review"),
          );
          evidence.review = run.evidence;
          identities.push(run.identity);
          agentOutputs.push({ stage: "review", text: run.text });
        }

        const check = evaluateStage(stage, evidence);
        if (check.ok) {
          const advanced = nextStage(stage);
          stage = advanced ?? "human-gate";
          continue;
        }

        reasons.push(check.reason);
        if (stage === "implement") {
          outcome = "failed";
          break;
        }
        if (rework < maxRework) {
          rework += 1;
          stage = "implement";
          continue;
        }
        outcome = "failed";
        break;
      }
    }
  } catch (error) {
    reasons.push(`controller error: ${(error as Error).message}`);
    outcome = "failed";
  }

  writeStatus(terminalStatusState(outcome), stage);

  const endedAt = now().toISOString();
  const record: RunRecord = {
    taskId: task.id,
    title: task.title,
    worktreePath: input.worktreePath,
    outcome,
    finalStage: stage,
    rework,
    reasons,
    identities,
    commands: allCommands,
    agentOutputs,
    startedAt,
    endedAt,
    statusPath: statusPersisted ? statusPath : undefined,
    statusHistory,
    finalStatus,
  };
  writeRunRecord(deps.stateDir, record);

  const ledger: LedgerEntry = {
    ts: endedAt,
    command: "runner",
    args: [task.id],
    filesTouched: [],
    decisions: [outcome, stage],
    errors: reasons,
    exitCode: outcomeExitCode(outcome),
  };
  appendLedger(deps.stateDir, ledger);

  return record;
}
