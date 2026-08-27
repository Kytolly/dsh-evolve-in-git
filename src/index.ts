/**
 * Git-backed memory and evolution runtime for DeepSeek Harness.
 * @module dsh-evolve-in-git
 */

import { Context, Service } from '@deepseek-ai/cordis'
import { homedir } from 'node:os'
import { join } from 'node:path'
import type { CommandInvocation, CommandResult } from '@deepseek-ai/dsh-commands'
import z from '@deepseek-ai/schemastery'
import { defineTool } from '@deepseek-ai/dsh-tools'
import type {} from '@deepseek-ai/dsh-system-prompt'
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
import { configFilePath, mergeConfig, readConfigFile, writeConfigFile } from './config.js'
import { DEFAULT_AUTH, DEFAULT_BRANCH, DEFAULT_MEMORY_ROOT, DEFAULT_REMOTE, DEFAULT_REPO_PATH, DEFAULT_REPO_URL, DEFAULT_SKILLS_ROOT } from './defaults.js'
import { listSkillDrafts, promoteSkillDraft, syncBundledSkills } from './skill.js'
import { makeConfigRoutes } from './config-route.js'
import type { WebRoute } from '@deepseek-ai/dsh-host-webserver'
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

const PROMPT_TEXT =
  'Use evolve_connect to verify the private memory repository, evolve_status to inspect branch and sync state, '
  + 'evolve_remember to persist a reusable memory note, evolve_branches to inspect local evolution branches, '
  + 'evolve_skill_draft to turn a memory into a skill draft, evolve_skill_list to see promotable skill drafts, evolve_skill_promote to install one into the skill registry, and '
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

const SKILL_LIST_VIEW_SCHEMA = {
  type: 'array',
  items: {
    type: 'object',
    additionalProperties: false,
    properties: {
      name: { type: 'string', required: true },
      description: { type: 'string', required: true },
      path: { type: 'string', required: true },
    },
  },
} as const

const PROMOTE_VIEW_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    name: { type: 'string', required: true },
    description: { type: 'string', required: true },
    path: { type: 'string', required: true },
    targetPath: { type: 'string', required: true },
  },
} as const

const DRAFT_VIEW_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    name: { type: 'string', required: true },
    description: { type: 'string', required: true },
    whenToUse: { type: 'string', required: true },
    path: { type: 'string', required: true },
    content: { type: 'string', required: true },
  },
} as const

function jsonOutput(schema: unknown) {
  return {
    schema,
    render: (_args: unknown, value: unknown) => [{ type: 'text' as const, text: JSON.stringify(value, null, 2) }],
  }
}

