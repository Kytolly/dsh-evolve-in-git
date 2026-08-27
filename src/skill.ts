/**
 * Skill-draft promotion for dsh-evolve-in-git.
 *
 * A 'skill draft' is a SKILL.md file written under the plugin's configured
 * skillsRoot (<repo>/<skillsRoot>/<name>/SKILL.md). Promoting one copies it into
 * the DSH user skills root (~/.dsh/skills/<name>/SKILL.md) where the filesystem
 * skill provider discovers it, so it becomes callable as a normal DSH skill.
 * @module dsh-evolve-in-git/skill
 */
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { dshSkillsRoot } from './config.js'
import type { ResolvedConfig } from './types.js'

/** Kebab-case skill-name grammar, mirroring @deepseek-ai/dsh-skill isSkillName. */
const SKILL_NAME = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

/** A discovered, promotable skill draft. */
export interface SkillDraftSummary {
  name: string
  description: string
  /** Absolute path to the draft SKILL.md inside the memory repo. */
  path: string
}

/** A skill draft that has been promoted into the DSH skills root. */
export interface PromotedSkill extends SkillDraftSummary {
  /** Absolute path to the installed SKILL.md under ~/.dsh/skills. */
  targetPath: string
}

/** Kebab-case skill-name validation (same grammar as the host skill registry). */
export function isSkillName(name: string): boolean {
  return SKILL_NAME.test(name)
}

function skillsRootOf(config: ResolvedConfig): string {
  return join(config.repoPath, config.skillsRoot)
}

interface Frontmatter {
  name?: string
  description?: string
}

/** Minimal YAML-frontmatter reader: extracts name and description from a draft. */
function parseFrontmatter(raw: string): Frontmatter {
  const match = raw.match(/^---\n([\s\S]*?)\n---/m)
  if (match === null) return {}
  const body = match[1]
  if (body === undefined) return {}
  const out: Frontmatter = {}
  for (const line of body.split(/\r?\n/)) {
    const kv = line.match(/^([A-Za-z0-9_-]+):\s*(.*)$/)
    if (kv === null) continue
    const key = kv[1] as string
    let value = (kv[2] ?? '').trim()
    if (value.startsWith('"') && value.endsWith('"')) {
      value = value.slice(1, -1).replace(/\\"/g, '"').replace(/\\\\/g, '\\')
    }
    if (key === 'name') out.name = value
    else if (key === 'description') out.description = value
  }
  return out
}

/** List promotable skill drafts under the plugin's configured skillsRoot. */
export function listSkillDrafts(config: ResolvedConfig): SkillDraftSummary[] {
  const root = skillsRootOf(config)
  if (!existsSync(root)) return []
  const summaries: SkillDraftSummary[] = []
  for (const entry of readdirSync(root, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue
    const skillPath = join(root, entry.name, 'SKILL.md')
    if (!existsSync(skillPath)) continue
    const fm = parseFrontmatter(readFileSync(skillPath, 'utf8'))
    if (fm.name === undefined || fm.description === undefined) continue
    if (!isSkillName(fm.name)) continue
    summaries.push({ name: fm.name, description: fm.description, path: skillPath })
  }
  return summaries.sort((left, right) => left.name.localeCompare(right.name))
}

/**
 * Promote one skill draft (by its directory/frontmatter name) into the DSH user
 * skills root. The draft directory name and its frontmatter name must agree and
 * satisfy the kebab-case grammar; otherwise promotion is rejected.
 * @returns the promoted skill, including the installed target path.
 */
export function promoteSkillDraft(config: ResolvedConfig, name: string): PromotedSkill {
  if (!isSkillName(name)) {
    throw new Error(`invalid skill name '${name}': must be kebab-case`)
  }
  const source = join(skillsRootOf(config), name, 'SKILL.md')
  if (!existsSync(source)) {
    throw new Error(`no skill draft '${name}' at ${source}`)
  }
  const content = readFileSync(source, 'utf8')
  const fm = parseFrontmatter(content)
  if (fm.name === undefined || fm.description === undefined || fm.name !== name) {
    throw new Error(`skill draft '${name}' frontmatter must declare the matching name and a description`)
  }
  const targetRoot = dshSkillsRoot()
  const target = join(targetRoot, fm.name, 'SKILL.md')
  mkdirSync(join(targetRoot, fm.name), { recursive: true })
  writeFileSync(target, content, 'utf8')
  return { name: fm.name, description: fm.description, path: source, targetPath: target }
}

/** The bundled skill directory inside the installed package. */
function packageRoot(): string {
  return join(dirname(fileURLToPath(import.meta.url)), '..')
}

/**
 * Materialize the skills shipped in this package (skills/<name>/SKILL.md) into
 * the DSH user skills root (~/.dsh/skills) so they are discovered and callable.
 *
 * By default (force=false) this only creates missing skills so a user's edits are
 * never clobbered; with force=true it overwrites them with the bundled version
 * (how a newer release propagates an updated skill).
 * @returns one summary per bundled skill, in discovery order.
 */
export function syncBundledSkills(force = false): { name: string; targetPath: string; action: 'created' | 'updated' | 'skipped' }[] {
  const bundledRoot = join(packageRoot(), 'skills')
  if (!existsSync(bundledRoot)) return []
  const targetRoot = dshSkillsRoot()
  const results: { name: string; targetPath: string; action: 'created' | 'updated' | 'skipped' }[] = []
  for (const entry of readdirSync(bundledRoot, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue
    const src = join(bundledRoot, entry.name, 'SKILL.md')
    if (!existsSync(src)) continue
    const target = join(targetRoot, entry.name, 'SKILL.md')
    const content = readFileSync(src, 'utf8')
    let action: 'created' | 'updated' | 'skipped' = 'skipped'
    if (!existsSync(target)) {
      mkdirSync(join(targetRoot, entry.name), { recursive: true })
      writeFileSync(target, content, 'utf8')
      action = 'created'
    } else if (force) {
      writeFileSync(target, content, 'utf8')
      action = 'updated'
    }
    results.push({ name: entry.name, targetPath: target, action })
  }
  return results
}
