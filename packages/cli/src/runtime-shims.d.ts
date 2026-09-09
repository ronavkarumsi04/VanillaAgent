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
