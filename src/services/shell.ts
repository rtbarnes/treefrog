import { spawn } from "child_process";
import { printInfo } from "./ui.js";

function getShellCommand(): string {
  if (process.platform === "win32") {
    return process.env.COMSPEC || "cmd.exe";
  }
  return process.env.SHELL || "/bin/sh";
}

export async function startInteractiveShell(cwd: string): Promise<void> {
  if (!process.stdin.isTTY || !process.stdout.isTTY) {
    printInfo("Skipping shell launch because no interactive terminal is attached.");
    return;
  }

  const shellCommand = getShellCommand();
  printInfo(`Starting interactive shell in: ${cwd}`);
  printInfo("Exit the shell to return to your previous session.");

  await new Promise<void>((resolve, reject) => {
    const shell = spawn(shellCommand, [], {
      cwd,
      stdio: "inherit",
    });

    shell.on("error", (error) => {
      reject(new Error(`Failed to launch shell '${shellCommand}': ${error.message}`));
    });

    shell.on("exit", () => {
      resolve();
    });
  });
}
