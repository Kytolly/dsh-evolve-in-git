import { test } from 'node:test'
import assert from 'node:assert/strict'
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { execFileSync } from 'node:child_process'
import { listEnabledSkills, listSkillDrafts, promoteSkillDraft, syncBundledSkills } from '../src/skill.js'
import { writeSkillDraft } from '../src/git.js'
import { draftSkillFromRecord } from '../src/strategy.js'
import type { ResolvedConfig } from '../src/types.js'

function buildConfig(repoPath: string, skillsRoot = '.skills'): ResolvedConfig {
  return {
    repoPath,
    repoUrl: 'https://example.com/repo.git',
    auth: { mode: 'ssh', sshCommand: 'ssh', tokenEnv: 'GITHUB_TOKEN', token: '', username: 'x-access-token' },
    memoryRoot: '.mem',
    skillsRoot,
    defaultBranch: 'main',
    remoteName: 'origin',
    autoCommit: false,
    archiveRoot: '.archive',
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

function writeDraft(repo: string, skillsRoot: string, name: string, description: string): void {
  const dir = join(repo, skillsRoot, 'drafts', name)
  mkdirSync(dir, { recursive: true })
  const content = '---\nname: "' + name + '"\ndescription: "' + description + '"\nwhenToUse: "Use when relevant"\n---\n\n# ' + name + '\n\nFollow the rule.\n\n'
  writeFileSync(join(dir, 'SKILL.md'), content)
}

test('listSkillDrafts finds drafts; promoteSkillDraft git-mv into enabled', () => {
  const dir = mkdtempSync(join(tmpdir(), 'evolve-skill-'))
  const repo = join(dir, 'repo')
  initRepo(repo)
  try {
    writeDraft(repo, '.skills', 'skill-cli-review', 'Review CLI output')
    const config = buildConfig(repo)
    const drafts = listSkillDrafts(config)
    assert.equal(drafts.length, 1)
    assert.equal(drafts[0]?.name, 'skill-cli-review')

    const promoted = promoteSkillDraft(config, 'skill-cli-review')
    assert.equal(promoted.targetPath, join(repo, '.skills', 'enabled', 'skill-cli-review', 'SKILL.md'))
    assert.equal(existsSync(promoted.targetPath), true)
    assert.equal(existsSync(join(repo, '.skills', 'drafts', 'skill-cli-review', 'SKILL.md')), false)
    assert.equal(listSkillDrafts(config).length, 0)
    assert.equal(listEnabledSkills(config).length, 1)
    assert.equal(listEnabledSkills(config)[0]?.name, 'skill-cli-review')

    assert.throws(() => promoteSkillDraft(config, 'Bad Name'))
    assert.throws(() => promoteSkillDraft(config, 'nope'))
  } finally {
    try { rmSync(dir, { recursive: true, force: true }) } catch { /* Windows */ }
  }
})

test('a draft written from a memory round-trips through list and promote', () => {
  const dir = mkdtempSync(join(tmpdir(), 'evolve-skill-loop-'))
  const repo = join(dir, 'repo')
  initRepo(repo)
  try {
    const config = buildConfig(repo)
    const record = { kind: 'warning' as const, title: 'Retry with backoff', content: 'Use exponential backoff on retry.' }
    const draft = writeSkillDraft(config, draftSkillFromRecord(record))
    assert.ok(draft.path.includes(join(config.skillsRoot, 'drafts')))
    const listed = listSkillDrafts(config)
    assert.equal(listed.length, 1)
    assert.equal(listed[0]?.name, draft.name)
    const promoted = promoteSkillDraft(config, draft.name)
    assert.equal(promoted.targetPath, join(repo, '.skills', 'enabled', draft.name, 'SKILL.md'))
    assert.equal(existsSync(promoted.targetPath), true)
  } finally {
    try { rmSync(dir, { recursive: true, force: true }) } catch { /* Windows */ }
  }
})

test('syncBundledSkills materializes a bundled skill into the repo drafts root', () => {
  const dir = mkdtempSync(join(tmpdir(), 'evolve-sync-'))
  const repo = join(dir, 'repo')
  initRepo(repo)
  try {
    const config = buildConfig(repo)
    const synced = syncBundledSkills(config, false)
    assert.ok(synced.length >= 1, 'at least one bundled skill is synced')
    const target = join(repo, '.skills', 'drafts', 'evolve-process', 'SKILL.md')
    assert.equal(existsSync(target), true)
    assert.match(readFileSync(target, 'utf8'), /name: evolve-process/)
    // idempotent: second sync is a no-op (skipped), and does not clobber an edit
    const before = readFileSync(target, 'utf8')
    writeFileSync(target, '---\nname: evolve-process\ndescription: edited\n---\n# edited\n')
    const again = syncBundledSkills(config, false)
    assert.equal(again.find(s => s.name === 'evolve-process')?.action, 'skipped')
    assert.match(readFileSync(target, 'utf8'), /edited/)
    // explicit force overwrites bundled
    syncBundledSkills(config, true)
    assert.equal(readFileSync(target, 'utf8'), before)
  } finally {
    try { rmSync(dir, { recursive: true, force: true }) } catch { /* Windows */ }
  }
})
