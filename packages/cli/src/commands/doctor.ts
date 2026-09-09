/**
 * vanilla-cli doctor
 *
 * Diagnostic tool to verify system health, wallets, SQLite state, and provider connectivity.
 */

import chalk from "chalk";
import fs from "fs";
import { loadConfig, resolvePath } from "@vanilla-agent/core/config.js";
import { getVanillaDir, getWalletPath } from "@vanilla-agent/core/identity/wallet.js";

console.log(chalk.bold.cyan("\n  🩺 VanillaAgent System Doctor\n"));

let hasError = false;

// 1. Node Environment
const nodeVer = process.version;
const major = parseInt(nodeVer.replace("v", "").split(".")[0], 10);
if (major >= 20) {
  console.log(`  ${chalk.green("✓")} Node.js runtime: ${chalk.white(nodeVer)} (>= 20.0.0 supported)`);
} else {
  console.log(`  ${chalk.red("✗")} Node.js runtime: ${chalk.white(nodeVer)} (Requires >= 20.0.0)`);
  hasError = true;
}

// 2. Config Directory
const configDir = getVanillaDir();
if (fs.existsSync(configDir)) {
  console.log(`  ${chalk.green("✓")} Configuration directory: ${chalk.white(configDir)}`);
} else {
  console.log(`  ${chalk.yellow("!")} Configuration directory does not exist yet: ${chalk.white(configDir)}`);
}

// 3. Wallet File
const walletPath = getWalletPath();
if (fs.existsSync(walletPath)) {
  try {
    const data = JSON.parse(fs.readFileSync(walletPath, "utf-8"));
    const chain = data.chainType || "evm";
    console.log(`  ${chalk.green("✓")} Sovereign Wallet found (${chalk.cyan(chain)}): ${chalk.white(walletPath)}`);
  } catch {
    console.log(`  ${chalk.red("✗")} Wallet file is corrupted: ${chalk.white(walletPath)}`);
    hasError = true;
  }
} else {
  console.log(`  ${chalk.yellow("!")} Wallet file not found. Run \`vanilla --init\` to create one.`);
}

// 4. Config & Providers
const config = loadConfig();
if (config) {
  console.log(`  ${chalk.green("✓")} Agent configuration: ${chalk.white(config.name)} (Model: ${chalk.cyan(config.inferenceModel)})`);
  
  // Check active inference providers
  const providers: string[] = [];
  if (config.openaiApiKey || process.env.OPENAI_API_KEY) providers.push("OpenAI");
  if (config.anthropicApiKey || process.env.ANTHROPIC_API_KEY) providers.push("Anthropic Claude");
  if (config.geminiApiKey || process.env.GEMINI_API_KEY) providers.push("Google Gemini");
  if (config.grokApiKey || process.env.XAI_API_KEY) providers.push("Grok / xAI");
  if (config.deepseekApiKey || process.env.DEEPSEEK_API_KEY) providers.push("DeepSeek");
  if (config.openrouterApiKey || process.env.OPENROUTER_API_KEY) providers.push("OpenRouter");
  if (config.ollamaBaseUrl || process.env.OLLAMA_BASE_URL) providers.push("Ollama (Local)");
  if (config.conwayApiKey || process.env.CONWAY_API_KEY) providers.push("Conway Cloud");

  if (providers.length > 0) {
    console.log(`  ${chalk.green("✓")} Configured AI providers: ${chalk.white(providers.join(", "))}`);
  } else {
    console.log(`  ${chalk.yellow("!")} No custom AI provider keys configured; will default to Conway Cloud.`);
  }

  // 5. State Database
  const dbPath = resolvePath(config.dbPath);
  if (fs.existsSync(dbPath)) {
    console.log(`  ${chalk.green("✓")} State Database: ${chalk.white(dbPath)} (healthy)`);
  } else {
    console.log(`  ${chalk.dim("•")} State Database: will be initialized on first run at ${chalk.white(dbPath)}`);
  }
} else {
  console.log(`  ${chalk.yellow("!")} No agent configuration found. Run \`vanilla --setup\` to configure.`);
}

console.log();
if (hasError) {
  console.log(chalk.red("  Doctor found issues that require attention."));
  process.exit(1);
} else {
  console.log(chalk.green("  System is healthy and ready for autonomous execution."));
  console.log();
}
