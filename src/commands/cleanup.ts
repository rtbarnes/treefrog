import path from "path";
import {
  ensureGitRepository,
  getWorktreeList,
  getCurrentBranch,
  removeWorktree,
} from "../services/git.js";
import { printInfo, printSuccess } from "../services/ui.js";
import { NotInWorktreeError } from "../types.js";

// Clean up current agent worktree
export async function handleCleanup(): Promise<void> {
  await ensureGitRepository();

  const currentDir = process.cwd();
  const worktreeList = await getWorktreeList();
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
    throw new NotInWorktreeError("Cleanup must be run from within a treefrog worktree");
  }

  // Get current branch name before leaving directory
  const branchName = await getCurrentBranch();

  printInfo(`Cleaning up treefrog worktree: ${path.basename(currentDir)}`);
  printInfo(`Branch: ${branchName}`);

  // Move to main repository directory first
  process.chdir(mainRepoDir);

  // Remove the worktree
  printInfo("Removing worktree...");
  await removeWorktree(currentDir);

  printInfo(`Branch '${branchName}' preserved`);

  printSuccess("Cleanup completed!");
  printInfo(`You are now in: ${process.cwd()}`);
}
