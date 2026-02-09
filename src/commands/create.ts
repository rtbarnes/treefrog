import path from "path";
import type { CreateArgs } from "../types.js";
import { WorktreeExistsError } from "../types.js";
import {
  ensureGitRepository,
  getRepoName,
  getMainRepoDir,
  createWorktree,
} from "../services/git.js";
import { parseTreefrogConfig, executeTreefrogConfig } from "../services/config.js";
import { createSymlinks, copyFiles, directoryExists } from "../services/fs.js";
import { printInfo, printSuccess } from "../services/ui.js";

// Create new agent worktree
export async function handleCreate(args: CreateArgs): Promise<void> {
  await ensureGitRepository();

  const repoName = await getRepoName();
  const mainRepoDir = await getMainRepoDir();

  // Parse .treefrog configuration file
  const config = await parseTreefrogConfig(mainRepoDir);

  // Sanitize branch name for directory naming (replace / with -)
  const sanitizedBranchName = args.branchName.replace(/\//g, "-");
  const worktreeDir = path.join("..", `${repoName}-${sanitizedBranchName}`);

  // Check if worktree directory already exists
  if (await directoryExists(worktreeDir)) {
    throw new WorktreeExistsError(`Worktree directory already exists: ${worktreeDir}`);
  }

  printInfo(`Creating worktree: ${worktreeDir}`);

  // Create the worktree
  await createWorktree(worktreeDir, args.branchName);

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

  // Execute .treefrog configuration commands if present
  await executeTreefrogConfig(config);

  printSuccess("Worktree created successfully!");
  printSuccess(`You are now in: ${process.cwd()}`);
  printSuccess("Your environment is now agent ready!");

  // Note: We can't exec a new shell like in bash, but we can suggest it
  printInfo("Run a new shell to stay in this directory, or use 'cd' to navigate here.");
}
