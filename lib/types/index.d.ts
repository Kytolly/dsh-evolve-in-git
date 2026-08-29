/**
 * Git-backed memory and evolution runtime for DeepSeek Harness.
 *
 * This module is the DSH adapter: it owns Cordis service registration, tool
 * definitions, the /evolve command, the system prompt, and the config route.
 * All memory/Git/skill behavior lives in the framework-free MemoryCore
 * (src/core.ts); this service only maps host surfaces onto it.
 * @module dsh-evolve-in-git
 */
import { Context, Service } from '@deepseek-ai/cordis';
import z from '@deepseek-ai/schemastery';
import type { UpdatePatch } from './update.js';
import type { BranchesView, CommittedArtifact, Config, EvolutionSuggestion, GitStatus, HelpView, MemoryRecord, MemoryRecordInput, RememberView, ResolvedConfig, SkillDraft, SkillDraftInput, StatusView } from './types.js';
export declare const name = "dsh-evolve-in-git";
export declare const inject: string[];
export type * from './types.js';
export { GitEvolutionError, checkoutBranch, connectRepository, createBranch, currentBranch, ensureGitRepository, fetchRemote, gitStatus, pushBranch, } from './git.js';
export { parseEvolveCommand, renderBranchesText, renderHelpText, renderHelpView, renderRememberText, renderStatusText, userFacingError, } from './harness.js';
export { branchNameForRecord, draftSkillFromRecord, memoryPreview, renderSkillDraft, sanitizeSegment, shouldOfferSkillPromotion, slugify, suggestEvolution } from './strategy.js';
declare module '@deepseek-ai/cordis' {
    interface Context {
        evolveGit: GitEvolutionService;
    }
}
/**
 * Runtime service for Git-backed memory, branch evolution, Harness tools, and a human command.
 */
export declare class GitEvolutionService extends Service {
    static inject: string[];
    static Config: z<Schemastery.ObjectS<{
        repoPath: z<string, string>;
        repoUrl: z<string, string>;
        auth: z<Schemastery.ObjectS<{
            mode: z<"ssh" | "token", "ssh" | "token">;
            sshCommand: z<string, string>;
            tokenEnv: z<string, string>;
            token: z<string, string>;
            username: z<string, string>;
        }>, Schemastery.ObjectT<{
            mode: z<"ssh" | "token", "ssh" | "token">;
            sshCommand: z<string, string>;
            tokenEnv: z<string, string>;
            token: z<string, string>;
            username: z<string, string>;
        }>>;
        memoryRoot: z<string, string>;
        skillsRoot: z<string, string>;
        defaultBranch: z<string, string>;
        remoteName: z<string, string>;
        autoCommit: z<boolean, boolean>;
        archiveRoot: z<string, string>;
        recallTopK: z<number, number>;
        recallMinScore: z<number, number>;
        recallMaxChars: z<number, number>;
        digestEnabled: z<boolean, boolean>;
        digestMaxRecords: z<number, number>;
        digestMaxChars: z<number, number>;
        privacyMode: z<"block" | "redact" | "ask", "block" | "redact" | "ask">;
    }>, Schemastery.ObjectT<{
        repoPath: z<string, string>;
        repoUrl: z<string, string>;
        auth: z<Schemastery.ObjectS<{
            mode: z<"ssh" | "token", "ssh" | "token">;
            sshCommand: z<string, string>;
            tokenEnv: z<string, string>;
            token: z<string, string>;
            username: z<string, string>;
        }>, Schemastery.ObjectT<{
            mode: z<"ssh" | "token", "ssh" | "token">;
            sshCommand: z<string, string>;
            tokenEnv: z<string, string>;
            token: z<string, string>;
            username: z<string, string>;
        }>>;
        memoryRoot: z<string, string>;
        skillsRoot: z<string, string>;
        defaultBranch: z<string, string>;
        remoteName: z<string, string>;
        autoCommit: z<boolean, boolean>;
        archiveRoot: z<string, string>;
        recallTopK: z<number, number>;
        recallMinScore: z<number, number>;
        recallMaxChars: z<number, number>;
        digestEnabled: z<boolean, boolean>;
        digestMaxRecords: z<number, number>;
        digestMaxChars: z<number, number>;
        privacyMode: z<"block" | "redact" | "ask", "block" | "redact" | "ask">;
    }>>;
    private readonly core;
    get config(): ResolvedConfig;
    constructor(ctx: Context, config: Config);
    /** Recompute the core config from the config file over the Cordis base (the config file is the single user layer). */
    private refreshConfig;
    /** Register the repo's enabled/ skills directory as a DSH skill provider. */
    private registerSkillProvider;
    private registerTools;
    /**
     * Register the config-file routes ('/api/evolve-git/config') backing the
     * browser config-file editor. The web server service is optional (headless
     * profiles never mount one), so registration waits for it via
     * 'internal/service'; writes reload the runtime config immediately.
     */
    private registerConfigRoute;
    status(): Promise<GitStatus>;
    statusView(): Promise<StatusView>;
    branches(): Promise<string[]>;
    branchesView(): Promise<BranchesView>;
    record(record: MemoryRecordInput): Promise<CommittedArtifact & MemoryRecord>;
    rememberView(record: MemoryRecordInput): Promise<RememberView>;
    updateView(id: string, patch: UpdatePatch): Promise<RememberView>;
    draftSkill(record: MemoryRecordInput): Promise<SkillDraft>;
    suggest(record: MemoryRecordInput): Promise<EvolutionSuggestion>;
    saveSkillDraft(draft: SkillDraftInput): Promise<CommittedArtifact & SkillDraft>;
    createBranch(branch: string, from?: string): Promise<void>;
    checkout(branch: string): Promise<void>;
    fetch(): Promise<void>;
    push(branch?: string): Promise<void>;
    connect(): Promise<GitStatus>;
    connectView(): Promise<StatusView>;
    helpView(): Promise<HelpView>;
    private runCommand;
    private runConfigCommand;
    private runSkillCommand;
    private runRollbackCommand;
    private runConflictsCommand;
    private runResolveCommand;
    private runTimelineCommand;
    private runSearchCommand;
    private runUpdateCommand;
    private runForgetCommand;
    private runRestoreCommand;
    private runBranchCommand;
}
export default GitEvolutionService;
