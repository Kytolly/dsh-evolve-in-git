/**
 * Framework-free memory core for dsh-evolve-in-git.
 *
 * This module is the plugin's portability boundary: it depends only on Node
 * built-ins and the sibling core modules (git/memory/skill/strategy/config/
 * defaults/types), never on DeepSeek Harness or Cordis. The DSH adapter
 * (src/index.ts) is a thin shell that maps host tools/commands onto this core.
 * @module dsh-evolve-in-git/core
 */
import { homedir } from 'node:os'
import { join } from 'node:path'
import {
  DEFAULT_ARCHIVE_ROOT,
  DEFAULT_AUTH,
  DEFAULT_BRANCH,
  DEFAULT_DIGEST_ENABLED,
  DEFAULT_DIGEST_MAX_CHARS,
  DEFAULT_DIGEST_MAX_RECORDS,
  DEFAULT_MEMORY_ROOT,
  DEFAULT_PRIVACY_MODE,
  DEFAULT_RECALL_MAX_CHARS,
  DEFAULT_RECALL_MIN_SCORE,
  DEFAULT_RECALL_TOP_K,
  DEFAULT_REMOTE,
  DEFAULT_REPO_PATH,
  DEFAULT_REPO_URL,
  DEFAULT_SKILLS_ROOT,
} from './defaults.js'
import { configFilePath, mergeConfig, readConfigFile, writeConfigFile, type ConfigFile } from './config.js'
import {
  branchDiff as gitBranchDiff,
  checkoutBranch as gitCheckoutBranch,
  connectRepository,
  createBranch as gitCreateBranch,
  currentBranch as gitCurrentBranch,
  currentHead as gitCurrentHead,
  fetchRemote,
  gitStatus,
  listBranches as gitListBranches,
  listConflicts as gitListConflicts,
  pushBranch,
  resolveConflict as gitResolveConflict,
  revertCommit,
  writeMemoryRecord,
  writeSkillDraft,
} from './git.js'
import type { BranchDiffResult, ConflictStrategy, RevertResult } from './git.js'
import { memoryTimeline, recall as recallMemory, scanMemory } from './memory.js'
import type { MemoryMeta, RecallBudget, RecallFilter, RecallHit } from './memory.js'
import { filterBySensitivity, findById, renderExport, type ExportOptions } from './privacy.js'
import { updateMemory } from './update.js'
import type { UpdatePatch } from './update.js'
import { forgetMemory, restoreMemory } from './forget.js'
import type { ForgetResult, RestoreResult } from './forget.js'
import { demoteSkillDraft, listEnabledSkills, listSkillDrafts, promoteSkillDraft, syncBundledSkills } from './skill.js'
import type { DemotedSkill, PromotedSkill, SkillDraftSummary } from './skill.js'
import { draftSkillFromRecord, renderSkillDraft, suggestEvolution } from './strategy.js'
import type {
  CommittedArtifact,
  Config,
  EvolutionSuggestion,
  GitStatus,
  MemoryRecord,
  MemoryRecordInput,
  ResolvedConfig,
  SkillDraft,
  SkillDraftInput,
} from './types.js'

/** A bundled skill materialized or updated in the DSH skills root by syncSkills. */
export interface SyncedSkill {
  name: string
  targetPath: string
  action: 'created' | 'updated' | 'skipped'
}

/** Expand a leading '~' in a user-supplied path to the home directory (node:path does not). */
function expandHome(path: string): string {
  if (path === '~') return homedir()
  if (path.startsWith('~/')) return join(homedir(), path.slice(2))
  return path
}

