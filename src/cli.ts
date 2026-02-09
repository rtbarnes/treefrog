import type { CleanupArgs, CreateArgs, SpotlightArgs } from "./types.js";
import { printUsage } from "./services/ui.js";

export interface ParsedCommand {
  command: "create" | "cleanup" | "list" | "spotlight";
  args?: CleanupArgs | CreateArgs | SpotlightArgs;
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
      return {
        command: "cleanup",
        args: args[1] ? ({ branchName: args[1] } as CleanupArgs) : undefined,
      };

    case "list":
      return { command: "list" };

    case "spotlight":
      if (!args[1]) {
        throw new Error("No branch name specified for spotlight");
      }
      return {
        command: "spotlight",
        args: { branchName: args[1] } as SpotlightArgs,
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

      // Check for any remaining arguments (shouldn't be any)
      if (args.length > 2) {
        throw new Error(`Unknown option: ${args[2]}`);
      }

      return { command: "create", args: createArgs };
    }

    default:
      throw new Error(`Unknown command: ${firstArg}`);
  }
}
