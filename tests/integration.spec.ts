import { test } from 'node:test'
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { GitEvolutionService } from '../src/index.js'
import { writeMemoryRecord } from '../src/git.js'
import { forgetMemory, restoreMemory } from '../src/forget.js'

function initRepo(repo: string): void {
  mkdirSync(repo, { recursive: true })
  execFileSync('git', ['init', '-q'], { cwd: repo })
  execFileSync('git', ['config', 'user.email', 't@t'], { cwd: repo })
  execFileSync('git', ['config', 'user.name', 't'], { cwd: repo })
  execFileSync('git', ['config', 'commit.gpgsign', 'false'], { cwd: repo })
}

function buildConfig(repoPath: string) {
  return {
    repoPath,
    repoUrl: 'https://example.com/repo.git',
    auth: { mode: 'ssh' as const, sshCommand: 'ssh', tokenEnv: 'GITHUB_TOKEN', token: '', username: 'x-access-token' },
    memoryRoot: '.mem',
    skillsRoot: '.skills',
    defaultBranch: 'main',
    remoteName: 'origin',
    autoCommit: true,
    archiveRoot: '.archive',
    recallTopK: 10,
    recallMinScore: 0,
    recallMaxChars: 8000,
    digestEnabled: true,
    digestMaxRecords: 5,
    digestMaxChars: 2000,
    privacyMode: 'ask' as const,
  }
}

test('the DSH adapter registers the enabled/ directory as a skill provider', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'evolve-skill-provider-'))
  const repo = join(dir, 'repo')
  initRepo(repo)
  const home = join(dir, 'home')
  mkdirSync(home, { recursive: true })
  const prevHome = process.env['DSH_HOME']
  process.env['DSH_HOME'] = home
  try {
    const skillDir = join(repo, '.skills', 'enabled', 'test-skill')
    mkdirSync(skillDir, { recursive: true })
    writeFileSync(join(skillDir, 'SKILL.md'), '---\nname: test-skill\ndescription: A test skill.\nwhenToUse: When testing.\n---\n\n# test-skill\n\nBody.\n')

    let factory: ((control: { signal: AbortSignal; invalidate: () => void }) => unknown) | undefined
    const registry = { registerProvider(create: typeof factory) { factory = create; return () => {} } }
    const tools: unknown[] = []
    const commands: unknown[] = []
    const ctx = {
      reflect: { provide: () => {} },
      systemPrompt: { section: () => {} },
      tools: { register: (d: unknown) => { tools.push(d) } },
      commands: { register: (d: unknown) => { commands.push(d) } },
      effect: (f: () => unknown) => f(),
      on: () => () => {},
      get: (name: string) => (name === 'skills' ? registry : undefined),
    }
    new GitEvolutionService(ctx, { repoPath: repo, skillsRoot: '.skills', autoCommit: false })
    assert.ok(factory, 'skill provider factory is registered')
    const provider = factory!({ signal: new AbortController().signal, invalidate: () => {} }) as { name: string; list: () => Promise<Array<{ name: string }>>; get: (c: { locator: { path: string } }) => Promise<{ name: string; content: string } | undefined> }
    assert.equal(provider.name, 'evolve-git')
    const listed = await provider.list()
    assert.equal(listed.length, 1)
    assert.equal(listed[0]?.name, 'test-skill')
    const loaded = await provider.get({ locator: { path: join(skillDir, 'SKILL.md') } } as never)
    assert.ok(loaded)
    assert.equal(loaded.name, 'test-skill')
    assert.match(loaded.content, /Body/)
  } finally {
    if (prevHome === undefined) delete process.env['DSH_HOME']
    else process.env['DSH_HOME'] = prevHome
    try { rmSync(dir, { recursive: true, force: true }) } catch { /* Windows */ }
  }
})

test('forget and restore commit their renames when autoCommit is enabled', () => {
  const dir = mkdtempSync(join(tmpdir(), 'evolve-forget-commit-'))
  const repo = join(dir, 'repo')
  initRepo(repo)
  try {
    const config = buildConfig(repo)
    const record = writeMemoryRecord(config, { kind: 'note', title: 'Temp', content: 'hold' })
    const forgotten = forgetMemory(config, record.id)
    assert.ok(forgotten.archivedPath.includes(config.archiveRoot))
    const log1 = execFileSync('git', ['log', '--pretty=%s'], { cwd: repo }).toString()
    assert.match(log1, /memory\(forget\)/)

    const restored = restoreMemory(config, record.id)
    assert.ok(restored.restoredPath.includes(config.memoryRoot))
    const log2 = execFileSync('git', ['log', '--pretty=%s'], { cwd: repo }).toString()
    assert.match(log2, /memory\(restore\)/)
  } finally {
    try { rmSync(dir, { recursive: true, force: true }) } catch { /* Windows */ }
  }
})
