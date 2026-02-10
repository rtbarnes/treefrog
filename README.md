# treefrog

A simple tool for managing AI agent coding sessions with git worktrees.

## Demo

![treefrog demo](treefrog-demo.gif)

## Installation

### Option 1: Download Prebuilt Binary (Recommended)

Download the appropriate binary for your platform from the releases page and make it executable:

```bash
# macOS ARM64 (Apple Silicon)
curl -L -o treefrog https://github.com/your-username/treefrog/releases/latest/download/treefrog-macos-arm64
chmod +x treefrog
sudo mv treefrog /usr/local/bin/

# macOS x64 (Intel)
curl -L -o treefrog https://github.com/your-username/treefrog/releases/latest/download/treefrog-macos-x64
chmod +x treefrog
sudo mv treefrog /usr/local/bin/

# Linux x64
curl -L -o treefrog https://github.com/your-username/treefrog/releases/latest/download/treefrog-linux-x64
chmod +x treefrog
sudo mv treefrog /usr/local/bin/

# Linux ARM64
curl -L -o treefrog https://github.com/your-username/treefrog/releases/latest/download/treefrog-linux-arm64
chmod +x treefrog
sudo mv treefrog /usr/local/bin/

# Windows x64
# Download treefrog-windows-x64.exe and add to your PATH
```

### Option 2: Build from Source

If you have [Bun](https://bun.sh) installed:

```bash
git clone https://github.com/your-username/treefrog.git
cd treefrog
bun install
bun run build
sudo cp treefrog /usr/local/bin/treefrog
```

### Option 3: Run with Bun

You can run the CLI directly with bun if it's installed:

```bash
bun run src/index.ts
```

## Usage

```bash
# Create new agent worktree (uses .treefrog config for file sharing/cloning)
treefrog create implement-user-auth

# Create a worktree and open an interactive shell there
treefrog create implement-user-auth --shell

# Open a shell in an existing worktree
treefrog enter implement-user-auth

# Spotlight a worktree branch: remove worktree and checkout branch in main repo
treefrog spotlight implement-user-auth

# List active agent worktrees
treefrog list

# Remove current agent worktree (run from agent directory)
treefrog remove
```

## Shell Completions

treefrog includes shell autocomplete support for branch names and commands. Set up completions for your shell:

### zsh

```bash
# One-time setup
source <(treefrog complete zsh)

# Permanent setup
treefrog complete zsh > ~/.treefrog-completion.zsh
echo 'source ~/.treefrog-completion.zsh' >> ~/.zshrc
```

### bash

```bash
# One-time setup
source <(treefrog complete bash)

# Permanent setup
treefrog complete bash > ~/.treefrog-completion.bash
echo 'source ~/.treefrog-completion.bash' >> ~/.bashrc
```

### fish

```bash
treefrog complete fish > ~/.config/fish/completions/treefrog.fish
```

### PowerShell

```powershell
treefrog complete powershell > ~/.treefrog-completion.ps1
echo '. ~/.treefrog-completion.ps1' >> $PROFILE
```

After setup, branch names will autocomplete when typing `treefrog create <TAB>`, `treefrog enter <TAB>`, `treefrog remove <TAB>`, or `treefrog spotlight <TAB>`.

## What it does

- Creates isolated git worktree: `../repo-branch-name/`
- Creates new branch with your specified name or uses existing branch
- Automatically shares/clones files based on `.treefrog` config
- Optional `--shell/-s` opens an interactive shell in the new worktree with a muted gray banner line: `[treefrog:<branch>] [Ctrl-D to return]` (including zsh/oh-my-zsh)
- `enter` command opens a shell in an existing treefrog worktree with the same banner
- Spotlight command removes worktree and checks out branch in main repo
- Preserves branches when removing worktrees

Each agent gets its own directory and branch, solving the problem of multiple AI agents working in parallel on the same repository.

## Building

This project uses [Bun](https://bun.sh) to create standalone executables that bundle the entire runtime and dependencies into a single file. No installation of Bun, Node.js, or any dependencies is required to run the compiled executables.

### Prerequisites

- [Bun](https://bun.sh) v1.2.16 or later
- TypeScript (peer dependency)

### Build Commands

```bash
# Install dependencies
bun install

# Build for current platform (creates ./treefrog)
bun run build

# Build for all supported platforms
bun run build:all

# Build for specific platforms
bun run build:macos    # macOS ARM64 + x64
bun run build:linux    # Linux x64 + ARM64
bun run build:windows  # Windows x64
```

### Build Output

- **Local builds**: `treefrog` (current platform executable)
- **Cross-platform builds**: `dist/treefrog-{platform}-{arch}`
  - `dist/treefrog-macos-arm64`
  - `dist/treefrog-macos-x64`
  - `dist/treefrog-linux-x64`
  - `dist/treefrog-linux-arm64`
  - `dist/treefrog-windows-x64.exe`

### Build Features

- **Self-contained**: Includes Bun runtime and all dependencies
- **Optimized**: Minified bundle with ~13.55 KB size reduction
- **Debuggable**: Embedded sourcemaps for error tracing
- **Fast startup**: Pre-bundled for quick execution
- **Cross-platform**: Single build process for all supported platforms

### Supported Platforms

| Platform | Architecture          | Status |
| -------- | --------------------- | ------ |
| macOS    | ARM64 (Apple Silicon) | ✅     |
| macOS    | x64 (Intel)           | ✅     |
| Linux    | x64                   | ✅     |
| Linux    | ARM64                 | ✅     |
| Windows  | x64                   | ✅     |

### Development

```bash
# Run directly with Bun (development)
bun run src/index.ts --help

# Run tests (if available)
bun test

# Type checking
bun run tsc --noEmit
```

## Configuration

You can create a `.treefrog` file in your repository root to configure default file sharing and run commands automatically when creating new worktrees.

### .treefrog file format

The `.treefrog` file supports configuration directives and command sections:

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

- `share = file1,file2,...` - Files to symlink from main repo
- `clone = file1,file2,...` - Files to copy from main repo
- `[commands]` section - Bash commands to execute after worktree creation

Both `share` and `clone` directives are applied when creating a worktree. Commands in `[commands]` section always execute after file operations.

Comments (lines starting with `#`) and empty lines are ignored throughout the file.
