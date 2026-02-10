import { Command } from "commander";
import tab from "@bomb.sh/tab/commander";
import {
  handleCreate,
  handleEnter,
  handleRemove,
  handleList,
  handleSpotlight,
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
    .argument("<branch-name>")
    .option("-s, --shell", "Start an interactive shell in the new worktree")
    .action((branchName: string, options: { shell?: boolean }) =>
      handleCreate({ branchName, shell: options.shell }),
    );

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
    .command("spotlight")
    .description("Remove worktree and checkout branch in main repo")
    .argument("<branch-name>")
    .action((branchName: string) => handleSpotlight({ branchName }));

  const completion = tab(program);
  registerCompletions(completion);

  return program;
}
