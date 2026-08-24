import type { CommittedArtifact, GitAuthConfig, GitStatus, MemoryRecord, MemoryRecordInput, ResolvedConfig, SkillDraft, SkillDraftInput } from './types.js';
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
export declare function pushBranch(repoPath: string, branch: string, remote: string, auth?: GitAuthConfig, repoUrl?: string): void;
export declare function fetchRemote(repoPath: string, remote: string, auth?: GitAuthConfig, repoUrl?: string): void;
export declare function connectRepository(config: ResolvedConfig): string;
export declare function gitStatus(repoPath: string): GitStatus;
export declare function writeMemoryRecord(config: ResolvedConfig, input: MemoryRecordInput): CommittedArtifact & MemoryRecord;
export declare function writeSkillDraft(config: ResolvedConfig, draft: SkillDraftInput): CommittedArtifact & SkillDraft;
