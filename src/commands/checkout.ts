import path from "path";
import type { CheckoutArgs } from "../types.js";
import {
  ensureGitRepository,
  findWorktreeByBranch,
  findMainRepo,
  removeWorktree,
  checkoutBranch,
  hasUncommittedChanges,
  createStash,
  findStashRefByMessage,
  applyStash,
  dropStash,
} from "../services/git.js";
import { printInfo, printSuccess } from "../services/ui.js";

// Checkout a worktree branch: remove worktree and checkout branch in main repo
export async function handleCheckout(args: CheckoutArgs): Promise<void> {
  await ensureGitRepository();

  // Find the worktree for this branch
  const worktreePath = await findWorktreeByBranch(args.branchName);
  if (!worktreePath) {
    throw new Error(`No worktree found for branch: ${args.branchName}`);
  }

  // Get main repo directory
  const mainRepoDir = await findMainRepo();

  // Prevent checking out the main repo itself
  if (worktreePath === mainRepoDir) {
    throw new Error("Cannot checkout the main repository");
  }

  printInfo(`Checking out branch: ${args.branchName}`);
  printInfo(`Worktree: ${path.basename(worktreePath)}`);

  let stashRef: string | null = null;
  if (await hasUncommittedChanges(worktreePath)) {
    const stashMessage = buildCheckoutStashMessage(args.branchName);
    printInfo("Uncommitted changes detected; stashing worktree changes...");
    await createStash(worktreePath, stashMessage);
    stashRef = await findStashRefByMessage(mainRepoDir, stashMessage);
    if (!stashRef) {
      throw new Error("Failed to locate stashed changes after stashing worktree");
    }
    printInfo(`Saved worktree changes in ${stashRef}`);
  }

  process.chdir(mainRepoDir);

  try {
    printInfo("Removing worktree...");
    await removeWorktree(worktreePath);

    printInfo(`Checking out branch '${args.branchName}' in main repo...`);
    await checkoutBranch(args.branchName);
  } catch (error) {
    if (stashRef) {
      throw buildStashRecoveryError(
        "Checkout did not complete, but your changes were preserved in stash",
        stashRef,
        error,
      );
    }
    throw error;
  }

  if (stashRef) {
    try {
      printInfo(`Restoring stashed changes from ${stashRef}...`);
      await applyStash(mainRepoDir, stashRef);
      await dropStash(mainRepoDir, stashRef);
      printInfo("Restored uncommitted changes in main repository");
    } catch (error) {
      throw buildStashRecoveryError(
        "Checked out branch, but failed to restore stashed changes automatically",
        stashRef,
        error,
      );
    }
  }

  printSuccess(`Branch '${args.branchName}' is now active in main repository!`);
  printInfo(`You are now in: ${process.cwd()}`);
}

function buildCheckoutStashMessage(branchName: string): string {
  const uniqueId = Math.random().toString(36).slice(2, 10);
  return `treefrog-checkout:${branchName}:${Date.now()}:${uniqueId}`;
}

function buildStashRecoveryError(prefix: string, stashRef: string, error: unknown): Error {
  const details = error instanceof Error ? error.message : String(error);
  return new Error(
    `${prefix}. Run 'git stash apply --index ${stashRef}' to recover.\nOriginal error: ${details}`,
  );
}
