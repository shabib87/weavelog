import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, test } from "node:test";
import {
	acMutationCheck,
	claimGate,
	countAcceptanceCriteria,
	createGateCheck,
	earsShapeOk,
	isPlaceholderDescription,
	isSpecApproved,
	parseTaskCreateArgs,
	parseTaskFile,
	preCommitCheck,
	resolveDependencyStatuses,
} from "../src/task-validate.ts";

const SPEC_APPROVED = ["spec-approved"];

function task(overrides: Record<string, unknown> = {}) {
	return {
		description: "Do the thing with proper spec text and rationale.",
		acceptanceCriteria: [
			{ text: "WHEN the validator runs THEN it returns ok" },
			{ text: "IF a task is empty THEN the claim gate refuses" },
		],
		type: "task",
		labels: SPEC_APPROVED,
		priority: "high",
		dependencies: [],
		...overrides,
	};
}

describe("claimGate label vocabulary (AC #11)", () => {
	test("unknown label -> error naming the label and the closed vocabulary", () => {
		const r = claimGate(task({ labels: ["spec-approved", "bogus"] }) as never);
		assert.equal(r.ok, false);
		assert.match(r.errors.join("\n"), /bogus/);
		assert.match(r.errors.join("\n"), /vocabulary/i);
	});

	test("pre-migration labels (v1/v2/immediate/bugfix) are unknown -> refuse", () => {
		for (const label of ["v1", "v2", "immediate", "bugfix"]) {
			const r = claimGate(task({ labels: ["spec-approved", label] }) as never);
			assert.equal(r.ok, false);
			assert.match(r.errors.join("\n"), new RegExp(label));
		}
	});

	test("all reserved labels are accepted (machinery may set them)", () => {
		const r = claimGate(
			task({
				labels: ["spec-approved", "dispatched", "stuck", "merged", "housekeeping", "wayfinder:map"],
			}) as never,
		);
		assert.equal(r.ok, true);
		assert.equal(r.errors.length, 0);
	});

	test("label matching is case-insensitive (Spec-Approved passes; Harness refuses without context)", () => {
		assert.equal(claimGate(task({ labels: ["Spec-Approved"] }) as never).ok, true);
		const r = claimGate(task({ labels: ["Spec-Approved", "Harness"] }) as never);
		assert.equal(r.ok, false);
	});
});

describe("claimGate harness-dev context (AC #17)", () => {
	test("harness label without harness-dev context -> error", () => {
		const r = claimGate(task({ labels: ["spec-approved", "harness"] }) as never);
		assert.equal(r.ok, false);
		assert.match(r.errors.join("\n"), /harness/);
		assert.match(r.errors.join("\n"), /harness-dev/i);
	});

	test("dogfood label without harness-dev context -> error", () => {
		const r = claimGate(task({ labels: ["spec-approved", "dogfood"] }) as never);
		assert.equal(r.ok, false);
		assert.match(r.errors.join("\n"), /dogfood/);
	});

	test("harness/dogfood labels pass when harnessDev is true", () => {
		const r = claimGate(task({ labels: ["spec-approved", "harness", "dogfood"] }) as never, {
			harnessDev: true,
		});
		assert.equal(r.ok, true);
		assert.equal(r.errors.length, 0);
	});

	test("generic label (deferred) passes without harness-dev context", () => {
		const r = claimGate(task({ labels: ["spec-approved", "deferred"] }) as never);
		assert.equal(r.ok, true);
	});
});

describe("claimGate priority check (AC #14)", () => {
	test("missing priority -> error", () => {
		const r = claimGate(task({ priority: null }) as never);
		assert.equal(r.ok, false);
		assert.match(r.errors.join("\n"), /priority/i);
	});

	test("priority outside the configured set (High/Medium/Low) -> error", () => {
		const r = claimGate(task({ priority: "Urgent" }) as never);
		assert.equal(r.ok, false);
		assert.match(r.errors.join("\n"), /priority/i);
	});

	test("priority matching is case-insensitive (frontmatter 'high' vs CLI 'High')", () => {
		assert.equal(claimGate(task({ priority: "High" }) as never).ok, true);
		assert.equal(claimGate(task({ priority: "MEDIUM" }) as never).ok, true);
		assert.equal(claimGate(task({ priority: "low" }) as never).ok, true);
	});
});

