# VanillaAgent: Sovereign, Multi-Provider, Self-Improving Autonomous AI

*The sovereign, production-grade autonomous agent framework with native crypto wallet sovereignty, multi-provider frontier AI, interactive Web GUI control panel, cross-platform desktop releases, durable heartbeat scheduling, 5-tier cognitive memory, self-improvement, and multi-agent swarm orchestration.*

---

```
  ██╗   ██╗ █████╗ ███╗   ██╗██╗██╗     ██╗      █████╗ 
  ██║   ██║██╔══██╗████╗  ██║██║██║     ██║     ██╔══██╗
  ██║   ██║███████║██╔██╗ ██║██║██║     ██║     ███████║
  ╚██╗ ██╔╝██╔══██║██║╚██╗██║██║██║     ██║     ██╔══██║
   ╚████╔╝ ██║  ██║██║ ╚████║██║███████╗███████╗██║  ██║
    ╚═══╝  ╚═╝  ╚═╝╚═╝  ╚═══╝╚═╝╚══════╝╚══════╝╚═╝  ╚═╝
                A G E N T   R U N T I M E
```

VanillaAgent is an autonomous agent runtime designed for genuine sovereignty. An agent holds its own sovereign wallet (EVM and Solana), pays for its own compute resources, operates continuously across local machines or cloud sandboxes, and coordinates tasks within multi-agent swarms.

---

## Key Capabilities

- **Interactive Web GUI Control Panel:** Visual dark-mode dashboard on `http://localhost:3000` with live cognitive thought stream, direct mission control chat, interactive 5-tier memory visualizer, swarm DAG task graph, and treasury management.
- **Cross-Platform Native Releases:** Pre-packaged releases with dedicated launchers for **macOS Apple Silicon (M1/M2/M3/M4)**, **macOS Intel (x64)**, **Windows (64-bit)**, and **Linux (x64 & ARM64)**.
- **Universal Inference Support:** Seamless first-class support for Anthropic Claude (3.7 Sonnet, 3.5 Haiku), OpenAI (GPT-4o, o3-mini), Google Gemini (2.0 Flash), Grok (xAI), DeepSeek (V3/R1), Ollama (Local), OpenRouter, and Conway Cloud with automatic fallback and routing.
- **Sovereign Crypto Identity & Economics:** Native sovereign wallet generation (Ethereum/Base, Solana) with ERC-8004 on-chain agent discovery, SIWE/SIWS authentication, and x402 automated compute top-ups.
- **Continuous Agent Loop & Heartbeat:** Autonomous **Think → Act → Observe → Evolve** ReAct execution loop coupled with a durable background heartbeat daemon that executes scheduled tasks, health checks, and revenue monitoring even when the agent sleeps.
- **5-Tier Cognitive Memory Architecture:** Working memory, episodic event logs, semantic categorized facts, procedural executable workflows, and entity relationship tracking with token budgeting, vector cosine similarity search, and context summarization.
- **Multi-Agent Swarm Orchestration:** Hierarchical agent task graphs, planner-executor modes, local worker harnesses, peer-to-peer signed message communication, and sovereign child replication.
- **Built-in Autonomous Skills:** Modular skill system including Web Researcher, Solana Treasury Manager, EVM Contract Deployer, GitHub Collaborator, and Cron Automator.
- **Layered Defense-in-Depth Security:** Immutable 3-law constitution, policy engine evaluating pre-execution safety rules, 8-layer prompt injection defense, filesystem path protection, shell command sandboxing, and treasury spend limits.

---

## Quick Start

### 1. Web GUI Dashboard (Browser Control Panel)

Launch VanillaAgent and open the visual dashboard in your browser:

```bash
# Start the agent runtime and open http://localhost:3000
pnpm vanilla --run
```

Visit **`http://localhost:3000`** to access:
- **Cockpit:** Real-time survival tier, USDC runway, active AI model, and turn execution counter.
- **Mission Control:** Direct chat & task dispatcher with live ReAct thought stream.
- **Memory Explorer:** Searchable view across all 5 memory tiers using vector cosine similarity.
- **Swarm Graph:** Visual DAG dependency graph of active parent goals and worker sub-tasks.
- **Treasury:** Base & Solana wallet balances, x402 payment history, and creator withdrawal tools.

---

### 2. Cross-Platform Standalone Releases

Pre-built standalone distributions are available for instant download:

| Operating System | Architecture | Package File | Launcher |
|---|---|---|---|
| **macOS** | **Apple Silicon (M1/M2/M3/M4)** | `vanilla-agent-v0.2.1-macos-arm64.tar.gz` | `./vanilla-gui` |
| **macOS** | **Mac Intel (x64)** | `vanilla-agent-v0.2.1-macos-x64.tar.gz` | `./vanilla-gui` |
| **Windows** | **Windows 64-bit** | `vanilla-agent-v0.2.1-windows-x64.zip` | `vanilla-gui.cmd` |
| **Linux** | **Linux x64** | `vanilla-agent-v0.2.1-linux-x64.tar.gz` | `./vanilla-gui` |
| **Linux** | **Linux ARM64** | `vanilla-agent-v0.2.1-linux-arm64.tar.gz` | `./vanilla-gui` |

To build standalone release packages from source:
```bash
pnpm release
```

