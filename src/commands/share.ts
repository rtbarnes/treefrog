import type { ShareArgs } from "../types.js";
import { ensureRibbitWorktree, findMainRepo } from "../services/git.js";
import { createSymlinks } from "../services/fs.js";
import { printInfo, printSuccess } from "../services/ui.js";

// Share additional files in current worktree
export async function handleShare(args: ShareArgs): Promise<void> {
  await ensureRibbitWorktree();

  const mainRepoDir = await findMainRepo();
  printInfo("Sharing files from main repo...");
  await createSymlinks(args.shareFiles, mainRepoDir);
  printSuccess("Files shared successfully!");
}