describe("claimGate DAG check (AC #13)", () => {
	const deps = (list: unknown[]) => list as never[];

	test("dependency not Done -> claim refuses", () => {
		const r = claimGate(
			task({
				dependencies: ["TASK-2"],
			}) as never,
			{
				dependencies: deps([{ id: "TASK-2", found: true, status: "To Do", crossBranch: false }]),
			},
		);
		assert.equal(r.ok, false);
		assert.match(r.errors.join("\n"), /TASK-2/);
		assert.match(r.errors.join("\n"), /Done/i);
	});

	test("all dependencies Done -> satisfied, claim proceeds", () => {
		const r = claimGate(
			task({
				dependencies: ["TASK-2", "TASK-3"],
			}) as never,
			{
				dependencies: deps([
					{ id: "TASK-2", found: true, status: "Done", crossBranch: false },
					{ id: "TASK-3", found: true, status: "DONE", crossBranch: false },
				]),
			},
		);
		assert.equal(r.ok, true);
		assert.equal(r.errors.length, 0);
		assert.equal(r.warnings.length, 0);
	});

	test("missing dependency target -> warning, claim still proceeds", () => {
		const r = claimGate(
			task({
				dependencies: ["TASK-99"],
			}) as never,
			{
				dependencies: deps([{ id: "TASK-99", found: false, status: null, crossBranch: true }]),
			},
		);
		assert.equal(r.ok, true);
		assert.match(r.warnings.join("\n"), /TASK-99/);
		assert.match(r.warnings.join("\n"), /not found/i);
	});

	test("cross-branch / unreadable dependency -> declared unverified warning", () => {
		const r = claimGate(
			task({
				dependencies: ["TASK-50"],
			}) as never,
			{
				dependencies: deps([{ id: "TASK-50", found: true, status: null, crossBranch: true }]),
			},
		);
		assert.equal(r.ok, true);
		assert.match(r.warnings.join("\n"), /unverified/i);
	});

	test("no dependency resolution provided -> DAG checks skipped (backward compat)", () => {
		const r = claimGate(
			task({
				dependencies: ["TASK-2"],
			}) as never,
		);
		assert.equal(r.ok, true);
	});
});

describe("resolveDependencyStatuses (AC #13: Done deps read from tasks/completed/archive)", () => {
	function makeFixture(): string {
		const root = mkdtempSync(join(tmpdir(), "task-validate-deps-"));
		mkdirSync(join(root, "backlog", "tasks"), { recursive: true });
		mkdirSync(join(root, "backlog", "completed"), { recursive: true });
		mkdirSync(join(root, "backlog", "archive"), { recursive: true });
		writeFileSync(
			join(root, "backlog", "tasks", "task-2 - todo-thing.md"),
			"---\nid: TASK-2\nstatus: To Do\n---\n",
		);
		writeFileSync(
			join(root, "backlog", "completed", "task-3 - done-thing.md"),
			"---\nid: TASK-3\nstatus: Done\n---\n",
		);
		writeFileSync(
			join(root, "backlog", "archive", "task-4 - archived.md"),
			"---\nid: TASK-4\nstatus: Done\n---\n",
		);
		return root;
	}

	test("task in backlog/tasks with status To Do -> found with readable status", () => {
		const root = makeFixture();
		try {
			const [dep] = resolveDependencyStatuses(["TASK-2"], { baseDir: root });
			assert.equal(dep.found, true);
			assert.equal(dep.status, "To Do");
			assert.equal(dep.crossBranch, false);
		} finally {
			rmSync(root, { recursive: true, force: true });
		}
	});

	test("Done dep read from backlog/completed counts as satisfied", () => {
		const root = makeFixture();
		try {
			const [dep] = resolveDependencyStatuses(["TASK-3"], { baseDir: root });
			assert.equal(dep.found, true);
			assert.equal(dep.status, "Done");
		} finally {
			rmSync(root, { recursive: true, force: true });
		}
	});

	test("Done dep read from backlog/archive counts as satisfied", () => {
		const root = makeFixture();
		try {
			const [dep] = resolveDependencyStatuses(["TASK-4"], { baseDir: root });
			assert.equal(dep.found, true);
			assert.equal(dep.status, "Done");
		} finally {
			rmSync(root, { recursive: true, force: true });
		}
	});

	test("unknown id -> found false, declared cross-branch/unverified", () => {
		const root = makeFixture();
		try {
			const [dep] = resolveDependencyStatuses(["TASK-99"], { baseDir: root });
			assert.equal(dep.found, false);
			assert.equal(dep.status, null);
			assert.equal(dep.crossBranch, true);
		} finally {
			rmSync(root, { recursive: true, force: true });
		}
	});

	test("empty deps -> empty result", () => {
		const root = makeFixture();
		try {
			assert.deepEqual(resolveDependencyStatuses([], { baseDir: root }), []);
		} finally {
			rmSync(root, { recursive: true, force: true });
		}
	});
});

