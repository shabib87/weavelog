import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { describe, test } from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";
import {
  decideGeneralLabel,
  decideMilestone,
  detectHarnessDevFromCwd,
  GENERAL_LABELS,
  HARNESS_DEV_REPOS,
  isGeneralLabel,
  isHarnessDevContext,
  isKnownLabel,
  isReservedLabel,
  RESERVED_LABELS,
  scaffoldVocabulary,
  unknownLabels,
  VERSION_MILESTONE_ID,
  VERSION_SCOPE_LABELS,
  validateMilestoneAnchor,
  wayfinderMilestoneName,
} from "../src/tools/task-validate.ts";

describe("label vocabulary (AC #11, #17)", () => {
  test("reserved tier is exactly the machinery-only set", () => {
    assert.deepEqual(
      [...RESERVED_LABELS].sort(),
      [
        "housekeeping",
        "merged",
        "spec-approved",
        "stuck",
        "dispatched",
        "wayfinder:map",
      ].sort(),
    );
  });

  test("general tier is exactly the hand-settable set", () => {
    assert.deepEqual(
      [...GENERAL_LABELS].sort(),
      ["deferred", "dogfood", "harness"].sort(),
    );
  });

  test("matching is case-insensitive", () => {
    assert.equal(isKnownLabel("SPEC-APPROVED"), true);
    assert.equal(isKnownLabel("Harness"), true);
    assert.equal(isKnownLabel("HOUSEKEEPING"), true);
    assert.equal(isKnownLabel("wayfinder:map"), true);
    assert.equal(isReservedLabel("Spec-Approved"), true);
    assert.equal(isGeneralLabel("dogfood"), true);
    assert.equal(isGeneralLabel("HARNESS"), true);
  });

  test("unknown labels (incl. pre-migration v1/v2/immediate/bugfix) are rejected", () => {
    for (const label of [
      "v1",
      "v2",
      "immediate",
      "bugfix",
      "cleanup",
      "maintenance",
      "infra",
      "bogus",
    ]) {
      assert.equal(isKnownLabel(label), false);
    }
  });

  test("unknownLabels reports only the non-vocabulary entries preserving case", () => {
    assert.deepEqual(
      unknownLabels(["harness", "v1", "Spec-Approved", "nope"]),
      ["v1", "nope"],
    );
  });
});

