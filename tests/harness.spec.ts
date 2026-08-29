import assert from 'node:assert/strict'
import test from 'node:test'
import {
  EVOLVE_USAGE,
  normalizeEvolveCommand,
  parseEvolveCommand,
  renderHelpText,
  renderHelpView,
  userFacingError,
} from '../src/harness.js'

test('normalizeEvolveCommand strips a leading /evolve prefix', () => {
  assert.equal(normalizeEvolveCommand('/evolve search 验收测试'), 'search 验收测试')
  assert.equal(normalizeEvolveCommand('search 验收测试'), 'search 验收测试')
  assert.equal(normalizeEvolveCommand('/evolve'), '')
})

test('parseEvolveCommand understands the v0.1.2 command surface', () => {
  assert.deepEqual(parseEvolveCommand(''), { kind: 'help' })
  assert.deepEqual(parseEvolveCommand('connect'), { kind: 'connect' })
  assert.deepEqual(parseEvolveCommand('status'), { kind: 'status' })
  assert.deepEqual(parseEvolveCommand('branches'), { kind: 'branches' })
  assert.deepEqual(parseEvolveCommand('remember note Debug hint :: Keep the repro command nearby'), {
    kind: 'remember',
    record: {
      kind: 'note',
      title: 'Debug hint',
      content: 'Keep the repro command nearby',
    },
  })
})

test('parseEvolveCommand rejects malformed remember syntax', () => {
  const parsed = parseEvolveCommand('remember note missing separator')
  assert.equal(parsed.kind, 'invalid')
  if (parsed.kind !== 'invalid') throw new Error('expected invalid command')
  assert.match(parsed.message, /Usage/)
})

test('help view and text stay aligned', () => {
  const view = renderHelpView()
  assert.deepEqual(view.usage, [...EVOLVE_USAGE])
  assert.match(renderHelpText(), /\/evolve remember/)
})

test('userFacingError preserves explicit error codes', () => {
  assert.equal(userFacingError({ code: 'GIT_REMOTE_MISSING', message: 'missing remote' }), '[GIT_REMOTE_MISSING] missing remote')
})