describe("claimGate", () => {
	test("happy path: description + EARS ACs + spec-approved label -> ok", () => {
		const r = claimGate(task() as never);
		assert.equal(r.ok, true);
		assert.equal(r.errors.length, 0);
		assert.equal(r.warnings.length, 0);
	});

	test("WHILE-anchored ACs are EARS-valid", () => {
		const r = claimGate(
			task({
				acceptanceCriteria: [{ text: "WHILE the process runs THEN it stays responsive" }],
			}) as never,
		);
		assert.equal(r.ok, true);
		assert.equal(r.errors.length, 0);
	});

	test("empty description -> error naming the fix", () => {
		const r = claimGate(task({ description: "   " }) as never);
		assert.equal(r.ok, false);
		assert.match(r.errors.join("\n"), /description/);
	});

	test("placeholder description 'No description provided' -> error", () => {
		const r = claimGate(task({ description: "No description provided" }) as never);
		assert.equal(r.ok, false);
		assert.match(r.errors.join("\n"), /placeholder/i);
	});

	test("placeholder description '(created by --create mode ...)' -> error", () => {
		const r = claimGate(
			task({
				description: "(created by --create mode — fill in during execution)",
			}) as never,
		);
		assert.equal(r.ok, false);
		assert.match(r.errors.join("\n"), /placeholder/i);
	});

	test("zero acceptance criteria -> error", () => {
		const r = claimGate(task({ acceptanceCriteria: [] }) as never);
		assert.equal(r.ok, false);
		assert.match(r.errors.join("\n"), /acceptance criteria/i);
	});

	test("EARS-invalid AC on a regular task -> error", () => {
		const r = claimGate(
			task({
				acceptanceCriteria: [{ text: "The system must be fast" }],
			}) as never,
		);
		assert.equal(r.ok, false);
		assert.match(r.errors.join("\n"), /EARS/);
	});

	test("EARS-invalid AC on chore/docs/spike -> warning, claim still ok", () => {
		for (const type of ["chore", "docs", "spike"]) {
			const r = claimGate(
				task({
					type,
					acceptanceCriteria: [{ text: "The docs must be updated" }],
				}) as never,
			);
			assert.equal(r.ok, true);
			assert.equal(r.errors.length, 0);
			assert.match(r.warnings.join("\n"), /EARS/);
		}
	});

	test("AC not anchored at the start ('do X then Y') does NOT match EARS", () => {
		assert.equal(earsShapeOk("do X then Y"), false);
		const r = claimGate(task({ acceptanceCriteria: [{ text: "do X then Y" }] }) as never);
		assert.equal(r.ok, false);
		assert.match(r.errors.join("\n"), /EARS/);
	});

	test("lowercase keyword is NOT EARS-valid (case-sensitive anchor)", () => {
		assert.equal(earsShapeOk("when X happens then Y"), false);
	});

	test("multi-line AC: keyword on line 1, THEN on a later line -> valid", () => {
		assert.equal(earsShapeOk("WHEN the harness runs\nand the sun is up\nTHEN it returns"), true);
	});

	test("missing spec-approved label -> error (HITL marker)", () => {
		const r = claimGate(task({ labels: ["v1"] }) as never);
		assert.equal(r.ok, false);
		assert.match(r.errors.join("\n"), /spec-approved/);
	});

	test("spec-approved matching is case-insensitive", () => {
		assert.equal(isSpecApproved(["Spec-Approved"]), true);
		assert.equal(isSpecApproved(null), false);
	});

	test("missing type/labels/description fields are tolerated (undefined -> violations)", () => {
		const r = claimGate({
			description: undefined,
			acceptanceCriteria: undefined,
			labels: undefined,
		} as never);
		assert.equal(r.ok, false);
		assert.ok(r.errors.length >= 2); // desc + ACs + label
	});

	test("placeholder detection is exact for the two known placeholder shapes", () => {
		assert.equal(isPlaceholderDescription("No description provided"), true);
		assert.equal(isPlaceholderDescription("  No description provided  "), true);
		assert.equal(
			isPlaceholderDescription("(created by --create mode — fill in during execution)"),
			true,
		);
		assert.equal(isPlaceholderDescription("real spec text"), false);
	});
});

