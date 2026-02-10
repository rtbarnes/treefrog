import { describe, test, expect } from "bun:test";
import { runCli, withTestRepo } from "./helpers.js";

describe("treefrog list", () => {
  test("shows no worktrees message when none exist", async () => {
    await withTestRepo(async (repo) => {
      const result = await runCli(["list"], {
        cwd: repo.repoDir,
        treefrogBase: repo.treefrogBase,
      });

      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain("No active treefrog worktrees found");
    });
  });

  test("lists created worktrees", async () => {
    await withTestRepo(async (repo) => {
      await runCli(["create", "list-branch"], {
        cwd: repo.repoDir,
        treefrogBase: repo.treefrogBase,
      });

      const result = await runCli(["list"], {
        cwd: repo.repoDir,
        treefrogBase: repo.treefrogBase,
      });

      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain("list-branch");
    });
  });
});
