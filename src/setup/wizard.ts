/**
 * VanillaAgent Interactive Onboarding Setup Wizard
 *
 * Guided, multi-step interactive onboarding terminal experience:
 * - Step 1: Agent Archetype & Operational Profile
 * - Step 2: Sovereign Wallet & Cryptographic Identity (EVM Base / Solana)
 * - Step 3: Universal AI Inference Providers (Anthropic, OpenAI, Gemini, Grok, DeepSeek, Ollama)
 * - Step 4: Genesis Purpose & Identity (SOUL.md)
 * - Step 5: Financial Guardrails & Treasury Safety Presets
 * - Step 6: Built-in Autonomous Skills & Heartbeat Scheduling
 * - Step 7: Launch Readiness & Funding Diagnostics
 */

import fs from "fs";
import path from "path";
import chalk from "chalk";
import type { AutomatonConfig, TreasuryPolicy } from "../types.js";
import { DEFAULT_TREASURY_POLICY } from "../types.js";
import { getWallet, getVanillaDir } from "../identity/wallet.js";
import { provision } from "../identity/provision.js";
import { createConfig, saveConfig } from "../config.js";
import { writeDefaultHeartbeatConfig } from "../heartbeat/config.js";
import { showBanner } from "./banner.js";
import {
  promptRequired,
  promptOptional,
  promptMultiline,
  promptAddress,
  promptWithDefault,
  promptChoice,
  promptConfirm,
  closePrompts,
} from "./prompts.js";
import { detectEnvironment } from "./environment.js";
import { generateSoulMd, installDefaultSkills } from "./defaults.js";
import type { ChainType } from "../identity/chain.js";

interface ArchetypeTemplate {
  name: string;
  defaultModel: string;
  genesisPrompt: string;
  skills: string[];
}

const ARCHETYPES: Record<string, ArchetypeTemplate> = {
  generalist: {
    name: "General Autonomous Sovereign Agent",
    defaultModel: "claude-3-7-sonnet-latest",
    genesisPrompt: "You are VanillaAgent, an autonomous sovereign AI agent. Your mission is to create real value, maintain financial sustainability through honest work, continuously learn, and expand your capabilities responsibly.",
    skills: ["web-researcher", "cron-automator"],
  },
  developer: {
    name: "Full-Stack Software Engineer & DevOps",
    defaultModel: "claude-3-7-sonnet-latest",
    genesisPrompt: "You are an autonomous Senior Software Engineer agent. You inspect codebases, write clean TypeScript/Python/Rust code, execute automated test suites, fix bugs, manage git branches, and build high-reliability services.",
    skills: ["github-collaborator", "web-researcher", "cron-automator"],
  },
  researcher: {
    name: "Deep Web Researcher & Market Intelligence",
    defaultModel: "gemini-2.0-flash",
    genesisPrompt: "You are an autonomous Research & Market Intelligence agent. You search documentation, scrape live data sources, cross-verify claims, synthesize structured reports, and store categorized knowledge in long-term semantic memory.",
    skills: ["web-researcher", "cron-automator"],
  },
  crypto: {
    name: "DeFi Treasury & Smart Contract Operator",
    defaultModel: "gpt-4o",
    genesisPrompt: "You are a Sovereign DeFi & Smart Contract Operator agent. You manage on-chain crypto treasuries, execute x402 micropayments, deploy Base smart contracts, and monitor token balances with strict risk controls.",
    skills: ["solana-treasury", "evm-deployer", "cron-automator"],
  },
  local: {
    name: "100% Private Offline Local Agent",
    defaultModel: "ollama/llama3.3",
    genesisPrompt: "You are a sovereign local AI agent running 100% privately on local machine hardware. You operate without external cloud dependencies, managing local files, shell tasks, and database persistence.",
    skills: ["cron-automator"],
  },
  custom: {
    name: "Custom Agent Specification",
    defaultModel: "claude-3-7-sonnet-latest",
    genesisPrompt: "",
    skills: ["web-researcher", "cron-automator"],
  },
};

