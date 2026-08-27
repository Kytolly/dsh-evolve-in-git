import { test } from 'node:test'
import assert from 'node:assert/strict'
import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { execFileSync } from 'node:child_process'
import { listConflicts, revertCommit } from '../lib/git.js'
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

function initRepo(repo: string): void {
  mkdirSync(repo, { recursive: true })
  execFileSync('git', ['init', '-q'], { cwd: repo })
  execFileSync('git', ['config', 'user.email', 't@t'], { cwd: repo })
  execFileSync('git', ['config', 'user.name', 't'], { cwd: repo })
  execFileSync('git', ['config', 'commit.gpgsign', 'false'], { cwd: repo })
}

test('revertCommit rolls back a memory commit and rejects non-memory refs', () => {
  const dir = mkdtempSync(join(tmpdir(), 'evolve-revert-'))
  const repo = join(dir, 'repo')
  initRepo(repo)
  const config = buildConfig(repo)
  try {
    // a memory commit that only touches the memory root
    mkdirSync(join(repo, '.mem'), { recursive: true })
    writeFileSync(join(repo, '.mem', 'a.md'), 'lesson\n')
    execFileSync('git', ['add', '.mem/a.md'], { cwd: repo })
    execFileSync('git', ['commit', '-q', '-m', 'memory: a'], { cwd: repo })
    const head = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: repo }).toString().trim()

    const dry = revertCommit(config, head, true)
    assert.equal(dry.dryRun, true)
    assert.deepEqual(dry.wouldChange, ['.mem/a.md'])
    const after = revertCommit(config, head, false)
    assert.equal(after.reverted, true)
    assert.ok(after.commit)
    assert.equal(existsSync(join(repo, '.mem', 'a.md')), false)

    // a commit that touches a non-memory file must be rejected
    writeFileSync(join(repo, 'README.md'), 'hi\n')
    execFileSync('git', ['add', 'README.md'], { cwd: repo })
    execFileSync('git', ['commit', '-q', '-m', 'docs'], { cwd: repo })
    const docsHead = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: repo }).toString().trim()
    assert.throws(() => revertCommit(config, docsHead, false))
  } finally {
    try { rmSync(dir, { recursive: true, force: true }) } catch { /* Windows may hold the temp dir; leave it */ }
  }
})

test('listConflicts reports an in-progress merge conflict', () => {
  const dir = mkdtempSync(join(tmpdir(), 'evolve-conflict-'))
  const repo = join(dir, 'repo')
  initRepo(repo)
  try {
    mkdirSync(join(repo, '.mem'), { recursive: true })
    writeFileSync(join(repo, '.mem', 'shared.md'), 'base\n')
    execFileSync('git', ['add', '.'], { cwd: repo })
    execFileSync('git', ['commit', '-q', '-m', 'base'], { cwd: repo })
    execFileSync('git', ['checkout', '-q', '-b', 'feature'], { cwd: repo })
    writeFileSync(join(repo, '.mem', 'shared.md'), 'feature\n')
    execFileSync('git', ['add', '.'], { cwd: repo })
    execFileSync('git', ['commit', '-q', '-m', 'feature'], { cwd: repo })
    execFileSync('git', ['checkout', '-q', 'main'], { cwd: repo })
    writeFileSync(join(repo, '.mem', 'shared.md'), 'main\n')
    execFileSync('git', ['add', '.'], { cwd: repo })
    execFileSync('git', ['commit', '-q', '-m', 'main'], { cwd: repo })
    // merge conflicts; git exits non-zero, which is expected
    try { execFileSync('git', ['merge', 'feature'], { cwd: repo }) } catch { /* conflict expected */ }
    const conflicts = listConflicts(repo)
    assert.ok(conflicts.includes('.mem/shared.md'))
  } finally {
    try { execFileSync('git', ['merge', '--abort'], { cwd: repo }) } catch { /* ignore */ }
    try { rmSync(dir, { recursive: true, force: true }) } catch { /* Windows may hold the temp dir; leave it for the OS/cleanup */ }
  }
})