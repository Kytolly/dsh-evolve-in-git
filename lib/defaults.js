/**
 * Plugin default configuration, shared by the host runtime (schema defaults /
 * resolveConfig) and the config-file route (the browser form's fallback
 * layer). No personal repository URLs ship here — the repoUrl default is a
 * placeholder every user must replace with their own repository.
 * @module dsh-evolve-in-git/defaults
 */
import { homedir } from 'node:os';
import { join } from 'node:path';
export const DEFAULT_MEMORY_ROOT = '.dsh-evolve/memory';
export const DEFAULT_SKILLS_ROOT = '.dsh-evolve/skills';
export const DEFAULT_ARCHIVE_ROOT = '.dsh-evolve/archive';
export const DEFAULT_BRANCH = 'main';
export const DEFAULT_REMOTE = 'origin';
export const DEFAULT_REPO_URL = 'https://github.com/<your-github-username>/<your-memory-repo>.git';
export const DEFAULT_REPO_PATH = join(homedir(), '.dsh-evolve-in-git', 'remote-memory');
export const DEFAULT_AUTH = {
    mode: 'ssh',
    sshCommand: 'ssh',
    tokenEnv: 'GITHUB_TOKEN',
    token: '',
    username: 'x-access-token',
};
export const DEFAULT_RECALL_TOP_K = 10;
export const DEFAULT_RECALL_MIN_SCORE = 0;
export const DEFAULT_RECALL_MAX_CHARS = 8000;
export const DEFAULT_DIGEST_ENABLED = true;
export const DEFAULT_DIGEST_MAX_RECORDS = 5;
export const DEFAULT_DIGEST_MAX_CHARS = 2000;
export const DEFAULT_PRIVACY_MODE = 'ask';
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
    archiveRoot: DEFAULT_ARCHIVE_ROOT,
    recallTopK: DEFAULT_RECALL_TOP_K,
    recallMinScore: DEFAULT_RECALL_MIN_SCORE,
    recallMaxChars: DEFAULT_RECALL_MAX_CHARS,
    digestEnabled: DEFAULT_DIGEST_ENABLED,
    digestMaxRecords: DEFAULT_DIGEST_MAX_RECORDS,
    digestMaxChars: DEFAULT_DIGEST_MAX_CHARS,
    privacyMode: DEFAULT_PRIVACY_MODE,
};
