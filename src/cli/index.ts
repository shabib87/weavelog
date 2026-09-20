#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import type { Stats } from "node:fs";
import {
  accessSync,
  appendFileSync,
  chmodSync,
  constants,
  existsSync,
  lstatSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  renameSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { homedir, tmpdir } from "node:os";
import { dirname, join, relative, resolve, sep } from "node:path";
import { createInterface } from "node:readline/promises";
import { fileURLToPath } from "node:url";
import {
  emitOpenCodeAdapters,
  inspectOpenCodeAdapters,
} from "../hooks/opencode-adapters.js";
import type { AuditException, NpmAuditReport } from "../tools/audit-gate.js";
import {
  evaluateAuditGate,
  parseAuditReport,
  parseExceptions,
} from "../tools/audit-gate.js";
import {
  expandHome,
  readHarnessManifest,
  sha256File,
  sha256Of,
} from "../tools/declared-targets.js";
import {
  type DeclaredTarget,
  decideTargetAction,
  declaredTargetsFromFiles,
  declaredTargetsFromSkills,
  journalStateFor,
  type TargetDecision,
  writeJournal,
} from "../tools/init-materialize.js";
import type { InstalledPackage } from "../tools/install-resolver.js";
import {
  findPathShadows,
  hashPayloadFiles,
  resolveInstalledPackage,
  stalePayloadFiles,
} from "../tools/install-resolver.js";
import {
  readActiveProfile,
  writeActiveProfile,
  writeSnapshot,
} from "../tools/materialize-state.js";
import { checkDifitPointer, pinHygieneForDir } from "../tools/pin-hygiene.js";
import { PRIVACY_RULES, privacyAuditForDir } from "../tools/privacy-audit.js";
import {
  defaultProfilesDir,
  readProfile,
  resolveInputs,
  tokensFromProfile,
} from "../tools/profiles.js";
import {
  detectRiskSignals,
  firstChangedLine,
  matchesProtectedPath,
  readRetryFailures,
} from "../tools/risk-signals.js";
import { checkConfigDrift, checkMarkitdown } from "../tools/stack-check.js";
import { toolScript } from "../tools/tool-paths.js";
import type { WeavelogManifest } from "../tools/weavelog-manifest.js";

const USAGE =
  "Usage: weavelog <command> [options]\n\nCommands:\n  init       Materialize the payload into a live root\n  sync       Repo -> live config materialization (author machine)\n  update     Refresh materialized global targets from the installed payload\n  versions   Report tool versions vs weavelog.json plus update and rollback hints\n  check      Verify the machine against weavelog.json (--stack-only: fast subset)\n  doctor     Run the subcheck battery\n  scaffold   Scaffold a backlog-driven project dir\n  stats      Show session usage statistics from .pi/logs/*.stats.json\n\nRun 'weavelog <command> --help' for command help.";

const COMMAND_HELP: Record<string, string> = {
  init: `Usage: weavelog init [--force] [--yes]

Materialize the INSTALLED weavelog package payload into the declared global
targets per the harness manifest (payload/config/harnesses/opencode.json):
rendered config (AGENTS.md, opencode.jsonc, agents/, prompts/) to
~/.config/opencode and copied skills to ~/.agents/skills. Whole-run
preflight runs before any write: every declared target must be absent
(create) or proven weavelog-owned AND unchanged (update); any unowned,
changed, ambiguous, or state-missing target refuses the whole run (exit 1,
zero writes, per-target reasons). No silent adoption, no baseline capture.

--force may replace only eligible declared leaf files (never skills,
symlinks, special files, or protected paths) after confirmation:
interactive TTY prompts for approval; noninteractive requires BOTH --force
and --yes (--yes alone never permits). Replacements journal intent before
the change, move the prior file to an opaque 0600 .bak under
<state>/backups/<run-id>/, install the staged file, and journal completion.
Backups are preserved and never parsed or logged. On a safe failure the
original is restored and the rollback recorded; an interrupted run refuses
automatic recovery and reports the journal and backup paths.

Render tokens: WEAVELOG_HOME and WEAVELOG_CONFIG_HOME defaults plus profile
choices (precedence: flags > confirmed answers > profile > package-safe
defaults). No secret values ever enter render tokens, state, journal, or
backups.

Env seams:
  WEAVELOG_PACKAGE_ROOT    installed package root (default: resolved from the running CLI)
  WEAVELOG_CONFIG_HOME     opencode config root (default: manifest liveRoot)
  WEAVELOG_LIVE_ROOT       WEAVELOG_HOME token default (default ~/.agents)
  WEAVELOG_PROFILES_DIR    profiles dir (default ~/.config/weavelog/profiles)
  WEAVELOG_STATE_DIR       state + ledger dir (default ~/.local/state/weavelog)
  WEAVELOG_TTY             force interactive TTY behavior for --force confirmation`,
  sync: `Usage: weavelog sync

Repo -> live materialization for the author machine. Runs the config-sync
machinery against the payload harness manifest; no-op when everything is
already in sync (exit 0).

Env seams:
  WEAVELOG_CONFIG_HOME     live config root (default ~/.config/opencode)
  WEAVELOG_STATE_DIR       state + ledger dir (default ~/.local/state/weavelog)`,
  update: `Usage: weavelog update [--force] [--yes]

Refresh materialization from the INSTALLED weavelog package payload into the
declared global targets (payload/config/harnesses/opencode.json): rendered
config (AGENTS.md, opencode.jsonc, agents/, prompts/) to ~/.config/opencode
and copied skills to ~/.agents/skills. Same ownership/preflight/replacement
contract as 'weavelog init' (docs/trd/cli-vision.md): whole-run preflight
before any write; every declared target must be absent (created, per the
ownership table row 'Global target is absent -> Create it') or proven
weavelog-owned AND unchanged (re-rendered); any unowned, changed, ambiguous,
or state-missing target refuses the whole run (exit 1, zero writes,
per-target reasons). Ledger and run journal record command 'update'.

--force may replace only eligible declared leaf files (never skills,
symlinks, special files, or protected paths) after confirmation:
interactive TTY prompts for approval; noninteractive requires BOTH --force
and --yes (--yes alone never permits). Replacements journal intent before
the change, move the prior file to an opaque 0600 .bak under
<state>/backups/<run-id>/, install the staged file, and journal completion.
Backups are preserved and never parsed or logged. On a safe failure the
original is restored and the rollback recorded; an interrupted run refuses
automatic recovery and reports the journal and backup paths.

Env seams: same as 'weavelog init'.`,
  versions: `Usage: weavelog versions

Safe-update flow: checks every weavelog.json tool version against the
installed tool and reports per-channel update notes (pipx/npm/app/git) plus
rollback hints. Full automation is not required at 0.1.0. Exits 0 when the
setup is healthy, refuses loudly (exit 1) on drift. Report-only: never applies
updates.

Env seams: same binary seams as 'weavelog check --stack-only'.`,
  check: `Usage: weavelog check [--stack-only] [--pre-commit]

Verify the machine against weavelog.json. --pre-commit runs the pin-hygiene
gate (exact pins + lockfile, weavelog-managed repos only) followed by the
backlog task validation gate (for git hooks installed by 'weavelog'
worktree tooling) and exits 0/1. --stack-only runs ONLY the fast
stack-version subset (one check per weavelog.json tool check id, plus the
node-path guard) suitable for a launchd plist. Without the flag, adds the
proxy :8788 health check and the config-drift check (composes src/stack-check
machinery). Exits 0 when healthy, 1 on any failure.

Env seams:
  WEAVELOG_HEADROOM_BIN    headroom binary (default ~/.local/bin/headroom)
  WEAVELOG_BACKLOG_BIN     backlog binary (default ~/.bun/bin/backlog)
  WEAVELOG_MARKITDOWN_BIN  markitdown binary (default ~/.local/bin/markitdown)
  WEAVELOG_OPENCODE_BIN    opencode binary (default 'opencode' from PATH)
  WEAVELOG_PI_BIN          pi binary (default 'pi' from PATH)
  WEAVELOG_SKILLS_DIR      skills dir for diagram-design (default <live>/skills)
  WEAVELOG_CHECK_PLIST     check launchd plist (default ~/Library/LaunchAgents/com.weavelog.check.plist)
  WEAVELOG_LIVE_ROOT       live root (default ~/.agents)
  WEAVELOG_CONFIG_HOME     live config root (default ~/.config/opencode)
  WEAVELOG_STATE_DIR       ledger dir (default ~/.local/state/weavelog)`,
  doctor: `Usage: weavelog doctor

Subcheck battery, one check per weavelog.json check id. Subchecks: manifest
parse, payload integrity, templating sanity ({{...}} tokens only resolve from
.env), skills layout (no symlinks in payload; frontmatter license/upstream
present), proxy :8788 health (skipped with a warning when headroom is absent),
backlog binary presence, node version >= engines.node, and the node-path guard
(pinned node in the check plist must exist and satisfy engines.node; skipped
when the plist is absent). Exits 0 iff all checks pass (warnings are ok,
failures are not).

Env seams: same as 'weavelog check', plus WEAVELOG_PI_HOME for stats.`,
  scaffold: `Usage: weavelog scaffold --project <name>

Scaffold a backlog-driven project dir relative to the current directory: git
init, AGENTS.md stub from the payload template, backlog/ init via the backlog
CLI if present (else skipped with a decision), and a .env.example copy.

Env seams:
  WEAVELOG_BACKLOG_BIN     backlog binary (default 'backlog' from PATH)
  WEAVELOG_STATE_DIR       ledger dir (default ~/.local/state/weavelog)`,
  stats: `Usage: weavelog stats

Show session usage statistics from .pi/logs/*.stats.json.

Env seams:
  WEAVELOG_PI_HOME         pi home (default ~/.pi)
  WEAVELOG_STATE_DIR       ledger dir (default ~/.local/state/weavelog)`,
};

const HOME = homedir();
const HERE = fileURLToPath(new URL(".", import.meta.url));
const REPO_ROOT = resolve(HERE, "..", "..");
const PAYLOAD_DIR = join(REPO_ROOT, "payload");
const LEDGER_FILE = "ledger.jsonl";
const KNOWN_TOKENS = new Set(["WEAVELOG_HOME", "WEAVELOG_CONFIG_HOME"]);

interface LedgerEntry {
  ts: string;
  command: string;
  args: string[];
  filesTouched: string[];
  decisions: string[];
  errors: string[];
  exitCode: number;
  resolvedPackageRoot?: string | null;
  resolvedBinPath?: string | null;
  /** Additive per-target decisions (AC #5): live-relative rel + action. */
  targets?: { liveRel: string; action: string; reason?: string }[];
}

interface CheckResult {
  ok?: boolean;
  skip?: boolean;
  warn?: boolean;
  detail: string;
}

function stateDir(): string {
  return (
    process.env.WEAVELOG_STATE_DIR ?? join(HOME, ".local", "state", "weavelog")
  );
}

function packageRootValue(): string {
  return process.env.WEAVELOG_PACKAGE_ROOT ?? REPO_ROOT;
}

function ledgerPath(): string {
  return join(stateDir(), LEDGER_FILE);
}

/** Persisted state must not expose raw home paths (cli-vision.md). The
 * stdout report keeps full paths; the ledger collapses them to ~/. */
function collapseHomeInEntry(entry: LedgerEntry): LedgerEntry {
  const escaped = HOME.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const s = (v: string | null | undefined): string | null | undefined =>
    typeof v === "string" ? v.replace(new RegExp(escaped, "g"), "~") : v;
  return {
    ...entry,
    args: entry.args.map((a) => s(a) ?? a),
    filesTouched: entry.filesTouched.map((a) => s(a) ?? a),
    decisions: entry.decisions.map((a) => s(a) ?? a),
    errors: entry.errors.map((a) => s(a) ?? a),
    targets: entry.targets?.map((t) => ({
      ...t,
      reason: s(t.reason) ?? undefined,
    })),
    resolvedPackageRoot: s(entry.resolvedPackageRoot),
    resolvedBinPath: s(entry.resolvedBinPath),
  };
}

function appendLedger(entry: LedgerEntry): void {
  mkdirSync(dirname(ledgerPath()), { recursive: true, mode: 0o700 });
  appendFileSync(
    ledgerPath(),
    `${JSON.stringify(collapseHomeInEntry(entry))}\n`,
    { mode: 0o600 },
  );
}

function finish(entry: Omit<LedgerEntry, "ts">): never {
  const full: LedgerEntry = { ts: new Date().toISOString(), ...entry };
  try {
    appendLedger(full);
  } catch (err) {
    console.error(`ledger write failed: ${(err as Error).message}`);
    process.exit(1);
  }
  process.exit(entry.exitCode);
}

function configHomeValue(dotenv?: Record<string, string>): string {
  return (
    process.env.WEAVELOG_CONFIG_HOME ??
    dotenv?.WEAVELOG_CONFIG_HOME ??
    join(HOME, ".config", "opencode")
  );
}

function expandEnv(value: string): string {
  return value.replace(
    /\$(\w+)|\$\{(\w+)\}/g,
    (m, bare: string, braced: string) => {
      const key = bare ?? braced;
      return process.env[key] ?? m;
    },
  );
}

function parseDotenv(text: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const line of text.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq < 1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (value) out[key] = expandEnv(value);
  }
  return out;
}

