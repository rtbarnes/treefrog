import path from "path";
import { ensureGitRepository, getWorktreeList, isTreefrogPath } from "../services/git.js";
import { printInfo } from "../services/ui.js";

// List all agent worktrees
export async function handleList(): Promise<void> {
  await ensureGitRepository();

  const worktreeList = await getWorktreeList();
  let foundAgents = false;

  printInfo("Active treefrog worktrees:");
  console.log();

  const lines = worktreeList.split("\n");
  let currentWorktree = "";
  let currentBranch = "";

  for (const line of lines) {
    if (line.startsWith("worktree ")) {
      currentWorktree = line.substring(9);
    } else if (line.startsWith("branch ")) {
      currentBranch = line.substring(7);

      if (isTreefrogPath(currentWorktree)) {
        const dirName = path.basename(currentWorktree);
        foundAgents = true;
        console.log(`  ${dirName.padEnd(30)} ${currentWorktree}`);
        console.log(`  ${"".padEnd(30)} branch: ${currentBranch}`);
        console.log();
      }
    }
  }

  if (!foundAgents) {
    printInfo("No active treefrog worktrees found");
  }
}
