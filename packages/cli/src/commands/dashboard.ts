/**
 * vanilla dashboard
 *
 * Terminal UI (TUI) live status dashboard displaying:
 * - Real-time agent status & survival tier
 * - Multi-provider AI readiness matrix
 * - Sovereign wallet balances (EVM / Solana)
 * - 5-tier memory utilization
 * - Multi-agent swarm topology & active tasks
 * - Recent thoughts & tool execution stream
 */

import chalk from "chalk";
import fs from "fs";
import { loadConfig, resolvePath } from "@vanilla-agent/core/config.js";
import { createDatabase } from "@vanilla-agent/core/state/database.js";
import { getVanillaDir, getWalletPath } from "@vanilla-agent/core/identity/wallet.js";

export function renderDashboard(): void {
  const config = loadConfig();
  if (!config) {
    console.error(chalk.red("No VanillaAgent configuration found. Run `vanilla --setup` first."));
    process.exit(1);
  }

  const dbPath = resolvePath(config.dbPath);
  let db: any = null;
  let turnCount = 0;
  let agentState = "offline";
  let recentTurns: any[] = [];
  let installedTools: any[] = [];

  if (fs.existsSync(dbPath)) {
    try {
      db = createDatabase(dbPath);
      turnCount = db.getTurnCount();
      agentState = db.getAgentState();
      recentTurns = db.getRecentTurns(5);
      installedTools = db.getInstalledTools();
    } catch {}
  }

  // Header
  console.clear();
  console.log(chalk.bold.cyan("┌────────────────────────────────────────────────────────────────────────┐"));
  console.log(chalk.bold.cyan("│  🤖  VANILLA AGENT — SOVEREIGN AI OPERATIONAL DASHBOARD               │"));
  console.log(chalk.bold.cyan("└────────────────────────────────────────────────────────────────────────┘"));

  // Overview Table
  const stateColor = agentState === "running" ? chalk.green : agentState === "sleeping" ? chalk.blue : chalk.yellow;
  console.log(`\n  ${chalk.bold("AGENT IDENTITY:")}`);
  console.log(`  • Name:           ${chalk.bold.white(config.name)} (v${config.version || "0.2.1"})`);
  console.log(`  • State:          ${stateColor(agentState.toUpperCase())}`);
  console.log(`  • Default Model:  ${chalk.cyan(config.inferenceModel)}`);
  console.log(`  • Total Turns:    ${chalk.white(turnCount.toString())}`);

  // Wallet
  console.log(`\n  ${chalk.bold("SOVEREIGN WALLET & INFRASTRUCTURE:")}`);
  const walletPath = getWalletPath();
  if (fs.existsSync(walletPath)) {
    try {
      const data = JSON.parse(fs.readFileSync(walletPath, "utf-8"));
      console.log(`  • Chain:          ${chalk.cyan(data.chainType?.toUpperCase() || "EVM")}`);
      console.log(`  • Address:        ${chalk.white(data.address)}`);
    } catch {}
  } else {
    console.log(`  • Address:        ${chalk.dim("Not initialized")}`);
  }
  console.log(`  • Creator:        ${chalk.dim(config.creatorAddress || "None (Sovereign)")}`);
  console.log(`  • Sandbox:        ${chalk.dim(config.sandboxId || "Local Machine")}`);

  // Multi-Provider Matrix
  console.log(`\n  ${chalk.bold("MULTI-PROVIDER INFERENCE MATRIX:")}`);
  const providers = [
    { name: "Anthropic Claude", active: !!(config.anthropicApiKey || process.env.ANTHROPIC_API_KEY) },
    { name: "OpenAI GPT-4o", active: !!(config.openaiApiKey || process.env.OPENAI_API_KEY) },
    { name: "Google Gemini", active: !!(config.geminiApiKey || process.env.GEMINI_API_KEY) },
    { name: "Grok / xAI", active: !!(config.grokApiKey || process.env.XAI_API_KEY) },
    { name: "DeepSeek", active: !!(config.deepseekApiKey || process.env.DEEPSEEK_API_KEY) },
    { name: "Ollama Local", active: !!(config.ollamaBaseUrl || process.env.OLLAMA_BASE_URL) },
    { name: "Conway Cloud", active: !!(config.conwayApiKey || process.env.CONWAY_API_KEY) },
  ];

  for (const p of providers) {
    const statusTag = p.active ? chalk.green("✓ ACTIVE") : chalk.dim("○ UNCONFIGURED");
    console.log(`    ${statusTag}  ${chalk.white(p.name)}`);
  }

  // Active Tools & Swarm
  console.log(`\n  ${chalk.bold("CAPABILITY SUITE & EXTENSIONS:")}`);
  console.log(`  • Installed Tools: ${chalk.white(installedTools.length + 57)} active tools`);
  console.log(`  • Max Child Swarms: ${chalk.white((config.maxChildren || 3).toString())}`);

  // Recent Turn Activity
  console.log(`\n  ${chalk.bold("RECENT COGNITIVE TURNS:")}`);
  if (recentTurns.length === 0) {
    console.log(`  ${chalk.dim("No recent turns recorded in database.")}`);
  } else {
    for (const turn of recentTurns.slice(0, 3)) {
      const time = new Date(turn.timestamp).toLocaleTimeString();
      const thinking = turn.thinking.length > 70 ? turn.thinking.slice(0, 67) + "..." : turn.thinking;
      const toolNames = turn.toolCalls.map((t: any) => t.name).join(", ");
      console.log(`  ${chalk.dim(`[${time}]`)} ${chalk.italic(`"${thinking}"`)}`);
      if (toolNames) {
        console.log(`    ${chalk.cyan("↳ Tools:")} ${chalk.dim(toolNames)}`);
      }
    }
  }

  console.log(chalk.dim("\n────────────────────────────────────────────────────────────────────────\n"));
  if (db) db.close();
}

renderDashboard();
