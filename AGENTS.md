# Treefrog Architecture

## Overview

CLI tool for managing git worktrees for parallel AI agent coding sessions. Creates isolated worktrees with configurable file sharing/cloning and post-creation commands.

## Development

- You have access to `bun type`, `bun lint`, and `bun fmt` commands -- make sure to run them after making changes.

## Architecture

### Entry Points

- `src/index.ts` - Main CLI entry, routes commands, handles errors
- `src/cli.ts` - Parses CLI arguments into typed command structures

### Commands (`src/commands/`)

- `create.ts` - Creates new worktree, applies config, executes commands
- `cleanup.ts` - Removes worktree (by branch or current directory)
- `list.ts` - Lists active treefrog worktrees
- `spotlight.ts` - Removes worktree and checks out branch in main repo

### Services (`src/services/`)

**git.ts** - Git operations

- `ensureGitRepository()` - Validates git repo
- `getMainRepoDir()` - Gets main repo root
- `createWorktree()` - Creates git worktree
- `removeWorktree()` - Removes worktree
- `findWorktreeByBranch()` - Locates worktree by branch name
- `isTreefrogWorktree()` - Detects treefrog worktree pattern

**fs.ts** - File operations

- `createSymlinks()` - Creates symlinks for shared files
- `copyFiles()` - Copies files/directories
- `directoryExists()` - Checks directory existence

**config.ts** - Configuration parsing

- `parseTreefrogConfig()` - Parses `.treefrog` file (share/clone directives, commands section)
- `executeTreefrogConfig()` - Executes post-creation commands

**ui.ts** - Output utilities

- `printError()`, `printSuccess()`, `printInfo()` - Colored console output
- `printUsage()` - CLI usage help

### Types (`src/types.ts`)

- `TreefrogConfig` - Configuration structure
- Command args interfaces (`CreateArgs`, `CleanupArgs`, `SpotlightArgs`)
- Custom errors (`NotInGitRepoError`, `NotInWorktreeError`, `WorktreeExistsError`, `FileNotFoundError`)

## Patterns

- Functional style: pure functions, minimal state
- Error handling: custom error classes with typed error handling in main
- Worktree detection: pattern matching on `repo-name-branch-name` directory structure
- Configuration: `.treefrog` file with `share=`, `clone=`, and `[commands]` sections