function readDotenv(liveRoot: string): Record<string, string> {
  const p = join(liveRoot, ".env");
  if (!existsSync(p)) return {};
  return parseDotenv(readFileSync(p, "utf8"));
}

function ensureDotenv(liveRoot: string): Record<string, string> {
  const p = join(liveRoot, ".env");
  if (!existsSync(p)) {
    const content = `WEAVELOG_HOME=${liveRoot}\nWEAVELOG_CONFIG_HOME=${join(HOME, ".config", "opencode")}\n`;
    mkdirSync(liveRoot, { recursive: true });
    writeFileSync(p, content);
  }
  return readDotenv(liveRoot);
}

function renderPayloadToTemp(tokens: Record<string, string>): string {
  const tempRoot = mkdtempSync(join(tmpdir(), "fl-sync-render-"));
  writeFileSync(
    join(tempRoot, "AGENTS.md"),
    renderToBuffer(join(PAYLOAD_DIR, "AGENTS.md"), tokens),
  );
  for (const full of walkFiles(join(PAYLOAD_DIR, "config"))) {
    const rel = relative(PAYLOAD_DIR, full);
    const dest = join(tempRoot, rel);
    mkdirSync(dirname(dest), { recursive: true });
    writeFileSync(dest, renderToBuffer(full, tokens));
  }
  return tempRoot;
}

function renderTemplate(
  content: string,
  tokens: Record<string, string>,
  sourcePath: string,
): string {
  return content.replace(
    /\{\{\s*([A-Za-z0-9_]+)\s*\}\}/g,
    (_m, key: string) => {
      if (!(key in tokens)) {
        throw new Error(
          `${sourcePath}: template token {{${key}}} is not resolvable from .env`,
        );
      }
      return tokens[key];
    },
  );
}

function walkFiles(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === ".DS_Store") continue;
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      out.push(...walkFiles(full));
    } else {
      out.push(full);
    }
  }
  return out;
}

function liveRootValue(dotenv?: Record<string, string>): string {
  return (
    process.env.WEAVELOG_LIVE_ROOT ??
    dotenv?.WEAVELOG_HOME ??
    join(HOME, ".agents")
  );
}

function skillsDir(dotenv?: Record<string, string>): string {
  return (
    process.env.WEAVELOG_SKILLS_DIR ?? join(liveRootValue(dotenv), "skills")
  );
}

function readManifest(): WeavelogManifest {
  return JSON.parse(
    readFileSync(join(REPO_ROOT, "weavelog.json"), "utf8"),
  ) as WeavelogManifest;
}

function readEnginesNode(): number {
  const pkg = JSON.parse(
    readFileSync(join(REPO_ROOT, "package.json"), "utf8"),
  ) as {
    engines?: { node?: string };
  };
  const spec = pkg.engines?.node ?? ">=20";
  const min = Number((spec.match(/(\d+)/) ?? ["20"])[0] ?? 20);
  return Number.isFinite(min) ? min : 20;
}

function runBin(bin: string, args: string[]): string {
  const r = spawnSync(bin, args, { encoding: "utf8", timeout: 30_000 });
  return `${r.stdout ?? ""}${r.stderr ?? ""}`.trim();
}

// --- ledger-adjacent helpers ------------------------------------------------

function stackVersionChecks(
  manifest: WeavelogManifest,
): { id: string; ok: boolean; detail: string; skip?: boolean }[] {
  const results: { id: string; ok: boolean; detail: string; skip?: boolean }[] =
    [];
  const resolveOnPath = (name: string): string => {
    if (name.includes("/")) return name;
    for (const dir of (process.env.PATH ?? "").split(":")) {
      if (!dir) continue;
      const candidate = join(dir, name);
      if (existsSync(candidate)) return candidate;
    }
    return name;
  };
  const binFor: Record<string, string> = {
    headroom:
      process.env.WEAVELOG_HEADROOM_BIN ??
      join(HOME, ".local", "bin", "headroom"),
    backlog:
      process.env.WEAVELOG_BACKLOG_BIN ?? join(HOME, ".bun", "bin", "backlog"),
    markitdown:
      process.env.WEAVELOG_MARKITDOWN_BIN ??
      join(HOME, ".local", "bin", "markitdown"),
    opencode: resolveOnPath(process.env.WEAVELOG_OPENCODE_BIN ?? "opencode"),
    pi: resolveOnPath(process.env.WEAVELOG_PI_BIN ?? "pi"),
  };
  for (const tool of [
    "headroom",
    "backlog",
    "markitdown",
    "opencode",
    "pi",
  ] as const) {
    const spec = manifest.tools[tool];
    const id = spec.check;
    const bin = binFor[tool];
    if (!existsSync(bin)) {
      results.push({
        id,
        ok: false,
        detail: `${tool} binary missing at ${bin} (manifest ${spec.version})`,
      });
      continue;
    }
    let current: string;
    if (tool === "markitdown") {
      const c = checkMarkitdown(bin, spec.version);
      current = String(c.check.current ?? "(unknown)");
      results.push({
        id,
        ok: c.drift.length === 0,
        detail:
          c.drift.length === 0
            ? `${tool} ${current} matches pinned ${spec.version}`
            : `${tool} drift: ${c.drift.join("; ")}`,
      });
      continue;
    }
    current = runBin(bin, ["--version"]);
    const ok = current.includes(spec.version);
    results.push({
      id,
      ok,
      detail: ok
        ? `${tool} ${current} matches pinned ${spec.version}`
        : `${tool} installed '${current || "no version output"}' != pinned ${spec.version}`,
    });
  }
  const ddSpec = manifest.tools["diagram-design"];
  const ddDir = join(skillsDir(), "diagram-design");
  const ddPresent = existsSync(ddDir);
  results.push({
    id: ddSpec.check,
    ok: ddPresent,
    detail: ddPresent
      ? `diagram-design present at ${ddDir} (pinned ${ddSpec.version})`
      : `diagram-design missing at ${ddDir} (pinned ${ddSpec.version})`,
  });
  const difitSpec = manifest.tools.difit;
  if (difitSpec) {
    const docPath =
      process.env.WEAVELOG_DIFIT_DOC ??
      join(REPO_ROOT, "docs", "trd", "worktree-discipline.md");
    const doc = existsSync(docPath) ? readFileSync(docPath, "utf8") : null;
    const pointer = checkDifitPointer(difitSpec.version, doc);
    results.push({
      id: difitSpec.check,
      ok: pointer.ok,
      detail: pointer.detail,
    });
  }
  return results;
}

