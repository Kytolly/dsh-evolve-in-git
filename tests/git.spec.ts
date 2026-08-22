import assert from 'node:assert/strict'
import { mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { execFileSync } from 'node:child_process'
import test from 'node:test'
import { connectRepository, currentBranch, gitStatus, listBranches, writeMemoryRecord } from '../src/git.js'
import { branchNameForRecord, draftSkillFromRecord, memoryPreview, renderSkillDraft, shouldOfferSkillPromotion, slugify, suggestEvolution } from '../src/strategy.js'

function initRepo(): string {
  const dir = mkdtempSync(join(tmpdir(), 'dsh-evolve-in-git-'))
  execFileSync('git', ['init', '-b', 'main'], { cwd: dir, stdio: 'pipe' })
  execFileSync('git', ['config', 'user.name', 'Codex'], { cwd: dir })
  execFileSync('git', ['config', 'user.email', 'codex@example.com'], { cwd: dir })
  writeFileSync(join(dir, 'README.md'), '# repo\n', 'utf8')
  execFileSync('git', ['add', 'README.md'], { cwd: dir })
  execFileSync('git', ['commit', '-m', 'init'], { cwd: dir, stdio: 'pipe' })
  return dir
}

function initBareRemote(): { remote: string; clone: string } {
  const base = mkdtempSync(join(tmpdir(), 'dsh-evolve-remote-'))
  const seed = join(base, 'seed')
  const remote = join(base, 'remote.git')
  const clone = join(base, 'clone')
  execFileSync('git', ['init', '-b', 'main', seed], { stdio: 'pipe' })
  execFileSync('git', ['config', 'user.name', 'Codex'], { cwd: seed })
  execFileSync('git', ['config', 'user.email', 'codex@example.com'], { cwd: seed })
  writeFileSync(join(seed, 'README.md'), '# remote\n', 'utf8')
  execFileSync('git', ['add', 'README.md'], { cwd: seed })
  execFileSync('git', ['commit', '-m', 'init'], { cwd: seed, stdio: 'pipe' })
  execFileSync('git', ['init', '--bare', remote], { stdio: 'pipe' })
  execFileSync('git', ['remote', 'add', 'origin', remote], { cwd: seed })
  execFileSync('git', ['push', '-u', 'origin', 'main'], { cwd: seed, stdio: 'pipe' })
  execFileSync('git', ['clone', remote, clone], { stdio: 'pipe' })
  return { remote, clone }
}

test('strategy helpers build stable branch and skill drafts', () => {
  const record = {
    kind: 'warning' as const,
    title: 'Learned pitfall',
    content: 'Always ask before promoting a repeated mistake into a skill.',
    tags: ['memory', 'skill'],
    source: 'session-1',
  }
  assert.equal(slugify('Hello, World!'), 'hello-world')
  assert.equal(branchNameForRecord(record), 'evolve/warning/learned-pitfall')
  assert.equal(shouldOfferSkillPromotion(record), true)
  assert.match(memoryPreview(record), /Always ask before promoting/)
  assert.match(renderSkillDraft(draftSkillFromRecord(record)).content, /Instructions/)
  assert.match(suggestEvolution(record).question, /skill/)
})

test('git helpers can write memory records into a real repository', () => {
  const repo = initRepo()
  const result = writeMemoryRecord({
    repoPath: repo,
    memoryRoot: '.dsh-evolve/memory',
    skillsRoot: '.dsh-evolve/skills',
    defaultBranch: 'main',
    remoteName: 'origin',
    autoCommit: true,
  }, {
    kind: 'note',
    title: 'First note',
    content: 'This repository records memory as Git history.',
    tags: ['history'],
  })

  assert.ok(result.path.includes('.dsh-evolve'))
  assert.equal(currentBranch(repo), 'main')
  assert.deepEqual(listBranches(repo), ['main'])
  assert.equal(gitStatus(repo).clean, true)
})

test('connectRepository accepts a checkout whose origin matches the configured remote', () => {
  const { remote, clone } = initBareRemote()
  const connected = connectRepository({
    repoPath: clone,
    repoUrl: remote,
    auth: {
      mode: 'ssh',
      sshCommand: 'ssh',
      tokenEnv: 'GITHUB_TOKEN',
      token: '',
      username: 'x-access-token',
    },
    memoryRoot: '.dsh-evolve/memory',
    skillsRoot: '.dsh-evolve/skills',
    defaultBranch: 'main',
    remoteName: 'origin',
    autoCommit: true,
  })
  assert.equal(connected, clone)
})

test('connectRepository rejects a checkout whose origin does not match the configured remote', () => {
  const { clone } = initBareRemote()
  const wrongRemote = join(tmpdir(), 'different-remote.git')
  assert.throws(() => connectRepository({
    repoPath: clone,
    repoUrl: wrongRemote,
    auth: {
      mode: 'ssh',
      sshCommand: 'ssh',
      tokenEnv: 'GITHUB_TOKEN',
      token: '',
      username: 'x-access-token',
    },
    memoryRoot: '.dsh-evolve/memory',
    skillsRoot: '.dsh-evolve/skills',
    defaultBranch: 'main',
    remoteName: 'origin',
    autoCommit: true,
  }), /expected/)
})