describe("harness-dev context detection (AC #17)", () => {
  test("canonical repo list contains the agents-harness and weavelog repos", () => {
    assert.ok(HARNESS_DEV_REPOS.includes("agents-harness"));
    assert.ok(HARNESS_DEV_REPOS.includes("weavelog"));
  });

  test("git remote URL basename match -> harness-dev", () => {
    assert.equal(
      isHarnessDevContext({
        remoteUrls: ["git@github.com:acme/agents-harness.git"],
      }),
      true,
    );
    assert.equal(
      isHarnessDevContext({ remoteUrls: ["https://github.com/acme/weavelog"] }),
      true,
    );
    assert.equal(
      isHarnessDevContext({
        remoteUrls: ["ssh://git@github.com/team/weavelog/"],
      }),
      true,
    );
  });

  test("weavelog dev-repo naming variants match (dev suffix)", () => {
    assert.equal(
      isHarnessDevContext({
        remoteUrls: ["git@github.com:acme/weavelog-dev.git"],
      }),
      true,
    );
    assert.equal(
      isHarnessDevContext({
        remoteUrls: ["https://github.com/acme/weavelog.dev"],
      }),
      true,
    );
  });

  test("non-canonical remotes are not harness-dev", () => {
    assert.equal(
      isHarnessDevContext({
        remoteUrls: ["git@github.com:acme/random-project.git"],
      }),
      false,
    );
    assert.equal(
      isHarnessDevContext({ remoteUrls: ["https://github.com/acme/my-app"] }),
      false,
    );
  });

  test("config param wins over remote URLs (injectable for tests)", () => {
    assert.equal(
      isHarnessDevContext({
        remoteUrls: ["git@github.com:acme/random.git"],
        config: { harnessDev: true },
      }),
      true,
    );
    assert.equal(
      isHarnessDevContext({
        remoteUrls: ["git@github.com:acme/agents-harness.git"],
        config: { harnessDev: false },
      }),
      false,
    );
  });

  test("no remotes and no config param -> not harness-dev", () => {
    assert.equal(isHarnessDevContext({}), false);
    assert.equal(isHarnessDevContext({ remoteUrls: [] }), false);
  });

  test("repo root basename matching a canonical repo (no remotes) -> harness-dev", () => {
    assert.equal(isHarnessDevContext({ repoRootName: "agents-harness" }), true);
    assert.equal(isHarnessDevContext({ repoRootName: "weavelog" }), true);
    assert.equal(isHarnessDevContext({ repoRootName: "weavelog-dev" }), true);
    assert.equal(isHarnessDevContext({ repoRootName: "my-app" }), false);
    assert.equal(isHarnessDevContext({ repoRootName: "" }), false);
  });

  test("detectHarnessDevFromCwd: no remotes but repo-root basename matches -> harness-dev", () => {
    // Fake git: remote -v empty, show-toplevel rooted at /repos/agents-harness
    const runner = (args: string[], _opts?: { cwd?: string }) => {
      if (args[0] === "remote") return { status: 0, stdout: "", stderr: "" };
      if (args[0] === "rev-parse") {
        return { status: 0, stdout: "/repos/agents-harness\n", stderr: "" };
      }
      return { status: 128, stdout: "", stderr: "unhandled" };
    };
    assert.equal(
      detectHarnessDevFromCwd("/repos/agents-harness", runner),
      true,
    );
  });

  test("detectHarnessDevFromCwd: remote URL remains the primary signal over root basename", () => {
    // Remote says random-project; root dir is named agents-harness.
    const runner = (args: string[], _opts?: { cwd?: string }) => {
      if (args[0] === "remote") {
        return {
          status: 0,
          stdout: "origin\tgit@github.com:acme/random-project.git (fetch)\n",
          stderr: "",
        };
      }
      if (args[0] === "rev-parse") {
        return { status: 0, stdout: "/repos/agents-harness\n", stderr: "" };
      }
      return { status: 128, stdout: "", stderr: "unhandled" };
    };
    assert.equal(
      detectHarnessDevFromCwd("/repos/agents-harness", runner),
      false,
    );
  });

  test("detectHarnessDevFromCwd: standard git remote output recognizes weavelog", () => {
    const runner = (args: string[], _opts?: { cwd?: string }) => {
      if (args[0] === "remote") {
        return {
          status: 0,
          stdout:
            "origin\tgit@github.com:shabib87/weavelog.git (fetch)\norigin\tgit@github.com:shabib87/weavelog.git (push)\n",
          stderr: "",
        };
      }
      return { status: 128, stdout: "", stderr: "unhandled" };
    };
    assert.equal(detectHarnessDevFromCwd("/repos/TASK-28", runner), true);
  });

  test("backlog project_name matching a canonical repo -> harness-dev (works in every worktree)", () => {
    assert.equal(
      isHarnessDevContext({ backlogProjectName: "agents-harness" }),
      true,
    );
    assert.equal(isHarnessDevContext({ backlogProjectName: "Weavelog" }), true);
    assert.equal(
      isHarnessDevContext({ backlogProjectName: "weavelog-dev" }),
      true,
    );
    assert.equal(isHarnessDevContext({ backlogProjectName: "my-app" }), false);
    assert.equal(isHarnessDevContext({ backlogProjectName: "" }), false);
  });

  test("detectHarnessDevFromCwd: no remotes + non-matching root basename but config.yml project_name matches -> harness-dev (worktree case)", () => {
    // Simulates a worktree: git toplevel is the main repo root whose
    // backlog/config.yml declares project_name agents-harness; the cwd
    // (worktree) dir basename itself does not match.
    const root = mkdtempSync(join(tmpdir(), "task-policy-proj-"));
    mkdirSync(join(root, "backlog"), { recursive: true });
    writeFileSync(
      join(root, "backlog", "config.yml"),
      'project_name: "agents-harness"\n',
    );
    try {
      const runner = (args: string[], _opts?: { cwd?: string }) => {
        if (args[0] === "remote") return { status: 0, stdout: "", stderr: "" };
        if (args[0] === "rev-parse" && args[1] === "--show-toplevel") {
          return { status: 0, stdout: `${root}\n`, stderr: "" };
        }
        return { status: 128, stdout: "", stderr: "unhandled" };
      };
      assert.equal(
        detectHarnessDevFromCwd(join(root, ".worktrees", "TASK-51"), runner),
        true,
      );
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  test("detectHarnessDevFromCwd: config.yml with a non-canonical project_name -> not harness-dev", () => {
    const root = mkdtempSync(join(tmpdir(), "task-policy-proj2-"));
    mkdirSync(join(root, "backlog"), { recursive: true });
    writeFileSync(
      join(root, "backlog", "config.yml"),
      'project_name: "my-app"\n',
    );
    try {
      const runner = (args: string[], _opts?: { cwd?: string }) => {
        if (args[0] === "remote") return { status: 0, stdout: "", stderr: "" };
        if (args[0] === "rev-parse" && args[1] === "--show-toplevel") {
          return { status: 0, stdout: `${root}\n`, stderr: "" };
        }
        return { status: 128, stdout: "", stderr: "unhandled" };
      };
      assert.equal(detectHarnessDevFromCwd(root, runner), false);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  test("detectHarnessDevFromCwd: no config.yml at the repo root -> not harness-dev", () => {
    const root = mkdtempSync(join(tmpdir(), "task-policy-proj3-"));
    try {
      const runner = (args: string[], _opts?: { cwd?: string }) => {
        if (args[0] === "remote") return { status: 0, stdout: "", stderr: "" };
        if (args[0] === "rev-parse" && args[1] === "--show-toplevel") {
          return { status: 0, stdout: `${root}\n`, stderr: "" };
        }
        return { status: 128, stdout: "", stderr: "unhandled" };
      };
      assert.equal(detectHarnessDevFromCwd(root, runner), false);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  test("detectHarnessDevFromCwd fails open to false when git cannot be read", () => {
    assert.equal(detectHarnessDevFromCwd("/nonexistent-dir-xyz"), false);
  });
});

describe("general-label decision table (AC #15)", () => {
  test("first match: harness for harness-path modification (bin/plugins/config/AGENTS.md/docs-trd-adr-prd/stack-versions)", () => {
    for (const p of [
      "bin/src/task-validate.ts",
      "plugins/enforce.ts",
      "config/opencode.jsonc",
      "AGENTS.md",
      "docs/trd/worktree-discipline.md",
      "docs/adr/0004-model-selection-benchmark-policy.md",
      "docs/prd/2026-09-05-v010-draft-brief.md",
      "stack-versions.json",
    ]) {
      assert.equal(decideGeneralLabel({ modifiedPaths: [p] }), "harness");
    }
  });

  test("modified-file matching is case-insensitive", () => {
    assert.equal(
      decideGeneralLabel({ modifiedPaths: ["BIN/src/task-flow.ts"] }),
      "harness",
    );
  });

  test("harness wins over dogfood when both apply (mechanical-first order)", () => {
    assert.equal(
      decideGeneralLabel({
        modifiedPaths: ["plugins/enforce.ts"],
        deliverableVerifiedThroughHarness: true,
      }),
      "harness",
    );
  });

  test("dogfood when the deliverable is real work verified through the harness", () => {
    assert.equal(
      decideGeneralLabel({
        modifiedPaths: [],
        deliverableVerifiedThroughHarness: true,
      }),
      "dogfood",
    );
  });

  test("deferred when an explicit revive trigger is recorded", () => {
    assert.equal(
      decideGeneralLabel({
        modifiedPaths: [],
        reviveTrigger: "revisit after 0.2 ships",
      }),
      "deferred",
    );
  });

  test("no match -> no label", () => {
    assert.equal(decideGeneralLabel({ modifiedPaths: [] }), null);
    assert.equal(
      decideGeneralLabel({ modifiedPaths: ["docs/research/note.md"] }),
      null,
    );
    assert.equal(
      decideGeneralLabel({
        modifiedPaths: [],
        deliverableVerifiedThroughHarness: false,
        reviveTrigger: "",
      }),
      null,
    );
  });
});

describe("milestone decision table (AC #18)", () => {
  test("version scope (v1/v2) maps to the version milestone on an empty milestone field", () => {
    const r1 = decideMilestone({ labels: ["v1"], currentMilestone: null });
    assert.equal(r1.milestone, VERSION_MILESTONE_ID);
    assert.match(r1.reason, /version/i);
    const r2 = decideMilestone({ labels: ["V2"], currentMilestone: null });
    assert.equal(r2.milestone, VERSION_MILESTONE_ID);
    assert.match(r2.reason, /version/i);
  });

  test("version scope outranks wayfinder map membership", () => {
    const r = decideMilestone({
      labels: ["v1"],
      wayfinderMap: "some-map",
      currentMilestone: null,
    });
    assert.equal(r.milestone, VERSION_MILESTONE_ID);
    assert.match(r.reason, /version/i);
  });

  test("wayfinder map task without version scope maps to the name-derived map milestone", () => {
    const r = decideMilestone({
      labels: [],
      wayfinderMap: "weavelog-v0.1",
      currentMilestone: null,
    });
    assert.equal(r.milestone, wayfinderMilestoneName("weavelog-v0.1"));
    assert.match(r.reason, /wayfinder/i);
  });

  test("no scope, no map -> no milestone", () => {
    const r = decideMilestone({ labels: ["harness"], currentMilestone: null });
    assert.equal(r.milestone, null);
    assert.match(r.reason, /none/i);
  });

  test("existing milestone assignment is left unchanged (empty-milestone-only)", () => {
    const r = decideMilestone({ labels: ["v1"], currentMilestone: "m-4" });
    assert.equal(r.milestone, null);
    assert.match(r.reason, /unchanged/i);
  });

  test("missing target milestone -> assign none and never create", () => {
    const r = decideMilestone({
      labels: ["v1"],
      currentMilestone: null,
      milestoneExists: () => false,
    });
    assert.equal(r.milestone, null);
    assert.match(r.reason, /does not exist/i);
  });

  test("wayfinderMilestoneName is deterministic and derived from the map name", () => {
    assert.equal(
      wayfinderMilestoneName("weavelog-v0.1"),
      "wayfinder:weavelog-v0.1",
    );
  });
});

describe("scaffold vocabulary (AC #17)", () => {
  test("scaffolded workspace ships the reserved set plus deferred ONLY — no harness, no dogfood", () => {
    const v = scaffoldVocabulary();
    assert.deepEqual(v.general, ["deferred"]);
    assert.ok(!v.general.includes("harness"));
    assert.ok(!v.general.includes("dogfood"));
    assert.equal(
      [...RESERVED_LABELS].every((l) => v.reserved.includes(l)),
      true,
    );
    for (const label of [...v.reserved, ...v.general]) {
      assert.equal(isKnownLabel(label), true);
    }
  });
});

describe("version-scope migration constants (AC #16/#18)", () => {
  test("VERSION_MILESTONE_ID and the scope labels are the migration contract", () => {
    assert.equal(VERSION_MILESTONE_ID, "m-6");
    assert.deepEqual([...VERSION_SCOPE_LABELS].sort(), ["v1", "v2"]);
  });
});

describe("milestone PRD anchor validation (TASK-76, ADR-005)", () => {
  const mkRoot = () => mkdtempSync(join(tmpdir(), "milestone-anchor-"));

  test("missing anchor line is a violation", () => {
    const root = mkRoot();
    assert.deepEqual(
      validateMilestoneAnchor("m-7", "# m-7\n\nsome body\n", root),
      [
        'milestone m-7 is missing its "PRD anchor:" line (docs/prd path or explicit "none" marker)',
      ],
    );
  });

  test("explicit none marker is valid", () => {
    const root = mkRoot();
    assert.deepEqual(
      validateMilestoneAnchor(
        "m-2",
        "# m-2\nPRD anchor: none — pre-PRD-era, decisions recorded in-thread\n",
        root,
      ),
      [],
    );
  });

  test("anchor resolving to a brief that lists the milestone is valid", () => {
    const root = mkRoot();
    mkdirSync(join(root, "docs", "prd"), { recursive: true });
    writeFileSync(
      join(root, "docs", "prd", "2026-09-07-m-7-brief.md"),
      '---\ndate: 2026-09-07\ntopic: brief\nstatus: approved\ntype: prd\nauthor: conductor\nrelated_to: []\nsources: ["TASK-76"]\nmilestones:\n  - m-7\n---\n\n# brief\n',
    );
    assert.deepEqual(
      validateMilestoneAnchor(
        "m-7",
        "# m-7\nPRD anchor: docs/prd/2026-09-07-m-7-brief.md\n",
        root,
      ),
      [],
    );
  });

  test("anchor to a brief that does NOT list this milestone is a violation (bidirectional)", () => {
    const root = mkRoot();
    mkdirSync(join(root, "docs", "prd"), { recursive: true });
    writeFileSync(
      join(root, "docs", "prd", "2026-09-07-m-7-brief.md"),
      '---\ndate: 2026-09-07\ntopic: brief\nstatus: approved\ntype: prd\nauthor: conductor\nrelated_to: []\nsources: ["TASK-76"]\nmilestones:\n  - m-6\n---\n\n# brief\n',
    );
    const v = validateMilestoneAnchor(
      "m-7",
      "# m-7\nPRD anchor: docs/prd/2026-09-07-m-7-brief.md\n",
      root,
    );
    assert.equal(v.length, 1);
    assert.ok(v[0].includes("does not list m-7"));
  });

  test("dangling anchor path is a violation", () => {
    const root = mkRoot();
    const v = validateMilestoneAnchor(
      "m-7",
      "# m-7\nPRD anchor: docs/prd/2026-09-07-ghost.md\n",
      root,
    );
    assert.equal(v.length, 1);
    assert.ok(v[0].includes("does not resolve"));
  });
});

describe("milestone id/filename agreement (ADR-005 linkage)", () => {
  test("--milestones exits 1 when a milestone file's frontmatter id disagrees with its filename", () => {
    const root = mkdtempSync(join(tmpdir(), "milestone-id-mismatch-"));
    mkdirSync(join(root, "backlog", "milestones"), { recursive: true });
    writeFileSync(
      join(root, "backlog", "milestones", "m-7 - pre-publish-v0.1.0.md"),
      `---
id: m-6
title: "Pre-publish v0.1.0"
---

## Description

Milestone: Pre-publish v0.1.0
PRD anchor: none — test fixture
`,
    );
    const req = createRequire(import.meta.url);
    const loader = req.resolve("tsx");
    const Bin = join(
      dirname(fileURLToPath(import.meta.url)),
      "..",
      "src",
      "tools",
      "task-validate.ts",
    );
    const r = spawnSync(
      process.execPath,
      ["--import", pathToFileURL(loader).href, Bin, "--milestones"],
      { encoding: "utf8", timeout: 60_000, cwd: root },
    );
    assert.equal(r.status, 1, r.stdout + r.stderr);
    assert.ok(
      (r.stderr + r.stdout).includes('declares id "m-6"') &&
        (r.stderr + r.stdout).includes('says "m-7"'),
    );
  });
});