function extractPlistNode(xml: string): string | null {
  const prog = xml.match(
    /<key>ProgramArguments<\/key>\s*<array>([\s\S]*?)<\/array>/,
  );
  if (!prog) return null;
  const first = prog[1].match(/<string>([^<]*)<\/string>/);
  return first ? first[1] : null;
}

function checkNodePathGuard(): CheckResult {
  const plistPath =
    process.env.WEAVELOG_CHECK_PLIST ??
    join(HOME, "Library", "LaunchAgents", "com.weavelog.check.plist");
  if (!existsSync(plistPath)) {
    return {
      skip: true,
      detail: `plist absent (${plistPath}) — node-path guard skipped`,
    };
  }
  const nodePath = extractPlistNode(readFileSync(plistPath, "utf8"));
  if (nodePath === null) {
    return {
      ok: false,
      detail: `node-path guard: ${plistPath} is present but pins no node path in ProgramArguments`,
    };
  }
  if (!existsSync(nodePath)) {
    return {
      ok: false,
      detail: `node-path guard: ${plistPath} pins ${nodePath} which is MISSING — install node there or repin the plist (engines.node >= ${readEnginesNode()})`,
    };
  }
  const output = runBin(nodePath, ["--version"]);
  const version = output.split("\n")[0] ?? output;
  const major = Number((version.match(/(\d+)/) ?? [])[1] ?? 0);
  if (major >= readEnginesNode()) {
    return {
      ok: true,
      detail: `pinned node ${version} satisfies engines.node >= ${readEnginesNode()}`,
    };
  }
  return {
    ok: false,
    detail: `node-path guard: pinned node ${version} at ${nodePath} is older than engines.node >= ${readEnginesNode()}`,
  };
}

function checkNodeVersion(): CheckResult {
  const major = Number(process.versions.node.split(".")[0] ?? 0);
  const min = readEnginesNode();
  if (major >= min) {
    return {
      ok: true,
      detail: `node ${process.versions.node} >= engines.node ${min}`,
    };
  }
  return {
    ok: false,
    detail: `node ${process.versions.node} < engines.node ${min}`,
  };
}

// --- doctor -----------------------------------------------------------------

function checkManifestParse(): CheckResult {
  try {
    readManifest();
    return { ok: true, detail: "weavelog.json parses" };
  } catch (err) {
    return {
      ok: false,
      detail: `weavelog.json unparseable: ${(err as Error).message}`,
    };
  }
}

function checkPayloadIntegrity(): CheckResult {
  const required = [
    "AGENTS.md",
    "config/opencode.jsonc",
    "config/harnesses/opencode.json",
    "config/agents",
    "config/prompts",
    "skills",
  ];
  const missing = required.filter((rel) => !existsSync(join(PAYLOAD_DIR, rel)));
  return {
    ok: missing.length === 0,
    detail:
      missing.length === 0
        ? "payload files present"
        : `payload missing: ${missing.join(", ")}`,
  };
}

function checkTemplatingSanity(): CheckResult {
  const files = [
    join(PAYLOAD_DIR, "AGENTS.md"),
    ...walkFiles(join(PAYLOAD_DIR, "config")),
  ];
  const bad: string[] = [];
  for (const file of files) {
    const content = readFileSync(file, "utf8");
    for (const m of content.matchAll(/\{\{\s*([A-Za-z0-9_]+)\s*\}\}/g)) {
      if (!KNOWN_TOKENS.has(m[1]))
        bad.push(`${relative(PAYLOAD_DIR, file)}: {{${m[1]}}}`);
    }
  }
  return {
    ok: bad.length === 0,
    detail:
      bad.length === 0
        ? "payload tokens resolve only from .env (WEAVELOG_HOME, WEAVELOG_CONFIG_HOME)"
        : `non-.env tokens found: ${bad.join(", ")}`,
  };
}

function checkSkillsLayout(): CheckResult {
  const skillsRoot = join(PAYLOAD_DIR, "skills");
  const problems: string[] = [];
  for (const full of walkFiles(skillsRoot)) {
    if (lstatSync(full).isSymbolicLink())
      problems.push(`${relative(PAYLOAD_DIR, full)} is a symlink`);
  }
  for (const entry of readdirSync(skillsRoot, { withFileTypes: true })) {
    if (!entry.isDirectory() || entry.name === ".DS_Store") continue;
    const skillMd = join(skillsRoot, entry.name, "SKILL.md");
    if (!existsSync(skillMd)) {
      problems.push(`${entry.name}/SKILL.md missing`);
      continue;
    }
    const content = readFileSync(skillMd, "utf8");
    if (!/^license: /m.test(content))
      problems.push(`${entry.name}/SKILL.md missing license line`);
    if (!/^upstream:/m.test(content))
      problems.push(`${entry.name}/SKILL.md missing upstream line`);
  }
  return {
    ok: problems.length === 0,
    detail:
      problems.length === 0
        ? "skills layout clean (no symlinks, license/upstream present)"
        : `skills problems: ${problems.join("; ")}`,
  };
}

function checkOpenCodeAdapters(): CheckResult {
  const health = inspectOpenCodeAdapters({
    packageRoot: packageRootValue(),
    configRoot: configHomeValue(),
    stateDir: stateDir(),
  });
  return { ok: health.ok, detail: health.detail };
}

async function checkProxyHealth(): Promise<CheckResult> {
  const bin =
    process.env.WEAVELOG_HEADROOM_BIN ??
    join(HOME, ".local", "bin", "headroom");
  if (!existsSync(bin)) {
    return {
      warn: true,
      detail: `proxy :8788 health skipped (headroom binary absent at ${bin})`,
    };
  }
  try {
    const res = await fetch("http://127.0.0.1:8788/health", {
      signal: AbortSignal.timeout(3000),
    });
    const body = (await res.json()) as { status?: string; ready?: boolean };
    const healthy = body.ready === true || body.status === "healthy";
    return {
      ok: healthy,
      detail: healthy
        ? "proxy :8788 healthy"
        : `proxy :8788 unhealthy: ${JSON.stringify(body)}`,
    };
  } catch (err) {
    return {
      ok: false,
      detail: `proxy :8788 unreachable: ${(err as Error).message}`,
    };
  }
}

function checkBacklogBinary(): CheckResult {
  const bin =
    process.env.WEAVELOG_BACKLOG_BIN ?? join(HOME, ".bun", "bin", "backlog");
  if (existsSync(bin))
    return { ok: true, detail: `backlog binary present at ${bin}` };
  return { ok: false, detail: `backlog binary missing at ${bin}` };
}

/** Stage content beside the target (same dir), then rename — rename is
 * atomic on the same volume and never follows the destination, closing the
 * preflight-to-write TOCTOU window on a swapped-in symlink leaf. Scoped by
 * runId so two concurrent runs cannot cross-install each other's bytes. */
function stagingPathFor(target: DeclaredTarget, runId: string): string {
  return join(dirname(target.livePath), `.${target.targetId}.${runId}.staging`);
}

function printCheckLine(marker: string, id: string, detail: string): void {
  console.log(`[${marker}] ${id} — ${detail}`);
}

// --- install guard (AC #6) -------------------------------------------------

function installReportFields(installed: InstalledPackage | null): {
  resolvedPackageRoot: string | null;
  resolvedBinPath: string | null;
} {
  return {
    resolvedPackageRoot: installed?.packageRoot ?? null,
    resolvedBinPath: installed?.binPath ?? null,
  };
}

/**
 * AC #6: refuse before any materialization when the resolved installed
 * package is stale or shadowed, so a stale or shadowed install never
 * materializes silently. The refusal applies only when the resolved bin
 * exists — i.e. the CLI runs from a real build/install. From a bare source
 * checkout (bin not built) the payload being materialized IS the source, so
 * nothing stale is silently materialized; the report still records the
 * resolved package.
 */
function checkInstallGuard(installed: InstalledPackage | null): string | null {
  if (installed === null) return null;
  if (!existsSync(installed.binPath)) return null;
  const shadows = findPathShadows(installed.binPath, process.env.PATH ?? "");
  if (shadows.length > 0) {
    return `another weavelog install shadows the resolved bin on PATH: ${shadows.join(", ")} — remove the shadowing install or reinstall so the resolved bin (${installed.binPath}) is the one reached on PATH`;
  }
  // The installed package IS the materialization source (its own payload):
  // nothing to compare against.
  if (resolve(installed.payloadRoot) === resolve(PAYLOAD_DIR)) return null;
  const stale = stalePayloadFiles(
    hashPayloadFiles(installed.payloadRoot),
    hashPayloadFiles(PAYLOAD_DIR),
  );
  if (stale.length > 0) {
    return `installed weavelog payload is older than the repo payload being materialized (${stale.length} stale file(s), e.g. ${stale[0]}) — rebuild and reinstall the package (npm run build && npm install -g .), then re-run`;
  }
  return null;
}

