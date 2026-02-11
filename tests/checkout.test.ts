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
