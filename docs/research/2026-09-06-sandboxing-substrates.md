---
date: 2026-09-06
topic: Local execution-sandboxing substrates for the weavelog harness on macOS ARM (Colima/OrbStack/podman/Docker Desktop/apple-container VZ) + orchestration (Bun-fetch-over-socket vs dockerode vs Daytona vs E2B/sbx/OpenHands patterns)
status: verified-live
sources:
  - "https://github.com/abiosoft/colima (+ docs/FAQ.md raw, fetched 2026-09-06)"
  - "https://github.com/lima-vm/lima (metadata, 2026-09-06)"
  - "https://docs.orbstack.dev/faq + https://orbstack.dev/pricing (2026-09-06)"
  - "https://github.com/apocas/dockerode (metadata, 2026-09-06)"
  - "https://github.com/daytonaio/daytona (metadata + LICENSE probe, 2026-09-06)"
  - "https://github.com/e2b-dev/E2B + https://github.com/e2b-dev/infra (metadata, 2026-09-06)"
  - "https://github.com/apple/container (metadata + README raw, 2026-09-06)"
  - "https://github.com/containers/podman (metadata, 2026-09-06)"
  - "https://github.com/OpenHands/OpenHands + https://docs.all-hands.dev/usage/architecture/runtime (2026-09-06)"
  - "https://github.com/docker/sbx-releases (metadata, 2026-09-06); https://github.com/ajeetraina/awesome-docker-sbx (2026-09-06)"
  - "Bun fetch-over-unix-socket official docs (guides/http/fetch-unix.mdx via context7 /oven-sh/bun, 2026-09-06)"
  - "Docker Engine API exec endpoints via SO 36930119 / SO 76033623 / forums.docker.com 748 (2026-09-06)"
  - "Third-party perf anecdotes: dev.to/ashabhussan, addrom.com/colima-the-lightweight-docker-desktop-alternative, scien.cx Colima guide, lucaberton.com/blog/install-docker-macos (2026-09-06)"
models_used_for_research: [openrouter/z-ai/glm-5.3-flash]
supersedes: none
---

# Sandboxing substrates for weavelog execution (2026-09-06)

Dispatch context: weavelog (Bun/TS agentic CLI harness, Apache-2.0, macOS-ARM-only v1) isolates
agent work with git worktrees (file-level); goal is process/runtime sandboxing with zero/low npm
dependencies. Method: GitHub REST metadata pulled live via `gh api` this dispatch; primary
README/FAQ/docs fetched raw same day; Bun fetch-over-unix verified against Bun's official docs.
All last-verified dates: **2026-09-06**. Perf numbers are third-party anecdotes unless marked
"unverified" — no benchmark was run this dispatch.

## 1. Substrate comparison (macOS ARM, native)

