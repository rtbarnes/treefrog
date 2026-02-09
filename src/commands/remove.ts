import path from "path";
import {
  ensureGitRepository,
  getWorktreeList,
  getCurrentBranch,
  findWorktreeByBranch,
  removeWorktree,
  isTreefrogPath,
} from "../services/git.js";
import { printInfo, printSuccess } from "../services/ui.js";
import { NotInWorktreeError } from "../types.js";
import type { RemoveArgs } from "../types.js";

// Remove agent worktree — by branch name or from current directory
export async function handleRemove(args?: RemoveArgs): Promise<void> {
  await ensureGitRepository();

  if (args?.branchName) {
    return removeByBranch(args.branchName);
  }

  return removeFromWorktree();
}

async function removeByBranch(branchName: string): Promise<void> {
  const worktreePath = await findWorktreeByBranch(branchName);
  if (!worktreePath) {
    throw new NotInWorktreeError(`No worktree found for branch '${branchName}'`);
  }

  if (!isTreefrogPath(worktreePath)) {
    throw new NotInWorktreeError(
      `'${path.basename(worktreePath)}' does not appear to be a treefrog worktree`,
    );
  }

  const dirName = path.basename(worktreePath);

  printInfo(`Removing treefrog worktree: ${dirName}`);
  printInfo(`Branch: ${branchName}`);

  printInfo("Removing worktree...");
  await removeWorktree(worktreePath);

  printInfo(`Branch '${branchName}' preserved`);
  printSuccess("Removal completed!");
}

async function removeFromWorktree(): Promise<void> {
  const currentDir = process.cwd();

  if (!isTreefrogPath(currentDir)) {
    throw new NotInWorktreeError("Remove must be run from within a treefrog worktree");
  }

  const worktreeList = await getWorktreeList();
  let mainRepoDir = "";

  const lines = worktreeList.split("\n");
  for (const line of lines) {
    if (line.startsWith("worktree ") && !mainRepoDir) {
      mainRepoDir = line.substring(9);
    }
  }

  const branchName = await getCurrentBranch();

  printInfo(`Removing treefrog worktree: ${path.basename(currentDir)}`);
  printInfo(`Branch: ${branchName}`);

  process.chdir(mainRepoDir);

  printInfo("Removing worktree...");
  await removeWorktree(currentDir);

  printInfo(`Branch '${branchName}' preserved`);
  printSuccess("Removal completed!");
  printInfo(`You are now in: ${process.cwd()}`);
}
