#!/usr/bin/env bun
import { $ } from "bun";
import { parseArgs } from "util";
import path from "path";
import fs from "fs/promises";

// Colors for output
const colors = {
  RED: "\x1b[0;31m",
  GREEN: "\x1b[0;32m",
  YELLOW: "\x1b[1;33m",
  NC: "\x1b[0m", // No Color
};

// Print colored output functions
function printError(message: string): void {
  console.error(`${colors.RED}Error: ${message}${colors.NC}`);
}

function printSuccess(message: string): void {
  console.log(`${colors.GREEN}${message}${colors.NC}`);
}

function printInfo(message: string): void {
  console.log(`${colors.YELLOW}${message}${colors.NC}`);
}

// Usage information
function usage(): void {
  console.log(`Usage:
  ribbit <branch-name> [--share|--clone file1,file2,...]  Create new agent worktree
  ribbit share <file1,file2,...>                          Share additional files in current worktree
  ribbit clone <file1,file2,...>                          Clone additional files in current worktree
  ribbit cleanup                                           Clean up current agent worktree
  ribbit list                                              List active agent worktrees

Options:
  --share   Symlink files from main repo (changes affect main repo)
  --clone   Copy files from main repo (independent copies)

Examples:
  ribbit implement-user-auth --share .env,.env.local
  ribbit fix-login-bug --clone .env,.env.local
  ribbit share .env.production,config/database.yml
  ribbit clone secrets.json
  ribbit cleanup`);
}

// Check if we're in a git repository
async function checkGitRepo(): Promise<void> {
  try {
    await $`git rev-parse --git-dir`.quiet();
  } catch {
    printError("Not in a git repository");
    process.exit(1);
  }
}

// Get repository name
async function getRepoName(): Promise<string> {
  const result = await $`git rev-parse --show-toplevel`.text();
  return path.basename(result.trim());
}

interface ParsedArgs {
  command: string;
  branchName?: string;
  shareFiles?: string;
  cloneFiles?: string;
  fileMode?: "share" | "clone";
}

// Parse command line arguments
function parseArguments(): ParsedArgs {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    usage();
    process.exit(1);
  }

  const firstArg = args[0];

  switch (firstArg) {
    case "cleanup":
      return { command: "cleanup" };
    case "list":
      return { command: "list" };
    case "share":
      return { command: "share", shareFiles: args[1] };
    case "clone":
      return { command: "clone", cloneFiles: args[1] };
    case "--help":
    case "-h":
      usage();
      process.exit(0);
    default:
      // Create command
      const parsed: ParsedArgs = { command: "create", branchName: firstArg };

      // Parse remaining arguments
      for (let i = 1; i < args.length; i++) {
        if (args[i] === "--share") {
          if (parsed.cloneFiles) {
            printError("Cannot use both --share and --clone");
            process.exit(1);
          }
          parsed.shareFiles = args[i + 1];
          parsed.fileMode = "share";
          i++; // Skip next argument as it's the file list
        } else if (args[i] === "--clone") {
          if (parsed.shareFiles) {
            printError("Cannot use both --share and --clone");
            process.exit(1);
          }
          parsed.cloneFiles = args[i + 1];
          parsed.fileMode = "clone";
          i++; // Skip next argument as it's the file list
        } else {
          printError(`Unknown option: ${args[i]}`);
          usage();
          process.exit(1);
        }
      }

      return parsed;
  }
}

interface RibbitConfig {
  shareFiles?: string;
  cloneFiles?: string;
  commands?: string[];
}

// Parse .ribbit configuration file for settings
async function parseRibbitConfig(mainRepoDir: string): Promise<RibbitConfig> {
  const configFile = path.join(mainRepoDir, ".ribbit");
  const config: RibbitConfig = { commands: [] };

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

// Execute commands from .ribbit configuration file
async function executeRibbitConfig(config: RibbitConfig): Promise<void> {
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
      } catch (error) {
        printError(`Command failed: ${command}`);
        printInfo("Continuing with remaining commands...");
      }
    }
  }

  printSuccess("Configuration commands completed!");
}

// Create shared file/directory symlinks
async function createSymlinks(
  shareFiles: string,
  mainRepoDir: string
): Promise<void> {
  if (!shareFiles) return;

  const files = shareFiles.split(",").map((f) => f.trim());

  for (const file of files) {
    const mainPath = path.join(mainRepoDir, file);

    try {
      const stat = await fs.stat(mainPath);

      if (stat.isFile()) {
        // Handle file
        const dir = path.dirname(file);
        if (dir !== ".") {
          await fs.mkdir(dir, { recursive: true });
        }

        await fs.symlink(mainPath, file);
        printInfo(`Linked file: ${file}`);
      } else if (stat.isDirectory()) {
        // Handle directory
        const parentDir = path.dirname(file);
        if (parentDir !== ".") {
          await fs.mkdir(parentDir, { recursive: true });
        }

        await fs.symlink(mainPath, file);
        printInfo(`Linked directory: ${file}`);
      }
    } catch {
      printError(`Shared file or directory does not exist: ${file}`);
      process.exit(1);
    }
  }
}

