#!/usr/bin/env bun

import { buildProgram } from "./cli.js";
import { printError } from "./services/ui.js";
import {
  NotInGitRepoError,
  NotInWorktreeError,
  WorktreeExistsError,
  FileNotFoundError,
} from "./types.js";

async function main(): Promise<void> {
  try {
    const program = buildProgram();
    program.exitOverride();

    if (process.argv.length <= 2) {
      program.help();
    }

    // tab's commander adapter patches program.parse() to intercept
    // `complete -- <args>` for runtime completions; parseAsync doesn't
    // go through that patch, so use parse() when completing.
    const isCompletion =
      process.argv.includes("complete") && process.argv.includes("--");
    if (isCompletion) {
      program.parse(process.argv);
    } else {
      await program.parseAsync(process.argv);
    }
  } catch (error) {
    // Commander already prints its own messages for these; just exit with the right code
    const code = error instanceof Error && "code" in error ? (error as any).code : null;
    if (code?.startsWith("commander.")) {
      process.exit((error as any).exitCode ?? 1);
    }

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

if (import.meta.main) {
  await main();
}
