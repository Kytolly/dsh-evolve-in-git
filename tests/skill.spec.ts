import { test } from 'node:test'
import assert from 'node:assert/strict'
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { execFileSync } from 'node:child_process'
import { listSkillDrafts, promoteSkillDraft, syncBundledSkills } from '../lib/skill.js'
import { writeSkillDraft } from '../lib/git.js'
import { draftSkillFromRecord } from '../lib/strategy.js'
import type { ResolvedConfig } from '../lib/types.js'

function buildConfig(repoPath: string, skillsRoot: string): ResolvedConfig {
  return {
    repoPath,
    repoUrl: 'https://example.com/repo.git',
    auth: { mode: 'ssh', sshCommand: 'ssh', tokenEnv: 'GITHUB_TOKEN', token: '', username: 'x-access-token' },
    memoryRoot: '.mem',
    skillsRoot,
    defaultBranch: 'main',
    remoteName: 'origin',
    autoCommit: false,
  }
}

test('listSkillDrafts finds promotable drafts; promoteSkillDraft installs into the DSH skills root', () => {
  const dir = mkdtempSync(join(tmpdir(), 'evolve-skill-'))
  const repo = join(dir, 'repo')
  const skillsRoot = '.skills'
  const home = join(dir, 'home')
  const prevHome = process.env['DSH_HOME']
  process.env['DSH_HOME'] = home
  try {
    const draftDir = join(repo, skillsRoot, 'skill-cli-review')
    mkdirSync(draftDir, { recursive: true })
    const content = [
      '---',
      'name: "skill-cli-review"',
      'description: "Review CLI output"',
      'whenToUse: "Use when reviewing CLI output"',
      '---',
      '',
      '# skill-cli-review',
      '',
      'Follow the rule.',
      '',
    ].join('\n')
    writeFileSync(join(draftDir, 'SKILL.md'), content)

    const config = buildConfig(repo, skillsRoot)
    const drafts = listSkillDrafts(config)
    assert.equal(drafts.length, 1)
    assert.equal(drafts[0].name, 'skill-cli-review')
    assert.equal(drafts[0].description, 'Review CLI output')

    const promoted = promoteSkillDraft(config, 'skill-cli-review')
    assert.equal(promoted.targetPath, join(home, 'skills', 'skill-cli-review', 'SKILL.md'))
    assert.equal(existsSync(promoted.targetPath), true)
    assert.equal(readFileSync(promoted.targetPath, 'utf8'), content)

    assert.throws(() => promoteSkillDraft(config, 'Bad Name'))
    assert.throws(() => promoteSkillDraft(config, 'nope'))
  } finally {
    if (prevHome === undefined) delete process.env['DSH_HOME']
    else process.env['DSH_HOME'] = prevHome
    rmSync(dir, { recursive: true, force: true })
  }
})

test('a draft written from a memory round-trips through list and promote', () => {
  const dir = mkdtempSync(join(tmpdir(), 'evolve-skill-loop-'))
  const repo = join(dir, 'repo')
  const home = join(dir, 'home')
  mkdirSync(repo, { recursive: true })
  execFileSync('git', ['init', '-q'], { cwd: repo })
  const prevHome = process.env['DSH_HOME']
  process.env['DSH_HOME'] = home
  try {
    const config = buildConfig(repo, '.skills')
    const record = { kind: 'warning' as const, title: 'Retry with backoff', content: 'Use exponential backoff on retry.' }
    const draft = writeSkillDraft(config, draftSkillFromRecord(record))
    assert.match(draft.name, /^skill-[a-z0-9-]+$/)
    const listed = listSkillDrafts(config)
    assert.equal(listed.length, 1)
    assert.equal(listed[0].name, draft.name)
    const promoted = promoteSkillDraft(config, draft.name)
    assert.equal(promoted.targetPath, join(home, 'skills', draft.name, 'SKILL.md'))
    assert.equal(existsSync(promoted.targetPath), true)
  } finally {
    if (prevHome === undefined) delete process.env['DSH_HOME']
    else process.env['DSH_HOME'] = prevHome
    rmSync(dir, { recursive: true, force: true })
  }
})

test('syncBundledSkills materializes a bundled skill into the DSH skills root', () => {
  const dir = mkdtempSync(join(tmpdir(), 'evolve-sync-'))
  const home = join(dir, 'home')
  const prevHome = process.env['DSH_HOME']
  process.env['DSH_HOME'] = home
  try {
    const synced = syncBundledSkills(false)
    assert.ok(synced.length >= 1, 'at least one bundled skill is synced')
    const target = join(home, 'skills', 'evolve-process', 'SKILL.md')
    assert.equal(existsSync(target), true)
    assert.match(readFileSync(target, 'utf8'), /name: evolve-process/)
    // idempotent: second sync is a no-op (skipped), and does not clobber an edit
    const before = readFileSync(target, 'utf8')
    writeFileSync(target, '---\nname: evolve-process\ndescription: edited\n---\n# edited\n')
    const again = syncBundledSkills(false)
    assert.equal(again.find(s => s.name === 'evolve-process')?.action, 'skipped')
    assert.match(readFileSync(target, 'utf8'), /edited/)
    // explicit force overwrites bundled
    syncBundledSkills(true)
    assert.equal(readFileSync(target, 'utf8'), before)
  } finally {
    if (prevHome === undefined) delete process.env['DSH_HOME']
    else process.env['DSH_HOME'] = prevHome
    rmSync(dir, { recursive: true, force: true })
  }
})
