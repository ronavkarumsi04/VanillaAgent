/**
 * Unified Signed Message Protocol
 *
 * Defines the signed message interface and utilities for message creation
 * and verification using ECDSA secp256k1.
 *
 * Phase 3.2: Social & Registry Hardening
 */

import crypto from "crypto";
import { ulid } from "ulid";
import {
  keccak256,
  toBytes,
  verifyMessage,
} from "viem";
import bs58 from "bs58";
import nacl from "tweetnacl";
import { detectChainType } from "../identity/chain.js";

/**
 * A fully signed social message.
 */
export interface SignedMessage {
  id: string;
  from: string;
  to: string;
  content: string;
  timestamp: string;
  nonce: string;
  signature: string;
}

/**
 * Create a unique message ID using ULID.
 */
export function createMessageId(): string {
  return ulid();
}

/**
 * Create a cryptographically random nonce for replay protection.
 */
export function createNonce(): string {
  return crypto.randomBytes(16).toString("hex");
}

/**
 * Verify a message signature (supports both EVM ECDSA secp256k1 and Solana Ed25519).
 *
 * Reconstructs the canonical string used during signing and verifies
 * the signature against the expected sender address.
 */
export async function verifyMessageSignature(
  message: { to: string; content: string; signed_at: string; signature: string },
  expectedFrom: string,
): Promise<boolean> {
  try {
    const chainType = detectChainType(expectedFrom);
    const contentHash = keccak256(toBytes(message.content));
    const recipientChainType = detectChainType(message.to);
    const normalizedTo = recipientChainType === "solana" ? message.to : message.to.toLowerCase();
    const canonical = `Conway:send:${normalizedTo}:${contentHash}:${message.signed_at}`;

    if (chainType === "solana") {
      const messageBytes = new TextEncoder().encode(canonical);
      const signatureBytes = bs58.decode(message.signature);
      const publicKeyBytes = bs58.decode(expectedFrom);
      return nacl.sign.detached.verify(messageBytes, signatureBytes, publicKeyBytes);
    }

    const valid = await verifyMessage({
      address: expectedFrom.toLowerCase() as `0x${string}`,
      message: canonical,
      signature: message.signature as `0x${string}`,
    });

    return valid;
  } catch {
    return false;
  }
}