/** Add the resolved install fields to a config-sync JSON report (additive). */
function augmentSyncReport(
  stdout: string,
  installed: InstalledPackage | null,
): string {
  if (installed === null) return stdout;
  let report: unknown;
  try {
    report = JSON.parse(stdout);
  } catch {
    return stdout; // not a JSON report — pass through untouched
  }
  if (report === null || typeof report !== "object" || Array.isArray(report))
    return stdout;
  const out = report as Record<string, unknown>;
  out.resolvedPackageRoot = installed.packageRoot;
  out.resolvedBinPath = installed.binPath;
  return `${JSON.stringify(out, null, 2)}\n`;
}

// --- materialize (init / update) --------------------------------------------

/** Per-target preflight outcome bound to its declared target. */
interface TargetPlan {
  target: DeclaredTarget;
  decision: TargetDecision;
}

function materializeArgs(force: boolean, yes: boolean): string[] {
  return [...(force ? ["--force"] : []), ...(yes ? ["--yes"] : [])];
}

function targetReport(p: TargetPlan): {
  liveRel: string;
  action: string;
  reason?: string;
} {
  if (p.decision.action === "refuse")
    return {
      liveRel: p.target.liveRel,
      action: "refused",
      reason: p.decision.reason,
    };
  const action =
    p.decision.action === "replace" ? "replaced" : p.decision.action;
  return { liveRel: p.target.liveRel, action };
}

function renderToBuffer(
  sourcePath: string,
  tokens: Record<string, string>,
): Buffer {
  return Buffer.from(
    renderTemplate(readFileSync(sourcePath, "utf8"), tokens, sourcePath),
    "utf8",
  );
}

/**
 * Interactive --force confirmation: shows every target to be replaced plus
 * the replacement warning, then requires an explicit y/yes. EOF or a read
 * error is treated as a decline — never a silent permit.
 */
async function confirmReplacement(
  liveRels: string[],
  command: string,
): Promise<boolean> {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  try {
    const answer = await rl.question(
      `weavelog ${command}: ${liveRels.length} declared target(s) hold unowned or changed content and will be REPLACED after an opaque backup:\n  ${liveRels.join("\n  ")}\nReplace them? [y/N] `,
    );
    const a = (answer ?? "").trim().toLowerCase();
    return a === "y" || a === "yes";
  } catch {
    return false; // EOF / read error — decline
  } finally {
    rl.close();
  }
}

/**
 * The shared materialization pipeline for `weavelog init` and `weavelog
 * update` (TASK-29 slices 5+6; docs/trd/cli-vision.md "Ownership and
 * replacement"): resolve the installed package + AC #6 guard, read the
 * harness manifest and profile layer, build every declared target, run the
 * whole-run preflight state machine (decideTargetAction), refuse all-or-
 * nothing on any conflict, gate --force replacements (TTY confirm or
 * --force --yes), then journal intent -> write -> journal completion with
 * opaque backups and safe-only rollback. The two commands differ only in
 * the command name recorded in journal/ledger entries and the confirmation
 * prompt prefix — never in the preflight or replacement rules.
 */
