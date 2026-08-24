import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { configFilePath, mergeConfig, readConfigFile, writeConfigFile } from '../lib/config.js'

test('config file round-trips and merges over cordis config', () => {
  const dir = mkdtempSync(join(tmpdir(), 'evolve-config-'))
  const prev = process.env['DSH_HOME']
  process.env['DSH_HOME'] = dir
  try {
    assert.equal(configFilePath(), join(dir, 'evolve-in-git.json'))
    // defaults: missing file reads as empty
    assert.deepEqual(readConfigFile(), {})
    // write + read
    writeConfigFile({ repoPath: '/tmp/repo', memoryRoot: '.mem' })
    assert.deepEqual(readConfigFile(), { repoPath: '/tmp/repo', memoryRoot: '.mem' })
    // merge: file wins over the cordis value
    const merged = mergeConfig({ repoUrl: 'https://x', repoPath: 'cordis' }, { repoPath: 'file' })
    assert.deepEqual(merged, { repoUrl: 'https://x', repoPath: 'file' })
    // a second write replaces the whole file
    writeConfigFile({ autoCommit: false })
    assert.deepEqual(readConfigFile(), { autoCommit: false })
  } finally {
    if (prev === undefined) delete process.env['DSH_HOME']
    else process.env['DSH_HOME'] = prev
    rmSync(dir, { recursive: true, force: true })
  }
})
