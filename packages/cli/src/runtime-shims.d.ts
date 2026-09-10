declare module "@vanilla-agent/core/config.js" {
  export interface AutomatonCliConfig {
    name: string;
    version?: string;
    walletAddress: string;
    creatorAddress: string;
    sandboxId: string;
    dbPath: string;
    inferenceModel: string;
    conwayApiUrl: string;
    conwayApiKey: string;
    openaiApiKey?: string;
    anthropicApiKey?: string;
    geminiApiKey?: string;
    grokApiKey?: string;
    deepseekApiKey?: string;
    openrouterApiKey?: string;
    ollamaBaseUrl?: string;
    socialRelayUrl?: string;
    maxChildren?: number;
  }

  export function loadConfig(): AutomatonCliConfig | null;
  export function resolvePath(p: string): string;
}

declare module "@vanilla-agent/core/identity/wallet.js" {
  export function getVanillaDir(): string;
  export function getWalletPath(dir?: string): string;
  export function loadSovereignWallet(dir?: string): any;
  export function getAccountFromWallet(wallet: any): any;
  export function getIdentityFromWallet(wallet: any): any;
}

declare module "@vanilla-agent/core/identity/chain.js" {
  export type ChainType = "evm" | "solana";
  export interface ChainIdentity {
    readonly chainType: ChainType;
    readonly address: string;
    signMessage(message: string): Promise<string>;
  }
  export function detectChainType(address: string): ChainType | null;
  export function isValidAddress(address: string, chainType?: ChainType): boolean;
  export function isValidEvmAddress(address: string): boolean;
  export function isValidSolanaAddress(address: string): boolean;
  export function normalizeAddress(address: string, chain: ChainType): string;
}

declare module "@vanilla-agent/core/social/signing.js" {
  export interface SignedMessagePayload {
    from: string;
    to: string;
    content: string;
    signed_at: string;
    signature: string;
    reply_to?: string;
  }
  export function signSendPayload(
    signer: any,
    to: string,
    content: string,
    replyTo?: string,
  ): Promise<SignedMessagePayload>;
  export function signPollPayload(
    signer: any,
  ): Promise<{ address: string; signature: string; timestamp: string }>;
}

declare module "@vanilla-agent/core/social/validation.js" {
  export function validateMessage(message: {
    from?: string;
    to?: string;
    content?: string;
    signed_at?: string;
  }): { valid: boolean; errors: string[] };
  export function validateRelayUrl(url: string): void;
}

declare module "@vanilla-agent/core/state/database.js" {
  export interface CliToolCall {
    name: string;
    result: string;
    error?: string;
  }

  export interface CliTurn {
    id: string;
    timestamp: string;
    state: string;
    input?: string;
    inputSource?: string;
    thinking: string;
    toolCalls: CliToolCall[];
    tokenUsage: { totalTokens: number };
    costCents: number;
  }

  export interface CliHeartbeatEntry {
    enabled: boolean;
  }

  export interface CliInstalledTool {
    id: string;
    name: string;
  }

  export interface AutomatonCliDatabase {
    raw: any;
    getAgentState(): string;
    getTurnCount(): number;
    getInstalledTools(): CliInstalledTool[];
    getHeartbeatEntries(): CliHeartbeatEntry[];
    getRecentTurns(limit: number): CliTurn[];
    close(): void;
  }

  export function createDatabase(path: string): AutomatonCliDatabase;
}
