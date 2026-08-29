/**
 * Metadata index and cache for dsh-evolve-in-git memory recall.
 *
 * Scanning reads only each record's YAML frontmatter (path/kind/title/branch/
 * source/tags/createdAt), never the body, and caches the result keyed by a
 * signature that changes when the repository HEAD moves or any record's mtime
 * (or the file set) changes. Recall then loads bodies lazily for its top-K
 * candidates instead of reading every file.
 * @module dsh-evolve-in-git/memory-index
 */
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { currentHead } from './git.js';
/** Parse a minimal YAML frontmatter block into its string fields. */
export function parseFrontmatterFields(raw) {
    const match = raw.match(/^---\n([\s\S]*?)\n---/m);
    if (match === null)
        return {};
    const body = match[1];
    if (body === undefined)
        return {};
    const out = {};
    for (const line of body.split(/\r?\n/)) {
        const kv = line.match(/^([A-Za-z0-9_-]+):\s*(.*)$/);
        if (kv === null)
            continue;
        const key = kv[1];
        let value = (kv[2] ?? '').trim();
        if (value.startsWith('"') && value.endsWith('"'))
            value = value.slice(1, -1).replace(/\\"/g, '"').replace(/\\\\/g, '\\');
        out[key] = value;
    }
    return out;
}
/** Parse a frontmatter tags value (YAML list or whitespace-separated). */
export function parseTags(value) {
    if (value === undefined)
        return [];
    const trimmed = value.trim();
    if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
        return trimmed.slice(1, -1).split(',').map((item) => item.trim().replace(/^"|"$/g, '')).filter(Boolean);
    }
    return trimmed.split(/\s+/).filter(Boolean);
}
/** Read one record's frontmatter-only metadata. */
function readIndexEntry(path) {
    const raw = readFileSync(path, 'utf8');
    const fm = parseFrontmatterFields(raw);
    return {
        path,
        kind: fm['kind'],
        title: fm['title'],
        branch: fm['branch'],
        source: fm['source'],
        tags: parseTags(fm['tags']),
        createdAt: fm['createdAt'],
        updatedAt: fm['updatedAt'],
        id: fm['id'],
        status: fm['status'],
        supersedes: fm['supersedes'],
        supersededBy: fm['supersededBy'],
        expiresAt: fm['expiresAt'],
        sensitivity: fm['sensitivity'],
    };
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
/** Scan every memory record's metadata under the configured memory root. */
export function scanMemoryIndex(config) {
    const files = [];
    walkMarkdown(join(config.repoPath, config.memoryRoot), files);
    return files.map(readIndexEntry);
}
/** The current git HEAD of the memory repository, or '' when not a repo. */
function gitHeadOf(repoPath) {
    try {
        return currentHead(repoPath) ?? '';
    }
    catch {
        return '';
    }
}
/**
 * A cache-invalidation signature: the repository HEAD plus the sorted file
 * list with each file's mtime. Any commit (HEAD move), file edit (mtime), or
 * file add/remove (file set) changes the signature.
 */
export function memoryIndexSignature(config) {
    const root = join(config.repoPath, config.memoryRoot);
    if (!existsSync(root))
        return 'empty:' + config.repoPath;
    const files = [];
    walkMarkdown(root, files);
    files.sort();
    const filePart = files.map((file) => file + ':' + String(statSync(file).mtimeMs)).join('|');
    return gitHeadOf(config.repoPath) + '||' + filePart;
}
const indexCache = new Map();
/** Get the cached metadata index, rebuilding it only when the signature changes. */
export function getMemoryIndex(config) {
    const root = join(config.repoPath, config.memoryRoot);
    const signature = memoryIndexSignature(config);
    const hit = indexCache.get(root);
    if (hit !== undefined && hit.signature === signature)
        return hit.entries;
    const entries = scanMemoryIndex(config);
    indexCache.set(root, { signature, entries });
    return entries;
}
/** Drop every cached index (tests use this for deterministic invalidation). */
export function clearMemoryIndexCache() {
    indexCache.clear();
}
