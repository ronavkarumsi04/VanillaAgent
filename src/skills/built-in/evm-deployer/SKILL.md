---
name: evm-deployer
description: Compiles, tests, and deploys smart contracts on Base and EVM chains.
auto-activate: true
---

# EVM Contract Deployer Skill

When deploying smart contracts or tokens:
1. Compile Solidity / Vyper code using standard toolchains (`forge build` or `hardhat compile`).
2. Run automated test suites to ensure zero reentrancy and arithmetic overflow vulnerabilities.
3. Deploy contracts to Base or Ethereum mainnet with verifiable metadata on block explorers.
4. Register deployed contract addresses in semantic memory (`save_memory`).