// Copy files/directories from main repo
async function copyFiles(
  cloneFiles: string,
  mainRepoDir: string
): Promise<void> {
  if (!cloneFiles) return;

  const files = cloneFiles.split(",").map((f) => f.trim());

  for (const file of files) {
    const mainPath = path.join(mainRepoDir, file);

    try {
      const stat = await fs.stat(mainPath);

      if (stat.isFile()) {
        // Handle file
        const dir = path.dirname(file);
        if (dir !== ".") {
          await fs.mkdir(dir, { recursive: true });
        }

        await fs.copyFile(mainPath, file);
        printInfo(`Copied file: ${file}`);
      } else if (stat.isDirectory()) {
        // Handle directory
        const parentDir = path.dirname(file);
        if (parentDir !== ".") {
          await fs.mkdir(parentDir, { recursive: true });
        }

        await $`cp -r ${mainPath} ${file}`.quiet();
        printInfo(`Copied directory: ${file}`);
      }
    } catch {
      printError(`File or directory to clone does not exist: ${file}`);
      process.exit(1);
    }
  }
}

// Create new agent worktree
async function createWorktree(args: ParsedArgs): Promise<void> {
  await checkGitRepo();

  const repoName = await getRepoName();
  const mainRepoDir = (await $`git rev-parse --show-toplevel`.text()).trim();

  // Parse .ribbit configuration file
  const config = await parseRibbitConfig(mainRepoDir);

  // Sanitize branch name for directory naming (replace / with -)
  const sanitizedBranchName = args.branchName!.replace(/\//g, "-");
  const worktreeDir = path.join("..", `${repoName}-${sanitizedBranchName}`);

  // Check if branch already exists
  let branchExists = false;
  try {
    await $`git show-ref --verify --quiet refs/heads/${args.branchName}`.quiet();
    branchExists = true;
  } catch {
    // Branch doesn't exist
  }

  // Check if worktree directory already exists
  try {
    await fs.access(worktreeDir);
    printError(`Worktree directory already exists: ${worktreeDir}`);
    process.exit(1);
  } catch {
    // Directory doesn't exist, which is good
  }

  printInfo(`Creating worktree: ${worktreeDir}`);

  // Create the worktree with appropriate branch handling
  if (branchExists) {
    printInfo(`Using existing branch: ${args.branchName}`);
    await $`git worktree add ${worktreeDir} ${args.branchName}`.quiet();
  } else {
    printInfo(`Creating new branch: ${args.branchName}`);
    await $`git worktree add ${worktreeDir} -b ${args.branchName}`.quiet();
  }

  // Change to worktree directory
  process.chdir(worktreeDir);

  // Handle file sharing/copying based on CLI options or config
  let effectiveShareFiles = args.shareFiles;
  let effectiveCloneFiles = args.cloneFiles;
  let fileMode = args.fileMode;

  // Use config settings if CLI options not provided
  if (!args.shareFiles && config.shareFiles) {
    effectiveShareFiles = config.shareFiles;
    fileMode = "share";
  }
  if (!args.cloneFiles && config.cloneFiles) {
    effectiveCloneFiles = config.cloneFiles;
    // Only set clone mode if share mode isn't already set
    if (fileMode !== "share") {
      fileMode = "clone";
    }
  }

  // Execute file operations
  if (fileMode === "share" && effectiveShareFiles) {
    printInfo("Creating symlinks for shared files...");
    await createSymlinks(effectiveShareFiles, mainRepoDir);
  } else if (fileMode === "clone" && effectiveCloneFiles) {
    printInfo("Copying files from main repo...");
    await copyFiles(effectiveCloneFiles, mainRepoDir);
  }

  // Execute .ribbit configuration commands if present
  await executeRibbitConfig(config);

  printSuccess("Worktree created successfully!");
  printSuccess(`You are now in: ${process.cwd()}`);
  printSuccess("Your environment is now agent ready!");

  // Note: We can't exec a new shell like in bash, but we can suggest it
  printInfo(
    "Run a new shell to stay in this directory, or use 'cd' to navigate here."
  );
}

// Clean up current agent worktree
async function cleanupWorktree(): Promise<void> {
  await checkGitRepo();

  const currentDir = process.cwd();
  const worktreeList = await $`git worktree list --porcelain`.text();
  let isAgentWorktree = false;
  let mainRepoDir = "";

  // Parse worktree list
  const lines = worktreeList.split("\n");
  for (const line of lines) {
    if (line.startsWith("worktree ")) {
      const worktreePath = line.substring(9);
      if (currentDir === worktreePath) {
        const dirName = path.basename(currentDir);
        if (dirName.match(/^[^-]+-.+$/)) {
          isAgentWorktree = true;
        }
      } else if (!mainRepoDir) {
        mainRepoDir = worktreePath;
      }
    }
  }

  if (!isAgentWorktree) {
    printError("Not in a ribbit worktree directory");
    printInfo("Cleanup must be run from within a ribbit worktree");
    process.exit(1);
  }

  // Get current branch name before leaving directory
  const branchName = (await $`git branch --show-current`.text()).trim();

  printInfo(`Cleaning up ribbit worktree: ${path.basename(currentDir)}`);
  printInfo(`Branch: ${branchName}`);

  // Move to main repository directory first
  process.chdir(mainRepoDir);

  // Remove the worktree
  printInfo("Removing worktree...");
  await $`git worktree remove ${currentDir} --force`.quiet();

  printInfo(`Branch '${branchName}' preserved`);

  printSuccess("Cleanup completed!");
  printInfo(`You are now in: ${process.cwd()}`);
}

// Check if current directory is a ribbit worktree
async function checkRibbitWorktree(): Promise<void> {
  await checkGitRepo();

  const currentDir = process.cwd();
  const worktreeList = await $`git worktree list --porcelain`.text();
  let isAgentWorktree = false;

  // Check if we're in a ribbit worktree
  const lines = worktreeList.split("\n");
  for (const line of lines) {
    if (line.startsWith("worktree ")) {
      const worktreePath = line.substring(9);
      if (currentDir === worktreePath) {
        const dirName = path.basename(currentDir);
        if (dirName.match(/^[^-]+-.+$/)) {
          isAgentWorktree = true;
          break;
        }
      }
    }
  }

  if (!isAgentWorktree) {
    printError("Not in a ribbit worktree directory");
    printInfo("This command must be run from within a ribbit worktree");
    process.exit(1);
  }

  // Check if we're in main/master branch (prevent share/clone in main repo)
  const currentBranch = (await $`git branch --show-current`.text()).trim();
  if (currentBranch === "main" || currentBranch === "master") {
    printError("Cannot share/clone files in main/master branch");
    printInfo("Share and clone commands are only allowed in ribbit worktrees");
    process.exit(1);
  }
}

// Find main repository directory
async function findMainRepo(): Promise<string> {
  const worktreeList = await $`git worktree list --porcelain`.text();
  const lines = worktreeList.split("\n");

  for (const line of lines) {
    if (line.startsWith("worktree ")) {
      return line.substring(9);
    }
  }

  throw new Error("Could not find main repository");
}

// Share additional files in current worktree
async function shareFiles(args: ParsedArgs): Promise<void> {
  await checkRibbitWorktree();

  if (!args.shareFiles) {
    printError("No files specified to share");
    process.exit(1);
  }

  const mainRepoDir = await findMainRepo();
  printInfo("Sharing files from main repo...");
  await createSymlinks(args.shareFiles, mainRepoDir);
  printSuccess("Files shared successfully!");
}

// Clone additional files to current worktree
async function cloneFilesToWorktree(args: ParsedArgs): Promise<void> {
  await checkRibbitWorktree();

  if (!args.cloneFiles) {
    printError("No files specified to clone");
    process.exit(1);
  }

  const mainRepoDir = await findMainRepo();
  printInfo("Copying files from main repo...");
  await copyFiles(args.cloneFiles, mainRepoDir);
  printSuccess("Files copied successfully!");
}

// List all agent worktrees
async function listWorktrees(): Promise<void> {
  await checkGitRepo();

  const worktreeList = await $`git worktree list --porcelain`.text();
  let foundAgents = false;

  printInfo("Active ribbit worktrees:");
  console.log();

  // Parse worktree list and show agent worktrees
  const lines = worktreeList.split("\n");
  let currentWorktree = "";
  let currentBranch = "";

  for (const line of lines) {
    if (line.startsWith("worktree ")) {
      currentWorktree = line.substring(9);
    } else if (line.startsWith("branch ")) {
      currentBranch = line.substring(7);

      // Check if this is a ribbit worktree (repo-name-branch-name pattern)
      const dirName = path.basename(currentWorktree);
      if (
        dirName.match(/^[^-]+-.+$/) &&
        !currentWorktree.includes("/.git/worktrees/")
      ) {
        // Extract branch name (everything after first dash and repo name)
        const parts = dirName.split("-");
        const branchPart = parts.slice(1).join("-");

        foundAgents = true;
        console.log(`  ${branchPart.padEnd(30)} ${currentWorktree}`);
        console.log(`  ${"".padEnd(30)} branch: ${currentBranch}`);
        console.log();
      }
    }
  }

  if (!foundAgents) {
    printInfo("No active ribbit worktrees found");
  }
}

// Main execution
async function main(): Promise<void> {
  try {
    const args = parseArguments();

    switch (args.command) {
      case "create":
        await createWorktree(args);
        break;
      case "cleanup":
        await cleanupWorktree();
        break;
      case "list":
        await listWorktrees();
        break;
      case "share":
        await shareFiles(args);
        break;
      case "clone":
        await cloneFilesToWorktree(args);
        break;
    }
  } catch (error) {
    printError(`Unexpected error: ${error}`);
    process.exit(1);
  }
}

// Run main function if this file is executed directly
if (import.meta.main) {
  await main();
}