async function runMaterialize(
  command: "init" | "update",
  force: boolean,
  yes: boolean,
  interactive: boolean,
): Promise<never> {
  const installed = resolveInstalledPackage(import.meta.url);
  const guard = checkInstallGuard(installed);
  if (guard !== null) {
    console.error(`refusal: ${guard}`);
    finish({
      command,
      args: materializeArgs(force, yes),
      filesTouched: [],
      decisions: [],
      errors: [guard],
      exitCode: 1,
      ...installReportFields(installed),
    });
  }
  if (installed === null) {
    const msg =
      "cannot resolve the installed weavelog package (no package.json payload context) — install weavelog, then re-run";
    console.error(`refusal: ${msg}`);
    finish({
      command,
      args: materializeArgs(force, yes),
      filesTouched: [],
      decisions: [],
      errors: [msg],
      exitCode: 1,
      resolvedPackageRoot: null,
      resolvedBinPath: null,
    });
  }
  const payloadRoot = installed.payloadRoot;
  const manifest = readHarnessManifest(
    join(payloadRoot, "config", "harnesses", "opencode.json"),
  );
  const harness = manifest.harness;
  const configLiveRoot = process.env.WEAVELOG_CONFIG_HOME
    ? resolve(process.env.WEAVELOG_CONFIG_HOME)
    : resolve(expandHome(manifest.liveRoot));
  const trackedRoot = resolve(payloadRoot, manifest.trackedRoot);
  const state = stateDir();

  // profiles + render tokens (precedence: flags > answers > profile > defaults)
  const profilesDir = defaultProfilesDir();
  const profileId = "personal";
  const profileResult = readProfile(profilesDir, profileId);
  if (!profileResult.ok) {
    console.error(
      `refusal: profile layer unusable: ${profileResult.error.message}`,
    );
    finish({
      command,
      args: materializeArgs(force, yes),
      filesTouched: [],
      decisions: [],
      errors: [profileResult.error.message],
      exitCode: 1,
      ...installReportFields(installed),
    });
  }
  const profile = profileResult.value ?? {
    id: profileId,
    choices: {},
    secretRefs: {},
  };
  const weavelogHome = process.env.WEAVELOG_LIVE_ROOT ?? join(HOME, ".agents");
  const resolved = resolveInputs({
    flags: {},
    answers: {},
    profile,
    defaults: {
      WEAVELOG_HOME: weavelogHome,
      WEAVELOG_CONFIG_HOME: configLiveRoot,
    },
  });
  const tokens: Record<string, string> = { ...tokensFromProfile(profile) };
  for (const [key, value] of Object.entries(resolved.values)) {
    tokens[key.toUpperCase().replace(/[^A-Z0-9]+/g, "_")] = value;
  }

  // declared targets from the INSTALLED payload manifest
  const fileTargets = declaredTargetsFromFiles({
    liveRoot: configLiveRoot,
    trackedRoot,
    files: manifest.files,
    exclusions: manifest.exclusions,
  });
  const buildRefusals: { liveRel: string; reason: string }[] = [
    ...fileTargets.refusals,
  ];
  let skillTargets: {
    targets: DeclaredTarget[];
    refusals: { liveRel: string; reason: string }[];
  } = { targets: [], refusals: [] };
  if (manifest.skills) {
    skillTargets = declaredTargetsFromSkills({
      liveRoot: resolve(expandHome(manifest.skills.liveRoot)),
      trackedRoot: resolve(payloadRoot, manifest.skills.trackedRoot),
      dirs: manifest.skills.dirs,
    });
    buildRefusals.push(...skillTargets.refusals);
  }
  if (buildRefusals.length > 0) {
    const errors = buildRefusals.map(
      (b) => `${b.reason} — target ${b.liveRel}`,
    );
    for (const e of errors) console.error(`refusal: ${e}`);
    finish({
      command,
      args: materializeArgs(force, yes),
      filesTouched: [],
      decisions: [],
      errors,
      exitCode: 1,
      ...installReportFields(installed),
    });
  }
  const targets = [...fileTargets.targets, ...skillTargets.targets];

  // whole-run preflight: evaluate EVERY declared target before ANY write
  // A symlinked managed parent (e.g. ~/.config/opencode -> dotfiles/, or a
  // symlinked ~/.agents/skills) is a refusal for that target: cli-vision.md —
  // "Symlink, special file, or symlinked managed parent -> Refuse the run /
  // Never follow or replace". The walk is PER-TARGET (each target carries its
  // own live root) and INCLUSIVE of the root itself — a symlinked root is the
  // exact dotfiles scenario the contract calls out.
  const symlinkedParentOf = (target: DeclaredTarget): string | null => {
    const stop = resolve(target.liveRoot);
    let cur = dirname(target.livePath);
    for (;;) {
      const inside = cur === stop || cur.startsWith(`${stop}${sep}`);
      if (!inside) return null;
      try {
        if (lstatSync(cur).isSymbolicLink()) return cur;
      } catch {
        // missing component is not a symlink — keep walking up; a symlinked
        // ancestor up to and including the managed root is still a refusal
        // (fresh machines have missing intermediates below a symlinked root)
      }
      if (cur === stop) return null;
      cur = dirname(cur);
    }
  };
  const runId = randomUUID();
  const planned: TargetPlan[] = [];
  for (const target of targets) {
    let st: Stats | null = null;
    try {
      st = lstatSync(target.livePath);
    } catch {
      st = null;
    }
    const exists = st !== null;
    const isSymlink = st?.isSymbolicLink() ?? false;
    const isFile = st?.isFile() ?? false;
    const hash =
      exists && isFile && !isSymlink ? sha256File(target.livePath) : null;
    const ownedResult = readActiveProfile(state, harness, target.targetId);
    const journal = journalStateFor(state, target.targetId);
    let decision = decideTargetAction(
      {
        exists,
        isSymlink,
        isFile,
        hash,
        owned: ownedResult.ok && ownedResult.value !== null,
        ownershipAmbiguous: !ownedResult.ok,
        recordedHash: journal.recordedHash,
        interrupted: journal.interrupted,
        interruptNote: journal.interruptNote,
      },
      {
        force,
        eligibleForForce: target.eligibleForForce,
        runId,
        targetId: target.targetId,
      },
    );
    const badParent =
      decision.action === "refuse" ? null : symlinkedParentOf(target);
    if (badParent !== null) {
      decision = {
        action: "refuse",
        reason: `symlinked managed parent directory — never following links (${relative(target.liveRoot, badParent)} under its managed root)`,
      };
    }
    if (decision.action === "replace") {
      const backupPath = join(state, "backups", decision.backupRef);
      let backupSt: Stats | null = null;
      try {
        backupSt = lstatSync(backupPath);
      } catch {
        backupSt = null;
      }
      if (backupSt !== null) {
        decision = {
          action: "refuse",
          reason: `backup path already exists (${decision.backupRef}) — a backup is never overwritten`,
        };
      }
    }
    planned.push({ target, decision });
  }

  // all-or-nothing: one refusal refuses the whole run, zero writes
  const refusalReason = (d: TargetDecision): string =>
    d.action === "refuse" ? d.reason : "";
  const refusals = planned.filter((p) => p.decision.action === "refuse");
  if (refusals.length > 0) {
    const errors = refusals.map(
      (p) => `${refusalReason(p.decision)} — target ${p.target.liveRel}`,
    );
    for (const e of errors) console.error(`refusal: ${e}`);
    finish({
      command,
      args: materializeArgs(force, yes),
      filesTouched: [],
      decisions: [],
      errors,
      exitCode: 1,
      targets: refusals.map((p) => ({
        liveRel: p.target.liveRel,
        action: "refused",
        reason: refusalReason(p.decision),
      })),
      ...installReportFields(installed),
    });
  }

  // --force confirmation gate: TTY prompt, or --force --yes noninteractively
  const replacing = planned.filter((p) => p.decision.action === "replace");
  if (replacing.length > 0) {
    const confirmed = interactive
      ? await confirmReplacement(
          replacing.map((p) => p.target.liveRel),
          command,
        )
      : force && yes;
    if (!confirmed) {
      const errors = replacing.map(
        (p) =>
          `replacement declined for ${p.target.liveRel} — --force requires TTY confirmation, or --force --yes noninteractively`,
      );
      for (const e of errors) console.error(`refusal: ${e}`);
      finish({
        command,
        args: materializeArgs(force, yes),
        filesTouched: [],
        decisions: [],
        errors,
        exitCode: 1,
        targets: planned.map((p) =>
          p.decision.action === "replace"
            ? {
                liveRel: p.target.liveRel,
                action: "refused",
                reason: "replacement declined",
              }
            : targetReport(p),
        ),
        ...installReportFields(installed),
      });
    }
  }

  // phase A: ownership records (immutable snapshots + active-profile receipts)
  // BEFORE any target write — a crash here self-heals on the next run via the
  // create/update path, never a silent adoption.
  const stateErrors: string[] = [];
  for (const p of planned) {
    const snap = writeSnapshot(
      state,
      harness,
      p.target.targetId,
      profileId,
      resolved.values,
    );
    if (!snap.ok) {
      stateErrors.push(`snapshot write failed: ${snap.error.message}`);
      continue;
    }
    const ap = writeActiveProfile(state, harness, p.target.targetId, {
      profileId,
      snapshotSha256: snap.value.snapshotSha256,
      updatedAt: new Date().toISOString(),
    });
    if (!ap.ok)
      stateErrors.push(`active-profile write failed: ${ap.error.message}`);
  }
  if (stateErrors.length > 0) {
    for (const e of stateErrors) console.error(`refusal: ${e}`);
    finish({
      command,
      args: materializeArgs(force, yes),
      filesTouched: [],
      decisions: [],
      errors: stateErrors,
      exitCode: 1,
      targets: planned.map(targetReport),
      ...installReportFields(installed),
    });
  }

  // phase B: mutations — create/update write staged content directly;
  // replacements follow the journaled backup-then-install sequence.
  const filesTouched: string[] = [];
  const errors: string[] = [];
  for (const p of planned) {
    const { target, decision } = p;
    const newContent =
      target.kind === "render"
        ? renderToBuffer(target.sourcePath, tokens)
        : readFileSync(target.sourcePath);
    const stateHash = sha256Of(newContent);
    if (decision.action === "create" || decision.action === "update") {
      // intent WITHOUT stateHash: a crash before the rename leaves no
      // recorded hash, so the next run honestly refuses (missing state)
      // instead of comparing against bytes never installed
      writeJournal(state, {
        ts: new Date().toISOString(),
        command,
        runId,
        phase: "intent",
        target: {
          targetId: target.targetId,
          liveRel: target.liveRel,
          action: decision.action,
        },
      });
      mkdirSync(dirname(target.livePath), { recursive: true });
      writeFileSync(stagingPathFor(target, runId), newContent, { mode: 0o644 });
      renameSync(stagingPathFor(target, runId), target.livePath);
      writeJournal(state, {
        ts: new Date().toISOString(),
        command,
        runId,
        phase: "completion",
        target: {
          targetId: target.targetId,
          liveRel: target.liveRel,
          action: decision.action,
          stateHash,
        },
      });
      filesTouched.push(target.liveRel);
      continue;
    }
    if (decision.action === "replace") {
      // replacement step 3: durable journal intent BEFORE changing the target
      writeJournal(state, {
        ts: new Date().toISOString(),
        command,
        runId,
        phase: "intent",
        target: {
          targetId: target.targetId,
          liveRel: target.liveRel,
          action: "replaced",
          backupRef: decision.backupRef,
          liveHashBefore: decision.liveHashBefore,
        },
      });
      // step 4: move the prior file to a unique opaque .bak (never overwrite)
      const backupPath = join(state, "backups", decision.backupRef);
      mkdirSync(dirname(backupPath), { recursive: true, mode: 0o700 });
      const backupMode = lstatSync(target.livePath).mode & 0o777;
      renameSync(target.livePath, backupPath);
      chmodSync(backupPath, 0o600);
      // step 5: install the staged file, then journal completion
      try {
        mkdirSync(dirname(target.livePath), { recursive: true });
        writeFileSync(stagingPathFor(target, runId), newContent, {
          mode: 0o644,
        });
        renameSync(stagingPathFor(target, runId), target.livePath);
      } catch (err) {
        // safe failure: clean the staged file, restore the original, record
        try {
          rmSync(stagingPathFor(target, runId), { force: true });
        } catch {
          // staging cleanup is best-effort
        }
        let restored = false;
        try {
          renameSync(backupPath, target.livePath);
          chmodSync(target.livePath, backupMode);
          restored = true;
        } catch {
          // restore failed — the backup stays under state/backups and the
          // dangling intent keeps the target interrupted (no rollback line:
          // clearing the marker would pretend the original is back)
        }
        if (restored) {
          writeJournal(state, {
            ts: new Date().toISOString(),
            command,
            runId,
            phase: "rollback",
            target: {
              targetId: target.targetId,
              liveRel: target.liveRel,
              action: "rollback",
              backupRef: decision.backupRef,
              // the restored bytes ARE the pre-replace live bytes — recording
              // them keeps the ownership receipt consistent with the journal
              stateHash: decision.liveHashBefore,
            },
          });
          errors.push(
            `replacement failed for ${target.liveRel}: ${(err as Error).message} — original restored from backup (${decision.backupRef})`,
          );
        } else {
          errors.push(
            `replacement failed for ${target.liveRel}: ${(err as Error).message} — original NOT restored; it remains at backup ${decision.backupRef} (the next run refuses until resolved)`,
          );
        }
        continue;
      }
      writeJournal(state, {
        ts: new Date().toISOString(),
        command,
        runId,
        phase: "completion",
        target: {
          targetId: target.targetId,
          liveRel: target.liveRel,
          action: "replaced",
          backupRef: decision.backupRef,
          stateHash,
        },
      });
      filesTouched.push(target.liveRel);
    }
  }

  // OpenCode adapters from the INSTALLED package (fan-out: dist/hooks
  // referenced from generated loaders).
  for (const adapter of emitOpenCodeAdapters({
    packageRoot: installed.packageRoot,
    configRoot: configLiveRoot,
    stateDir: state,
  })) {
    filesTouched.push(relative(configLiveRoot, adapter.path));
  }

  finish({
    command,
    args: materializeArgs(force, yes),
    filesTouched,
    decisions: [`materialized ${filesTouched.length} target(s)`],
    errors,
    exitCode: errors.length > 0 ? 1 : 0,
    targets: planned.map(targetReport),
    ...installReportFields(installed),
  });
}

/** `weavelog init`: the shared pipeline under the init identity. */
function runInit(
  force: boolean,
  yes: boolean,
  interactive: boolean,
): Promise<never> {
  return runMaterialize("init", force, yes, interactive);
}

/** `weavelog update`: the same pipeline under the update identity (slice 6). */
function runUpdate(
  force: boolean,
  yes: boolean,
  interactive: boolean,
): Promise<never> {
  return runMaterialize("update", force, yes, interactive);
}

// --- sync -------------------------------------------------------------------

function resolveConfigSync(): { path: string; tsx: boolean } {
  return toolScript("config-sync");
}