/** Resolve a possibly-partial config into the fully-populated runtime shape. */
function resolveConfig(config: Config): ResolvedConfig {
  return {
    repoPath: expandHome(config.repoPath?.trim() || DEFAULT_REPO_PATH),
    repoUrl: config.repoUrl?.trim() || DEFAULT_REPO_URL,
    auth: config.auth ?? DEFAULT_AUTH,
    memoryRoot: config.memoryRoot?.trim() || DEFAULT_MEMORY_ROOT,
    skillsRoot: config.skillsRoot?.trim() || DEFAULT_SKILLS_ROOT,
    defaultBranch: config.defaultBranch?.trim() || DEFAULT_BRANCH,
    remoteName: config.remoteName?.trim() || DEFAULT_REMOTE,
    autoCommit: config.autoCommit ?? true,
    archiveRoot: config.archiveRoot?.trim() || DEFAULT_ARCHIVE_ROOT,
    recallTopK: config.recallTopK ?? DEFAULT_RECALL_TOP_K,
    recallMinScore: config.recallMinScore ?? DEFAULT_RECALL_MIN_SCORE,
    recallMaxChars: config.recallMaxChars ?? DEFAULT_RECALL_MAX_CHARS,
    digestEnabled: config.digestEnabled ?? DEFAULT_DIGEST_ENABLED,
    digestMaxRecords: config.digestMaxRecords ?? DEFAULT_DIGEST_MAX_RECORDS,
    digestMaxChars: config.digestMaxChars ?? DEFAULT_DIGEST_MAX_CHARS,
    privacyMode: config.privacyMode ?? DEFAULT_PRIVACY_MODE,
  }
}

/**
 * The portability boundary for Git-backed long-term memory: every operation the
 * DSH adapter needs, expressed in framework-free terms. Implementations must not
 * import any @deepseek-ai/* package.
 */
export interface MemoryCore {
  readonly config: ResolvedConfig
  configFilePath(): string
  readConfigFile(): ConfigFile
  writeConfigFile(file: ConfigFile): void
  refreshConfig(): void
  connect(): string
  status(repoPath?: string): GitStatus
  branches(repoPath?: string): string[]
  currentBranch(repoPath?: string): string
  remember(record: MemoryRecordInput): CommittedArtifact & MemoryRecord
  timeline(): MemoryMeta[]
  recall(filter: RecallFilter, budget?: RecallBudget): RecallHit[]
  update(id: string, patch?: UpdatePatch): CommittedArtifact & MemoryRecord
  forget(id: string): ForgetResult
  restore(id: string): RestoreResult
  show(id: string): MemoryMeta | undefined
  export(options?: ExportOptions): string
  digest(): string
  listSkillDrafts(): SkillDraftSummary[]
  listEnabledSkills(): SkillDraftSummary[]
  promoteSkillDraft(name: string): PromotedSkill
  demoteSkillDraft(name: string): DemotedSkill
  draftSkill(record: MemoryRecordInput): SkillDraft
  saveSkillDraft(draft: SkillDraftInput): CommittedArtifact & SkillDraft
  saveSkillDraftFromRecord(record: MemoryRecordInput): CommittedArtifact & SkillDraft
  suggest(record: MemoryRecordInput): EvolutionSuggestion
  createBranch(branch: string, from?: string): void
  checkoutBranch(branch: string): { branch: string; head: string | undefined }
  fetch(): void
  push(branch?: string): void
  rollback(ref: string, dryRun: boolean): RevertResult
  conflicts(repoPath?: string): string[]
  resolve(path: string, strategy: ConflictStrategy): string
  branchDiff(a: string, b?: string): BranchDiffResult
  syncSkills(force: boolean): SyncedSkill[]
}

/**
 * The concrete Git-backed MemoryCore. It resolves configuration from the on-disk
 * config file (over the host-provided base) and delegates each operation to the
 * existing framework-free core modules.
 */
export class GitMemoryCore implements MemoryCore {
  private readonly baseConfig: Config
  config: ResolvedConfig

  constructor(config: Config) {
    this.baseConfig = config
    this.config = resolveConfig(mergeConfig(config, readConfigFile()) as Config)
  }

  configFilePath(): string {
    return configFilePath()
  }

  readConfigFile(): ConfigFile {
    return readConfigFile()
  }

  writeConfigFile(file: ConfigFile): void {
    writeConfigFile(file)
  }

  refreshConfig(): void {
    this.config = resolveConfig(mergeConfig(this.baseConfig, readConfigFile()) as Config)
  }

  connect(): string {
    return connectRepository(this.config)
  }

  status(repoPath?: string): GitStatus {
    return gitStatus(repoPath ?? connectRepository(this.config))
  }

  branches(repoPath?: string): string[] {
    return gitListBranches(repoPath ?? connectRepository(this.config))
  }

  currentBranch(repoPath?: string): string {
    return gitCurrentBranch(repoPath ?? connectRepository(this.config))
  }

  remember(record: MemoryRecordInput): CommittedArtifact & MemoryRecord {
    return writeMemoryRecord(this.config, record)
  }

