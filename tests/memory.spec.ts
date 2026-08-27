import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { execFileSync } from 'node:child_process'
import { memoryTimeline, searchMemory } from '../lib/memory.js'
import { branchDiff } from '../lib/git.js'
import type { ResolvedConfig } from '../lib/types.js'

function buildConfig(repoPath: string): ResolvedConfig {
  return {
    repoPath,
    repoUrl: 'https://example.com/repo.git',
    auth: { mode: 'ssh', sshCommand: 'ssh', tokenEnv: 'GITHUB_TOKEN', token: '', username: 'x-access-token' },
    memoryRoot: '.mem',
    skillsRoot: '.skills',
    defaultBranch: 'main',
    remoteName: 'origin',
    autoCommit: false,
  }
}

function writeMemo(repo: string, kind: string, title: string, content: string, createdAt: string, tags?: string[]): void {
  const dir = join(repo, '.mem', kind)
  mkdirSync(dir, { recursive: true })
  const tagsLine = tags === undefined ? '' : 'tags: [' + tags.map((t) => JSON.stringify(t)).join(', ') + ']\n'
  const body = '---\nkind: ' + kind + '\ntitle: ' + JSON.stringify(title) + '\ncreatedAt: ' + JSON.stringify(createdAt) + '\n' + tagsLine + '---\n\n' + content + '\n'
  writeFileSync(join(dir, createdAt.replace(/:/g, '-') + '-' + title.replace(/\s+/g, '-') + '.md'), body)
}

test('searchMemory and memoryTimeline scan the memory root', () => {
  const dir = mkdtempSync(join(tmpdir(), 'evolve-mem-'))
  const repo = join(dir, 'repo')
  mkdirSync(repo, { recursive: true })
  try {
    writeMemo(repo, 'note', 'Deploy port 8080', 'use port 8080', '2026-01-01T00:00:00.000Z', ['deploy'])
    writeMemo(repo, 'warning', 'Retry backoff', 'use exponential backoff', '2026-01-02T00:00:00.000Z', ['retry', 'http'])
    const config = buildConfig(repo)
    assert.equal(searchMemory(config, {}).length, 2)
    const byPort = searchMemory(config, { query: '8080' })
    assert.equal(byPort.length, 1)
    assert.equal(byPort[0].title, 'Deploy port 8080')
    assert.equal(searchMemory(config, { kind: 'warning' }).length, 1)
    assert.equal(searchMemory(config, { tag: 'retry' }).length, 1)
    const timeline = memoryTimeline(config)
    assert.equal(timeline[0].title, 'Retry backoff')
    assert.equal(timeline[0].createdAt, '2026-01-02T00:00:00.000Z')
  } finally { try { rmSync(dir, { recursive: true, force: true }) } catch { /* Windows lock */ } }
})

test('branchDiff returns the stat and changed files between refs', () => {
  const dir = mkdtempSync(join(tmpdir(), 'evolve-diff-'))
  const repo = join(dir, 'repo')
  mkdirSync(repo, { recursive: true })
  execFileSync('git', ['init', '-q'], { cwd: repo })
  execFileSync('git', ['config', 'user.email', 't@t'], { cwd: repo })
  execFileSync('git', ['config', 'user.name', 't'], { cwd: repo })
  execFileSync('git', ['config', 'commit.gpgsign', 'false'], { cwd: repo })
  try {
    writeFileSync(join(repo, 'a.md'), 'one\n')
    execFileSync('git', ['add', '.'], { cwd: repo })
    execFileSync('git', ['commit', '-q', '-m', 'a'], { cwd: repo })
    writeFileSync(join(repo, 'a.md'), 'two\n')
    writeFileSync(join(repo, 'b.md'), 'bee\n')
    execFileSync('git', ['add', '.'], { cwd: repo })
    execFileSync('git', ['commit', '-q', '-m', 'b'], { cwd: repo })
    const first = execFileSync('git', ['rev-parse', 'HEAD~1'], { cwd: repo }).toString().trim()
    const result = branchDiff(repo, first, 'HEAD')
    assert.ok(result.files.includes('a.md'))
    assert.ok(result.files.includes('b.md'))
    assert.ok(result.stat.length > 0)
  } finally { try { rmSync(dir, { recursive: true, force: true }) } catch { /* Windows lock */ } }
})