function runSync(): never {
  const installed = resolveInstalledPackage(import.meta.url);
  const guard = checkInstallGuard(installed);
  if (guard !== null) {
    console.error(`refusal: ${guard}`);
    finish({
      command: "sync",
      args: [],
      filesTouched: [],
      decisions: [],
      errors: [guard],
      exitCode: 1,
      ...installReportFields(installed),
    });
  }
  const sync = resolveConfigSync();
  const liveRoot = liveRootValue();
  const dotenv = ensureDotenv(liveRoot);
  const tokens = {
    WEAVELOG_HOME: liveRoot,
    WEAVELOG_CONFIG_HOME: configHomeValue(dotenv),
  };
  const renderedRoot = renderPayloadToTemp(tokens);
  const args = [
    "--harness-manifest",
    join(PAYLOAD_DIR, "config", "harnesses", "opencode.json"),
    "--tracked-root",
    renderedRoot,
    "--live-root",
    configHomeValue(dotenv),
    "--state",
    join(stateDir(), "config-materialize.json"),
  ];
  const spawnArgs = sync.tsx
    ? [process.execPath, "--import", "tsx", sync.path, ...args]
    : [process.execPath, sync.path, ...args];
  const r = spawnSync(spawnArgs[0], spawnArgs.slice(1), {
    encoding: "utf8",
    timeout: 120_000,
  });
  if (r.stdout) process.stdout.write(augmentSyncReport(r.stdout, installed));
  if (r.stderr) process.stderr.write(r.stderr);
  const status = r.status ?? 1;
  if (status !== 0) {
    finish({
      command: "sync",
      args,
      filesTouched: [],
      decisions: [],
      errors: [`config-sync exited ${String(r.status)}`],
      exitCode: status,
      ...installReportFields(installed),
    });
  }
  finish({
    command: "sync",
    args,
    filesTouched: [],
    decisions: ["config-sync ok (or no-op)"],
    errors: [],
    exitCode: 0,
    ...installReportFields(installed),
  });
}

// --- versions (report-only tool-version report; renamed from `update` so the
// materialization refresh owns the contract `update` name) ------------------

const CHANNEL_NOTES: Record<string, string> = {
  pipx: "pipx install --force <tool>==<pinned>",
  npm: "npm install -g <tool>@<pinned>",
  app: "reinstall the app at the pinned version (see docs/cli.md)",
  git: "git -C <skills>/<tool> checkout <pinned>",
};

function runVersions(): never {
  const manifest = readManifest();
  const results = stackVersionChecks(manifest);
  const failures = results.filter((r) => !r.ok);
  for (const r of results)
    printCheckLine(r.ok ? "pass" : "fail", r.id, r.detail);
  if (failures.length === 0) {
    console.log("versions: all tools at pinned versions — healthy setup");
    finish({
      command: "versions",
      args: [],
      filesTouched: [],
      decisions: ["no updates required"],
      errors: [],
      exitCode: 0,
    });
  }
  const errors: string[] = [];
  for (const f of failures) {
    const tool = Object.entries(manifest.tools).find(
      ([, spec]) => spec.check === f.id,
    )?.[0];
    if (!tool) continue;
    const spec = manifest.tools[tool];
    const note = (CHANNEL_NOTES[spec.channel] ?? "manual update")
      .replaceAll("<tool>", tool)
      .replaceAll("<pinned>", spec.version)
      .replaceAll("<skills>", skillsDir());
    console.error(`versions: ${f.id} — ${f.detail}`);
    console.error(`versions:   apply: ${note}`);
    console.error(
      `versions:   rollback hint: revert ${tool} to the previous pinned version from weavelog.json git history`,
    );
    errors.push(`${f.id}: ${f.detail}`);
  }
  console.error(
    "versions: refusing — drift found (report-only; nothing was changed)",
  );
  finish({
    command: "versions",
    args: [],
    filesTouched: [],
    decisions: ["drift reported; no updates applied"],
    errors,
    exitCode: 1,
  });
}

// --- check ------------------------------------------------------------------

function runPreCommit(): never {
  const pin = pinHygieneForDir(process.cwd(), true);
  if (pin.status === "fail") {
    console.error(`[fail] deps.pin-hygiene — ${pin.detail}`);
    finish({
      command: "check",
      args: ["--pre-commit"],
      filesTouched: [],
      decisions: [],
      errors: [pin.detail],
      exitCode: 1,
    });
  }
  if (pin.status === "skip") {
    console.log(`[skip] deps.pin-hygiene — ${pin.detail}`);
  } else {
    printCheckLine("pass", "deps.pin-hygiene", pin.detail);
  }
  const privacy = privacyAuditForDir(process.cwd(), { source: "index" });
  if (privacy.status === "fail") {
    console.error(`[fail] privacy — ${privacy.detail}`);
    finish({
      command: "check",
      args: ["--pre-commit"],
      filesTouched: [],
      decisions: [],
      errors: [privacy.detail],
      exitCode: 1,
    });
  }
  if (privacy.status === "skip") {
    console.log(`[skip] privacy — ${privacy.detail}`);
  } else {
    printCheckLine("pass", "privacy", privacy.detail);
  }
  const { path: tvPath, tsx } = toolScript("task-validate");
  const prefix = tsx ? ["--import", String(import.meta.resolve("tsx"))] : [];
  const r = spawnSync(process.execPath, [...prefix, tvPath, "--pre-commit"], {
    encoding: "utf8",
    cwd: process.cwd(),
    timeout: 60_000,
  });
  if (r.stdout) process.stdout.write(r.stdout);
  if (r.stderr) process.stderr.write(r.stderr);
  finish({
    command: "check",
    args: ["--pre-commit"],
    filesTouched: [],
    decisions: [`task-validate --pre-commit exit ${r.status}`],
    errors: [],
    exitCode: r.status ?? 1,
  });
}

// --- workspace verification subchecks (TASK-73 AC#2) ------------------------

interface SubCheck {
  id: string;
  ok: boolean;
  skip?: boolean;
  detail: string;
}

const WORKSPACE_SCRIPT_CHECKS: { id: string; script: string }[] = [
  { id: "workspace.test", script: "test" },
  { id: "workspace.lint", script: "lint" },
  { id: "workspace.typecheck", script: "typecheck" },
];

function workspaceScripts(
  cwd: string,
): { scripts: Record<string, string> } | { error: string } | null {
  const pkg = join(cwd, "package.json");
  if (!existsSync(pkg)) return null;
  try {
    const parsed = JSON.parse(readFileSync(pkg, "utf8")) as {
      scripts?: Record<string, string>;
    };
    return { scripts: parsed.scripts ?? {} };
  } catch (err) {
    return { error: `package.json unparseable: ${(err as Error).message}` };
  }
}

function redactSecretLines(text: string): string {
  return text
    .split("\n")
    .map((line) =>
      PRIVACY_RULES.some((rule) => rule.pattern.test(line))
        ? "[redacted]"
        : line,
    )
    .join("\n");
}

function tailLines(text: string, count = 5): string {
  return redactSecretLines(text).trim().split("\n").slice(-count).join(" | ");
}

/** Run the workspace's own test/lint/typecheck scripts, guarded against re-entry. */
function runWorkspaceSubchecks(cwd: string): SubCheck[] {
  if (process.env.WEAVELOG_CHECK_INNER === "1") {
    return WORKSPACE_SCRIPT_CHECKS.map((c) => ({
      id: c.id,
      ok: true,
      skip: true,
      detail: "nested check; workspace subcheck skipped",
    }));
  }
  const found = workspaceScripts(cwd);
  if (found !== null && "error" in found) {
    return WORKSPACE_SCRIPT_CHECKS.map((c) => ({
      id: c.id,
      ok: false,
      detail: found.error,
    }));
  }
  const out: SubCheck[] = [];
  for (const check of WORKSPACE_SCRIPT_CHECKS) {
    if (found === null) {
      out.push({
        id: check.id,
        ok: true,
        skip: true,
        detail: "no package.json in workspace",
      });
      continue;
    }
    if (typeof found.scripts[check.script] !== "string") {
      out.push({
        id: check.id,
        ok: true,
        skip: true,
        detail: `no ${check.script} script`,
      });
      continue;
    }
    const r = spawnSync("npm", ["run", check.script, "--silent"], {
      cwd,
      encoding: "utf8",
      timeout: 600_000,
      maxBuffer: 64 * 1024 * 1024,
      env: { ...process.env, WEAVELOG_CHECK_INNER: "1" },
    });
    if (r.status === 0) {
      out.push({
        id: check.id,
        ok: true,
        detail: `npm run ${check.script} passed`,
      });
      continue;
    }
    const why = r.error ? ` (${r.error.message})` : "";
    const detail = `npm run ${check.script} failed (exit ${r.status ?? "none"})${why}: ${tailLines(
      `${r.stdout ?? ""}${r.stderr ?? ""}`,
    )}`;
    out.push({ id: check.id, ok: false, detail });
  }
  return out;
}

/** Production dependency audit via the TASK-63 audit gate. */
function runSecurityAudit(cwd: string): SubCheck {
  const id = "security.audit";
  if (process.env.WEAVELOG_CHECK_INNER === "1") {
    return {
      id,
      ok: true,
      skip: true,
      detail: "nested check; audit subcheck skipped",
    };
  }
  if (
    !existsSync(join(cwd, "package.json")) ||
    !existsSync(join(cwd, "package-lock.json"))
  ) {
    return {
      id,
      ok: true,
      skip: true,
      detail: "no package-lock.json in workspace",
    };
  }
  const r = spawnSync("npm", ["audit", "--omit=dev", "--json"], {
    cwd,
    encoding: "utf8",
    timeout: 120_000,
    maxBuffer: 64 * 1024 * 1024,
    env: { ...process.env, WEAVELOG_CHECK_INNER: "1" },
  });
  const text = r.stdout ?? "";
  if (!text.trim()) {
    const why = r.error ? ` (${r.error.message})` : "";
    return {
      id,
      ok: true,
      skip: true,
      detail: `npm audit produced no report (offline or unavailable)${why}`,
    };
  }
  let report: NpmAuditReport;
  try {
    report = parseAuditReport(text);
  } catch (err) {
    return {
      id,
      ok: true,
      skip: true,
      detail: `npm audit unavailable: ${(err as Error).message}`,
    };
  }
  const exceptionsPath = join(cwd, ".github", "audit-exceptions.json");
  let exceptions: AuditException[] = [];
  try {
    if (existsSync(exceptionsPath)) {
      exceptions = parseExceptions(readFileSync(exceptionsPath, "utf8"));
    }
  } catch (err) {
    return {
      id,
      ok: false,
      detail: `audit exceptions unreadable: ${(err as Error).message}`,
    };
  }
  const result = evaluateAuditGate(report, exceptions, new Date());
  return { id, ok: result.ok, detail: result.detail };
}

