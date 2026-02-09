import path from "path";
import {
  ensureGitRepository,
  getWorktreeList,
  getCurrentBranch,
  findWorktreeByBranch,
  findMainRepo,
  removeWorktree,
} from "../services/git.js";
import { printInfo, printSuccess } from "../services/ui.js";
import { NotInWorktreeError } from "../types.js";
import type { CleanupArgs } from "../types.js";

// Clean up agent worktree — by branch name or from current directory
export async function handleCleanup(args?: CleanupArgs): Promise<void> {
  await ensureGitRepository();

  if (args?.branchName) {
    return cleanupByBranch(args.branchName);
  }

  return cleanupFromWorktree();
}

async function cleanupByBranch(branchName: string): Promise<void> {
  const worktreePath = await findWorktreeByBranch(branchName);
  if (!worktreePath) {
    throw new NotInWorktreeError(
      `No worktree found for branch '${branchName}'`
    );
  }

  const dirName = path.basename(worktreePath);
  if (!dirName.match(/^[^-]+-.+$/)) {
    throw new NotInWorktreeError(
      `'${dirName}' does not appear to be a treefrog worktree`
    );
  }

  printInfo(`Cleaning up treefrog worktree: ${dirName}`);
  printInfo(`Branch: ${branchName}`);

  printInfo("Removing worktree...");
  await removeWorktree(worktreePath);

  printInfo(`Branch '${branchName}' preserved`);
  printSuccess("Cleanup completed!");
}

async function cleanupFromWorktree(): Promise<void> {
  const currentDir = process.cwd();
  const worktreeList = await getWorktreeList();
  let isAgentWorktree = false;
  let mainRepoDir = "";

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
    throw new NotInWorktreeError(
      "Cleanup must be run from within a treefrog worktree"
    );
  }

  const branchName = await getCurrentBranch();

  printInfo(`Cleaning up treefrog worktree: ${path.basename(currentDir)}`);
  printInfo(`Branch: ${branchName}`);

  process.chdir(mainRepoDir);

  printInfo("Removing worktree...");
  await removeWorktree(currentDir);

  printInfo(`Branch '${branchName}' preserved`);
  printSuccess("Cleanup completed!");
  printInfo(`You are now in: ${process.cwd()}`);
}
