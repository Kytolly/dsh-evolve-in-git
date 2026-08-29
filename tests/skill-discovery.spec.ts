import { test } from 'node:test'
import assert from 'node:assert/strict'
import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { execFileSync } from 'node:child_process'
import { demoteSkillDraft, listEnabledSkills, listSkillDrafts, promoteSkillDraft } from '../src/skill.js'
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

function writeDraft(repo: string, skillsRoot: string, name: string): void {
  const dir = join(repo, skillsRoot, 'drafts', name)
  mkdirSync(dir, { recursive: true })
  writeFileSync(join(dir, 'SKILL.md'), '---\nname: "' + name + '"\ndescription: "A rule"\nwhenToUse: "Use when relevant"\n---\n\n# ' + name + '\n\nRule.\n\n')
}

test('promote then demote is reversible and keeps the skill in the repo', () => {
  const dir = mkdtempSync(join(tmpdir(), 'evolve-skill-demote-'))
  const repo = join(dir, 'repo')
  initRepo(repo)
  try {
    writeDraft(repo, '.skills', 'skill-reversible')
    const config = buildConfig(repo)
    promoteSkillDraft(config, 'skill-reversible')
    assert.equal(listEnabledSkills(config).length, 1)
    assert.equal(listSkillDrafts(config).length, 0)

    const demoted = demoteSkillDraft(config, 'skill-reversible')
    assert.equal(demoted.targetPath, join(repo, '.skills', 'drafts', 'skill-reversible', 'SKILL.md'))
    assert.equal(existsSync(demoted.targetPath), true)
    assert.equal(listEnabledSkills(config).length, 0)
    assert.equal(listSkillDrafts(config).length, 1)
    assert.throws(() => demoteSkillDraft(config, 'skill-reversible'), /no skill/)
  } finally {
    try { rmSync(dir, { recursive: true, force: true }) } catch { /* Windows */ }
  }
})

test('promote produces no ~/.dsh/skills copy', () => {
  const dir = mkdtempSync(join(tmpdir(), 'evolve-skill-nocopy-'))
  const repo = join(dir, 'repo')
  const home = join(dir, 'home')
  initRepo(repo)
  mkdirSync(home, { recursive: true })
  const prevHome = process.env['DSH_HOME']
  process.env['DSH_HOME'] = home
  try {
    writeDraft(repo, '.skills', 'skill-nocopy')
    const config = buildConfig(repo)
    promoteSkillDraft(config, 'skill-nocopy')
    assert.equal(existsSync(join(home, 'skills', 'skill-nocopy', 'SKILL.md')), false)
    assert.equal(existsSync(join(repo, '.skills', 'enabled', 'skill-nocopy', 'SKILL.md')), true)
  } finally {
    if (prevHome === undefined) delete process.env['DSH_HOME']
    else process.env['DSH_HOME'] = prevHome
    try { rmSync(dir, { recursive: true, force: true }) } catch { /* Windows */ }
  }
})
