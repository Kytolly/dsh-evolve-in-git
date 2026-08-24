/**
 * Plugin default configuration, shared by the host runtime (schema defaults /
 * resolveConfig) and the config-file route (the browser form's fallback
 * layer). No personal repository URLs ship here — the repoUrl default is a
 * placeholder every user must replace with their own repository.
 * @module dsh-evolve-in-git/defaults
 */

import { homedir } from 'node:os'
import { join } from 'node:path'

export const DEFAULT_MEMORY_ROOT = '.dsh-evolve/memory'
export const DEFAULT_SKILLS_ROOT = '.dsh-evolve/skills'
export const DEFAULT_BRANCH = 'main'
export const DEFAULT_REMOTE = 'origin'
export const DEFAULT_REPO_URL = 'https://github.com/<your-github-username>/<your-memory-repo>.git'
export const DEFAULT_REPO_PATH = join(homedir(), '.dsh-evolve-in-git', 'remote-memory')
export const DEFAULT_AUTH = {
  mode: 'ssh' as const,
  sshCommand: 'ssh',
  tokenEnv: 'GITHUB_TOKEN',
  token: '',
  username: 'x-access-token',
}

/** The plugin's full default configuration (mirrors the Config schema defaults). */
export const DEFAULT_CONFIG = {
  repoPath: DEFAULT_REPO_PATH,
  repoUrl: DEFAULT_REPO_URL,
  auth: DEFAULT_AUTH,
  memoryRoot: DEFAULT_MEMORY_ROOT,
  skillsRoot: DEFAULT_SKILLS_ROOT,
  defaultBranch: DEFAULT_BRANCH,
  remoteName: DEFAULT_REMOTE,
  autoCommit: true,
} as const
