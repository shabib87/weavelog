#!/usr/bin/env -S node --import tsx
/**
 * sync-model-pricing — feed live OpenRouter prices into litellm's pricing DB
 * so the headroom proxy can compute dollar savings for models litellm doesn't
 * know yet (roster models as of the 2026-09-07 ADR-004 adoption).
 *
 * WHY: headroom prices via litellm.cost_per_token(); litellm's bundled DB lags
 * behind new OpenRouter models, leaving $0.00 savings. This script is the
 * bridge. IMPORTANT: headroom/litellm upgrades WIPE these entries — re-run
 * --apply after any upgrade (stack-check --check detects the drift).
 *
 * Exit codes: 0 ok | 1 drift/stale (--check) | 2 missing manifest/config |
 *             3 model missing from OpenRouter catalog | 4 API unreachable.
 */
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

interface CatalogModel {
  id: string;
  pricing?: {
    prompt?: number;
    completion?: number;
    input_cache_read?: number;
  };
  context_length?: number;
}

interface DbEntry {
  headroom_synced?: boolean;
  input_cost_per_token?: number;
  output_cost_per_token?: number;
  cache_read_input_token_cost?: number;
  input_cost_per_token_cache_hit?: number;
  litellm_provider?: string;
  max_input_tokens?: number;
  mode?: string;
  supports_function_calling?: boolean;
  source?: string;
  synced_at?: string;
  [key: string]: unknown;
}

const HELP = `Usage: bun sync-model-pricing.ts --check | --apply [options]

Options:
  --check            Verify all manifest models are priced in litellm's DB (no writes)
  --apply            Inject/update prices from live OpenRouter data (writes the DB)
  --litellm-db <p>   Override litellm model_prices JSON path (default: auto-discover
                     inside the headroom pipx venv)
  --help             Show this help

Reads model list from ~/.agents/stack-versions.json and the OpenRouter key from
~/.local/share/opencode/auth.json. After --apply, restart the headroom proxy.`;

const argv = process.argv.slice(2);
if (argv.includes("--help")) {
  console.log(HELP);
  process.exit(0);
}
function opt(flag: string): string | undefined {
  const i = argv.indexOf(flag);
  return i >= 0 ? argv[i + 1] : undefined;
}
const mode = argv.includes("--apply")
  ? "apply"
  : argv.includes("--check")
    ? "check"
    : null;
if (!mode) {
  console.error("specify --check or --apply\n");
  console.error(HELP);
  process.exit(2);
}

const HOME = homedir();
const manifestPath = join(HOME, ".agents", "stack-versions.json");
if (!existsSync(manifestPath)) {
  console.error(`manifest missing: ${manifestPath}`);
  process.exit(2);
}
const manifest = JSON.parse(readFileSync(manifestPath, "utf8")) as {
  models?: string[];
};
const models = manifest.models ?? [];
if (models.length === 0) {
  console.error("manifest has no models");
  process.exit(2);
}

function discoverLitellmDb(): string {
  const base = join(HOME, ".local", "pipx", "venvs", "headroom-ai", "lib");
  if (!existsSync(base)) {
    console.error(`headroom pipx venv not found at ${base}`);
    process.exit(2);
  }
  const r = spawnSync(
    "bash",
    [
      "-c",
      `ls ${base}/python3.*/site-packages/litellm/model_prices_and_context_window_backup.json 2>/dev/null | head -1`,
    ],
    { encoding: "utf8" },
  );
  const p = (r.stdout || "").trim();
  if (!p) {
    console.error("litellm model_prices JSON not found in headroom venv");
    process.exit(2);
  }
  return p;
}
const dbPath = opt("--litellm-db") || discoverLitellmDb();

async function fetchCatalog(): Promise<Map<string, CatalogModel>> {
  const keyPath = join(HOME, ".local", "share", "opencode", "auth.json");
  let key: string | undefined;
  try {
    key = (
      JSON.parse(readFileSync(keyPath, "utf8")) as {
        openrouter?: { key?: string };
      }
    ).openrouter?.key;
  } catch {
    // /models is public; key optional
  }
  try {
    const res = await fetch(
      process.env.OPENROUTER_MODELS_URL ??
        "https://openrouter.ai/api/v1/models",
      {
        headers: key ? { Authorization: `Bearer ${key}` } : {},
        signal: AbortSignal.timeout(60_000),
      },
    );
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const d = (await res.json()) as { data: CatalogModel[] };
    return new Map(d.data.map((m) => [m.id, m]));
  } catch (e) {
    console.error(
      `OpenRouter API unavailable; no writes performed. (${String(e)})`,
    );
    process.exit(4);
  }
}

