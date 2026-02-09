import type { CreateArgs, ShareArgs, CloneArgs } from "./types.js";
import { printUsage } from "./services/ui.js";

export interface ParsedCommand {
  command: "create" | "cleanup" | "list" | "share" | "clone";
  args?: CreateArgs | ShareArgs | CloneArgs;
}

export function parseCliArgs(): ParsedCommand {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    printUsage();
    process.exit(1);
  }

  const firstArg = args[0]!; // Safe because we checked args.length > 0 above

  switch (firstArg) {
    case "cleanup":
      return { command: "cleanup" };

    case "list":
      return { command: "list" };

    case "share":
      if (!args[1]) {
        throw new Error("No files specified to share");
      }
      return {
        command: "share",
        args: { shareFiles: args[1] } as ShareArgs,
      };

    case "clone":
      if (!args[1]) {
        throw new Error("No files specified to clone");
      }
      return {
        command: "clone",
        args: { cloneFiles: args[1] } as CloneArgs,
      };

    case "--help":
    case "-h":
      printUsage();
      process.exit(0);

    case "create": {
      if (!args[1]) {
        throw new Error("No branch name specified for create");
      }
      const createArgs: CreateArgs = { branchName: args[1] };

      // Parse remaining arguments
      for (let i = 2; i < args.length; i++) {
        if (args[i] === "--share") {
          if (createArgs.cloneFiles) {
            throw new Error("Cannot use both --share and --clone");
          }
          if (!args[i + 1]) {
            throw new Error("--share requires a file list");
          }
          createArgs.shareFiles = args[i + 1];
          createArgs.fileMode = "share";
          i++; // Skip next argument as it's the file list
        } else if (args[i] === "--clone") {
          if (createArgs.shareFiles) {
            throw new Error("Cannot use both --share and --clone");
          }
          if (!args[i + 1]) {
            throw new Error("--clone requires a file list");
          }
          createArgs.cloneFiles = args[i + 1];
          createArgs.fileMode = "clone";
          i++; // Skip next argument as it's the file list
        } else {
          throw new Error(`Unknown option: ${args[i]}`);
        }
      }

      return { command: "create", args: createArgs };
    }

    default:
      throw new Error(`Unknown command: ${firstArg}`);
  }
}
