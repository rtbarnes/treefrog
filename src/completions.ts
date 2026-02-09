import t from '@bomb.sh/tab';
import { execSync } from 'child_process';

function getLocalBranches(): string[] {
  try {
    const output = execSync('git branch --format="%(refname:short)"', {
      encoding: 'utf-8',
    });
    return output.trim().split('\n').filter(Boolean);
  } catch {
    return [];
  }
}

function getWorktreeBranches(): string[] {
  try {
    const output = execSync('git worktree list --porcelain', {
      encoding: 'utf-8',
    });
    const branches: string[] = [];
    const lines = output.split('\n');
    for (const line of lines) {
      if (line.startsWith('branch refs/heads/')) {
        branches.push(line.substring(18));
      }
    }
    return branches;
  } catch {
    return [];
  }
}

const createCmd = t.command('create', 'Create new agent worktree');
createCmd.argument('branch-name', (complete) => {
  for (const branch of getLocalBranches()) {
    complete(branch, '');
  }
});

const cleanupCmd = t.command('cleanup', 'Clean up agent worktree');
cleanupCmd.argument('branch-name', (complete) => {
  for (const branch of getWorktreeBranches()) {
    complete(branch, 'active worktree');
  }
});

const spotlightCmd = t.command(
  'spotlight',
  'Remove worktree and checkout branch in main repo'
);
spotlightCmd.argument('branch-name', (complete) => {
  for (const branch of getWorktreeBranches()) {
    complete(branch, 'active worktree');
  }
});

t.command('list', 'List active agent worktrees');

function resolveExecutable(): string {
  const script = process.argv[1] ?? '';
  if (script.endsWith('.ts') || script.endsWith('.js')) {
    return `${process.argv[0]} ${script}`;
  }
  // Compiled binary — process.execPath is the real path
  return process.execPath;
}

export function handleCompletion(): boolean {
  const args = process.argv.slice(2);
  if (args[0] !== 'complete') {
    return false;
  }

  const shell = args[1];
  if (shell === '--') {
    t.parse(args.slice(2));
  } else if (shell) {
    t.setup('treefrog', resolveExecutable(), shell);
  }
  return true;
}
