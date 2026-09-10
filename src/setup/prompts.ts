/**
 * Interactive Setup Prompts
 *
 * Terminal prompt primitives with color coding, validation, numbered choices, and presets.
 */

import readline from "readline";
import chalk from "chalk";

let rl: readline.Interface | null = null;

function getRL(): readline.Interface {
  if (!rl) {
    rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });
  }
  return rl;
}

function ask(question: string): Promise<string> {
  return new Promise((resolve) => {
    getRL().question(question, (answer) => resolve(answer.trim()));
  });
}

export async function promptRequired(label: string, defaultValue?: string): Promise<string> {
  while (true) {
    const hint = defaultValue ? ` [${defaultValue}]` : "";
    const value = await ask(chalk.white(`  → ${label}${hint}: `));
    if (value) return value;
    if (defaultValue) return defaultValue;
    console.log(chalk.yellow("  This field is required."));
  }
}

export async function promptOptional(label: string): Promise<string> {
  return ask(chalk.white(`  → ${label}: `));
}

export interface ChoiceOption {
  value: string;
  label: string;
  description?: string;
}

/**
 * Interactive single choice picker with numbered list and descriptions.
 */
export async function promptChoice(
  title: string,
  options: ChoiceOption[],
  defaultIndex: number = 0,
): Promise<string> {
  console.log(chalk.bold.white(`\n  ${title}:`));
  options.forEach((opt, idx) => {
    const num = idx + 1;
    const isDefault = idx === defaultIndex;
    const tag = isDefault ? chalk.cyan(` (${num}) [Default]`) : chalk.dim(` (${num})`);
    console.log(`    ${chalk.bold.cyan(num.toString() + ".")} ${chalk.bold(opt.label)}${tag}`);
    if (opt.description) {
      console.log(`       ${chalk.dim(opt.description)}`);
    }
  });

  while (true) {
    const defaultNum = defaultIndex + 1;
    const input = await ask(chalk.white(`\n  Select option [1-${options.length}] (default: ${defaultNum}): `));
    if (!input || input.trim() === "") {
      return options[defaultIndex].value;
    }

    const choiceNum = parseInt(input, 10);
    if (!isNaN(choiceNum) && choiceNum >= 1 && choiceNum <= options.length) {
      return options[choiceNum - 1].value;
    }

    // Also match string value
    const match = options.find((o) => o.value.toLowerCase() === input.toLowerCase());
    if (match) return match.value;

    console.log(chalk.yellow(`  Please enter a number between 1 and ${options.length}.`));
  }
}

/**
 * Interactive confirmation prompt (yes/no).
 */
export async function promptConfirm(label: string, defaultYes: boolean = true): Promise<boolean> {
  const hint = defaultYes ? "[Y/n]" : "[y/N]";
  const answer = await ask(chalk.white(`  → ${label} ${hint}: `));
  if (!answer || answer.trim() === "") return defaultYes;
  const normalized = answer.toLowerCase().trim();
  return normalized === "y" || normalized === "yes";
}

export async function promptMultiline(label: string, defaultPrompt?: string): Promise<string> {
  console.log("");
  console.log(chalk.white(`  ${label}`));
  if (defaultPrompt) {
    console.log(chalk.dim("  (Press Enter twice to use the recommended template, or enter custom instructions)"));
  } else {
    console.log(chalk.dim("  Type your prompt, then press Enter twice to finish:"));
  }
  console.log("");

  const lines: string[] = [];
  let lastWasEmpty = false;

  while (true) {
    const line = await ask("  ");
    if (line === "" && lastWasEmpty) {
      lines.pop();
      break;
    }
    if (line === "" && lines.length === 0 && defaultPrompt) {
      return defaultPrompt;
    }
    if (line === "" && lines.length > 0) {
      lastWasEmpty = true;
      lines.push("");
    } else {
      lastWasEmpty = false;
      lines.push(line);
    }
  }

  const result = lines.join("\n").trim();
  if (!result) {
    if (defaultPrompt) return defaultPrompt;
    console.log(chalk.yellow("  Genesis prompt is required. Try again."));
    return promptMultiline(label, defaultPrompt);
  }
  return result;
}

export async function promptAddress(label: string, chainType?: string): Promise<string> {
  while (true) {
    const value = await ask(chalk.white(`  → ${label}: `));
    if (!value || value.trim() === "") {
      // Allow skipping creator address (self-sovereign mode)
      return "";
    }
    if (chainType === "solana") {
      try {
        const bs58 = await import("bs58");
        if (bs58.default.decode(value).length === 32) return value;
      } catch {}
      console.log(chalk.yellow("  Invalid Solana address. Must be a base58-encoded 32-byte public key (or leave empty)."));
    } else {
      if (/^0x[0-9a-fA-F]{40}$/.test(value)) return value;
      console.log(chalk.yellow("  Invalid Ethereum address. Must be 0x followed by 40 hex characters (or leave empty)."));
    }
  }
}

export async function promptWithDefault(label: string, defaultValue: number): Promise<number> {
  const input = await ask(chalk.white(`  → ${label} [${defaultValue}]: `));
  if (!input || input.trim() === "") return defaultValue;
  const parsed = parseInt(input, 10);
  if (isNaN(parsed) || parsed < 0) {
    console.log(chalk.yellow(`  Invalid input, using default: ${defaultValue}`));
    return defaultValue;
  }
  return parsed;
}

export function closePrompts(): void {
  if (rl) {
    rl.close();
    rl = null;
  }
}
