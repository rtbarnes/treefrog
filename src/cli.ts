import { Command } from "commander";
import tab from "@bomb.sh/tab/commander";
import {
  handleCreate,
  handleEnter,
  handleRemove,
  handleList,
  handleCheckout,
} from "./commands/index.js";
import { registerCompletions } from "./completions.js";

export function buildProgram(): Command {
  const program = new Command();

  program
    .name("treefrog")
    .description("Git worktree manager for agent workflows")
    .showHelpAfterError();

  program
    .command("create")
    .alias("c")
    .description("Create new agent worktree")
    .argument("[branch-name]")
    .option("-s, --shell", "Start an interactive shell in the new worktree")
    .option("--current", "Create worktree from the current branch")
    .action((branchName: string | undefined, options: { shell?: boolean; current?: boolean }) => {
      if (!branchName && !options.current) {
        throw new Error("branch-name is required unless --current is specified");
      }
      return handleCreate({
        branchName: branchName ?? "",
        shell: options.shell,
        current: options.current,
      });
    });

  program
    .command("enter")
    .alias("e")
    .description("Open a shell in an existing agent worktree")
    .argument("<branch-name>")
    .action((branchName: string) => handleEnter({ branchName }));

  program
    .command("remove")
    .alias("rm")
    .description("Remove agent worktree (current dir or by branch)")
    .argument("[branch-name]")
    .action((branchName?: string) => handleRemove(branchName ? { branchName } : undefined));

  program
    .command("list")
    .alias("ls")
    .description("List active agent worktrees")
    .action(() => handleList());

  program
    .command("checkout")
    .description("Remove worktree and checkout branch in main repo")
    .argument("<branch-name>")
    .action((branchName: string) => handleCheckout({ branchName }));

  const completion = tab(program);
  registerCompletions(completion);

  return program;
}
