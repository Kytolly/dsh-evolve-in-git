import { mkdirSync, writeFileSync } from 'node:fs'
import { existsSync, readdirSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import { dirname, join, resolve } from 'node:path'
import type { CommittedArtifact, GitAuthConfig, GitStatus, MemoryRecord, MemoryRecordInput, ResolvedConfig, SkillDraft, SkillDraftInput } from './types.js'
import { renderSkillDraft, sanitizeSegment, slugify } from './strategy.js'

export class GitEvolutionError extends Error {
  code: string
  constructor(message: string, code: string, cause?: unknown) {
    super(message)
    this.code = code
    this.name = 'GitEvolutionError'
    if (cause !== undefined) {
      this.cause = cause
    }
  }
}

function gitEnv(auth: GitAuthConfig | undefined, repoUrl: string): Record<string, string> {
  if (auth === undefined) return {}
  if (auth.mode === 'ssh') {
    return {
      GIT_SSH_COMMAND: auth.sshCommand ?? 'ssh',
    }
  }
  const token = auth.token ?? process.env[auth.tokenEnv ?? 'GITHUB_TOKEN']
  if (token === undefined || token.trim() === '') {
    throw new GitEvolutionError('missing Git token for private repository access', 'GIT_AUTH_TOKEN_MISSING')
  }
  const username = auth.username ?? 'x-access-token'
  const origin = new URL(repoUrl).origin
  const header = `Authorization: Basic ${Buffer.from(`${username}:${token}`).toString('base64')}`
  return {
    [`GIT_CONFIG_COUNT`]: '1',
    [`GIT_CONFIG_KEY_0`]: `http.${origin}/.extraheader`,
    [`GIT_CONFIG_VALUE_0`]: header,
  }
}

function runGit(repoPath: string, args: readonly string[], env: Record<string, string> = {}): string {
  const result = spawnSync('git', ['-C', repoPath, ...args], { encoding: 'utf8', env: { ...process.env, ...env } })
  if (result.error !== undefined) {
    throw new GitEvolutionError(`git ${args.join(' ')} failed: ${result.error.message}`, 'GIT_SPAWN_FAILED', result.error)
  }
  if (result.status !== 0) {
    throw new GitEvolutionError(result.stderr.trim() || `git ${args.join(' ')} failed`, 'GIT_COMMAND_FAILED')
  }
  return String(result.stdout ?? '').trim()
}

function cloneGit(repoUrl: string, repoPath: string, branch: string, auth?: GitAuthConfig): void {
  const env = gitEnv(auth, repoUrl)
  const result = spawnSync('git', ['clone', '--branch', branch, '--single-branch', repoUrl, repoPath], {
    cwd: dirname(repoPath),
    encoding: 'utf8',
    env: { ...process.env, ...env },
  })
  if (result.error !== undefined) {
    throw new GitEvolutionError(`git clone failed: ${result.error.message}`, 'GIT_SPAWN_FAILED', result.error)
  }
  if (result.status !== 0) {
    throw new GitEvolutionError(result.stderr.trim() || 'git clone failed', 'GIT_COMMAND_FAILED')
  }
}

export function ensureGitRepository(repoPath: string): string {
  const resolved = resolve(repoPath)
  if (!existsSync(join(resolved, '.git'))) {
    throw new GitEvolutionError(`not a git repository: ${resolved}`, 'GIT_REPOSITORY_MISSING')
  }
  return resolved
}

function canonicalRepoId(repoUrl: string): string {
  const trimmed = repoUrl.trim()
  if (trimmed.startsWith('git@')) {
    const withoutPrefix = trimmed.slice('git@'.length)
    const separator = withoutPrefix.indexOf(':')
    if (separator === -1) return withoutPrefix.replace(/\.git$/i, '').toLowerCase()
    const host = withoutPrefix.slice(0, separator).toLowerCase()
    const path = withoutPrefix.slice(separator + 1).replace(/\.git$/i, '').replace(/^\/+/, '')
    return `${host}/${path}`.toLowerCase()
  }
  try {
    const parsed = new URL(trimmed)
    const path = parsed.pathname.replace(/\.git$/i, '').replace(/^\/+/, '')
    return `${parsed.host.toLowerCase()}/${path.toLowerCase()}`
  } catch {
    return trimmed.replace(/\.git$/i, '').replace(/^\/+/, '').toLowerCase()
  }
}

export function remoteUrl(repoPath: string, remote: string): string {
  const resolved = ensureGitRepository(repoPath)
  try {
    return runGit(resolved, ['remote', 'get-url', remote])
  } catch (error) {
    throw new GitEvolutionError(
      `missing Git remote ${JSON.stringify(remote)} in ${resolved}`,
      'GIT_REMOTE_MISSING',
      error,
    )
  }
}

export function ensureRemoteMatches(repoPath: string, remote: string, repoUrl: string): string {
  const actual = remoteUrl(repoPath, remote)
  if (canonicalRepoId(actual) !== canonicalRepoId(repoUrl)) {
    throw new GitEvolutionError(
      `remote ${JSON.stringify(remote)} points to ${actual}, expected ${repoUrl}`,
      'GIT_REMOTE_MISMATCH',
    )
  }
  return actual
}

export function verifyRemoteAccess(repoPath: string, remote: string, repoUrl: string, auth: GitAuthConfig): void {
  runGit(repoPath, ['ls-remote', '--exit-code', remote, 'HEAD'], gitEnv(auth, repoUrl))
}

export function openRepository(config: ResolvedConfig): string {
  const resolved = resolve(config.repoPath)
  if (existsSync(join(resolved, '.git'))) return resolved
  if (existsSync(resolved) && readdirSync(resolved).length > 0) {
    throw new GitEvolutionError(`repository path exists but is not a git checkout: ${resolved}`, 'GIT_REPOSITORY_DIRTY')
  }
  mkdirSync(dirname(resolved), { recursive: true })
  cloneGit(config.repoUrl, resolved, config.defaultBranch, config.auth)
  return resolved
}

export function currentBranch(repoPath: string): string {
  const branch = runGit(repoPath, ['branch', '--show-current'])
  return branch === '' ? 'HEAD' : branch
}

export function currentHead(repoPath: string): string | undefined {
  const head = runGit(repoPath, ['rev-parse', 'HEAD'])
  return head === '' ? undefined : head
}

export function listBranches(repoPath: string): string[] {
  const output = runGit(repoPath, ['for-each-ref', '--format=%(refname:short)', 'refs/heads'])
  return output === '' ? [] : output.split(/\r?\n/).filter(Boolean)
}

export function checkoutBranch(repoPath: string, branch: string, from?: string): void {
  const args = from === undefined ? ['switch', branch] : ['switch', '-c', branch, from]
  runGit(repoPath, args)
}

export function createBranch(repoPath: string, branch: string, from?: string): void {
  const args = from === undefined ? ['branch', branch] : ['branch', branch, from]
  runGit(repoPath, args)
}

export function pushBranch(repoPath: string, branch: string, remote: string, auth?: GitAuthConfig, repoUrl?: string): void {
  runGit(repoPath, ['push', remote, branch], repoUrl === undefined ? {} : gitEnv(auth, repoUrl))
}

export function fetchRemote(repoPath: string, remote: string, auth?: GitAuthConfig, repoUrl?: string): void {
  runGit(repoPath, ['fetch', remote], repoUrl === undefined ? {} : gitEnv(auth, repoUrl))
}

export function connectRepository(config: ResolvedConfig): string {
  const repoPath = openRepository(config)
  ensureRemoteMatches(repoPath, config.remoteName, config.repoUrl)
  verifyRemoteAccess(repoPath, config.remoteName, config.repoUrl, config.auth)
  return repoPath
}

export function gitStatus(repoPath: string): GitStatus {
  const lines = runGit(repoPath, ['status', '--short', '--branch']).split(/\r?\n/).filter(Boolean)
  const [headLine = ''] = lines
  const changedFiles = lines.slice(1).map((line) => line.slice(3))
  const branchMatch = headLine.match(/^##\s+(.+?)(?:\.\.\.(.+?))?(?:\s+\[ahead\s+(\d+)(?:,\s*behind\s+(\d+))?\])?$/)
  const branch = branchMatch?.[1] ?? currentBranch(repoPath)
  const ahead = branchMatch?.[3] === undefined ? 0 : Number(branchMatch[3])
  const behind = branchMatch?.[4] === undefined ? 0 : Number(branchMatch[4])
  return {
    branch,
    head: existsSync(join(repoPath, '.git', 'HEAD')) ? currentHead(repoPath) : undefined,
    ahead: Number.isFinite(ahead) ? ahead : 0,
    behind: Number.isFinite(behind) ? behind : 0,
    clean: changedFiles.length === 0,
    changedFiles,
  }
}

function toIsoStamp(date: Date = new Date()): string {
  return date.toISOString().replaceAll(':', '-').replace(/\.\d{3}Z$/, 'Z')
}

function frontmatter(lines: Record<string, string | readonly string[] | undefined>): string {
  const output = ['---']
  for (const [key, value] of Object.entries(lines)) {
    if (value === undefined) continue
    if (Array.isArray(value)) {
      output.push(`${key}: [${value.map((item) => JSON.stringify(item)).join(', ')}]`)
      continue
    }
    output.push(`${key}: ${JSON.stringify(value)}`)
  }
  output.push('---')
  return output.join('\n')
}

function commitPaths(repoPath: string, paths: readonly string[], message: string): string | undefined {
  if (paths.length === 0) return undefined
  runGit(repoPath, ['add', '--', ...paths])
  const staged = spawnSync('git', ['-C', repoPath, 'diff', '--cached', '--quiet'], { encoding: 'utf8' })
  if (staged.status === 0) return currentHead(repoPath)
  if (staged.status !== 1) {
    throw new GitEvolutionError(staged.stderr.trim() || 'git diff --cached --quiet failed', 'GIT_COMMAND_FAILED', staged.error)
  }
  runGit(repoPath, ['commit', '--no-gpg-sign', '--message', message])
  return currentHead(repoPath)
}

export function writeMemoryRecord(config: ResolvedConfig, input: MemoryRecordInput): CommittedArtifact & MemoryRecord {
  const repoPath = openRepository(config)
  const createdAt = new Date().toISOString()
  const branch = input.branch ?? currentBranch(repoPath)
  const filePath = join(
    repoPath,
    config.memoryRoot,
    sanitizeSegment(input.kind),
    `${toIsoStamp()}-${slugify(input.title)}.md`,
  )
  mkdirSync(dirname(filePath), { recursive: true })
  const body = [
    frontmatter({
      kind: input.kind,
      title: input.title,
      branch,
      source: input.source,
      tags: input.tags,
      createdAt,
    }),
    '',
    input.content.trimEnd(),
    '',
  ].join('\n')
  writeFileSync(filePath, body, 'utf8')
  const message = `memory(${input.kind}): ${input.title}`
  const commit = config.autoCommit ? commitPaths(repoPath, [filePath], message) : undefined
  return {
    path: filePath,
    branch,
    commit,
    message,
    kind: input.kind,
    title: input.title,
    content: input.content,
    createdAt,
    ...(input.tags === undefined ? {} : { tags: input.tags }),
    ...(input.source === undefined ? {} : { source: input.source }),
  }
}

export function writeSkillDraft(config: ResolvedConfig, draft: SkillDraftInput): CommittedArtifact & SkillDraft {
  const repoPath = openRepository(config)
  const filePath = join(repoPath, config.skillsRoot, sanitizeSegment(draft.name), 'SKILL.md')
  mkdirSync(dirname(filePath), { recursive: true })
  const rendered = renderSkillDraft(draft)
  writeFileSync(filePath, rendered.content, 'utf8')
  const message = `skill: ${draft.name}`
  const commit = config.autoCommit ? commitPaths(repoPath, [filePath], message) : undefined
  return {
    path: filePath,
    commit,
    branch: currentBranch(repoPath),
    message,
    name: rendered.name,
    description: rendered.description,
    whenToUse: rendered.whenToUse,
    instructions: rendered.instructions,
    content: rendered.content,
    ...(rendered.tags === undefined ? {} : { tags: rendered.tags }),
  }
}

/** Conflict status codes git reports for an unmerged path (git status --porcelain). */
const CONFLICT_CODES = /^(UU|AA|DD|AU|UA|DU|UD)/

/**
 * List the working-tree paths git currently reports as unmerged (a conflict from
 * a merge/rebase/cherry-pick in progress on the memory repository).
 */
export function listConflicts(repoPath: string): string[] {
  const porcelain = runGit(repoPath, ['status', '--porcelain'])
  const conflicts: string[] = []
  for (const line of porcelain.split(/\r?\n/).filter(Boolean)) {
    if (CONFLICT_CODES.test(line.slice(0, 2))) conflicts.push(line.slice(3).replace(/\"/g, ''))
  }
  return conflicts
}

export interface RevertResult {
  dryRun: boolean
  reverted: boolean
  commit: string | undefined
  wouldChange: string[]
}

/**
 * Roll back one memory/skill commit by reverting it. Only commits whose changes
 * are entirely inside the memory and skills roots are accepted; anything else is
 * rejected so the revert can never touch unrelated repo files. In dry-run mode
 * nothing is written and the files that would change are returned.
 */
export function revertCommit(config: ResolvedConfig, ref: string, dryRun: boolean): RevertResult {
  const repoPath = openRepository(config)
  runGit(repoPath, ['rev-parse', '--verify', ref + '^{commit}'])
  const changed = runGit(repoPath, ['show', '--format=', '--name-only', ref]).split(/\r?\n/).filter(Boolean)
  const allowed = (path: string): boolean => {
    return path === config.memoryRoot || path === config.skillsRoot
      || path.startsWith(config.memoryRoot + '/') || path.startsWith(config.skillsRoot + '/')
  }
  const disallowed = changed.filter((path) => !allowed(path))
  if (disallowed.length > 0) {
    throw new GitEvolutionError('ref touches files outside the memory/skills roots: ' + disallowed.join(', '), 'REF_OUTSIDE_ROOTS')
  }
  if (dryRun) return { dryRun: true, reverted: false, commit: undefined, wouldChange: changed }
  runGit(repoPath, ['revert', '--no-commit', ref])
  const staged = runGit(repoPath, ['diff', '--cached', '--name-only']).split(/\r?\n/).filter(Boolean)
  const stagedDisallowed = staged.filter((path) => !allowed(path))
  if (stagedDisallowed.length > 0) {
    runGit(repoPath, ['revert', '--abort'])
    throw new GitEvolutionError('revert would touch files outside the memory/skills roots: ' + stagedDisallowed.join(', '), 'REF_OUTSIDE_ROOTS')
  }
  runGit(repoPath, ['commit', '--no-gpg-sign', '--message', 'revert(' + ref + '): ' + changed.join(', ')])
  return { dryRun: false, reverted: true, commit: currentHead(repoPath), wouldChange: changed }
}
export type ConflictStrategy = 'ours' | 'theirs' | 'both'

/**
 * Resolve one unresolved conflict by taking a side. 'ours'/'theirs' set the path
 * to that side; 'both' combines both sides in the working tree (which may still
 * contain merge markers if the sides cannot be reconciled). The path is then
 * staged, removing it from the conflict set.
 * @returns the resolved path.
 */
export function resolveConflict(repoPath: string, path: string, strategy: ConflictStrategy): string {
  const conflicts = listConflicts(repoPath)
  if (!conflicts.includes(path)) {
    throw new GitEvolutionError("'" + path + "' is not an unresolved conflict", 'NOT_A_CONFLICT')
  }
  if (strategy === 'ours' || strategy === 'theirs') {
    runGit(repoPath, ['checkout', '--' + strategy, '--', path])
  } else {
    runGit(repoPath, ['checkout', '--merge', '--', path])
  }
  runGit(repoPath, ['add', '--', path])
  return path
}
export interface BranchDiffResult {
  refA: string
  refB: string
  stat: string
  files: string[]
}

/**
 * Diff the working tree (or two branch/commit refs) in the memory repository.
 * Returns the stat line plus the changed file list so the agent can compare
 * memory/skill changes across branches.
 */
export function branchDiff(repoPath: string, a: string, b?: string): BranchDiffResult {
  const refB = b ?? 'HEAD'
  const stat = runGit(repoPath, ['diff', '--stat', a, refB]).trim()
  const files = runGit(repoPath, ['diff', '--name-only', a, refB]).split(/\r?\n/).filter(Boolean)
  return { refA: a, refB, stat, files }
}

