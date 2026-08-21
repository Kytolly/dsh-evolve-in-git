import { mkdirSync, writeFileSync } from 'node:fs'
import { existsSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import { dirname, join, resolve } from 'node:path'
import type { CommittedArtifact, GitStatus, MemoryRecord, MemoryRecordInput, ResolvedConfig, SkillDraft, SkillDraftInput } from './types.js'
import { renderSkillDraft, sanitizeSegment, slugify } from './strategy.js'

export class GitEvolutionError extends Error {
  constructor(message: string, public readonly code: string, cause?: unknown) {
    super(message)
    this.name = 'GitEvolutionError'
    if (cause !== undefined) {
      this.cause = cause
    }
  }
}

function runGit(repoPath: string, args: readonly string[]): string {
  const result = spawnSync('git', ['-C', repoPath, ...args], { encoding: 'utf8' })
  if (result.error !== undefined) {
    throw new GitEvolutionError(`git ${args.join(' ')} failed: ${result.error.message}`, 'GIT_SPAWN_FAILED', result.error)
  }
  if (result.status !== 0) {
    throw new GitEvolutionError(result.stderr.trim() || `git ${args.join(' ')} failed`, 'GIT_COMMAND_FAILED')
  }
  return String(result.stdout ?? '').trim()
}

export function ensureGitRepository(repoPath: string): string {
  const resolved = resolve(repoPath)
  if (!existsSync(join(resolved, '.git'))) {
    throw new GitEvolutionError(`not a git repository: ${resolved}`, 'GIT_REPOSITORY_MISSING')
  }
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

export function pushBranch(repoPath: string, branch: string, remote: string): void {
  runGit(repoPath, ['push', remote, branch])
}

export function fetchRemote(repoPath: string, remote: string): void {
  runGit(repoPath, ['fetch', remote])
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
  const repoPath = ensureGitRepository(config.repoPath)
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
  const repoPath = ensureGitRepository(config.repoPath)
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