  timeline(): MemoryMeta[] {
    return memoryTimeline(this.config)
  }

  recall(filter: RecallFilter, budget?: RecallBudget): RecallHit[] {
    return recallMemory(this.config, filter, {
      topK: budget?.topK ?? this.config.recallTopK,
      minScore: budget?.minScore ?? this.config.recallMinScore,
      maxChars: budget?.maxChars ?? this.config.recallMaxChars,
      includeContent: budget?.includeContent ?? true,
    })
  }

  update(id: string, patch?: UpdatePatch): CommittedArtifact & MemoryRecord {
    return updateMemory(this.config, id, patch)
  }

  forget(id: string): ForgetResult {
    return forgetMemory(this.config, id)
  }

  restore(id: string): RestoreResult {
    return restoreMemory(this.config, id)
  }

  show(id: string): MemoryMeta | undefined {
    return findById(scanMemory(this.config), id)
  }

  export(options: ExportOptions = {}): string {
    const records = filterBySensitivity(memoryTimeline(this.config), options.maxSensitivity ?? 'confidential')
    return renderExport(records, options.format ?? 'json')
  }

  digest(): string {
    if (!this.config.digestEnabled) return ''
    const records = memoryTimeline(this.config)
      .filter((record) => record.kind === 'persona' || record.kind === 'warning')
      .slice(0, this.config.digestMaxRecords)
    let out = ''
    for (const record of records) {
      const line = '[' + (record.kind ?? '?') + '] ' + (record.title ?? '') + ': ' + record.content.trim()
      if (out.length > 0 && out.length + line.length + 1 > this.config.digestMaxChars) break
      out = out === '' ? line : out + '\n' + line
    }
    return out.slice(0, this.config.digestMaxChars)
  }

  listSkillDrafts(): SkillDraftSummary[] {
    return listSkillDrafts(this.config)
  }

  listEnabledSkills(): SkillDraftSummary[] {
    return listEnabledSkills(this.config)
  }

  promoteSkillDraft(name: string): PromotedSkill {
    return promoteSkillDraft(this.config, name)
  }

  demoteSkillDraft(name: string): DemotedSkill {
    return demoteSkillDraft(this.config, name)
  }

  draftSkill(record: MemoryRecordInput): SkillDraft {
    return renderSkillDraft(draftSkillFromRecord(record))
  }

  saveSkillDraft(draft: SkillDraftInput): CommittedArtifact & SkillDraft {
    return writeSkillDraft(this.config, draft)
  }

  saveSkillDraftFromRecord(record: MemoryRecordInput): CommittedArtifact & SkillDraft {
    return writeSkillDraft(this.config, draftSkillFromRecord(record))
  }

  suggest(record: MemoryRecordInput): EvolutionSuggestion {
    return suggestEvolution(record)
  }

  createBranch(branch: string, from?: string): void {
    gitCreateBranch(connectRepository(this.config), branch, from ?? this.config.defaultBranch)
  }

  checkoutBranch(branch: string): { branch: string; head: string | undefined } {
    const repoPath = connectRepository(this.config)
    gitCheckoutBranch(repoPath, branch)
    return { branch: gitCurrentBranch(repoPath), head: gitCurrentHead(repoPath) }
  }

  fetch(): void {
    const repoPath = connectRepository(this.config)
    fetchRemote(repoPath, this.config.remoteName, this.config.auth, this.config.repoUrl)
  }

  push(branch?: string): void {
    const repoPath = connectRepository(this.config)
    pushBranch(repoPath, branch ?? gitCurrentBranch(repoPath), this.config.remoteName, this.config.auth, this.config.repoUrl)
  }

  rollback(ref: string, dryRun: boolean): RevertResult {
    return revertCommit(this.config, ref, dryRun)
  }

  conflicts(repoPath?: string): string[] {
    return gitListConflicts(repoPath ?? connectRepository(this.config))
  }

  resolve(path: string, strategy: ConflictStrategy): string {
    return gitResolveConflict(connectRepository(this.config), path, strategy)
  }

  branchDiff(a: string, b?: string): BranchDiffResult {
    return gitBranchDiff(connectRepository(this.config), a, b)
  }

  syncSkills(force: boolean): SyncedSkill[] {
    return syncBundledSkills(this.config, force)
  }
}
