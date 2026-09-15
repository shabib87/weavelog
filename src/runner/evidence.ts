/** Deterministic evidence: command execution and reviewer-verdict parsing. */

export interface CommandResult {
  command: string;
  args: string[];
  exitCode: number;
  stdout: string;
  stderr: string;
}

/** Injectable command runner. The controller passes the worktree as `cwd`. */
export interface ExecRunner {
  run(
    command: string,
    args: string[],
    options?: { cwd?: string },
  ): CommandResult;
}

export type ReviewVerdict =
  | "APPROVE"
  | "APPROVE-WITH-FIXES"
  | "REJECT"
  | "UNKNOWN";

const VERDICT_RE = /VERDICT:\s*(APPROVE-WITH-FIXES|APPROVE|REJECT)/gi;

/** Parse the reviewer's FINAL verdict line. Missing => UNKNOWN (never advances). */
export function parseReviewVerdict(text: string): ReviewVerdict {
  const matches = [...(text ?? "").matchAll(VERDICT_RE)];
  if (matches.length === 0) return "UNKNOWN";
  return matches[matches.length - 1][1].toUpperCase() as ReviewVerdict;
}

const REFUSAL_RE =
  /(\bBlocked:|STATUS:\s*BLOCKED|permission denied|not permitted|hook refused|gate-refusal)/i;

/** True when text carries a hook or permission refusal. */
export function isRefusalText(text: string): boolean {
  return REFUSAL_RE.test(text ?? "");
}

/** True when a command FAILED and was stopped by a gate (not a generic failure). */
export function isRefusalCommand(result: CommandResult): boolean {
  if (result.exitCode === 0) return false;
  return isRefusalText(result.stderr) || isRefusalText(result.stdout);
}
