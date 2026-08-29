/**
 * Git-backed memory and evolution runtime for DeepSeek Harness.
 *
 * This module is the DSH adapter: it owns Cordis service registration, tool
 * definitions, the /evolve command, the system prompt, and the config route.
 * All memory/Git/skill behavior lives in the framework-free MemoryCore
 * (src/core.ts); this service only maps host surfaces onto it.
 * @module dsh-evolve-in-git
 */
import { Service } from '@deepseek-ai/cordis';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import z from '@deepseek-ai/schemastery';
import { defineTool } from '@deepseek-ai/dsh-tools';
import { GitMemoryCore } from './core.js';
import { normalizeEvolveCommand, parseEvolveCommand, renderBranchesText, renderHelpText, renderHelpView, renderRememberText, renderStatusText, userFacingError, } from './harness.js';
import { makeConfigRoutes } from './config-route.js';
import { DEFAULT_ARCHIVE_ROOT, DEFAULT_AUTH, DEFAULT_BRANCH, DEFAULT_DIGEST_ENABLED, DEFAULT_DIGEST_MAX_CHARS, DEFAULT_DIGEST_MAX_RECORDS, DEFAULT_MEMORY_ROOT, DEFAULT_PRIVACY_MODE, DEFAULT_RECALL_MAX_CHARS, DEFAULT_RECALL_MIN_SCORE, DEFAULT_RECALL_TOP_K, DEFAULT_REMOTE, DEFAULT_REPO_PATH, DEFAULT_REPO_URL, DEFAULT_SKILLS_ROOT } from './defaults.js';
export const name = 'dsh-evolve-in-git';
export const inject = ['commands', 'tools', 'systemPrompt'];
export { GitEvolutionError, checkoutBranch, connectRepository, createBranch, currentBranch, ensureGitRepository, fetchRemote, gitStatus, pushBranch, } from './git.js';
export { parseEvolveCommand, renderBranchesText, renderHelpText, renderHelpView, renderRememberText, renderStatusText, userFacingError, } from './harness.js';
export { branchNameForRecord, draftSkillFromRecord, memoryPreview, renderSkillDraft, sanitizeSegment, shouldOfferSkillPromotion, slugify, suggestEvolution } from './strategy.js';
const PROMPT_TEXT = 'Use evolve_connect to verify the private memory repository, evolve_status to inspect branch and sync state, '
    + 'evolve_remember (or memory_save) to persist a reusable memory note, evolve_update (or memory_update) to revise one, evolve_forget (or memory_delete) and evolve_restore to archive and restore, evolve_branches to inspect local evolution branches, '
    + 'evolve_skill_draft to turn a memory into a skill draft, evolve_skill_list to see promotable skill drafts, evolve_skill_promote to install one into the skill registry, evolve_skill_demote to move one back to drafts, evolve_rollback to undo a memory/skill commit (dry-run available), evolve_conflicts to list unresolved conflicts, and '
    + 'before a high-stakes step, use evolve_recall (or memory_search) to surface relevant prior memory (or evolve_timeline to read the memory history) instead of asking the user to repeat it; and '
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
        updatedAt: { type: 'string', required: true },
        id: { type: 'string', required: true },
        status: { type: 'string', required: true },
        supersedes: { oneOf: [{ type: 'string' }, { type: 'null' }], required: true },
        supersededBy: { oneOf: [{ type: 'string' }, { type: 'null' }], required: true },
        source: { oneOf: [{ type: 'string' }, { type: 'null' }], required: true },
        expiresAt: { oneOf: [{ type: 'string' }, { type: 'null' }], required: true },
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
const SKILL_LIST_VIEW_SCHEMA = {
    type: 'array',
    items: {
        type: 'object',
        additionalProperties: false,
        properties: {
            name: { type: 'string', required: true },
            description: { type: 'string', required: true },
            path: { type: 'string', required: true },
        },
    },
};
const PROMOTE_VIEW_SCHEMA = {
    type: 'object',
    additionalProperties: false,
    properties: {
        name: { type: 'string', required: true },
        description: { type: 'string', required: true },
        path: { type: 'string', required: true },
        targetPath: { type: 'string', required: true },
    },
};
const DRAFT_VIEW_SCHEMA = {
    type: 'object',
    additionalProperties: false,
    properties: {
        name: { type: 'string', required: true },
        description: { type: 'string', required: true },
        whenToUse: { type: 'string', required: true },
        path: { type: 'string', required: true },
        content: { type: 'string', required: true },
    },
};
const ROLLBACK_VIEW_SCHEMA = {
    type: 'object',
    additionalProperties: false,
    properties: {
        dryRun: { type: 'boolean', required: true },
        reverted: { type: 'boolean', required: true },
        commit: { oneOf: [{ type: 'string' }, { type: 'null' }], required: true },
        wouldChange: { type: 'array', required: true, items: { type: 'string' } },
    },
};
const CONFLICTS_VIEW_SCHEMA = {
    type: 'object',
    additionalProperties: false,
    properties: {
        conflicts: { type: 'array', required: true, items: { type: 'string' } },
    },
};
const RESOLVE_VIEW_SCHEMA = {
    type: 'object',
    additionalProperties: false,
    properties: {
        path: { type: 'string', required: true },
        strategy: { type: 'string', required: true },
    },
};
const MEMORY_ITEM_SCHEMA = {
    type: 'object',
    additionalProperties: false,
    properties: {
        path: { type: 'string', required: true },
        kind: { oneOf: [{ type: 'string' }, { type: 'null' }], required: true },
        title: { oneOf: [{ type: 'string' }, { type: 'null' }], required: true },
        branch: { oneOf: [{ type: 'string' }, { type: 'null' }], required: true },
        source: { oneOf: [{ type: 'string' }, { type: 'null' }], required: true },
        tags: { type: 'array', required: true, items: { type: 'string' } },
        createdAt: { oneOf: [{ type: 'string' }, { type: 'null' }], required: true },
        updatedAt: { oneOf: [{ type: 'string' }, { type: 'null' }], required: true },
        id: { oneOf: [{ type: 'string' }, { type: 'null' }], required: true },
        status: { oneOf: [{ type: 'string' }, { type: 'null' }], required: true },
        sensitivity: { oneOf: [{ type: 'string' }, { type: 'null' }], required: true },
        supersedes: { oneOf: [{ type: 'string' }, { type: 'null' }], required: true },
        supersededBy: { oneOf: [{ type: 'string' }, { type: 'null' }], required: true },
        expiresAt: { oneOf: [{ type: 'string' }, { type: 'null' }], required: true },
        content: { type: 'string', required: true },
    },
};
const RECALL_ITEM_SCHEMA = {
    type: 'object',
    additionalProperties: false,
    properties: {
        ...MEMORY_ITEM_SCHEMA.properties,
        score: { type: 'number', required: true },
    },
};
const TIMELINE_VIEW_SCHEMA = { type: 'array', items: MEMORY_ITEM_SCHEMA };
const RECALL_VIEW_SCHEMA = { type: 'array', items: RECALL_ITEM_SCHEMA };
const BRANCH_DIFF_VIEW_SCHEMA = {
    type: 'object',
    additionalProperties: false,
    properties: {
        refA: { type: 'string', required: true },
        refB: { type: 'string', required: true },
        stat: { type: 'string', required: true },
        files: { type: 'array', required: true, items: { type: 'string' } },
    },
};
const BRANCH_VIEW_SCHEMA = {
    type: 'object',
    additionalProperties: false,
    properties: {
        branch: { type: 'string', required: true },
        ref: { oneOf: [{ type: 'string' }, { type: 'null' }], required: true },
    },
};
const FORGET_VIEW_SCHEMA = {
    type: 'object',
    additionalProperties: false,
    properties: {
        id: { type: 'string', required: true },
        archivedPath: { type: 'string', required: true },
    },
};
const RESTORE_VIEW_SCHEMA = {
    type: 'object',
    additionalProperties: false,
    properties: {
        id: { type: 'string', required: true },
        restoredPath: { type: 'string', required: true },
    },
};
const SHOW_VIEW_SCHEMA = {
    type: 'object',
    additionalProperties: false,
    properties: {
        path: { type: 'string', required: true },
        kind: { oneOf: [{ type: 'string' }, { type: 'null' }], required: true },
        title: { oneOf: [{ type: 'string' }, { type: 'null' }], required: true },
        branch: { oneOf: [{ type: 'string' }, { type: 'null' }], required: true },
        source: { oneOf: [{ type: 'string' }, { type: 'null' }], required: true },
        tags: { type: 'array', required: true, items: { type: 'string' } },
        createdAt: { oneOf: [{ type: 'string' }, { type: 'null' }], required: true },
        updatedAt: { oneOf: [{ type: 'string' }, { type: 'null' }], required: true },
        id: { oneOf: [{ type: 'string' }, { type: 'null' }], required: true },
        status: { oneOf: [{ type: 'string' }, { type: 'null' }], required: true },
        sensitivity: { oneOf: [{ type: 'string' }, { type: 'null' }], required: true },
        supersedes: { oneOf: [{ type: 'string' }, { type: 'null' }], required: true },
        supersededBy: { oneOf: [{ type: 'string' }, { type: 'null' }], required: true },
        expiresAt: { oneOf: [{ type: 'string' }, { type: 'null' }], required: true },
        content: { type: 'string', required: true },
    },
};
const EXPORT_VIEW_SCHEMA = {
    type: 'object',
    additionalProperties: false,
    properties: {
        format: { type: 'string', required: true },
        text: { type: 'string', required: true },
    },
};
/** Replace undefined values with null so the host JSON binding accepts the result losslessly. */
export function lossless(value) {
    const record = value;
    const out = {};
    for (const key of Object.keys(record))
        out[key] = record[key] === undefined ? null : record[key];
    return out;
}
function jsonOutput(schema) {
    return {
        schema,
        render: (_args, value) => [{ type: 'text', text: JSON.stringify(value, null, 2) }],
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
function normalizeBranches(repoPath, config, current, branches) {
    return {
        repoPath,
        repoUrl: config.repoUrl,
        remoteName: config.remoteName,
        currentBranch: current,
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
        updatedAt: value.updatedAt,
        id: value.id,
        status: value.status,
        supersedes: value.supersedes ?? null,
        supersededBy: value.supersededBy ?? null,
        source: value.source ?? null,
        expiresAt: value.expiresAt ?? null,
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
        archiveRoot: z.string().default(DEFAULT_ARCHIVE_ROOT),
        recallTopK: z.number().min(1).default(DEFAULT_RECALL_TOP_K),
        recallMinScore: z.number().min(0).default(DEFAULT_RECALL_MIN_SCORE),
        recallMaxChars: z.number().min(0).default(DEFAULT_RECALL_MAX_CHARS),
        digestEnabled: z.boolean().default(DEFAULT_DIGEST_ENABLED),
        digestMaxRecords: z.number().min(0).default(DEFAULT_DIGEST_MAX_RECORDS),
        digestMaxChars: z.number().min(0).default(DEFAULT_DIGEST_MAX_CHARS),
        privacyMode: z.union([z.const('block'), z.const('redact'), z.const('ask')]).default(DEFAULT_PRIVACY_MODE),
    });
    core;
    get config() {
        return this.core.config;
    }
    constructor(ctx, config) {
        super(ctx, 'evolveGit');
        this.core = new GitMemoryCore(config);
        try {
            this.core.syncSkills(false);
        }
        catch { /* best-effort: materialize bundled skills, never block load */ }
        const digestText = (() => { try {
            return this.core.digest();
        }
        catch {
            return '';
        } })();
        const promptText = digestText === '' ? PROMPT_TEXT : PROMPT_TEXT + '\n\nEvolve memory digest (persona/warning):\n' + digestText;
        ctx.systemPrompt.section({
            name: 'tool:evolve-git',
            order: 116,
            text: promptText,
        });
        this.registerTools(ctx);
        this.registerSkillProvider(ctx);
        ctx.effect(() => ctx.commands.register({
            name: 'evolve',
            description: 'inspect or write Git-backed long-term memory',
            input: { hint: 'connect|status|branches|remember <kind> <title> [--expires <iso>] :: <content>|update <id> [--merge] :: <content>|forget <id>|restore <id>|config show|open|refresh|set <key> <value>|skill draft|list|promote <name>|demote <name>|sync|rollback <ref> [--dry]|conflicts|resolve <path> <ours|theirs|both>|timeline|search <q>|branch switch|diff|revert <name|ref>|help' },
            handler: invocation => this.runCommand(invocation),
        }), 'dsh-evolve-in-git: command');
        this.registerConfigRoute(ctx);
    }
    /** Recompute the core config from the config file over the Cordis base (the config file is the single user layer). */
    refreshConfig() {
        this.core.refreshConfig();
    }
    /** Register the repo's enabled/ skills directory as a DSH skill provider. */
    registerSkillProvider(ctx) {
        const registry = ctx.get('skills');
        if (registry === undefined)
            return;
        const core = this.core;
        registry.registerProvider(() => ({
            name: 'evolve-git',
            async list() {
                const candidates = core.listEnabledSkills().map((skill) => ({
                    name: skill.name,
                    description: skill.description,
                    invocation: { modelInvocable: true, userInvocable: true },
                    source: 'custom',
                    provider: 'evolve-git',
                    rank: 0,
                    locator: { path: skill.path, directory: dirname(skill.path) },
                    path: skill.path,
                }));
                return candidates;
            },
            async get(candidate) {
                const locator = candidate.locator;
                const path = locator.path ?? candidate.path;
                if (path === undefined)
                    return undefined;
                try {
                    const raw = readFileSync(path, 'utf8');
                    const parsed = parseSkillFrontmatter(raw);
                    if (parsed.name === undefined || parsed.description === undefined)
                        return undefined;
                    const definition = {
                        name: parsed.name,
                        description: parsed.description,
                        ...(parsed.whenToUse === undefined ? {} : { whenToUse: parsed.whenToUse }),
                        invocation: { modelInvocable: true, userInvocable: true },
                        source: 'custom',
                        provider: 'evolve-git',
                        ...(locator.directory === undefined ? {} : { resourceBase: { kind: 'directory', path: locator.directory } }),
                        path,
                        content: raw,
                    };
                    return definition;
                }
                catch {
                    return undefined;
                }
            },
        }));
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
                expiresAt: { type: 'string', description: 'Optional ISO timestamp after which the record is hidden from recall/timeline.' },
            },
            output: jsonOutput(REMEMBER_VIEW_SCHEMA),
            execute: async (args) => this.rememberView({
                kind: args.kind,
                title: args.title,
                content: args.content,
                ...(args.source === undefined ? {} : { source: args.source }),
                ...(args.branch === undefined ? {} : { branch: args.branch }),
                ...(args.tags === undefined ? {} : { tags: args.tags }),
                ...(args.expiresAt === undefined ? {} : { expiresAt: args.expiresAt }),
            }),
            presentCall: args => ({ card: 'generic', title: 'Remember ' + args.kind, kind: 'other', rawInput: args.title }),
        }));
        ctx.tools.register(defineTool({
            name: 'evolve_update',
            description: 'Update an active memory record by id. overwrite replaces title/content/tags; merge appends content and unions tags. The previous version is kept and marked superseded.',
            parameters: {
                id: { type: 'string', required: true, description: 'The active memory record id to update.' },
                mode: { type: 'string', enum: ['overwrite', 'merge'], description: 'Update mode (default overwrite).' },
                title: { type: 'string', description: 'Optional new title.' },
                content: { type: 'string', description: 'New content (overwrite) or content to append (merge).' },
                tags: { type: 'array', items: { type: 'string' }, description: 'Replacement (overwrite) or union (merge) tags.' },
                source: { type: 'string', description: 'Optional source pointer.' },
            },
            output: jsonOutput(REMEMBER_VIEW_SCHEMA),
            isConcurrencySafe: () => false,
            execute: async (args) => this.updateView(args.id, {
                ...(args.mode === undefined ? {} : { mode: args.mode }),
                ...(args.title === undefined ? {} : { title: args.title }),
                ...(args.content === undefined ? {} : { content: args.content }),
                ...(args.tags === undefined ? {} : { tags: args.tags }),
                ...(args.source === undefined ? {} : { source: args.source }),
            }),
            presentCall: args => ({ card: 'generic', title: 'Update memory ' + String(args.id), kind: 'write' }),
        }));
        ctx.tools.register(defineTool({
            name: 'evolve_forget',
            description: 'Soft-delete an active memory record by id: move it into the archive root so it disappears from recall/timeline but stays recoverable.',
            parameters: {
                id: { type: 'string', required: true, description: 'The active memory record id to forget.' },
            },
            output: jsonOutput(FORGET_VIEW_SCHEMA),
            isConcurrencySafe: () => false,
            execute: async (args) => this.core.forget(args.id),
            presentCall: args => ({ card: 'generic', title: 'Forget memory ' + String(args.id), kind: 'write' }),
        }));
        ctx.tools.register(defineTool({
            name: 'evolve_restore',
            description: 'Restore a previously forgotten memory record by id, moving it back from the archive root into the memory root.',
            parameters: {
                id: { type: 'string', required: true, description: 'The archived memory record id to restore.' },
            },
            output: jsonOutput(RESTORE_VIEW_SCHEMA),
            isConcurrencySafe: () => false,
            execute: async (args) => this.core.restore(args.id),
            presentCall: args => ({ card: 'generic', title: 'Restore memory ' + String(args.id), kind: 'write' }),
        }));
        ctx.tools.register(defineTool({
            name: 'evolve_show',
            description: 'Read one full memory record (including its content and sensitivity) by id.',
            parameters: {
                id: { type: 'string', required: true, description: 'The memory record id to show.' },
            },
            output: jsonOutput(SHOW_VIEW_SCHEMA),
            isConcurrencySafe: () => true,
            execute: async (args) => {
                const found = this.core.show(args.id);
                if (found === undefined)
                    throw new Error("no memory record with id '" + args.id + "'");
                return lossless(found);
            },
            presentCall: args => ({ card: 'generic', title: 'Show memory ' + String(args.id), kind: 'read' }),
        }));
        ctx.tools.register(defineTool({
            name: 'evolve_export',
            description: 'Export active memory records as JSON or Markdown, filtered by a maximum sensitivity level (secret excluded by default).',
            parameters: {
                format: { type: 'string', enum: ['json', 'markdown'], description: 'Export format (default json).' },
                maxSensitivity: { type: 'string', enum: ['public', 'internal', 'confidential', 'secret'], description: 'Only export records up to this sensitivity (default confidential).' },
            },
            output: jsonOutput(EXPORT_VIEW_SCHEMA),
            isConcurrencySafe: () => true,
            execute: async (args) => {
                const format = (args.format === 'markdown' ? 'markdown' : 'json');
                const maxSensitivity = args.maxSensitivity ?? 'confidential';
                return { format, text: this.core.export({ format, maxSensitivity }) };
            },
            presentCall: () => ({ card: 'generic', title: 'Export evolve memory', kind: 'read' }),
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
        ctx.tools.register(defineTool({
            name: 'evolve_skill_list',
            description: 'List skill drafts in the evolve memory repo that can be promoted into the DSH skill registry.',
            parameters: {},
            output: jsonOutput(SKILL_LIST_VIEW_SCHEMA),
            isConcurrencySafe: () => true,
            execute: async () => this.core.listSkillDrafts(),
            presentCall: () => ({ card: 'generic', title: 'List evolve skill drafts', kind: 'read' }),
        }));
        ctx.tools.register(defineTool({
            name: 'evolve_skill_promote',
            description: 'Promote one skill draft into the DSH skill registry by its name, making it callable as a normal DSH skill.',
            parameters: {
                name: { type: 'string', required: true, description: 'Skill draft name (kebab-case) to promote.' },
            },
            output: jsonOutput(PROMOTE_VIEW_SCHEMA),
            isConcurrencySafe: () => false,
            execute: async (args) => this.core.promoteSkillDraft(args.name),
            presentCall: args => ({ card: 'generic', title: 'Promote skill ' + String(args.name), kind: 'write' }),
        }));
        ctx.tools.register(defineTool({
            name: 'evolve_skill_demote',
            description: 'Move an enabled skill back into the drafts directory, removing it from the DSH skill registry while keeping it in Git history.',
            parameters: {
                name: { type: 'string', required: true, description: 'Enabled skill name (kebab-case) to demote.' },
            },
            output: jsonOutput(PROMOTE_VIEW_SCHEMA),
            isConcurrencySafe: () => false,
            execute: async (args) => this.core.demoteSkillDraft(args.name),
            presentCall: args => ({ card: 'generic', title: 'Demote skill ' + String(args.name), kind: 'write' }),
        }));
        ctx.tools.register(defineTool({
            name: 'evolve_skill_draft',
            description: 'Create a skill draft from a memory record, writing it into the evolve memory repo so it can be reviewed and then promoted into the skill registry.',
            parameters: {
                kind: { type: 'string', required: true, enum: ['session', 'skill', 'warning', 'persona', 'note'], description: 'Memory kind to draft from.' },
                title: { type: 'string', required: true, description: 'Short memory title.' },
                content: { type: 'string', required: true, description: 'Reusable lesson or rule to encode as a skill.' },
                tags: { type: 'array', items: { type: 'string' }, description: 'Optional skill tags.' },
            },
            output: jsonOutput(DRAFT_VIEW_SCHEMA),
            isConcurrencySafe: () => false,
            execute: async (args) => {
                const draft = this.core.saveSkillDraftFromRecord({
                    kind: args.kind,
                    title: args.title,
                    content: args.content,
                    ...(args.tags === undefined ? {} : { tags: args.tags }),
                });
                return { name: draft.name, description: draft.description, whenToUse: draft.whenToUse, path: draft.path, content: draft.content };
            },
            presentCall: args => ({ card: 'generic', title: 'Draft skill from ' + String(args.kind), kind: 'write', rawInput: args.title }),
        }));
        ctx.tools.register(defineTool({
            name: 'evolve_rollback',
            description: 'Roll back one memory/skill commit in the evolve repository by reverting it (rejected unless the commit touches only memory/skills files). Use dryRun to preview without writing.',
            parameters: {
                ref: { type: 'string', required: true, description: 'Commit ref (hash or branch) to roll back.' },
                dryRun: { type: 'boolean', description: 'Preview the change without writing (default false).' },
            },
            output: jsonOutput(ROLLBACK_VIEW_SCHEMA),
            isConcurrencySafe: () => false,
            execute: async (args) => {
                const result = this.core.rollback(args.ref, args.dryRun === true);
                return { dryRun: result.dryRun, reverted: result.reverted, commit: result.commit ?? null, wouldChange: result.wouldChange };
            },
            presentCall: args => ({ card: 'generic', title: 'Rollback ' + String(args.ref), kind: 'write' }),
        }));
        ctx.tools.register(defineTool({
            name: 'evolve_conflicts',
            description: 'List unresolved merge/rebase conflicts currently present in the evolve repository.',
            parameters: {},
            output: jsonOutput(CONFLICTS_VIEW_SCHEMA),
            isConcurrencySafe: () => true,
            execute: async () => ({ conflicts: this.core.conflicts() }),
            presentCall: () => ({ card: 'generic', title: 'List evolve conflicts', kind: 'read' }),
        }));
        ctx.tools.register(defineTool({
            name: 'evolve_resolve',
            description: 'Resolve one unresolved conflict in the evolve repository by taking ours, theirs, or both sides, then staging it.',
            parameters: {
                path: { type: 'string', required: true, description: 'The conflicted path to resolve.' },
                strategy: { type: 'string', required: true, enum: ['ours', 'theirs', 'both'], description: 'Resolution strategy: ours, theirs, or both.' },
            },
            output: jsonOutput(RESOLVE_VIEW_SCHEMA),
            isConcurrencySafe: () => false,
            execute: async (args) => ({ path: this.core.resolve(args.path, args.strategy), strategy: String(args.strategy) }),
            presentCall: args => ({ card: 'generic', title: 'Resolve conflict ' + String(args.path), kind: 'write' }),
        }));
        ctx.tools.register(defineTool({
            name: 'evolve_timeline',
            description: 'List the memory records in the evolve repository in chronological order (newest first).',
            parameters: {},
            output: jsonOutput(TIMELINE_VIEW_SCHEMA),
            isConcurrencySafe: () => true,
            execute: async () => this.core.timeline().map((record) => lossless(record)),
            presentCall: () => ({ card: 'generic', title: 'Read evolve memory timeline', kind: 'read' }),
        }));
        ctx.tools.register(defineTool({
            name: 'evolve_recall',
            description: 'Search the evolve memory for records matching a keyword, optionally filtered by kind or tag. Use to surface prior decisions or lessons without re-asking the user.',
            parameters: {
                query: { type: 'string', description: 'Keyword matched against metadata (title/kind/tags/branch/source); body content is returned lazily but not scored.' },
                kind: { type: 'string', description: 'Optional memory kind filter (session/skill/warning/persona/note).' },
                tag: { type: 'string', description: 'Optional tag filter.' },
                topK: { type: 'integer', description: 'Maximum number of results to return (default from config).' },
                minScore: { type: 'number', description: 'Minimum relevance score to keep (default 0).' },
                maxChars: { type: 'integer', description: 'Maximum total characters of returned content (default 8000).' },
                includeContent: { type: 'boolean', description: 'Whether to return body content (default true).' },
            },
            output: jsonOutput(RECALL_VIEW_SCHEMA),
            isConcurrencySafe: () => true,
            execute: async (args) => this.core.recall({ ...(args.query === undefined ? {} : { query: args.query }), ...(args.kind === undefined ? {} : { kind: args.kind }), ...(args.tag === undefined ? {} : { tag: args.tag }) }, { ...(args.topK === undefined ? {} : { topK: args.topK }), ...(args.minScore === undefined ? {} : { minScore: args.minScore }), ...(args.maxChars === undefined ? {} : { maxChars: args.maxChars }), ...(args.includeContent === undefined ? {} : { includeContent: args.includeContent }) }).map((hit) => lossless(hit)),
            presentCall: args => ({ card: 'generic', title: 'Recall evolve memory' + (args.query === undefined ? '' : ': ' + String(args.query)), kind: 'read' }),
        }));
        ctx.tools.register(defineTool({
            name: 'evolve_branch_switch',
            description: 'Switch the evolve repository to a memory branch.',
            parameters: {
                name: { type: 'string', required: true, description: 'Branch name to switch to.' },
            },
            output: jsonOutput(BRANCH_VIEW_SCHEMA),
            isConcurrencySafe: () => false,
            execute: async (args) => {
                const result = this.core.checkoutBranch(args.name);
                return { branch: result.branch, ref: result.head ?? null };
            },
            presentCall: args => ({ card: 'generic', title: 'Switch branch ' + String(args.name), kind: 'write' }),
        }));
        ctx.tools.register(defineTool({
            name: 'evolve_branch_diff',
            description: 'Diff two branches/refs (or one ref against HEAD) in the evolve repository and list the changed memory/skill files.',
            parameters: {
                a: { type: 'string', required: true, description: 'First ref.' },
                b: { type: 'string', description: 'Second ref (default HEAD).' },
            },
            output: jsonOutput(BRANCH_DIFF_VIEW_SCHEMA),
            isConcurrencySafe: () => true,
            execute: async (args) => this.core.branchDiff(args.a, args.b),
            presentCall: args => ({ card: 'generic', title: 'Diff ' + String(args.a), kind: 'read' }),
        }));
        // memory_* aliases: the same core methods under stable generic names.
        ctx.tools.register(defineTool({
            name: 'memory_search',
            description: 'Alias of evolve_recall: search evolve memory with an optional budget.',
            parameters: {
                query: { type: 'string', description: 'Keyword matched against metadata (title/kind/tags/branch/source); body content is returned lazily but not scored.' },
                kind: { type: 'string', description: 'Optional kind filter.' },
                tag: { type: 'string', description: 'Optional tag filter.' },
                topK: { type: 'integer', description: 'Maximum results (default from config).' },
                minScore: { type: 'number', description: 'Minimum relevance score.' },
                maxChars: { type: 'integer', description: 'Maximum returned content characters.' },
                includeContent: { type: 'boolean', description: 'Whether to return content.' },
            },
            output: jsonOutput(RECALL_VIEW_SCHEMA),
            isConcurrencySafe: () => true,
            execute: async (args) => this.core.recall({ ...(args.query === undefined ? {} : { query: args.query }), ...(args.kind === undefined ? {} : { kind: args.kind }), ...(args.tag === undefined ? {} : { tag: args.tag }) }, { ...(args.topK === undefined ? {} : { topK: args.topK }), ...(args.minScore === undefined ? {} : { minScore: args.minScore }), ...(args.maxChars === undefined ? {} : { maxChars: args.maxChars }), ...(args.includeContent === undefined ? {} : { includeContent: args.includeContent }) }).map((hit) => lossless(hit)),
            presentCall: args => ({ card: 'generic', title: 'Search memory' + (args.query === undefined ? '' : ': ' + String(args.query)), kind: 'read' }),
        }));
        ctx.tools.register(defineTool({
            name: 'memory_save',
            description: 'Alias of evolve_remember: persist one long-term memory entry.',
            parameters: {
                kind: { type: 'string', required: true, enum: ['session', 'skill', 'warning', 'persona', 'note'], description: 'Memory kind.' },
                title: { type: 'string', required: true, description: 'Short memory title.' },
                content: { type: 'string', required: true, description: 'Memory content.' },
                source: { type: 'string', description: 'Optional source pointer.' },
                branch: { type: 'string', description: 'Optional target branch.' },
                tags: { type: 'array', items: { type: 'string' }, description: 'Optional tags.' },
                expiresAt: { type: 'string', description: 'Optional ISO timestamp after which the record is hidden.' },
            },
            output: jsonOutput(REMEMBER_VIEW_SCHEMA),
            execute: async (args) => this.rememberView({
                kind: args.kind,
                title: args.title,
                content: args.content,
                ...(args.source === undefined ? {} : { source: args.source }),
                ...(args.branch === undefined ? {} : { branch: args.branch }),
                ...(args.tags === undefined ? {} : { tags: args.tags }),
                ...(args.expiresAt === undefined ? {} : { expiresAt: args.expiresAt }),
            }),
            presentCall: args => ({ card: 'generic', title: 'Save memory ' + args.kind, kind: 'write', rawInput: args.title }),
        }));
        ctx.tools.register(defineTool({
            name: 'memory_update',
            description: 'Alias of evolve_update: update an active memory record by id.',
            parameters: {
                id: { type: 'string', required: true, description: 'Record id to update.' },
                mode: { type: 'string', enum: ['overwrite', 'merge'], description: 'Update mode.' },
                title: { type: 'string', description: 'Optional new title.' },
                content: { type: 'string', description: 'New or appended content.' },
                tags: { type: 'array', items: { type: 'string' }, description: 'Replacement or union tags.' },
                source: { type: 'string', description: 'Optional source pointer.' },
            },
            output: jsonOutput(REMEMBER_VIEW_SCHEMA),
            isConcurrencySafe: () => false,
            execute: async (args) => this.updateView(args.id, {
                ...(args.mode === undefined ? {} : { mode: args.mode }),
                ...(args.title === undefined ? {} : { title: args.title }),
                ...(args.content === undefined ? {} : { content: args.content }),
                ...(args.tags === undefined ? {} : { tags: args.tags }),
                ...(args.source === undefined ? {} : { source: args.source }),
            }),
            presentCall: args => ({ card: 'generic', title: 'Update memory ' + String(args.id), kind: 'write' }),
        }));
        ctx.tools.register(defineTool({
            name: 'memory_delete',
            description: 'Alias of evolve_forget: soft-delete an active memory record by id.',
            parameters: {
                id: { type: 'string', required: true, description: 'Record id to delete (soft).' },
            },
            output: jsonOutput(FORGET_VIEW_SCHEMA),
            isConcurrencySafe: () => false,
            execute: async (args) => this.core.forget(args.id),
            presentCall: args => ({ card: 'generic', title: 'Delete memory ' + String(args.id), kind: 'write' }),
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
        return this.core.status();
    }
    async statusView() {
        const repoPath = this.core.connect();
        return normalizeStatus(repoPath, this.core.config, this.core.status(repoPath));
    }
    async branches() {
        return this.core.branches();
    }
    async branchesView() {
        const repoPath = this.core.connect();
        return normalizeBranches(repoPath, this.core.config, this.core.currentBranch(repoPath), this.core.branches(repoPath));
    }
    async record(record) {
        return this.core.remember(record);
    }
    async rememberView(record) {
        return normalizeRemember(this.core.config, this.core.remember(record));
    }
    async updateView(id, patch) {
        return normalizeRemember(this.core.config, this.core.update(id, patch));
    }
    async draftSkill(record) {
        return this.core.draftSkill(record);
    }
    async suggest(record) {
        return this.core.suggest(record);
    }
    async saveSkillDraft(draft) {
        return this.core.saveSkillDraft(draft);
    }
    async createBranch(branch, from) {
        this.core.createBranch(branch, from);
    }
    async checkout(branch) {
        this.core.checkoutBranch(branch);
    }
    async fetch() {
        this.core.fetch();
    }
    async push(branch) {
        this.core.push(branch);
    }
    async connect() {
        return this.core.status();
    }
    async connectView() {
        return this.statusView();
    }
    async helpView() {
        return renderHelpView();
    }
    async runCommand(invocation) {
        try {
            const input = normalizeEvolveCommand(invocation.rawInput);
            if (input.startsWith('config')) {
                return this.runConfigCommand(input.slice('config'.length).trim());
            }
            if (input.startsWith('skill')) {
                return this.runSkillCommand(input.slice('skill'.length).trim());
            }
            if (input.startsWith('rollback')) {
                return this.runRollbackCommand(input.slice('rollback'.length).trim());
            }
            if (input.startsWith('conflicts')) {
                return this.runConflictsCommand();
            }
            if (input.startsWith('resolve')) {
                return this.runResolveCommand(input.slice('resolve'.length).trim());
            }
            if (input.startsWith('timeline')) {
                return this.runTimelineCommand();
            }
            if (input.startsWith('search')) {
                return this.runSearchCommand(input.slice('search'.length).trim());
            }
            if (input.startsWith('branch')) {
                return this.runBranchCommand(input.slice('branch'.length).trim());
            }
            if (input.startsWith('update')) {
                return this.runUpdateCommand(input.slice('update'.length).trim());
            }
            if (input.startsWith('forget')) {
                return this.runForgetCommand(input.slice('forget'.length).trim());
            }
            if (input.startsWith('restore')) {
                return this.runRestoreCommand(input.slice('restore'.length).trim());
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
        const path = this.core.configFilePath();
        const parts = rest.trim().split(/\s+/).filter(Boolean);
        const cmd = parts[0] ?? 'show';
        const show = () => ({
            kind: 'success',
            text: [
                'EvolveInGit config file: ' + path,
                'repoPath: ' + this.core.config.repoPath,
                'repoUrl: ' + this.core.config.repoUrl,
                'auth.mode: ' + this.core.config.auth.mode,
                'auth.tokenEnv: ' + (this.core.config.auth.tokenEnv ?? ''),
                'memoryRoot: ' + this.core.config.memoryRoot,
                'skillsRoot: ' + this.core.config.skillsRoot,
                'defaultBranch: ' + this.core.config.defaultBranch,
                'remoteName: ' + this.core.config.remoteName,
                'autoCommit: ' + String(this.core.config.autoCommit),
                'archiveRoot: ' + this.core.config.archiveRoot,
                'recallTopK: ' + String(this.core.config.recallTopK),
                'recallMinScore: ' + String(this.core.config.recallMinScore),
                'recallMaxChars: ' + String(this.core.config.recallMaxChars),
                'digestEnabled: ' + String(this.core.config.digestEnabled),
                'digestMaxRecords: ' + String(this.core.config.digestMaxRecords),
                'digestMaxChars: ' + String(this.core.config.digestMaxChars),
                'privacyMode: ' + this.core.config.privacyMode,
            ].join('\n'),
        });
        const reloadText = () => 'Config reloaded from:\n  ' + path;
        switch (cmd) {
            case 'show':
                return show();
            case 'open':
                return { kind: 'success', text: 'Open the config file in your editor:\n  ' + path };
            case 'refresh':
                this.core.refreshConfig();
                return { kind: 'success', text: reloadText() };
            case 'set': {
                const key = parts[1];
                const value = parts.slice(2).join(' ');
                if (!key || value.length === 0) {
                    return { kind: 'error', text: 'Usage: /evolve config set <key> <value>' };
                }
                const current = this.core.readConfigFile();
                const parsedValue = parseConfigValue(value);
                setByPath(current, key, parsedValue);
                this.core.writeConfigFile(current);
                this.core.refreshConfig();
                return { kind: 'success', text: 'Saved ' + key + ' = ' + JSON.stringify(parsedValue) + ' -> ' + path };
            }
            default:
                return { kind: 'error', text: 'Usage: /evolve config show|open|refresh|set <key> <value>' };
        }
    }
    async runSkillCommand(rest) {
        const parts = rest.trim().split(/\s+/).filter(Boolean);
        const cmd = parts[0] ?? 'list';
        switch (cmd) {
            case 'list': {
                const drafts = this.core.listSkillDrafts();
                if (drafts.length === 0) {
                    return { kind: 'success', text: 'No skill drafts to promote.' };
                }
                return {
                    kind: 'success',
                    text: [
                        'Promotable skill drafts in ' + join(this.core.config.repoPath, this.core.config.skillsRoot) + ':',
                        ...drafts.map(draft => '- ' + draft.name + ' :: ' + draft.description),
                        '',
                        'Promote one with: /evolve skill promote <name>',
                    ].join('\n'),
                };
            }
            case 'promote': {
                const name = parts[1];
                if (name === undefined) {
                    return { kind: 'error', text: 'Usage: /evolve skill promote <name>' };
                }
                try {
                    const promoted = this.core.promoteSkillDraft(name);
                    return { kind: 'success', text: 'Promoted skill "' + promoted.name + '" -> ' + promoted.targetPath };
                }
                catch (error) {
                    return { kind: 'error', text: userFacingError(error) };
                }
            }
            case 'demote': {
                const name = parts[1];
                if (name === undefined) {
                    return { kind: 'error', text: 'Usage: /evolve skill demote <name>' };
                }
                try {
                    const demoted = this.core.demoteSkillDraft(name);
                    return { kind: 'success', text: 'Demoted skill "' + demoted.name + '" -> ' + demoted.targetPath };
                }
                catch (error) {
                    return { kind: 'error', text: userFacingError(error) };
                }
            }
            case 'draft': {
                const draftArgs = rest.slice('draft'.length).trim();
                const parsed = parseEvolveCommand('remember ' + draftArgs);
                if (parsed.kind !== 'remember') {
                    return { kind: 'error', text: 'Usage: /evolve skill draft <kind> <title> :: <content>' };
                }
                try {
                    const draft = this.core.saveSkillDraftFromRecord(parsed.record);
                    return { kind: 'success', text: 'Drafted skill "' + draft.name + '" -> ' + draft.path };
                }
                catch (error) {
                    return { kind: 'error', text: userFacingError(error) };
                }
            }
            case 'sync': {
                const synced = this.core.syncSkills(true);
                return {
                    kind: 'success',
                    text: 'Synced bundled skills:\n' + (synced.length === 0
                        ? '  (bundled skills not found in this package)'
                        : synced.map(item => '- ' + item.name + ' (' + item.action + ') -> ' + item.targetPath).join('\n')),
                };
            }
            default:
                return { kind: 'error', text: 'Usage: /evolve skill draft <kind> <title> :: <content>|list|promote <name>|demote <name>|sync' };
        }
    }
    runRollbackCommand(rest) {
        const parts = rest.trim().split(/\s+/).filter(Boolean);
        const ref = parts[0];
        const dryRun = parts.includes('--dry');
        if (ref === undefined) {
            return { kind: 'error', text: 'Usage: /evolve rollback <ref> [--dry]' };
        }
        try {
            const result = this.core.rollback(ref, dryRun);
            const files = result.wouldChange.length === 0 ? '(none)' : result.wouldChange.join(', ');
            if (result.dryRun) {
                return { kind: 'success', text: 'Dry run: reverting ' + ref + ' would change:\n  ' + files };
            }
            return { kind: 'success', text: 'Reverted ' + ref + ' (' + files + ') -> ' + (result.commit ?? '') };
        }
        catch (error) {
            return { kind: 'error', text: userFacingError(error) };
        }
    }
    runConflictsCommand() {
        try {
            const conflicts = this.core.conflicts();
            if (conflicts.length === 0) {
                return { kind: 'success', text: 'No unresolved conflicts.' };
            }
            return { kind: 'success', text: 'Unresolved conflicts:\n' + conflicts.map((path) => '- ' + path).join('\n') };
        }
        catch (error) {
            return { kind: 'error', text: userFacingError(error) };
        }
    }
    runResolveCommand(rest) {
        const parts = rest.trim().split(/\s+/).filter(Boolean);
        const path = parts[0];
        const strategy = parts[1];
        if (path === undefined || strategy === undefined || ['ours', 'theirs', 'both'].includes(strategy) === false) {
            return { kind: 'error', text: 'Usage: /evolve resolve <path> <ours|theirs|both>' };
        }
        try {
            this.core.resolve(path, strategy);
            return { kind: 'success', text: 'Resolved ' + path + ' (' + strategy + ')' };
        }
        catch (error) {
            return { kind: 'error', text: userFacingError(error) };
        }
    }
    runTimelineCommand() {
        const timeline = this.core.timeline();
        if (timeline.length === 0)
            return { kind: 'success', text: 'No memory records yet.' };
        return {
            kind: 'success',
            text: timeline.map((memo) => '- ' + (memo.createdAt ?? '?') + '  [' + (memo.kind ?? '?') + ']  ' + (memo.title ?? memo.path)).join('\n'),
        };
    }
    runSearchCommand(rest) {
        const parts = rest.trim().split(/\s+/).filter(Boolean);
        let kind;
        let tag;
        const words = [];
        for (let i = 0; i < parts.length; i++) {
            const tok = parts[i];
            if (tok === '--kind') {
                kind = parts[i + 1];
                i += 1;
            }
            else if (tok === '--tag') {
                tag = parts[i + 1];
                i += 1;
            }
            else
                words.push(tok);
        }
        const filter = {};
        if (words.length > 0)
            filter.query = words.join(' ');
        if (kind !== undefined)
            filter.kind = kind;
        if (tag !== undefined)
            filter.tag = tag;
        const results = this.core.recall(filter);
        if (results.length === 0)
            return { kind: 'success', text: 'No matching memory.' };
        return {
            kind: 'success',
            text: results.map((memo) => '- [' + (memo.kind ?? '?') + '] ' + (memo.title ?? memo.path) + (memo.createdAt === undefined ? '' : '  @' + memo.createdAt)).join('\n'),
        };
    }
    async runUpdateCommand(rest) {
        const parts = rest.trim().split(/\s+/).filter(Boolean);
        const id = parts[0];
        if (id === undefined) {
            return { kind: 'error', text: 'Usage: /evolve update <id> [--merge] :: <content>' };
        }
        const mode = parts.includes('--merge') ? 'merge' : 'overwrite';
        const separator = rest.indexOf('::');
        const content = separator === -1 ? undefined : rest.slice(separator + 2).trim();
        try {
            const view = await this.updateView(id, { mode, ...(content === undefined || content.length === 0 ? {} : { content }) });
            return { kind: 'success', text: 'Updated memory ' + view.id + ' -> ' + view.path + ' (status ' + view.status + ')' };
        }
        catch (error) {
            return { kind: 'error', text: userFacingError(error) };
        }
    }
    runForgetCommand(rest) {
        const id = rest.trim().split(/\s+/).filter(Boolean)[0];
        if (id === undefined)
            return { kind: 'error', text: 'Usage: /evolve forget <id>' };
        try {
            const result = this.core.forget(id);
            return { kind: 'success', text: 'Forgotten ' + result.id + ' -> ' + result.archivedPath };
        }
        catch (error) {
            return { kind: 'error', text: userFacingError(error) };
        }
    }
    runRestoreCommand(rest) {
        const id = rest.trim().split(/\s+/).filter(Boolean)[0];
        if (id === undefined)
            return { kind: 'error', text: 'Usage: /evolve restore <id>' };
        try {
            const result = this.core.restore(id);
            return { kind: 'success', text: 'Restored ' + result.id + ' -> ' + result.restoredPath };
        }
        catch (error) {
            return { kind: 'error', text: userFacingError(error) };
        }
    }
    runBranchCommand(rest) {
        const parts = rest.trim().split(/\s+/).filter(Boolean);
        const sub = parts[0];
        const name = parts[1];
        if (sub === 'switch') {
            if (name === undefined)
                return { kind: 'error', text: 'Usage: /evolve branch switch <name>' };
            try {
                const result = this.core.checkoutBranch(name);
                return { kind: 'success', text: 'Switched to ' + result.branch + ' @ ' + (result.head ?? '') };
            }
            catch (error) {
                return { kind: 'error', text: userFacingError(error) };
            }
        }
        if (sub === 'diff') {
            const a = parts[1];
            const b = parts[2];
            if (a === undefined)
                return { kind: 'error', text: 'Usage: /evolve branch diff <a> [b]' };
            try {
                const result = this.core.branchDiff(a, b);
                return { kind: 'success', text: 'Diff ' + result.refA + '..' + result.refB + '\n' + result.stat + (result.files.length === 0 ? '' : '\n' + result.files.join('\n')) };
            }
            catch (error) {
                return { kind: 'error', text: userFacingError(error) };
            }
        }
        if (sub === 'revert') {
            if (name === undefined)
                return { kind: 'error', text: 'Usage: /evolve branch revert <ref>' };
            try {
                const result = this.core.rollback(name, false);
                return { kind: 'success', text: 'Reverted ' + name + ' -> ' + (result.commit ?? '') };
            }
            catch (error) {
                return { kind: 'error', text: userFacingError(error) };
            }
        }
        return { kind: 'error', text: 'Usage: /evolve branch switch|diff|revert <name|ref>' };
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
/** Read name/description/whenToUse from a SKILL.md frontmatter block. */
function parseSkillFrontmatter(raw) {
    const match = raw.match(/^---\n([\s\S]*?)\n---/m);
    if (match === null || match[1] === undefined)
        return {};
    const out = {};
    for (const line of match[1].split(/\r?\n/)) {
        const kv = line.match(/^([A-Za-z0-9_-]+):\s*(.*)$/);
        if (kv === null)
            continue;
        const key = kv[1];
        let value = (kv[2] ?? '').trim();
        if (value.startsWith('"') && value.endsWith('"'))
            value = value.slice(1, -1).replace(/\\"/g, '"').replace(/\\\\/g, '\\');
        if (key === 'name')
            out.name = value;
        else if (key === 'description')
            out.description = value;
        else if (key === 'whenToUse')
            out.whenToUse = value;
    }
    return out;
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
