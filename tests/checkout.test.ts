import { $ } from "bun";
import { describe, test, expect } from "bun:test";
import fs from "fs/promises";
import path from "path";
import { runCli, withTestRepo } from "./helpers.js";

describe("treefrog checkout", () => {
  test("removes worktree and checks out branch in main repo", async () => {
    await withTestRepo(async (repo) => {
      await runCli(["create", "spot-branch"], {
        cwd: repo.repoDir,
        treefrogBase: repo.treefrogBase,
      });

      const repoName = path.basename(repo.repoDir);
      const wtDir = path.join(repo.treefrogBase, repoName, "spot-branch");
      expect((await fs.stat(wtDir)).isDirectory()).toBe(true);

      const result = await runCli(["checkout", "spot-branch"], {
        cwd: repo.repoDir,
        treefrogBase: repo.treefrogBase,
      });

      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain("spot-branch");
      expect(result.stdout).toContain("now active in main repository");

      // Worktree dir should be gone
      const exists = await fs.stat(wtDir).catch(() => null);
      expect(exists).toBeNull();

      // Main repo should be on that branch
      const branch = (await $`git branch --show-current`.cwd(repo.repoDir).text()).trim();
      expect(branch).toBe("spot-branch");
    });
  });

  test("preserves tracked, staged, and untracked changes from worktree", async () => {
    await withTestRepo(async (repo) => {
      await runCli(["create", "dirty-branch"], {
        cwd: repo.repoDir,
        treefrogBase: repo.treefrogBase,
      });

      const repoName = path.basename(repo.repoDir);
      const wtDir = path.join(repo.treefrogBase, repoName, "dirty-branch");

      await fs.writeFile(path.join(wtDir, "staged.txt"), "staged-content\n");
      await $`git add staged.txt`.cwd(wtDir).quiet();
      await fs.writeFile(path.join(wtDir, "tracked.txt"), "dirty-tracked-content\n");
      await fs.writeFile(path.join(wtDir, "untracked-local.txt"), "untracked-content\n");

      const result = await runCli(["checkout", "dirty-branch"], {
        cwd: repo.repoDir,
        treefrogBase: repo.treefrogBase,
      });

      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain("Restored uncommitted changes");

      const exists = await fs.stat(wtDir).catch(() => null);
      expect(exists).toBeNull();

      const branch = (await $`git branch --show-current`.cwd(repo.repoDir).text()).trim();
      expect(branch).toBe("dirty-branch");

      const status = await $`git status --porcelain`.cwd(repo.repoDir).text();
      expect(status).toContain("A  staged.txt");
      expect(status).toContain(" M tracked.txt");
      expect(status).toContain("?? untracked-local.txt");

      const trackedContent = await fs.readFile(path.join(repo.repoDir, "tracked.txt"), "utf-8");
      expect(trackedContent).toBe("dirty-tracked-content\n");
      const untrackedContent = await fs.readFile(
        path.join(repo.repoDir, "untracked-local.txt"),
        "utf-8",
      );
      expect(untrackedContent).toBe("untracked-content\n");

      const stashList = (await $`git stash list`.cwd(repo.repoDir).text()).trim();
      expect(stashList).toBe("");
    });
  });

  test("keeps stash and shows recovery command if checkout step fails", async () => {
    await withTestRepo(async (repo) => {
      await runCli(["create", "conflict-branch"], {
        cwd: repo.repoDir,
        treefrogBase: repo.treefrogBase,
      });

      const repoName = path.basename(repo.repoDir);
      const wtDir = path.join(repo.treefrogBase, repoName, "conflict-branch");

      await fs.writeFile(path.join(wtDir, "tracked.txt"), "branch-committed-change\n");
      await $`git add tracked.txt`.cwd(wtDir).quiet();
      await $`git commit -m "branch commit"`.cwd(wtDir).quiet();

      await fs.writeFile(path.join(wtDir, "tracked.txt"), "branch-uncommitted-change\n");
      await fs.writeFile(path.join(repo.repoDir, "tracked.txt"), "main-uncommitted-change\n");

      const result = await runCli(["checkout", "conflict-branch"], {
        cwd: repo.repoDir,
        treefrogBase: repo.treefrogBase,
      });

      expect(result.exitCode).not.toBe(0);
      expect(result.stderr).toContain("changes were preserved in stash");
      expect(result.stderr).toContain("git stash apply --index");

      const exists = await fs.stat(wtDir).catch(() => null);
      expect(exists).toBeNull();

      const stashList = await $`git stash list`.cwd(repo.repoDir).text();
      expect(stashList).toContain("treefrog-checkout:conflict-branch:");
    });
  });

  test("errors when branch has no worktree", async () => {
    await withTestRepo(async (repo) => {
      const result = await runCli(["checkout", "nonexistent"], {
        cwd: repo.repoDir,
        treefrogBase: repo.treefrogBase,
      });

      expect(result.exitCode).not.toBe(0);
      expect(result.stderr).toContain("No worktree found");
    });
  });
});
