import { $ } from "bun";
import fs from "fs/promises";
import path from "path";
import { FileNotFoundError } from "../types.js";
import { printInfo } from "./ui.js";

// Create shared file/directory symlinks
export async function createSymlinks(shareFiles: string[], mainRepoDir: string): Promise<void> {
  if (shareFiles.length === 0) return;

  for (const file of shareFiles) {
    const mainPath = path.join(mainRepoDir, file);

    try {
      const stat = await fs.stat(mainPath);

      if (stat.isFile()) {
        // Handle file
        const dir = path.dirname(file);
        if (dir !== ".") {
          await fs.mkdir(dir, { recursive: true });
        }

        await fs.symlink(mainPath, file);
        printInfo(`Linked file: ${file}`);
      } else if (stat.isDirectory()) {
        // Handle directory
        const parentDir = path.dirname(file);
        if (parentDir !== ".") {
          await fs.mkdir(parentDir, { recursive: true });
        }

        await fs.symlink(mainPath, file);
        printInfo(`Linked directory: ${file}`);
      }
    } catch {
      throw new FileNotFoundError(`Shared file or directory does not exist: ${file}`);
    }
  }
}

// Copy files/directories from main repo
export async function copyFiles(cloneFiles: string[], mainRepoDir: string): Promise<void> {
  if (cloneFiles.length === 0) return;

  for (const file of cloneFiles) {
    const mainPath = path.join(mainRepoDir, file);

    try {
      const stat = await fs.stat(mainPath);

      if (stat.isFile()) {
        // Handle file
        const dir = path.dirname(file);
        if (dir !== ".") {
          await fs.mkdir(dir, { recursive: true });
        }

        await fs.copyFile(mainPath, file);
        printInfo(`Copied file: ${file}`);
      } else if (stat.isDirectory()) {
        // Handle directory
        const parentDir = path.dirname(file);
        if (parentDir !== ".") {
          await fs.mkdir(parentDir, { recursive: true });
        }

        await $`cp -r ${mainPath} ${file}`.quiet();
        printInfo(`Copied directory: ${file}`);
      }
    } catch {
      throw new FileNotFoundError(`File or directory to clone does not exist: ${file}`);
    }
  }
}

// Check if a directory exists
export async function directoryExists(dirPath: string): Promise<boolean> {
  try {
    await fs.access(dirPath);
    return true;
  } catch {
    return false;
  }
}