describe("parseTaskCreateArgs", () => {
	test("--ac 'text with spaces' (single-quoted) counts as 1 AC", () => {
		const r = parseTaskCreateArgs(`backlog task create "Do the thing" --ac 'WHEN x THEN y'`);
		assert.equal(r.acCount, 1);
	});

	test("--ac=short form counts as 1 AC", () => {
		const r = parseTaskCreateArgs(`backlog task create Thing --ac=WHEN x THEN y`);
		assert.equal(r.acCount, 1);
	});

	test("multiple --ac flags each count", () => {
		const r = parseTaskCreateArgs(
			`backlog task create Thing -d "desc" --ac 'WHEN a THEN b' --ac "IF c THEN d"`,
		);
		assert.equal(r.acCount, 2);
		assert.equal(r.hasDescription, true);
	});

	test("-d with a single-quoted description detected", () => {
		const r = parseTaskCreateArgs(`backlog task create Thing -d 'the what and the why'`);
		assert.equal(r.hasDescription, true);
	});

	test("--description=value form detected", () => {
		const r = parseTaskCreateArgs(`backlog task create Thing --description=the spec`);
		assert.equal(r.hasDescription, true);
	});

	test("missing description -> hasDescription false", () => {
		const r = parseTaskCreateArgs(`backlog task create Thing --ac "WHEN x THEN y"`);
		assert.equal(r.hasDescription, false);
	});

	test("--no-dod-defaults detected", () => {
		const r = parseTaskCreateArgs(
			`backlog task create Thing -d d --ac "WHEN x THEN y" --no-dod-defaults`,
		);
		assert.equal(r.hasNoDodDefaults, true);
	});

	test("--no-dod-defaults absent -> false", () => {
		const r = parseTaskCreateArgs(`backlog task create Thing -d d`);
		assert.equal(r.hasNoDodDefaults, false);
	});

	test("pre-tokenized argv array input works as-is", () => {
		const r = parseTaskCreateArgs([
			"backlog",
			"task",
			"create",
			"Thing",
			"-d",
			"spec",
			"--ac",
			"WHEN x THEN y",
			"--no-dod-defaults",
		]);
		assert.equal(r.hasDescription, true);
		assert.equal(r.acCount, 1);
		assert.equal(r.hasNoDodDefaults, true);
	});

	test("flag with a missing/next-flag value is not counted", () => {
		const r = parseTaskCreateArgs(`backlog task create Thing --ac --no-dod-defaults -d`);
		assert.equal(r.acCount, 0);
		assert.equal(r.hasDescription, false);
		assert.equal(r.hasNoDodDefaults, true);
	});

	test("empty --ac= value is not counted", () => {
		const r = parseTaskCreateArgs(`backlog task create Thing --ac= -d d`);
		assert.equal(r.acCount, 0);
	});

	test("captures labels from -l/--label/--labels (comma-separated and repeatable)", () => {
		const r = parseTaskCreateArgs(
			`backlog task create Thing -d d --ac "WHEN x THEN y" -l harness,spec-approved --label deferred`,
		);
		assert.ok(r.labels.includes("harness"));
		assert.ok(r.labels.includes("spec-approved"));
		assert.ok(r.labels.includes("deferred"));
		const eq = parseTaskCreateArgs(`backlog task create Thing --labels=harness,dogfood`);
		assert.deepEqual(eq.labels, ["harness", "dogfood"]);
	});

	test("captures priority from --priority", () => {
		const r = parseTaskCreateArgs(`backlog task create Thing --priority High`);
		assert.equal(r.priority, "High");
		const eq = parseTaskCreateArgs(`backlog task create Thing --priority=low`);
		assert.equal(eq.priority, "low");
		const none = parseTaskCreateArgs(`backlog task create Thing`);
		assert.equal(none.priority, null);
	});

	test("captures deps from --dep/--depends-on (comma-separated and repeatable)", () => {
		const r = parseTaskCreateArgs(
			`backlog task create Thing --dep TASK-1,TASK-2 --depends-on TASK-3`,
		);
		assert.deepEqual(r.deps, ["TASK-1", "TASK-2", "TASK-3"]);
		const eq = parseTaskCreateArgs(`backlog task create Thing --dep=TASK-1,TASK-2`);
		assert.deepEqual(eq.deps, ["TASK-1", "TASK-2"]);
		const none = parseTaskCreateArgs(`backlog task create Thing`);
		assert.deepEqual(none.deps, []);
	});
});

