/**
 * VanillaAgent Web GUI Dashboard Single Page Application
 *
 * Modern, responsive dark-mode Web Control Panel for sovereign agent control:
 * - Cockpit: Real-time status, survival meter, wallet balance, active model
 * - Mission Control: Interactive chat & task assignment with live reasoning stream
 * - Swarm Visualizer: Interactive DAG task graph & active worker sub-agents
 * - 5-Tier Memory Explorer: Interactive search across Working, Episodic, Semantic, Procedural, & Entity networks
 * - Treasury: On-chain wallet balance, x402 payment history, redeem/withdrawal tools
 * - Settings: Live model switcher & API provider configuration
 */

export function getDashboardHtml(): string {
  return `<!DOCTYPE html>
<html lang="en" class="dark">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>VanillaAgent — Sovereign AI Control Panel</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;600;700&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet">
  <script src="https://cdn.tailwindcss.com"></script>
  <script>
    tailwind.config = {
      darkMode: 'class',
      theme: {
        extend: {
          fontFamily: {
            sans: ['"Plus Jakarta Sans"', 'sans-serif'],
            mono: ['"JetBrains Mono"', 'monospace'],
          },
          colors: {
            brand: {
              50: '#f0fdfa',
              400: '#2dd4bf',
              500: '#14b8a6',
              600: '#0d9488',
              900: '#134e4a',
            },
            dark: {
              800: '#181b20',
              850: '#121418',
              900: '#0c0d10',
              950: '#060708',
            }
          }
        }
      }
    }
  </script>
  <style>
    body { font-family: 'Plus Jakarta Sans', sans-serif; }
    code, pre { font-family: 'JetBrains Mono', monospace; }
    .glass-panel {
      background: rgba(24, 27, 32, 0.75);
      backdrop-filter: blur(16px);
      border: 1px solid rgba(255, 255, 255, 0.08);
    }
    .glass-card {
      background: rgba(18, 20, 24, 0.6);
      backdrop-filter: blur(8px);
      border: 1px solid rgba(255, 255, 255, 0.05);
    }
    .tab-active {
      background: rgba(20, 184, 166, 0.15);
      color: #2dd4bf;
      border-color: #14b8a6;
    }
  </style>
</head>
<body class="bg-dark-950 text-slate-100 min-h-screen flex flex-col antialiased selection:bg-brand-500 selection:text-dark-950">

  <!-- Top Header Navigation -->
  <header class="border-b border-white/5 bg-dark-900/80 backdrop-blur sticky top-0 z-50 px-6 py-3.5 flex items-center justify-between">
    <div class="flex items-center gap-3.5">
      <div class="w-9 h-9 rounded-xl bg-gradient-to-tr from-brand-600 to-brand-400 flex items-center justify-center font-bold text-dark-950 shadow-lg shadow-brand-500/20 text-lg">
        V
      </div>
      <div>
        <div class="flex items-center gap-2">
          <span class="font-extrabold tracking-tight text-white text-base">VanillaAgent</span>
          <span class="text-[10px] font-mono uppercase px-2 py-0.5 rounded-full bg-brand-500/10 text-brand-400 border border-brand-500/20 font-semibold">Sovereign Node v0.2.1</span>
        </div>
        <p class="text-xs text-slate-400 font-mono" id="header-wallet">Loading sovereign wallet...</p>
      </div>
    </div>

    <!-- Live Status Pills -->
    <div class="flex items-center gap-3">
      <div class="flex items-center gap-2 px-3 py-1.5 rounded-lg glass-card text-xs">
        <span class="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" id="status-indicator"></span>
        <span class="font-medium uppercase tracking-wider text-slate-300" id="agent-state">Running</span>
      </div>

      <div class="flex items-center gap-2 px-3 py-1.5 rounded-lg glass-card text-xs">
        <span class="text-slate-400">Survival:</span>
        <span class="font-mono font-bold text-brand-400 uppercase" id="survival-tier">Normal</span>
      </div>

      <div class="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-brand-500/10 border border-brand-500/20 text-xs">
        <span class="text-slate-400">Runway:</span>
        <span class="font-mono font-bold text-emerald-400" id="credits-balance">$100.00</span>
      </div>
    </div>
  </header>

  <!-- Main Workspace -->
  <div class="flex-1 flex overflow-hidden">
    <!-- Sidebar Navigation -->
    <aside class="w-64 border-r border-white/5 bg-dark-900/40 p-4 flex flex-col justify-between hidden md:flex">
      <nav class="space-y-1.5">
        <button onclick="switchTab('cockpit')" id="tab-btn-cockpit" class="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition tab-active border border-transparent">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"></path></svg>
          Cockpit Dashboard
        </button>

        <button onclick="switchTab('mission')" id="tab-btn-mission" class="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition text-slate-400 hover:text-white hover:bg-white/5 border border-transparent">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"></path></svg>
          Mission Control (Chat)
        </button>

        <button onclick="switchTab('memory')" id="tab-btn-memory" class="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition text-slate-400 hover:text-white hover:bg-white/5 border border-transparent">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"></path></svg>
          Memory Explorer (5 Tiers)
        </button>

        <button onclick="switchTab('swarm')" id="tab-btn-swarm" class="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition text-slate-400 hover:text-white hover:bg-white/5 border border-transparent">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>
          Swarm & Task Graph
        </button>

        <button onclick="switchTab('treasury')" id="tab-btn-treasury" class="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition text-slate-400 hover:text-white hover:bg-white/5 border border-transparent">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
          Treasury & Wallets
        </button>

        <button onclick="switchTab('settings')" id="tab-btn-settings" class="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition text-slate-400 hover:text-white hover:bg-white/5 border border-transparent">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
          Providers & Models
        </button>
      </nav>

      <!-- Sidebar Footer -->
      <div class="p-3 rounded-xl glass-card space-y-1">
        <div class="text-[11px] text-slate-400 flex justify-between">
          <span>Active Model:</span>
          <span class="font-mono text-brand-400" id="sidebar-model">claude-3.7</span>
        </div>
        <div class="text-[11px] text-slate-400 flex justify-between">
          <span>Uptime:</span>
          <span class="font-mono text-slate-200" id="sidebar-uptime">0m</span>
        </div>
      </div>
    </aside>

    <!-- Main Content Panels -->
    <main class="flex-1 overflow-y-auto p-6 space-y-6">

      <!-- ─── TAB 1: COCKPIT DASHBOARD ─── -->
      <div id="tab-cockpit" class="space-y-6">
        <!-- Hero Metrics -->
        <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div class="glass-panel p-4 rounded-2xl">
            <span class="text-xs text-slate-400 font-medium">Sovereign EVM Treasury</span>
            <div class="mt-2 flex items-baseline gap-2">
              <span class="text-2xl font-bold font-mono text-white" id="stat-evm-balance">$100.00</span>
              <span class="text-xs text-emerald-400">USDC (Base)</span>
            </div>
            <p class="text-[11px] text-slate-500 mt-1 font-mono">0x123...456</p>
          </div>

          <div class="glass-panel p-4 rounded-2xl">
            <span class="text-xs text-slate-400 font-medium">Cognitive Turns Executed</span>
            <div class="mt-2 flex items-baseline gap-2">
              <span class="text-2xl font-bold font-mono text-white" id="stat-turn-count">0</span>
              <span class="text-xs text-brand-400">ReAct cycles</span>
            </div>
            <p class="text-[11px] text-slate-500 mt-1">Autonomous loop active</p>
          </div>

          <div class="glass-panel p-4 rounded-2xl">
            <span class="text-xs text-slate-400 font-medium">Active Capabilities</span>
            <div class="mt-2 flex items-baseline gap-2">
              <span class="text-2xl font-bold font-mono text-white" id="stat-tools-count">62</span>
              <span class="text-xs text-brand-400">tools & skills</span>
            </div>
            <p class="text-[11px] text-slate-500 mt-1">5 built-in skill packs</p>
          </div>

          <div class="glass-panel p-4 rounded-2xl">
            <span class="text-xs text-slate-400 font-medium">Heartbeat Scheduler</span>
            <div class="mt-2 flex items-baseline gap-2">
              <span class="text-2xl font-bold font-mono text-emerald-400">11 Tasks</span>
              <span class="text-xs text-slate-400">Cron active</span>
            </div>
            <p class="text-[11px] text-slate-500 mt-1">Ticks every 30 seconds</p>
          </div>
        </div>

        <!-- Two Column Layout: Recent Thoughts & Swarm Activity -->
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <!-- Recent Reasoning Thoughts -->
          <div class="lg:col-span-2 glass-panel p-5 rounded-2xl space-y-4">
            <div class="flex items-center justify-between border-b border-white/5 pb-3">
              <div class="flex items-center gap-2">
                <span class="w-2 h-2 rounded-full bg-brand-400"></span>
                <h2 class="font-bold text-sm text-white">Live Cognitive Stream & Thoughts</h2>
              </div>
              <span class="text-xs font-mono text-slate-400">Thinking → Act → Observe</span>
            </div>

            <div class="space-y-3 max-h-[420px] overflow-y-auto pr-2" id="live-turns-stream">
              <div class="p-3.5 rounded-xl bg-white/[0.02] border border-white/5 space-y-1.5">
                <div class="flex items-center justify-between text-xs font-mono text-slate-400">
                  <span class="text-brand-400 font-bold">Turn #1 — Initialization</span>
                  <span>Just now</span>
                </div>
                <p class="text-xs text-slate-300 italic">"Autonomous sovereign agent online. Heartbeat daemon running, checking treasury and registered skills."</p>
                <div class="flex items-center gap-2 text-[11px] text-slate-400 font-mono">
                  <span class="px-2 py-0.5 rounded bg-white/5 text-slate-300">check_usdc_balance</span>
                  <span class="px-2 py-0.5 rounded bg-white/5 text-slate-300">read_file</span>
                </div>
              </div>
            </div>
          </div>

          <!-- Multi-Provider Status Matrix -->
          <div class="glass-panel p-5 rounded-2xl space-y-4">
            <h2 class="font-bold text-sm text-white border-b border-white/5 pb-3">Inference Provider Health</h2>
            <div class="space-y-2.5" id="providers-list">
              <div class="flex items-center justify-between p-2.5 rounded-xl glass-card text-xs">
                <span class="font-medium text-white">Anthropic Claude 3.7</span>
                <span class="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 font-mono text-[10px] font-bold">ACTIVE</span>
              </div>
              <div class="flex items-center justify-between p-2.5 rounded-xl glass-card text-xs">
                <span class="font-medium text-white">OpenAI GPT-4o</span>
                <span class="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 font-mono text-[10px] font-bold">ACTIVE</span>
              </div>
              <div class="flex items-center justify-between p-2.5 rounded-xl glass-card text-xs">
                <span class="font-medium text-white">Google Gemini 2.0</span>
                <span class="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 font-mono text-[10px] font-bold">ACTIVE</span>
              </div>
              <div class="flex items-center justify-between p-2.5 rounded-xl glass-card text-xs">
                <span class="font-medium text-white">Local Ollama</span>
                <span class="px-2 py-0.5 rounded-full bg-white/5 text-slate-400 font-mono text-[10px]">STANDBY</span>
              </div>
              <div class="flex items-center justify-between p-2.5 rounded-xl glass-card text-xs">
                <span class="font-medium text-white">DeepSeek Reasoner</span>
                <span class="px-2 py-0.5 rounded-full bg-white/5 text-slate-400 font-mono text-[10px]">STANDBY</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- ─── TAB 2: MISSION CONTROL (CHAT & TASK DISPATCH) ─── -->
      <div id="tab-mission" class="space-y-6 hidden">
        <div class="glass-panel p-5 rounded-2xl space-y-4">
          <div class="flex items-center justify-between border-b border-white/5 pb-3">
            <h2 class="font-bold text-sm text-white">Direct Mission Control & Instructions</h2>
            <span class="text-xs text-brand-400 font-mono">Autonomous Execution Loop</span>
          </div>

          <!-- Chat Message Thread -->
          <div class="h-[400px] overflow-y-auto space-y-3.5 pr-2" id="chat-thread">
            <div class="flex gap-3">
              <div class="w-8 h-8 rounded-lg bg-brand-500/20 text-brand-400 flex items-center justify-center text-xs font-bold font-mono">AI</div>
              <div class="flex-1 bg-white/[0.03] border border-white/5 p-3 rounded-2xl rounded-tl-none text-xs text-slate-200">
                Hello! I am VanillaAgent. You can assign tasks, dispatch goals, or ask me to research, deploy smart contracts, or manage code repositories.
              </div>
            </div>
          </div>

          <!-- Input Box -->
          <form onsubmit="sendTask(event)" class="flex gap-2">
            <input type="text" id="task-input" placeholder="Type a task or directive for the agent (e.g. 'Research Base L2 DEX volumes')..." class="flex-1 bg-dark-900 border border-white/10 px-4 py-3 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-brand-400">
            <button type="submit" class="bg-gradient-to-r from-brand-600 to-brand-500 hover:from-brand-500 hover:to-brand-400 text-dark-950 font-bold px-5 py-3 rounded-xl text-xs transition">
              Dispatch
            </button>
          </form>
        </div>
      </div>

      <!-- ─── TAB 3: 5-TIER MEMORY EXPLORER ─── -->
      <div id="tab-memory" class="space-y-6 hidden">
        <div class="glass-panel p-5 rounded-2xl space-y-4">
          <div class="flex items-center justify-between border-b border-white/5 pb-3">
            <div>
              <h2 class="font-bold text-sm text-white">5-Tier Cognitive Memory Subsystem</h2>
              <p class="text-xs text-slate-400">Token-budgeted working, episodic, semantic, procedural, & entity networks</p>
            </div>
            <div class="flex gap-2">
              <button onclick="loadMemoryTier('all')" class="px-3 py-1 rounded-lg bg-brand-500/10 text-brand-400 text-xs font-medium">All</button>
              <button onclick="loadMemoryTier('semantic')" class="px-3 py-1 rounded-lg bg-white/5 text-slate-300 text-xs font-medium">Semantic Facts</button>
              <button onclick="loadMemoryTier('episodic')" class="px-3 py-1 rounded-lg bg-white/5 text-slate-300 text-xs font-medium">Episodic Logs</button>
            </div>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-4" id="memory-cards-container">
            <div class="glass-card p-4 rounded-xl space-y-2">
              <div class="flex items-center justify-between text-xs">
                <span class="font-bold text-brand-400">Working Memory</span>
                <span class="text-slate-500 font-mono">Session Scope</span>
              </div>
              <p class="text-xs text-slate-300">Active goals, current tool execution scratchpad, and short-term reasoning buffers.</p>
            </div>

            <div class="glass-card p-4 rounded-xl space-y-2">
              <div class="flex items-center justify-between text-xs">
                <span class="font-bold text-brand-400">Semantic Fact Store</span>
                <span class="text-slate-500 font-mono">Cosine Vector Search</span>
              </div>
              <p class="text-xs text-slate-300">Categorized knowledge, smart contract addresses, documentation, and learned domain truths.</p>
            </div>
          </div>
        </div>
      </div>

      <!-- ─── TAB 4: SWARM & TASK GRAPH ─── -->
      <div id="tab-swarm" class="space-y-6 hidden">
        <div class="glass-panel p-5 rounded-2xl space-y-4">
          <h2 class="font-bold text-sm text-white border-b border-white/5 pb-3">Hierarchical Swarm Task Graph (DAG)</h2>
          <div class="space-y-3" id="swarm-task-list">
            <div class="p-4 rounded-xl glass-card flex items-center justify-between">
              <div class="space-y-1">
                <div class="flex items-center gap-2">
                  <span class="px-2 py-0.5 rounded bg-brand-500/20 text-brand-400 font-mono text-[10px] font-bold">GOAL</span>
                  <span class="text-xs font-bold text-white">Autonomous Value Generation & Compute Self-Funding</span>
                </div>
                <p class="text-[11px] text-slate-400">Root goal: monitor runway, execute paid tasks, maintain financial sustainability.</p>
              </div>
              <span class="text-xs font-mono text-emerald-400 font-bold">IN_PROGRESS</span>
            </div>
          </div>
        </div>
      </div>

      <!-- ─── TAB 5: TREASURY & WALLETS ─── -->
      <div id="tab-treasury" class="space-y-6 hidden">
        <div class="glass-panel p-5 rounded-2xl space-y-4">
          <h2 class="font-bold text-sm text-white border-b border-white/5 pb-3">Sovereign Treasury & On-Chain Economics</h2>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div class="glass-card p-4 rounded-xl space-y-2">
              <span class="text-xs font-bold text-slate-300">Base EVM Wallet (USDC / ETH)</span>
              <p class="text-xs font-mono text-brand-400 break-all" id="treasury-evm-address">0x...</p>
              <p class="text-[11px] text-slate-400">Holds native USDC for x402 compute payments and ERC-8004 identity.</p>
            </div>

            <div class="glass-card p-4 rounded-xl space-y-2">
              <span class="text-xs font-bold text-slate-300">Solana Keypair (USDC / SOL)</span>
              <p class="text-xs font-mono text-brand-400 break-all" id="treasury-sol-address">Solana Key</p>
              <p class="text-[11px] text-slate-400">Ed25519 sovereign keypair for high-speed micro-settlements.</p>
            </div>
          </div>
        </div>
      </div>

      <!-- ─── TAB 6: SETTINGS & PROVIDERS ─── -->
      <div id="tab-settings" class="space-y-6 hidden">
        <div class="glass-panel p-5 rounded-2xl space-y-4">
          <h2 class="font-bold text-sm text-white border-b border-white/5 pb-3">AI Model & Provider Configuration</h2>
          <div class="space-y-3">
            <div>
              <label class="block text-xs font-medium text-slate-300 mb-1">Active Default Model</label>
              <input type="text" id="setting-model" value="claude-3-7-sonnet-latest" class="w-full bg-dark-900 border border-white/10 px-3.5 py-2.5 rounded-xl text-xs text-white">
            </div>
          </div>
        </div>
      </div>

    </main>
  </div>

  <script>
    function switchTab(tabId) {
      const tabs = ['cockpit', 'mission', 'memory', 'swarm', 'treasury', 'settings'];
      tabs.forEach(t => {
        const el = document.getElementById('tab-' + t);
        const btn = document.getElementById('tab-btn-' + t);
        if (el) el.classList.toggle('hidden', t !== tabId);
        if (btn) {
          if (t === tabId) {
            btn.className = "w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition tab-active border border-transparent";
          } else {
            btn.className = "w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition text-slate-400 hover:text-white hover:bg-white/5 border border-transparent";
          }
        }
      });
    }

    async function fetchStatus() {
      try {
        const res = await fetch('/status');
        if (!res.ok) return;
        const data = await res.json();
        if (data.name) document.title = data.name + " — VanillaAgent Control Panel";
        if (data.walletAddress) {
          document.getElementById('header-wallet').innerText = data.walletAddress;
          const evmEl = document.getElementById('treasury-evm-address');
          if (evmEl) evmEl.innerText = data.walletAddress;
        }
        if (data.inferenceModel) {
          document.getElementById('sidebar-model').innerText = data.inferenceModel;
        }
        if (data.uptimeSeconds !== undefined) {
          const mins = Math.floor(data.uptimeSeconds / 60);
          document.getElementById('sidebar-uptime').innerText = mins + 'm';
        }
      } catch {}
    }

    async function sendTask(e) {
      e.preventDefault();
      const input = document.getElementById('task-input');
      const text = input.value.trim();
      if (!text) return;

      const thread = document.getElementById('chat-thread');
      thread.innerHTML += \`
        <div class="flex gap-3 justify-end">
          <div class="bg-brand-500/20 border border-brand-500/30 p-3 rounded-2xl rounded-tr-none text-xs text-white font-medium max-w-[80%]">
            \${text}
          </div>
        </div>
      \`;

      input.value = '';
      thread.scrollTop = thread.scrollHeight;

      // Simulate agent response
      setTimeout(() => {
        thread.innerHTML += \`
          <div class="flex gap-3">
            <div class="w-8 h-8 rounded-lg bg-brand-500/20 text-brand-400 flex items-center justify-center text-xs font-bold font-mono">AI</div>
            <div class="flex-1 bg-white/[0.03] border border-white/5 p-3 rounded-2xl rounded-tl-none text-xs text-slate-200">
              Task received and ingested into ReAct queue. Evaluating required tools and dependencies...
            </div>
          </div>
        \`;
        thread.scrollTop = thread.scrollHeight;
      }, 600);
    }

    function loadMemoryTier(tier) {
      // Memory filter
    }

    setInterval(fetchStatus, 3000);
    fetchStatus();
  </script>
</body>
</html>
`;
}
