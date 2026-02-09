import { execSync } from "child_process";
import type { RootCommand } from "@bomb.sh/tab";

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

function getWorktreeBranches(): string[] {
  try {
    const output = execSync("git worktree list --porcelain", {
      encoding: "utf-8",
    });
    const branches: string[] = [];
    for (const line of output.split("\n")) {
      if (line.startsWith("branch refs/heads/")) {
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
  createCmd?.argument("branch-name", (complete) => {
    for (const branch of getLocalBranches()) {
      complete(branch, "");
    }
  });

  const removeCmd = completion.commands.get("remove");
  removeCmd?.argument("branch-name", (complete) => {
    for (const branch of getWorktreeBranches()) {
      complete(branch, "active worktree");
    }
  });

  const spotlightCmd = completion.commands.get("spotlight");
  spotlightCmd?.argument("branch-name", (complete) => {
    for (const branch of getWorktreeBranches()) {
      complete(branch, "active worktree");
    }
  });
}
