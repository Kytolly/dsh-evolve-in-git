import type { GitEvolutionError } from './git.js'
import type { BranchesView, HelpView, MemoryKind, RememberView, StatusView } from './types.js'

const MEMORY_KINDS: readonly MemoryKind[] = ['session', 'skill', 'warning', 'persona', 'note']

export const EVOLVE_TOOL_NAMES = Object.freeze([
  'evolve_connect',
  'evolve_status',
  'evolve_remember',
  'evolve_update',
  'evolve_forget',
  'evolve_restore',
  'evolve_show',
  'evolve_export',
  'evolve_branches',
  'evolve_branch_switch',
  'evolve_branch_diff',
  'evolve_skill_draft',
  'evolve_skill_list',
  'evolve_skill_promote',
  'evolve_skill_demote',
  'evolve_rollback',
  'evolve_conflicts',
  'evolve_resolve',
  'evolve_timeline',
  'evolve_recall',
  'evolve_help',
  'memory_search',
  'memory_save',
  'memory_update',
  'memory_delete',
] as const)

export const EVOLVE_COMMAND = '/evolve'

export const EVOLVE_USAGE = Object.freeze([
  '/evolve connect',
  '/evolve status',
  '/evolve branches',
  '/evolve remember <kind> <title> [--expires <iso>] :: <content>',
  '/evolve update <id> [--merge] :: <content>',
  '/evolve forget <id>',
  '/evolve restore <id>',
  '/evolve config show|open|refresh|set <key> <value>',
  '/evolve skill draft <kind> <title> :: <content>',
  '/evolve skill list',
  '/evolve skill promote <name>',
  '/evolve skill demote <name>',
  '/evolve skill sync',
  '/evolve rollback <ref> [--dry]',
  '/evolve conflicts',
  '/evolve resolve <path> <ours|theirs|both>',
  '/evolve timeline',
  '/evolve search <q> [--kind k] [--tag t]',
  '/evolve branch switch <name>',
  '/evolve branch diff <a> [b]',
  '/evolve branch revert <ref>',
  '/evolve help',
] as const)

export const EVOLVE_SAFETY = Object.freeze([
  'connect verifies the local checkout, remote URL, and auth before reporting success',
  'remember/update/forget/restore write only to the configured memory repository',
  'rollback only reverts commits that touch memory/skills roots',
  'privacyMode block/redact applies before memory writes',
] as const)

export type ParsedEvolveCommand =
  | { kind: 'connect' }
  | { kind: 'status' }
  | { kind: 'branches' }
  | { kind: 'help' }
  | { kind: 'remember'; record: { kind: MemoryKind; title: string; content: string; expiresAt?: string } }
  | { kind: 'invalid'; message: string }

function rememberUsage(): string {
  return 'Usage: /evolve remember <kind> <title> :: <content>'
}

/** Strip a leading '/evolve' prefix when the host passes the full command text. */
export function normalizeEvolveCommand(rawInput: string): string {
  const input = rawInput.trim()
  return input.startsWith('/evolve') ? input.slice('/evolve'.length).trim() : input
}

export function parseEvolveCommand(rawInput: string): ParsedEvolveCommand {
  const input = rawInput.trim()
  if (input.length === 0 || input === 'help') return { kind: 'help' }
  if (input === 'connect') return { kind: 'connect' }
  if (input === 'status') return { kind: 'status' }
  if (input === 'branches') return { kind: 'branches' }
  if (!input.startsWith('remember')) return { kind: 'invalid', message: renderHelpText() }
  const remainder = input.slice('remember'.length).trim()
  const separator = remainder.indexOf('::')
  if (separator === -1) return { kind: 'invalid', message: rememberUsage() }
  const left = remainder.slice(0, separator).trim()
  const content = remainder.slice(separator + 2).trim()
  if (left.length === 0 || content.length === 0) return { kind: 'invalid', message: rememberUsage() }
  const firstSpace = left.indexOf(' ')
  if (firstSpace === -1) return { kind: 'invalid', message: rememberUsage() }
  const kind = left.slice(0, firstSpace).trim() as MemoryKind
  let title = left.slice(firstSpace + 1).trim()
  let expiresAt: string | undefined
  const expiresMatch = title.match(/\s+--expires\s+(\S+)\s*$/)
  if (expiresMatch !== null && expiresMatch.index !== undefined) {
    expiresAt = expiresMatch[1]
    title = title.slice(0, expiresMatch.index).trim()
  }
  if (!MEMORY_KINDS.includes(kind) || title.length === 0) return { kind: 'invalid', message: rememberUsage() }
  return { kind: 'remember', record: expiresAt === undefined ? { kind, title, content } : { kind, title, content, expiresAt } }
}

export function renderHelpView(): HelpView {
  return {
    command: EVOLVE_COMMAND,
    tools: [...EVOLVE_TOOL_NAMES],
    usage: [...EVOLVE_USAGE],
    safety: [...EVOLVE_SAFETY],
  }
}

export function renderHelpText(): string {
  return [
    'DeepSeek Harness evolution controls',
    '',
    'Usage:',
    ...EVOLVE_USAGE.map(line => `- ${line}`),
    '',
    'Safety:',
    ...EVOLVE_SAFETY.map(line => `- ${line}`),
  ].join('\n')
}

export function renderStatusText(title: string, view: StatusView): string {
  const changes = view.changedFiles.length === 0 ? 'none' : view.changedFiles.join(', ')
  return [
    title,
    `Repo: ${view.repoPath}`,
    `Remote: ${view.remoteName} -> ${view.repoUrl}`,
    `Branch: ${view.branch}`,
    `HEAD: ${view.head ?? 'unborn'}`,
    `Ahead/behind: ${view.ahead}/${view.behind}`,
    `Working tree: ${view.clean ? 'clean' : 'dirty'}`,
    `Changed files: ${changes}`,
  ].join('\n')
}

export function renderBranchesText(view: BranchesView): string {
  return [
    'Evolution branches',
    `Repo: ${view.repoPath}`,
    `Current: ${view.currentBranch}`,
    ...view.branches.map(branch => `- ${branch}`),
  ].join('\n')
}

export function renderRememberText(view: RememberView): string {
  const tags = view.tags.length === 0 ? 'none' : view.tags.join(', ')
  return [
    'Memory recorded',
    `Kind: ${view.kind}`,
    `Title: ${view.title}`,
    `Branch: ${view.branch}`,
    `Commit: ${view.commit ?? 'pending'}`,
    `Path: ${view.path}`,
    `Tags: ${tags}`,
    `Source: ${view.source ?? 'none'}`,
  ].join('\n')
}

export function userFacingError(error: unknown): string {
  if (typeof error === 'object' && error !== null && 'code' in error && 'message' in error) {
    const value = error as Pick<GitEvolutionError, 'code' | 'message'>
    return `[${value.code}] ${value.message}`
  }
  if (error instanceof Error) return error.message
  return 'Unexpected evolve-git error.'
}