describe("createGateCheck (AC #11 #13 #14 #17)", () => {
	const base = () => ({
		hasDescription: true,
		acCount: 1,
		hasNoDodDefaults: false,
		labels: ["spec-approved"],
		priority: "High",
		deps: [],
	});

	test("isBacklogProject:false => fail-open (no errors, no warnings)", () => {
		const r = createGateCheck({ ...base(), labels: ["bogus"] }, { isBacklogProject: false });
		assert.equal(r.ok, true);
		assert.equal(r.errors.length, 0);
		assert.equal(r.warnings.length, 0);
	});

	test("complete valid create -> ok", () => {
		const r = createGateCheck(base(), { isBacklogProject: true, harnessDev: true });
		assert.equal(r.ok, true);
		assert.equal(r.errors.length, 0);
		assert.equal(r.warnings.length, 0);
	});

	test("unknown label -> refuse naming the label (AC #11)", () => {
		const r = createGateCheck(
			{ ...base(), labels: ["spec-approved", "bogus"] },
			{ isBacklogProject: true },
		);
		assert.equal(r.ok, false);
		assert.match(r.errors.join("\n"), /bogus/);
		assert.match(r.errors.join("\n"), /vocabulary/i);
	});

	test("harness label outside harness-dev context -> refuse (AC #17)", () => {
		const r = createGateCheck(
			{ ...base(), labels: ["spec-approved", "harness"] },
			{ isBacklogProject: true },
		);
		assert.equal(r.ok, false);
		assert.match(r.errors.join("\n"), /harness-dev/i);
	});

	test("dogfood label outside harness-dev context -> refuse (AC #17)", () => {
		const r = createGateCheck(
			{ ...base(), labels: ["spec-approved", "dogfood"] },
			{ isBacklogProject: true },
		);
		assert.equal(r.ok, false);
		assert.match(r.errors.join("\n"), /dogfood/);
	});

	test("harness label passes in a harness-dev context", () => {
		const r = createGateCheck(
			{ ...base(), labels: ["spec-approved", "harness", "dogfood"] },
			{ isBacklogProject: true, harnessDev: true },
		);
		assert.equal(r.ok, true);
	});

	test("self-dep -> refuse naming selfId (AC #13)", () => {
		const r = createGateCheck(
			{ ...base(), deps: ["TASK-1"] },
			{ isBacklogProject: true, selfId: "TASK-1" },
		);
		assert.equal(r.ok, false);
		assert.match(r.errors.join("\n"), /self/i);
	});

	test("cycle through existing graph -> refuse (AC #13)", () => {
		// New task TASK-1 depends on TASK-2; TASK-2 already depends on TASK-1.
		const r = createGateCheck(
			{ ...base(), deps: ["TASK-2"] },
			{
				isBacklogProject: true,
				selfId: "TASK-1",
				existingDepMap: { "TASK-2": ["TASK-1"] },
			},
		);
		assert.equal(r.ok, false);
		assert.match(r.errors.join("\n"), /cycle/i);
	});

	test("missing dep target -> warn, claim proceeds at create (AC #13)", () => {
		const r = createGateCheck(
			{ ...base(), deps: ["TASK-99"] },
			{
				isBacklogProject: true,
				dependencyStatuses: [{ id: "TASK-99", found: false, status: null, crossBranch: true }],
			},
		);
		assert.equal(r.ok, true);
		assert.match(r.warnings.join("\n"), /TASK-99/);
	});

	test("dep-on-Done -> warn (AC #13 B2)", () => {
		const r = createGateCheck(
			{ ...base(), deps: ["TASK-3"] },
			{
				isBacklogProject: true,
				dependencyStatuses: [{ id: "TASK-3", found: true, status: "Done", crossBranch: false }],
			},
		);
		assert.equal(r.ok, true);
		assert.match(r.warnings.join("\n"), /Done/i);
	});

	test("cross-branch dep -> warn as unverified (AC #13 B2)", () => {
		const r = createGateCheck(
			{ ...base(), deps: ["TASK-5"] },
			{
				isBacklogProject: true,
				dependencyStatuses: [{ id: "TASK-5", found: false, status: null, crossBranch: true }],
			},
		);
		assert.equal(r.ok, true);
		assert.match(r.warnings.join("\n"), /unverified/i);
	});

	test("missing priority -> warn at create (AC #14)", () => {
		const r = createGateCheck({ ...base(), priority: null }, { isBacklogProject: true });
		assert.equal(r.ok, true);
		assert.match(r.warnings.join("\n"), /priority/i);
	});

	test("off-set priority -> warn at create (AC #14)", () => {
		const r = createGateCheck({ ...base(), priority: "Urgent" }, { isBacklogProject: true });
		assert.equal(r.ok, true);
		assert.match(r.warnings.join("\n"), /priority/i);
	});
});

