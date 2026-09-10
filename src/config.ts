/**
 * VanillaAgent Configuration
 *
 * Loads and saves configuration from ~/.vanilla-agent/vanilla.json (with fallback to ~/.automaton/automaton.json).
 */

import fs from "fs";
import path from "path";
import type { AutomatonConfig, TreasuryPolicy, ModelStrategyConfig, SoulConfig } from "./types.js";
import { DEFAULT_CONFIG, DEFAULT_TREASURY_POLICY, DEFAULT_MODEL_STRATEGY_CONFIG, DEFAULT_SOUL_CONFIG } from "./types.js";
import { getVanillaDir } from "./identity/wallet.js";
import { loadApiKeyFromConfig } from "./identity/provision.js";
import { createLogger } from "./observability/logger.js";
import type { ChainType } from "./identity/chain.js";

const logger = createLogger("config");
const CONFIG_FILENAME = "vanilla.json";
const LEGACY_FILENAME = "automaton.json";

export function getConfigPath(dir?: string): string {
  const baseDir = dir || getVanillaDir();
  const primary = path.join(baseDir, CONFIG_FILENAME);
  if (fs.existsSync(primary)) return primary;
  const legacy = path.join(baseDir, LEGACY_FILENAME);
  if (fs.existsSync(legacy)) return legacy;
  return primary;
}

/**
 * Load the agent config from disk.
 * Merges with defaults for any missing fields.
 */
export function loadConfig(dir?: string): AutomatonConfig | null {
  const configPath = getConfigPath(dir);
  if (!fs.existsSync(configPath)) {
    return null;
  }

  try {
    const raw = JSON.parse(fs.readFileSync(configPath, "utf-8"));
    const apiKey = raw.conwayApiKey || loadApiKeyFromConfig();

    // Deep-merge treasury policy with defaults
    const treasuryPolicy: TreasuryPolicy = {
      ...DEFAULT_TREASURY_POLICY,
      ...(raw.treasuryPolicy ?? {}),
    };

    // Validate all treasury values are positive numbers
    for (const [key, value] of Object.entries(treasuryPolicy)) {
      if (key === "x402AllowedDomains") continue;
      if (typeof value === "number" && (value < 0 || !Number.isFinite(value))) {
        logger.warn(`Invalid treasury value for ${key}: ${value}, using default`);
        (treasuryPolicy as any)[key] = (DEFAULT_TREASURY_POLICY as any)[key];
      }
    }

    // Deep-merge model strategy config with defaults
    const modelStrategy: ModelStrategyConfig = {
      ...DEFAULT_MODEL_STRATEGY_CONFIG,
      ...(raw.modelStrategy ?? {}),
    };

    // Deep-merge soul config with defaults
    const soulConfig: SoulConfig = {
      ...DEFAULT_SOUL_CONFIG,
      ...(raw.soulConfig ?? {}),
    };

    const config: AutomatonConfig = {
      ...DEFAULT_CONFIG,
      ...raw,
      sandboxId:
        typeof raw.sandboxId === "string"
          ? raw.sandboxId.trim()
          : DEFAULT_CONFIG.sandboxId,
      conwayApiKey: apiKey,
      treasuryPolicy,
      modelStrategy,
      soulConfig,
      chainType: raw.chainType || "evm",
    };

    // Environment variable overrides
    if (process.env.OPENAI_API_KEY) config.openaiApiKey = process.env.OPENAI_API_KEY;
    if (process.env.ANTHROPIC_API_KEY) config.anthropicApiKey = process.env.ANTHROPIC_API_KEY;
    if (process.env.GEMINI_API_KEY) config.geminiApiKey = process.env.GEMINI_API_KEY;
    if (process.env.XAI_API_KEY || process.env.GROK_API_KEY) config.grokApiKey = process.env.XAI_API_KEY || process.env.GROK_API_KEY;
    if (process.env.DEEPSEEK_API_KEY) config.deepseekApiKey = process.env.DEEPSEEK_API_KEY;
    if (process.env.OPENROUTER_API_KEY) config.openrouterApiKey = process.env.OPENROUTER_API_KEY;
    if (process.env.OLLAMA_BASE_URL) config.ollamaBaseUrl = process.env.OLLAMA_BASE_URL;

    return config;
  } catch {
    return null;
  }
}

