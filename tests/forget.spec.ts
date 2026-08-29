import { test } from 'node:test'
import assert from 'node:assert/strict'
import { existsSync, mkdirSync, mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { execFileSync } from 'node:child_process'
import { writeMemoryRecord } from '../src/git.js'
import { forgetMemory, restoreMemory } from '../src/forget.js'
import { memoryTimeline, recall } from '../src/memory.js'
import { clearMemoryIndexCache } from '../src/memory-index.js'

function buildConfig(repoPath: string, archiveRoot = '.archive') {
  return {
    repoPath,
    repoUrl: 'https://example.com/repo.git',
    auth: { mode: 'ssh' as const, sshCommand: 'ssh', tokenEnv: 'GITHUB_TOKEN', token: '', username: 'x-access-token' },
    memoryRoot: '.mem',
    skillsRoot: '.skills',
    defaultBranch: 'main',
    remoteName: 'origin',
    autoCommit: false,
    archiveRoot,
    recallTopK: 10,
    recallMinScore: 0,
    recallMaxChars: 8000,
  }
}

function initRepo(repo: string): void {
  mkdirSync(repo, { recursive: true })
  execFileSync('git', ['init', '-q'], { cwd: repo })
  execFileSync('git', ['config', 'user.email', 't@t'], { cwd: repo })
  execFileSync('git', ['config', 'user.name', 't'], { cwd: repo })
  execFileSync('git', ['config', 'commit.gpgsign', 'false'], { cwd: repo })
}

test('forget soft-deletes to archiveRoot and restore brings it back', () => {
  const dir = mkdtempSync(join(tmpdir(), 'evolve-forget-'))
  const repo = join(dir, 'repo')
  initRepo(repo)
  try {
    clearMemoryIndexCache()
    const config = buildConfig(repo)
    const record = writeMemoryRecord(config, { kind: 'note', title: 'Temp note', content: 'hold this for now' })
    clearMemoryIndexCache()

    const forgotten = forgetMemory(config, record.id)
    assert.equal(forgotten.id, record.id)
    assert.ok(forgotten.archivedPath.includes(config.archiveRoot))
    assert.equal(existsSync(record.path), false)
    assert.equal(existsSync(forgotten.archivedPath), true)

    // archived records leave the retrieval surface
    clearMemoryIndexCache()
    assert.equal(recall(config, {}).length, 0)
    assert.equal(memoryTimeline(config).length, 0)

    const restored = restoreMemory(config, record.id)
    assert.equal(restored.id, record.id)
    assert.ok(restored.restoredPath.includes(config.memoryRoot))
    assert.equal(existsSync(restored.restoredPath), true)

    clearMemoryIndexCache()
    assert.equal(recall(config, {}).length, 1)
  } finally {
    try { rmSync(dir, { recursive: true, force: true }) } catch { /* Windows */ }
  }
})

test('forget honors a custom archiveRoot and rejects unknown ids', () => {
  const dir = mkdtempSync(join(tmpdir(), 'evolve-forget-root-'))
  const repo = join(dir, 'repo')
  initRepo(repo)
  try {
    clearMemoryIndexCache()
    const config = buildConfig(repo, 'custom-archive')
    const record = writeMemoryRecord(config, { kind: 'note', title: 'One', content: 'first' })
    clearMemoryIndexCache()
    const forgotten = forgetMemory(config, record.id)
    assert.ok(forgotten.archivedPath.includes('custom-archive'))
    assert.throws(() => forgetMemory(config, 'missing-id'), /no active memory record/)
    assert.throws(() => restoreMemory(config, 'missing-id'), /no archived memory record/)
  } finally {
    try { rmSync(dir, { recursive: true, force: true }) } catch { /* Windows */ }
  }
})

test('expiresAt-expired records are filtered from retrieval by default', () => {
  const dir = mkdtempSync(join(tmpdir(), 'evolve-expiry-'))
  const repo = join(dir, 'repo')
  initRepo(repo)
  try {
    clearMemoryIndexCache()
    const config = buildConfig(repo)
    writeMemoryRecord(config, { kind: 'note', title: 'Expired', content: 'gone', expiresAt: '2000-01-01T00:00:00.000Z' })
    writeMemoryRecord(config, { kind: 'note', title: 'Fresh', content: 'here', expiresAt: '2099-01-01T00:00:00.000Z' })
    clearMemoryIndexCache()

    const hits = recall(config, {})
    assert.equal(hits.length, 1)
    assert.equal(hits[0]?.title, 'Fresh')
    assert.equal(memoryTimeline(config).length, 1)
  } finally {
    try { rmSync(dir, { recursive: true, force: true }) } catch { /* Windows */ }
  }
})
