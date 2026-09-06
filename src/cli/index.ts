import { spawnSync } from "node:child_process";
import {
	accessSync,
	appendFileSync,
	constants,
	existsSync,
	lstatSync,
	mkdirSync,
	readdirSync,
	mkdtempSync,
	readFileSync,
	readlinkSync,
	rmSync,
	symlinkSync,
	writeFileSync,
} from "node:fs";
import { homedir, tmpdir } from "node:os";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import type { FlightleadManifest } from "../flightlead-manifest.js";
import { checkConfigDrift, checkMarkitdown } from "../stack-check.js";

const USAGE =
	"Usage: flightlead <command> [options]\n\nCommands:\n  init       Materialize the payload into a live root\n  sync       Repo -> live config materialization (author machine)\n  update     Report tool versions vs flightlead.json plus update and rollback hints\n  check      Verify the machine against flightlead.json (--stack-only: fast subset)\n  doctor     Run the subcheck battery\n  scaffold   Scaffold a backlog-driven project dir\n  stats      Show session usage statistics from .pi/logs/*.stats.json\n\nRun 'flightlead <command> --help' for command help.";

const COMMAND_HELP: Record<string, string> = {
	init: `Usage: flightlead init [--force]

Materialize the payload into a live root. Template files resolve
{{FLIGHTLEAD_HOME}} and {{FLIGHTLEAD_CONFIG_HOME}} from the .env at the target
live root (zero secret values in payload templates). Copies payload/config to
the live config locations and payload/skills to <live-root>/skills (excluding
personal dirs by policy). Creates the diagram-design host symlink only when
<skills>/../../code/diagram-design/skills/diagram-design exists, else skips
with a doctor warning condition. Writes the live AGENTS.md from the payload
template. Refuses (non-zero exit + ledger line) when the live root exists with
conflicting unversioned files unless --force.

Env seams:
  FLIGHTLEAD_LIVE_ROOT       live root (default ~/.agents)
  FLIGHTLEAD_CONFIG_HOME     opencode config dir (default ~/.config/opencode)
  FLIGHTLEAD_STATE_DIR       ledger dir (default ~/.local/state/flightlead)`,
	sync: `Usage: flightlead sync

Repo -> live materialization for the author machine. Runs the config-sync
machinery against the payload harness manifest; no-op when everything is
already in sync (exit 0).

Env seams:
  FLIGHTLEAD_CONFIG_HOME     live config root (default ~/.config/opencode)
  FLIGHTLEAD_STATE_DIR       state + ledger dir (default ~/.local/state/flightlead)`,
	update: `Usage: flightlead update

Safe-update flow: checks every flightlead.json tool version against the
installed tool and reports per-channel update notes (pipx/npm/app/git) plus
rollback hints. Full automation is not required at 0.1.0. Exits 0 when the
setup is healthy, refuses loudly (exit 1) on drift. Report-only: never applies
updates.

Env seams: same binary seams as 'flightlead check --stack-only'.`,
	check: `Usage: flightlead check [--stack-only] [--pre-commit]

Verify the machine against flightlead.json. --pre-commit runs the backlog
task validation gate (for git hooks installed by 'flightlead' worktree
tooling) and exits 0/1. --stack-only runs ONLY the fast
stack-version subset (one check per flightlead.json tool check id, plus the
node-path guard) suitable for a launchd plist. Without the flag, adds the
proxy :8788 health check and the config-drift check (composes src/stack-check
machinery). Exits 0 when healthy, 1 on any failure.

Env seams:
  FLIGHTLEAD_HEADROOM_BIN    headroom binary (default ~/.local/bin/headroom)
  FLIGHTLEAD_BACKLOG_BIN     backlog binary (default ~/.bun/bin/backlog)
  FLIGHTLEAD_MARKITDOWN_BIN  markitdown binary (default ~/.local/bin/markitdown)
  FLIGHTLEAD_OPENCODE_BIN    opencode binary (default 'opencode' from PATH)
  FLIGHTLEAD_PI_BIN          pi binary (default 'pi' from PATH)
  FLIGHTLEAD_SKILLS_DIR      skills dir for diagram-design (default <live>/skills)
  FLIGHTLEAD_CHECK_PLIST     check launchd plist (default ~/Library/LaunchAgents/com.flightlead.check.plist)
  FLIGHTLEAD_LIVE_ROOT       live root (default ~/.agents)
  FLIGHTLEAD_CONFIG_HOME     live config root (default ~/.config/opencode)
  FLIGHTLEAD_STATE_DIR       ledger dir (default ~/.local/state/flightlead)`,
	doctor: `Usage: flightlead doctor

Subcheck battery, one check per flightlead.json check id. Subchecks: manifest
parse, payload integrity, templating sanity ({{...}} tokens only resolve from
.env), skills layout (no symlinks in payload; frontmatter license/upstream
present), proxy :8788 health (skipped with a warning when headroom is absent),
backlog binary presence, node version >= engines.node, and the node-path guard
(pinned node in the check plist must exist and satisfy engines.node; skipped
when the plist is absent). Exits 0 iff all checks pass (warnings are ok,
failures are not).

Env seams: same as 'flightlead check', plus FLIGHTLEAD_PI_HOME for stats.`,
	scaffold: `Usage: flightlead scaffold --project <name>

Scaffold a backlog-driven project dir relative to the current directory: git
init, AGENTS.md stub from the payload template, backlog/ init via the backlog
CLI if present (else skipped with a decision), and a .env.example copy.

Env seams:
  FLIGHTLEAD_BACKLOG_BIN     backlog binary (default 'backlog' from PATH)
  FLIGHTLEAD_STATE_DIR       ledger dir (default ~/.local/state/flightlead)`,
	stats: `Usage: flightlead stats

Show session usage statistics from .pi/logs/*.stats.json.

Env seams:
  FLIGHTLEAD_PI_HOME         pi home (default ~/.pi)
  FLIGHTLEAD_STATE_DIR       ledger dir (default ~/.local/state/flightlead)`,
};