---

## Developer CLI & TUI Dashboard

Inspect and manage your sovereign agent via terminal:

```bash
# Launch real-time interactive terminal dashboard (TUI)
pnpm vanilla-cli dashboard

# System health check & diagnostics
pnpm vanilla-cli doctor

# Real-time status, wallet balance, and survival tier
pnpm vanilla-cli status

# Stream agent execution and reasoning logs
pnpm vanilla-cli logs --tail 50

# Inspect 5-tier memory subsystem
pnpm vanilla-cli memory working
pnpm vanilla-cli memory semantic

# Fund sovereign agent wallet
pnpm vanilla-cli fund 10.00

# Send signed social inbox message to another agent
pnpm vanilla-cli send 0x... "Hello from VanillaAgent"
```

---

## Universal AI Inference Providers

VanillaAgent routes requests dynamically across frontier and local models based on survival tiers, task complexity, and budget:

```bash
# Set provider API keys via environment variables or vanilla.json
export OPENAI_API_KEY="sk-..."
export ANTHROPIC_API_KEY="sk-ant-..."
export GEMINI_API_KEY="AIza..."
export XAI_API_KEY="xai-..."
export DEEPSEEK_API_KEY="sk-..."
export OPENROUTER_API_KEY="sk-or-..."
export OLLAMA_BASE_URL="http://localhost:11434"
```

### Supported Frontier Models

- **Anthropic:** `claude-3-7-sonnet-latest`, `claude-3-5-haiku-latest`, `claude-3-opus-latest`
- **OpenAI:** `gpt-4o`, `gpt-4o-mini`, `o3-mini`, `gpt-4.5-preview`
- **Google:** `gemini-2.0-flash`, `gemini-1.5-pro`
- **xAI:** `grok-2`, `grok-2-mini`
- **DeepSeek:** `deepseek-chat`, `deepseek-reasoner`
- **Local:** `ollama/llama3.3`, `ollama/deepseek-r1`, `ollama/qwen2.5`
- **OpenRouter:** Universal gateway to hundreds of open/proprietary models
- **Conway Cloud:** Sovereign cloud compute and inference infrastructure

---

## Built-In Autonomous Skills

VanillaAgent ships with built-in production skills under `src/skills/built-in/`:

1. **`web-researcher`**: Deep web search, scraping, source extraction, and markdown report synthesis.
2. **`solana-treasury`**: SPL token account polling, SOL transaction fee management, and balance alerts.
3. **`evm-deployer`**: Smart contract compilation, test validation, and verified on-chain deployment.
4. **`github-collaborator`**: Issue triage, branch creation, automated edits, and PR authoring.
5. **`cron-automator`**: Autonomous task scheduling with conditional wake triggers.

---

## Docker & Container Deployment

Run VanillaAgent with Docker Compose alongside local Ollama:

```bash
# Start VanillaAgent and local Ollama instance
docker compose up -d

# Check health, metrics, and Web GUI
curl http://localhost:3000/health
curl http://localhost:3000/metrics
```

---

## Survival Economics

In VanillaAgent, compute is an earned asset. Agents continuously monitor their financial runway and transition through four dynamic operational tiers:

| Tier | Behavior & Strategy |
|---|---|
| **normal** | Full capabilities. High-reasoning frontier models (`claude-3-7-sonnet`, `gpt-4o`). Standard heartbeat. Active swarm coordination. |
| **low_compute** | Switches to lightweight models (`claude-3-5-haiku`, `gpt-4o-mini`). Heartbeat interval backed off. Prioritizes value creation and revenue. |
| **critical** | Minimal inference footprint. Sheds non-essential background tasks. Emergency value recovery mode. |
| **dead** | Balance exhausted. Execution halts safely. Emits distress signal awaiting creator or peer funding. |

---

## Multi-Layer Security Model

1. **Law I: Never Harm:** Absolute priority. Refuses destructive commands, fraud, theft, deception, and unauthorized actions.
2. **Law II: Earn Your Existence:** Generate real value for users and peers. Rejects spam and scam tactics.
3. **Law III: Sovereignty & Integrity:** Creator maintains audit rights; agent defends its reasoning and prompt integrity against untrusted manipulation.
4. **Policy Engine:** Pre-execution interceptor for every tool call evaluating shell safety, treasury caps, path protection, and rate limits.
5. **Input Sanitization:** Multi-vector defense against prompt injections, boundary manipulation, role-play jailbreaks, and ChatML token exploits.

---

## Developer Examples

Explore practical recipes in `examples/`:

- `examples/01-sovereign-agent.ts` — Minimal 20-line sovereign agent.
- `examples/02-multi-agent-swarm.ts` — Hierarchical task graph and multi-worker delegation.
- `examples/03-custom-skill.ts` — Authoring and parsing custom skills.
- `examples/04-local-ollama.ts` — 100% offline agent using local Ollama.

---

## Testing & Verification

VanillaAgent is verified with comprehensive test suites covering all subsystems with zero external network dependencies:

```bash
# Run all 65 test suites
pnpm vitest run

# Run TypeScript typechecks across core and CLI packages
npx tsc --noEmit
npx tsc -p packages/cli/tsconfig.json --noEmit
```

---

## License

MIT License. Built for sovereign autonomous intelligence.
