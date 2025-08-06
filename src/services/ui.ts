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
  ribbit <branch-name> [--share|--clone file1,file2,...]  Create new agent worktree
  ribbit share <file1,file2,...>                          Share additional files in current worktree
  ribbit clone <file1,file2,...>                          Clone additional files in current worktree
  ribbit cleanup                                           Clean up current agent worktree
  ribbit list                                              List active agent worktrees

Options:
  --share   Symlink files from main repo (changes affect main repo)
  --clone   Copy files from main repo (independent copies)

Examples:
  ribbit implement-user-auth --share .env,.env.local
  ribbit fix-login-bug --clone .env,.env.local
  ribbit share .env.production,config/database.yml
  ribbit clone secrets.json
  ribbit cleanup`);
}
