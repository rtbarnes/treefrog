#!/usr/bin/env bun

import { parseCliArgs } from "./cli.js";
import {
  handleCreate,
  handleCleanup,
  handleList,
  handleSpotlight,
} from "./commands/index.js";
import { handleCompletion } from "./completions.js";
import { printError } from "./services/ui.js";
import {
  NotInGitRepoError,
  NotInWorktreeError,
  WorktreeExistsError,
  FileNotFoundError,
} from "./types.js";
import type { CleanupArgs, CreateArgs, SpotlightArgs } from "./types.js";

// Main execution
async function main(): Promise<void> {
  if (handleCompletion()) {
    return;
  }

  try {
    const parsed = parseCliArgs();

    switch (parsed.command) {
      case "create":
        await handleCreate(parsed.args as CreateArgs);
        break;
      case "cleanup":
        await handleCleanup(parsed.args as CleanupArgs | undefined);
        break;
      case "list":
        await handleList();
        break;
      case "spotlight":
        await handleSpotlight(parsed.args as SpotlightArgs);
        break;
    }
  } catch (error) {
    if (error instanceof NotInGitRepoError) {
      printError(error.message);
    } else if (error instanceof NotInWorktreeError) {
      printError(error.message);
      if (error.message.includes("Cleanup must be run")) {
        printError("This command must be run from within a treefrog worktree");
      }
    } else if (error instanceof WorktreeExistsError) {
      printError(error.message);
    } else if (error instanceof FileNotFoundError) {
      printError(error.message);
    } else if (error instanceof Error) {
      printError(error.message);
    } else {
      printError(`Unexpected error: ${error}`);
    }
    process.exit(1);
  }
}

// Run main function if this file is executed directly
if (import.meta.main) {
  await main();
}