describe("acMutationCheck", () => {
	test("spec-approved + --clear-ac -> block", () => {
		assert.equal(acMutationCheck(["--clear-ac"], true), true);
	});

	test("spec-approved + --remove-ac -> block", () => {
		assert.equal(acMutationCheck(["--remove-ac", "2"], true), true);
	});

	test("spec-approved + --acceptance-criteria -> block", () => {
		assert.equal(acMutationCheck(["--acceptance-criteria", "x"], true), true);
	});

	test("non-spec-approved + --clear-ac -> allowed", () => {
		assert.equal(acMutationCheck(["--clear-ac"], false), false);
	});

	test("non-spec-approved + --remove-ac -> allowed", () => {
		assert.equal(acMutationCheck(["--remove-ac", "2"], false), false);
	});

	test("spec-approved + benign edit flags -> allowed", () => {
		assert.equal(acMutationCheck(["--append-notes", "x", "-s", "Done"], true), false);
	});

	test("empty args -> allowed", () => {
		assert.equal(acMutationCheck([], true), false);
		assert.equal(acMutationCheck([], false), false);
	});
});

describe("parseTaskFile (frontmatter), countAcceptanceCriteria", () => {
	const FILE = `---
id: TASK-9
title: Foo
status: To Do
labels:
  - spec-approved
type: docs
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
desc
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 WHEN x THEN y
- [x] #2 IF a THEN b
<!-- AC:END -->
`;

	test("extracts labels, type, and status from frontmatter", () => {
		const meta = parseTaskFile(FILE);
		assert.ok(meta.labels.includes("spec-approved"));
		assert.equal(meta.type, "docs");
		assert.equal(meta.status, "To Do");
	});

	test("counts only AC-section checkbox lines", () => {
		const withoutSection = FILE.replace("<!-- AC:BEGIN -->", "").replace("<!-- AC:END -->", "");
		assert.equal(countAcceptanceCriteria(FILE), 2);
		assert.equal(countAcceptanceCriteria(withoutSection), 2);
		assert.equal(countAcceptanceCriteria("# no checkboxes here"), 0);
	});

	test("broken/absent frontmatter degrades to empty labels + null type + null status", () => {
		assert.deepEqual(parseTaskFile("no frontmatter at all"), {
			labels: [],
			type: null,
			status: null,
		});
	});
});

