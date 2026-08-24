/**
 * Git-backed memory and evolution runtime for DeepSeek Harness.
 * @module dsh-evolve-in-git
 */
import { Service } from '@deepseek-ai/cordis';
import z from '@deepseek-ai/schemastery';
import { defineTool } from '@deepseek-ai/dsh-tools';
import { checkoutBranch as gitCheckoutBranch, connectRepository, createBranch as gitCreateBranch, currentBranch, fetchRemote, gitStatus, listBranches, pushBranch, writeMemoryRecord, writeSkillDraft, } from './git.js';
import { parseEvolveCommand, renderBranchesText, renderHelpText, renderHelpView, renderRememberText, renderStatusText, userFacingError, } from './harness.js';
import { configFilePath, mergeConfig, readConfigFile, writeConfigFile } from './config.js';
import { DEFAULT_AUTH, DEFAULT_BRANCH, DEFAULT_MEMORY_ROOT, DEFAULT_REMOTE, DEFAULT_REPO_PATH, DEFAULT_REPO_URL, DEFAULT_SKILLS_ROOT } from './defaults.js';
import { makeConfigRoutes } from './config-route.js';
import { draftSkillFromRecord, renderSkillDraft, suggestEvolution, } from './strategy.js';
export const name = 'dsh-evolve-in-git';
export const inject = ['commands', 'tools', 'systemPrompt'];
export { GitEvolutionError, checkoutBranch, connectRepository, createBranch, currentBranch, ensureGitRepository, fetchRemote, gitStatus, pushBranch, } from './git.js';
export { parseEvolveCommand, renderBranchesText, renderHelpText, renderHelpView, renderRememberText, renderStatusText, userFacingError, } from './harness.js';
export { branchNameForRecord, draftSkillFromRecord, memoryPreview, renderSkillDraft, sanitizeSegment, shouldOfferSkillPromotion, slugify, suggestEvolution } from './strategy.js';
const PROMPT_TEXT = 'Use evolve_connect to verify the private memory repository, evolve_status to inspect branch and sync state, '
    + 'evolve_remember to persist a reusable memory note, evolve_branches to inspect local evolution branches, and '
    + 'evolve_help to recall the command and safety surface.';
const STATUS_VIEW_SCHEMA = {
    type: 'object',
    additionalProperties: false,
    properties: {
        repoPath: { type: 'string', required: true },
        repoUrl: { type: 'string', required: true },
        remoteName: { type: 'string', required: true },
        verified: { type: 'boolean', required: true },
        branch: { type: 'string', required: true },
        head: { oneOf: [{ type: 'string' }, { type: 'null' }], required: true },
        ahead: { type: 'integer', required: true },
        behind: { type: 'integer', required: true },
        clean: { type: 'boolean', required: true },
        changedFiles: { type: 'array', required: true, items: { type: 'string' } },
    },
};
const BRANCHES_VIEW_SCHEMA = {
    type: 'object',
    additionalProperties: false,
    properties: {
        repoPath: { type: 'string', required: true },
        repoUrl: { type: 'string', required: true },
        remoteName: { type: 'string', required: true },
        currentBranch: { type: 'string', required: true },
        branches: { type: 'array', required: true, items: { type: 'string' } },
    },
};
const REMEMBER_VIEW_SCHEMA = {
    type: 'object',
    additionalProperties: false,
    properties: {
        repoPath: { type: 'string', required: true },
        repoUrl: { type: 'string', required: true },
        path: { type: 'string', required: true },
        branch: { type: 'string', required: true },
        commit: { oneOf: [{ type: 'string' }, { type: 'null' }], required: true },
        message: { type: 'string', required: true },
        kind: { type: 'string', required: true, enum: ['session', 'skill', 'warning', 'persona', 'note'] },
        title: { type: 'string', required: true },
        createdAt: { type: 'string', required: true },
        source: { oneOf: [{ type: 'string' }, { type: 'null' }], required: true },
        tags: { type: 'array', required: true, items: { type: 'string' } },
    },
};
const HELP_VIEW_SCHEMA = {
    type: 'object',
    additionalProperties: false,
    properties: {
        command: { type: 'string', required: true },
        tools: { type: 'array', required: true, items: { type: 'string' } },
        usage: { type: 'array', required: true, items: { type: 'string' } },
        safety: { type: 'array', required: true, items: { type: 'string' } },
    },
};
function jsonOutput(schema) {
    return {
        schema,
        render: (_args, value) => [{ type: 'text', text: JSON.stringify(value, null, 2) }],
    };
}
function resolveConfig(config) {
    return {
        repoPath: config.repoPath?.trim() || DEFAULT_REPO_PATH,
        repoUrl: config.repoUrl?.trim() || DEFAULT_REPO_URL,
        auth: config.auth ?? DEFAULT_AUTH,
        memoryRoot: config.memoryRoot?.trim() || DEFAULT_MEMORY_ROOT,
        skillsRoot: config.skillsRoot?.trim() || DEFAULT_SKILLS_ROOT,
        defaultBranch: config.defaultBranch?.trim() || DEFAULT_BRANCH,
        remoteName: config.remoteName?.trim() || DEFAULT_REMOTE,
        autoCommit: config.autoCommit ?? true,
    };
}
function normalizeStatus(repoPath, config, status) {
    return {
        repoPath,
        repoUrl: config.repoUrl,
        remoteName: config.remoteName,
        verified: true,
        branch: status.branch,
        head: status.head ?? null,
        ahead: status.ahead,
        behind: status.behind,
        clean: status.clean,
        changedFiles: [...status.changedFiles],
    };
}
function normalizeBranches(repoPath, config, branches) {
    return {
        repoPath,
        repoUrl: config.repoUrl,
        remoteName: config.remoteName,
        currentBranch: currentBranch(repoPath),
        branches,
    };
}
function normalizeRemember(config, value) {
    return {
        repoPath: config.repoPath,
        repoUrl: config.repoUrl,
        path: value.path,
        branch: value.branch,
        commit: value.commit ?? null,
        message: value.message,
        kind: value.kind,
        title: value.title,
        createdAt: value.createdAt,
        source: value.source ?? null,
        tags: value.tags === undefined ? [] : [...value.tags],
    };
}
/**
 * Runtime service for Git-backed memory, branch evolution, Harness tools, and a human command.
 */
