import { describe, test, expect, afterEach } from "bun:test";
import { createTestRepo, runCli, type TestRepo } from "./helpers.js";

let repo: TestRepo;

afterEach(async () => {
  await repo?.cleanup();
});

describe("treefrog list", () => {
  test("shows no worktrees message when none exist", async () => {
    repo = await createTestRepo();
    const result = await runCli(["list"], {
      cwd: repo.repoDir,
      treefrogBase: repo.treefrogBase,
    });

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("No active treefrog worktrees found");
  });

  test("lists created worktrees", async () => {
    repo = await createTestRepo();
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
