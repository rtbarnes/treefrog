import { $ } from "bun";
import fs from "fs";
import os from "os";
import path from "path";
import { NotInGitRepoError } from "../types.js";

// Resolve symlinks in tmpdir (macOS /var -> /private/var) so paths match git output
const resolvedTmpdir = fs.realpathSync(os.tmpdir());
const TREEFROG_BASE = process.env.TREEFROG_BASE
  ? process.env.TREEFROG_BASE
  : path.join(resolvedTmpdir, "treefrog");

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
export async function createWorktree(worktreeDir: string, branchName: string): Promise<void> {
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

// Get the base directory for treefrog worktrees: /tmp/treefrog/<repo-name>/
export async function getWorktreeBaseDir(): Promise<string> {
  const repoName = await getRepoName();
  return path.join(TREEFROG_BASE, repoName);
}

// Check if a path is inside the treefrog tmp area
export function isTreefrogPath(p: string): boolean {
  return p.startsWith(TREEFROG_BASE + path.sep);
}

// Check if current directory is a treefrog worktree
export async function isTreefrogWorktree(): Promise<boolean> {
  const currentDir = process.cwd();
  if (!isTreefrogPath(currentDir)) return false;

  const worktreeList = await getWorktreeList();
  const lines = worktreeList.split("\n");
  for (const line of lines) {
    if (line.startsWith("worktree ") && line.substring(9) === currentDir) {
      return true;
    }
  }

  return false;
}

// Checkout a branch
export async function checkoutBranch(branchName: string): Promise<void> {
  await $`git checkout ${branchName}`.quiet();
}

// Find worktree path by branch name
export async function findWorktreeByBranch(branchName: string): Promise<string | null> {
  const worktreeList = await getWorktreeList();
  const lines = worktreeList.split("\n");

  let currentWorktree: string | null = null;

  for (const line of lines) {
    if (line.startsWith("worktree ")) {
      currentWorktree = line.substring(9);
    } else if (line.startsWith("branch refs/heads/")) {
      const branchRef = line.substring(18);
      if (branchRef === branchName && currentWorktree) {
        return currentWorktree;
      }
    }
  }

  return null;
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
