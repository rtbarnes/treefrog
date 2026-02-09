import path from "path";
import type { SpotlightArgs } from "../types.js";
import {
  ensureGitRepository,
  findWorktreeByBranch,
  findMainRepo,
  removeWorktree,
  checkoutBranch,
} from "../services/git.js";
import { printInfo, printSuccess } from "../services/ui.js";

// Spotlight a worktree branch: remove worktree and checkout branch in main repo
export async function handleSpotlight(args: SpotlightArgs): Promise<void> {
  await ensureGitRepository();

  // Find the worktree for this branch
  const worktreePath = await findWorktreeByBranch(args.branchName);
  if (!worktreePath) {
    throw new Error(`No worktree found for branch: ${args.branchName}`);
  }

  // Get main repo directory
  const mainRepoDir = await findMainRepo();

  // Prevent spotlighting the main repo itself
  if (worktreePath === mainRepoDir) {
    throw new Error("Cannot spotlight the main repository");
  }

  printInfo(`Spotlighting branch: ${args.branchName}`);
  printInfo(`Worktree: ${path.basename(worktreePath)}`);

  // Change to main repo directory
  process.chdir(mainRepoDir);

  // Remove the worktree
  printInfo("Removing worktree...");
  await removeWorktree(worktreePath);

  // Checkout the branch in main repo
  printInfo(`Checking out branch '${args.branchName}' in main repo...`);
  await checkoutBranch(args.branchName);

  printSuccess(`Branch '${args.branchName}' is now active in main repository!`);
  printInfo(`You are now in: ${process.cwd()}`);
}
