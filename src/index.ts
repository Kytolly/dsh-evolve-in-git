/**
 * Git-backed memory and evolution runtime for DeepSeek Harness.
 * @module dsh-evolve-in-git
 */

import { Context, Service } from '@deepseek-ai/cordis'
import z from '@deepseek-ai/schemastery'
import {
  checkoutBranch as gitCheckoutBranch,
  createBranch as gitCreateBranch,
  currentBranch,
  ensureGitRepository,
  fetchRemote,
  gitStatus,
  listBranches,
  pushBranch,
  writeMemoryRecord,
  writeSkillDraft,
} from './git.js'
import type {
  CommittedArtifact,
  EvolutionSuggestion,
  MemoryRecord,
  MemoryRecordInput,
  ResolvedConfig,
  SkillDraft,
  SkillDraftInput,
} from './types.js'
import {
  branchNameForRecord,
  draftSkillFromRecord,
  memoryPreview,
  renderSkillDraft,
  sanitizeSegment,
  shouldOfferSkillPromotion,
  slugify,
  suggestEvolution,
} from './strategy.js'

export type * from './types.js'
export { GitEvolutionError, checkoutBranch, createBranch, currentBranch, ensureGitRepository, fetchRemote, gitStatus, pushBranch } from './git.js'
export { branchNameForRecord, draftSkillFromRecord, memoryPreview, renderSkillDraft, sanitizeSegment, shouldOfferSkillPromotion, slugify, suggestEvolution } from './strategy.js'

declare module '@deepseek-ai/cordis' {
  interface Context {
    evolveGit: GitEvolutionService
  }
}

export interface Config {
  repoPath: string
  memoryRoot?: string
  skillsRoot?: string
  defaultBranch?: string
  remoteName?: string
  autoCommit?: boolean
}

const DEFAULT_MEMORY_ROOT = '.dsh-evolve/memory'
const DEFAULT_SKILLS_ROOT = '.dsh-evolve/skills'
const DEFAULT_BRANCH = 'main'
const DEFAULT_REMOTE = 'origin'

function resolveConfig(config: Config): ResolvedConfig {
  const repoPath = config.repoPath.trim()
  if (repoPath === '') {
    throw new Error('repoPath must be a non-empty string')
  }
  return {
    repoPath,
    memoryRoot: config.memoryRoot?.trim() || DEFAULT_MEMORY_ROOT,
    skillsRoot: config.skillsRoot?.trim() || DEFAULT_SKILLS_ROOT,
    defaultBranch: config.defaultBranch?.trim() || DEFAULT_BRANCH,
    remoteName: config.remoteName?.trim() || DEFAULT_REMOTE,
    autoCommit: config.autoCommit ?? true,
  }
}

/**
 * Runtime service for Git-backed memory, branch evolution, and skill drafts.
 */
export class GitEvolutionService extends Service {
  static Config = z.object({
    repoPath: z.string().required(),
    memoryRoot: z.string().default(DEFAULT_MEMORY_ROOT),
    skillsRoot: z.string().default(DEFAULT_SKILLS_ROOT),
    defaultBranch: z.string().default(DEFAULT_BRANCH),
    remoteName: z.string().default(DEFAULT_REMOTE),
    autoCommit: z.boolean().default(true),
  })

  readonly config: ResolvedConfig

  constructor(ctx: Context, config: Config) {
    super(ctx, 'evolveGit')
    this.config = resolveConfig(config)
  }

  /**
   * Read the Git state for the configured repository.
   * @returns the current branch, head, and working-tree summary.
   */
  async status() {
    return gitStatus(ensureGitRepository(this.config.repoPath))
  }

  /**
   * List local branches in the configured repository.
   * @returns the branch names.
   */
  async branches(): Promise<string[]> {
    return listBranches(ensureGitRepository(this.config.repoPath))
  }

  /**
   * Record one memory entry as markdown inside the configured Git repository.
   * @param record - memory entry to persist.
   * @returns the persisted artifact and the commit that captured it.
   */
  async record(record: MemoryRecordInput): Promise<CommittedArtifact & MemoryRecord> {
    return writeMemoryRecord(this.config, record)
  }

  /**
   * Draft one reusable skill from a memory entry.
   * @param record - memory entry to distill.
   * @returns the draft skill body and its target path.
   */
  async draftSkill(record: MemoryRecordInput): Promise<SkillDraft> {
    return renderSkillDraft(draftSkillFromRecord(record))
  }

  /**
   * Suggest whether a memory entry should become a reusable skill.
   * @param record - memory entry to inspect.
   * @returns a user-facing promotion prompt and a branch/draft suggestion.
   */
  async suggest(record: MemoryRecordInput): Promise<EvolutionSuggestion> {
    return suggestEvolution(record)
  }

  /**
   * Persist a skill draft into the configured Git repository.
   * @param draft - skill draft to write.
   * @returns the persisted artifact and the commit that captured it.
   */
  async saveSkillDraft(draft: SkillDraftInput): Promise<CommittedArtifact & SkillDraft> {
    return writeSkillDraft(this.config, draft)
  }

  /**
   * Create a new branch from the configured default branch or the current head.
   * @param branch - branch name to create.
   * @param from - optional start point; defaults to the configured default branch.
   */
  async createBranch(branch: string, from?: string): Promise<void> {
    gitCreateBranch(this.config.repoPath, branch, from ?? this.config.defaultBranch)
  }

  /**
   * Switch the configured repository to one named branch.
   * @param branch - branch name to check out.
   */
  async checkout(branch: string): Promise<void> {
    gitCheckoutBranch(this.config.repoPath, branch)
  }

  /**
   * Fetch the configured remote.
   */
  async fetch(): Promise<void> {
    fetchRemote(this.config.repoPath, this.config.remoteName)
  }

  /**
   * Push one branch to the configured remote.
   * @param branch - branch to push; defaults to the current branch.
   */
  async push(branch?: string): Promise<void> {
    pushBranch(this.config.repoPath, branch ?? currentBranch(this.config.repoPath), this.config.remoteName)
  }
}

export default GitEvolutionService
