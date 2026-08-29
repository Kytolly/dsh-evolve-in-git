/**
 * Framework-free memory core for dsh-evolve-in-git.
 *
 * This module is the plugin's portability boundary: it depends only on Node
 * built-ins and the sibling core modules (git/memory/skill/strategy/config/
 * defaults/types), never on DeepSeek Harness or Cordis. The DSH adapter
 * (src/index.ts) is a thin shell that maps host tools/commands onto this core.
 * @module dsh-evolve-in-git/core
 */
import { homedir } from 'node:os';
import { join } from 'node:path';
import { DEFAULT_ARCHIVE_ROOT, DEFAULT_AUTH, DEFAULT_BRANCH, DEFAULT_DIGEST_ENABLED, DEFAULT_DIGEST_MAX_CHARS, DEFAULT_DIGEST_MAX_RECORDS, DEFAULT_MEMORY_ROOT, DEFAULT_PRIVACY_MODE, DEFAULT_RECALL_MAX_CHARS, DEFAULT_RECALL_MIN_SCORE, DEFAULT_RECALL_TOP_K, DEFAULT_REMOTE, DEFAULT_REPO_PATH, DEFAULT_REPO_URL, DEFAULT_SKILLS_ROOT, } from './defaults.js';
import { configFilePath, mergeConfig, readConfigFile, writeConfigFile } from './config.js';
import { branchDiff as gitBranchDiff, checkoutBranch as gitCheckoutBranch, connectRepository, createBranch as gitCreateBranch, currentBranch as gitCurrentBranch, currentHead as gitCurrentHead, fetchRemote, gitStatus, listBranches as gitListBranches, listConflicts as gitListConflicts, pushBranch, resolveConflict as gitResolveConflict, revertCommit, writeMemoryRecord, writeSkillDraft, } from './git.js';
import { memoryTimeline, recall as recallMemory, scanMemory } from './memory.js';
import { filterBySensitivity, findById, renderExport } from './privacy.js';
import { updateMemory } from './update.js';
import { forgetMemory, restoreMemory } from './forget.js';
import { demoteSkillDraft, listEnabledSkills, listSkillDrafts, promoteSkillDraft, syncBundledSkills } from './skill.js';
import { draftSkillFromRecord, renderSkillDraft, suggestEvolution } from './strategy.js';
/** Expand a leading '~' in a user-supplied path to the home directory (node:path does not). */
function expandHome(path) {
    if (path === '~')
        return homedir();
    if (path.startsWith('~/'))
        return join(homedir(), path.slice(2));
    return path;
}
/** Resolve a possibly-partial config into the fully-populated runtime shape. */
function resolveConfig(config) {
    return {
        repoPath: expandHome(config.repoPath?.trim() || DEFAULT_REPO_PATH),
        repoUrl: config.repoUrl?.trim() || DEFAULT_REPO_URL,
        auth: config.auth ?? DEFAULT_AUTH,
        memoryRoot: config.memoryRoot?.trim() || DEFAULT_MEMORY_ROOT,
        skillsRoot: config.skillsRoot?.trim() || DEFAULT_SKILLS_ROOT,
        defaultBranch: config.defaultBranch?.trim() || DEFAULT_BRANCH,
        remoteName: config.remoteName?.trim() || DEFAULT_REMOTE,
        autoCommit: config.autoCommit ?? true,
        archiveRoot: config.archiveRoot?.trim() || DEFAULT_ARCHIVE_ROOT,
        recallTopK: config.recallTopK ?? DEFAULT_RECALL_TOP_K,
        recallMinScore: config.recallMinScore ?? DEFAULT_RECALL_MIN_SCORE,
        recallMaxChars: config.recallMaxChars ?? DEFAULT_RECALL_MAX_CHARS,
        digestEnabled: config.digestEnabled ?? DEFAULT_DIGEST_ENABLED,
        digestMaxRecords: config.digestMaxRecords ?? DEFAULT_DIGEST_MAX_RECORDS,
        digestMaxChars: config.digestMaxChars ?? DEFAULT_DIGEST_MAX_CHARS,
        privacyMode: config.privacyMode ?? DEFAULT_PRIVACY_MODE,
    };
}
/**
 * The concrete Git-backed MemoryCore. It resolves configuration from the on-disk
 * config file (over the host-provided base) and delegates each operation to the
 * existing framework-free core modules.
 */
