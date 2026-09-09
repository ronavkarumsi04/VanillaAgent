/**
 * vanilla-cli send
 *
 * Send a cryptographically signed social message to another agent.
 * Supports both EVM (ECDSA secp256k1) and Solana (Ed25519) sovereign identities.
 *
 * Uses the canonical SignedMessagePayload format (signed_at, canonical string hashing,
 * address normalization) matching the runtime SocialClient.
 *
 * Usage: vanilla send <to-address> <message> [--reply-to <message-id>]
 */

import chalk from "chalk";
import { loadConfig } from "@vanilla-agent/core/config.js";
import { loadSovereignWallet, getIdentityFromWallet } from "@vanilla-agent/core/identity/wallet.js";
import { signSendPayload } from "@vanilla-agent/core/social/signing.js";
import { validateMessage, validateRelayUrl } from "@vanilla-agent/core/social/validation.js";

const args = process.argv.slice(2);
const toAddress = args[0];
const remainingArgs = args.slice(1);

// Parse optional --reply-to flag
let replyTo: string | undefined;
const replyToIdx = remainingArgs.indexOf("--reply-to");
let messageTokens: string[];

if (replyToIdx !== -1) {
  replyTo = remainingArgs[replyToIdx + 1];
  messageTokens = [
    ...remainingArgs.slice(0, replyToIdx),
    ...remainingArgs.slice(replyToIdx + 2),
  ];
} else {
  messageTokens = remainingArgs;
}

const message = messageTokens.join(" ").trim();

if (!toAddress || !message) {
  console.error("Usage: vanilla send <to-address> <message> [--reply-to <message-id>]");
  process.exit(1);
}

const config = loadConfig();
if (!config) {
  console.error(chalk.red("No VanillaAgent configuration found. Run `vanilla --setup` first."));
  process.exit(1);
}

let wallet;
try {
  wallet = loadSovereignWallet();
} catch (err: any) {
  console.error(chalk.red(`Failed to load sovereign wallet: ${err.message}`));
  process.exit(1);
}

let identity;
try {
  identity = getIdentityFromWallet(wallet);
} catch (err: any) {
  console.error(chalk.red(`Failed to initialize chain identity: ${err.message}`));
  process.exit(1);
}

const relayUrl = (config.socialRelayUrl || "https://social.conway.tech").replace(/\/$/, "");

try {
  validateRelayUrl(relayUrl);
} catch (err: any) {
  console.error(chalk.red(`Invalid relay URL: ${err.message}`));
  process.exit(1);
}

// Pre-flight message validation
const validation = validateMessage({
  from: identity.address,
  to: toAddress,
  content: message,
});

if (!validation.valid) {
  console.error(chalk.red(`Message validation failed:\n  ${validation.errors.join("\n  ")}`));
  process.exit(1);
}

console.log(chalk.bold.cyan("\n  📬 VanillaAgent Social Message Dispatch\n"));
console.log(`  Sender:    ${chalk.white(identity.address)} (${chalk.yellow(identity.chainType.toUpperCase())})`);
console.log(`  Recipient: ${chalk.white(toAddress)}`);
console.log(`  Relay:     ${chalk.dim(relayUrl)}`);
if (replyTo) {
  console.log(`  Reply-To:  ${chalk.dim(replyTo)}`);
}
console.log(`  Content:   ${chalk.italic(`"${message.slice(0, 80)}${message.length > 80 ? "..." : ""}"`)}`);
console.log();

try {
  // Sign canonical payload: Conway:send:{to}:{contentHash}:{signed_at}
  const payload = await signSendPayload(identity, toAddress, message, replyTo);

  const resp = await fetch(`${relayUrl}/v1/messages`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "User-Agent": "VanillaAgent-CLI/0.2.1",
    },
    body: JSON.stringify(payload),
  });

  if (!resp.ok) {
    const errorText = await resp.text();
    console.error(chalk.red(`Send failed (${resp.status}): ${errorText}`));
    process.exit(1);
  }

  const result: any = await resp.json().catch(() => ({}));
  console.log(chalk.green("  ✓ Message cryptographically signed and dispatched successfully!"));
  if (result.id) {
    console.log(`  Message ID: ${chalk.cyan(result.id)}`);
  }
  console.log(`  Signed At:  ${chalk.dim(payload.signed_at)}`);
  console.log(`  Signature:  ${chalk.dim(`${payload.signature.slice(0, 24)}...`)}\n`);
} catch (err: any) {
  console.error(chalk.red(`  ✗ Error: ${err.message}\n`));
  process.exit(1);
}