/** Expand a leading '~' in a user-supplied path to the home directory (node:path does not). */
function expandHome(path: string): string {
  if (path === '~') return homedir()
  if (path.startsWith('~/')) return join(homedir(), path.slice(2))
  return path
}

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
      token: z.string().role('secret'),
      username: z.string(),
    }).default(DEFAULT_AUTH),
    memoryRoot: z.string().default(DEFAULT_MEMORY_ROOT),
    skillsRoot: z.string().default(DEFAULT_SKILLS_ROOT),
    defaultBranch: z.string().default(DEFAULT_BRANCH),
    remoteName: z.string().default(DEFAULT_REMOTE),
    autoCommit: z.boolean().default(true),
  })

  config: ResolvedConfig
  private readonly baseConfig: Config

  constructor(ctx: Context, config: Config) {
    super(ctx, 'evolveGit')
    this.baseConfig = config
    this.config = resolveConfig(mergeConfig(config, readConfigFile()) as Config)
    try { syncBundledSkills(false) } catch { /* best-effort: materialize bundled skills, never block load */ }
    ctx.systemPrompt.section({
      name: 'tool:evolve-git',
      order: 116,
      text: PROMPT_TEXT,
    })
    this.registerTools(ctx)
    ctx.effect(() => ctx.commands.register({
      name: 'evolve',
      description: 'inspect or write Git-backed long-term memory',
      input: { hint: 'connect|status|branches|remember <kind> <title> :: <content>|config show|open|refresh|set <key> <value>|skill draft|list|promote <name>|sync|help' },
      handler: invocation => this.runCommand(invocation),
    }), 'dsh-evolve-in-git: command')
    this.registerConfigRoute(ctx)
  }

  /** Recompute this.config from the config file over the Cordis base (the config file is the single user layer). */
  private refreshConfig(): void {
    this.config = resolveConfig(mergeConfig(this.baseConfig, readConfigFile()) as Config)
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

    ctx.tools.register(defineTool({
      name: 'evolve_skill_list',
      description: 'List skill drafts in the evolve memory repo that can be promoted into the DSH skill registry.',
      parameters: {},
      output: jsonOutput(SKILL_LIST_VIEW_SCHEMA),
      isConcurrencySafe: () => true,
      execute: async () => listSkillDrafts(this.config),
      presentCall: () => ({ card: 'generic', title: 'List evolve skill drafts', kind: 'read' }),
    }))

    ctx.tools.register(defineTool({
      name: 'evolve_skill_promote',
      description: 'Promote one skill draft into the DSH skill registry by its name, making it callable as a normal DSH skill.',
      parameters: {
        name: { type: 'string', required: true, description: 'Skill draft name (kebab-case) to promote.' },
      },
      output: jsonOutput(PROMOTE_VIEW_SCHEMA),
      isConcurrencySafe: () => false,
      execute: async (args) => promoteSkillDraft(this.config, args.name as string),
      presentCall: args => ({ card: 'generic', title: 'Promote skill ' + String(args.name), kind: 'write' }),
    }))

    ctx.tools.register(defineTool({
      name: 'evolve_skill_draft',
      description: 'Create a skill draft from a memory record, writing it into the evolve memory repo so it can be reviewed and then promoted into the skill registry.',
      parameters: {
        kind: { type: 'string', required: true, enum: ['session', 'skill', 'warning', 'persona', 'note'], description: 'Memory kind to draft from.' },
        title: { type: 'string', required: true, description: 'Short memory title.' },
        content: { type: 'string', required: true, description: 'Reusable lesson or rule to encode as a skill.' },
        tags: { type: 'array', items: { type: 'string' }, description: 'Optional skill tags.' },
      },
      output: jsonOutput(DRAFT_VIEW_SCHEMA),
      isConcurrencySafe: () => false,
      execute: async (args) => {
        const draft = await this.saveSkillDraft(draftSkillFromRecord({ kind: args.kind as MemoryKind, title: args.title, content: args.content, ...(args.tags === undefined ? {} : { tags: args.tags }) }))
        return { name: draft.name, description: draft.description, whenToUse: draft.whenToUse, path: draft.path, content: draft.content }
      },
      presentCall: args => ({ card: 'generic', title: 'Draft skill from ' + String(args.kind), kind: 'write', rawInput: args.title }),
    }))
  }

  /**
   * Register the config-file routes ('/api/evolve-git/config') backing the
   * browser config-file editor. The web server service is optional (headless
   * profiles never mount one), so registration waits for it via
   * 'internal/service'; writes reload the runtime config immediately.
   */
  private registerConfigRoute(ctx: Context): void {
    const routes = makeConfigRoutes(() => this.refreshConfig())
    ctx.effect(() => {
      const disposers: (() => void)[] = []
      let registered = false
      const mount = (): void => {
        if (registered) return
        const host = (ctx.get('webServer') ?? ctx.get('httpServer')) as WebRouteHost | undefined
        if (host === undefined) return
        registered = true
        for (const route of routes) disposers.push(host.register(route))
      }
      mount()
      if (registered) return () => { for (const dispose of disposers) dispose() }
      // The web server may mount after this plugin's apply: re-try on its service event.
      const off = ctx.on('internal/service', (name: unknown) => {
        if (name === 'webServer' || name === 'httpServer') mount()
      })
      return () => {
        off()
        for (const dispose of disposers) dispose()
      }
    }, 'dsh-evolve-in-git: config route')
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
      const input = invocation.rawInput.trim()
      if (input.startsWith('config')) {
        return this.runConfigCommand(input.slice('config'.length).trim())
      }
      if (input.startsWith('skill')) {
        return this.runSkillCommand(input.slice('skill'.length).trim())
      }
      const parsed = parseEvolveCommand(input)
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

  private runConfigCommand(rest: string): CommandResult {
    const path = configFilePath()
    const parts = rest.trim().split(/\s+/).filter(Boolean)
    const cmd = parts[0] ?? 'show'
    const show = (): { kind: 'success'; text: string } => ({
      kind: 'success',
      text: [
        'EvolveInGit config file: ' + path,
        'repoPath: ' + this.config.repoPath,
        'repoUrl: ' + this.config.repoUrl,
        'auth.mode: ' + this.config.auth.mode,
        'auth.tokenEnv: ' + (this.config.auth.tokenEnv ?? ''),
        'memoryRoot: ' + this.config.memoryRoot,
        'skillsRoot: ' + this.config.skillsRoot,
        'defaultBranch: ' + this.config.defaultBranch,
        'remoteName: ' + this.config.remoteName,
        'autoCommit: ' + String(this.config.autoCommit),
      ].join('\n'),
    })
    const reloadText = (): string => 'Config reloaded from:\n  ' + path
    switch (cmd) {
      case 'show':
        return show()
      case 'open':
        return { kind: 'success', text: 'Open the config file in your editor:\n  ' + path }
      case 'refresh':
        this.config = resolveConfig(mergeConfig(this.baseConfig, readConfigFile()) as Config)
        return { kind: 'success', text: reloadText() }
      case 'set': {
        const key = parts[1]
        const value = parts.slice(2).join(' ')
        if (!key || value.length === 0) {
          return { kind: 'error', text: 'Usage: /evolve config set <key> <value>' }
        }
        const current = readConfigFile()
        const parsedValue = parseConfigValue(value)
        setByPath(current, key, parsedValue)
        writeConfigFile(current)
        this.config = resolveConfig(mergeConfig(this.baseConfig, readConfigFile()) as Config)
        return { kind: 'success', text: 'Saved ' + key + ' = ' + JSON.stringify(parsedValue) + ' -> ' + path }
      }
      default:
        return { kind: 'error', text: 'Usage: /evolve config show|open|refresh|set <key> <value>' }
    }
  }

  private async runSkillCommand(rest: string): Promise<CommandResult> {
    const parts = rest.trim().split(/\s+/).filter(Boolean)
    const cmd = parts[0] ?? 'list'
    switch (cmd) {
      case 'list': {
        const drafts = listSkillDrafts(this.config)
        if (drafts.length === 0) {
          return { kind: 'success', text: 'No skill drafts to promote.' }
        }
        return {
          kind: 'success',
          text: [
            'Promotable skill drafts in ' + join(this.config.repoPath, this.config.skillsRoot) + ':',
            ...drafts.map(draft => '- ' + draft.name + ' :: ' + draft.description),
            '',
            'Promote one with: /evolve skill promote <name>',
          ].join('\n'),
        }
      }
      case 'promote': {
        const name = parts[1]
        if (name === undefined) {
          return { kind: 'error', text: 'Usage: /evolve skill promote <name>' }
        }
        try {
          const promoted = promoteSkillDraft(this.config, name)
          return { kind: 'success', text: 'Promoted skill "' + promoted.name + '" -> ' + promoted.targetPath }
        } catch (error) {
          return { kind: 'error', text: userFacingError(error) }
        }
      }
      case 'draft': {
        const draftArgs = rest.slice('draft'.length).trim()
        const parsed = parseEvolveCommand('remember ' + draftArgs)
        if (parsed.kind !== 'remember') {
          return { kind: 'error', text: 'Usage: /evolve skill draft <kind> <title> :: <content>' }
        }
        try {
          const draft = await this.saveSkillDraft(draftSkillFromRecord(parsed.record))
          return { kind: 'success', text: 'Drafted skill "' + draft.name + '" -> ' + draft.path }
        } catch (error) {
          return { kind: 'error', text: userFacingError(error) }
        }
      }
      case 'sync': {
        const synced = syncBundledSkills(true)
        return {
          kind: 'success',
          text: 'Synced bundled skills:\n' + (synced.length === 0
            ? '  (bundled skills not found in this package)'
            : synced.map(item => '- ' + item.name + ' (' + item.action + ') -> ' + item.targetPath).join('\n')),
        }
      }
      default:
        return { kind: 'error', text: 'Usage: /evolve skill draft <kind> <title> :: <content>|list|promote <name>|sync' }
    }
  }
}

function parseConfigValue(raw: string): unknown {
  const trimmed = raw.trim()
  if (trimmed === 'true') return true
  if (trimmed === 'false') return false
  if (/^-?\d+$/.test(trimmed)) return Number(trimmed)
  try {
    return JSON.parse(trimmed)
  } catch {
    return trimmed
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function setByPath(obj: any, path: string, value: unknown): void {
  const parts = path.split('.')
  let cur = obj
  for (let i = 0; i < parts.length - 1; i++) {
    const part = parts[i] as string
    if (typeof cur[part] !== 'object' || cur[part] === null) cur[part] = {}
    cur = cur[part]
  }
  cur[parts[parts.length - 1] as string] = value
}

/** Minimal web-server face the config route needs (the full service is optional). */
type WebRouteHost = {
  register(route: WebRoute): () => void
}

export default GitEvolutionService