import { describe, test, expect } from "bun:test";
import fs from "fs/promises";
import path from "path";
import { runCli, withTestRepo } from "./helpers.js";

describe("treefrog create", () => {
  test("creates a worktree for a new branch", async () => {
    await withTestRepo(async (repo) => {
      const result = await runCli(["create", "test-branch"], {
        cwd: repo.repoDir,
        treefrogBase: repo.treefrogBase,
      });

      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain("Worktree created successfully");

      const repoName = path.basename(repo.repoDir);
      const wtDir = path.join(repo.treefrogBase, repoName, "test-branch");
      const stat = await fs.stat(wtDir);
      expect(stat.isDirectory()).toBe(true);
    });
  });

  test("share directive creates symlinks", async () => {
    await withTestRepo(async (repo) => {
      const result = await runCli(["create", "share-test"], {
        cwd: repo.repoDir,
        treefrogBase: repo.treefrogBase,
      });

      expect(result.exitCode).toBe(0);

      const repoName = path.basename(repo.repoDir);
      const wtDir = path.join(repo.treefrogBase, repoName, "share-test");

      const fileStat = await fs.lstat(path.join(wtDir, "untracked.txt"));
      expect(fileStat.isSymbolicLink()).toBe(true);

      const dirStat = await fs.lstat(path.join(wtDir, "untracked-dir"));
      expect(dirStat.isSymbolicLink()).toBe(true);
    }, "share=untracked.txt,untracked-dir");
  });

  test("clone directive copies files", async () => {
    await withTestRepo(async (repo) => {
      const result = await runCli(["create", "clone-test"], {
        cwd: repo.repoDir,
        treefrogBase: repo.treefrogBase,
      });

      expect(result.exitCode).toBe(0);

      const repoName = path.basename(repo.repoDir);
      const wtDir = path.join(repo.treefrogBase, repoName, "clone-test");

      const fileStat = await fs.lstat(path.join(wtDir, "untracked.txt"));
      expect(fileStat.isSymbolicLink()).toBe(false);
      expect(fileStat.isFile()).toBe(true);

      const content = await fs.readFile(path.join(wtDir, "untracked.txt"), "utf-8");
      expect(content).toBe("untracked-content");

      const dirStat = await fs.lstat(path.join(wtDir, "untracked-dir"));
      expect(dirStat.isDirectory()).toBe(true);

      const nested = await fs.readFile(path.join(wtDir, "untracked-dir", "nested.txt"), "utf-8");
      expect(nested).toBe("nested-content");
    }, "clone=untracked.txt,untracked-dir");
  });

  test("commands section executes", async () => {
    const config = ["[commands]", 'echo "hello" > cmd-output.txt'].join("\n");
    await withTestRepo(async (repo) => {
      const result = await runCli(["create", "cmd-test"], {
        cwd: repo.repoDir,
        treefrogBase: repo.treefrogBase,
      });

      expect(result.exitCode).toBe(0);

      const repoName = path.basename(repo.repoDir);
      const wtDir = path.join(repo.treefrogBase, repoName, "cmd-test");
      const output = await fs.readFile(path.join(wtDir, "cmd-output.txt"), "utf-8");
      expect(output.trim()).toBe("hello");
    }, config);
  });

  test("duplicate branch name errors", async () => {
    await withTestRepo(async (repo) => {
      await runCli(["create", "dup-branch"], {
        cwd: repo.repoDir,
        treefrogBase: repo.treefrogBase,
      });

      const result = await runCli(["create", "dup-branch"], {
        cwd: repo.repoDir,
        treefrogBase: repo.treefrogBase,
      });

      expect(result.exitCode).not.toBe(0);
      expect(result.stderr).toContain("already exists");
    });
  });

  test("branch with / gets sanitized in directory name", async () => {
    await withTestRepo(async (repo) => {
      const result = await runCli(["create", "feature/cool"], {
        cwd: repo.repoDir,
        treefrogBase: repo.treefrogBase,
      });

      expect(result.exitCode).toBe(0);

      const repoName = path.basename(repo.repoDir);
      const wtDir = path.join(repo.treefrogBase, repoName, "feature-cool");
      const stat = await fs.stat(wtDir);
      expect(stat.isDirectory()).toBe(true);
    });
  });

  test("--current creates worktree from current branch", async () => {
    await withTestRepo(async (repo) => {
      // Create and switch to a feature branch
      await runCli(["create", "feature-branch"], {
        cwd: repo.repoDir,
        treefrogBase: repo.treefrogBase,
      });
      await runCli(["spotlight", "feature-branch"], {
        cwd: repo.repoDir,
        treefrogBase: repo.treefrogBase,
      });
      // Now main repo is on feature-branch

      const result = await runCli(["create", "--current"], {
        cwd: repo.repoDir,
        treefrogBase: repo.treefrogBase,
      });

      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain("Detaching HEAD to free branch");
      expect(result.stdout).toContain("Worktree created successfully");

      const repoName = path.basename(repo.repoDir);
      const wtDir = path.join(repo.treefrogBase, repoName, "feature-branch");
      const stat = await fs.stat(wtDir);
      expect(stat.isDirectory()).toBe(true);
    });
  });

  test("shell option skips interactive launch when no tty is attached", async () => {
    await withTestRepo(async (repo) => {
      const result = await runCli(["create", "shell-test", "--shell"], {
        cwd: repo.repoDir,
        treefrogBase: repo.treefrogBase,
      });

      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain(
        "Skipping shell launch because no interactive terminal is attached",
      );
    });
  });
});