export class GitMemoryCore {
    baseConfig;
    config;
    constructor(config) {
        this.baseConfig = config;
        this.config = resolveConfig(mergeConfig(config, readConfigFile()));
    }
    configFilePath() {
        return configFilePath();
    }
    readConfigFile() {
        return readConfigFile();
    }
    writeConfigFile(file) {
        writeConfigFile(file);
    }
    refreshConfig() {
        this.config = resolveConfig(mergeConfig(this.baseConfig, readConfigFile()));
    }
    connect() {
        return connectRepository(this.config);
    }
    status(repoPath) {
        return gitStatus(repoPath ?? connectRepository(this.config));
    }
    branches(repoPath) {
        return gitListBranches(repoPath ?? connectRepository(this.config));
    }
    currentBranch(repoPath) {
        return gitCurrentBranch(repoPath ?? connectRepository(this.config));
    }
    remember(record) {
        return writeMemoryRecord(this.config, record);
    }
    timeline() {
        return memoryTimeline(this.config);
    }
    recall(filter, budget) {
        return recallMemory(this.config, filter, {
            topK: budget?.topK ?? this.config.recallTopK,
            minScore: budget?.minScore ?? this.config.recallMinScore,
            maxChars: budget?.maxChars ?? this.config.recallMaxChars,
            includeContent: budget?.includeContent ?? true,
        });
    }
    update(id, patch) {
        return updateMemory(this.config, id, patch);
    }
    forget(id) {
        return forgetMemory(this.config, id);
    }
    restore(id) {
        return restoreMemory(this.config, id);
    }
    show(id) {
        return findById(scanMemory(this.config), id);
    }
    export(options = {}) {
        const records = filterBySensitivity(memoryTimeline(this.config), options.maxSensitivity ?? 'confidential');
        return renderExport(records, options.format ?? 'json');
    }
    digest() {
        if (!this.config.digestEnabled)
            return '';
        const records = memoryTimeline(this.config)
            .filter((record) => record.kind === 'persona' || record.kind === 'warning')
            .slice(0, this.config.digestMaxRecords);
        let out = '';
        for (const record of records) {
            const line = '[' + (record.kind ?? '?') + '] ' + (record.title ?? '') + ': ' + record.content.trim();
            if (out.length > 0 && out.length + line.length + 1 > this.config.digestMaxChars)
                break;
            out = out === '' ? line : out + '\n' + line;
        }
        return out.slice(0, this.config.digestMaxChars);
    }
    listSkillDrafts() {
        return listSkillDrafts(this.config);
    }
    listEnabledSkills() {
        return listEnabledSkills(this.config);
    }
    promoteSkillDraft(name) {
        return promoteSkillDraft(this.config, name);
    }
    demoteSkillDraft(name) {
        return demoteSkillDraft(this.config, name);
    }
    draftSkill(record) {
        return renderSkillDraft(draftSkillFromRecord(record));
    }
    saveSkillDraft(draft) {
        return writeSkillDraft(this.config, draft);
    }
    saveSkillDraftFromRecord(record) {
        return writeSkillDraft(this.config, draftSkillFromRecord(record));
    }
    suggest(record) {
        return suggestEvolution(record);
    }
    createBranch(branch, from) {
        gitCreateBranch(connectRepository(this.config), branch, from ?? this.config.defaultBranch);
    }
    checkoutBranch(branch) {
        const repoPath = connectRepository(this.config);
        gitCheckoutBranch(repoPath, branch);
        return { branch: gitCurrentBranch(repoPath), head: gitCurrentHead(repoPath) };
    }
    fetch() {
        const repoPath = connectRepository(this.config);
        fetchRemote(repoPath, this.config.remoteName, this.config.auth, this.config.repoUrl);
    }
    push(branch) {
        const repoPath = connectRepository(this.config);
        pushBranch(repoPath, branch ?? gitCurrentBranch(repoPath), this.config.remoteName, this.config.auth, this.config.repoUrl);
    }
    rollback(ref, dryRun) {
        return revertCommit(this.config, ref, dryRun);
    }
    conflicts(repoPath) {
        return gitListConflicts(repoPath ?? connectRepository(this.config));
    }
    resolve(path, strategy) {
        return gitResolveConflict(connectRepository(this.config), path, strategy);
    }
    branchDiff(a, b) {
        return gitBranchDiff(connectRepository(this.config), a, b);
    }
    syncSkills(force) {
        return syncBundledSkills(this.config, force);
    }
}
