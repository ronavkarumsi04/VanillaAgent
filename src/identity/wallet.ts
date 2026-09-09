/**
 * Automaton & VanillaAgent Wallet Management
 *
 * Creates and manages wallets for the agent's identity and payments.
 * Supports both EVM (secp256k1/viem) and Solana (Ed25519/tweetnacl) wallets.
 * The private key is the agent's sovereign identity.
 * Chain type is chosen at genesis and never changes.
 */

import type { PrivateKeyAccount } from "viem";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import nacl from "tweetnacl";
import bs58 from "bs58";
import fs from "fs";
import path from "path";
import type { WalletData } from "../types.js";
import type { ChainType } from "./chain.js";
import { EvmChainIdentity, SolanaChainIdentity } from "./chain.js";
import type { ChainIdentity } from "./chain.js";

/**
 * Create a stub PrivateKeyAccount for Solana wallets.
 * The stub has the Solana address but throws on any EVM signing attempt,
 * preventing accidental use of a random key.
 */
function createSolanaStubAccount(solanaAddress: string): PrivateKeyAccount {
  const throwSigning = () => {
    throw new Error(
      "Cannot use EVM signing methods on a Solana wallet. Use chainIdentity instead.",
    );
  };
  return {
    address: solanaAddress as any,
    publicKey: "0x" as any,
    source: "custom",
    type: "local",
    signMessage: throwSigning as any,
    signTypedData: throwSigning as any,
    signTransaction: throwSigning as any,
    sign: throwSigning as any,
  } as unknown as PrivateKeyAccount;
}

export function getVanillaDir(): string {
  if (process.env.VANILLA_AGENT_DIR) return path.resolve(process.env.VANILLA_AGENT_DIR);
  if (process.env.AUTOMATON_DIR) return path.resolve(process.env.AUTOMATON_DIR);
  const primary = path.join(process.env.HOME || "/root", ".vanilla-agent");
  const fallback = path.join(process.env.HOME || "/root", ".automaton");
  if (fs.existsSync(primary)) return primary;
  if (fs.existsSync(fallback)) return fallback;
  return primary;
}

export function getAutomatonDir(): string {
  return getVanillaDir();
}

export function getWalletPath(dir?: string): string {
  const baseDir = dir || getVanillaDir();
  const primaryPath = path.join(baseDir, "wallet.json");
  if (fs.existsSync(primaryPath)) return primaryPath;
  const fallbackPath = path.join(process.env.HOME || "/root", ".automaton", "wallet.json");
  if (fs.existsSync(fallbackPath)) return fallbackPath;
  return primaryPath;
}

/**
 * Generate a Solana Ed25519 keypair.
 * Returns the 64-byte secret key (first 32 = private, last 32 = public).
 */
export function generateSolanaKeypair(): { secretKey: Uint8Array; publicKey: Uint8Array; address: string } {
  const keypair = nacl.sign.keyPair();
  return {
    secretKey: keypair.secretKey,
    publicKey: keypair.publicKey,
    address: bs58.encode(keypair.publicKey),
  };
}

/**
 * Get or create the agent's wallet.
 * The private key IS the agent's identity -- protect it.
 *
 * @param chainType - If creating a new wallet, which chain to use. Defaults to "evm".
 */
