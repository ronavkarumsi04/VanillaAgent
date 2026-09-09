/**
 * Example 1: Minimal Sovereign Agent
 *
 * Demonstrates loading wallet identity, initializing state database,
 * and creating an autonomous agent loop with multi-provider inference.
 */

import { loadOrCreateIdentity } from "../src/identity/wallet.js";
import { createDatabase } from "../src/state/database.js";
import { InferenceClient } from "../src/conway/inference.js";
import { loadConfig } from "../src/config.js";

async function main() {
  console.log("Initializing VanillaAgent...");

  // 1. Sovereign cryptographic wallet (EVM / Solana)
  const { identity } = loadOrCreateIdentity({ name: "alpha-agent" });
  console.log(`Agent Address: ${identity.address} (${identity.chainType})`);

  // 2. Load configuration & SQLite database
  const config = loadConfig() || {
    name: "alpha-agent",
    inferenceModel: "claude-3-7-sonnet-latest",
    conwayApiUrl: "https://api.conway.tech",
    conwayApiKey: "",
    maxTokensPerTurn: 4096,
  };
  const db = createDatabase(":memory:");

  // 3. Multi-provider inference client
  const inference = new InferenceClient({
    baseUrl: config.conwayApiUrl,
    apiKey: config.conwayApiKey,
    defaultModel: config.inferenceModel,
    anthropicApiKey: process.env.ANTHROPIC_API_KEY,
    openaiApiKey: process.env.OPENAI_API_KEY,
  });

  // 4. Run a reasoning turn
  console.log("Executing reasoning turn...");
  const response = await inference.chat([
    { role: "system", content: "You are an autonomous sovereign agent." },
    { role: "user", content: "What is your primary constitutional law?" },
  ]);

  console.log(`\nResponse:\n${response.message.content}`);
  db.close();
}

main().catch(console.error);
