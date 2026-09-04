#!/usr/bin/env -S node --import tsx

const args = process.argv.slice(2);

if (args.length === 0 || args[0] === "--help" || args[0] === "-h") {
	console.log(
		`
Usage: flightlead <command> [options]

flightlead is in development. Commands will ship in Phase 4.

Planned commands:
  stats  Show session usage statistics from .pi/logs/*.stats.json
  check  Verify machine setup
  init   Scaffold a workspace

See docs/PROGRESS.md for phase status.
`.trim(),
	);
	process.exit(0);
}

console.error(`Unknown command: ${args[0]}`);
console.error("Run 'flightlead --help' for usage");
process.exit(1);
