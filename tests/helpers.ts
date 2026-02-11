import { $ } from "bun";
import fs from "fs/promises";
import os from "os";
import path from "path";

const CLI_PATH = path.resolve(import.meta.dir, "../src/index.ts");
const TEST_CONFIG_HOME_DIR = "__treefrog_test_config_home__";

interface TestProjectConfig {
  shareFiles?: string[];
  cloneFiles?: string[];
  commands?: string[];
}

export interface CliResult {
  stdout: string;
  stderr: string;
  exitCode: number;
}

export interface TestRepo {
  repoDir: string;
  treefrogBase: string;
  configHome: string;
  cleanup: () => Promise<void>;
}

function getConfigHomePath(treefrogBase: string): string {
  return path.join(treefrogBase, TEST_CONFIG_HOME_DIR);
}

/** Run a test body with an isolated temp git repo and guaranteed cleanup. */
export async function withTestRepo<T>(
  run: (repo: TestRepo) => Promise<T>,
  projectConfig?: TestProjectConfig,
): Promise<T> {
  const repo = await createTestRepo(projectConfig);
  try {
    return await run(repo);
  } finally {
    await repo.cleanup();
  }
}

/** Run the treefrog CLI as a subprocess with TREEFROG_BASE override. */
export async function runCli(
  args: string[],
  opts: { cwd: string; treefrogBase: string; configHome?: string },
): Promise<CliResult> {
  const configHome = opts.configHome ?? getConfigHomePath(opts.treefrogBase);
  const proc = Bun.spawn(["bun", "run", CLI_PATH, ...args], {
    cwd: opts.cwd,
    stdout: "pipe",
    stderr: "pipe",
    env: {
      ...process.env,
      TREEFROG_BASE: opts.treefrogBase,
      XDG_CONFIG_HOME: configHome,
      NO_COLOR: "1",
    },
  });

  const [stdout, stderr] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
  ]);
  const exitCode = await proc.exited;

  return { stdout, stderr, exitCode };
}

/** Create a temporary git repo with an initial commit and optional project config. */
export async function createTestRepo(projectConfig?: TestProjectConfig): Promise<TestRepo> {
  // Resolve symlinks (macOS /var -> /private/var) so paths match git output
  const root = await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(), "treefrog-test-")));
  const repoDir = path.join(root, "repo");
  const treefrogBase = path.join(root, "worktrees");
  const configHome = getConfigHomePath(treefrogBase);

  await fs.mkdir(repoDir, { recursive: true });
  await fs.mkdir(treefrogBase, { recursive: true });
  await fs.mkdir(configHome, { recursive: true });

  await $`git init`.cwd(repoDir).quiet();
  await $`git config user.email "test@test.com"`.cwd(repoDir).quiet();
  await $`git config user.name "Test"`.cwd(repoDir).quiet();

  // Create tracked files (available in worktrees via git checkout)
  await fs.writeFile(path.join(repoDir, "tracked.txt"), "tracked-content");
  // .gitignore entries for untracked files used in share/clone tests
  await fs.writeFile(path.join(repoDir, ".gitignore"), "untracked.txt\nuntracked-dir/\n");

  if (projectConfig) {
    const repoKey = await fs.realpath(repoDir);
    const configPath = path.join(configHome, "treefrog", "config.json");
    await fs.mkdir(path.dirname(configPath), { recursive: true });
    await fs.writeFile(
      configPath,
      JSON.stringify(
        {
          version: 1,
          projects: {
            [repoKey]: {
              shareFiles: projectConfig.shareFiles ?? [],
              cloneFiles: projectConfig.cloneFiles ?? [],
              commands: projectConfig.commands ?? [],
            },
          },
        },
        null,
        2,
      ),
    );
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
    configHome,
    cleanup: () => fs.rm(root, { recursive: true, force: true }),
  };
}
