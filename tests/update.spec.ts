import { test } from 'node:test'
import assert from 'node:assert/strict'
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { execFileSync } from 'node:child_process'
import { writeMemoryRecord } from '../src/git.js'
import { updateMemory } from '../src/update.js'
import { recall, scanMemory } from '../src/memory.js'
import { clearMemoryIndexCache, parseFrontmatterFields } from '../src/memory-index.js'

function buildConfig(repoPath: string) {
  return {
    repoPath,
    repoUrl: 'https://example.com/repo.git',
    auth: { mode: 'ssh' as const, sshCommand: 'ssh', tokenEnv: 'GITHUB_TOKEN', token: '', username: 'x-access-token' },
    memoryRoot: '.mem',
    skillsRoot: '.skills',
    defaultBranch: 'main',
    remoteName: 'origin',
    autoCommit: false,
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

test('writeMemoryRecord writes stable id and version-chain frontmatter', () => {
  const dir = mkdtempSync(join(tmpdir(), 'evolve-update-write-'))
  const repo = join(dir, 'repo')
  initRepo(repo)
  try {
    const config = buildConfig(repo)
    const record = writeMemoryRecord(config, { kind: 'persona', title: 'Location', content: 'lives in Shanghai' })
    assert.ok(record.id.length > 0)
    assert.equal(record.status, 'active')
    assert.equal(record.updatedAt, record.createdAt)
    const raw = readFileSync(record.path, 'utf8')
    assert.match(raw, /id:/)
    assert.match(raw, /status: "active"/)
    assert.match(raw, /updatedAt:/)
    const fm = parseFrontmatterFields(raw)
    assert.equal(fm['id'], record.id)
    assert.equal(fm['status'], 'active')
  } finally {
    try { rmSync(dir, { recursive: true, force: true }) } catch { /* Windows */ }
  }
})

test('update overwrite supersedes the old record without deleting it', () => {
  const dir = mkdtempSync(join(tmpdir(), 'evolve-update-overwrite-'))
  const repo = join(dir, 'repo')
  initRepo(repo)
  try {
    clearMemoryIndexCache()
    const config = buildConfig(repo)
    const original = writeMemoryRecord(config, { kind: 'persona', title: 'Location', content: 'lives in Shanghai' })
    clearMemoryIndexCache()
    const updated = updateMemory(config, original.id, { mode: 'overwrite', content: 'lives in Beijing' })

    assert.notEqual(updated.id, original.id)
    assert.equal(updated.status, 'active')
    assert.equal(updated.supersedes, original.id)

    // the old file still exists, now superseded and pointing at the new version
    assert.equal(existsSync(original.path), true)
    const oldFm = parseFrontmatterFields(readFileSync(original.path, 'utf8'))
    assert.equal(oldFm['status'], 'superseded')
    assert.equal(oldFm['supersededBy'], updated.id)

    // retrieval hides the superseded record by default
    clearMemoryIndexCache()
    assert.equal(scanMemory(config).length, 2)
    const active = recall(config, {})
    assert.equal(active.length, 1)
    assert.equal(active[0]?.id, updated.id)
    assert.equal(active[0]?.content, 'lives in Beijing')
  } finally {
    try { rmSync(dir, { recursive: true, force: true }) } catch { /* Windows */ }
  }
})

test('update merge appends content and unions tags', () => {
  const dir = mkdtempSync(join(tmpdir(), 'evolve-update-merge-'))
  const repo = join(dir, 'repo')
  initRepo(repo)
  try {
    clearMemoryIndexCache()
    const config = buildConfig(repo)
    const original = writeMemoryRecord(config, { kind: 'note', title: 'Rules', content: 'rule one', tags: ['a'] })
    clearMemoryIndexCache()
    const updated = updateMemory(config, original.id, { mode: 'merge', content: 'rule two', tags: ['b'] })

    assert.equal(updated.content, 'rule one\n\nrule two')
    assert.deepEqual(updated.tags, ['a', 'b'])
    assert.equal(updated.supersedes, original.id)

    const newFm = parseFrontmatterFields(readFileSync(updated.path, 'utf8'))
    assert.equal(newFm['supersedes'], original.id)
    assert.equal(newFm['status'], 'active')
    assert.ok(newFm['updatedAt'] !== undefined)
  } finally {
    try { rmSync(dir, { recursive: true, force: true }) } catch { /* Windows */ }
  }
})

test('update of a missing or superseded id is rejected', () => {
  const dir = mkdtempSync(join(tmpdir(), 'evolve-update-missing-'))
  const repo = join(dir, 'repo')
  initRepo(repo)
  try {
    clearMemoryIndexCache()
    const config = buildConfig(repo)
    const original = writeMemoryRecord(config, { kind: 'note', title: 'One', content: 'first' })
    clearMemoryIndexCache()
    updateMemory(config, original.id, { mode: 'overwrite', content: 'second' })
    clearMemoryIndexCache()
    assert.throws(() => updateMemory(config, original.id, { content: 'again' }), /no active memory record/)
  } finally {
    try { rmSync(dir, { recursive: true, force: true }) } catch { /* Windows */ }
  }
})
