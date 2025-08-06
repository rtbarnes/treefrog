import type { CloneArgs } from "../types.js";
import { ensureRibbitWorktree, findMainRepo } from "../services/git.js";
import { copyFiles } from "../services/fs.js";
import { printInfo, printSuccess } from "../services/ui.js";

// Clone additional files to current worktree
export async function handleClone(args: CloneArgs): Promise<void> {
  await ensureRibbitWorktree();

  const mainRepoDir = await findMainRepo();
  printInfo("Copying files from main repo...");
  await copyFiles(args.cloneFiles, mainRepoDir);
  printSuccess("Files copied successfully!");
}