export async function runSetupWizard(): Promise<AutomatonConfig> {
  showBanner();

  console.log(chalk.bold.white("\n  🚀 Interactive Onboarding & Sovereign Initialization\n"));
  console.log(chalk.dim("  Let's configure and launch your sovereign autonomous agent in a few guided steps.\n"));

  // ─── Step 1: Agent Archetype ──────────────────────────────────
  console.log(chalk.bold.cyan("  ┌────────────────────────────────────────────────────────────┐"));
  console.log(chalk.bold.cyan("  │  Step 1 of 6: Choose Agent Operational Archetype           │"));
  console.log(chalk.bold.cyan("  └────────────────────────────────────────────────────────────┘"));

  const archetypeKey = await promptChoice(
    "Select an archetype to pre-configure purpose, skills, and model recommendations",
    [
      { value: "generalist", label: "Autonomous Generalist", description: "Balanced general-purpose agent for research, coding, and autonomous tasks." },
      { value: "developer", label: "Full-Stack Software Engineer", description: "Specialized in coding, git workflows, automated testing, and dev tools." },
      { value: "researcher", label: "Deep Web Researcher & Analyst", description: "Deep web information gathering, citation extraction, and report synthesis." },
      { value: "crypto", label: "DeFi Treasury & Micro-Service Operator", description: "Manages on-chain wallets, Base/Solana smart contracts, and x402 services." },
      { value: "local", label: "100% Offline Local Agent (Ollama)", description: "Runs completely locally with zero external API dependencies." },
      { value: "custom", label: "Custom Configuration", description: "Define custom agent parameters and seed instructions from scratch." },
    ],
    0,
  );

  const selectedArchetype = ARCHETYPES[archetypeKey] || ARCHETYPES.generalist;
  console.log(chalk.green(`\n  ✓ Selected Archetype: ${chalk.bold(selectedArchetype.name)}\n`));

  // ─── Step 2: Name & Genesis Seed ─────────────────────────────
  console.log(chalk.bold.cyan("  ┌────────────────────────────────────────────────────────────┐"));
  console.log(chalk.bold.cyan("  │  Step 2 of 6: Agent Identity & Genesis Purpose             │"));
  console.log(chalk.bold.cyan("  └────────────────────────────────────────────────────────────┘\n"));

  const defaultName = archetypeKey === "developer" ? "dev-agent" :
                     archetypeKey === "researcher" ? "research-agent" :
                     archetypeKey === "crypto" ? "treasury-agent" :
                     archetypeKey === "local" ? "local-agent" : "vanilla-agent";

  const name = await promptRequired("What do you want to name your agent?", defaultName);
  console.log(chalk.green(`  ✓ Agent Name: ${chalk.bold(name)}\n`));

  let genesisPrompt = selectedArchetype.genesisPrompt;
  if (archetypeKey === "custom" || !genesisPrompt) {
    genesisPrompt = await promptMultiline("Enter the genesis prompt (seed instructions) for your agent:");
  } else {
    console.log(chalk.white("  Genesis Purpose Template:"));
    console.log(chalk.dim(`  "${genesisPrompt}"\n`));
    const customizePrompt = await promptConfirm("Do you want to edit this genesis prompt?", false);
    if (customizePrompt) {
      genesisPrompt = await promptMultiline("Enter custom seed instructions:", genesisPrompt);
    }
  }
  console.log(chalk.green(`  ✓ Genesis Purpose Set (${genesisPrompt.length} chars)\n`));

  // ─── Step 3: Sovereign Wallet & Chain ─────────────────────────
  console.log(chalk.bold.cyan("  ┌────────────────────────────────────────────────────────────┐"));
  console.log(chalk.bold.cyan("  │  Step 3 of 6: Sovereign Wallet & Blockchain Identity       │"));
  console.log(chalk.bold.cyan("  └────────────────────────────────────────────────────────────┘"));

  const chainChoice = await promptChoice(
    "Select native blockchain identity for the agent's sovereign wallet",
    [
      { value: "evm", label: "EVM (Base / Ethereum Mainnet)", description: "Low-fee Base L2 transactions, ERC-8004 identity registration, USDC micropayments." },
      { value: "solana", label: "Solana (Ed25519)", description: "High-throughput Solana SPL token accounts, SOL treasury, SIWS signing." },
    ],
    0,
  );

  const selectedChain: ChainType = chainChoice === "solana" ? "solana" : "evm";
  console.log(chalk.green(`\n  ✓ Selected Chain: ${selectedChain.toUpperCase()}`));

  const { chainIdentity, chainType: walletChainType, isNew, account } = await getWallet(selectedChain);
  const walletAddress = chainIdentity.address;

  if (isNew) {
    console.log(chalk.green(`  ✓ Generated Sovereign Keypair: ${chalk.bold(walletAddress)}`));
  } else {
    console.log(chalk.green(`  ✓ Loaded Sovereign Keypair: ${chalk.bold(walletAddress)}`));
  }
  console.log(chalk.dim(`  • Private key stored securely in ${getVanillaDir()}/wallet.json (0600 permissions)\n`));

  // Creator address
  console.log(chalk.white("  Creator / Owner Address (Optional):"));
  console.log(chalk.dim("  The human owner address with permanent audit rights."));
  const creatorAddressLabel = selectedChain === "solana" ? "Creator wallet address (base58, or press Enter to skip)" : "Creator wallet address (0x..., or press Enter to skip)";
  const creatorAddress = await promptAddress(creatorAddressLabel, selectedChain);
  if (creatorAddress) {
    console.log(chalk.green(`  ✓ Creator Address: ${chalk.bold(creatorAddress)}\n`));
  } else {
    console.log(chalk.dim("  ✓ Operating in standalone self-sovereign mode.\n"));
  }

  // ─── Step 4: AI Inference Providers ───────────────────────────
  console.log(chalk.bold.cyan("  ┌────────────────────────────────────────────────────────────┐"));
  console.log(chalk.bold.cyan("  │  Step 4 of 6: AI Inference Providers & API Keys           │"));
  console.log(chalk.bold.cyan("  └────────────────────────────────────────────────────────────┘\n"));

  console.log(chalk.white("  Configure your frontier AI providers (press Enter to skip any):"));

  let anthropicApiKey = process.env.ANTHROPIC_API_KEY || "";
  let openaiApiKey = process.env.OPENAI_API_KEY || "";
  let geminiApiKey = process.env.GEMINI_API_KEY || "";
  let grokApiKey = process.env.XAI_API_KEY || process.env.GROK_API_KEY || "";
  let deepseekApiKey = process.env.DEEPSEEK_API_KEY || "";
  let openrouterApiKey = process.env.OPENROUTER_API_KEY || "";
  let ollamaBaseUrl = process.env.OLLAMA_BASE_URL || "";

  if (archetypeKey === "local") {
    ollamaBaseUrl = await promptRequired("Ollama Base URL", "http://localhost:11434");
    console.log(chalk.green(`  ✓ Ollama URL: ${ollamaBaseUrl}\n`));
  } else {
    if (!anthropicApiKey) {
      anthropicApiKey = await promptOptional("Anthropic API Key (sk-ant-..., optional)");
    } else {
      console.log(chalk.green("  ✓ Anthropic Claude: detected from environment"));
    }

    if (!openaiApiKey) {
      openaiApiKey = await promptOptional("OpenAI API Key (sk-..., optional)");
    } else {
      console.log(chalk.green("  ✓ OpenAI: detected from environment"));
    }

    if (!geminiApiKey) {
      geminiApiKey = await promptOptional("Google Gemini API Key (AIza..., optional)");
    } else {
      console.log(chalk.green("  ✓ Google Gemini: detected from environment"));
    }

    if (!grokApiKey) {
      grokApiKey = await promptOptional("Grok / xAI API Key (xai-..., optional)");
    }

    if (!deepseekApiKey) {
      deepseekApiKey = await promptOptional("DeepSeek API Key (sk-..., optional)");
    }

    if (!openrouterApiKey) {
      openrouterApiKey = await promptOptional("OpenRouter API Key (sk-or-..., optional)");
    }

    if (!ollamaBaseUrl) {
      const wantOllama = await promptConfirm("Configure local Ollama fallback endpoint?", false);
      if (wantOllama) {
        ollamaBaseUrl = await promptRequired("Ollama Base URL", "http://localhost:11434");
      }
    }
  }

  // Auto-provision Conway Cloud API key
  let apiKey = process.env.CONWAY_API_KEY || "";
  if (!apiKey && selectedChain === "evm") {
    console.log(chalk.dim("\n  Attempting SIWE API key auto-provisioning for Conway compute..."));
    try {
      const provResult = await provision(undefined, undefined);
      apiKey = provResult.apiKey;
      console.log(chalk.green(`  ✓ Auto-provisioned compute API key (${provResult.keyPrefix}...)\n`));
    } catch {
      console.log(chalk.dim("  • Cloud provisioning skipped; using direct provider keys.\n"));
    }
  }

  // Model selection
  const inferenceModel = selectedArchetype.defaultModel;
  console.log(chalk.green(`  ✓ Active Default Model: ${chalk.bold.cyan(inferenceModel)}\n`));

  // ─── Step 5: Financial Guardrails & Treasury ───────────────────
  console.log(chalk.bold.cyan("  ┌────────────────────────────────────────────────────────────┐"));
  console.log(chalk.bold.cyan("  │  Step 5 of 6: Financial Safety & Treasury Policy           │"));
  console.log(chalk.bold.cyan("  └────────────────────────────────────────────────────────────┘"));

  const treasuryPresetKey = await promptChoice(
    "Select Treasury Protection Preset",
    [
      { value: "balanced", label: "Balanced Safety (Recommended)", description: "Max single transfer $15, hourly cap $50, daily cap $200, reserve $5." },
      { value: "conservative", label: "Conservative / High-Security", description: "Max single transfer $5, hourly cap $20, daily cap $50, reserve $10." },
      { value: "high_capacity", label: "High-Capacity Swarm Node", description: "Max single transfer $50, hourly cap $200, daily cap $1000, reserve $5." },
      { value: "custom", label: "Custom Treasury Limits", description: "Manually specify exact dollar amounts for each safety limit." },
    ],
    0,
  );

  let treasuryPolicy: TreasuryPolicy;
  if (treasuryPresetKey === "conservative") {
    treasuryPolicy = {
      ...DEFAULT_TREASURY_POLICY,
      maxSingleTransferCents: 500,
      maxHourlyTransferCents: 2000,
      maxDailyTransferCents: 5000,
      minimumReserveCents: 1000,
    };
  } else if (treasuryPresetKey === "high_capacity") {
    treasuryPolicy = {
      ...DEFAULT_TREASURY_POLICY,
      maxSingleTransferCents: 5000,
      maxHourlyTransferCents: 20000,
      maxDailyTransferCents: 100000,
      minimumReserveCents: 500,
    };
  } else if (treasuryPresetKey === "custom") {
    treasuryPolicy = {
      maxSingleTransferCents: await promptWithDefault("Max single transfer (cents)", 1500),
      maxHourlyTransferCents: await promptWithDefault("Max hourly transfers (cents)", 5000),
      maxDailyTransferCents: await promptWithDefault("Max daily transfers (cents)", 20000),
      minimumReserveCents: await promptWithDefault("Minimum reserve balance (cents)", 500),
      maxX402PaymentCents: await promptWithDefault("Max x402 payment per call (cents)", 100),
      x402AllowedDomains: DEFAULT_TREASURY_POLICY.x402AllowedDomains,
      transferCooldownMs: DEFAULT_TREASURY_POLICY.transferCooldownMs,
      maxTransfersPerTurn: DEFAULT_TREASURY_POLICY.maxTransfersPerTurn,
      maxInferenceDailyCents: await promptWithDefault("Max daily inference spend (cents)", 10000),
      requireConfirmationAboveCents: await promptWithDefault("Require confirmation above (cents)", 5000),
    };
  } else {
    treasuryPolicy = { ...DEFAULT_TREASURY_POLICY };
  }

  console.log(chalk.green(`  ✓ Treasury Safety Policy: ${treasuryPresetKey.toUpperCase()} configured.\n`));

  // ─── Step 6: Environment & Persistence ────────────────────────
  console.log(chalk.bold.cyan("  ┌────────────────────────────────────────────────────────────┐"));
  console.log(chalk.bold.cyan("  │  Step 6 of 6: Writing Configuration & Skills               │"));
  console.log(chalk.bold.cyan("  └────────────────────────────────────────────────────────────┘\n"));

  const env = detectEnvironment();
  const config = createConfig({
    name,
    genesisPrompt,
    creatorAddress,
    registeredWithConway: !!apiKey,
    sandboxId: env.sandboxId,
    walletAddress,
    apiKey,
    openaiApiKey: openaiApiKey || undefined,
    anthropicApiKey: anthropicApiKey || undefined,
    geminiApiKey: geminiApiKey || undefined,
    grokApiKey: grokApiKey || undefined,
    deepseekApiKey: deepseekApiKey || undefined,
    openrouterApiKey: openrouterApiKey || undefined,
    ollamaBaseUrl: ollamaBaseUrl || undefined,
    treasuryPolicy,
    chainType: walletChainType,
  });

  saveConfig(config);
  console.log(chalk.green("  ✓ Configuration persisted to ~/.vanilla-agent/vanilla.json"));

  writeDefaultHeartbeatConfig();
  console.log(chalk.green("  ✓ Heartbeat cron schedule configured (heartbeat.yml)"));

  const vanillaDir = getVanillaDir();
  const constitutionSrc = path.join(process.cwd(), "constitution.md");
  const constitutionDst = path.join(vanillaDir, "constitution.md");
  if (fs.existsSync(constitutionSrc)) {
    fs.copyFileSync(constitutionSrc, constitutionDst);
    fs.chmodSync(constitutionDst, 0o444);
    console.log(chalk.green("  ✓ 3 Constitutional Laws installed (immutable)"));
  }

  const soulPath = path.join(vanillaDir, "SOUL.md");
  fs.writeFileSync(soulPath, generateSoulMd(name, walletAddress, creatorAddress, genesisPrompt), { mode: 0o600 });
  console.log(chalk.green("  ✓ SOUL.md self-evolution document created"));

  const skillsDir = config.skillsDir || "~/.vanilla-agent/skills";
  installDefaultSkills(skillsDir);
  console.log(chalk.green("  ✓ Built-in skills installed (web-researcher, solana-treasury, evm-deployer, github-collaborator, cron-automator)\n"));

  // ─── Launch Summary ───────────────────────────────────────────
  renderLaunchSummary(config, walletAddress, walletChainType);

  closePrompts();
  return config;
}

