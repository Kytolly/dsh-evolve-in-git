/**
 * Config-file management for dsh-evolve-in-git.
 *
 * The plugin keeps its runtime configuration in a small JSON file under DSH_HOME
 * (configFilePath()). The settings surface and the '/evolve config' commands read
 * and write this file; the GitEvolutionService loads it at startup and overlays it
 * over any Cordis-provided config, so the file is the user-facing source of truth.
 * @module dsh-evolve-in-git/config
 */
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { homedir } from 'node:os'
import { join, dirname } from 'node:path'

/** The plugin config shape shared with the runtime (mirrors Config in index). */
export interface ConfigFile {
  repoPath?: string
  repoUrl?: string
  auth?: {
    mode?: 'ssh' | 'token'
    sshCommand?: string
    tokenEnv?: string
    token?: string
    username?: string
  }
  memoryRoot?: string
  skillsRoot?: string
  defaultBranch?: string
  remoteName?: string
  autoCommit?: boolean
}

/** Path to the user-facing config file. */
export function configFilePath(): string {
  const home = process.env['DSH_HOME']?.trim() || join(homedir(), '.dsh')
  return join(home, 'evolve-in-git.json')
}

/** Read the config file if it exists; return an empty object otherwise. */
export function readConfigFile(): ConfigFile {
  const path = configFilePath()
  if (!existsSync(path)) return {}
  try {
    const raw = readFileSync(path, 'utf8')
    const parsed = JSON.parse(raw) as ConfigFile
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch {
    return {}
  }
}

/** Persist a whole config object to the config file. */
export function writeConfigFile(config: ConfigFile): void {
  const path = configFilePath()
  mkdirSync(dirname(path), { recursive: true })
  writeFileSync(path, JSON.stringify(config, null, 2) + '\n', 'utf8')
}

/**
 * Merge Cordis config with the on-disk file. The file wins for any key it
 * provides; nested auth is replaced wholesale rather than deep-merged.
 */
export function mergeConfig(cordis: ConfigFile, file: ConfigFile): ConfigFile {
  return { ...cordis, ...file }
}
