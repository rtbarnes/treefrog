import path from "path";
import type { EnterArgs } from "../types.js";
import { NotInWorktreeError } from "../types.js";
import { ensureGitRepository, findWorktreeByBranch, isTreefrogPath } from "../services/git.js";
import { startInteractiveShell } from "../services/shell.js";
import { printInfo, printSuccess } from "../services/ui.js";

// Enter an existing agent worktree by branch and start a shell there
export async function handleEnter(args: EnterArgs): Promise<void> {
  await ensureGitRepository();

  const worktreePath = await findWorktreeByBranch(args.branchName);
  if (!worktreePath) {
    throw new NotInWorktreeError(`No worktree found for branch '${args.branchName}'`);
  }

  if (!isTreefrogPath(worktreePath)) {
    throw new NotInWorktreeError(
      `'${path.basename(worktreePath)}' does not appear to be a treefrog worktree`,
    );
  }

  printInfo(`Entering treefrog worktree: ${path.basename(worktreePath)}`);
  printInfo(`Branch: ${args.branchName}`);

  process.chdir(worktreePath);

  printSuccess(`You are now in: ${process.cwd()}`);
  await startInteractiveShell({ cwd: process.cwd(), promptContext: args.branchName });
}
