/**
 * vanilla-cli status
 *
 * Creator CLI command to inspect an agent's state, balance, and activity.
 */

import chalk from "chalk";
import fs from "fs";
import { loadConfig, resolvePath } from "@vanilla-agent/core/config.js";
import { createDatabase } from "@vanilla-agent/core/state/database.js";

const config = loadConfig();
if (!config) {
  console.error("No VanillaAgent configuration found. Run `vanilla --setup` first.");
  process.exit(1);
}

console.log(chalk.bold.cyan("\n  🤖 VanillaAgent Status\n"));
console.log(`  Name:             ${chalk.white(config.name)}`);
console.log(`  Wallet:           ${chalk.white(config.walletAddress || "none")}`);
console.log(`  Creator:          ${chalk.white(config.creatorAddress || "none")}`);
console.log(`  Sandbox ID:       ${chalk.white(config.sandboxId || "none (local)")}`);
console.log(`  Inference Model:  ${chalk.white(config.inferenceModel)}`);

// Load database for runtime state
const dbPath = resolvePath(config.dbPath);
if (fs.existsSync(dbPath)) {
  try {
    const db = createDatabase(dbPath);
    const state = db.getAgentState();
    const turnCount = db.getTurnCount();
    const tools = db.getInstalledTools();
    const heartbeatEntries = db.getHeartbeatEntries();
    const recentTurns = db.getRecentTurns(3);

    console.log(`  State:            ${chalk.green(state)}`);
    console.log(`  Turns Executed:   ${chalk.white(turnCount.toString())}`);
    console.log(`  Installed Tools:  ${chalk.white(tools.length.toString())}`);
    console.log(
      `  Heartbeat Tasks:  ${chalk.white(heartbeatEntries.filter((e) => e.enabled).length.toString())} active`,
    );

    if (recentTurns.length > 0) {
      console.log(chalk.bold("\n  Recent Activity:"));
      for (const turn of recentTurns) {
        const time = new Date(turn.timestamp).toLocaleTimeString();
        const thinking = turn.thinking.slice(0, 80);
        console.log(`    [${time}] ${chalk.dim(thinking)}...`);
      }
    }

    db.close();
  } catch (err: any) {
    console.log(`  Database:         ${chalk.yellow(`Error reading state (${err.message})`)}`);
  }
} else {
  console.log(`  Database:         ${chalk.dim("Not initialized yet")}`);
}

console.log();
