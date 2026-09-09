/**
 * vanilla-cli logs
 *
 * View recent agent execution turns and thoughts.
 */

import chalk from "chalk";
import fs from "fs";
import { loadConfig, resolvePath } from "@vanilla-agent/core/config.js";
import { createDatabase } from "@vanilla-agent/core/state/database.js";

const args = process.argv.slice(2);
let limit = 10;

const tailIdx = args.indexOf("--tail");
if (tailIdx !== -1 && args[tailIdx + 1]) {
  limit = parseInt(args[tailIdx + 1], 10) || 10;
}

const config = loadConfig();
if (!config) {
  console.error("No VanillaAgent configuration found.");
  process.exit(1);
}

const dbPath = resolvePath(config.dbPath);
if (!fs.existsSync(dbPath)) {
  console.log("No database found. Has the agent run yet?");
  process.exit(0);
}

const db = createDatabase(dbPath);
const turns = db.getRecentTurns(limit);

if (turns.length === 0) {
  console.log("No turns recorded yet.");
  process.exit(0);
}

console.log(chalk.bold(`\nLast ${turns.length} turns:\n`));

for (const turn of turns) {
  const time = new Date(turn.timestamp).toISOString();
  console.log(chalk.cyan(`─── Turn ${turn.id} [${time}] ───`));
  console.log(`State: ${turn.state} | Tokens: ${turn.tokenUsage.totalTokens} | Cost: $${(turn.costCents / 100).toFixed(4)}`);

  if (turn.input) {
    console.log(chalk.yellow(`Input [${turn.inputSource || "system"}]: `) + turn.input);
  }

  if (turn.thinking) {
    console.log(chalk.dim("Thinking: ") + turn.thinking);
  }

  if (turn.toolCalls.length > 0) {
    console.log(chalk.green("Tools called:"));
    for (const tc of turn.toolCalls) {
      console.log(`  • ${tc.name}`);
      if (tc.error) {
        console.log(chalk.red(`    Error: ${tc.error}`));
      }
    }
  }

  console.log();
}

db.close();
