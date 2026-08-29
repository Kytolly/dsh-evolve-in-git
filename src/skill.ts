/**
 * Reversible skill discovery for dsh-evolve-in-git.
 *
 * A skill lives entirely inside the memory repository under the configured
 * skillsRoot: drafts under <skillsRoot>/drafts/<name>/SKILL.md, enabled skills
 * under <skillsRoot>/enabled/<name>/SKILL.md. Promoting a draft runs
 * git mv drafts/<name> enabled/<name> (never a copy), so the skill stays in Git
 * history and can be demoted or rolled back. The DSH adapter discovers only the
 * enabled/ directory (listEnabledSkills); nothing is copied into ~/.dsh/skills.
 * @module dsh-evolve-in-git/skill
 */
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { commitPaths, gitAdd, gitMove, openRepository } from './git.js'
import type { ResolvedConfig } from './types.js'

/** Kebab-case skill-name grammar, mirroring @deepseek-ai/dsh-skill isSkillName. */
const SKILL_NAME = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

/** A discovered skill (draft or enabled), identified by its frontmatter. */
export interface SkillDraftSummary {
  name: string
  description: string
  /** Absolute path to the SKILL.md inside the memory repo. */
  path: string
}

/** A skill after a move (promote/demote): where it came from and where it lives now. */
export interface MovedSkill extends SkillDraftSummary {
  /** The skill's new location (promote: enabled/, demote: drafts/). */
  targetPath: string
}

export type PromotedSkill = MovedSkill
export type DemotedSkill = MovedSkill

/** A bundled skill materialized into the repo's drafts root. */
export interface SyncedSkill {
  name: string
  targetPath: string
  action: 'created' | 'updated' | 'skipped'
}

/** Kebab-case skill-name validation (same grammar as the host skill registry). */
export function isSkillName(name: string): boolean {
  return SKILL_NAME.test(name)
}

function skillsRootOf(config: ResolvedConfig): string {
  return join(config.repoPath, config.skillsRoot)
}

function draftsRootOf(config: ResolvedConfig): string {
  return join(skillsRootOf(config), 'drafts')
}

function enabledRootOf(config: ResolvedConfig): string {
  return join(skillsRootOf(config), 'enabled')
}

/** Repo-relative path (forward slashes) for git mv. */
function relMovePath(config: ResolvedConfig, section: 'drafts' | 'enabled', name: string): string {
  return config.skillsRoot.replace(/\\/g, '/') + '/' + section + '/' + name
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

/** List <name>/SKILL.md skills under a directory, sorted by name. */
function scanSkillDirs(root: string): SkillDraftSummary[] {
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

/** List promotable skill drafts under <skillsRoot>/drafts. */
export function listSkillDrafts(config: ResolvedConfig): SkillDraftSummary[] {
  return scanSkillDirs(draftsRootOf(config))
}

/** List enabled (discoverable) skills under <skillsRoot>/enabled. */
export function listEnabledSkills(config: ResolvedConfig): SkillDraftSummary[] {
  return scanSkillDirs(enabledRootOf(config))
}

/** Move a skill directory between drafts/ and enabled/ with git mv, then commit. */
function moveSkill(config: ResolvedConfig, from: 'drafts' | 'enabled', to: 'drafts' | 'enabled', name: string): MovedSkill {
  if (!isSkillName(name)) {
    throw new Error("invalid skill name '" + name + "': must be kebab-case")
  }
  const repoPath = openRepository(config)
  const fromAbs = join(repoPath, config.skillsRoot, from, name)
  const skillPath = join(fromAbs, 'SKILL.md')
  if (!existsSync(skillPath)) {
    throw new Error("no skill '" + name + "' at " + skillPath)
  }
  const fm = parseFrontmatter(readFileSync(skillPath, 'utf8'))
  if (fm.name === undefined || fm.description === undefined || fm.name !== name) {
    throw new Error("skill '" + name + "' frontmatter must declare the matching name and a description")
  }
  const toAbs = join(repoPath, config.skillsRoot, to, name)
  mkdirSync(join(repoPath, config.skillsRoot, to), { recursive: true })
  gitAdd(repoPath, relMovePath(config, from, name))
  gitMove(repoPath, relMovePath(config, from, name), relMovePath(config, to, name))
  if (config.autoCommit) {
    commitPaths(repoPath, [relMovePath(config, to, name)], 'skill(' + (to === 'enabled' ? 'promote' : 'demote') + '): ' + name)
  }
  return { name: fm.name, description: fm.description, path: join(toAbs, 'SKILL.md'), targetPath: join(toAbs, 'SKILL.md') }
}

/** Promote a draft: git mv drafts/<name> -> enabled/<name> (discoverable). */
export function promoteSkillDraft(config: ResolvedConfig, name: string): PromotedSkill {
  return moveSkill(config, 'drafts', 'enabled', name)
}

/** Demote an enabled skill: git mv enabled/<name> -> drafts/<name> (reversible). */
export function demoteSkillDraft(config: ResolvedConfig, name: string): DemotedSkill {
  return moveSkill(config, 'enabled', 'drafts', name)
}

/** The bundled skill directory inside the installed package. */
function packageRoot(): string {
  return join(dirname(fileURLToPath(import.meta.url)), '..')
}

/**
 * Materialize the skills shipped in this package (skills/<name>/SKILL.md) into
 * the repo's <skillsRoot>/drafts so they can be reviewed and promoted. Only runs
 * when the repo is already a Git checkout (the constructor calls this
 * best-effort, so a not-yet-connected repo is left untouched). force=false only
 * creates missing drafts; force=true overwrites them with the bundled copy.
 * @returns one summary per bundled skill, in discovery order.
 */
export function syncBundledSkills(config: ResolvedConfig, force = false): SyncedSkill[] {
  const bundledRoot = join(packageRoot(), 'skills')
  if (!existsSync(bundledRoot)) return []
  if (!existsSync(join(config.repoPath, '.git'))) return []
  const targetRoot = draftsRootOf(config)
  const results: SyncedSkill[] = []
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
