import { test } from 'node:test'
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { GitMemoryCore } from '../src/core.js'

function initRepo(repo: string): void {
  mkdirSync(repo, { recursive: true })
  execFileSync('git', ['init', '-q'], { cwd: repo })
  execFileSync('git', ['config', 'user.email', 't@t'], { cwd: repo })
  execFileSync('git', ['config', 'user.name', 't'], { cwd: repo })
  execFileSync('git', ['config', 'commit.gpgsign', 'false'], { cwd: repo })
}

function isolateHome(dir: string): () => void {
  const home = join(dir, 'home')
  mkdirSync(home, { recursive: true })
  const prev = process.env['DSH_HOME']
  process.env['DSH_HOME'] = home
  return () => {
    if (prev === undefined) delete process.env['DSH_HOME']
    else process.env['DSH_HOME'] = prev
  }
}

test('digest injects only persona and warning records', () => {
  const dir = mkdtempSync(join(tmpdir(), 'evolve-digest-'))
  const repo = join(dir, 'repo')
  initRepo(repo)
  const restore = isolateHome(dir)
  try {
    const core = new GitMemoryCore({ repoPath: repo, autoCommit: false })
    core.remember({ kind: 'persona', title: 'Name', content: 'call me Ada' })
    core.remember({ kind: 'warning', title: 'Rule', content: 'always back up' })
    core.remember({ kind: 'note', title: 'Misc', content: 'unrelated note' })
    const digest = core.digest()
    assert.match(digest, /Ada/)
    assert.match(digest, /always back up/)
    assert.doesNotMatch(digest, /unrelated note/)
  } finally {
    restore()
    try { rmSync(dir, { recursive: true, force: true }) } catch { /* Windows */ }
  }
})

test('digest respects digestMaxRecords and digestMaxChars', () => {
  const dir = mkdtempSync(join(tmpdir(), 'evolve-digest-budget-'))
  const repo = join(dir, 'repo')
  initRepo(repo)
  const restore = isolateHome(dir)
  try {
    const core = new GitMemoryCore({ repoPath: repo, autoCommit: false, digestMaxRecords: 1 })
    core.remember({ kind: 'persona', title: 'P1', content: 'first persona' })
    core.remember({ kind: 'warning', title: 'W1', content: 'second warning' })
    const digest = core.digest()
    assert.match(digest, /second warning/)
    assert.doesNotMatch(digest, /first persona/)

    const narrow = new GitMemoryCore({ repoPath: repo, autoCommit: false, digestMaxChars: 12 })
    const text = narrow.digest()
    assert.ok(text.length <= 12)
  } finally {
    restore()
    try { rmSync(dir, { recursive: true, force: true }) } catch { /* Windows */ }
  }
})
