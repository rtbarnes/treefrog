import path from "path";
import { ensureGitRepository, getWorktreeList } from "../services/git.js";
import { printInfo } from "../services/ui.js";

// List all agent worktrees
export async function handleList(): Promise<void> {
  await ensureGitRepository();

  const worktreeList = await getWorktreeList();
  let foundAgents = false;

  printInfo("Active treefrog worktrees:");
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

      // Check if this is a treefrog worktree (repo-name-branch-name pattern)
      const dirName = path.basename(currentWorktree);
      if (dirName.match(/^[^-]+-.+$/) && !currentWorktree.includes("/.git/worktrees/")) {
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
    printInfo("No active treefrog worktrees found");
  }
}
