#!/usr/bin/env -S node --import tsx
/**
 * task-flow — one-call queue operations for the conductor.
 *
 * Wraps the backlog CLI so queue mechanics (claim / note / close) stay out of
 * LLM context: the conductor issues one short command, the script does the
 * set-then-verify dance and prints a 1-3 line confirmation.
 *
 * Subcommands:
 *   claim <id> [--assignee @name]   Set In Progress + assignee, re-read, verify.
 *                                   Runs the TASK-51 spec-quality gate first
 *                                   (description, EARS ACs, spec-approved label):
 *                                   refutes the claim with fix guidance on errors.
 *   note  <id> <text>               Append implementation notes.
 *   close <id> [--note t] [--check-ac 1,2] [--status S]  Note + AC + status in one call.
 *
 * Exit codes: 0 ok, 1 claim conflict / verification failed, 2 usage or backlog error.
 * Env: TASK_FLOW_BACKLOG — backlog binary path (default ~/.bun/bin/backlog). Tests only.
 */
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import {
	claimGate,
	detectHarnessDevFromCwd,
	type ParsedTask,
	resolveDependencyStatuses,
} from "./task-validate.ts";

const HELP = `Usage: bun task-flow.ts <subcommand> [args]

Subcommands:
  claim <id> [--assignee @name]                          Claim a task (set-then-verify)
  note  <id> <text>                                      Append implementation notes
  close <id> [--note t] [--check-ac 1,2] [--status S]    Note + AC checks + status in one call

Exit codes: 0 ok, 1 conflict/verification failed, 2 usage or backlog error
Env: TASK_FLOW_BACKLOG — backlog binary path (default ~/.bun/bin/backlog)
Env: TASK_FLOW_BACKLOG_DIR — backlog directory for dependency resolution (default: process.cwd(); tests only)
Env: TASK_FLOW_HARNESS_DEV — force harness-dev context for tests: "1"/"true" true, "0"/"false" false, unset = detect from cwd`;

const BACKLOG = process.env.TASK_FLOW_BACKLOG ?? join(homedir(), ".bun", "bin", "backlog");
const BACKLOG_DIR = process.env.TASK_FLOW_BACKLOG_DIR ?? process.cwd();

/** Harness-dev context for the claim gate: tests-only env override (unset => detect). */
function harnessDevContext(): boolean {
	const v = process.env.TASK_FLOW_HARNESS_DEV;
	if (v === "1" || v === "true") return true;
	if (v === "0" || v === "false") return false;
	return detectHarnessDevFromCwd(process.cwd());
}

function backlog(args: string[]): { ok: boolean; out: string; err: string } {
	const r = spawnSync(BACKLOG, args, { encoding: "utf8", timeout: 30_000 });
	return {
		ok: r.status === 0,
		out: (r.stdout || "").trim(),
		err: (r.stderr || "").trim(),
	};
}

interface TaskView {
	status?: string;
	assignees?: string[];
	acceptanceCriteria?: { index: number; checked?: boolean }[];
	priority?: string;
	dependencies?: string[];
}

function viewTask(id: string): TaskView | null {
	const r = backlog(["task", "view", id, "--json"]);
	if (!r.ok) return null;
	try {
		const data = JSON.parse(r.out) as { task?: TaskView };
		return data.task ?? null;
	} catch {
		return null;
	}
}

function fail2(msg: string): never {
	console.error(`task-flow: ${msg}`);
	process.exit(2);
}

