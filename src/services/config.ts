import { $ } from "bun";
import fs from "fs/promises";
import os from "os";
import path from "path";
import type { TreefrogConfig, TreefrogGlobalConfig } from "../types.js";
import { printInfo, printError } from "./ui.js";

function getTreefrogConfigPath(): string {
  const xdgConfigHome = process.env.XDG_CONFIG_HOME?.trim();
  if (xdgConfigHome) {
    return path.join(xdgConfigHome, "treefrog", "config.json");
  }

  const home = process.env.HOME?.trim() || os.homedir();
  if (!home) {
    throw new Error("Could not resolve config directory. Set HOME or XDG_CONFIG_HOME.");
  }
  return path.join(home, ".config", "treefrog", "config.json");
}

function validateStringArray(
  value: unknown,
  fieldName: string,
  configPath: string,
  repoKey: string,
): string[] {
  if (value === undefined) {
    return [];
  }
  if (!Array.isArray(value) || value.some((entry) => typeof entry !== "string")) {
    throw new Error(
      `Invalid treefrog config at ${configPath}: projects["${repoKey}"].${fieldName} must be a string array`,
    );
  }
  return value;
}

function parseProjectConfig(value: unknown, configPath: string, repoKey: string): TreefrogConfig {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(
      `Invalid treefrog config at ${configPath}: projects["${repoKey}"] must be an object`,
    );
  }

  const projectConfig = value as Record<string, unknown>;
  return {
    shareFiles: validateStringArray(projectConfig.shareFiles, "shareFiles", configPath, repoKey),
    cloneFiles: validateStringArray(projectConfig.cloneFiles, "cloneFiles", configPath, repoKey),
    commands: validateStringArray(projectConfig.commands, "commands", configPath, repoKey),
  };
}

function parseGlobalConfig(value: unknown, configPath: string): TreefrogGlobalConfig {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(
      `Invalid treefrog config at ${configPath}: expected {"version":1,"projects":{...}}`,
    );
  }

  const config = value as Record<string, unknown>;
  if (config.version !== 1) {
    throw new Error(`Invalid treefrog config at ${configPath}: version must be 1`);
  }
  if (!config.projects || typeof config.projects !== "object" || Array.isArray(config.projects)) {
    throw new Error(`Invalid treefrog config at ${configPath}: projects must be an object map`);
  }

  return {
    version: 1,
    projects: config.projects as Record<string, TreefrogConfig>,
  };
}

// Parse global JSON config for this repository.
export async function parseTreefrogConfig(mainRepoDir: string): Promise<TreefrogConfig> {
  const configPath = getTreefrogConfigPath();
  const repoKey = await fs.realpath(mainRepoDir);

  try {
    const content = await fs.readFile(configPath, "utf-8");
    let parsed: unknown;
    try {
      parsed = JSON.parse(content);
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      throw new Error(`Invalid treefrog config JSON at ${configPath}: ${reason}`);
    }

    const globalConfig = parseGlobalConfig(parsed, configPath);
    const projectConfig = (globalConfig.projects as Record<string, unknown>)[repoKey];
    if (projectConfig === undefined) {
      return { shareFiles: [], cloneFiles: [], commands: [] };
    }

    return parseProjectConfig(projectConfig, configPath, repoKey);
  } catch (error) {
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      (error as NodeJS.ErrnoException).code === "ENOENT"
    ) {
      return { shareFiles: [], cloneFiles: [], commands: [] };
    }
    throw error;
  }
}

// Execute commands from the configured project setup.
export async function executeTreefrogConfig(config: TreefrogConfig): Promise<void> {
  const commands = config.commands ?? [];
  if (commands.length === 0) {
    return;
  }

  printInfo("Executing configuration commands...");

  for (const command of commands) {
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