async function runCheck(stackOnly: boolean): Promise<never> {
  const manifest = readManifest();
  const results = stackVersionChecks(manifest);
  const pin = pinHygieneForDir(REPO_ROOT, false);
  results.push({
    id: "deps.pin-hygiene",
    ok: pin.status !== "fail",
    detail: pin.detail,
  });
  if (!stackOnly) {
    const privacy = privacyAuditForDir(process.cwd());
    results.push({
      id: "privacy",
      ok: privacy.status !== "fail",
      skip: privacy.status === "skip",
      detail: privacy.detail,
    });
    for (const sub of runWorkspaceSubchecks(process.cwd())) results.push(sub);
    results.push(runSecurityAudit(process.cwd()));
    const guard = checkNodePathGuard();
    const proxy = await checkProxyHealth();
    const risk = runRiskSignalsCheck();
    if (risk) results.push(risk);
    const driftLiveRoot = configHomeValue();
    const driftTokens = {
      WEAVELOG_HOME: liveRootValue(ensureDotenv(liveRootValue())),
      WEAVELOG_CONFIG_HOME: driftLiveRoot,
    };
    const drift = checkConfigDrift({
      trackedRoot: renderPayloadToTemp(driftTokens),
      liveRoot: driftLiveRoot,
      harnessManifestPath: join(
        PAYLOAD_DIR,
        "config",
        "harnesses",
        "opencode.json",
      ),
    });
    results.push({
      id: "proxy.health",
      ok: proxy.ok === true,
      detail: proxy.detail,
    });
    results.push({
      id: "config.drift",
      ok: drift.drift.length === 0,
      detail:
        drift.drift.length === 0
          ? "tracked payload matches live config root"
          : `config drift: ${drift.drift.join("; ")}`,
    });
    if (guard.skip) {
      results.push({ id: "node.path-guard", ok: true, detail: guard.detail });
    } else {
      results.push({
        id: "node.path-guard",
        ok: guard.ok === true,
        detail: guard.detail,
      });
    }
  } else {
    const guard = checkNodePathGuard();
    if (guard.skip) {
      results.push({ id: "node.path-guard", ok: true, detail: guard.detail });
    } else {
      results.push({
        id: "node.path-guard",
        ok: guard.ok === true,
        detail: guard.detail,
      });
    }
  }
  const failures = results.filter((r) => !r.ok);
  for (const r of results) {
    const marker = r.ok ? (r.skip === true ? "skip" : "pass") : "fail";
    printCheckLine(marker, r.id, r.detail);
  }
  if (stackOnly) {
    console.log(
      `check --stack-only: ${results.length} checks, ${failures.length} failure(s)`,
    );
  } else {
    console.log(
      `check: ${results.length} checks, ${failures.length} failure(s)`,
    );
  }
  finish({
    command: "check",
    args: stackOnly ? ["--stack-only"] : [],
    filesTouched: [],
    decisions: [],
    errors: failures.map((f) => `${f.id}: ${f.detail}`),
    exitCode: failures.length > 0 ? 1 : 0,
  });
}

// --- risk-signals (TASK-78, ADR-004 L0->L1 escalation triggers) --------------

interface GitDiffFile {
  path: string;
  firstLine: number | null;
}

/**
 * Deterministic L1 risk-signal detector wired into `weavelog check`.
 * Returns a check result, or null when there is no repo context at all
 * (nothing to gate). Fail-closed policy (ADR-004/TASK-78 AC#3): an
 * undeterminable merge base or an absent run ledger is a FAIL with an
 * explicit skip reason — never a silent pass. On main/master there is no
 * task-diff context, so the check reports an explicit [skip] (not a pass).
 */
function runRiskSignalsCheck(): {
  id: string;
  ok: boolean;
  detail: string;
  skip?: boolean;
} | null {
  const inRepo =
    spawnSync("git", ["rev-parse", "--is-inside-work-tree"], {
      cwd: process.cwd(),
      encoding: "utf8",
    }).stdout?.trim() === "true";
  if (!inRepo) return null; // no repo context: nothing to detect against

  const branch = (
    spawnSync("git", ["rev-parse", "--abbrev-ref", "HEAD"], {
      cwd: process.cwd(),
      encoding: "utf8",
    }).stdout || ""
  ).trim();
  if (branch === "main" || branch === "master") {
    return {
      id: "risk-signals",
      ok: true,
      skip: true,
      detail: "skip — on main, no task diff context (fail-closed policy N/A)",
    };
  }

  // Merge base: main, then origin/main, else fail closed.
  let base: string | null = null;
  for (const candidate of ["main", "origin/main"]) {
    const r = spawnSync("git", ["merge-base", "HEAD", candidate], {
      cwd: process.cwd(),
      encoding: "utf8",
    });
    if (r.status === 0 && r.stdout.trim()) {
      base = r.stdout.trim();
      break;
    }
  }
  if (base === null) {
    return {
      id: "risk-signals",
      ok: false,
      detail:
        "skip (fail closed): cannot determine merge base (tried main, origin/main)",
    };
  }

  // Changed files on the merged diff against base — ALL change kinds
  // including deletions (TASK-78 review: `git rm` of an auth guard is the
  // highest-risk touch) — plus untracked files, which `git diff <base>`
  // never lists and which would otherwise bypass the gate silently.
  const nameOnly = spawnSync("git", ["diff", "--name-only", base], {
    cwd: process.cwd(),
    encoding: "utf8",
    maxBuffer: 16 * 1024 * 1024,
  });
  if (nameOnly.status !== 0) {
    return {
      id: "risk-signals",
      ok: false,
      detail: `skip (fail closed): git diff against ${base} failed — ${nameOnly.stderr?.trim() || "unknown git error"}`,
    };
  }
  const others = spawnSync(
    "git",
    ["ls-files", "--others", "--exclude-standard"],
    { cwd: process.cwd(), encoding: "utf8", maxBuffer: 16 * 1024 * 1024 },
  );
  if (others.status !== 0) {
    return {
      id: "risk-signals",
      ok: false,
      detail: `skip (fail closed): git ls-files failed — ${others.stderr?.trim() || "unknown git error"}`,
    };
  }
  const paths = [
    ...new Set(
      [
        ...(nameOnly.stdout || "").split("\n"),
        ...(others.stdout || "").split("\n"),
      ]
        .map((p) => p.trim())
        .filter((p) => p.length > 0),
    ),
  ];

  const changedFiles: GitDiffFile[] = [];
  for (const path of paths) {
    if (matchesProtectedPath(path) === null) continue;
    // file:line evidence: first changed line in the new file (-U0 @@ headers)
    const hunk = spawnSync("git", ["diff", "-U0", base, "--", path], {
      cwd: process.cwd(),
      encoding: "utf8",
      maxBuffer: 16 * 1024 * 1024,
    });
    changedFiles.push({
      path,
      firstLine: hunk.status === 0 ? firstChangedLine(hunk.stdout || "") : null,
    });
  }

  // Failing-tests input: machine-supplied by the calling harness from the
  // test gate output (weavelog itself does not run the project's tests).
  // A malformed value fails closed (TASK-78 review) — never a silent drop.
  const failingTestsEnv = process.env.WEAVELOG_RISK_FAILING_TESTS;
  let failingTests: number | null = null;
  if (failingTestsEnv != null && failingTestsEnv !== "") {
    const parsed = Number(failingTestsEnv);
    if (!Number.isFinite(parsed) || parsed < 0) {
      return {
        id: "risk-signals",
        ok: false,
        detail: `skip (fail closed): WEAVELOG_RISK_FAILING_TESTS must be a non-negative integer, got "${failingTestsEnv}"`,
      };
    }
    failingTests = parsed;
  }

  // Retry-failure input: trailing failed `check` runs in the run ledger,
  // excluding entries whose only failure is this gate itself (TASK-78
  // review: otherwise the gate feeds its own failures and escalation
  // never clears). Ledger absent -> fail closed (AC#3).
  const retryFailures = readRetryFailures(
    ledgerPath(),
    "check",
    "risk-signals:",
  );
  if (retryFailures === null) {
    return {
      id: "risk-signals",
      ok: false,
      detail: `skip (fail closed): run ledger absent at ${ledgerPath()} — run any weavelog command to create it`,
    };
  }

  const result = detectRiskSignals({
    changedFiles,
    failingTests,
    retryFailures,
  });

  if (result.escalate) {
    // AC#4: log level, trigger, reason code for TASK-47 ladder tuning.
    const record = {
      ts: new Date().toISOString(),
      level: result.level,
      reasonCode: result.reasonCode,
      triggers: [...new Set(result.signals.map((s) => s.code))],
      evidence: result.signals.map((s) => s.evidence ?? s.detail).slice(0, 10),
      base,
      changedFilesExamined: paths.length,
    };
    try {
      mkdirSync(stateDir(), { recursive: true });
      appendFileSync(
        join(stateDir(), "escalations.jsonl"),
        `${JSON.stringify(record)}\n`,
      );
    } catch (err) {
      return {
        id: "risk-signals",
        ok: false,
        detail: `escalation log write failed: ${(err as Error).message}`,
      };
    }
    return {
      id: "risk-signals",
      ok: false,
      detail: `${result.reasonCode} — escalate reviewer L0->L1: ${result.signals.map((s) => `${s.code}${s.evidence ? ` (${s.evidence})` : ""}`).join("; ")}; logged to ${join(stateDir(), "escalations.jsonl")}`,
    };
  }
  return {
    id: "risk-signals",
    ok: true,
    detail: `${result.reasonCode} — no risk signals on the merged diff vs ${base.slice(0, 8)} (${paths.length} file(s)); reviewer stays L0`,
  };
}

