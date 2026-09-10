/**
 * Example 3: Authoring and Loading Custom Skills
 *
 * Demonstrates parsing SKILL.md frontmatter and registering
 * dynamic capabilities into the agent loop.
 */

import { parseSkillMd } from "../src/skills/format.js";

const customSkillMarkdown = `---
name: market-sentinel
description: Monitors decentralized market signals, DEX volume, and liquidity alerts.
auto-activate: true
---

# Market Sentinel Skill Instructions

When analyzing markets:
1. Fetch 24h volume and price impact across Base and Solana DEX liquidity pools.
2. If volatility exceeds 15% in 1 hour, trigger an alert via social relay.
3. Record high-volume signals into episodic memory.
`;

function main() {
  console.log("Parsing custom skill definition...");
  const skill = parseSkillMd(customSkillMarkdown, "market-sentinel/SKILL.md", "local");

  if (skill) {
    console.log(`✓ Successfully parsed skill: "${skill.name}"`);
    console.log(`Description: ${skill.description}`);
    console.log(`Auto-Activate: ${skill.autoActivate}`);
    console.log(`Instructions length: ${skill.instructions.length} chars`);
  } else {
    console.error("Failed to parse skill.");
  }
}

main();
