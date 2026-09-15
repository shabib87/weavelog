/** Ordered stage machine. TypeScript — not a prompt — decides advancement. */

import type { CommandResult, ReviewVerdict } from "./evidence.js";
import type { AgentModelIdentity } from "./types.js";

export type StageName = "implement" | "verify" | "review" | "human-gate";

export const STAGE_ORDER: readonly StageName[] = [
  "implement",
  "verify",
  "review",
  "human-gate",
];

export function nextStage(stage: StageName): StageName | null {
  const index = STAGE_ORDER.indexOf(stage);
  if (index < 0 || index >= STAGE_ORDER.length - 1) return null;
  return STAGE_ORDER[index + 1];
}

export interface ImplementEvidence {
  agentCompleted: boolean;
  refused: boolean;
  error?: string;
}

export interface VerifyEvidence {
  commands: CommandResult[];
}

export interface ReviewEvidence {
  verdict: ReviewVerdict;
  text: string;
  identity: AgentModelIdentity;
}

export interface RunEvidence {
  implement?: ImplementEvidence;
  verify?: VerifyEvidence;
  review?: ReviewEvidence;
}

export interface StageCheck {
  ok: boolean;
  reason: string;
}

/** Required-evidence check for one stage. A missing or failed check refuses. */
export function evaluateStage(
  stage: StageName,
  evidence: RunEvidence,
): StageCheck {
  if (stage === "implement") {
    const e = evidence.implement;
    if (!e) return { ok: false, reason: "implement evidence missing" };
    if (e.refused) {
      return {
        ok: false,
        reason: `implement refused: ${e.error ?? "refusal"}`,
      };
    }
    if (e.error) return { ok: false, reason: `implement error: ${e.error}` };
    if (!e.agentCompleted) {
      return { ok: false, reason: "implement agent did not complete" };
    }
    return { ok: true, reason: "implement complete" };
  }

  if (stage === "verify") {
    const e = evidence.verify;
    if (!e || e.commands.length === 0) {
      return { ok: false, reason: "verify evidence missing" };
    }
    const failed = e.commands.find((c) => c.exitCode !== 0);
    if (failed) {
      return {
        ok: false,
        reason: `verify failed: ${failed.command} ${failed.args.join(" ")} exit ${failed.exitCode}`,
      };
    }
    return { ok: true, reason: "verify passed" };
  }

  if (stage === "review") {
    const e = evidence.review;
    if (!e) return { ok: false, reason: "review evidence missing" };
    if (e.verdict !== "APPROVE") {
      return {
        ok: false,
        reason: `review verdict: ${e.verdict} (APPROVE required)`,
      };
    }
    return { ok: true, reason: "review approved" };
  }

  return {
    ok: false,
    reason: "human approval required — controller stops at the merge gate",
  };
}
