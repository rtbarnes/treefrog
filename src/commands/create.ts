import path from "path";
import type { CreateArgs } from "../types.js";
import { WorktreeExistsError } from "../types.js";
import {
  ensureGitRepository,
  getMainRepoDir,
  getWorktreeBaseDir,
  createWorktree,
  getCurrentBranch,
  detachHead,
} from "../services/git.js";
import { parseTreefrogConfig, executeTreefrogConfig } from "../services/config.js";
import { createSymlinks, copyFiles, directoryExists } from "../services/fs.js";
import { printInfo, printSuccess } from "../services/ui.js";
import { startInteractiveShell } from "../services/shell.js";

// Create new agent worktree
export async function handleCreate(args: CreateArgs): Promise<void> {
  await ensureGitRepository();

  if (args.current) {
    const branch = await getCurrentBranch();
    if (!branch) {
      throw new Error("Cannot use --current with a detached HEAD");
    }
    args.branchName = branch;
    printInfo(`Detaching HEAD to free branch: ${branch}`);
    await detachHead();
  }

  const mainRepoDir = await getMainRepoDir();
  const baseDir = await getWorktreeBaseDir();

  // Parse global treefrog configuration for this repository.
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
  if ((config.shareFiles ?? []).length > 0) {
    printInfo("Creating symlinks for shared files...");
    await createSymlinks(config.shareFiles ?? [], mainRepoDir);
  }
  if ((config.cloneFiles ?? []).length > 0) {
    printInfo("Copying files from main repo...");
    await copyFiles(config.cloneFiles ?? [], mainRepoDir);
  }

  // Execute configured post-create commands.
  await executeTreefrogConfig(config);

  printSuccess("Worktree created successfully!");
  printSuccess(`You are now in: ${process.cwd()}`);
  printSuccess("Your environment is now agent ready!");

  if (args.shell) {
    await startInteractiveShell({ cwd: process.cwd(), promptContext: args.branchName });
    return;
  }

  printInfo("Run a new shell to stay in this directory, or use 'cd' to navigate here.");
}