describe("preCommitCheck (injectable git runner)", () => {
	// A fake git runner over an in-memory index/HEAD store.
	function fakeRunner(files: {
		staged: string[];
		index: Record<string, string>;
		head: Record<string, string>;
	}) {
		return (
			args: string[],
			_opts?: { cwd?: string },
		): { status: number | null; stdout: string; stderr: string } => {
			const [cmd, sub] = args;
			if (cmd === "diff") {
				return { status: 0, stdout: files.staged.join("\n"), stderr: "" };
			}
			if (cmd === "show") {
				const [refPath] = args.slice(1);
				if (refPath.startsWith(":")) {
					const content = files.index[refPath.slice(1)];
					return content === undefined
						? { status: 1, stdout: "", stderr: "not in index" }
						: { status: 0, stdout: content, stderr: "" };
				}
				if (refPath.startsWith("HEAD:")) {
					const content = files.head[refPath.slice(5)];
					return content === undefined
						? { status: 1, stdout: "", stderr: "no HEAD version" }
						: { status: 0, stdout: content, stderr: "" };
				}
			}
			return { status: 128, stdout: "", stderr: `unhandled: ${sub}` };
		};
	}

	const SPEC_FILE = `---
id: TASK-9
labels:
  - spec-approved
---

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 WHEN a THEN b
- [ ] #2 WHEN c THEN d
<!-- AC:END -->
`;

	const UNSPEC_FILE = SPEC_FILE.replace("spec-approved", "deferred");

	test("spec-approved task with ACs reduced in the index -> blocked", () => {
		const r = preCommitCheck(
			fakeRunner({
				staged: ["backlog/tasks/task-9 - x.md"],
				index: {
					"backlog/tasks/task-9 - x.md": SPEC_FILE.replace("- [ ] #2 WHEN c THEN d\n", ""),
				},
				head: { "backlog/tasks/task-9 - x.md": SPEC_FILE },
			}),
			"/repo",
		);
		assert.equal(r.exitCode, 1);
		assert.match(r.blocked.join("\n"), /task-9/);
		assert.match(r.blocked.join("\n"), /2 -> 1/);
	});

	test("spec-approved task with ACs UNCHANGED -> not blocked", () => {
		const r = preCommitCheck(
			fakeRunner({
				staged: ["backlog/tasks/task-9 - x.md"],
				index: { "backlog/tasks/task-9 - x.md": SPEC_FILE },
				head: { "backlog/tasks/task-9 - x.md": SPEC_FILE },
			}),
			"/repo",
		);
		assert.equal(r.exitCode, 0);
		assert.equal(r.blocked.length, 0);
	});

	test("non-spec-approved task with ACs reduced -> not blocked", () => {
		const gutted = UNSPEC_FILE.replace("- [ ] #2 WHEN c THEN d\n", "");
		const r = preCommitCheck(
			fakeRunner({
				staged: ["backlog/tasks/task-9 - x.md"],
				index: { "backlog/tasks/task-9 - x.md": gutted },
				head: { "backlog/tasks/task-9 - x.md": UNSPEC_FILE },
			}),
			"/repo",
		);
		assert.equal(r.exitCode, 0);
	});

	test("new task file (no HEAD version) -> not blocked", () => {
		const r = preCommitCheck(
			fakeRunner({
				staged: ["backlog/tasks/task-99 - new.md"],
				index: { "backlog/tasks/task-99 - new.md": SPEC_FILE },
				head: {},
			}),
			"/repo",
		);
		assert.equal(r.exitCode, 0);
	});

	test("no staged task files -> not blocked", () => {
		const r = preCommitCheck(
			fakeRunner({ staged: ["bin/src/task-flow.ts"], index: {}, head: {} }),
			"/repo",
		);
		assert.equal(r.exitCode, 0);
	});

	test("git machinery failure (status != 0 on diff) fails open", () => {
		const runner = () => ({ status: 128, stdout: "", stderr: "not a repo" });
		const r = preCommitCheck(runner, "/nowhere");
		assert.equal(r.exitCode, 0);
	});

	test("staged non-task backlog files are ignored", () => {
		const r = preCommitCheck(
			fakeRunner({
				staged: ["backlog/config.yml"],
				index: {},
				head: {},
			}),
			"/repo",
		);
		assert.equal(r.exitCode, 0);
	});

	test("staged task with an unknown label -> blocked (AC #11)", () => {
		const BAD = `---
id: TASK-9
labels:
  - spec-approved
  - bogus
---
`;
		const r = preCommitCheck(
			fakeRunner({
				staged: ["backlog/tasks/task-9 - x.md"],
				index: { "backlog/tasks/task-9 - x.md": BAD },
				head: { "backlog/tasks/task-9 - x.md": SPEC_FILE },
			}),
			"/repo",
		);
		assert.equal(r.exitCode, 1);
		assert.match(r.blocked.join("\n"), /bogus/);
		assert.match(r.blocked.join("\n"), /vocabulary/i);
	});

	test("staged task with harness label outside harness-dev context -> blocked (AC #17)", () => {
		const HARNESS_FILE = `---
id: TASK-9
labels:
  - spec-approved
  - harness
---
`;
		const r = preCommitCheck(
			fakeRunner({
				staged: ["backlog/tasks/task-9 - x.md"],
				index: { "backlog/tasks/task-9 - x.md": HARNESS_FILE },
				head: { "backlog/tasks/task-9 - x.md": SPEC_FILE },
			}),
			"/repo",
		);
		assert.equal(r.exitCode, 1);
		assert.match(r.blocked.join("\n"), /harness-dev/i);
	});

	test("staged task with harness label in a harness-dev context -> not blocked (AC #17)", () => {
		const HARNESS_FILE = SPEC_FILE.replace(
			"  - spec-approved\n",
			"  - spec-approved\n  - harness\n",
		);
		const r = preCommitCheck(
			fakeRunner({
				staged: ["backlog/tasks/task-9 - x.md"],
				index: { "backlog/tasks/task-9 - x.md": HARNESS_FILE },
				head: { "backlog/tasks/task-9 - x.md": SPEC_FILE },
			}),
			"/repo",
			{ harnessDev: true },
		);
		assert.equal(r.exitCode, 0);
	});

	test("staged spec-approved task whose ACs are UNCHANGED but labels are fine -> not blocked", () => {
		const r = preCommitCheck(
			fakeRunner({
				staged: ["backlog/tasks/task-9 - x.md"],
				index: { "backlog/tasks/task-9 - x.md": SPEC_FILE },
				head: { "backlog/tasks/task-9 - x.md": SPEC_FILE },
			}),
			"/repo",
		);
		assert.equal(r.exitCode, 0);
	});
});
