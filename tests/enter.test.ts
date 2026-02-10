import { describe, test, expect, afterEach } from "bun:test";
import { createTestRepo, runCli, type TestRepo } from "./helpers.js";

let repo: TestRepo;

afterEach(async () => {
  await repo?.cleanup();
});

describe("treefrog enter", () => {
  test("opens shell in an existing worktree", async () => {
    repo = await createTestRepo();
    await runCli(["create", "enter-branch"], {
      cwd: repo.repoDir,
      treefrogBase: repo.treefrogBase,
    });

    const result = await runCli(["enter", "enter-branch"], {
      cwd: repo.repoDir,
      treefrogBase: repo.treefrogBase,
    });

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("Entering treefrog worktree: enter-branch");
    expect(result.stdout).toContain("You are now in:");
    expect(result.stdout).toContain(
      "Skipping shell launch because no interactive terminal is attached",
    );
  });

  test("errors when branch has no worktree", async () => {
    repo = await createTestRepo();
    const result = await runCli(["enter", "nonexistent"], {
      cwd: repo.repoDir,
      treefrogBase: repo.treefrogBase,
    });

    expect(result.exitCode).not.toBe(0);
    expect(result.stderr).toContain("No worktree found");
  });
});
