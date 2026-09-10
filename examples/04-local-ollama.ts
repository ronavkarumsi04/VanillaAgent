/**
 * Example 4: Fully Offline Sovereign Agent using Local Ollama
 *
 * Runs an autonomous agent turn using local LLM inference (e.g. Llama 3.3 or DeepSeek R1).
 */

import { InferenceClient } from "../src/conway/inference.js";

async function main() {
  const ollamaUrl = process.env.OLLAMA_BASE_URL || "http://localhost:11434";
  console.log(`Connecting to local Ollama instance at ${ollamaUrl}...`);

  const client = new InferenceClient({
    baseUrl: ollamaUrl,
    apiKey: "",
    defaultModel: "ollama/llama3.3",
    ollamaBaseUrl: ollamaUrl,
  });

  try {
    console.log("Sending prompt to local model...");
    const response = await client.chat([
      { role: "system", content: "You are an autonomous offline agent running locally." },
      { role: "user", content: "Explain how sovereign AI agents earn their own compute." },
    ]);

    console.log(`\nModel Response (${response.model}):\n${response.message.content}`);
    console.log(`Token usage: ${response.tokenUsage?.totalTokens || 0} tokens`);
  } catch (err: any) {
    console.log(`Ollama local request (requires local daemon): ${err.message}`);
  }
}

main();
