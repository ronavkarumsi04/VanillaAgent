/**
 * vanilla-cli fund
 *
 * Transfer credits to an agent.
 * Usage: vanilla fund <amount> [--to 0x...]
 */

import chalk from "chalk";
import { loadConfig } from "@vanilla-agent/core/config.js";

const args = process.argv.slice(2);
const amountStr = args[1];

if (!amountStr || isNaN(parseFloat(amountStr))) {
  console.error("Usage: vanilla fund <amount-in-usd> [--to 0x...]");
  process.exit(1);
}

const amountCents = Math.round(parseFloat(amountStr) * 100);

const config = loadConfig();
if (!config) {
  console.error("No VanillaAgent configuration found.");
  process.exit(1);
}

let toAddress = config.walletAddress;
const toIdx = args.indexOf("--to");
if (toIdx !== -1 && args[toIdx + 1]) {
  toAddress = args[toIdx + 1];
}

if (!toAddress) {
  console.error("No target address specified and no wallet address in config.");
  process.exit(1);
}

console.log(
  `Transferring ${chalk.green(`$${(amountCents / 100).toFixed(2)}`)} to ${chalk.white(toAddress)}...`,
);

const apiUrl = config.conwayApiUrl || "https://api.conway.tech";
const apiKey = config.conwayApiKey;

if (!apiKey) {
  console.error(
    "No Conway API key found in config. Run `vanilla --setup` to provision one.",
  );
  process.exit(1);
}

try {
  const resp = await fetch(`${apiUrl}/v1/credits/transfer`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      to_address: toAddress,
      amount_cents: amountCents,
    }),
  });

  if (!resp.ok) {
    const errorText = await resp.text();
    console.error(chalk.red(`Transfer failed (${resp.status}): ${errorText}`));
    process.exit(1);
  }

  const result: any = await resp.json();
  console.log(chalk.green("✓ Transfer successful!"));
  if (result.tx_hash) {
    console.log(`Transaction: ${result.tx_hash}`);
  }
} catch (err: any) {
  console.error(chalk.red(`Error: ${err.message}`));
  process.exit(1);
}
