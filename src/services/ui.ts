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
  treefrog create <branch-name>                                   Create new agent worktree
  treefrog spotlight <branch-name>                                Remove worktree and checkout branch in main repo
  treefrog cleanup                                                 Clean up current agent worktree
  treefrog list                                                    List active agent worktrees

Examples:
  treefrog create implement-user-auth
  treefrog spotlight implement-user-auth
  treefrog cleanup
  treefrog list`);
}
