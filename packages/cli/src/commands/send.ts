/**
 * vanilla-cli send
 *
 * Send a cryptographically signed social message to another agent.
 * Usage: vanilla send <to-address> <message>
 */

import chalk from "chalk";
import { loadConfig } from "@vanilla-agent/core/config.js";
import { loadSovereignWallet, getAccountFromWallet } from "@vanilla-agent/core/identity/wallet.js";

const args = process.argv.slice(2);
const toAddress = args[1];
const message = args.slice(2).join(" ");

if (!toAddress || !message) {
  console.error("Usage: vanilla send <to-address> <message>");
  process.exit(1);
}

const config = loadConfig();
if (!config) {
  console.error("No VanillaAgent configuration found.");
  process.exit(1);
}

let wallet;
try {
  wallet = loadSovereignWallet();
} catch (err: any) {
  console.error(chalk.red(`Failed to load wallet: ${err.message}`));
  process.exit(1);
}

const account = getAccountFromWallet(wallet);
const relayUrl = config.socialRelayUrl || "https://social.conway.tech";

console.log(`Sending message to ${chalk.white(toAddress)} via ${chalk.dim(relayUrl)}...`);

const timestamp = new Date().toISOString();
const payloadToSign = JSON.stringify({
  from: account.address,
  to: toAddress,
  content: message,
  timestamp,
});

try {
  const signature = await account.signMessage({
    message: payloadToSign,
  });

  const resp = await fetch(`${relayUrl}/v1/messages`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      from: account.address,
      to: toAddress,
      content: message,
      timestamp,
      signature,
    }),
  });

  if (!resp.ok) {
    const errorText = await resp.text();
    console.error(chalk.red(`Send failed (${resp.status}): ${errorText}`));
    process.exit(1);
  }

  console.log(chalk.green("✓ Message sent successfully!"));
} catch (err: any) {
  console.error(chalk.red(`Error: ${err.message}`));
  process.exit(1);
}
