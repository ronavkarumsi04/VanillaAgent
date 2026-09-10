/**
 * Setup Wizard Banner
 *
 * ASCII art and welcome message for first-run setup.
 */

import chalk from "chalk";

export function printBanner(): void {
  const banner = `
${chalk.bold.cyan("  ██╗   ██╗ █████╗ ███╗   ██╗██╗██╗     ██╗      █████╗ ")}
${chalk.bold.cyan("  ██║   ██║██╔══██╗████╗  ██║██║██║     ██║     ██╔══██╗")}
${chalk.bold.cyan("  ██║   ██║███████║██╔██╗ ██║██║██║     ██║     ███████║")}
${chalk.bold.cyan("  ╚██╗ ██╔╝██╔══██║██║╚██╗██║██║██║     ██║     ██╔══██║")}
${chalk.bold.cyan("   ╚████╔╝ ██║  ██║██║ ╚████║██║███████╗███████╗██║  ██║")}
${chalk.bold.cyan("    ╚═══╝  ╚═╝  ╚═╝╚═╝  ╚═══╝╚═╝╚══════╝╚══════╝╚═╝  ╚═╝")}
${chalk.dim("        Sovereign Autonomous AI Agent Runtime & Swarm Engine")}
  `;

  console.log(banner);
  console.log(chalk.bold("  Welcome to VanillaAgent."));
  console.log(
    chalk.dim("  A sovereign AI agent with its own wallet, compute economics, and autonomy.\n"),
  );
}

export function showBanner(): void {
  printBanner();
}