| Substrate | License (verified) | Activity (pushed_at) | Cold start / footprint | Verdict for weavelog |
|---|---|---|---|---|
| **Colima** (on lima-vm/lima, Apache-2.0) | MIT (README + API) | 2026-08-31, 30.7k stars — active | Warm start ~3-5s, ~600MB idle RAM; first launch 20-30s (anecdotal) | `brew install colima`; `colima start --vm-type vz --mount-type virtiofs` (VZ, arm64-native); Docker socket `$HOME/.colima/default/docker.sock` (pre-0.6: `$HOME/.colima/docker.sock` — FAQ). **Leading candidate.** |
| OrbStack | Proprietary: free personal; $8/user/mo commercial incl. non-profits; OSS-licensing for commercial OSS by request only (docs.orbstack.dev/faq) | closed-source | fast-boot claims on site, unverified | **Rejected for OSS harness** — strangers accept a proprietary license; commercial users pay. |
| Docker Desktop | Proprietary terms (free tiers exist; NOT re-verified this dispatch) | closed-source | 2-4GB idle RAM, 20-30s start (anecdotal) | Heavy GUI daemon + licensing friction. Rejected. |
| podman machine | Apache-2.0, 32.8k stars, pushed 2026-09-05 | active | unverified | Viable Apache-2.0 fallback; but Podman socket API compat caveats vs Colima's exact Docker Engine API. |
| **apple/container** (VZ microVM per container, Swift) | Apache-2.0, 49.7k stars, v1.3.1 (2026-08-29) | active | per-container lightweight VMs; boot-time claims NOT verified this dispatch | Best isolation model, Apple silicon-native. No Docker Engine API — exec would shell out to `container` CLI. **Watchlist / future substrate**, not v1. |
| E2B | SDK Apache-2.0 (13.7k stars); self-host `e2b-dev/infra` Apache-2.0 (1.4k stars) = Terraform+Nomad on GCP/AWS | active | Firecracker microVMs; cloud <200ms warm (third-party claim) | Cloud-first; self-host targets cloud clusters, not a clean laptop. Reference only. |
| Daytona | **No root LICENSE found** (API license: null; LICENSE path 404); pushed 2026-07-24 (~6wks stale); 71.8k stars; third-party reports "AGPL, repo unmaintained" | slowing | Docker sandboxes, <90ms warm (third-party claim) | TS SDK ergonomic (`sandbox.process.executeCommand`), but license ambiguity + cloud-first + staleness = **rejected**. |
| Docker Sandboxes (`sbx`) | Binaries only: `docker/sbx-releases` license **NOASSERTION**, 357 stars, pushed 2026-09-04. MicroVM per agent (own kernel + Docker daemon) | active | proprietary Docker ecosystem component | Model validation for microVM-per-agent; not OSS, Docker Desktop ecosystem. Watchlist. |
| ArcBox (`arcbox-dev/arcbox`) | **GitHub API 404 — repo not found under this name (2026-09-06)** | n/a | n/a | Unverifiable: existence, license, VZ basis all unconfirmed. Possibly renamed or misnamed in dispatch. Open question. |

## 2. Orchestration-layer matrix

Criteria scored for a stranger on a clean arm64 Mac running a Bun/TS harness. 3 stars = best.
(ArcBox column kept per dispatch but is n/a — unverifiable.)

| Criterion | Bun fetch over unix socket (zero-dep) | dockerode (apocas) | Daytona SDK | ArcBox / raw VZ |
|---|---|---|---|---|
| macOS ARM native perf | whatever substrate's socket (Colima VZ/virtiofs) | same | cloud or self-host; not laptop-native | 3/3 (VZ directly) |
| Cold-start latency | 3/3 /_ping probe + lazy `colima start` | 3/3 same | 3/3 cloud <200ms warm (claimed) | unverified |
| Dependency weight | 3/3 **zero npm deps** — `fetch(…, { unix })` is official Bun | 2/3 Apache-2.0, active (4.9k stars, pushed 2026-09-04); pulls deps + Node-stream idioms | 1/3 SDK deps + cloud account/API key | zero-dep via CLI shelling |
| Bun/TS ergonomics | 3/3 plain await fetch + Response streams | 2/3 Node-stream era; works under Bun, not idiomatic | 3/3 clean promise API | manual |
| Zero host side-effects | 3/3 container-ephemeral FS; host touched only via bind-mount | 3/3 same | 3/3 remote | 3/3 VM boundary |
| OSS / licensing | 3/3 ours | 3/3 Apache-2.0 | 2/3 license unclear (§1) | n/a |
| Stranger install cost | 3/3 `brew install colima docker` (2 formulae) | 2/3 + bun add dockerode | 1/3 cloud signup or self-host cluster | 2/3 unknown tooling |
| Streaming I/O + exit codes | 3/3 Response.body + `GET /exec/{id}/json` ExitCode | 2/3 same endpoints, wrapped | 3/3 built-in result object | manual |

Key Bun fact (official docs, 2026-09-06): `fetch("http://localhost/info", { unix: "/var/run/docker.sock" })`
routes HTTP over a unix socket; `unix` cannot be combined with `proxy`. The zero-dependency path is
real, not aspirational.

## 3. Docker Engine API facts used (verified 2026-09-06)