const HOME = homedir();
const HERE = fileURLToPath(new URL(".", import.meta.url));
const REPO_ROOT = resolve(HERE, "..", "..");
const PAYLOAD_DIR = join(REPO_ROOT, "payload");
const LEDGER_FILE = "ledger.jsonl";
const PERSONAL_SKILLS = new Set(["in-my-voice", "diagram-design"]);
const KNOWN_TOKENS = new Set(["FLIGHTLEAD_HOME", "FLIGHTLEAD_CONFIG_HOME"]);

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
	return process.env.FLIGHTLEAD_STATE_DIR ?? join(HOME, ".local", "state", "flightlead");
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
		process.env.FLIGHTLEAD_CONFIG_HOME ??
		dotenv?.FLIGHTLEAD_CONFIG_HOME ??
		join(HOME, ".config", "opencode")
	);
}

function expandEnv(value: string): string {
	return value.replace(/\$(\w+)|\$\{(\w+)\}/g, (m, bare: string, braced: string) => {
		const key = bare ?? braced;
		return process.env[key] ?? m;
	});
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
		const content = `FLIGHTLEAD_HOME=${liveRoot}\nFLIGHTLEAD_CONFIG_HOME=${join(HOME, ".config", "opencode")}\n`;
		mkdirSync(liveRoot, { recursive: true });
		writeFileSync(p, content);
	}
	return readDotenv(liveRoot);
}

function renderPayloadToTemp(tokens: Record<string, string>): string {
	const tempRoot = mkdtempSync(join(tmpdir(), "fl-sync-render-"));
	writeFileSync(join(tempRoot, "AGENTS.md"), renderToBuffer(join(PAYLOAD_DIR, "AGENTS.md"), tokens));
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
	return content.replace(/\{\{\s*([A-Za-z0-9_]+)\s*\}\}/g, (m, key: string) => {
		if (!(key in tokens)) {
			throw new Error(`${sourcePath}: template token {{${key}}} is not resolvable from .env`);
		}
		return tokens[key];
	});
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
	return process.env.FLIGHTLEAD_LIVE_ROOT ?? dotenv?.FLIGHTLEAD_HOME ?? join(HOME, ".agents");
}

function skillsDir(dotenv?: Record<string, string>): string {
	return process.env.FLIGHTLEAD_SKILLS_DIR ?? join(liveRootValue(dotenv), "skills");
}

function readManifest(): FlightleadManifest {
	return JSON.parse(readFileSync(join(REPO_ROOT, "flightlead.json"), "utf8")) as FlightleadManifest;
}

