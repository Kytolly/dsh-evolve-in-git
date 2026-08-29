import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdirSync, mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { GitEvolutionService } from '../src/index.js'
import { defineTool } from './dsh-tools-stub.js'

/** Every evolve_* tool the adapter must register, in alphabetical order. */
const EXPECTED_TOOLS = [
  'evolve_branch_diff',
  'evolve_branch_switch',
  'evolve_branches',
  'evolve_conflicts',
  'evolve_connect',
  'evolve_forget',
  'evolve_export',
  'evolve_help',
  'evolve_recall',
  'evolve_remember',
  'evolve_resolve',
  'evolve_restore',
  'evolve_rollback',
  'evolve_show',
  'evolve_skill_demote',
  'evolve_skill_draft',
  'evolve_skill_list',
  'evolve_skill_promote',
  'evolve_status',
  'evolve_timeline',
  'evolve_update',
  'memory_delete',
  'memory_save',
  'memory_search',
  'memory_update',
].sort()

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

test('the local dsh-tools stub provides an identity defineTool', () => {
  const def = { name: 'probe', execute: () => 'x' }
  assert.equal(defineTool(def), def)
})

test('GitEvolutionService maps every evolve tool and the /evolve command', () => {
  const dir = mkdtempSync(join(tmpdir(), 'evolve-adapter-'))
  const home = join(dir, 'home')
  mkdirSync(home, { recursive: true })
  const prevHome = process.env['DSH_HOME']
  process.env['DSH_HOME'] = home
  try {
    const { ctx, tools, commands } = makeStubContext()
    new GitEvolutionService(ctx, { repoPath: join(dir, 'repo') })

    const names = tools.map((tool) => (tool as { name: string }).name).sort()
    assert.deepEqual(names, EXPECTED_TOOLS)

    for (const tool of tools as { name: string; execute: unknown; presentCall: unknown; output: { schema: unknown; render: unknown } }[]) {
      assert.equal(typeof tool.execute, 'function', tool.name + ' has an execute handler')
      assert.equal(typeof tool.presentCall, 'function', tool.name + ' has a presentCall handler')
      assert.ok(tool.output !== undefined, tool.name + ' has an output definition')
      assert.ok(tool.output.schema !== undefined, tool.name + ' declares an output schema')
    }

    assert.equal(commands.length, 1)
    const command = commands[0] as { name: string; handler: (invocation: { rawInput: string }) => { kind: string; text: string } | Promise<{ kind: string; text: string }> }
    assert.equal(command.name, 'evolve')
    assert.equal(typeof command.handler, 'function')

    // read-only mapping is exercised end-to-end: evolve_help -> renderHelpView
    const helpTool = (tools as { name: string; execute: () => Promise<unknown> }[]).find((tool) => tool.name === 'evolve_help')
    assert.ok(helpTool)
    return Promise.resolve(helpTool!.execute()).then((view) => {
      const help = view as { command: string; tools: string[]; usage: string[]; safety: string[] }
      assert.equal(help.command, '/evolve')
      assert.ok(help.tools.includes('evolve_help'))
      assert.ok(help.usage.length > 0)
      assert.ok(help.safety.length > 0)
    })
  } finally {
    if (prevHome === undefined) delete process.env['DSH_HOME']
    else process.env['DSH_HOME'] = prevHome
    try { rmSync(dir, { recursive: true, force: true }) } catch { /* Windows */ }
  }
})

test('the /evolve command routes the help subcommand through the adapter', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'evolve-adapter-cmd-'))
  const home = join(dir, 'home')
  mkdirSync(home, { recursive: true })
  const prevHome = process.env['DSH_HOME']
  process.env['DSH_HOME'] = home
  try {
    const { ctx, commands } = makeStubContext()
    new GitEvolutionService(ctx, { repoPath: join(dir, 'repo') })
    const command = commands[0] as { handler: (invocation: { rawInput: string }) => Promise<{ kind: string; text: string }> }
    const result = await command.handler({ rawInput: 'help' })
    assert.equal(result.kind, 'success')
    assert.match(result.text, /\/evolve/)
  } finally {
    if (prevHome === undefined) delete process.env['DSH_HOME']
    else process.env['DSH_HOME'] = prevHome
    try { rmSync(dir, { recursive: true, force: true }) } catch { /* Windows */ }
  }
})
