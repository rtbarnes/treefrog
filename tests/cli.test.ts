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
});
