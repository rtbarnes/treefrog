import { $ } from "bun";
import fs from "fs/promises";
import os from "os";
import path from "path";

const CLI_PATH = path.resolve(import.meta.dir, "../src/index.ts");

export interface CliResult {
  stdout: string;
  stderr: string;
  exitCode: number;
}

export interface TestRepo {
  repoDir: string;
  treefrogBase: string;
  cleanup: () => Promise<void>;
}

/** Run a test body with an isolated temp git repo and guaranteed cleanup. */
export async function withTestRepo<T>(
  run: (repo: TestRepo) => Promise<T>,
  treefrogConfig?: string,
): Promise<T> {
  const repo = await createTestRepo(treefrogConfig);
  try {
    return await run(repo);
  } finally {
    await repo.cleanup();
  }
}

/** Run the treefrog CLI as a subprocess with TREEFROG_BASE override. */
export async function runCli(
  args: string[],
  opts: { cwd: string; treefrogBase: string },
): Promise<CliResult> {
  const proc = Bun.spawn(["bun", "run", CLI_PATH, ...args], {
    cwd: opts.cwd,
    stdout: "pipe",
    stderr: "pipe",
    env: { ...process.env, TREEFROG_BASE: opts.treefrogBase, NO_COLOR: "1" },
  });

  const [stdout, stderr] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
  ]);
  const exitCode = await proc.exited;

  return { stdout, stderr, exitCode };
}

/** Create a temporary git repo with an initial commit and optional .treefrog config. */
export async function createTestRepo(treefrogConfig?: string): Promise<TestRepo> {
  // Resolve symlinks (macOS /var -> /private/var) so paths match git output
  const root = await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(), "treefrog-test-")));
  const repoDir = path.join(root, "repo");
  const treefrogBase = path.join(root, "worktrees");

  await fs.mkdir(repoDir, { recursive: true });
  await fs.mkdir(treefrogBase, { recursive: true });

  await $`git init`.cwd(repoDir).quiet();
  await $`git config user.email "test@test.com"`.cwd(repoDir).quiet();
  await $`git config user.name "Test"`.cwd(repoDir).quiet();

  // Create tracked files (available in worktrees via git checkout)
  await fs.writeFile(path.join(repoDir, "tracked.txt"), "tracked-content");
  // .gitignore entries for untracked files used in share/clone tests
  await fs.writeFile(path.join(repoDir, ".gitignore"), "untracked.txt\nuntracked-dir/\n");

  if (treefrogConfig) {
    await fs.writeFile(path.join(repoDir, ".treefrog"), treefrogConfig);
  }

  await $`git add -A`.cwd(repoDir).quiet();
  await $`git commit -m "initial"`.cwd(repoDir).quiet();

  // Create untracked/ignored files (only in main repo, not in worktrees)
  await fs.writeFile(path.join(repoDir, "untracked.txt"), "untracked-content");
  await fs.mkdir(path.join(repoDir, "untracked-dir"));
  await fs.writeFile(path.join(repoDir, "untracked-dir", "nested.txt"), "nested-content");

  return {
    repoDir,
    treefrogBase,
    cleanup: () => fs.rm(root, { recursive: true, force: true }),
  };
}
