import { test } from 'node:test'
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import {
  classifySensitivity,
  detectSensitive,
  filterBySensitivity,
  findById,
  redactSensitive,
  renderExport,
  sensitivityRank,
} from '../src/privacy.js'
import { writeMemoryRecord } from '../src/git.js'

test('detectSensitive finds email, phone, AWS key, and private key patterns', () => {
  const content = 'contact user@example.com or +86 138 0000 0000, key AKIAIOSFODNN7EXAMPLE, -----BEGIN PRIVATE KEY-----'
  const types = detectSensitive(content).map((match) => match.type)
  assert.ok(types.includes('email'))
  assert.ok(types.includes('phone'))
  assert.ok(types.includes('aws-access-key'))
  assert.ok(types.includes('private-key'))
})

test('classifySensitivity ranks secret > confidential > public', () => {
  assert.equal(classifySensitivity('password: hunter2'), 'secret')
  assert.equal(classifySensitivity('reach me at user@example.com'), 'confidential')
  assert.equal(classifySensitivity('hello world'), 'public')
})

test('redactSensitive replaces every detected fragment with a marker', () => {
  const out = redactSensitive('password: hunter2 and password: hunter3 plus user@example.com and other@example.com')
  assert.ok(out.includes('<REDACTED>'))
  assert.equal(out.includes('hunter2'), false)
  assert.equal(out.includes('hunter3'), false)
  assert.equal(out.includes('user@example.com'), false)
  assert.equal(out.includes('other@example.com'), false)
})

test('filterBySensitivity keeps only records up to the allowed level', () => {
  const records = [
    { id: '1', title: 'Public', content: 'hello', sensitivity: 'public' },
    { id: '2', title: 'Confidential', content: 'a@b.com', sensitivity: 'confidential' },
    { id: '3', title: 'Secret', content: 'password: x', sensitivity: 'secret' },
  ]
  assert.equal(filterBySensitivity(records, 'public').length, 1)
  assert.equal(filterBySensitivity(records, 'confidential').length, 2)
  assert.equal(filterBySensitivity(records, 'secret').length, 3)
})

test('renderExport emits JSON or Markdown with frontmatter', () => {
  const records = [
    { kind: 'note', title: 'One', content: 'first', sensitivity: 'public', createdAt: '2026-01-01T00:00:00.000Z' },
  ]
  const json = renderExport(records, 'json')
  assert.deepEqual(JSON.parse(json), records)
  const markdown = renderExport(records, 'markdown')
  assert.match(markdown, /^---/m)
  assert.match(markdown, /sensitivity: "public"/)
  assert.match(markdown, /first/)
})

test('findById and sensitivityRank', () => {
  assert.equal(sensitivityRank(undefined), 3)
  assert.equal(sensitivityRank('public'), 0)
  assert.equal(sensitivityRank('secret'), 3)
  assert.equal(findById([{ id: 'a' }, { id: 'b' }], 'b')?.id, 'b')
  assert.equal(findById([{ id: 'a' }], 'missing'), undefined)
})

function buildGateConfig(repoPath: string, privacyMode: 'block' | 'redact' | 'ask') {
  return {
    repoPath,
    repoUrl: 'https://example.com/repo.git',
    auth: { mode: 'ssh' as const, sshCommand: 'ssh', tokenEnv: 'GITHUB_TOKEN', token: '', username: 'x-access-token' },
    memoryRoot: '.mem',
    skillsRoot: '.skills',
    defaultBranch: 'main',
    remoteName: 'origin',
    autoCommit: false,
    archiveRoot: '.archive',
    recallTopK: 10,
    recallMinScore: 0,
    recallMaxChars: 8000,
    digestEnabled: true,
    digestMaxRecords: 5,
    digestMaxChars: 2000,
    privacyMode,
  }
}

function initRepo(repo: string): void {
  mkdirSync(repo, { recursive: true })
  execFileSync('git', ['init', '-q'], { cwd: repo })
  execFileSync('git', ['config', 'user.email', 't@t'], { cwd: repo })
  execFileSync('git', ['config', 'user.name', 't'], { cwd: repo })
  execFileSync('git', ['config', 'commit.gpgsign', 'false'], { cwd: repo })
}

test('privacyMode=block rejects sensitive writes before anything is written', () => {
  const dir = mkdtempSync(join(tmpdir(), 'evolve-privacy-block-'))
  const repo = join(dir, 'repo')
  initRepo(repo)
  try {
    const config = buildGateConfig(repo, 'block')
    assert.throws(() => writeMemoryRecord(config, { kind: 'note', title: 'Secret', content: 'password: hunter2' }), /privacyMode=block/)
    const ok = writeMemoryRecord(config, { kind: 'note', title: 'Plain', content: 'hello world' })
    assert.equal(ok.sensitivity, 'public')
  } finally {
    try { rmSync(dir, { recursive: true, force: true }) } catch { /* Windows */ }
  }
})

test('privacyMode=redact stores redacted content and never the plaintext', () => {
  const dir = mkdtempSync(join(tmpdir(), 'evolve-privacy-redact-'))
  const repo = join(dir, 'repo')
  initRepo(repo)
  try {
    const config = buildGateConfig(repo, 'redact')
    const record = writeMemoryRecord(config, { kind: 'note', title: 'Credentials', content: 'password: hunter2 and user@example.com' })
    assert.equal(record.content.includes('hunter2'), false)
    assert.equal(record.content.includes('user@example.com'), false)
    assert.ok(record.content.includes('<REDACTED>'))
    assert.equal(record.sensitivity, 'secret')
    const raw = readFileSync(record.path, 'utf8')
    assert.equal(raw.includes('hunter2'), false)
    assert.equal(raw.includes('user@example.com'), false)
  } finally {
    try { rmSync(dir, { recursive: true, force: true }) } catch { /* Windows */ }
  }
})

test('privacyMode=ask stores sensitive content as-is and marks sensitivity', () => {
  const dir = mkdtempSync(join(tmpdir(), 'evolve-privacy-ask-'))
  const repo = join(dir, 'repo')
  initRepo(repo)
  try {
    const config = buildGateConfig(repo, 'ask')
    const record = writeMemoryRecord(config, { kind: 'note', title: 'Credentials', content: 'password: hunter2' })
    assert.equal(record.content, 'password: hunter2')
    assert.equal(record.sensitivity, 'secret')
    assert.equal(readFileSync(record.path, 'utf8').includes('hunter2'), true)
  } finally {
    try { rmSync(dir, { recursive: true, force: true }) } catch { /* Windows */ }
  }
})
