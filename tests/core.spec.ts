import { test } from 'node:test'
import assert from 'node:assert/strict'
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { GitMemoryCore } from '../src/core.js'

const SRC_DIR = fileURLToPath(new URL('../src', import.meta.url))

/** Core modules that must never import any @deepseek-ai/* package. */
const CORE_FILES = ['core.ts', 'git.ts', 'memory.ts', 'memory-index.ts', 'update.ts', 'forget.ts', 'privacy.ts', 'strategy.ts', 'skill.ts', 'types.ts', 'defaults.ts', 'config.ts', 'loopback.ts']

function buildConfig(repoPath: string, repoUrl: string) {
  return {
    repoPath,
    repoUrl,
    auth: { mode: 'ssh' as const, sshCommand: 'ssh', tokenEnv: 'GITHUB_TOKEN', token: '', username: 'x-access-token' },
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

function initBareRemote(): { remote: string; clone: string; base: string } {
  const base = mkdtempSync(join(tmpdir(), 'dsh-evolve-remote-'))
  const seed = join(base, 'seed')
  const remote = join(base, 'remote.git')
  const clone = join(base, 'clone')
  execFileSync('git', ['init', '-b', 'main', seed], { stdio: 'pipe' })
  execFileSync('git', ['config', 'user.name', 't'], { cwd: seed })
  execFileSync('git', ['config', 'user.email', 't@t'], { cwd: seed })
  writeFileSync(join(seed, 'README.md'), '# remote\n', 'utf8')
  execFileSync('git', ['add', 'README.md'], { cwd: seed })
  execFileSync('git', ['commit', '-m', 'init'], { cwd: seed, stdio: 'pipe' })
  execFileSync('git', ['init', '--bare', remote], { stdio: 'pipe' })
  execFileSync('git', ['remote', 'add', 'origin', remote], { cwd: seed })
  execFileSync('git', ['push', '-u', 'origin', 'main'], { cwd: seed, stdio: 'pipe' })
  execFileSync('git', ['clone', remote, clone], { stdio: 'pipe' })
  return { remote, clone, base }
}

/** Point DSH_HOME at an empty temp dir so the core reads no real config file. */
function isolateHome(dir: string): { home: string; restore: () => void } {
  const home = join(dir, 'home')
  mkdirSync(home, { recursive: true })
  const prev = process.env['DSH_HOME']
  process.env['DSH_HOME'] = home
  return {
    home,
    restore: () => {
      if (prev === undefined) delete process.env['DSH_HOME']
      else process.env['DSH_HOME'] = prev
    },
  }
}

test('core modules import no DSH or Cordis packages', () => {
  for (const file of CORE_FILES) {
    const source = readFileSync(join(SRC_DIR, file), 'utf8')
    assert.doesNotMatch(source, /(?:from\s+['"]|import\s*['"])@deepseek-ai\//m, file + ' must not import @deepseek-ai/*')
  }
})

test('GitMemoryCore remembers, recalls, and timelines without a DSH runtime', () => {
  const dir = mkdtempSync(join(tmpdir(), 'evolve-core-'))
  const repo = join(dir, 'repo')
  initRepo(repo)
  const iso = isolateHome(dir)
  try {
    const core = new GitMemoryCore(buildConfig(repo, 'https://example.com/repo.git'))
    const record = core.remember({ kind: 'note', title: 'Deploy port 8080', content: 'use port 8080', tags: ['deploy'] })
    assert.match(record.path, /\.md$/)
    const timeline = core.timeline()
    assert.equal(timeline.length, 1)
    assert.equal(timeline[0]?.title, 'Deploy port 8080')
    assert.equal(core.recall({ query: '8080' }).length, 1)
    assert.equal(core.recall({ query: 'missing' }).length, 0)
  } finally {
    iso.restore()
    try { rmSync(dir, { recursive: true, force: true }) } catch { /* Windows may hold the dir */ }
  }
})

test('GitMemoryCore drafts, lists, and promotes skills', () => {
  const dir = mkdtempSync(join(tmpdir(), 'evolve-core-skill-'))
  const repo = join(dir, 'repo')
  initRepo(repo)
  const iso = isolateHome(dir)
  try {
    const core = new GitMemoryCore(buildConfig(repo, 'https://example.com/repo.git'))
    const draft = core.saveSkillDraftFromRecord({ kind: 'warning', title: 'Retry backoff', content: 'Use exponential backoff.' })
    assert.match(draft.name, /^skill-[a-z0-9-]+$/)
    const listed = core.listSkillDrafts()
    assert.equal(listed.length, 1)
    assert.equal(listed[0]?.name, draft.name)
    const promoted = core.promoteSkillDraft(draft.name)
    assert.equal(promoted.targetPath, join(repo, '.skills', 'enabled', draft.name, 'SKILL.md'))
    assert.equal(existsSync(promoted.targetPath), true)
  } finally {
    iso.restore()
    try { rmSync(dir, { recursive: true, force: true }) } catch { /* Windows */ }
  }
})

test('GitMemoryCore connects, reports status, and lists branches', () => {
  const { remote, clone, base } = initBareRemote()
  const iso = isolateHome(base)
  try {
    const core = new GitMemoryCore(buildConfig(clone, remote))
    const repoPath = core.connect()
    assert.equal(repoPath, clone)
    assert.equal(core.currentBranch(repoPath), 'main')
    assert.deepEqual(core.branches(repoPath), ['main'])
    assert.equal(core.status(repoPath).clean, true)
  } finally {
    iso.restore()
    try { rmSync(base, { recursive: true, force: true }) } catch { /* Windows */ }
  }
})
