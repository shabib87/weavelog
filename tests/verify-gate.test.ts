import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { createHooks, VerifyGateError } from "../src/hooks/verify-gate.ts";

function make() {
	return createHooks();
}

describe("verify-gate (happy paths)", () => {
	test("write to a code file is allowed right after a bash execution", async () => {
		const h = make();
		await h.after(
			{ tool: "bash", sessionID: "s1", callID: "1", args: {} },
			{ title: "", output: "ok", metadata: {} },
		);
		await h.before(
			{ tool: "edit", sessionID: "s1", callID: "2" },
			{ args: { filePath: "/repo/src/app.ts" } },
		);
	});

	test("writes to markdown/docs/backlog are never gated", async () => {
		const h = make();
		for (const path of [
			"/repo/README.md",
			"/repo/docs/plans/x.md",
			"/repo/backlog/tasks/task-1 - x.md",
		]) {
			for (let i = 0; i < 15; i++) {
				await h.before(
					{ tool: "other", sessionID: "s1", callID: `x${i}` },
					{ args: {} },
				);
			}
			await h.before(
				{ tool: "write", sessionID: "s1", callID: "w" },
				{ args: { filePath: path } },
			);
		}
	});

	test("kill switch VERIFY_GATE_DISABLED makes the gate a no-op", async () => {
		process.env.VERIFY_GATE_DISABLED = "true";
		try {
			const h = make();
			for (let i = 0; i < 15; i++)
				await h.before(
					{ tool: "other", sessionID: "s1", callID: `x${i}` },
					{ args: {} },
				);
			await h.before(
				{ tool: "edit", sessionID: "s1", callID: "w" },
				{ args: { filePath: "/repo/src/app.ts" } },
			);
		} finally {
			delete process.env.VERIFY_GATE_DISABLED;
		}
	});
});

describe("verify-gate (unhappy paths)", () => {
	test("code write with no bash in the last 10 tool calls throws VerifyGateError", async () => {
		const h = make();
		for (let i = 0; i < 11; i++)
			await h.before(
				{ tool: "read", sessionID: "s1", callID: `r${i}` },
				{ args: {} },
			);
		let threw: unknown = null;
		try {
			await h.before(
				{ tool: "edit", sessionID: "s1", callID: "w" },
				{ args: { filePath: "/repo/src/app.ts" } },
			);
		} catch (e) {
			threw = e;
		}
		assert.ok(threw instanceof VerifyGateError);
		assert.ok((threw as Error).message.includes("verification gate"));
	});

	test("the 10th call is still allowed; the 11th blocks (boundary)", async () => {
		const h = make();
		for (let i = 0; i < 10; i++)
			await h.before(
				{ tool: "read", sessionID: "s1", callID: `r${i}` },
				{ args: {} },
			);
		await h.before(
			{ tool: "edit", sessionID: "s1", callID: "w" },
			{ args: { filePath: "/repo/src/a.ts" } },
		);
		let threw = false;
		try {
			await h.before(
				{ tool: "read", sessionID: "s1", callID: "r10" },
				{ args: {} },
			);
			await h.before(
				{ tool: "edit", sessionID: "s1", callID: "w2" },
				{ args: { filePath: "/repo/src/b.ts" } },
			);
		} catch {
			threw = true;
		}
		assert.equal(threw, true);
	});

	test("bash resets the window", async () => {
		const h = make();
		for (let i = 0; i < 9; i++)
			await h.before(
				{ tool: "read", sessionID: "s1", callID: `r${i}` },
				{ args: {} },
			);
		await h.after(
			{ tool: "bash", sessionID: "s1", callID: "b", args: {} },
			{ title: "", output: "34/34 pass", metadata: {} },
		);
		for (let i = 0; i < 9; i++)
			await h.before(
				{ tool: "read", sessionID: "s1", callID: `r2-${i}` },
				{ args: {} },
			);
		await h.before(
			{ tool: "edit", sessionID: "s1", callID: "w" },
			{ args: { filePath: "/repo/src/app.ts" } },
		);
	});

	test("missing filePath arg fails open (never blocks on malformed input)", async () => {
		const h = make();
		for (let i = 0; i < 15; i++)
			await h.before(
				{ tool: "read", sessionID: "s1", callID: `r${i}` },
				{ args: {} },
			);
		await h.before(
			{ tool: "edit", sessionID: "s1", callID: "w" },
			{ args: {} },
		);
	});

	test("ENFORCE_DISABLED master switch also disables the gate", async () => {
		process.env.ENFORCE_DISABLED = "true";
		try {
			const h = make();
			for (let i = 0; i < 15; i++)
				await h.before(
					{ tool: "read", sessionID: "s1", callID: `r${i}` },
					{ args: {} },
				);
			await h.before(
				{ tool: "edit", sessionID: "s1", callID: "w" },
				{ args: { filePath: "/repo/src/app.ts" } },
			);
		} finally {
			delete process.env.ENFORCE_DISABLED;
		}
	});

	test("sessions have independent windows: one session's bash does not reset another's gate", async () => {
		const h = make();
		for (let i = 0; i < 11; i++)
			await h.before(
				{ tool: "read", sessionID: "s1", callID: `r${i}` },
				{ args: {} },
			);
		// a different session runs bash — must NOT open s1's gate
		await h.after(
			{ tool: "bash", sessionID: "s2", callID: "b", args: {} },
			{ title: "", output: "ok", metadata: {} },
		);
		let threw = false;
		try {
			await h.before(
				{ tool: "edit", sessionID: "s1", callID: "w" },
				{ args: { filePath: "/repo/src/app.ts" } },
			);
		} catch {
			threw = true;
		}
		assert.equal(threw, true);
		// and s2's own gate is open
		await h.before(
			{ tool: "edit", sessionID: "s2", callID: "w2" },
			{ args: { filePath: "/repo/src/app.ts" } },
		);
	});
});