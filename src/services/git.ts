import { $ } from "bun";
import path from "path";
import { NotInGitRepoError, NotInWorktreeError } from "../types.js";

// Check if we're in a git repository
export async function isGitRepository(): Promise<boolean> {
  try {
    await $`git rev-parse --git-dir`.quiet();
    return true;
  } catch {
    return false;
  }
}

// Check if we're in a git repository and throw if not
export async function ensureGitRepository(): Promise<void> {
  if (!(await isGitRepository())) {
    throw new NotInGitRepoError();
  }
}

// Get repository name
export async function getRepoName(): Promise<string> {
  const result = await $`git rev-parse --show-toplevel`.text();
  return path.basename(result.trim());
}

// Get the main repository directory
export async function getMainRepoDir(): Promise<string> {
  const result = await $`git rev-parse --show-toplevel`.text();
  return result.trim();
}

// Check if a branch exists
export async function branchExists(branchName: string): Promise<boolean> {
  try {
    await $`git show-ref --verify --quiet refs/heads/${branchName}`.quiet();
    return true;
  } catch {
    return false;
  }
}

// Create a worktree
export async function createWorktree(
  worktreeDir: string,
  branchName: string
): Promise<void> {
  const exists = await branchExists(branchName);

  if (exists) {
    await $`git worktree add ${worktreeDir} ${branchName}`.quiet();
  } else {
    await $`git worktree add ${worktreeDir} -b ${branchName}`.quiet();
  }
}

// Get current branch name
export async function getCurrentBranch(): Promise<string> {
  const result = await $`git branch --show-current`.text();
  return result.trim();
}

// Get worktree list information
export async function getWorktreeList(): Promise<string> {
  const result = await $`git worktree list --porcelain`.text();
  return result;
}

// Remove a worktree
export async function removeWorktree(worktreeDir: string): Promise<void> {
  await $`git worktree remove ${worktreeDir} --force`.quiet();
}

// Check if current directory is a ribbit worktree
export async function isRibbitWorktree(): Promise<boolean> {
  const currentDir = process.cwd();
  const worktreeList = await getWorktreeList();

  // Parse worktree list
  const lines = worktreeList.split("\n");
  for (const line of lines) {
    if (line.startsWith("worktree ")) {
      const worktreePath = line.substring(9);
      if (currentDir === worktreePath) {
        const dirName = path.basename(currentDir);
        if (dirName.match(/^[^-]+-.+$/)) {
          return true;
        }
      }
    }
  }

  return false;
}

// Ensure we're in a ribbit worktree
export async function ensureRibbitWorktree(): Promise<void> {
  await ensureGitRepository();

  if (!(await isRibbitWorktree())) {
    throw new NotInWorktreeError();
  }

  // Check if we're in main/master branch (prevent share/clone in main repo)
  const currentBranch = await getCurrentBranch();
  if (currentBranch === "main" || currentBranch === "master") {
    throw new NotInWorktreeError(
      "Cannot share/clone files in main/master branch"
    );
  }
}

// Find main repository directory from worktree list
export async function findMainRepo(): Promise<string> {
  const worktreeList = await getWorktreeList();
  const lines = worktreeList.split("\n");

  for (const line of lines) {
    if (line.startsWith("worktree ")) {
      return line.substring(9);
    }
  }

  throw new Error("Could not find main repository");
}
