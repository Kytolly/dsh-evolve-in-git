/**
 * Git-backed memory and evolution runtime for DeepSeek Harness.
 * @module dsh-evolve-in-git
 */

import { Context, Service } from '@deepseek-ai/cordis'
import type { CommandInvocation, CommandResult } from '@deepseek-ai/dsh-commands'
import z from '@deepseek-ai/schemastery'
import { defineTool } from '@deepseek-ai/dsh-tools'
import type {} from '@deepseek-ai/dsh-system-prompt'
import { homedir } from 'node:os'
import { join } from 'node:path'
import {
  checkoutBranch as gitCheckoutBranch,
  connectRepository,
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
import {
  parseEvolveCommand,
  renderBranchesText,
  renderHelpText,
  renderHelpView,
  renderRememberText,
  renderStatusText,
  userFacingError,
} from './harness.js'
import type {
  BranchesView,
  CommittedArtifact,
  EvolutionSuggestion,
  GitAuthConfig,
  GitStatus,
  HelpView,
  MemoryKind,
  MemoryRecord,
  MemoryRecordInput,
  RememberView,
  ResolvedConfig,
  SkillDraft,
  SkillDraftInput,
  StatusView,
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

export const name = 'dsh-evolve-in-git'
export const inject = ['commands', 'tools', 'systemPrompt']

export type * from './types.js'
export {
  GitEvolutionError,
  checkoutBranch,
  connectRepository,
  createBranch,
  currentBranch,
  ensureGitRepository,
  fetchRemote,
  gitStatus,
  pushBranch,
} from './git.js'
export {
  parseEvolveCommand,
  renderBranchesText,
  renderHelpText,
  renderHelpView,
  renderRememberText,
  renderStatusText,
  userFacingError,
} from './harness.js'
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

const PROMPT_TEXT =
  'Use evolve_connect to verify the private memory repository, evolve_status to inspect branch and sync state, '
  + 'evolve_remember to persist a reusable memory note, evolve_branches to inspect local evolution branches, and '
  + 'evolve_help to recall the command and safety surface.'

const STATUS_VIEW_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    repoPath: { type: 'string', required: true },
    repoUrl: { type: 'string', required: true },
    remoteName: { type: 'string', required: true },
    verified: { type: 'boolean', required: true },
    branch: { type: 'string', required: true },
    head: { oneOf: [{ type: 'string' }, { type: 'null' }], required: true },
    ahead: { type: 'integer', required: true },
    behind: { type: 'integer', required: true },
    clean: { type: 'boolean', required: true },
    changedFiles: { type: 'array', required: true, items: { type: 'string' } },
  },
} as const

const BRANCHES_VIEW_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    repoPath: { type: 'string', required: true },
    repoUrl: { type: 'string', required: true },
    remoteName: { type: 'string', required: true },
    currentBranch: { type: 'string', required: true },
    branches: { type: 'array', required: true, items: { type: 'string' } },
  },
} as const

const REMEMBER_VIEW_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    repoPath: { type: 'string', required: true },
    repoUrl: { type: 'string', required: true },
    path: { type: 'string', required: true },
    branch: { type: 'string', required: true },
    commit: { oneOf: [{ type: 'string' }, { type: 'null' }], required: true },
    message: { type: 'string', required: true },
    kind: { type: 'string', required: true, enum: ['session', 'skill', 'warning', 'persona', 'note'] },
    title: { type: 'string', required: true },
    createdAt: { type: 'string', required: true },
    source: { oneOf: [{ type: 'string' }, { type: 'null' }], required: true },
    tags: { type: 'array', required: true, items: { type: 'string' } },
  },
} as const

const HELP_VIEW_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    command: { type: 'string', required: true },
    tools: { type: 'array', required: true, items: { type: 'string' } },
    usage: { type: 'array', required: true, items: { type: 'string' } },
    safety: { type: 'array', required: true, items: { type: 'string' } },
  },
} as const