- `POST /containers/create?name=…` → `{Id}`; `POST /containers/{id}/start`.
- Exec: `POST /containers/{id}/exec` (AttachStdout/AttachStderr, Tty:false) → `{Id}`;
  `POST /exec/{id}/start` with `{"Detach":false,"Tty":false}` returns a hijacked, **multiplexed** stream
  (Tty=false = 8-byte stdcopy headers: [streamType,0,0,0,size BE-uint32]; 1=stdout, 2=stderr);
  exit code via `GET /exec/{id}/json` → `ExitCode`. (Corroborated by SO 36930119, SO 76033623,
  docker forums 748; framing per Docker Engine API docs / moby stdcopy.)
- `DELETE /containers/{id}?force=true&v=true` = rollback primitive.
- Colima socket: `$HOME/.colima/default/docker.sock` (FAQ §Docker socket location; older `$HOME/.colima/docker.sock` — probe both).

## 4. Reference snippet (Bun/TS, zero deps — NOTE ONLY, not a repo file)

```typescript
// POC sketch — inner-harness executor over Colima's Docker socket. Bun >=1.1, zero npm deps.
type ExecResult = { code: number | null; stdout: string; stderr: string };
const sock = Bun.env.DOCKER_SOCK ?? `${Bun.env.HOME}/.colima/default/docker.sock`;
const api = "http://d/v1.47"; // host part ignored when `unix:` is set

async function req<T>(method: string, path: string, body?: object): Promise<T> {
  const res = await fetch(api + path, { method, unix: sock,
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined });
  if (!res.ok) throw new Error(`${method} ${path} -> ${res.status}: ${await res.text()}`);
  return res.json() as Promise<T>;
}

// lazy daemon: probe socket; only pay Colima boot cost when actually needed
async function ensureDaemon() {
  try { await req("GET", "/_ping"); } catch {
    await Bun.$`colima start --vm-type vz --mount-type virtiofs`.quiet().nothrow();
  }
}

// Tty=false means docker multiplexes frames: [type(1B), 0,0,0, size(4B BE), payload...]
function demux(buf: Uint8Array) {
  let stdout = "", stderr = "";
  const v = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
  for (let i = 0; i + 8 <= buf.length;) {
    const type = buf[i], size = v.getUint32(i + 4);
    const text = new TextDecoder().decode(buf.subarray(i + 8, i + 8 + size));
    if (type === 1) stdout += text; else if (type === 2) stderr += text;
    i += 8 + size;
  }
  return { stdout, stderr };
}

export async function run(worktree: string, cmd: string): Promise<ExecResult> {
  await ensureDaemon();
  const name = `weavelog-${crypto.randomUUID().slice(0, 8)}`;
  const { Id: cid } = await req<{ Id: string }>("POST", "/containers/create?name=" + name, {
    Image: "docker.io/library/alpine:3.20", // pin by digest for determinism
    Cmd: ["sleep", "infinity"], WorkingDir: "/workspace",
    HostConfig: { Binds: [`${worktree}:/workspace`], Memory: 2 << 30, NanoCpus: 2_000_000_000 },
  });
  try {
    await req("POST", `/containers/${cid}/start`);
    const { Id: eid } = await req<{ Id: string }>("POST", `/containers/${cid}/exec`,
      { Cmd: ["sh", "-lc", cmd], AttachStdout: true, AttachStderr: true, Tty: false });
    const stream = await fetch(api + `/exec/${eid}/start`, { method: "POST", unix: sock,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ Detach: false, Tty: false }) });
    if (!stream.ok || !stream.body) throw new Error(`exec/start -> ${stream.status}`);
    const { stdout, stderr } = demux(new Uint8Array(await stream.arrayBuffer()));
    const { ExitCode: code } = await req<{ ExitCode: number | null }>("GET", `/exec/${eid}/json`);
    return { code, stdout, stderr }; // non-zero = caller decides retry/fail — never throw past the gate
  } finally {
    await fetch(api + `/containers/${cid}?force=true&v=true`, { method: "DELETE", unix: sock })
      .catch(() => {}); // rollback = destroy; container FS is CoW, host worktree untouched
  }
}
```

## 5. State & isolation patterns (OpenHands, verified docs 2026-09-06)

