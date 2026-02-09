import { execSync } from "child_process";
import fs from "fs";
import os from "os";
import path from "path";
import type { RootCommand, Complete } from "@bomb.sh/tab";

function getLocalBranches(): string[] {
  try {
    const output = execSync('git branch --format="%(refname:short)"', {
      encoding: "utf-8",
    });
    return output.trim().split("\n").filter(Boolean);
  } catch {
    return [];
  }
}

function getTreefrogBase(): string {
  const resolvedTmpdir = fs.realpathSync(os.tmpdir());
  return process.env.TREEFROG_BASE ?? path.join(resolvedTmpdir, "treefrog");
}

function getWorktreeBranches(): string[] {
  try {
    const treefrogBase = getTreefrogBase() + path.sep;
    const output = execSync("git worktree list --porcelain", {
      encoding: "utf-8",
    });
    const branches: string[] = [];
    let currentPath = "";
    for (const line of output.split("\n")) {
      if (line.startsWith("worktree ")) {
        currentPath = line.substring(9);
      } else if (line.startsWith("branch refs/heads/") && currentPath.startsWith(treefrogBase)) {
        branches.push(line.substring(18));
      }
    }
    return branches;
  } catch {
    return [];
  }
}

export function registerCompletions(completion: RootCommand): void {
  const createCmd = completion.commands.get("create");
  createCmd?.argument("branch-name", (complete: Complete) => {
    for (const branch of getLocalBranches()) {
      complete(branch, "");
    }
  });

  const removeCmd = completion.commands.get("remove");
  removeCmd?.argument("branch-name", (complete: Complete) => {
    for (const branch of getWorktreeBranches()) {
      complete(branch, "active worktree");
    }
  });

  const spotlightCmd = completion.commands.get("spotlight");
  spotlightCmd?.argument("branch-name", (complete: Complete) => {
    for (const branch of getWorktreeBranches()) {
      complete(branch, "active worktree");
    }
  });
}
