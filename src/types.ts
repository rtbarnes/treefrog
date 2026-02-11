export interface TreefrogConfig {
  shareFiles?: string[];
  cloneFiles?: string[];
  commands?: string[];
}

export interface TreefrogGlobalConfig {
  version: 1;
  projects: Record<string, TreefrogConfig>;
}

export interface CreateArgs {
  branchName: string;
  shell?: boolean;
  current?: boolean;
}

export interface RemoveArgs {
  branchName: string;
}

export interface SpotlightArgs {
  branchName: string;
}

export interface EnterArgs {
  branchName: string;
}

export class NotInGitRepoError extends Error {
  constructor(message = "Not in a git repository") {
    super(message);
    this.name = "NotInGitRepoError";
  }
}

export class NotInWorktreeError extends Error {
  constructor(message = "Not in a treefrog worktree directory") {
    super(message);
    this.name = "NotInWorktreeError";
  }
}

export class WorktreeExistsError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "WorktreeExistsError";
  }
}

export class FileNotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "FileNotFoundError";
  }
}
