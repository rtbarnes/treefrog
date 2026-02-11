# treefrog

Run multiple AI coding agents in parallel on the same repo—each in its own isolated git worktree with shared config and dependencies.

![treefrog demo](treefrog-demo.gif)

## Why?

AI agents (Cursor, Copilot, Claude Code, etc.) work best with full repo access, but they can't share a working directory. Treefrog solves this by creating isolated worktrees where each agent gets its own branch and directory while sharing files you specify (`.env`, `node_modules`, etc.).

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

# Checkout a worktree branch: remove worktree and checkout branch in main repo
treefrog checkout implement-user-auth

# List active agent worktrees
treefrog list

# Remove worktree directory (but keep branch as it is!)
treefrog remove implement-user-auth
```

## Shell Completions

```bash
# zsh
treefrog complete zsh > ~/.treefrog-completion.zsh
echo 'source ~/.treefrog-completion.zsh' >> ~/.zshrc

# bash
treefrog complete bash > ~/.treefrog-completion.bash
echo 'source ~/.treefrog-completion.bash' >> ~/.bashrc

# fish
treefrog complete fish > ~/.config/fish/completions/treefrog.fish
```

## Building from Source

Requires [Bun](https://bun.sh) v1.2.16+.

```bash
bun install
bun run build          # current platform
bun run build:all      # all platforms (macOS/Linux/Windows, x64/ARM64)
```

Output: `./treefrog` (local) or `dist/treefrog-{platform}-{arch}` (cross-platform).

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
