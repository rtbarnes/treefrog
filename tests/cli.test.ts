import { describe, test, expect, afterEach } from "bun:test";
import { createTestRepo, runCli, type TestRepo } from "./helpers.js";

let repo: TestRepo;

afterEach(async () => {
  await repo?.cleanup();
});

describe("treefrog cli", () => {
  test("no args prints help", async () => {
    repo = await createTestRepo();
    const result = await runCli([], {
      cwd: repo.repoDir,
      treefrogBase: repo.treefrogBase,
    });

    expect(result.stdout).toContain("Usage:");
  });

  test("unknown command exits non-zero", async () => {
    repo = await createTestRepo();
    const result = await runCli(["bogus"], {
      cwd: repo.repoDir,
      treefrogBase: repo.treefrogBase,
    });

    expect(result.exitCode).not.toBe(0);
  });

  test("'c' alias works for create", async () => {
    repo = await createTestRepo();
    const result = await runCli(["c", "alias-branch"], {
      cwd: repo.repoDir,
      treefrogBase: repo.treefrogBase,
    });

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("Worktree created successfully");
  });

  test("'rm' alias works for remove", async () => {
    repo = await createTestRepo();
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

  test("'ls' alias works for list", async () => {
    repo = await createTestRepo();
    const result = await runCli(["ls"], {
      cwd: repo.repoDir,
      treefrogBase: repo.treefrogBase,
    });

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("Active treefrog worktrees");
  });

  test("create help shows shell option", async () => {
    repo = await createTestRepo();
    const result = await runCli(["create", "--help"], {
      cwd: repo.repoDir,
      treefrogBase: repo.treefrogBase,
    });

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("-s, --shell");
  });
});
