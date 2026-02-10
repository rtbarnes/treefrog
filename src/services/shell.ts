import { spawn } from "child_process";
import fs from "fs/promises";
import os from "os";
import path from "path";
import { printInfo } from "./ui.js";

const SHELL_EXIT_HINT = "[Ctrl-D to return]";

function getShellCommand(): string {
  if (process.platform === "win32") {
    return process.env.COMSPEC || "cmd.exe";
  }
  return process.env.SHELL || "/bin/sh";
}

interface StartInteractiveShellOptions {
  cwd: string;
  promptContext?: string;
}

interface ShellLaunchConfig {
  args: string[];
  cleanup?: () => Promise<void>;
  env: NodeJS.ProcessEnv;
}

function buildPromptPrefix(promptContext?: string): string {
  const normalizedContext = promptContext
    ? promptContext.replace(/[^A-Za-z0-9._/-]/g, "_")
    : undefined;
  return normalizedContext ? `[treefrog:${normalizedContext}]` : "[treefrog]";
}

function buildPromptBanner(promptPrefix: string): string {
  return `${promptPrefix} ${SHELL_EXIT_HINT}`;
}

function buildShellEnv(promptPrefix: string): NodeJS.ProcessEnv {
  const promptBanner = buildPromptBanner(promptPrefix);
  const env: NodeJS.ProcessEnv = {
    ...process.env,
    TREEFROG_SUBSHELL: "1",
    TREEFROG_PROMPT_PREFIX: promptPrefix,
    TREEFROG_PROMPT_HINT: SHELL_EXIT_HINT,
    TREEFROG_PROMPT_BANNER: promptBanner,
  };

  if (process.platform === "win32") {
    const basePrompt = process.env.PROMPT || "$P$G";
    env.PROMPT = `${promptBanner}$_${basePrompt}`;
    return env;
  }

  const basePrompt = process.env.PS1 || process.env.PROMPT || "\\w \\$ ";
  const grayBanner = `\\[\\e[90m\\]${promptBanner}\\[\\e[0m\\]`;
  env.PS1 = `${grayBanner}\\n${basePrompt}`;
  env.PROMPT = env.PS1;
  return env;
}

async function createZshLaunchConfig(env: NodeJS.ProcessEnv): Promise<ShellLaunchConfig> {
  const originalZdotdir = process.env.ZDOTDIR || process.env.HOME;
  const tempZdotdir = await fs.mkdtemp(path.join(os.tmpdir(), "treefrog-zdotdir-"));
  const zshRcPath = path.join(tempZdotdir, ".zshrc");

  const rcScript = [
    'if [[ -n "${TREEFROG_ORIGINAL_ZDOTDIR:-}" && -f "${TREEFROG_ORIGINAL_ZDOTDIR}/.zshrc" ]]; then',
    '  source "${TREEFROG_ORIGINAL_ZDOTDIR}/.zshrc"',
    'elif [[ -f "${HOME}/.zshrc" ]]; then',
    '  source "${HOME}/.zshrc"',
    "fi",
    "",
    "treefrog_apply_prompt_prefix() {",
    '  if [[ -z "${TREEFROG_PROMPT_PREFIX:-}" ]]; then',
    "    return",
    "  fi",
    '  local hint="${TREEFROG_PROMPT_HINT:-[Ctrl-D to return]}"',
    '  local banner="%F{8}${TREEFROG_PROMPT_PREFIX} ${hint}%f"',
    '  local prompt_body="${PROMPT}"',
    "  if [[ \"${prompt_body}\" == *$'\\n'* ]]; then",
    "    local first_line=\"${prompt_body%%$'\\n'*}\"",
    '    if [[ "${first_line}" == *"${TREEFROG_PROMPT_PREFIX}"* && "${first_line}" == *"${hint}"* ]]; then',
    "      prompt_body=\"${prompt_body#*$'\\n'}\"",
    "    fi",
    "  fi",
    '  PROMPT="${banner}"$\'\\n\'"${prompt_body}"',
    "}",
    "",
    "autoload -U add-zsh-hook",
    "add-zsh-hook precmd treefrog_apply_prompt_prefix",
    "treefrog_apply_prompt_prefix",
    "",
  ].join("\n");

  await fs.writeFile(zshRcPath, rcScript, "utf-8");

  return {
    args: ["-i"],
    env: {
      ...env,
      ZDOTDIR: tempZdotdir,
      TREEFROG_ORIGINAL_ZDOTDIR: originalZdotdir,
    },
    cleanup: async () => {
      await fs.rm(tempZdotdir, { recursive: true, force: true });
    },
  };
}

async function buildShellLaunchConfig(
  shellCommand: string,
  env: NodeJS.ProcessEnv,
): Promise<ShellLaunchConfig> {
  const shellName = path.basename(shellCommand).toLowerCase();

  if (shellName === "zsh") {
    return createZshLaunchConfig(env);
  }

  return {
    args: [],
    env,
  };
}

export async function startInteractiveShell(options: StartInteractiveShellOptions): Promise<void> {
  if (!process.stdin.isTTY || !process.stdout.isTTY) {
    printInfo("Skipping shell launch because no interactive terminal is attached.");
    return;
  }

  const promptPrefix = buildPromptPrefix(options.promptContext);
  const shellCommand = getShellCommand();
  const launchConfig = await buildShellLaunchConfig(shellCommand, buildShellEnv(promptPrefix));
  printInfo(`Starting interactive shell in: ${options.cwd}`);
  printInfo(`Prompt prefix: ${promptPrefix}`);
  printInfo("Exit the shell to return to your previous session.");

  try {
    await new Promise<void>((resolve, reject) => {
      const shell = spawn(shellCommand, launchConfig.args, {
        cwd: options.cwd,
        env: launchConfig.env,
        stdio: "inherit",
      });

      shell.on("error", (error) => {
        reject(new Error(`Failed to launch shell '${shellCommand}': ${error.message}`));
      });

      shell.on("exit", () => {
        resolve();
      });
    });
  } finally {
    if (launchConfig.cleanup) {
      await launchConfig.cleanup();
    }
  }
}
