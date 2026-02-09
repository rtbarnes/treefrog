import { $ } from "bun";
import fs from "fs/promises";
import path from "path";
import type { TreefrogConfig } from "../types.js";
import { printInfo, printError } from "./ui.js";

// Parse .treefrog configuration file for settings
export async function parseTreefrogConfig(mainRepoDir: string): Promise<TreefrogConfig> {
  const configFile = path.join(mainRepoDir, ".treefrog");
  const config: TreefrogConfig = { commands: [] };

  try {
    const content = await fs.readFile(configFile, "utf-8");
    const lines = content.split("\n");
    let inCommandsSection = false;

    for (const line of lines) {
      const trimmedLine = line.trim();

      // Skip empty lines
      if (!trimmedLine) continue;

      // Handle section markers
      if (trimmedLine === "[commands]") {
        inCommandsSection = true;
        continue;
      } else if (trimmedLine.match(/^\[[^\]]+\]$/)) {
        inCommandsSection = false;
        continue;
      }

      // Skip comments
      if (trimmedLine.startsWith("#")) continue;

      // Parse configuration directives
      if (trimmedLine.match(/^\s*share\s*=/)) {
        const parts = trimmedLine.split("=");
        if (parts[1]) {
          config.shareFiles = parts[1].trim();
        }
      } else if (trimmedLine.match(/^\s*clone\s*=/)) {
        const parts = trimmedLine.split("=");
        if (parts[1]) {
          config.cloneFiles = parts[1].trim();
        }
      } else if (inCommandsSection && config.commands) {
        config.commands.push(trimmedLine);
      }
    }
  } catch {
    // Config file doesn't exist, return empty config
  }

  return config;
}

// Execute commands from .treefrog configuration file
export async function executeTreefrogConfig(config: TreefrogConfig): Promise<void> {
  if (!config.commands || config.commands.length === 0) {
    return;
  }

  printInfo("Executing configuration commands...");

  for (const command of config.commands) {
    if (command.trim()) {
      printInfo(`Executing: ${command}`);
      try {
        // Use the raw command string directly
        await $`sh -c ${command}`.quiet();
      } catch {
        printError(`Command failed: ${command}`);
        printInfo("Continuing with remaining commands...");
      }
    }
  }

  printInfo("Configuration commands completed!");
}
