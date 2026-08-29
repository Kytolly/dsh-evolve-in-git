/**
 * Forgetting for dsh-evolve-in-git: soft-delete and restore.
 *
 * forget moves an active record out of the memory root into archiveRoot (the
 * file and its Git history are preserved); restore moves it back. Because the
 * memory index scans only memoryRoot, archived records disappear from recall
 * and timeline by construction until they are restored.
 * @module dsh-evolve-in-git/forget
 */
import { existsSync, mkdirSync, readdirSync, readFileSync, renameSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { commitPaths, gitAdd, gitMove, openRepository } from './git.js';
import { getMemoryIndex, parseFrontmatterFields } from './memory-index.js';
function memoryRootOf(config) {
    return join(config.repoPath, config.memoryRoot);
}
function archiveRootOf(config) {
    return join(config.repoPath, config.archiveRoot);
}
function walkMarkdown(dir, out) {
    if (!existsSync(dir))
        return;
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
        if (entry.isDirectory())
            walkMarkdown(join(dir, entry.name), out);
        else if (entry.name.endsWith('.md'))
            out.push(join(dir, entry.name));
    }
}
/** Find an archived record by its frontmatter id. */
function findArchived(config, id) {
    const root = archiveRootOf(config);
    if (!existsSync(root))
        return undefined;
    const files = [];
    walkMarkdown(root, files);
    for (const file of files) {
        const fm = parseFrontmatterFields(readFileSync(file, 'utf8'));
        if (fm['id'] === id)
            return file;
    }
    return undefined;
}
/** Soft-delete an active record: move it into archiveRoot (never removed). */
export function forgetMemory(config, id) {
    const entry = getMemoryIndex(config).find((item) => item.id === id && (item.status === undefined || item.status === 'active'));
    if (entry === undefined) {
        throw new Error("no active memory record with id '" + id + "'");
    }
    const rel = relative(memoryRootOf(config), entry.path);
    const target = join(archiveRootOf(config), rel);
    moveRecord(config, entry.path, target, 'memory(forget): ' + (entry.title ?? id));
    return { id, archivedPath: target };
}
/** Restore an archived record back into the memory root. */
export function restoreMemory(config, id) {
    const archived = findArchived(config, id);
    if (archived === undefined) {
        throw new Error("no archived memory record with id '" + id + "'");
    }
    const rel = relative(archiveRootOf(config), archived);
    const target = join(memoryRootOf(config), rel);
    moveRecord(config, archived, target, 'memory(restore): ' + id);
    return { id, restoredPath: target };
}
/** Move a memory file between memoryRoot and archiveRoot, committing when enabled. */
function moveRecord(config, from, to, message) {
    mkdirSync(dirname(to), { recursive: true });
    if (!config.autoCommit) {
        renameSync(from, to);
        return;
    }
    const repoPath = openRepository(config);
    const fromRel = relative(repoPath, from).replace(/\\/g, '/');
    const toRel = relative(repoPath, to).replace(/\\/g, '/');
    gitAdd(repoPath, fromRel);
    gitMove(repoPath, fromRel, toRel);
    commitPaths(repoPath, [toRel], message);
}
