/**
 * verify-gate.ts — opencode plugin: no code write without recent verification.
 *
 * NOT ACTIVE on delivery — ships code + tests only (enforce.ts precedent).
 * Activation (human step): copy to ~/.config/opencode/plugins/verify-gate.ts,
 * restart opencode, run the smoke checklist. Rollback: delete the file.
 *
 * Design contract (mirrors enforce.ts):
 *   - fail-open: malformed input, missing args, or internal errors never block.
 *   - deterministic: the gate is a counter, not prose judgment (primitive-selection:
 *     hooks must be regex/exit-code decidable).
 *   - scoped: only code-ish write targets are gated. Markdown, docs/, and backlog/
 *     writes are always allowed — the gate exists for the HOW loop, not doc work.
 *
 * Mechanism (API-free): in-module counter of tool calls since the last bash
 * execution. A code write is blocked when >10 tool calls have passed without a
 * bash run — i.e., the agent is writing code with no fresh command output
 * anywhere near it. 10 is the grace window for read/plan sequences.
 *
 * Kill switches (read per call): VERIFY_GATE_DISABLED=true, ENFORCE_DISABLED=true.
 *
 * Verified hook surface (@opencode-ai/plugin dist/index.d.ts, 2026-08-15):
 *   - tool.execute.before: input { tool, sessionID, callID }, output { args } — throw blocks.
 *   - tool.execute.after:  input { tool, sessionID, callID, args }, output { title, output, metadata }.
 */

export class VerifyGateError extends Error {
	constructor(message: string) {
		super(message);
		this.name = "VerifyGateError";
	}
}

const WRITE_TOOLS = new Set(["edit", "write", "apply_patch"]);
const GRACE_CALLS = 10;

/** Doc-ish targets are never gated: markdown anywhere, docs/, backlog/, .git. */
function isGatedPath(filePath: string): boolean {
	if (!filePath) return false;
	if (filePath.endsWith(".md")) return false;
	if (/(^|\/)(docs|backlog|\.git)(\/|$)/.test(filePath)) return false;
	return true;
}

function disabled(): boolean {
	return process.env.VERIFY_GATE_DISABLED === "true" || process.env.ENFORCE_DISABLED === "true";
}

interface HookInput {
	tool: string;
	sessionID: string;
	callID: string;
	args?: Record<string, unknown>;
}
interface HookOutput {
	args: Record<string, unknown>;
}
interface AfterOutput {
	title: string;
	output: string;
	metadata: Record<string, unknown>;
}

/** Factory so tests inject fresh state per instance. */
export function createHooks() {
	// Per-session windows: opencode instantiates plugins per project, so sessions
	// (and subagents) share this closure — key the counter by sessionID or one
	// session's bash run would reset another session's gate. LRU-capped like enforce.ts.
	const windows = new Map<string, number>();
	const callsSince = (sid: string) => windows.get(sid) ?? 0;
	const bump = (sid: string) => {
		const next = callsSince(sid) + 1;
		windows.delete(sid); // refresh LRU position
		windows.set(sid, next);
		if (windows.size > 100) windows.delete(windows.keys().next().value as string);
	};

	async function before(input: HookInput, output: HookOutput): Promise<void> {
		try {
			if (disabled()) return;
			if (input.tool === "bash") return; // bash itself never counts or blocks here
			const sid = input.sessionID ?? "unknown";
			if (WRITE_TOOLS.has(input.tool)) {
				const filePath = (output?.args?.filePath ?? output?.args?.path ?? "") as string;
				if (filePath && isGatedPath(filePath) && callsSince(sid) > GRACE_CALLS) {
					throw new VerifyGateError(
						`verification gate: ${callsSince(sid)} tool calls without a bash run — ` +
							`run tests/build before writing ${filePath} (VERIFY_GATE_DISABLED=true to bypass)`,
					);
				}
			}
			bump(sid);
		} catch (e) {
			if (e instanceof VerifyGateError) throw e;
			// fail open on any internal error
		}
	}

	async function after(
		input: HookInput & { args: Record<string, unknown> },
		_output: AfterOutput,
	): Promise<void> {
		if (input.tool === "bash") {
			const sid = input.sessionID ?? "unknown";
			windows.delete(sid); // refresh LRU position, same as bump
			windows.set(sid, 0);
			if (windows.size > 100) windows.delete(windows.keys().next().value as string);
		}
	}

	return { before, after };
}

/** opencode plugin entrypoint. */
export const VerifyGatePlugin = async () => {
	const h = createHooks();
	return {
		"tool.execute.before": h.before,
		"tool.execute.after": h.after,
	};
};

export default VerifyGatePlugin;
