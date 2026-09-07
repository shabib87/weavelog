import { readFileSync } from "node:fs";

/**
 * risk-signals — deterministic L1 escalation trigger detector (TASK-78,
 * ADR-004 "Reviewer escalation ladder"). The 0.1.0-implementable risk
 * signals are exactly three, computed on the MERGED DIFF AGAINST BASE —
 * never line count, never self-report, never LLM judgment:
 *
 *   1. failing-tests   — the test gate failed (count supplied by the caller)
 *   2. protected-path  — changed paths hit auth/crypto/secrets/
 *                        data-persistence/permission path classes
 *   3. retry-failures  — trailing failed runs of the same command in the
 *                        run ledger (repeated rework cycles)
 *
 * Any signal fires -> reviewer escalation L0 -> L1 with a deterministic
 * reason code, logged so the ladder can be tuned against TASK-47 telemetry.
 */

/** ADR-004 protected path classes; matched case-insensitively per segment. */
export const PROTECTED_PATH_CLASSES = [
  "auth",
  "crypto",
  "secret",
  "persist",
  "permission",
] as const;

export type ProtectedPathClass = (typeof PROTECTED_PATH_CLASSES)[number];

export interface ChangedFile {
  path: string;
  /** First changed line number in the new file (from @@ headers), if known. */
  firstLine?: number | null;
}

export interface RiskSignal {
  code: "failing-tests" | "protected-path" | "retry-failures";
  detail: string;
  evidence?: string;
}

export interface RiskSignalResult {
  signals: RiskSignal[];
  /** True iff at least one risk signal fired (L0 -> L1 escalation). */
  escalate: boolean;
  level: "L0" | "L1";
  /** Deterministic reason code, e.g. "L1:protected-path+retry-failures". */
  reasonCode: string;
}

/** Plain path matching (no AST): any path segment containing the keyword. */
export function matchesProtectedPath(path: string): ProtectedPathClass | null {
  const segments = path.toLowerCase().split("/");
  for (const cls of PROTECTED_PATH_CLASSES) {
    if (segments.some((seg) => seg.includes(cls))) return cls;
  }
  return null;
}

/** First new-file line number from a unified diff's @@ headers. */
export function firstChangedLine(diffText: string): number | null {
  const m = diffText.match(/^@@ -\d+(?:,\d+)? \+(\d+)/m);
  return m ? Number(m[1]) : null;
}

/**
 * Trailing failed runs of `command` in the run ledger (JSONL of
 * {command, exitCode, ...}): retry-failure signal input. Walks backwards
 * from the newest entry and counts consecutive failures up to the last
 * success of the same command.
 */
export function countTrailingFailures(
  ledgerText: string,
  command: string,
): number {
  let count = 0;
  const lines = ledgerText.split("\n");
  for (let i = lines.length - 1; i >= 0; i--) {
    const line = lines[i].trim();
    if (!line) continue;
    let entry: { command?: string; exitCode?: number };
    try {
      entry = JSON.parse(line) as typeof entry;
    } catch {
      continue; // malformed line: skip, never crash the gate
    }
    if (entry.command !== command) continue;
    if (entry.exitCode === 0) break;
    count += 1;
  }
  return count;
}

export interface DetectRiskSignalsInput {
  changedFiles: ChangedFile[];
  /** Failing test count from the test gate (0 or null = no signal). */
  failingTests: number | null;
  /** Retry-failure count from the run ledger (0 or null = no signal). */
  retryFailures: number | null;
  /** ADR-004 ladder: escalate on >=2 consecutive rework failures. */
  retryFailuresThreshold?: number;
}

export function detectRiskSignals(
  input: DetectRiskSignalsInput,
): RiskSignalResult {
  const signals: RiskSignal[] = [];

  if (input.failingTests != null && input.failingTests > 0) {
    signals.push({
      code: "failing-tests",
      detail: `${input.failingTests} failing test(s) in the run`,
    });
  }

  for (const file of input.changedFiles) {
    const cls = matchesProtectedPath(file.path);
    if (cls === null) continue;
    const line = file.firstLine;
    signals.push({
      code: "protected-path",
      detail: `changed path hits the ${cls} class`,
      evidence: line == null ? file.path : `${file.path}:${line}`,
    });
  }

  const threshold = input.retryFailuresThreshold ?? 2;
  if (input.retryFailures != null && input.retryFailures >= threshold) {
    signals.push({
      code: "retry-failures",
      detail: `${input.retryFailures} consecutive failed run(s) in the ledger (threshold ${threshold})`,
    });
  }

  const escalate = signals.length > 0;
  const codes = [...new Set(signals.map((s) => s.code))].sort();
  return {
    signals,
    escalate,
    level: escalate ? "L1" : "L0",
    reasonCode: `L${escalate ? 1 : 0}:${codes.join("+") || "no-risk-signals"}`,
  };
}

/**
 * Read + parse the run ledger for the retry-failure signal. Returns the
 * count, or null when the ledger is absent (caller must fail closed with
 * an explicit skip reason — never a silent pass).
 */
export function readRetryFailures(
  ledgerPath: string,
  command: string,
): number | null {
  let text: string;
  try {
    text = readFileSync(ledgerPath, "utf8");
  } catch {
    return null;
  }
  return countTrailingFailures(text, command);
}
