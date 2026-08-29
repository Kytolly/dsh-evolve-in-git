import type { CommittedArtifact, GitAuthConfig, GitStatus, MemoryRecord, MemoryRecordInput, MemoryStatus, ResolvedConfig, SkillDraft, SkillDraftInput } from './types.js';
export declare class GitEvolutionError extends Error {
    code: string;
    constructor(message: string, code: string, cause?: unknown);
}
export declare function ensureGitRepository(repoPath: string): string;
export declare function remoteUrl(repoPath: string, remote: string): string;
export declare function ensureRemoteMatches(repoPath: string, remote: string, repoUrl: string): string;
export declare function verifyRemoteAccess(repoPath: string, remote: string, repoUrl: string, auth: GitAuthConfig): void;
export declare function openRepository(config: ResolvedConfig): string;
export declare function currentBranch(repoPath: string): string;
export declare function currentHead(repoPath: string): string | undefined;
export declare function listBranches(repoPath: string): string[];
export declare function checkoutBranch(repoPath: string, branch: string, from?: string): void;
export declare function createBranch(repoPath: string, branch: string, from?: string): void;
/** Move a path within the repository using git mv (so history and rollback work). */
export declare function gitMove(repoPath: string, from: string, to: string): void;
/** Stage a path in the repository index (needed before git mv can move it). */
export declare function gitAdd(repoPath: string, path: string): void;
export declare function pushBranch(repoPath: string, branch: string, remote: string, auth?: GitAuthConfig, repoUrl?: string): void;
export declare function fetchRemote(repoPath: string, remote: string, auth?: GitAuthConfig, repoUrl?: string): void;
export declare function connectRepository(config: ResolvedConfig): string;
export declare function gitStatus(repoPath: string): GitStatus;
export declare function frontmatter(lines: Record<string, string | readonly string[] | undefined>): string;
export declare function commitPaths(repoPath: string, paths: readonly string[], message: string): string | undefined;
export interface MemoryWriteOverrides {
    id?: string;
    status?: MemoryStatus;
    supersedes?: string;
    updatedAt?: string;
}
export declare function writeMemoryRecord(config: ResolvedConfig, input: MemoryRecordInput, overrides?: MemoryWriteOverrides): CommittedArtifact & MemoryRecord;
export declare function writeSkillDraft(config: ResolvedConfig, draft: SkillDraftInput): CommittedArtifact & SkillDraft;
/**
 * List the working-tree paths git currently reports as unmerged (a conflict from
 * a merge/rebase/cherry-pick in progress on the memory repository).
 */
export declare function listConflicts(repoPath: string): string[];
export interface RevertResult {
    dryRun: boolean;
    reverted: boolean;
    commit: string | undefined;
    wouldChange: string[];
}
/**
 * Roll back one memory/skill commit by reverting it. Only commits whose changes
 * are entirely inside the memory and skills roots are accepted; anything else is
 * rejected so the revert can never touch unrelated repo files. In dry-run mode
 * nothing is written and the files that would change are returned.
 */
export declare function revertCommit(config: ResolvedConfig, ref: string, dryRun: boolean): RevertResult;
export type ConflictStrategy = 'ours' | 'theirs' | 'both';
/**
 * Resolve one unresolved conflict by taking a side. 'ours'/'theirs' set the path
 * to that side; 'both' combines both sides in the working tree (which may still
 * contain merge markers if the sides cannot be reconciled). The path is then
 * staged, removing it from the conflict set.
 * @returns the resolved path.
 */
export declare function resolveConflict(repoPath: string, path: string, strategy: ConflictStrategy): string;
export interface BranchDiffResult {
    refA: string;
    refB: string;
    stat: string;
    files: string[];
}
/**
 * Diff the working tree (or two branch/commit refs) in the memory repository.
 * Returns the stat line plus the changed file list so the agent can compare
 * memory/skill changes across branches.
 */
export declare function branchDiff(repoPath: string, a: string, b?: string): BranchDiffResult;