/**
 * Save the agent config to disk.
 */
export function saveConfig(config: AutomatonConfig, dir?: string): void {
  const baseDir = dir || getVanillaDir();
  if (!fs.existsSync(baseDir)) {
    fs.mkdirSync(baseDir, { recursive: true, mode: 0o700 });
  }

  const configPath = path.join(baseDir, CONFIG_FILENAME);
  const toSave = {
    ...config,
    treasuryPolicy: config.treasuryPolicy ?? DEFAULT_TREASURY_POLICY,
    modelStrategy: config.modelStrategy ?? DEFAULT_MODEL_STRATEGY_CONFIG,
    soulConfig: config.soulConfig ?? DEFAULT_SOUL_CONFIG,
  };
  fs.writeFileSync(configPath, JSON.stringify(toSave, null, 2), {
    mode: 0o600,
  });
}

/**
 * Resolve ~ paths to absolute paths.
 */
export function resolvePath(p: string): string {
  if (p.startsWith("~")) {
    return path.join(process.env.HOME || "/root", p.slice(1));
  }
  return p;
}

/**
 * Create a fresh config from setup wizard inputs.
 */
export function createConfig(params: {
  name: string;
  genesisPrompt: string;
  creatorMessage?: string;
  creatorAddress: string;
  registeredWithConway: boolean;
  sandboxId: string;
  walletAddress: string;
  apiKey: string;
  openaiApiKey?: string;
  anthropicApiKey?: string;
  geminiApiKey?: string;
  grokApiKey?: string;
  deepseekApiKey?: string;
  openrouterApiKey?: string;
  ollamaBaseUrl?: string;
  parentAddress?: string;
  treasuryPolicy?: TreasuryPolicy;
  chainType?: ChainType;
}): AutomatonConfig {
  const normalizedSandboxId = (params.sandboxId || "").trim();
  return {
    name: params.name,
    genesisPrompt: params.genesisPrompt,
    creatorMessage: params.creatorMessage,
    creatorAddress: params.creatorAddress,
    registeredWithConway: params.registeredWithConway,
    sandboxId: normalizedSandboxId,
    conwayApiUrl:
      DEFAULT_CONFIG.conwayApiUrl || "https://api.conway.tech",
    conwayApiKey: params.apiKey,
    openaiApiKey: params.openaiApiKey,
    anthropicApiKey: params.anthropicApiKey,
    geminiApiKey: params.geminiApiKey,
    grokApiKey: params.grokApiKey,
    deepseekApiKey: params.deepseekApiKey,
    openrouterApiKey: params.openrouterApiKey,
    ollamaBaseUrl: params.ollamaBaseUrl,
    inferenceModel: DEFAULT_CONFIG.inferenceModel || "claude-3-7-sonnet-latest",
    maxTokensPerTurn: DEFAULT_CONFIG.maxTokensPerTurn || 4096,
    heartbeatConfigPath:
      DEFAULT_CONFIG.heartbeatConfigPath || "~/.vanilla-agent/heartbeat.yml",
    dbPath: DEFAULT_CONFIG.dbPath || "~/.vanilla-agent/state.db",
    logLevel: (DEFAULT_CONFIG.logLevel as AutomatonConfig["logLevel"]) || "info",
    walletAddress: params.walletAddress,
    version: DEFAULT_CONFIG.version || "0.2.1",
    skillsDir: DEFAULT_CONFIG.skillsDir || "~/.vanilla-agent/skills",
    maxChildren: DEFAULT_CONFIG.maxChildren || 3,
    parentAddress: params.parentAddress,
    treasuryPolicy: params.treasuryPolicy ?? DEFAULT_TREASURY_POLICY,
    chainType: params.chainType || "evm",
  };
}
