const MEMORY_KINDS = ['session', 'skill', 'warning', 'persona', 'note'];
export const EVOLVE_TOOL_NAMES = Object.freeze([
    'evolve_connect',
    'evolve_status',
    'evolve_remember',
    'evolve_branches',
    'evolve_help',
]);
export const EVOLVE_COMMAND = '/evolve';
export const EVOLVE_USAGE = Object.freeze([
    '/evolve connect',
    '/evolve status',
    '/evolve branches',
    '/evolve remember <kind> <title> :: <content>',
    '/evolve help',
]);
export const EVOLVE_SAFETY = Object.freeze([
    'connect verifies the local checkout, remote URL, and auth before reporting success',
    'remember writes only to the configured memory repository',
    'v0.1.2 does not expose branch mutation or rollback through the command surface',
]);
function rememberUsage() {
    return 'Usage: /evolve remember <kind> <title> :: <content>';
}
export function parseEvolveCommand(rawInput) {
    const input = rawInput.trim();
    if (input.length === 0 || input === 'help')
        return { kind: 'help' };
    if (input === 'connect')
        return { kind: 'connect' };
    if (input === 'status')
        return { kind: 'status' };
    if (input === 'branches')
        return { kind: 'branches' };
    if (!input.startsWith('remember'))
        return { kind: 'invalid', message: renderHelpText() };
    const remainder = input.slice('remember'.length).trim();
    const separator = remainder.indexOf('::');
    if (separator === -1)
        return { kind: 'invalid', message: rememberUsage() };
    const left = remainder.slice(0, separator).trim();
    const content = remainder.slice(separator + 2).trim();
    if (left.length === 0 || content.length === 0)
        return { kind: 'invalid', message: rememberUsage() };
    const firstSpace = left.indexOf(' ');
    if (firstSpace === -1)
        return { kind: 'invalid', message: rememberUsage() };
    const kind = left.slice(0, firstSpace).trim();
    let title = left.slice(firstSpace + 1).trim();
    let expiresAt;
    const expiresMatch = title.match(/\s+--expires\s+(\S+)\s*$/);
    if (expiresMatch !== null && expiresMatch.index !== undefined) {
        expiresAt = expiresMatch[1];
        title = title.slice(0, expiresMatch.index).trim();
    }
    if (!MEMORY_KINDS.includes(kind) || title.length === 0)
        return { kind: 'invalid', message: rememberUsage() };
    return { kind: 'remember', record: expiresAt === undefined ? { kind, title, content } : { kind, title, content, expiresAt } };
}
export function renderHelpView() {
    return {
        command: EVOLVE_COMMAND,
        tools: [...EVOLVE_TOOL_NAMES],
        usage: [...EVOLVE_USAGE],
        safety: [...EVOLVE_SAFETY],
    };
}
export function renderHelpText() {
    return [
        'DeepSeek Harness evolution controls',
        '',
        'Usage:',
        ...EVOLVE_USAGE.map(line => `- ${line}`),
        '',
        'Safety:',
        ...EVOLVE_SAFETY.map(line => `- ${line}`),
    ].join('\n');
}
export function renderStatusText(title, view) {
    const changes = view.changedFiles.length === 0 ? 'none' : view.changedFiles.join(', ');
    return [
        title,
        `Repo: ${view.repoPath}`,
        `Remote: ${view.remoteName} -> ${view.repoUrl}`,
        `Branch: ${view.branch}`,
        `HEAD: ${view.head ?? 'unborn'}`,
        `Ahead/behind: ${view.ahead}/${view.behind}`,
        `Working tree: ${view.clean ? 'clean' : 'dirty'}`,
        `Changed files: ${changes}`,
    ].join('\n');
}
export function renderBranchesText(view) {
    return [
        'Evolution branches',
        `Repo: ${view.repoPath}`,
        `Current: ${view.currentBranch}`,
        ...view.branches.map(branch => `- ${branch}`),
    ].join('\n');
}
export function renderRememberText(view) {
    const tags = view.tags.length === 0 ? 'none' : view.tags.join(', ');
    return [
        'Memory recorded',
        `Kind: ${view.kind}`,
        `Title: ${view.title}`,
        `Branch: ${view.branch}`,
        `Commit: ${view.commit ?? 'pending'}`,
        `Path: ${view.path}`,
        `Tags: ${tags}`,
        `Source: ${view.source ?? 'none'}`,
    ].join('\n');
}
export function userFacingError(error) {
    if (typeof error === 'object' && error !== null && 'code' in error && 'message' in error) {
        const value = error;
        return `[${value.code}] ${value.message}`;
    }
    if (error instanceof Error)
        return error.message;
    return 'Unexpected evolve-git error.';
}
