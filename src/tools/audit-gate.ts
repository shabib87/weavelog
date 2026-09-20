import { existsSync, readFileSync } from "node:fs";
import { basename } from "node:path";
import { fileURLToPath } from "node:url";

/**
 * Audit gate (TASK-63 AC#4): deterministic boundary over `npm audit
 * --omit=dev --json`. Fails when a production advisory is high or critical
 * and is not covered by a committed exception that carries both a rationale
 * and a future expiry date. Exceptions live in `.github/audit-exceptions.json`.
 */

export interface AuditVulnerability {
  name: string;
  severity: string;
  via?: unknown;
}

export interface NpmAuditReport {
  vulnerabilities?: Record<string, AuditVulnerability>;
}

export interface AuditException {
  package: string;
  rationale?: string;
  expires?: string;
}

export type AuditFailureReason =
  | "untriaged"
  | "missing-rationale"
  | "invalid-expiry"
  | "expired";

export interface AuditFailure {
  package: string;
  severity: string;
  reason: AuditFailureReason;
}

export interface AuditGateResult {
  ok: boolean;
  examined: number;
  covered: string[];
  failures: AuditFailure[];
  detail: string;
}

const BLOCKING_SEVERITIES = new Set(["high", "critical"]);
const ISO_DAY = /^\d{4}-\d{2}-\d{2}$/;

export function parseAuditReport(text: string): NpmAuditReport {
  const parsed: unknown = JSON.parse(text);
  if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("audit report is not a JSON object");
  }
  const obj = parsed as Record<string, unknown>;
  if (obj.error) {
    throw new Error(
      `npm audit reported an error: ${JSON.stringify(obj.error)}`,
    );
  }
  if (
    obj.vulnerabilities === undefined ||
    obj.vulnerabilities === null ||
    typeof obj.vulnerabilities !== "object" ||
    Array.isArray(obj.vulnerabilities)
  ) {
    throw new Error("audit report has no vulnerabilities object");
  }
  return parsed as NpmAuditReport;
}

export function parseExceptions(text: string): AuditException[] {
  const parsed: unknown = JSON.parse(text);
  if (!Array.isArray(parsed)) {
    throw new Error("audit exceptions must be a JSON array");
  }
  return parsed as AuditException[];
}

function isoDay(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function evaluateAuditGate(
  report: NpmAuditReport,
  exceptions: AuditException[],
  now: Date,
): AuditGateResult {
  const seen = new Map<string, AuditException>();
  for (const ex of exceptions) {
    if (ex && typeof ex.package === "string") {
      seen.set(ex.package.toLowerCase(), ex);
    }
  }
  const nowDay = isoDay(now);
  const failures: AuditFailure[] = [];
  const covered: string[] = [];
  let examined = 0;

  for (const vuln of Object.values(report.vulnerabilities ?? {})) {
    const severity = String(vuln.severity ?? "").toLowerCase();
    if (!BLOCKING_SEVERITIES.has(severity)) continue;
    examined++;
    const name = String(vuln.name ?? "");
    const ex = seen.get(name.toLowerCase());
    if (!ex) {
      failures.push({ package: name, severity, reason: "untriaged" });
      continue;
    }
    if (!ex.rationale || ex.rationale.trim() === "") {
      failures.push({ package: name, severity, reason: "missing-rationale" });
      continue;
    }
    if (!ex.expires || !ISO_DAY.test(ex.expires)) {
      failures.push({ package: name, severity, reason: "invalid-expiry" });
      continue;
    }
    if (ex.expires <= nowDay) {
      failures.push({ package: name, severity, reason: "expired" });
      continue;
    }
    covered.push(name);
  }

  const ok = failures.length === 0;
  const detail = ok
    ? `audit-gate: ${examined} high/critical production advisories, all triaged`
    : `audit-gate: ${failures.length} blocking advisory/exception(s): ${failures
        .map((f) => `${f.package} (${f.severity}/${f.reason})`)
        .join(", ")}`;
  return { ok, examined, covered, failures, detail };
}

export function auditGateForFiles(
  reportPath: string,
  exceptionsPath: string,
  now: Date,
): AuditGateResult {
  let report: NpmAuditReport;
  try {
    if (!existsSync(reportPath)) {
      throw new Error(`audit report not found: ${reportPath}`);
    }
    report = parseAuditReport(readFileSync(reportPath, "utf8"));
  } catch (err) {
    return {
      ok: false,
      examined: 0,
      covered: [],
      failures: [],
      detail: `audit-gate: cannot read report (${(err as Error).message})`,
    };
  }
  let exceptions: AuditException[] = [];
  try {
    if (existsSync(exceptionsPath)) {
      exceptions = parseExceptions(readFileSync(exceptionsPath, "utf8"));
    }
  } catch (err) {
    return {
      ok: false,
      examined: 0,
      covered: [],
      failures: [],
      detail: `audit-gate: cannot read exceptions (${(err as Error).message})`,
    };
  }
  return evaluateAuditGate(report, exceptions, now);
}

function main(): void {
  const [reportPath, exceptionsPath = ".github/audit-exceptions.json"] =
    process.argv.slice(2);
  if (!reportPath) {
    console.error(
      "audit-gate: usage: node --import tsx src/tools/audit-gate.ts <audit.json> [exceptions.json]",
    );
    process.exit(2);
  }
  const result = auditGateForFiles(reportPath, exceptionsPath, new Date());
  console.log(result.detail);
  process.exit(result.ok ? 0 : 1);
}

if (
  process.argv[1] &&
  basename(fileURLToPath(import.meta.url)) === basename(process.argv[1])
) {
  main();
}
