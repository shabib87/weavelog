# Security Policy

## Reporting a vulnerability

Report vulnerabilities **privately** — do not open a public issue.

Use GitHub's private vulnerability reporting on this repository
(Security tab → Report a vulnerability). If that is unavailable, contact
the maintainer directly and mark the message as a security report.

Include:

- Affected command and version (`weavelog --version`)
- Reproduction steps and exit code
- Relevant ledger lines from `~/.local/state/weavelog/`
- Impact assessment, if you have one

## Response window

Initial response within **7 days**. Fix or mitigation target: **30 days**
for high-severity issues, **90 days** otherwise. Disclosure is coordinated
with the reporter; we ask for 90 days before public disclosure of
high-severity issues.

## Scope

In scope: the weavelog CLI, its managed-file materialization flow, the
manifest (`weavelog.json`), the ledger, gate enforcement, and anything
weavelog writes to `~/.agents` or `~/.config`.

Out of scope: vulnerabilities in the composed hosts and installed tools
themselves (opencode, pi, headroom, semgrep, etc.) — report those upstream;
file an issue here only if weavelog's configuration of them is at fault.

## Hard guarantees

- weavelog never silently overwrites managed files (two-step
  user-modification flow).
- weavelog never touches `.env` or `.env.local` in scaffolded projects
  (hardcoded exclusion, gate-enforced).
- Every refusal is a ledger line + non-zero exit. Zero silent failure.