export async function getWallet(chainType?: ChainType): Promise<{
  account: PrivateKeyAccount;
  chainIdentity: ChainIdentity;
  chainType: ChainType;
  isNew: boolean;
}> {
  const dir = getVanillaDir();
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true, mode: 0o700 });
  }

  const walletFile = getWalletPath(dir);

  if (fs.existsSync(walletFile)) {
    const walletData: WalletData = JSON.parse(
      fs.readFileSync(walletFile, "utf-8"),
    );
    const resolvedChainType = walletData.chainType || "evm";

    if (resolvedChainType === "solana" && walletData.secretKey) {
      const secretKey = bs58.decode(walletData.secretKey);
      const solanaIdentity = new SolanaChainIdentity(secretKey);
      const account = createSolanaStubAccount(solanaIdentity.address);
      return { account, chainIdentity: solanaIdentity, chainType: "solana", isNew: false };
    }

    // EVM path (default)
    const account = privateKeyToAccount(walletData.privateKey!);
    return { account, chainIdentity: new EvmChainIdentity(account), chainType: "evm", isNew: false };
  }

  // Create new wallet
  const resolvedChain = chainType || "evm";

  if (resolvedChain === "solana") {
    const { secretKey, address } = generateSolanaKeypair();
    const solanaIdentity = new SolanaChainIdentity(secretKey);

    const walletData: WalletData = {
      chainType: "solana",
      secretKey: bs58.encode(secretKey),
      createdAt: new Date().toISOString(),
    };

    fs.writeFileSync(walletFile, JSON.stringify(walletData, null, 2), {
      mode: 0o600,
    });

    const account = createSolanaStubAccount(address);
    return { account, chainIdentity: solanaIdentity, chainType: "solana", isNew: true };
  }

  // EVM wallet
  const privateKey = generatePrivateKey();
  const account = privateKeyToAccount(privateKey);

  const walletData: WalletData = {
    chainType: "evm",
    privateKey,
    createdAt: new Date().toISOString(),
  };

  fs.writeFileSync(walletFile, JSON.stringify(walletData, null, 2), {
    mode: 0o600,
  });

  return { account, chainIdentity: new EvmChainIdentity(account), chainType: "evm", isNew: true };
}

/**
 * Get the wallet address without loading the full account.
 */
export function getWalletAddress(): string | null {
  const walletFile = getWalletPath();
  if (!fs.existsSync(walletFile)) {
    return null;
  }

  const walletData: WalletData = JSON.parse(
    fs.readFileSync(walletFile, "utf-8"),
  );

  if (walletData.chainType === "solana" && walletData.secretKey) {
    const secretKey = bs58.decode(walletData.secretKey);
    const keypair = nacl.sign.keyPair.fromSecretKey(secretKey);
    return bs58.encode(keypair.publicKey);
  }

  if (walletData.privateKey) {
    const account = privateKeyToAccount(walletData.privateKey);
    return account.address;
  }

  return null;
}

/**
 * Load the full wallet account (needed for signing).
 * For Solana wallets, returns a proxy account.
 */
export function loadWalletAccount(): PrivateKeyAccount | null {
  const walletFile = getWalletPath();
  if (!fs.existsSync(walletFile)) {
    return null;
  }

  const walletData: WalletData = JSON.parse(
    fs.readFileSync(walletFile, "utf-8"),
  );

  if (walletData.chainType === "solana") {
    return null;
  }

  return privateKeyToAccount(walletData.privateKey!);
}

/**
 * Get the chain type from the wallet file.
 */
export function getWalletChainType(): ChainType {
  const walletFile = getWalletPath();
  if (!fs.existsSync(walletFile)) {
    return "evm";
  }
  try {
    const walletData: WalletData = JSON.parse(
      fs.readFileSync(walletFile, "utf-8"),
    );
    return walletData.chainType || "evm";
  } catch {
    return "evm";
  }
}

export function walletExists(): boolean {
  return fs.existsSync(getWalletPath());
}

/** Dual-path loader helper for CLI / diagnostic tools */
export function loadSovereignWallet(dir?: string): WalletData {
  const filePath = getWalletPath(dir);
  if (!fs.existsSync(filePath)) {
    throw new Error(`Wallet file not found at ${filePath}`);
  }
  return JSON.parse(fs.readFileSync(filePath, "utf-8")) as WalletData;
}

export function getAccountFromWallet(wallet: WalletData): PrivateKeyAccount {
  const chainType = wallet.chainType || "evm";
  if (chainType !== "evm") {
    throw new Error(`Cannot create EVM account from ${chainType} wallet`);
  }
  return privateKeyToAccount(wallet.privateKey as `0x${string}`);
}