function main() {
	const args = process.argv.slice(2);
	if (args.includes("--help") || args.length === 0) {
		console.log(HELP);
		process.exit(args.length === 0 ? 2 : 0);
	}
	if (!existsSync(BACKLOG)) fail2(`backlog binary not found: ${BACKLOG}`);

	const [cmd, id, ...rest] = args;
	if (!id) fail2(`missing task id — see --help`);

	if (cmd === "claim") {
		const ai = rest.indexOf("--assignee");
		const assignee = ai >= 0 ? rest[ai + 1] : "@conductor";
		if (!assignee) fail2("--assignee requires a value");

		// TASK-51 claim gate: the To Do -> In Progress transition is the hard
		// spec-quality gate. Refuse before the edit lands when errors exist;
		// print warnings (EARS shape on chore/docs/spike, dependency gaps) and
		// proceed. v5 additions: harness-dev context detection, configured
		// priority, dependency (DAG) resolution over the local backlog.
		const pre = viewTask(id);
		if (pre) {
			const gate = claimGate(pre as ParsedTask, {
				harnessDev: harnessDevContext(),
				dependencies: resolveDependencyStatuses(pre.dependencies ?? [], {
					baseDir: BACKLOG_DIR,
				}),
			});
			for (const w of gate.warnings) console.log(`WARN ${id}: ${w}`);
			if (!gate.ok) {
				console.log(`REFUSED ${id}: claim blocked — spec quality gate`);
				for (const e of gate.errors) console.log(`  - ${e}`);
				console.log(
					"Fix the above, then re-claim. If the spec is human-approved, record it with `backlog task edit <id> -l spec-approved`.",
				);
				process.exit(1);
			}
		}

		const editArgs = ["task", "edit", id, "-s", "In Progress", "-a", assignee];
		const w = backlog(editArgs);
		if (!w.ok) fail2(`backlog edit failed: ${w.err || w.out}`);
		const t = viewTask(id);
		const gotAssignees = (t?.assignees ?? []).join(",");
		if (t?.status === "In Progress" && (t?.assignees ?? []).includes(assignee)) {
			console.log(`CLAIMED ${id} (assignee ${assignee})`);
			process.exit(0);
		}
		console.log(
			`CONFLICT ${id}: status=${t?.status ?? "?"} assignee=${gotAssignees || "?"} — claim not held`,
		);
		process.exit(1);
	}

	if (cmd === "note") {
		const text = rest.join(" ");
		if (!text) fail2("note requires text");
		const w = backlog(["task", "edit", id, "--append-notes", text]);
		if (!w.ok) fail2(`backlog edit failed: ${w.err || w.out}`);
		console.log(`NOTED ${id}`);
		process.exit(0);
	}

	if (cmd === "close") {
		const editArgs = ["task", "edit", id];
		let status: string | null = null;
		const acChecks: number[] = [];
		for (let i = 0; i < rest.length; i++) {
			if (rest[i] === "--note") {
				const v = rest[++i];
				if (!v) fail2("--note requires a value");
				editArgs.push("--append-notes", v);
			} else if (rest[i] === "--check-ac") {
				const v = rest[++i];
				if (!v) fail2("--check-ac requires a value");
				for (const n of v.split(",").filter(Boolean)) {
					acChecks.push(Number(n.trim()));
					editArgs.push("--check-ac", n.trim());
				}
			} else if (rest[i] === "--status") {
				status = rest[++i];
				if (!status) fail2("--status requires a value");
				editArgs.push("-s", status);
			} else fail2(`unknown flag: ${rest[i]}`);
		}
		if (editArgs.length === 3) fail2("close requires at least one of --note, --check-ac, --status");
		const w = backlog(editArgs);
		if (!w.ok) fail2(`backlog edit failed: ${w.err || w.out}`);
		if (status || acChecks.length) {
			const t = viewTask(id);
			if (status && t?.status !== status) {
				console.log(`CONFLICT ${id}: status=${t?.status ?? "?"} expected=${status}`);
				process.exit(1);
			}
			if (acChecks.length && t?.acceptanceCriteria) {
				const unchecked = acChecks.filter(
					(n) => !t.acceptanceCriteria?.some((a) => a.index === n && a.checked),
				);
				if (unchecked.length) {
					console.log(`CONFLICT ${id}: AC not checked after edit: ${unchecked.join(",")}`);
					process.exit(1);
				}
			}
		}
		console.log(`CLOSED ${id}${status ? ` -> ${status}` : ""}`);
		process.exit(0);
	}

	fail2(`unknown subcommand: ${cmd} — see --help`);
}

main();