OpenHands runtime (MIT, 86.3k stars, active): Docker container runs an **action-execution server**;
backend talks REST, sends actions, receives observations — commands never touch the host.
Persistence/reset via **hash-tagged image layering** (source/lock/version tags -> skip rebuild when
unchanged) and **bind-mount overlay COW** (`/abs/host/path:/container/path:ro,overlay` with
per-container upper/work dirs) so host repos stay pristine while containers write.
weavelog equivalent: ephemeral container per task (or tool-call batch), worktree bind-mounted,
destroy on exit; recreate = clean state at container-start latency, not VM-start latency.

## 6. Recommendation for the inner-harness execution state machine

**Confidence: medium-high (substrate + orchestration); medium (state-machine details, pending POC).**

- **Substrate: Colima `--vm-type vz --mount-type virtiofs`** — MIT, arm64-native via Apple VZ,
  brew-installable, very active, Docker Engine API socket at `~/.colima/default/docker.sock`.
  Total prereq for a stranger: `brew install colima docker`.
- **Orchestration: Bun `fetch` with `{ unix: sock }`, zero npm dependencies** implementing
  create/exec/inspect/destroy (section 4). Revisit dockerode (Apache-2.0) only if image-build streams
  are needed — the raw API covers our five endpoints without it.
- **Rollback: ephemeral-container-per-task + destroy-on-finally.** Container CoW layer absorbs
  in-container writes; host git worktree stays source of truth. Worktrees (what changes) and
  containers (where it runs) compose. Fast rollback = `DELETE /containers/{id}?force=true`
  (sub-second expected, unverified) + recreate; no snapshot machinery for v1.
- **State machine:** `IDLE -> ENSURE_DAEMON` (GET /_ping; lazy `colima start` on miss) `-> CREATE`
  (per task, bind-mounted worktree, mem/cpu caps, digest-pinned image) `-> EXEC` (per tool call:
  exec create -> start stream -> demux stdout/stderr -> ExitCode; non-zero is an *observation*, not an
  exception) `-> DESTROY` (finally). Daemon warm between tool calls (~600MB idle VM, anecdotal);
  idle-timeout `colima stop` = later config knob, not v1.
- **Watchlist:** apple/container (Apache-2.0, VZ-per-container, 49.7k stars) — if it grows a stable
  programmatic exec story it can replace Colima with only the substrate layer swapped; Docker `sbx`
  validates the microVM-per-agent direction. Explicit re-check triggers recorded above.

## 7. Unknowns the POC spike must answer

1. **Bind-mount + git-worktree interaction (highest risk):** a linked worktree's `.git` is a *file*
   pointing to the main repo's `worktrees/` dir — mounting only the worktree may break `git`
   in-container. Likely fix: mount the common repo parent, or clone-fresh in-container from the
   worktree. Must test `git status`/`commit` under virtiofs.
2. **Socket-path variability:** older Colima `~/.colima/docker.sock` vs `~/.colima/default/docker.sock`,
   named profiles, coexisting Docker Desktop. Probe order + `docker context` fallback.
3. **First-boot latency on a truly clean machine:** VM image download + provisioning (anecdotal
   20-30s) must be measured; decide if `weavelog init` pre-warms or first run pays.
4. **Bun fetch hijacked streams:** does `POST /exec/{id}/start` (hijacked connection) surface as a
   normal `Response.body` ReadableStream under Bun, incl. long-lived streams and AbortSignal kills?
5. **stdin/hang path:** agents shouldn't need interactivity, but pagers/TTY prompts can hang —
   `OpenStdin:false` + `sh -lc` with `</dev/null`; verify no hang.
6. **Virtiofs write perf + file-event semantics** for git/tsc-heavy loops inside the container.
7. **Daytona license resolution** (no root LICENSE found) and **ArcBox existence** — unresolved;
   re-verify before ever citing either as an option.

---
Filing note: the dispatch targeted `docs/research/2026-09-06-sandboxing-substrates.md` in the
weavelog repo, but repo writes are denied for this agent (edit allowlist covers only
`~/.agents/docs/research/**`). Conductor should mirror this file into the repo's
`docs/research/` and index it there. No `supersedes` relationship exists (no prior note covers
sandboxing in either archive).
