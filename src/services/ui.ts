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
