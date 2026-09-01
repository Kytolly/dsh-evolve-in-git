import { type ConfigFile } from './config.js';
import type { BranchDiffResult, ConflictStrategy, RevertResult } from './git.js';
import type { MemoryMeta, RecallBudget, RecallFilter, RecallHit } from './memory.js';
import { type ExportOptions } from './privacy.js';
import type { UpdatePatch } from './update.js';
import type { ForgetResult, RestoreResult } from './forget.js';
import type { DemotedSkill, MountedSkill, PromotedSkill, SkillDraftSummary } from './skill.js';
import type { CommittedArtifact, Config, EvolutionSuggestion, GitStatus, MemoryRecord, MemoryRecordInput, ResolvedConfig, SkillDraft, SkillDraftInput } from './types.js';
/** A bundled skill materialized or updated in the DSH skills root by syncSkills. */
export interface SyncedSkill {
    name: string;
    targetPath: string;
    action: 'created' | 'updated' | 'skipped';
}
/**
 * The portability boundary for Git-backed long-term memory: every operation the
 * DSH adapter needs, expressed in framework-free terms. Implementations must not
 * import any @deepseek-ai/* package.
 */
export interface MemoryCore {
    readonly config: ResolvedConfig;
    configFilePath(): string;
    readConfigFile(): ConfigFile;
    writeConfigFile(file: ConfigFile): void;
    refreshConfig(): void;
    connect(): string;
    status(repoPath?: string): GitStatus;
    branches(repoPath?: string): string[];
    currentBranch(repoPath?: string): string;
    remember(record: MemoryRecordInput): CommittedArtifact & MemoryRecord;
    timeline(): MemoryMeta[];
    recall(filter: RecallFilter, budget?: RecallBudget): RecallHit[];
    update(id: string, patch?: UpdatePatch): CommittedArtifact & MemoryRecord;
    forget(id: string): ForgetResult;
    restore(id: string): RestoreResult;
    show(id: string): MemoryMeta | undefined;
    export(options?: ExportOptions): string;
    digest(): string;
    listSkillDrafts(): SkillDraftSummary[];
    listEnabledSkills(): SkillDraftSummary[];
    promoteSkillDraft(name: string): PromotedSkill;
    demoteSkillDraft(name: string): DemotedSkill;
    draftSkill(record: MemoryRecordInput): SkillDraft;
    saveSkillDraft(draft: SkillDraftInput): CommittedArtifact & SkillDraft;
    saveSkillDraftFromRecord(record: MemoryRecordInput): CommittedArtifact & SkillDraft;
    suggest(record: MemoryRecordInput): EvolutionSuggestion;
    createBranch(branch: string, from?: string): void;
    checkoutBranch(branch: string): {
        branch: string;
        head: string | undefined;
    };
    fetch(): void;
    push(branch?: string): void;
    rollback(ref: string, dryRun: boolean): RevertResult;
    conflicts(repoPath?: string): string[];
    resolve(path: string, strategy: ConflictStrategy): string;
    branchDiff(a: string, b?: string): BranchDiffResult;
    syncSkills(force: boolean): SyncedSkill[];
    syncedMountedSkills(): MountedSkill[];
}
/**
 * The concrete Git-backed MemoryCore. It resolves configuration from the on-disk
 * config file (over the host-provided base) and delegates each operation to the
 * existing framework-free core modules.
 */
export declare class GitMemoryCore implements MemoryCore {
    private readonly baseConfig;
    config: ResolvedConfig;
    constructor(config: Config);
    configFilePath(): string;
    readConfigFile(): ConfigFile;
    writeConfigFile(file: ConfigFile): void;
    refreshConfig(): void;
    connect(): string;
    status(repoPath?: string): GitStatus;
    branches(repoPath?: string): string[];
    currentBranch(repoPath?: string): string;
    remember(record: MemoryRecordInput): CommittedArtifact & MemoryRecord;
    timeline(): MemoryMeta[];
    recall(filter: RecallFilter, budget?: RecallBudget): RecallHit[];
    update(id: string, patch?: UpdatePatch): CommittedArtifact & MemoryRecord;
    forget(id: string): ForgetResult;
    restore(id: string): RestoreResult;
    show(id: string): MemoryMeta | undefined;
    export(options?: ExportOptions): string;
    digest(): string;
    listSkillDrafts(): SkillDraftSummary[];
    listEnabledSkills(): SkillDraftSummary[];
    promoteSkillDraft(name: string): PromotedSkill;
    demoteSkillDraft(name: string): DemotedSkill;
    draftSkill(record: MemoryRecordInput): SkillDraft;
    saveSkillDraft(draft: SkillDraftInput): CommittedArtifact & SkillDraft;
    saveSkillDraftFromRecord(record: MemoryRecordInput): CommittedArtifact & SkillDraft;
    suggest(record: MemoryRecordInput): EvolutionSuggestion;
    createBranch(branch: string, from?: string): void;
    checkoutBranch(branch: string): {
        branch: string;
        head: string | undefined;
    };
    fetch(): void;
    push(branch?: string): void;
    rollback(ref: string, dryRun: boolean): RevertResult;
    conflicts(repoPath?: string): string[];
    resolve(path: string, strategy: ConflictStrategy): string;
    branchDiff(a: string, b?: string): BranchDiffResult;
    syncSkills(force: boolean): SyncedSkill[];
    syncedMountedSkills(): MountedSkill[];
}
