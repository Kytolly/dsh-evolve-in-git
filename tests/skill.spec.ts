import { test } from 'node:test'
import assert from 'node:assert/strict'
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { listSkillDrafts, promoteSkillDraft } from '../lib/skill.js'
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

    // Reject invalid kebab-case and missing drafts.
    assert.throws(() => promoteSkillDraft(config, 'Bad Name'))
    assert.throws(() => promoteSkillDraft(config, 'nope'))
  } finally {
    if (prevHome === undefined) delete process.env['DSH_HOME']
    else process.env['DSH_HOME'] = prevHome
    rmSync(dir, { recursive: true, force: true })
  }
})