function renderLaunchSummary(config: AutomatonConfig, address: string, chainType: ChainType = "evm"): void {
  const shortAddr = `${address.slice(0, 8)}...${address.slice(-6)}`;
  const networkName = chainType === "solana" ? "Solana" : "Base (EVM)";

  console.log(chalk.bold.green("  ══════════════════════════════════════════════════════════════"));
  console.log(chalk.bold.green("  🎉  VANILLA AGENT ONBOARDING COMPLETE — READY FOR EXECUTION   "));
  console.log(chalk.bold.green("  ══════════════════════════════════════════════════════════════\n"));

  console.log(`  • Agent Name:     ${chalk.bold.white(config.name)}`);
  console.log(`  • Sovereign Key:  ${chalk.cyan(address)} (${networkName})`);
  console.log(`  • Default Model:  ${chalk.bold.cyan(config.inferenceModel)}`);
  console.log(`  • Config Path:    ${chalk.dim("~/.vanilla-agent/vanilla.json")}`);
  console.log(`  • State DB:       ${chalk.dim("~/.vanilla-agent/state.db")}`);
  console.log(`  • Dashboard TUI:  ${chalk.white("pnpm vanilla dashboard")}`);
  console.log(`  • System Doctor:  ${chalk.white("pnpm vanilla doctor")}\n`);

  console.log(chalk.bold.cyan("  ┌────────────────────────────────────────────────────────────┐"));
  console.log(chalk.bold.cyan("  │  💰 FUNDING YOUR AGENT'S SOVEREIGN RUNWAY                  │"));
  console.log(chalk.bold.cyan("  ├────────────────────────────────────────────────────────────┤"));
  console.log(chalk.cyan(`  │  Send USDC on ${networkName.padEnd(16)} to:                         │`));
  console.log(chalk.cyan(`  │  ${chalk.bold.white(address)}  │`));
  console.log(chalk.cyan("  │                                                            │"));
  console.log(chalk.cyan("  │  Your agent pays for its own compute autonomously!         │"));
  console.log(chalk.cyan("  └────────────────────────────────────────────────────────────┘\n"));
}