// --- doctor -----------------------------------------------------------------

async function runDoctor(): Promise<never> {
  const results: { id: string; marker: string; detail: string }[] = [];
  const push = (id: string, res: CheckResult): void => {
    const marker =
      res.ok === true
        ? "pass"
        : res.skip === true
          ? "skip"
          : res.warn === true
            ? "warn"
            : "fail";
    results.push({ id, marker, detail: res.detail });
    printCheckLine(marker, id, res.detail);
  };
  push("manifest.parse", checkManifestParse());
  push("payload.integrity", checkPayloadIntegrity());
  push("templating.sanity", checkTemplatingSanity());
  push("skills.layout", checkSkillsLayout());
  push("opencode.adapters", checkOpenCodeAdapters());
  push("proxy.health", await checkProxyHealth());
  push("backlog.binary", checkBacklogBinary());
  push("node.version", checkNodeVersion());
  push("node.path-guard", checkNodePathGuard());
  const failures = results.filter((r) => r.marker === "fail");
  const warnSkips = results.filter(
    (r) => r.marker === "warn" || r.marker === "skip",
  );
  console.log(
    `doctor: ${results.length - failures.length} pass, ${failures.length} fail, ${warnSkips.length} warn/skip`,
  );
  finish({
    command: "doctor",
    args: [],
    filesTouched: [],
    decisions: warnSkips.map((r) => `${r.id}: ${r.detail}`),
    errors: failures.map((f) => `${f.id}: ${f.detail}`),
    exitCode: failures.length > 0 ? 1 : 0,
  });
}

// --- scaffold ---------------------------------------------------------------

function resolveBacklogBin(): string | null {
  const seam = process.env.WEAVELOG_BACKLOG_BIN;
  if (seam) return existsSync(seam) ? seam : null;
  for (const dir of (process.env.PATH ?? "").split(":")) {
    if (!dir) continue;
    const p = join(dir, "backlog");
    try {
      accessSync(p, constants.X_OK);
      if (!lstatSync(p).isDirectory()) return p;
    } catch {
      // keep looking
    }
  }
  return null;
}

function runScaffold(project: string | null): never {
  if (!project || project.startsWith("--")) {
    console.error("scaffold requires --project <name>");
    finish({
      command: "scaffold",
      args: [],
      filesTouched: [],
      decisions: [],
      errors: ["missing --project argument"],
      exitCode: 2,
    });
  }
  const projectDir = resolve(process.cwd(), project);
  const filesTouched: string[] = [];
  const decisions: string[] = [];
  const errors: string[] = [];
  mkdirSync(projectDir, { recursive: true });
  const git = spawnSync("git", ["init"], {
    cwd: projectDir,
    encoding: "utf8",
    timeout: 60_000,
  });
  if (git.status !== 0) {
    errors.push(`git init failed: ${(git.stderr || git.stdout || "").trim()}`);
  }
  const agentsStub = join(projectDir, "AGENTS.md");
  writeFileSync(
    agentsStub,
    readFileSync(join(PAYLOAD_DIR, "AGENTS.md"), "utf8"),
  );
  filesTouched.push(agentsStub);
  const dotenvExample = join(projectDir, ".env.example");
  writeFileSync(
    dotenvExample,
    readFileSync(join(REPO_ROOT, ".env.example"), "utf8"),
  );
  filesTouched.push(dotenvExample);
  const backlogBin = resolveBacklogBin();
  if (backlogBin === null) {
    decisions.push("backlog init skipped: backlog CLI not found");
  } else {
    const b = spawnSync(backlogBin, ["init"], {
      cwd: projectDir,
      encoding: "utf8",
      timeout: 120_000,
    });
    if (b.status === 0) {
      decisions.push(`backlog init ok via ${backlogBin}`);
    } else {
      errors.push(
        `backlog init failed (exit ${String(b.status)}): ${(b.stderr || b.stdout || "").trim()}`,
      );
    }
  }
  if (errors.length > 0) {
    for (const e of errors) console.error(`scaffold error: ${e}`);
    finish({
      command: "scaffold",
      args: ["--project", project],
      filesTouched,
      decisions,
      errors,
      exitCode: 1,
    });
  }
  console.log(`scaffolded ${projectDir}`);
  finish({
    command: "scaffold",
    args: ["--project", project],
    filesTouched,
    decisions,
    errors,
    exitCode: 0,
  });
}

// --- stats ------------------------------------------------------------------

function runStats(): never {
  const piHome = process.env.WEAVELOG_PI_HOME ?? join(HOME, ".pi");
  const logsDir = join(piHome, "logs");
  if (!existsSync(logsDir)) {
    console.log("stats: no .pi/logs dir — no stats files");
    finish({
      command: "stats",
      args: [],
      filesTouched: [],
      decisions: [],
      errors: [],
      exitCode: 0,
    });
  }
  const files = readdirSync(logsDir)
    .filter((f) => f.endsWith(".stats.json"))
    .map((f) => join(logsDir, f));
  if (files.length === 0) {
    console.log(`stats: no *.stats.json in ${logsDir}`);
    finish({
      command: "stats",
      args: [],
      filesTouched: [],
      decisions: [],
      errors: [],
      exitCode: 0,
    });
  }
  for (const f of files) {
    console.log(`${f} (${(lstatSync(f).size / 1024).toFixed(1)} KiB)`);
  }
  console.log(`stats: ${files.length} stats file(s)`);
  finish({
    command: "stats",
    args: [],
    filesTouched: files,
    decisions: [],
    errors: [],
    exitCode: 0,
  });
}

// --- dispatch ---------------------------------------------------------------

function rejectUnknownFlags(
  cmd: string,
  rest: string[],
  known: string[],
): void {
  for (const flag of rest) {
    if (flag.startsWith("--") && !known.includes(flag)) {
      console.error(`unknown flag: ${flag} (see --help)`);
      finish({
        command: cmd,
        args: rest,
        filesTouched: [],
        decisions: [],
        errors: [`unknown flag: ${flag}`],
        exitCode: 2,
      });
    }
  }
}

async function main(): Promise<void> {
  const argv = process.argv.slice(2);
  if (argv.length === 0 || argv[0] === "--help" || argv[0] === "-h") {
    console.log(USAGE);
    finish({
      command: "help",
      args: argv,
      filesTouched: [],
      decisions: [],
      errors: [],
      exitCode: 0,
    });
  }
  const [cmd, ...rest] = argv;
  if (rest.includes("--help") || rest.includes("-h")) {
    console.log(COMMAND_HELP[cmd] ?? USAGE);
    finish({
      command: cmd,
      args: ["--help"],
      filesTouched: [],
      decisions: [],
      errors: [],
      exitCode: 0,
    });
  }
  switch (cmd) {
    case "init":
      rejectUnknownFlags(cmd, rest, ["--force", "--yes"]);
      await runInit(
        rest.includes("--force"),
        rest.includes("--yes"),
        process.env.WEAVELOG_TTY === "1" || process.stdout.isTTY === true,
      );
      break;
    case "sync":
      rejectUnknownFlags(cmd, rest, []);
      runSync();
      break;
    case "update":
      rejectUnknownFlags(cmd, rest, ["--force", "--yes"]);
      await runUpdate(
        rest.includes("--force"),
        rest.includes("--yes"),
        process.env.WEAVELOG_TTY === "1" || process.stdout.isTTY === true,
      );
      break;
    case "versions":
      rejectUnknownFlags(cmd, rest, []);
      runVersions();
      break;
    case "check":
      rejectUnknownFlags(cmd, rest, ["--stack-only", "--pre-commit"]);
      if (rest.includes("--pre-commit")) {
        runPreCommit();
        break;
      }
      await runCheck(rest.includes("--stack-only"));
      break;
    case "doctor":
      rejectUnknownFlags(cmd, rest, []);
      await runDoctor();
      break;
    case "scaffold": {
      rejectUnknownFlags(cmd, rest, ["--project"]);
      const i = rest.indexOf("--project");
      runScaffold(i >= 0 ? (rest[i + 1] ?? null) : null);
      break;
    }
    case "stats":
      rejectUnknownFlags(cmd, rest, []);
      runStats();
      break;
    default:
      console.error(`Unknown command: ${cmd}`);
      console.error("Run 'weavelog --help' for usage");
      finish({
        command: cmd,
        args: rest,
        filesTouched: [],
        decisions: [],
        errors: [`unknown command: ${cmd}`],
        exitCode: 2,
      });
  }
}

main().catch((err: unknown) => {
  const msg = err instanceof Error ? err.message : String(err);
  console.error(`weavelog error: ${msg}`);
  finish({
    command: "fatal",
    args: process.argv.slice(2),
    filesTouched: [],
    decisions: [],
    errors: [msg],
    exitCode: 1,
  });
});
