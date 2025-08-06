# ribbit

A simple tool for managing AI agent coding sessions with git worktrees.

## Demo

![ribbit demo](ribbit-demo.gif)

## Installation

Copy the script to your PATH:

```bash
sudo cp ribbit /usr/local/bin/ribbit
```

Or add this directory to your PATH in your shell profile:

```bash
export PATH="$PATH:/path/to/this/directory"
```

## Usage

```bash
# Create new agent worktree with shared files (symlinked)
ribbit implement-user-auth --share .env,.env.local

# Create agent worktree with copied files (independent)
ribbit fix-login-bug --clone .env,.env.local

# Create agent worktree without shared files
ribbit fix-login-bug

# Share additional files in existing worktree (run from agent directory)
ribbit share .env.production,config/database.yml

# Copy additional files to existing worktree (run from agent directory)
ribbit clone secrets.json

# List active agent worktrees
ribbit list

# Clean up current agent worktree (run from agent directory)
ribbit cleanup
```

## What it does

- Creates isolated git worktree: `../repo-branch-name/`
- Creates new branch with your specified name or uses existing branch
- Symlinks shared files from main repo
- Drops you in the worktree ready for your AI agent
- Allows adding more shared/copied files after worktree creation
- Preserves branches when cleaning up worktrees

Each agent gets its own directory and branch, solving the problem of multiple AI agents working in parallel on the same repository.

## Configuration

You can create a `.ribbit` file in your repository root to configure default file sharing and run commands automatically when creating new worktrees.

### .ribbit file format

The `.ribbit` file supports configuration directives and command sections:

```bash
# Configuration section (at the top)
share = .env,.env.local,package.json
clone = secrets.json,config/database.yml

# Commands section
[commands]
# Install dependencies
npm install

# Set up environment
echo "Setting up development environment..."
cp .env.example .env.local

# Start development server in background
npm run dev &
```

### Configuration Options

- `share = file1,file2,...` - Files to symlink from main repo (CLI `--share` takes precedence)
- `clone = file1,file2,...` - Files to copy from main repo (CLI `--clone` takes precedence)
- `[commands]` section - Bash commands to execute after worktree creation

### Precedence

1. CLI options (`--share`, `--clone`) override config file settings
2. If no CLI options provided, config file settings are used
3. Commands in `[commands]` section always execute after file operations

Comments (lines starting with `#`) and empty lines are ignored throughout the file.