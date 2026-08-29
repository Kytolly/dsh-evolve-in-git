import { test } from 'node:test'
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { GitEvolutionService } from '../src/index.js'

function makeStubContext() {
  const tools: unknown[] = []
  const commands: unknown[] = []
  const ctx = {
    reflect: { provide: () => {} },
    systemPrompt: { section: () => {} },
    tools: { register: (definition: unknown) => { tools.push(definition) } },
    commands: { register: (definition: unknown) => { commands.push(definition) } },
    effect: (factory: () => unknown) => factory(),
    on: () => () => {},
    get: () => undefined,
  }
  return { ctx, tools, commands }
}

function initRepo(repo: string): void {
  mkdirSync(repo, { recursive: true })
  execFileSync('git', ['init', '-q'], { cwd: repo })
  execFileSync('git', ['config', 'user.email', 't@t'], { cwd: repo })
  execFileSync('git', ['config', 'user.name', 't'], { cwd: repo })
  execFileSync('git', ['config', 'commit.gpgsign', 'false'], { cwd: repo })
}

function writeMemo(repo: string, kind: string, title: string, content: string, createdAt: string): void {
  const dir = join(repo, '.mem', kind)
  mkdirSync(dir, { recursive: true })
  const body = '---\nkind: ' + kind + '\ntitle: ' + JSON.stringify(title) + '\ncreatedAt: ' + JSON.stringify(createdAt) + '\n---\n\n' + content + '\n'
  writeFileSync(join(dir, createdAt.replace(/:/g, '-') + '-' + title.replace(/\s+/g, '-') + '.md'), body)
}

/** Drop human-facing descriptions: equivalence is about parameter/return shape, not prose. */
function withoutDescriptions(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(withoutDescriptions)
  if (value !== null && typeof value === 'object') {
    const out: Record<string, unknown> = {}
    for (const [key, entry] of Object.entries(value as Record<string, unknown>)) {
      if (key === 'description') continue
      out[key] = withoutDescriptions(entry)
    }
    return out
  }
  return value
}

test('memory_* aliases mirror their evolve_* counterparts', () => {
  const dir = mkdtempSync(join(tmpdir(), 'evolve-aliases-'))
  const repo = join(dir, 'repo')
  initRepo(repo)
  const home = join(dir, 'home')
  mkdirSync(home, { recursive: true })
  const prevHome = process.env['DSH_HOME']
  process.env['DSH_HOME'] = home
  try {
    const { ctx, tools } = makeStubContext()
    new GitEvolutionService(ctx, { repoPath: repo, autoCommit: false })
    const byName = (name: string) => (tools as { name: string }[]).find((tool) => tool.name === name)
    const pairs: Array<[string, string]> = [
      ['memory_search', 'evolve_recall'],
      ['memory_save', 'evolve_remember'],
      ['memory_update', 'evolve_update'],
      ['memory_delete', 'evolve_forget'],
    ]
    for (const [alias, canonical] of pairs) {
      const a = byName(alias) as { parameters: unknown; output: { schema: unknown } } | undefined
      const c = byName(canonical) as { parameters: unknown; output: { schema: unknown } } | undefined
      assert.ok(a, alias + ' is registered')
      assert.ok(c, canonical + ' is registered')
      assert.deepEqual(withoutDescriptions(a.parameters), withoutDescriptions(c.parameters), alias + ' parameters match ' + canonical)
      assert.deepEqual(a.output.schema, c.output.schema, alias + ' output schema matches ' + canonical)
    }
  } finally {
    if (prevHome === undefined) delete process.env['DSH_HOME']
    else process.env['DSH_HOME'] = prevHome
    try { rmSync(dir, { recursive: true, force: true }) } catch { /* Windows */ }
  }
})

test('memory_search returns the same results as evolve_recall', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'evolve-aliases-recall-'))
  const repo = join(dir, 'repo')
  initRepo(repo)
  const home = join(dir, 'home')
  mkdirSync(home, { recursive: true })
  const prevHome = process.env['DSH_HOME']
  process.env['DSH_HOME'] = home
  try {
    const { ctx, tools } = makeStubContext()
    new GitEvolutionService(ctx, { repoPath: repo, autoCommit: false, memoryRoot: '.mem' })
    writeMemo(repo, 'note', 'Deploy port 8080', 'use port 8080', '2026-01-01T00:00:00.000Z')
    const recall = (tools as { name: string; execute: (args: unknown, exec: unknown) => Promise<unknown> }[]).find((tool) => tool.name === 'evolve_recall')
    const search = (tools as { name: string; execute: (args: unknown, exec: unknown) => Promise<unknown> }[]).find((tool) => tool.name === 'memory_search')
    assert.ok(recall)
    assert.ok(search)
    const a = await recall.execute({ query: '8080' }, undefined)
    const b = await search.execute({ query: '8080' }, undefined)
    assert.deepEqual(a, b)
    assert.equal((a as unknown[]).length, 1)
  } finally {
    if (prevHome === undefined) delete process.env['DSH_HOME']
    else process.env['DSH_HOME'] = prevHome
    try { rmSync(dir, { recursive: true, force: true }) } catch { /* Windows */ }
  }
})
