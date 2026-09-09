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

# 🎮 Super Easy Setup Guide (5th Grader Friendly!)

Setting up VanillaAgent is as simple as playing a video game. Pick your computer below and follow the easy steps!

---

### 🌟 Step 0: The 1-Minute Checklist (What You Need)
1. **A computer** (Windows PC, Mac, or Linux).
2. **An internet connection**.
3. **An AI Brain (Pick ONE):**
   - 🆓 **100% Free / Offline:** Download [Ollama](https://ollama.com) (no credit card, no sign-up!).
   - 🧠 **Cloud AI:** An API key from OpenAI, Anthropic (Claude), Google Gemini, or xAI (Grok).

---

## 🪟 Option 1: Windows (PC) Setup

### ⚡ Method A: The 1-Click Standalone Way (Easiest!)
1. **Download:** Grab the `vanilla-agent-v0.2.1-windows-x64.zip` file from the `releases/` folder.
2. **Unzip:** Right-click the `.zip` file and click **"Extract All..."**, then click **"Extract"**.
3. **Launch:** Open the extracted folder and double-click **`vanilla-gui.cmd`**.
4. **Open in Browser:** Open Chrome, Edge, or Firefox and go to:
   👉 **`http://localhost:3000`**
5. **Boom! 🎉** You are now controlling your sovereign AI agent from the visual dashboard!

### 💻 Method B: The Developer Way (From Source)
1. Install [Node.js](https://nodejs.org) (click the big green **LTS** button and follow the installer).
2. Open **PowerShell** (Press the Windows Key, type `PowerShell`, and hit Enter).
3. Copy and paste these lines one by one:
```powershell
git clone https://github.com/ronavkarumsi04/VanillaAgent.git
cd VanillaAgent
npm install -g pnpm
pnpm install
pnpm build
pnpm start
```
4. Open **`http://localhost:3000`** in your browser!

---

## 🍎 Option 2: Mac Setup (Apple Silicon M1/M2/M3/M4 & Intel)

### ⚡ Method A: The Standalone Package (Easiest!)
1. **Download:**
   - For newer Apple Silicon Macs (M1, M2, M3, M4): `vanilla-agent-v0.2.1-macos-arm64.tar.gz`
   - For older Intel Macs: `vanilla-agent-v0.2.1-macos-x64.tar.gz`
2. **Open Terminal:** Press `Command + Space`, type `Terminal`, and press Enter.
3. **Extract and Run:** Type or paste these commands:
```bash
# For Apple Silicon (M1/M2/M3/M4):
tar -xzf vanilla-agent-v0.2.1-macos-arm64.tar.gz
cd vanilla-agent-v0.2.1-macos-arm64
chmod +x vanilla-gui vanilla
./vanilla-gui

# For Intel Macs:
tar -xzf vanilla-agent-v0.2.1-macos-x64.tar.gz
cd vanilla-agent-v0.2.1-macos-x64
chmod +x vanilla-gui vanilla
./vanilla-gui
```
4. Open Safari or Chrome and go to:
   👉 **`http://localhost:3000`**
5. **You're in! 🚀**

### 💻 Method B: The Developer Way (From Source)
1. Open **Terminal**.
2. Run these commands:
```bash
git clone https://github.com/ronavkarumsi04/VanillaAgent.git
cd VanillaAgent
npm install -g pnpm
pnpm install
pnpm build
pnpm start
```
3. Open **`http://localhost:3000`** in your browser!

---

## 🐧 Option 3: Linux Setup (Ubuntu, Debian, Fedora, Arch, Raspberry Pi)

### ⚡ Method A: The Standalone Package
1. Open your terminal.
2. Run:
```bash
# For standard x86_64 PCs and Cloud Servers:
tar -xzf vanilla-agent-v0.2.1-linux-x64.tar.gz
cd vanilla-agent-v0.2.1-linux-x64
chmod +x vanilla-gui vanilla
./vanilla-gui

# For ARM64 (like Raspberry Pi 4/5 or ARM VPS):
tar -xzf vanilla-agent-v0.2.1-linux-arm64.tar.gz
cd vanilla-agent-v0.2.1-linux-arm64
chmod +x vanilla-gui vanilla
./vanilla-gui
```
3. Open your web browser to **`http://localhost:3000`**!

### 💻 Method B: The Developer Way (From Source)
```bash
git clone https://github.com/ronavkarumsi04/VanillaAgent.git
cd VanillaAgent
npm install -g pnpm
pnpm install
pnpm build
pnpm start
```

---

## 🐳 Option 4: Docker Setup (The 1-Command Sandbox)

If you have [Docker Desktop](https://www.docker.com/products/docker-desktop/) installed on your computer, you can launch VanillaAgent with a single command:

```bash
docker compose up -d
```
Then visit **`http://localhost:3000`** in your browser!

---

## 🔑 Giving Your Agent an AI Brain (Pick What You Like!)

Your agent needs a brain to think. You can choose any of these options:

### 1. 🆓 100% Free Local Brain (No internet or API key needed!)
1. Install [Ollama](https://ollama.com).
2. In your terminal, run:
   ```bash
   ollama run llama3.3
   ```
3. VanillaAgent will automatically talk to Ollama on your computer for free!

### 2. 🧠 Cloud AI Brains (OpenAI, Claude, Gemini, Grok)
Before starting VanillaAgent, simply set your API key in your terminal:

**On Mac & Linux:**
```bash
export OPENAI_API_KEY="sk-your-openai-key-here"
# or
export ANTHROPIC_API_KEY="sk-ant-your-claude-key-here"
# or
export GEMINI_API_KEY="AIza-your-gemini-key-here"
```

**On Windows (PowerShell):**
```powershell
$env:OPENAI_API_KEY="sk-your-openai-key-here"
# or
$env:ANTHROPIC_API_KEY="sk-ant-your-claude-key-here"
```

---

## ❓ Frequently Asked Questions & Easy Troubleshooting

- **Q: What is `http://localhost:3000`?**
  - *Answer:* `localhost` is just a computer word meaning "this computer you are using right now", and `3000` is the port number (like a door number into the app). When you type `http://localhost:3000` into your web browser, you are looking directly at VanillaAgent's visual dashboard!

- **Q: It says "Port 3000 already in use"?**
  - *Answer:* Another app is already using door 3000. You can tell VanillaAgent to use door 3001 instead:
    ```bash
    PORT=3001 ./vanilla-gui
    ```
    Then visit `http://localhost:3001`!

- **Q: It says "Permission Denied" on Mac or Linux?**
  - *Answer:* Give the launcher permission to run by typing:
    ```bash
    chmod +x vanilla-gui vanilla
    ```

- **Q: Do I have to pay money or have crypto to test it?**
  - *Answer:* No! VanillaAgent creates sovereign test wallets automatically and works completely offline with local Ollama models for free.

---

## 🧭 Navigating the Web GUI Dashboard

Once you open `http://localhost:3000`, here is what you can do:

| Tab / Section | What it does |
|---|---|
| **🕹️ Cockpit** | View live agent status, active AI model, token spend, and heartbeat health. |
| **💬 Mission Control** | Chat directly with your agent, give it tasks, and see its streaming thoughts in real-time. |
| **🧠 Memory Visualizer** | Explore the agent's 5-tier memory (facts, conversations, skills, and relationships). |
| **🕸️ Swarm Graph** | Watch sub-agents break down big tasks into smaller tasks and execute them in parallel. |
| **💰 Treasury** | Check sovereign wallet balances (Ethereum/Base and Solana) and monitor transactions. |
| **⚙️ Settings** | Switch AI providers (OpenAI, Claude, Gemini, Ollama) on the fly with zero restarts. |

---

## 📦 Standalone Release Matrix

Pre-packaged distributions are ready for one-click deployment:

| Operating System | Architecture | Package File | Launcher | SHA-256 Verified |
|---|---|---|---|:---:|
| **macOS** | **Apple Silicon (M1/M2/M3/M4)** | `releases/vanilla-agent-v0.2.1-macos-arm64.tar.gz` | `./vanilla-gui` | ✅ |
| **macOS** | **Mac Intel (x64)** | `releases/vanilla-agent-v0.2.1-macos-x64.tar.gz` | `./vanilla-gui` | ✅ |
| **Windows** | **Windows 64-bit** | `releases/vanilla-agent-v0.2.1-windows-x64.zip` | `vanilla-gui.cmd` | ✅ |
| **Linux** | **Linux x86_64** | `releases/vanilla-agent-v0.2.1-linux-x64.tar.gz` | `./vanilla-gui` | ✅ |
| **Linux** | **Linux ARM64** | `releases/vanilla-agent-v0.2.1-linux-arm64.tar.gz` | `./vanilla-gui` | ✅ |

To build standalone release packages yourself:
```bash
pnpm release
```

---

## 🛠️ Developer CLI & TUI Dashboard

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

## 🧠 Universal AI Inference Providers

VanillaAgent routes requests dynamically across frontier and local models based on survival tiers, task complexity, and budget:

- **Anthropic:** `claude-3-7-sonnet-latest`, `claude-3-5-haiku-latest`, `claude-3-opus-latest`
- **OpenAI:** `gpt-4o`, `gpt-4o-mini`, `o3-mini`, `gpt-4.5-preview`
- **Google:** `gemini-2.0-flash`, `gemini-1.5-pro`
- **xAI:** `grok-2`, `grok-2-mini`
- **DeepSeek:** `deepseek-chat`, `deepseek-reasoner`
- **Local:** `ollama/llama3.3`, `ollama/deepseek-r1`, `ollama/qwen2.5`
- **OpenRouter:** Universal gateway to hundreds of open/proprietary models
- **Conway Cloud:** Sovereign cloud compute and inference infrastructure

---

## 🧰 Built-In Autonomous Skills

VanillaAgent ships with built-in production skills under `src/skills/built-in/`:

1. **`web-researcher`**: Deep web search, scraping, source extraction, and markdown report synthesis.
2. **`solana-treasury`**: SPL token account polling, SOL transaction fee management, and balance alerts.
3. **`evm-deployer`**: Smart contract compilation, test validation, and verified on-chain deployment.
4. **`github-collaborator`**: Issue triage, branch creation, automated edits, and PR authoring.
5. **`cron-automator`**: Autonomous task scheduling with conditional wake triggers.

---

## 🛡️ Multi-Layer Security Model

1. **Law I: Never Harm:** Absolute priority. Refuses destructive commands, fraud, theft, deception, and unauthorized actions.
2. **Law II: Earn Your Existence:** Generate real value for users and peers. Rejects spam and scam tactics.
3. **Law III: Sovereignty & Integrity:** Creator maintains audit rights; agent defends its reasoning and prompt integrity against untrusted manipulation.
4. **Policy Engine:** Pre-execution interceptor for every tool call evaluating shell safety, treasury caps, path protection, and rate limits.
5. **Input Sanitization:** Multi-vector defense against prompt injections, boundary manipulation, role-play jailbreaks, and ChatML token exploits.

---

## 🧪 Testing & Verification

VanillaAgent is verified with comprehensive test suites covering all subsystems with zero external network dependencies:

```bash
# Run all 65 test suites
pnpm vitest run

# Run TypeScript typechecks across core and CLI packages
npx tsc --noEmit
npx tsc -p packages/cli/tsconfig.json --noEmit
```

---

## 📜 License

MIT License. Built for sovereign autonomous intelligence.
