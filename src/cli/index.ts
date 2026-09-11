#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import type { Stats } from "node:fs";
import {
  accessSync,
  appendFileSync,
  constants,
  existsSync,
  lstatSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  readlinkSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { homedir, tmpdir } from "node:os";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  emitOpenCodeAdapters,
  inspectOpenCodeAdapters,
} from "../hooks/opencode-adapters.js";
import { checkDifitPointer, pinHygieneForDir } from "../tools/pin-hygiene.js";
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
  "Usage: weavelog <command> [options]\n\nCommands:\n  init       Materialize the payload into a live root\n  sync       Repo -> live config materialization (author machine)\n  update     Report tool versions vs weavelog.json plus update and rollback hints\n  check      Verify the machine against weavelog.json (--stack-only: fast subset)\n  doctor     Run the subcheck battery\n  scaffold   Scaffold a backlog-driven project dir\n  stats      Show session usage statistics from .pi/logs/*.stats.json\n\nRun 'weavelog <command> --help' for command help.";

const COMMAND_HELP: Record<string, string> = {
  init: `Usage: weavelog init [--force]

Materialize the payload into a live root. Template files resolve
{{WEAVELOG_HOME}} and {{WEAVELOG_CONFIG_HOME}} from the .env at the target
live root (zero secret values in payload templates). Copies payload/config to
the live config locations and payload/skills to <live-root>/skills (excluding
personal dirs by policy). Creates the diagram-design host symlink only when
<skills>/../../code/diagram-design/skills/diagram-design exists, else skips
with a doctor warning condition. Writes the live AGENTS.md from the payload
template. Refuses (non-zero exit + ledger line) when the live root exists with
conflicting unversioned files unless --force.

Env seams:
  WEAVELOG_LIVE_ROOT       live root (default ~/.agents)
  WEAVELOG_CONFIG_HOME     opencode config dir (default ~/.config/opencode)
  WEAVELOG_STATE_DIR       ledger dir (default ~/.local/state/weavelog)`,
  sync: `Usage: weavelog sync

Repo -> live materialization for the author machine. Runs the config-sync
machinery against the payload harness manifest; no-op when everything is
already in sync (exit 0).

Env seams:
  WEAVELOG_CONFIG_HOME     live config root (default ~/.config/opencode)
  WEAVELOG_STATE_DIR       state + ledger dir (default ~/.local/state/weavelog)`,
  update: `Usage: weavelog update

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
const PERSONAL_SKILLS = new Set(["in-my-voice", "diagram-design"]);
const KNOWN_TOKENS = new Set(["WEAVELOG_HOME", "WEAVELOG_CONFIG_HOME"]);

interface LedgerEntry {
  ts: string;
  command: string;
  args: string[];
  filesTouched: string[];
  decisions: string[];
  errors: string[];
  exitCode: number;
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

function appendLedger(entry: LedgerEntry): void {
  mkdirSync(dirname(ledgerPath()), { recursive: true });
  appendFileSync(ledgerPath(), `${JSON.stringify(entry)}\n`);
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
      join(REPO_ROOT, "docs", "architecture", "worktree-discipline.md");
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

function printCheckLine(marker: string, id: string, detail: string): void {
  console.log(`[${marker}] ${id} — ${detail}`);
}

// --- init -------------------------------------------------------------------

interface PlannedDest {
  dest: string;
  content?: Buffer;
  symlinkTarget?: string;
}

function buildInitPlan(dotenv: Record<string, string>): {
  configTarget: string;
  liveTarget: string;
  planned: PlannedDest[];
} {
  const configTarget = configHomeValue(dotenv);
  const liveTarget = liveRootValue(dotenv);
  const tokens: Record<string, string> = {
    WEAVELOG_HOME: dotenv.WEAVELOG_HOME ?? liveTarget,
    WEAVELOG_CONFIG_HOME: dotenv.WEAVELOG_CONFIG_HOME ?? configTarget,
  };
  const planned: PlannedDest[] = [];
  for (const full of walkFiles(join(PAYLOAD_DIR, "config"))) {
    const rel = relative(join(PAYLOAD_DIR, "config"), full);
    planned.push({
      dest: join(configTarget, rel),
      content: renderToBuffer(full, tokens),
    });
  }
  for (const skill of readdirSync(join(PAYLOAD_DIR, "skills"), {
    withFileTypes: true,
  })) {
    if (!skill.isDirectory() || PERSONAL_SKILLS.has(skill.name)) continue;
    const skillRoot = join(PAYLOAD_DIR, "skills", skill.name);
    for (const full of walkFiles(skillRoot)) {
      const rel = relative(skillRoot, full);
      planned.push({
        dest: join(liveTarget, "skills", skill.name, rel),
        content: renderToBuffer(full, tokens),
      });
    }
  }
  planned.push({
    dest: join(configTarget, "AGENTS.md"),
    content: renderToBuffer(join(PAYLOAD_DIR, "AGENTS.md"), tokens),
  });
  planned.push({
    dest: join(liveTarget, "skills", "diagram-design"),
    symlinkTarget: "../../code/diagram-design/skills/diagram-design",
  });
  return { configTarget, liveTarget, planned };
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

function scanInitConflicts(
  liveTarget: string,
  planned: PlannedDest[],
): string[] {
  const managedRels = new Set(planned.map((p) => relative(liveTarget, p.dest)));
  const conflicts: string[] = [];
  for (const p of planned) {
    if (!existsSync(p.dest)) continue;
    let stat: Stats;
    try {
      stat = lstatSync(p.dest);
    } catch {
      continue;
    }
    if (stat.isSymbolicLink()) {
      if (p.symlinkTarget && readlinkSync(p.dest) === p.symlinkTarget) continue;
      conflicts.push(
        `${p.dest} exists as a symlink (use --force to replace it)`,
      );
      continue;
    }
    if (p.content && Buffer.compare(p.content, readFileSync(p.dest)) === 0)
      continue;
    conflicts.push(
      `${p.dest} exists and differs from the payload (use --force to overwrite)`,
    );
  }
  if (!existsSync(liveTarget)) return conflicts;
  for (const full of walkFiles(liveTarget)) {
    const rel = relative(liveTarget, full);
    if (rel === ".env" || rel === ".env.example") continue;
    if (managedRels.has(rel) || rel.startsWith("skills/")) continue;
    conflicts.push(
      `${full} is an unversioned live file (use --force to proceed)`,
    );
  }
  return conflicts;
}

function runInit(force: boolean): never {
  const seamLive = process.env.WEAVELOG_LIVE_ROOT ?? join(HOME, ".agents");
  const dotenv = readDotenv(seamLive);
  const plan = buildInitPlan(dotenv);
  const conflicts = scanInitConflicts(plan.liveTarget, plan.planned);
  const errors: string[] = [];
  if (conflicts.length > 0 && !force) {
    errors.push(...conflicts);
    for (const c of conflicts) console.error(`refusal: ${c}`);
    finish({
      command: "init",
      args: [],
      errors,
      filesTouched: [],
      decisions: [],
      exitCode: 3,
    });
  }
  const filesTouched: string[] = [];
  const decisions: string[] = [];
  for (const p of plan.planned) {
    if (p.symlinkTarget) {
      const targetAbs = resolve(
        join(plan.liveTarget, "skills"),
        p.symlinkTarget,
      );
      if (!existsSync(targetAbs)) {
        const msg = `diagram-design: host target absent at ${targetAbs} — symlink skipped (doctor warning condition)`;
        decisions.push(msg);
        console.log(`warning: ${msg}`);
        continue;
      }
      if (existsSync(p.dest)) {
        try {
          if (
            lstatSync(p.dest).isSymbolicLink() &&
            readlinkSync(p.dest) === p.symlinkTarget
          ) {
            continue;
          }
        } catch {
          // fall through to replace
        }
        rmSync(p.dest, { recursive: true, force: true });
      }
      symlinkSync(p.symlinkTarget, p.dest);
      filesTouched.push(p.dest);
      continue;
    }
    if (existsSync(p.dest)) {
      let same = false;
      try {
        same = Buffer.compare(p.content as Buffer, readFileSync(p.dest)) === 0;
      } catch {
        same = false;
      }
      if (same) continue;
    }
    mkdirSync(dirname(p.dest), { recursive: true });
    writeFileSync(p.dest, p.content as Buffer);
    filesTouched.push(p.dest);
  }
  for (const adapter of emitOpenCodeAdapters({
    packageRoot: packageRootValue(),
    configRoot: plan.configTarget,
    stateDir: stateDir(),
  })) {
    filesTouched.push(adapter.path);
  }
  const symlinkDest = join(plan.liveTarget, "skills", "diagram-design");
  if (filesTouched.includes(symlinkDest)) {
    const symlinkTargetAbs = resolve(
      join(plan.liveTarget, "skills"),
      "../../code/diagram-design/skills/diagram-design",
    );
    decisions.push(
      `diagram-design: host symlink created -> ${symlinkTargetAbs}`,
    );
  }
  decisions.push(
    `materialized ${filesTouched.length} file(s) into ${plan.liveTarget} and ${plan.configTarget}`,
  );
  finish({
    command: "init",
    args: force ? ["--force"] : [],
    filesTouched,
    decisions,
    errors,
    exitCode: 0,
  });
}

// --- sync -------------------------------------------------------------------

function resolveConfigSync(): { path: string; tsx: boolean } {
  return toolScript("config-sync");
}

function runSync(): never {
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
  if (r.stdout) process.stdout.write(r.stdout);
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
    });
  }
  finish({
    command: "sync",
    args,
    filesTouched: [],
    decisions: ["config-sync ok (or no-op)"],
    errors: [],
    exitCode: 0,
  });
}

// --- update -----------------------------------------------------------------

const CHANNEL_NOTES: Record<string, string> = {
  pipx: "pipx install --force <tool>==<pinned>",
  npm: "npm install -g <tool>@<pinned>",
  app: "reinstall the app at the pinned version (see docs/cli.md)",
  git: "git -C <skills>/<tool> checkout <pinned>",
};

function runUpdate(): never {
  const manifest = readManifest();
  const results = stackVersionChecks(manifest);
  const failures = results.filter((r) => !r.ok);
  for (const r of results)
    printCheckLine(r.ok ? "pass" : "fail", r.id, r.detail);
  if (failures.length === 0) {
    console.log("update: all tools at pinned versions — healthy setup");
    finish({
      command: "update",
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
    console.error(`update: ${f.id} — ${f.detail}`);
    console.error(`update:   apply: ${note}`);
    console.error(
      `update:   rollback hint: revert ${tool} to the previous pinned version from weavelog.json git history`,
    );
    errors.push(`${f.id}: ${f.detail}`);
  }
  console.error(
    "update: refusing — drift found (report-only; nothing was changed)",
  );
  finish({
    command: "update",
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
      rejectUnknownFlags(cmd, rest, ["--force"]);
      runInit(rest.includes("--force"));
      break;
    case "sync":
      rejectUnknownFlags(cmd, rest, []);
      runSync();
      break;
    case "update":
      rejectUnknownFlags(cmd, rest, []);
      runUpdate();
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
