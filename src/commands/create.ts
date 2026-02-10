import path from "path";
import { spawn } from "child_process";
import type { CreateArgs } from "../types.js";
import { WorktreeExistsError } from "../types.js";
import {
  ensureGitRepository,
  getMainRepoDir,
  getWorktreeBaseDir,
  createWorktree,
} from "../services/git.js";
import { parseTreefrogConfig, executeTreefrogConfig } from "../services/config.js";
import { createSymlinks, copyFiles, directoryExists } from "../services/fs.js";
import { printInfo, printSuccess } from "../services/ui.js";

// Create new agent worktree
export async function handleCreate(args: CreateArgs): Promise<void> {
  await ensureGitRepository();

  const mainRepoDir = await getMainRepoDir();
  const baseDir = await getWorktreeBaseDir();

  // Parse .treefrog configuration file
  const config = await parseTreefrogConfig(mainRepoDir);

  // Sanitize branch name for directory naming (replace / with -)
  const sanitizedBranchName = args.branchName.replace(/\//g, "-");
  const worktreeDir = path.join(baseDir, sanitizedBranchName);

  // Check if worktree directory already exists
  if (await directoryExists(worktreeDir)) {
    throw new WorktreeExistsError(`Worktree directory already exists: ${worktreeDir}`);
  }

  printInfo(`Creating worktree: ${worktreeDir}`);

  // Create the worktree
  await createWorktree(worktreeDir, args.branchName);

  // Change to worktree directory
  process.chdir(worktreeDir);

  // Execute file operations from config
  if (config.shareFiles) {
    printInfo("Creating symlinks for shared files...");
    await createSymlinks(config.shareFiles, mainRepoDir);
  }
  if (config.cloneFiles) {
    printInfo("Copying files from main repo...");
    await copyFiles(config.cloneFiles, mainRepoDir);
  }

  // Execute .treefrog configuration commands if present
  await executeTreefrogConfig(config);

  printSuccess("Worktree created successfully!");
  printSuccess(`You are now in: ${process.cwd()}`);
  printSuccess("Your environment is now agent ready!");

  if (args.shell) {
    await startInteractiveShell(process.cwd());
    return;
  }

  printInfo("Run a new shell to stay in this directory, or use 'cd' to navigate here.");
}

function getShellCommand(): string {
  if (process.platform === "win32") {
    return process.env.COMSPEC || "cmd.exe";
  }
  return process.env.SHELL || "/bin/sh";
}

async function startInteractiveShell(cwd: string): Promise<void> {
  if (!process.stdin.isTTY || !process.stdout.isTTY) {
    printInfo("Skipping --shell because no interactive terminal is attached.");
    return;
  }

  const shellCommand = getShellCommand();
  printInfo(`Starting interactive shell in: ${cwd}`);
  printInfo("Exit the shell to return to your previous session.");

  await new Promise<void>((resolve, reject) => {
    const shell = spawn(shellCommand, [], {
      cwd,
      stdio: "inherit",
    });

    shell.on("error", (error) => {
      reject(new Error(`Failed to launch shell '${shellCommand}': ${error.message}`));
    });

    shell.on("exit", (code, signal) => {
      if (signal) {
        reject(new Error(`Shell exited due to signal: ${signal}`));
        return;
      }
      if (code !== null && code !== 0) {
        reject(new Error(`Shell exited with status: ${code}`));
        return;
      }
      resolve();
    });
  });
}