function jsonOutput(schema: unknown) {
  return {
    schema,
    render: (_args: unknown, value: unknown) => [{ type: 'text' as const, text: JSON.stringify(value, null, 2) }],
  }
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

function normalizeStatus(repoPath: string, config: ResolvedConfig, status: GitStatus): StatusView {
  return {
    repoPath,
    repoUrl: config.repoUrl,
    remoteName: config.remoteName,
    verified: true,
    branch: status.branch,
    head: status.head ?? null,
    ahead: status.ahead,
    behind: status.behind,
    clean: status.clean,
    changedFiles: [...status.changedFiles],
  }
}

function normalizeBranches(repoPath: string, config: ResolvedConfig, branches: string[]): BranchesView {
  return {
    repoPath,
    repoUrl: config.repoUrl,
    remoteName: config.remoteName,
    currentBranch: currentBranch(repoPath),
    branches,
  }
}

function normalizeRemember(config: ResolvedConfig, value: CommittedArtifact & MemoryRecord): RememberView {
  return {
    repoPath: config.repoPath,
    repoUrl: config.repoUrl,
    path: value.path,
    branch: value.branch,
    commit: value.commit ?? null,
    message: value.message,
    kind: value.kind,
    title: value.title,
    createdAt: value.createdAt,
    source: value.source ?? null,
    tags: value.tags === undefined ? [] : [...value.tags],
  }
}

/**
 * Runtime service for Git-backed memory, branch evolution, Harness tools, and a human command.
 */
export class GitEvolutionService extends Service {
  static inject = inject

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
    ctx.systemPrompt.section({
      name: 'tool:evolve-git',
      order: 116,
      text: PROMPT_TEXT,
    })
    this.registerTools(ctx)
    ctx.effect(() => ctx.commands.register({
      name: 'evolve',
      description: 'inspect or write Git-backed long-term memory',
      input: { hint: 'connect|status|branches|remember <kind> <title> :: <content>|help' },
      handler: invocation => this.runCommand(invocation),
    }), 'dsh-evolve-in-git: command')
  }

  private registerTools(ctx: Context): void {
    ctx.tools.register(defineTool({
      name: 'evolve_connect',
      description: 'Ensure the configured private memory repository exists locally, matches the configured remote, and is reachable with the current auth settings.',
      parameters: {},
      output: jsonOutput(STATUS_VIEW_SCHEMA),
      isConcurrencySafe: () => true,
      execute: async () => this.connectView(),
      presentCall: () => ({ card: 'generic', title: 'Connect evolve memory', kind: 'read' }),
    }))

    ctx.tools.register(defineTool({
      name: 'evolve_status',
      description: 'Read the current evolve-memory branch, HEAD, ahead/behind counts, cleanliness, and changed file list.',
      parameters: {},
      output: jsonOutput(STATUS_VIEW_SCHEMA),
      isConcurrencySafe: () => true,
      execute: async () => this.statusView(),
      presentCall: () => ({ card: 'generic', title: 'Read evolve status', kind: 'read' }),
    }))

    ctx.tools.register(defineTool({
      name: 'evolve_remember',
      description: 'Write one long-term memory entry into the configured Git repository. Use this for warnings, persona guidance, reusable notes, or session memory worth preserving.',
      parameters: {
        kind: {
          type: 'string',
          required: true,
          enum: ['session', 'skill', 'warning', 'persona', 'note'],
          description: 'Memory kind to persist.',
        },
        title: { type: 'string', required: true, description: 'Short memory title.' },
        content: { type: 'string', required: true, description: 'Memory content to persist.' },
        source: { type: 'string', description: 'Optional source pointer, such as a session id or command origin.' },
        branch: { type: 'string', description: 'Optional target branch; omit to use the current branch.' },
        tags: { type: 'array', items: { type: 'string' }, description: 'Optional memory tags.' },
      },
      output: jsonOutput(REMEMBER_VIEW_SCHEMA),
      execute: async (args) => this.rememberView({
        kind: args.kind as MemoryKind,
        title: args.title,
        content: args.content,
        ...(args.source === undefined ? {} : { source: args.source }),
        ...(args.branch === undefined ? {} : { branch: args.branch }),
        ...(args.tags === undefined ? {} : { tags: args.tags }),
      }),
      presentCall: args => ({ card: 'generic', title: `Remember ${args.kind}`, kind: 'other', rawInput: args.title }),
    }))

    ctx.tools.register(defineTool({
      name: 'evolve_branches',
      description: 'List local evolution branches in the configured memory repository and report the current branch.',
      parameters: {},
      output: jsonOutput(BRANCHES_VIEW_SCHEMA),
      isConcurrencySafe: () => true,
      execute: async () => this.branchesView(),
      presentCall: () => ({ card: 'generic', title: 'List evolve branches', kind: 'read' }),
    }))

    ctx.tools.register(defineTool({
      name: 'evolve_help',
      description: 'Show the supported evolve-memory command and tool surface, including the safe remember syntax.',
      parameters: {},
      output: jsonOutput(HELP_VIEW_SCHEMA),
      isConcurrencySafe: () => true,
      execute: async () => this.helpView(),
      presentCall: () => ({ card: 'generic', title: 'Read evolve help', kind: 'read' }),
    }))
  }

  async status() {
    return gitStatus(connectRepository(this.config))
  }

  async statusView(): Promise<StatusView> {
    const repoPath = connectRepository(this.config)
    return normalizeStatus(repoPath, this.config, gitStatus(repoPath))
  }

  async branches(): Promise<string[]> {
    return listBranches(connectRepository(this.config))
  }

  async branchesView(): Promise<BranchesView> {
    const repoPath = connectRepository(this.config)
    return normalizeBranches(repoPath, this.config, listBranches(repoPath))
  }

  async record(record: MemoryRecordInput): Promise<CommittedArtifact & MemoryRecord> {
    return writeMemoryRecord(this.config, record)
  }

  async rememberView(record: MemoryRecordInput): Promise<RememberView> {
    return normalizeRemember(this.config, await this.record(record))
  }

  async draftSkill(record: MemoryRecordInput): Promise<SkillDraft> {
    return renderSkillDraft(draftSkillFromRecord(record))
  }

  async suggest(record: MemoryRecordInput): Promise<EvolutionSuggestion> {
    return suggestEvolution(record)
  }

  async saveSkillDraft(draft: SkillDraftInput): Promise<CommittedArtifact & SkillDraft> {
    return writeSkillDraft(this.config, draft)
  }

  async createBranch(branch: string, from?: string): Promise<void> {
    gitCreateBranch(connectRepository(this.config), branch, from ?? this.config.defaultBranch)
  }

  async checkout(branch: string): Promise<void> {
    gitCheckoutBranch(connectRepository(this.config), branch)
  }

  async fetch(): Promise<void> {
    const repoPath = connectRepository(this.config)
    fetchRemote(repoPath, this.config.remoteName, this.config.auth, this.config.repoUrl)
  }

  async push(branch?: string): Promise<void> {
    const repoPath = connectRepository(this.config)
    pushBranch(repoPath, branch ?? currentBranch(repoPath), this.config.remoteName, this.config.auth, this.config.repoUrl)
  }

  async connect() {
    return gitStatus(connectRepository(this.config))
  }

  async connectView(): Promise<StatusView> {
    const repoPath = connectRepository(this.config)
    return normalizeStatus(repoPath, this.config, gitStatus(repoPath))
  }

  async helpView(): Promise<HelpView> {
    return renderHelpView()
  }

  private async runCommand(invocation: CommandInvocation): Promise<CommandResult> {
    try {
      const parsed = parseEvolveCommand(invocation.rawInput)
      switch (parsed.kind) {
        case 'connect':
          return { kind: 'success', text: renderStatusText('Memory repository connected', await this.connectView()) }
        case 'status':
          return { kind: 'success', text: renderStatusText('Memory repository status', await this.statusView()) }
        case 'branches':
          return { kind: 'success', text: renderBranchesText(await this.branchesView()) }
        case 'remember':
          return { kind: 'success', text: renderRememberText(await this.rememberView({ ...parsed.record, source: 'command:/evolve remember' })) }
        case 'help':
          return { kind: 'success', text: renderHelpText() }
        case 'invalid':
          return { kind: 'error', text: parsed.message }
        default:
          return { kind: 'error', text: renderHelpText() }
      }
    } catch (error: unknown) {
      return { kind: 'error', text: userFacingError(error) }
    }
  }
}

export default GitEvolutionService
