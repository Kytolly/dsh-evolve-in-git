/**
 * Memory scanning, search, and timeline for dsh-evolve-in-git.
 *
 * The memory root is a directory of Markdown files written by writeMemoryRecord
 * (<repo>/<memoryRoot>/<kind>/<timestamp>-<slug>.md). This module scans those
 * files, parses their YAML frontmatter, and exposes recall (search) and timeline
 * views so the agent can surface relevant memory without the user repeating it.
 * @module dsh-evolve-in-git/memory
 */
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import type { ResolvedConfig } from './types.js'

export interface MemoryMeta {
  path: string
  kind: string | undefined
  title: string | undefined
  branch: string | undefined
  source: string | undefined
  tags: string[]
  createdAt: string | undefined
  content: string
}

function memoryRootOf(config: ResolvedConfig): string {
  return join(config.repoPath, config.memoryRoot)
}

function parseFrontmatterFields(raw: string): Record<string, string | undefined> {
  const match = raw.match(/^---\n([\s\S]*?)\n---/m)
  if (match === null) return {}
  const body = match[1]
  if (body === undefined) return {}
  const out: Record<string, string | undefined> = {}
  for (const line of body.split(/\r?\n/)) {
    const kv = line.match(/^([A-Za-z0-9_-]+):\s*(.*)$/)
    if (kv === null) continue
    const key = kv[1] as string
    let value = (kv[2] ?? '').trim()
    if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1).replace(/\\"/g, '"').replace(/\\\\/g, '\\')
    out[key] = value
  }
  return out
}

function parseTags(value: string | undefined): string[] {
  if (value === undefined) return []
  const trimmed = value.trim()
  if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
    return trimmed.slice(1, -1).split(',').map((item) => item.trim().replace(/^"|"$/g, '')).filter(Boolean)
  }
  return trimmed.split(/\s+/).filter(Boolean)
}

function readMemoryMeta(path: string): MemoryMeta {
  const raw = readFileSync(path, 'utf8')
  const fm = parseFrontmatterFields(raw)
  const body = raw.replace(/^---\n[\s\S]*?\n---\n?/, '').trim()
  return {
    path,
    kind: fm['kind'],
    title: fm['title'],
    branch: fm['branch'],
    source: fm['source'],
    tags: parseTags(fm['tags']),
    createdAt: fm['createdAt'],
    content: body,
  }
}

function walkMarkdown(dir: string, out: string[]): void {
  if (!existsSync(dir)) return
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) walkMarkdown(join(dir, entry.name), out)
    else if (entry.name.endsWith('.md')) out.push(join(dir, entry.name))
  }
}

/** Scan every memory record under the configured memory root. */
export function scanMemory(config: ResolvedConfig): MemoryMeta[] {
  const files: string[] = []
  walkMarkdown(memoryRootOf(config), files)
  return files.map(readMemoryMeta)
}

/** Memory records sorted newest-first by their createdAt stamp. */
export function memoryTimeline(config: ResolvedConfig): MemoryMeta[] {
  return scanMemory(config).sort((left, right) => (right.createdAt ?? '').localeCompare(left.createdAt ?? ''))
}

export interface RecallFilter {
  query?: string
  kind?: string
  tag?: string
}

/**
 * Recall memory matching a keyword (title/content/tags/kind) plus optional
 * kind and tag filters. A memory with no marked kind is still matched by content
 * so recall works on older or ad-hoc files.
 */
export function searchMemory(config: ResolvedConfig, filter: RecallFilter): MemoryMeta[] {
  const q = (filter.query ?? '').trim().toLowerCase()
  return scanMemory(config).filter((memo) => {
    if (filter.kind !== undefined && memo.kind !== filter.kind) return false
    if (filter.tag !== undefined && memo.tags.includes(filter.tag) === false) return false
    if (q.length === 0) return true
    const haystack = [memo.title ?? '', memo.content, memo.kind ?? '', ...memo.tags].join(' ').toLowerCase()
    return haystack.includes(q)
  }).sort((left, right) => (right.createdAt ?? '').localeCompare(left.createdAt ?? ''))
}