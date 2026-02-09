#!/usr/bin/env bun

import { parseCliArgs } from "./cli.js";
import {
  handleCreate,
  handleCleanup,
  handleList,
  handleShare,
  handleClone,
} from "./commands/index.js";
import { printError } from "./services/ui.js";
import {
  NotInGitRepoError,
  NotInWorktreeError,
  WorktreeExistsError,
  FileNotFoundError,
} from "./types.js";
import type { CreateArgs, ShareArgs, CloneArgs } from "./types.js";

// Main execution
async function main(): Promise<void> {
  try {
    const parsed = parseCliArgs();

    switch (parsed.command) {
      case "create":
        await handleCreate(parsed.args as CreateArgs);
        break;
      case "cleanup":
        await handleCleanup();
        break;
      case "list":
        await handleList();
        break;
      case "share":
        await handleShare(parsed.args as ShareArgs);
        break;
      case "clone":
        await handleClone(parsed.args as CloneArgs);
        break;
    }
  } catch (error) {
    if (error instanceof NotInGitRepoError) {
      printError(error.message);
    } else if (error instanceof NotInWorktreeError) {
      printError(error.message);
      if (error.message.includes("Cleanup must be run")) {
        printError("This command must be run from within a treefrog worktree");
      } else if (error.message.includes("main/master")) {
        printError("Share and clone commands are only allowed in treefrog worktrees");
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
