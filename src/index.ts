/**
 * Git-backed memory and evolution runtime for DeepSeek Harness.
 * @module dsh-evolve-in-git
 */

import { Context, Service } from '@deepseek-ai/cordis'
import z from '@deepseek-ai/schemastery'
import { homedir } from 'node:os'
import { join } from 'node:path'
import {
  checkoutBranch as gitCheckoutBranch,
  createBranch as gitCreateBranch,
  currentBranch,
  ensureGitRepository,
  fetchRemote,
  gitStatus,
  listBranches,
  openRepository,
  pushBranch,
  writeMemoryRecord,
  writeSkillDraft,
} from './git.js'
import type {
  CommittedArtifact,
  EvolutionSuggestion,
  GitAuthConfig,
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
  repoPath?: string
  repoUrl?: string
  auth?: GitAuthConfig
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
const DEFAULT_REPO_URL = 'https://github.com/Kytolly/dsh-remote-memory.git'
const DEFAULT_REPO_PATH = join(homedir(), '.dsh-evolve-in-git', 'remote-memory')
const DEFAULT_AUTH = {
  mode: 'ssh' as const,
  sshCommand: 'ssh',
  tokenEnv: 'GITHUB_TOKEN',
  token: '',
  username: 'x-access-token',
}

function resolveConfig(config: Config): ResolvedConfig {
  return {
    repoPath: config.repoPath?.trim() || DEFAULT_REPO_PATH,
    repoUrl: config.repoUrl?.trim() || DEFAULT_REPO_URL,
    auth: config.auth ?? DEFAULT_AUTH,
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
    repoPath: z.string().default(DEFAULT_REPO_PATH),
    repoUrl: z.string().default(DEFAULT_REPO_URL),
    auth: z.object({
      mode: z.union([z.const('ssh'), z.const('token')]),
      sshCommand: z.string(),
      tokenEnv: z.string(),
      token: z.string(),
      username: z.string(),
    }).default(DEFAULT_AUTH),
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
    return gitStatus(openRepository(this.config))
  }

  /**
   * List local branches in the configured repository.
   * @returns the branch names.
   */
  async branches(): Promise<string[]> {
    return listBranches(openRepository(this.config))
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
    gitCreateBranch(openRepository(this.config), branch, from ?? this.config.defaultBranch)
  }

  /**
   * Switch the configured repository to one named branch.
   * @param branch - branch name to check out.
   */
  async checkout(branch: string): Promise<void> {
    gitCheckoutBranch(openRepository(this.config), branch)
  }

  /**
   * Fetch the configured remote.
   */
  async fetch(): Promise<void> {
    const repoPath = openRepository(this.config)
    fetchRemote(repoPath, this.config.remoteName, this.config.auth, this.config.repoUrl)
  }

  /**
   * Push one branch to the configured remote.
   * @param branch - branch to push; defaults to the current branch.
   */
  async push(branch?: string): Promise<void> {
    const repoPath = openRepository(this.config)
    pushBranch(repoPath, branch ?? currentBranch(repoPath), this.config.remoteName, this.config.auth, this.config.repoUrl)
  }

  /**
   * Ensure the configured repository exists locally and is connected to the remote memory repo.
   * @returns the Git status after connecting.
   */
  async connect() {
    return gitStatus(openRepository(this.config))
  }
}

export default GitEvolutionService
