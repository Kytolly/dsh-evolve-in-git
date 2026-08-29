import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { execFileSync } from 'node:child_process'
import { recall } from '../src/memory.js'
import { clearMemoryIndexCache, getMemoryIndex, memoryIndexSignature } from '../src/memory-index.js'

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

function writeMemo(repo: string, kind: string, title: string, content: string, createdAt: string, tags?: string[]): void {
  const dir = join(repo, '.mem', kind)
  mkdirSync(dir, { recursive: true })
  const tagsLine = tags === undefined || tags.length === 0 ? '' : 'tags: [' + tags.map((t) => JSON.stringify(t)).join(', ') + ']\n'
  const body = '---\nkind: ' + kind + '\ntitle: ' + JSON.stringify(title) + '\ncreatedAt: ' + JSON.stringify(createdAt) + '\n' + tagsLine + '---\n\n' + content + '\n'
  writeFileSync(join(dir, createdAt.replace(/:/g, '-') + '-' + title.replace(/\s+/g, '-') + '.md'), body)
}

test('recall returns topK results with a score and content', () => {
  const dir = mkdtempSync(join(tmpdir(), 'evolve-recall-'))
  const repo = join(dir, 'repo')
  initRepo(repo)
  try {
    writeMemo(repo, 'note', 'First', 'content one', '2026-01-01T00:00:00.000Z')
    writeMemo(repo, 'note', 'Second', 'content two', '2026-01-02T00:00:00.000Z')
    writeMemo(repo, 'note', 'Third', 'content three', '2026-01-03T00:00:00.000Z')
    const config = buildConfig(repo)
    const hits = recall(config, {}, { topK: 2 })
    assert.equal(hits.length, 2)
    // newest first when scores tie
    assert.equal(hits[0]?.title, 'Third')
    assert.equal(hits[1]?.title, 'Second')
    for (const hit of hits) {
      assert.equal(typeof hit.score, 'number')
      assert.ok(hit.content.length > 0)
    }
  } finally {
    try { rmSync(dir, { recursive: true, force: true }) } catch { /* Windows */ }
  }
})

test('recall minScore filters low-scoring records', () => {
  const dir = mkdtempSync(join(tmpdir(), 'evolve-recall-score-'))
  const repo = join(dir, 'repo')
  initRepo(repo)
  try {
    writeMemo(repo, 'note', 'Alpha note', 'about alpha', '2026-01-01T00:00:00.000Z')
    writeMemo(repo, 'note', 'Beta note', 'about beta', '2026-01-02T00:00:00.000Z')
    const config = buildConfig(repo)
    const hits = recall(config, { query: 'alpha' }, { minScore: 1 })
    assert.equal(hits.length, 1)
    assert.equal(hits[0]?.title, 'Alpha note')
  } finally {
    try { rmSync(dir, { recursive: true, force: true }) } catch { /* Windows */ }
  }
})

test('recall maxChars and includeContent bound returned content', () => {
  const dir = mkdtempSync(join(tmpdir(), 'evolve-recall-chars-'))
  const repo = join(dir, 'repo')
  initRepo(repo)
  try {
    writeMemo(repo, 'note', 'Long A', 'aaaaaaaaaaaaaaaaaaaa', '2026-01-01T00:00:00.000Z')
    writeMemo(repo, 'note', 'Long B', 'bbbbbbbbbbbbbbbbbbbb', '2026-01-02T00:00:00.000Z')
    const config = buildConfig(repo)
    const bounded = recall(config, {}, { maxChars: 15 })
    assert.equal(bounded.length, 2)
    assert.equal(bounded[0]?.content.length, 15)
    assert.equal(bounded[1]?.content, '')
    const noContent = recall(config, {}, { includeContent: false })
    assert.ok(noContent.every((hit) => hit.content === ''))
  } finally {
    try { rmSync(dir, { recursive: true, force: true }) } catch { /* Windows */ }
  }
})

test('memory index cache invalidates on file mtime and repository HEAD changes', () => {
  const dir = mkdtempSync(join(tmpdir(), 'evolve-index-cache-'))
  const repo = join(dir, 'repo')
  initRepo(repo)
  try {
    clearMemoryIndexCache()
    const config = buildConfig(repo)
    writeMemo(repo, 'note', 'First', 'one', '2026-01-01T00:00:00.000Z')
    const sig1 = memoryIndexSignature(config)
    assert.equal(getMemoryIndex(config).length, 1)
    // editing an existing record changes its mtime -> signature changes
    const first = join(repo, '.mem', 'note', '2026-01-01T00-00-00.000Z-First.md')
    writeFileSync(first, '---\nkind: note\ntitle: "First edited"\ncreatedAt: "2026-01-01T00:00:00.000Z"\n---\n\nedited\n')
    const sig2 = memoryIndexSignature(config)
    assert.notEqual(sig1, sig2)
    assert.equal(getMemoryIndex(config)[0]?.title, 'First edited')

    // a HEAD move (non-memory commit) also invalidates even though mtimes are unchanged
    execFileSync('git', ['add', '.'], { cwd: repo })
    execFileSync('git', ['commit', '-q', '-m', 'mem'], { cwd: repo })
    const sig3 = memoryIndexSignature(config)
    writeFileSync(join(repo, 'README.md'), 'x\n')
    execFileSync('git', ['add', 'README.md'], { cwd: repo })
    execFileSync('git', ['commit', '-q', '-m', 'docs'], { cwd: repo })
    const sig4 = memoryIndexSignature(config)
    assert.notEqual(sig3, sig4)
  } finally {
    try { rmSync(dir, { recursive: true, force: true }) } catch { /* Windows */ }
  }
})
