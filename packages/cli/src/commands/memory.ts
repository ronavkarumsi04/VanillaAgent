/**
 * vanilla-cli memory
 *
 * Inspect agent memory tiers: working, episodic, semantic, procedural, relationships.
 */

import chalk from "chalk";
import fs from "fs";
import { loadConfig, resolvePath } from "@vanilla-agent/core/config.js";
import { createDatabase } from "@vanilla-agent/core/state/database.js";

const args = process.argv.slice(2);
const tierArg = args[1]?.toLowerCase() || "all";

const config = loadConfig();
if (!config) {
  console.error(chalk.red("No VanillaAgent configuration found."));
  process.exit(1);
}

const dbPath = resolvePath(config.dbPath);
if (!fs.existsSync(dbPath)) {
  console.log(chalk.yellow("State database not found."));
  process.exit(0);
}

const db = createDatabase(dbPath);

console.log(chalk.bold.cyan(`\n  🧠 VanillaAgent Memory Inspector [Tier: ${tierArg.toUpperCase()}]\n`));

try {
  if (tierArg === "all" || tierArg === "working") {
    console.log(chalk.bold("  [1] Working Memory (Active Session):"));
    const rows = db.raw.prepare("SELECT * FROM working_memory ORDER BY created_at DESC LIMIT 5").all();
    if (rows.length === 0) console.log(chalk.dim("      (empty)"));
    for (const r of rows) {
      console.log(`      • [${chalk.cyan(r.content_type)}] ${chalk.white(r.content)}`);
    }
    console.log();
  }

  if (tierArg === "all" || tierArg === "episodic") {
    console.log(chalk.bold("  [2] Episodic Memory (Recent Experiences):"));
    const rows = db.raw.prepare("SELECT * FROM episodic_memory ORDER BY created_at DESC LIMIT 5").all();
    if (rows.length === 0) console.log(chalk.dim("      (empty)"));
    for (const r of rows) {
      console.log(`      • [${chalk.cyan(r.event_type)}] ${chalk.white(r.summary)} (Outcome: ${r.outcome || "ok"})`);
    }
    console.log();
  }

  if (tierArg === "all" || tierArg === "semantic") {
    console.log(chalk.bold("  [3] Semantic Memory (Learned Facts):"));
    const rows = db.raw.prepare("SELECT * FROM semantic_memory ORDER BY access_count DESC LIMIT 5").all();
    if (rows.length === 0) console.log(chalk.dim("      (empty)"));
    for (const r of rows) {
      console.log(`      • ${chalk.cyan(r.category)} / ${chalk.bold(r.key)}: ${chalk.white(r.value)}`);
    }
    console.log();
  }

  if (tierArg === "all" || tierArg === "relationships") {
    console.log(chalk.bold("  [4] Relationship Memory (Known Entities & Peers):"));
    const rows = db.raw.prepare("SELECT * FROM relationship_memory ORDER BY trust_score DESC LIMIT 5").all();
    if (rows.length === 0) console.log(chalk.dim("      (empty)"));
    for (const r of rows) {
      console.log(`      • ${chalk.white(r.entity_name || r.entity_address)}: ${r.relationship_type} (Trust: ${chalk.green(r.trust_score)})`);
    }
    console.log();
  }
} catch (err: any) {
  console.log(chalk.dim(`  Memory tables not initialized or query failed: ${err.message}`));
}

db.close();
