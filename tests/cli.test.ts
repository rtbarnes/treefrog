import { describe, test, expect } from "bun:test";
import { runCli, withTestRepo } from "./helpers.js";

describe("treefrog cli", () => {
  test("no args prints help", async () => {
    await withTestRepo(async (repo) => {
      const result = await runCli([], {
        cwd: repo.repoDir,
        treefrogBase: repo.treefrogBase,
      });

      expect(result.stdout).toContain("Usage:");
    });
  });

  test("unknown command exits non-zero", async () => {
    await withTestRepo(async (repo) => {
      const result = await runCli(["bogus"], {
        cwd: repo.repoDir,
        treefrogBase: repo.treefrogBase,
      });

      expect(result.exitCode).not.toBe(0);
    });
  });

  test("'c' alias works for create", async () => {
    await withTestRepo(async (repo) => {
      const result = await runCli(["c", "alias-branch"], {
        cwd: repo.repoDir,
        treefrogBase: repo.treefrogBase,
      });

      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain("Worktree created successfully");
    });
  });

  test("'rm' alias works for remove", async () => {
    await withTestRepo(async (repo) => {
      await runCli(["create", "rm-alias"], {
        cwd: repo.repoDir,
        treefrogBase: repo.treefrogBase,
      });

      const result = await runCli(["rm", "rm-alias"], {
        cwd: repo.repoDir,
        treefrogBase: repo.treefrogBase,
      });

      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain("Removal completed");
    });
  });

  test("'ls' alias works for list", async () => {
    await withTestRepo(async (repo) => {
      const result = await runCli(["ls"], {
        cwd: repo.repoDir,
        treefrogBase: repo.treefrogBase,
      });

      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain("Active treefrog worktrees");
    });
  });

  test("'e' alias works for enter", async () => {
    await withTestRepo(async (repo) => {
      await runCli(["create", "enter-alias"], {
        cwd: repo.repoDir,
        treefrogBase: repo.treefrogBase,
      });

      const result = await runCli(["e", "enter-alias"], {
        cwd: repo.repoDir,
        treefrogBase: repo.treefrogBase,
      });

      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain("Entering treefrog worktree");
    });
  });

  test("create help shows shell option", async () => {
    await withTestRepo(async (repo) => {
      const result = await runCli(["create", "--help"], {
        cwd: repo.repoDir,
        treefrogBase: repo.treefrogBase,
      });

      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain("-s, --shell");
    });
  });

  test("enter help is available", async () => {
    await withTestRepo(async (repo) => {
      const result = await runCli(["enter", "--help"], {
        cwd: repo.repoDir,
        treefrogBase: repo.treefrogBase,
      });

      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain("Open a shell in an existing agent worktree");
    });
  });
});
