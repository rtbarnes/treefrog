import { describe, test, expect } from "bun:test";
import fs from "fs/promises";
import path from "path";
import { runCli, withTestRepo } from "./helpers.js";

describe("treefrog remove", () => {
  test("removes a worktree by branch name", async () => {
    await withTestRepo(async (repo) => {
      await runCli(["create", "rm-branch"], {
        cwd: repo.repoDir,
        treefrogBase: repo.treefrogBase,
      });

      const repoName = path.basename(repo.repoDir);
      const wtDir = path.join(repo.treefrogBase, repoName, "rm-branch");
      expect((await fs.stat(wtDir)).isDirectory()).toBe(true);

      const result = await runCli(["remove", "rm-branch"], {
        cwd: repo.repoDir,
        treefrogBase: repo.treefrogBase,
      });

      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain("Removal completed");

      const exists = await fs.stat(wtDir).catch(() => null);
      expect(exists).toBeNull();
    });
  });

  test("errors when branch has no worktree", async () => {
    await withTestRepo(async (repo) => {
      const result = await runCli(["remove", "nonexistent"], {
        cwd: repo.repoDir,
        treefrogBase: repo.treefrogBase,
      });

      expect(result.exitCode).not.toBe(0);
      expect(result.stderr).toContain("No worktree found");
    });
  });
});
