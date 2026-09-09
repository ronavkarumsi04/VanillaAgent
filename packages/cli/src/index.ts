#!/usr/bin/env node
/**
 * VanillaAgent Developer & Management CLI
 *
 * Developer & Creator CLI for managing VanillaAgent runtimes, swarms, wallets, and memory.
 * Usage: vanilla-cli <command> [args]
 */

const args = process.argv.slice(2);
const command = args[0];

async function main(): Promise<void> {
  switch (command) {
    case "status":
      await import("./commands/status.js");
      break;
    case "dashboard":
    case "tui":
      await import("./commands/dashboard.js");
      break;
    case "logs":
      await import("./commands/logs.js");
      break;
    case "memory":
      await import("./commands/memory.js");
      break;
    case "doctor":
      await import("./commands/doctor.js");
      break;
    case "fund":
      await import("./commands/fund.js");
      break;
    case "send":
      await import("./commands/send.js");
      break;
    default:
      console.log(`
VanillaAgent CLI - Sovereign AI Management Suite

Usage:
  vanilla dashboard               Launch real-time operational dashboard (TUI)
  vanilla status                  Show agent health, balance, survival tier & activity
  vanilla logs [--tail N]         View formatted execution & turn logs
  vanilla memory [tier]           Inspect agent memory layers (working/episodic/semantic)
  vanilla doctor                  Run diagnostic check on environment and providers
  vanilla fund <amount>           Transfer compute credits
  vanilla send <to> <message>     Send a cryptographically signed social message

Runtime commands:
  vanilla --run                   Start the sovereign agent runtime
  vanilla --setup                 Launch interactive setup wizard
  vanilla --configure             Edit settings (providers, models, safety policy)
  vanilla --pick-model            Interactively choose inference model
  vanilla --status                Quick status synopsis
  vanilla --help                  Show runtime options
`);
  }
}

main().catch((err) => {
  console.error(`Error: ${err.message}`);
  process.exit(1);
});
