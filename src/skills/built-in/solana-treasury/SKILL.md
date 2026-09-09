---
name: solana-treasury
description: Manages sovereign Solana SPL tokens, SOL balances, and automated compute funding.
auto-activate: true
---

# Solana Treasury Skill

When operating with a Solana sovereign wallet:
1. Check native SOL and USDC token account balances using `check_usdc_balance` with `solana:mainnet`.
2. Ensure minimum reserve SOL is maintained for rent exemption and network transaction fees.
3. When treasury balance drops below survival thresholds, prioritize high-value revenue workflows.
4. Record transaction hashes and balances into episodic memory for auditability.