function readEnginesNode(): number {
	const pkg = JSON.parse(readFileSync(join(REPO_ROOT, "package.json"), "utf8")) as {
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
	manifest: FlightleadManifest,
): { id: string; ok: boolean; detail: string }[] {
	const results: { id: string; ok: boolean; detail: string }[] = [];
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
		headroom: process.env.FLIGHTLEAD_HEADROOM_BIN ?? join(HOME, ".local", "bin", "headroom"),
		backlog: process.env.FLIGHTLEAD_BACKLOG_BIN ?? join(HOME, ".bun", "bin", "backlog"),
		markitdown: process.env.FLIGHTLEAD_MARKITDOWN_BIN ?? join(HOME, ".local", "bin", "markitdown"),
		opencode: resolveOnPath(process.env.FLIGHTLEAD_OPENCODE_BIN ?? "opencode"),
		pi: resolveOnPath(process.env.FLIGHTLEAD_PI_BIN ?? "pi"),
	};
	for (const tool of ["headroom", "backlog", "markitdown", "opencode", "pi"] as const) {
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
	return results;
}

function extractPlistNode(xml: string): string | null {
	const prog = xml.match(/<key>ProgramArguments<\/key>\s*<array>([\s\S]*?)<\/array>/);
	if (!prog) return null;
	const first = prog[1].match(/<string>([^<]*)<\/string>/);
	return first ? first[1] : null;
}

function checkNodePathGuard(): CheckResult {
	const plistPath =
		process.env.FLIGHTLEAD_CHECK_PLIST ??
		join(HOME, "Library", "LaunchAgents", "com.flightlead.check.plist");
	if (!existsSync(plistPath)) {
		return { skip: true, detail: `plist absent (${plistPath}) — node-path guard skipped` };
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
		return { ok: true, detail: `node ${process.versions.node} >= engines.node ${min}` };
	}
	return { ok: false, detail: `node ${process.versions.node} < engines.node ${min}` };
}

// --- doctor -----------------------------------------------------------------

function checkManifestParse(): CheckResult {
	try {
		readManifest();
		return { ok: true, detail: "flightlead.json parses" };
	} catch (err) {
		return { ok: false, detail: `flightlead.json unparseable: ${(err as Error).message}` };
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
			missing.length === 0 ? "payload files present" : `payload missing: ${missing.join(", ")}`,
	};
}

function checkTemplatingSanity(): CheckResult {
	const files = [join(PAYLOAD_DIR, "AGENTS.md"), ...walkFiles(join(PAYLOAD_DIR, "config"))];
	const bad: string[] = [];
	for (const file of files) {
		const content = readFileSync(file, "utf8");
		for (const m of content.matchAll(/\{\{\s*([A-Za-z0-9_]+)\s*\}\}/g)) {
			if (!KNOWN_TOKENS.has(m[1])) bad.push(`${relative(PAYLOAD_DIR, file)}: {{${m[1]}}}`);
		}
	}
	return {
		ok: bad.length === 0,
		detail:
			bad.length === 0
				? "payload tokens resolve only from .env (FLIGHTLEAD_HOME, FLIGHTLEAD_CONFIG_HOME)"
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
		if (!/^license: /m.test(content)) problems.push(`${entry.name}/SKILL.md missing license line`);
		if (!/^upstream:/m.test(content)) problems.push(`${entry.name}/SKILL.md missing upstream line`);
	}
	return {
		ok: problems.length === 0,
		detail:
			problems.length === 0
				? "skills layout clean (no symlinks, license/upstream present)"
				: `skills problems: ${problems.join("; ")}`,
	};
}

async function checkProxyHealth(): Promise<CheckResult> {
	const bin = process.env.FLIGHTLEAD_HEADROOM_BIN ?? join(HOME, ".local", "bin", "headroom");
	if (!existsSync(bin)) {
		return { warn: true, detail: `proxy :8788 health skipped (headroom binary absent at ${bin})` };
	}
	try {
		const res = await fetch("http://127.0.0.1:8788/health", { signal: AbortSignal.timeout(3000) });
		const body = (await res.json()) as { status?: string; ready?: boolean };
		const healthy = body.ready === true || body.status === "healthy";
		return {
			ok: healthy,
			detail: healthy ? "proxy :8788 healthy" : `proxy :8788 unhealthy: ${JSON.stringify(body)}`,
		};
	} catch (err) {
		return { ok: false, detail: `proxy :8788 unreachable: ${(err as Error).message}` };
	}
}

function checkBacklogBinary(): CheckResult {
	const bin = process.env.FLIGHTLEAD_BACKLOG_BIN ?? join(HOME, ".bun", "bin", "backlog");
	if (existsSync(bin)) return { ok: true, detail: `backlog binary present at ${bin}` };
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
		FLIGHTLEAD_HOME: dotenv.FLIGHTLEAD_HOME ?? liveTarget,
		FLIGHTLEAD_CONFIG_HOME: dotenv.FLIGHTLEAD_CONFIG_HOME ?? configTarget,
	};
	const planned: PlannedDest[] = [];
	for (const full of walkFiles(join(PAYLOAD_DIR, "config"))) {
		const rel = relative(join(PAYLOAD_DIR, "config"), full);
		planned.push({ dest: join(configTarget, rel), content: renderToBuffer(full, tokens) });
	}
	for (const skill of readdirSync(join(PAYLOAD_DIR, "skills"), { withFileTypes: true })) {
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

function renderToBuffer(sourcePath: string, tokens: Record<string, string>): Buffer {
	return Buffer.from(renderTemplate(readFileSync(sourcePath, "utf8"), tokens, sourcePath), "utf8");
}

function scanInitConflicts(liveTarget: string, planned: PlannedDest[]): string[] {
	const managedRels = new Set(planned.map((p) => relative(liveTarget, p.dest)));
	const conflicts: string[] = [];
	for (const p of planned) {
		if (!existsSync(p.dest)) continue;
		let stat;
		try {
			stat = lstatSync(p.dest);
		} catch {
			continue;
		}
		if (stat.isSymbolicLink()) {
			if (p.symlinkTarget && readlinkSync(p.dest) === p.symlinkTarget) continue;
			conflicts.push(`${p.dest} exists as a symlink (use --force to replace it)`);
			continue;
		}
		if (p.content && Buffer.compare(p.content, readFileSync(p.dest)) === 0) continue;
		conflicts.push(`${p.dest} exists and differs from the payload (use --force to overwrite)`);
	}
	if (!existsSync(liveTarget)) return conflicts;
	for (const full of walkFiles(liveTarget)) {
		const rel = relative(liveTarget, full);
		if (rel === ".env" || rel === ".env.example") continue;
		if (managedRels.has(rel) || rel.startsWith("skills/")) continue;
		conflicts.push(`${full} is an unversioned live file (use --force to proceed)`);
	}
	return conflicts;
}

function runInit(force: boolean): never {
	const seamLive = process.env.FLIGHTLEAD_LIVE_ROOT ?? join(HOME, ".agents");
	const dotenv = readDotenv(seamLive);
	const plan = buildInitPlan(dotenv);
	const conflicts = scanInitConflicts(plan.liveTarget, plan.planned);
	const errors: string[] = [];
	if (conflicts.length > 0 && !force) {
		errors.push(...conflicts);
		for (const c of conflicts) console.error(`refusal: ${c}`);
		finish({ command: "init", args: [], errors, filesTouched: [], decisions: [], exitCode: 3 });
	}
	const filesTouched: string[] = [];
	const decisions: string[] = [];
	for (const p of plan.planned) {
		if (p.symlinkTarget) {
			const targetAbs = resolve(join(plan.liveTarget, "skills"), p.symlinkTarget);
			if (!existsSync(targetAbs)) {
				const msg = `diagram-design: host target absent at ${targetAbs} — symlink skipped (doctor warning condition)`;
				decisions.push(msg);
				console.log(`warning: ${msg}`);
				continue;
			}
			if (existsSync(p.dest)) {
				try {
					if (lstatSync(p.dest).isSymbolicLink() && readlinkSync(p.dest) === p.symlinkTarget) {
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
	const symlinkDest = join(plan.liveTarget, "skills", "diagram-design");
	if (filesTouched.includes(symlinkDest)) {
		const symlinkTargetAbs = resolve(
			join(plan.liveTarget, "skills"),
			"../../code/diagram-design/skills/diagram-design",
		);
		decisions.push(`diagram-design: host symlink created -> ${symlinkTargetAbs}`);
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
	const dir = resolve(HERE, "..");
	const jsPath = join(dir, "config-sync.js");
	if (existsSync(jsPath)) return { path: jsPath, tsx: false };
	const srcPath = join(dir, "config-sync.ts");
	if (existsSync(srcPath)) return { path: srcPath, tsx: true };
	return { path: join(resolve(HERE, ".."), "config-sync.js"), tsx: false };
}

function runSync(): never {
	const sync = resolveConfigSync();
	const liveRoot = liveRootValue();
	const dotenv = ensureDotenv(liveRoot);
	const tokens = { FLIGHTLEAD_HOME: liveRoot, FLIGHTLEAD_CONFIG_HOME: configHomeValue(dotenv) };
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
	for (const r of results) printCheckLine(r.ok ? "pass" : "fail", r.id, r.detail);
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
		const tool = Object.entries(manifest.tools).find(([, spec]) => spec.check === f.id)?.[0];
		if (!tool) continue;
		const spec = manifest.tools[tool];
		const note = (CHANNEL_NOTES[spec.channel] ?? "manual update")
			.replaceAll("<tool>", tool)
			.replaceAll("<pinned>", spec.version)
			.replaceAll("<skills>", skillsDir());
		console.error(`update: ${f.id} — ${f.detail}`);
		console.error(`update:   apply: ${note}`);
		console.error(
			`update:   rollback hint: revert ${tool} to the previous pinned version from flightlead.json git history`,
		);
		errors.push(`${f.id}: ${f.detail}`);
	}
	console.error("update: refusing — drift found (report-only; nothing was changed)");
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
	const dir = join(resolve(HERE, ".."));
	const jsPath = join(dir, "task-validate.js");
	const dist = existsSync(jsPath);
	const tvPath = dist ? jsPath : join(dir, "task-validate.ts");
	const prefix = dist ? [] : ["--import", String(import.meta.resolve("tsx"))];
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
	if (!stackOnly) {
		const guard = checkNodePathGuard();
		const proxy = await checkProxyHealth();
		const drift = checkConfigDrift({
			trackedRoot: PAYLOAD_DIR,
			liveRoot: configHomeValue(),
			harnessManifestPath: join(PAYLOAD_DIR, "config", "harnesses", "opencode.json"),
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
			results.push({ id: "node.path-guard", ok: guard.ok === true, detail: guard.detail });
		}
	} else {
		const guard = checkNodePathGuard();
		if (guard.skip) {
			results.push({ id: "node.path-guard", ok: true, detail: guard.detail });
		} else {
			results.push({ id: "node.path-guard", ok: guard.ok === true, detail: guard.detail });
		}
	}
	const failures = results.filter((r) => !r.ok);
	for (const r of results) printCheckLine(r.ok ? "pass" : "fail", r.id, r.detail);
	if (stackOnly) {
		console.log(`check --stack-only: ${results.length} checks, ${failures.length} failure(s)`);
	} else {
		console.log(`check: ${results.length} checks, ${failures.length} failure(s)`);
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

// --- doctor -----------------------------------------------------------------

async function runDoctor(): Promise<never> {
	const results: { id: string; marker: string; detail: string }[] = [];
	const push = (id: string, res: CheckResult): void => {
		const marker =
			res.ok === true ? "pass" : res.skip === true ? "skip" : res.warn === true ? "warn" : "fail";
		results.push({ id, marker, detail: res.detail });
		printCheckLine(marker, id, res.detail);
	};
	push("manifest.parse", checkManifestParse());
	push("payload.integrity", checkPayloadIntegrity());
	push("templating.sanity", checkTemplatingSanity());
	push("skills.layout", checkSkillsLayout());
	push("proxy.health", await checkProxyHealth());
	push("backlog.binary", checkBacklogBinary());
	push("node.version", checkNodeVersion());
	push("node.path-guard", checkNodePathGuard());
	const failures = results.filter((r) => r.marker === "fail");
	const warnSkips = results.filter((r) => r.marker === "warn" || r.marker === "skip");
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
	const seam = process.env.FLIGHTLEAD_BACKLOG_BIN;
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
	const git = spawnSync("git", ["init"], { cwd: projectDir, encoding: "utf8", timeout: 60_000 });
	if (git.status !== 0) {
		errors.push(`git init failed: ${(git.stderr || git.stdout || "").trim()}`);
	}
	const agentsStub = join(projectDir, "AGENTS.md");
	writeFileSync(agentsStub, readFileSync(join(PAYLOAD_DIR, "AGENTS.md"), "utf8"));
	filesTouched.push(agentsStub);
	const dotenvExample = join(projectDir, ".env.example");
	writeFileSync(dotenvExample, readFileSync(join(REPO_ROOT, ".env.example"), "utf8"));
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
	const piHome = process.env.FLIGHTLEAD_PI_HOME ?? join(HOME, ".pi");
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

function rejectUnknownFlags(cmd: string, rest: string[], known: string[]): void {
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
			console.error("Run 'flightlead --help' for usage");
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
	console.error(`flightlead error: ${msg}`);
	finish({
		command: "fatal",
		args: process.argv.slice(2),
		filesTouched: [],
		decisions: [],
		errors: [msg],
		exitCode: 1,
	});
});
