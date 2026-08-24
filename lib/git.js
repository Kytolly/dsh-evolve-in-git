import { mkdirSync, writeFileSync } from 'node:fs';
import { existsSync, readdirSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { dirname, join, resolve } from 'node:path';
import { renderSkillDraft, sanitizeSegment, slugify } from './strategy.js';
export class GitEvolutionError extends Error {
    code;
    constructor(message, code, cause) {
        super(message);
        this.code = code;
        this.name = 'GitEvolutionError';
        if (cause !== undefined) {
            this.cause = cause;
        }
    }
}
function gitEnv(auth, repoUrl) {
    if (auth === undefined)
        return {};
    if (auth.mode === 'ssh') {
        return {
            GIT_SSH_COMMAND: auth.sshCommand ?? 'ssh',
        };
    }
    const token = auth.token ?? process.env[auth.tokenEnv ?? 'GITHUB_TOKEN'];
    if (token === undefined || token.trim() === '') {
        throw new GitEvolutionError('missing Git token for private repository access', 'GIT_AUTH_TOKEN_MISSING');
    }
    const username = auth.username ?? 'x-access-token';
    const origin = new URL(repoUrl).origin;
    const header = `Authorization: Basic ${Buffer.from(`${username}:${token}`).toString('base64')}`;
    return {
        [`GIT_CONFIG_COUNT`]: '1',
        [`GIT_CONFIG_KEY_0`]: `http.${origin}/.extraheader`,
        [`GIT_CONFIG_VALUE_0`]: header,
    };
}
function runGit(repoPath, args, env = {}) {
    const result = spawnSync('git', ['-C', repoPath, ...args], { encoding: 'utf8', env: { ...process.env, ...env } });
    if (result.error !== undefined) {
        throw new GitEvolutionError(`git ${args.join(' ')} failed: ${result.error.message}`, 'GIT_SPAWN_FAILED', result.error);
    }
    if (result.status !== 0) {
        throw new GitEvolutionError(result.stderr.trim() || `git ${args.join(' ')} failed`, 'GIT_COMMAND_FAILED');
    }
    return String(result.stdout ?? '').trim();
}
function cloneGit(repoUrl, repoPath, branch, auth) {
    const env = gitEnv(auth, repoUrl);
    const result = spawnSync('git', ['clone', '--branch', branch, '--single-branch', repoUrl, repoPath], {
        cwd: dirname(repoPath),
        encoding: 'utf8',
        env: { ...process.env, ...env },
    });
    if (result.error !== undefined) {
        throw new GitEvolutionError(`git clone failed: ${result.error.message}`, 'GIT_SPAWN_FAILED', result.error);
    }
    if (result.status !== 0) {
        throw new GitEvolutionError(result.stderr.trim() || 'git clone failed', 'GIT_COMMAND_FAILED');
    }
}
export function ensureGitRepository(repoPath) {
    const resolved = resolve(repoPath);
    if (!existsSync(join(resolved, '.git'))) {
        throw new GitEvolutionError(`not a git repository: ${resolved}`, 'GIT_REPOSITORY_MISSING');
    }
    return resolved;
}
function canonicalRepoId(repoUrl) {
    const trimmed = repoUrl.trim();
    if (trimmed.startsWith('git@')) {
        const withoutPrefix = trimmed.slice('git@'.length);
        const separator = withoutPrefix.indexOf(':');
        if (separator === -1)
            return withoutPrefix.replace(/\.git$/i, '').toLowerCase();
        const host = withoutPrefix.slice(0, separator).toLowerCase();
        const path = withoutPrefix.slice(separator + 1).replace(/\.git$/i, '').replace(/^\/+/, '');
        return `${host}/${path}`.toLowerCase();
    }
    try {
        const parsed = new URL(trimmed);
        const path = parsed.pathname.replace(/\.git$/i, '').replace(/^\/+/, '');
        return `${parsed.host.toLowerCase()}/${path.toLowerCase()}`;
    }
    catch {
        return trimmed.replace(/\.git$/i, '').replace(/^\/+/, '').toLowerCase();
    }
}
export function remoteUrl(repoPath, remote) {
    const resolved = ensureGitRepository(repoPath);
    try {
        return runGit(resolved, ['remote', 'get-url', remote]);
    }
    catch (error) {
        throw new GitEvolutionError(`missing Git remote ${JSON.stringify(remote)} in ${resolved}`, 'GIT_REMOTE_MISSING', error);
    }
}
export function ensureRemoteMatches(repoPath, remote, repoUrl) {
    const actual = remoteUrl(repoPath, remote);
    if (canonicalRepoId(actual) !== canonicalRepoId(repoUrl)) {
        throw new GitEvolutionError(`remote ${JSON.stringify(remote)} points to ${actual}, expected ${repoUrl}`, 'GIT_REMOTE_MISMATCH');
    }
    return actual;
}
export function verifyRemoteAccess(repoPath, remote, repoUrl, auth) {
    runGit(repoPath, ['ls-remote', '--exit-code', remote, 'HEAD'], gitEnv(auth, repoUrl));
}
export function openRepository(config) {
    const resolved = resolve(config.repoPath);
    if (existsSync(join(resolved, '.git')))
        return resolved;
    if (existsSync(resolved) && readdirSync(resolved).length > 0) {
        throw new GitEvolutionError(`repository path exists but is not a git checkout: ${resolved}`, 'GIT_REPOSITORY_DIRTY');
    }
    mkdirSync(dirname(resolved), { recursive: true });
    cloneGit(config.repoUrl, resolved, config.defaultBranch, config.auth);
    return resolved;
}
export function currentBranch(repoPath) {
    const branch = runGit(repoPath, ['branch', '--show-current']);
    return branch === '' ? 'HEAD' : branch;
}
export function currentHead(repoPath) {
    const head = runGit(repoPath, ['rev-parse', 'HEAD']);
    return head === '' ? undefined : head;
}
export function listBranches(repoPath) {
    const output = runGit(repoPath, ['for-each-ref', '--format=%(refname:short)', 'refs/heads']);
    return output === '' ? [] : output.split(/\r?\n/).filter(Boolean);
}
export function checkoutBranch(repoPath, branch, from) {
    const args = from === undefined ? ['switch', branch] : ['switch', '-c', branch, from];
    runGit(repoPath, args);
}
export function createBranch(repoPath, branch, from) {
    const args = from === undefined ? ['branch', branch] : ['branch', branch, from];
    runGit(repoPath, args);
}
export function pushBranch(repoPath, branch, remote, auth, repoUrl) {
    runGit(repoPath, ['push', remote, branch], repoUrl === undefined ? {} : gitEnv(auth, repoUrl));
}
export function fetchRemote(repoPath, remote, auth, repoUrl) {
    runGit(repoPath, ['fetch', remote], repoUrl === undefined ? {} : gitEnv(auth, repoUrl));
}
export function connectRepository(config) {
    const repoPath = openRepository(config);
    ensureRemoteMatches(repoPath, config.remoteName, config.repoUrl);
    verifyRemoteAccess(repoPath, config.remoteName, config.repoUrl, config.auth);
    return repoPath;
}
export function gitStatus(repoPath) {
    const lines = runGit(repoPath, ['status', '--short', '--branch']).split(/\r?\n/).filter(Boolean);
    const [headLine = ''] = lines;
    const changedFiles = lines.slice(1).map((line) => line.slice(3));
    const branchMatch = headLine.match(/^##\s+(.+?)(?:\.\.\.(.+?))?(?:\s+\[ahead\s+(\d+)(?:,\s*behind\s+(\d+))?\])?$/);
    const branch = branchMatch?.[1] ?? currentBranch(repoPath);
    const ahead = branchMatch?.[3] === undefined ? 0 : Number(branchMatch[3]);
    const behind = branchMatch?.[4] === undefined ? 0 : Number(branchMatch[4]);
    return {
        branch,
        head: existsSync(join(repoPath, '.git', 'HEAD')) ? currentHead(repoPath) : undefined,
        ahead: Number.isFinite(ahead) ? ahead : 0,
        behind: Number.isFinite(behind) ? behind : 0,
        clean: changedFiles.length === 0,
        changedFiles,
    };
}
function toIsoStamp(date = new Date()) {
    return date.toISOString().replaceAll(':', '-').replace(/\.\d{3}Z$/, 'Z');
}
function frontmatter(lines) {
    const output = ['---'];
    for (const [key, value] of Object.entries(lines)) {
        if (value === undefined)
            continue;
        if (Array.isArray(value)) {
            output.push(`${key}: [${value.map((item) => JSON.stringify(item)).join(', ')}]`);
            continue;
        }
        output.push(`${key}: ${JSON.stringify(value)}`);
    }
    output.push('---');
    return output.join('\n');
}
function commitPaths(repoPath, paths, message) {
    if (paths.length === 0)
        return undefined;
    runGit(repoPath, ['add', '--', ...paths]);
    const staged = spawnSync('git', ['-C', repoPath, 'diff', '--cached', '--quiet'], { encoding: 'utf8' });
    if (staged.status === 0)
        return currentHead(repoPath);
    if (staged.status !== 1) {
        throw new GitEvolutionError(staged.stderr.trim() || 'git diff --cached --quiet failed', 'GIT_COMMAND_FAILED', staged.error);
    }
    runGit(repoPath, ['commit', '--no-gpg-sign', '--message', message]);
    return currentHead(repoPath);
}
export function writeMemoryRecord(config, input) {
    const repoPath = openRepository(config);
    const createdAt = new Date().toISOString();
    const branch = input.branch ?? currentBranch(repoPath);
    const filePath = join(repoPath, config.memoryRoot, sanitizeSegment(input.kind), `${toIsoStamp()}-${slugify(input.title)}.md`);
    mkdirSync(dirname(filePath), { recursive: true });
    const body = [
        frontmatter({
            kind: input.kind,
            title: input.title,
            branch,
            source: input.source,
            tags: input.tags,
            createdAt,
        }),
        '',
        input.content.trimEnd(),
        '',
    ].join('\n');
    writeFileSync(filePath, body, 'utf8');
    const message = `memory(${input.kind}): ${input.title}`;
    const commit = config.autoCommit ? commitPaths(repoPath, [filePath], message) : undefined;
    return {
        path: filePath,
        branch,
        commit,
        message,
        kind: input.kind,
        title: input.title,
        content: input.content,
        createdAt,
        ...(input.tags === undefined ? {} : { tags: input.tags }),
        ...(input.source === undefined ? {} : { source: input.source }),
    };
}
export function writeSkillDraft(config, draft) {
    const repoPath = openRepository(config);
    const filePath = join(repoPath, config.skillsRoot, sanitizeSegment(draft.name), 'SKILL.md');
    mkdirSync(dirname(filePath), { recursive: true });
    const rendered = renderSkillDraft(draft);
    writeFileSync(filePath, rendered.content, 'utf8');
    const message = `skill: ${draft.name}`;
    const commit = config.autoCommit ? commitPaths(repoPath, [filePath], message) : undefined;
    return {
        path: filePath,
        commit,
        branch: currentBranch(repoPath),
        message,
        name: rendered.name,
        description: rendered.description,
        whenToUse: rendered.whenToUse,
        instructions: rendered.instructions,
        content: rendered.content,
        ...(rendered.tags === undefined ? {} : { tags: rendered.tags }),
    };
}
