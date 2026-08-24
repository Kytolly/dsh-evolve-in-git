/**
 * Git-backed memory and evolution runtime for DeepSeek Harness.
 * @module dsh-evolve-in-git
 */
import { Context, Service } from '@deepseek-ai/cordis';
import z from '@deepseek-ai/schemastery';
import type { BranchesView, CommittedArtifact, EvolutionSuggestion, GitAuthConfig, GitStatus, HelpView, MemoryRecord, MemoryRecordInput, RememberView, ResolvedConfig, SkillDraft, SkillDraftInput, StatusView } from './types.js';
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
export interface Config {
    repoPath?: string;
    repoUrl?: string;
    auth?: GitAuthConfig;
    memoryRoot?: string;
    skillsRoot?: string;
    defaultBranch?: string;
    remoteName?: string;
    autoCommit?: boolean;
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
    }>>;
    config: ResolvedConfig;
    private readonly baseConfig;
    constructor(ctx: Context, config: Config);
    /** Recompute this.config from the config file over the Cordis base (the config file is the single user layer). */
    private refreshConfig;
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
}
export default GitEvolutionService;