const STALE_RELATIVE_THRESHOLD = 0.2;
// Entries are written under "openrouter/<id>" keys: litellm's get_llm_provider()
// rejects unknown provider prefixes (z-ai/, qwen/, moonshotai/), but accepts
// "openrouter/". The headroom proxy maps client names to these keys via the
// HEADROOM_MODEL_ALIAS_MAP env var (set in the LaunchAgent plist).
const dbKey = (id: string) => `openrouter/${id}`;
const catalog = await fetchCatalog();
const db = JSON.parse(readFileSync(dbPath, "utf8")) as Record<string, DbEntry>;
const problems: string[] = [];
let changed = 0;

for (const id of models) {
  const live = catalog.get(id);
  if (!live) {
    problems.push(`missing from OpenRouter catalog: ${id}`);
    if (mode === "apply") process.exit(3);
    continue;
  }
  const p = live.pricing || {};
  // OpenRouter returns PER-TOKEN prices already (e.g. "0.000000462" = $0.462/M).
  // Do NOT rescale. Sanity range guards against unit regressions: any real paid
  // model lands between $0.001/M (1e-9/token) and $1000/M (1e-3/token).
  const inPerToken = Number(p.prompt ?? 0);
  const outPerToken = Number(p.completion ?? 0);
  const cacheReadRaw = p.input_cache_read;
  const cacheReadPerToken = cacheReadRaw != null ? Number(cacheReadRaw) : null;
  const sane = (v: number) => v === 0 || (v >= 1e-9 && v <= 1e-3);
  if (!sane(inPerToken) || !sane(outPerToken)) {
    console.error(
      `implausible pricing for ${id}: in=${inPerToken} out=${outPerToken} (per token)`,
    );
    process.exit(3);
  }
  if (inPerToken <= 0 || outPerToken <= 0) {
    problems.push(`no live pricing in catalog: ${id}`);
    if (mode === "apply") process.exit(3);
    continue;
  }

  const key = dbKey(id);
  const existing = db[key];
  if (mode === "check") {
    if (!existing) {
      problems.push(`not priced in litellm DB: ${id} (key ${key})`);
      continue;
    }
    const inCost = existing.input_cost_per_token;
    if (existing.headroom_synced && inCost != null && inCost > 0) {
      const drift = Math.abs(inCost - inPerToken) / inPerToken;
      if (drift > STALE_RELATIVE_THRESHOLD) {
        problems.push(
          `stale price for ${id}: db=${inCost.toExponential(3)} live=${inPerToken.toExponential(3)}`,
        );
      }
    }
    continue;
  }

  // apply
  if (cacheReadPerToken == null) {
    console.error(
      `warning: ${id} has no input_cache_read price; cache field omitted (not written as $0)`,
    );
  }
  db[key] = {
    ...(existing || {}),
    input_cost_per_token: inPerToken,
    output_cost_per_token: outPerToken,
    ...(cacheReadPerToken != null
      ? {
          cache_read_input_token_cost: cacheReadPerToken,
          input_cost_per_token_cache_hit: cacheReadPerToken,
        }
      : {}),
    litellm_provider: "openrouter",
    max_input_tokens: live.context_length ?? 1_000_000,
    mode: "chat",
    supports_function_calling: true,
    source: "https://openrouter.ai/api/v1/models",
    headroom_synced: true,
    synced_at: new Date().toISOString().slice(0, 10),
  };
  changed += 1;
}

if (mode === "check") {
  if (problems.length) {
    console.log(`PRICING DRIFT:\n  ${problems.join("\n  ")}`);
    process.exit(1);
  }
  console.log(`all ${models.length} manifest models priced correctly`);
  process.exit(0);
}

writeFileSync(dbPath, `${JSON.stringify(db, null, 2)}\n`);
console.log(`updated ${changed} model price(s) in ${dbPath}`);
if (problems.length) console.log(`warnings:\n  ${problems.join("\n  ")}`);
console.log(
  "restart the headroom proxy to pick up new pricing (launchctl kickstart -k gui/$(id -u)/com.headroom.proxy)",
);
