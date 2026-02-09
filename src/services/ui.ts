// Colors for output
const colors = {
  RED: "\x1b[0;31m",
  GREEN: "\x1b[0;32m",
  YELLOW: "\x1b[1;33m",
  NC: "\x1b[0m", // No Color
};

// Print colored output functions
export function printError(message: string): void {
  console.error(`${colors.RED}Error: ${message}${colors.NC}`);
}

export function printSuccess(message: string): void {
  console.log(`${colors.GREEN}${message}${colors.NC}`);
}

export function printInfo(message: string): void {
  console.log(`${colors.YELLOW}${message}${colors.NC}`);
}

// Usage information
export function printUsage(): void {
  console.log(`Usage:
  treefrog create <branch-name> [--share|--clone file1,file2,...]  Create new agent worktree
  treefrog share <file1,file2,...>                                 Share additional files in current worktree
  treefrog clone <file1,file2,...>                                 Clone additional files in current worktree
  treefrog cleanup                                                  Clean up current agent worktree
  treefrog list                                                     List active agent worktrees

Options:
  --share   Symlink files from main repo (changes affect main repo)
  --clone   Copy files from main repo (independent copies)

Examples:
  treefrog create implement-user-auth --share .env,.env.local
  treefrog create fix-login-bug --clone .env,.env.local
  treefrog share .env.production,config/database.yml
  treefrog clone secrets.json
  treefrog cleanup`);
}