export class GitEvolutionService extends Service {
    static inject = inject;
    static Config = z.object({
        repoPath: z.string().default(DEFAULT_REPO_PATH),
        repoUrl: z.string().default(DEFAULT_REPO_URL),
        auth: z.object({
            mode: z.union([z.const('ssh'), z.const('token')]),
            sshCommand: z.string(),
            tokenEnv: z.string(),
            token: z.string().role('secret'),
            username: z.string(),
        }).default(DEFAULT_AUTH),
        memoryRoot: z.string().default(DEFAULT_MEMORY_ROOT),
        skillsRoot: z.string().default(DEFAULT_SKILLS_ROOT),
        defaultBranch: z.string().default(DEFAULT_BRANCH),
        remoteName: z.string().default(DEFAULT_REMOTE),
        autoCommit: z.boolean().default(true),
    });
    config;
    baseConfig;
    constructor(ctx, config) {
        super(ctx, 'evolveGit');
        this.baseConfig = config;
        this.config = resolveConfig(mergeConfig(config, readConfigFile()));
        ctx.systemPrompt.section({
            name: 'tool:evolve-git',
            order: 116,
            text: PROMPT_TEXT,
        });
        this.registerTools(ctx);
        ctx.effect(() => ctx.commands.register({
            name: 'evolve',
            description: 'inspect or write Git-backed long-term memory',
            input: { hint: 'connect|status|branches|remember <kind> <title> :: <content>|config show|open|refresh|set <key> <value>|help' },
            handler: invocation => this.runCommand(invocation),
        }), 'dsh-evolve-in-git: command');
        this.registerConfigRoute(ctx);
    }
    /** Recompute this.config from the config file over the Cordis base (the config file is the single user layer). */
    refreshConfig() {
        this.config = resolveConfig(mergeConfig(this.baseConfig, readConfigFile()));
    }
    registerTools(ctx) {
        ctx.tools.register(defineTool({
            name: 'evolve_connect',
            description: 'Ensure the configured private memory repository exists locally, matches the configured remote, and is reachable with the current auth settings.',
            parameters: {},
            output: jsonOutput(STATUS_VIEW_SCHEMA),
            isConcurrencySafe: () => true,
            execute: async () => this.connectView(),
            presentCall: () => ({ card: 'generic', title: 'Connect evolve memory', kind: 'read' }),
        }));
        ctx.tools.register(defineTool({
            name: 'evolve_status',
            description: 'Read the current evolve-memory branch, HEAD, ahead/behind counts, cleanliness, and changed file list.',
            parameters: {},
            output: jsonOutput(STATUS_VIEW_SCHEMA),
            isConcurrencySafe: () => true,
            execute: async () => this.statusView(),
            presentCall: () => ({ card: 'generic', title: 'Read evolve status', kind: 'read' }),
        }));
        ctx.tools.register(defineTool({
            name: 'evolve_remember',
            description: 'Write one long-term memory entry into the configured Git repository. Use this for warnings, persona guidance, reusable notes, or session memory worth preserving.',
            parameters: {
                kind: {
                    type: 'string',
                    required: true,
                    enum: ['session', 'skill', 'warning', 'persona', 'note'],
                    description: 'Memory kind to persist.',
                },
                title: { type: 'string', required: true, description: 'Short memory title.' },
                content: { type: 'string', required: true, description: 'Memory content to persist.' },
                source: { type: 'string', description: 'Optional source pointer, such as a session id or command origin.' },
                branch: { type: 'string', description: 'Optional target branch; omit to use the current branch.' },
                tags: { type: 'array', items: { type: 'string' }, description: 'Optional memory tags.' },
            },
            output: jsonOutput(REMEMBER_VIEW_SCHEMA),
            execute: async (args) => this.rememberView({
                kind: args.kind,
                title: args.title,
                content: args.content,
                ...(args.source === undefined ? {} : { source: args.source }),
                ...(args.branch === undefined ? {} : { branch: args.branch }),
                ...(args.tags === undefined ? {} : { tags: args.tags }),
            }),
            presentCall: args => ({ card: 'generic', title: `Remember ${args.kind}`, kind: 'other', rawInput: args.title }),
        }));
        ctx.tools.register(defineTool({
            name: 'evolve_branches',
            description: 'List local evolution branches in the configured memory repository and report the current branch.',
            parameters: {},
            output: jsonOutput(BRANCHES_VIEW_SCHEMA),
            isConcurrencySafe: () => true,
            execute: async () => this.branchesView(),
            presentCall: () => ({ card: 'generic', title: 'List evolve branches', kind: 'read' }),
        }));
        ctx.tools.register(defineTool({
            name: 'evolve_help',
            description: 'Show the supported evolve-memory command and tool surface, including the safe remember syntax.',
            parameters: {},
            output: jsonOutput(HELP_VIEW_SCHEMA),
            isConcurrencySafe: () => true,
            execute: async () => this.helpView(),
            presentCall: () => ({ card: 'generic', title: 'Read evolve help', kind: 'read' }),
        }));
    }
    /**
     * Register the config-file routes ('/api/evolve-git/config') backing the
     * browser config-file editor. The web server service is optional (headless
     * profiles never mount one), so registration waits for it via
     * 'internal/service'; writes reload the runtime config immediately.
     */
    registerConfigRoute(ctx) {
        const routes = makeConfigRoutes(() => this.refreshConfig());
        ctx.effect(() => {
            const disposers = [];
            let registered = false;
            const mount = () => {
                if (registered)
                    return;
                const host = (ctx.get('webServer') ?? ctx.get('httpServer'));
                if (host === undefined)
                    return;
                registered = true;
                for (const route of routes)
                    disposers.push(host.register(route));
            };
            mount();
            if (registered)
                return () => { for (const dispose of disposers)
                    dispose(); };
            // The web server may mount after this plugin's apply: re-try on its service event.
            const off = ctx.on('internal/service', (name) => {
                if (name === 'webServer' || name === 'httpServer')
                    mount();
            });
            return () => {
                off();
                for (const dispose of disposers)
                    dispose();
            };
        }, 'dsh-evolve-in-git: config route');
    }
    async status() {
        return gitStatus(connectRepository(this.config));
    }
    async statusView() {
        const repoPath = connectRepository(this.config);
        return normalizeStatus(repoPath, this.config, gitStatus(repoPath));
    }
    async branches() {
        return listBranches(connectRepository(this.config));
    }
    async branchesView() {
        const repoPath = connectRepository(this.config);
        return normalizeBranches(repoPath, this.config, listBranches(repoPath));
    }
    async record(record) {
        return writeMemoryRecord(this.config, record);
    }
    async rememberView(record) {
        return normalizeRemember(this.config, await this.record(record));
    }
    async draftSkill(record) {
        return renderSkillDraft(draftSkillFromRecord(record));
    }
    async suggest(record) {
        return suggestEvolution(record);
    }
    async saveSkillDraft(draft) {
        return writeSkillDraft(this.config, draft);
    }
    async createBranch(branch, from) {
        gitCreateBranch(connectRepository(this.config), branch, from ?? this.config.defaultBranch);
    }
    async checkout(branch) {
        gitCheckoutBranch(connectRepository(this.config), branch);
    }
    async fetch() {
        const repoPath = connectRepository(this.config);
        fetchRemote(repoPath, this.config.remoteName, this.config.auth, this.config.repoUrl);
    }
    async push(branch) {
        const repoPath = connectRepository(this.config);
        pushBranch(repoPath, branch ?? currentBranch(repoPath), this.config.remoteName, this.config.auth, this.config.repoUrl);
    }
    async connect() {
        return gitStatus(connectRepository(this.config));
    }
    async connectView() {
        const repoPath = connectRepository(this.config);
        return normalizeStatus(repoPath, this.config, gitStatus(repoPath));
    }
    async helpView() {
        return renderHelpView();
    }
    async runCommand(invocation) {
        try {
            const input = invocation.rawInput.trim();
            if (input.startsWith('config')) {
                return this.runConfigCommand(input.slice('config'.length).trim());
            }
            const parsed = parseEvolveCommand(input);
            switch (parsed.kind) {
                case 'connect':
                    return { kind: 'success', text: renderStatusText('Memory repository connected', await this.connectView()) };
                case 'status':
                    return { kind: 'success', text: renderStatusText('Memory repository status', await this.statusView()) };
                case 'branches':
                    return { kind: 'success', text: renderBranchesText(await this.branchesView()) };
                case 'remember':
                    return { kind: 'success', text: renderRememberText(await this.rememberView({ ...parsed.record, source: 'command:/evolve remember' })) };
                case 'help':
                    return { kind: 'success', text: renderHelpText() };
                case 'invalid':
                    return { kind: 'error', text: parsed.message };
                default:
                    return { kind: 'error', text: renderHelpText() };
            }
        }
        catch (error) {
            return { kind: 'error', text: userFacingError(error) };
        }
    }
    runConfigCommand(rest) {
        const path = configFilePath();
        const parts = rest.trim().split(/\s+/).filter(Boolean);
        const cmd = parts[0] ?? 'show';
        const show = () => ({
            kind: 'success',
            text: [
                'EvolveInGit config file: ' + path,
                'repoPath: ' + this.config.repoPath,
                'repoUrl: ' + this.config.repoUrl,
                'auth.mode: ' + this.config.auth.mode,
                'auth.tokenEnv: ' + (this.config.auth.tokenEnv ?? ''),
                'memoryRoot: ' + this.config.memoryRoot,
                'skillsRoot: ' + this.config.skillsRoot,
                'defaultBranch: ' + this.config.defaultBranch,
                'remoteName: ' + this.config.remoteName,
                'autoCommit: ' + String(this.config.autoCommit),
            ].join('\n'),
        });
        const reloadText = () => 'Config reloaded from:\n  ' + path;
        switch (cmd) {
            case 'show':
                return show();
            case 'open':
                return { kind: 'success', text: 'Open the config file in your editor:\n  ' + path };
            case 'refresh':
                this.config = resolveConfig(mergeConfig(this.baseConfig, readConfigFile()));
                return { kind: 'success', text: reloadText() };
            case 'set': {
                const key = parts[1];
                const value = parts.slice(2).join(' ');
                if (!key || value.length === 0) {
                    return { kind: 'error', text: 'Usage: /evolve config set <key> <value>' };
                }
                const current = readConfigFile();
                const parsedValue = parseConfigValue(value);
                setByPath(current, key, parsedValue);
                writeConfigFile(current);
                this.config = resolveConfig(mergeConfig(this.baseConfig, readConfigFile()));
                return { kind: 'success', text: 'Saved ' + key + ' = ' + JSON.stringify(parsedValue) + ' -> ' + path };
            }
            default:
                return { kind: 'error', text: 'Usage: /evolve config show|open|refresh|set <key> <value>' };
        }
    }
}
function parseConfigValue(raw) {
    const trimmed = raw.trim();
    if (trimmed === 'true')
        return true;
    if (trimmed === 'false')
        return false;
    if (/^-?\d+$/.test(trimmed))
        return Number(trimmed);
    try {
        return JSON.parse(trimmed);
    }
    catch {
        return trimmed;
    }
}
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function setByPath(obj, path, value) {
    const parts = path.split('.');
    let cur = obj;
    for (let i = 0; i < parts.length - 1; i++) {
        const part = parts[i];
        if (typeof cur[part] !== 'object' || cur[part] === null)
            cur[part] = {};
        cur = cur[part];
    }
    cur[parts[parts.length - 1]] = value;
}
export default GitEvolutionService;
