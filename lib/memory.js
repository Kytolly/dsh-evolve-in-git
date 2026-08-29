/**
 * Memory scanning, search, and timeline for dsh-evolve-in-git.
 *
 * The memory root is a directory of Markdown files written by writeMemoryRecord
 * (<repo>/<memoryRoot>/<kind>/<timestamp>-<slug>.md). This module scans those
 * files, parses their YAML frontmatter, and exposes recall (search) and timeline
 * views so the agent can surface relevant memory without the user repeating it.
 *
 * Recall is budgeted (topK/minScore/maxChars/includeContent) and reads bodies
 * lazily: metadata matching runs over the cached index from memory-index.ts, and
 * only the top-K candidates have their body loaded (and truncated to maxChars).
 * @module dsh-evolve-in-git/memory
 */
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { getMemoryIndex, parseFrontmatterFields, parseTags } from './memory-index.js';
/** A record with no status (or 'active') is the live version; superseded is hidden by default. */
function isActiveStatus(status) {
    return status === undefined || status === 'active';
}
/** A record whose expiresAt is in the past is hidden by default. */
function isExpired(expiresAt, now = new Date()) {
    if (expiresAt === undefined)
        return false;
    const time = new Date(expiresAt).getTime();
    // Fail closed: a malformed expiry timestamp hides the record rather than
    // silently disabling expiration (which could surface stale/expired content).
    if (!Number.isFinite(time))
        return true;
    return time <= now.getTime();
}
function memoryRootOf(config) {
    return join(config.repoPath, config.memoryRoot);
}
function readMemoryMeta(path) {
    const raw = readFileSync(path, 'utf8');
    const fm = parseFrontmatterFields(raw);
    const body = raw.replace(/^---\n[\s\S]*?\n---\n?/, '').trim();
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
        content: body,
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
/** Scan every memory record under the configured memory root (full bodies). */
export function scanMemory(config) {
    const files = [];
    walkMarkdown(memoryRootOf(config), files);
    return files.map(readMemoryMeta);
}
/** Memory records sorted newest-first by their createdAt stamp (active only). */
export function memoryTimeline(config) {
    return scanMemory(config).filter((memo) => isActiveStatus(memo.status) && !isExpired(memo.expiresAt)).sort((left, right) => (right.createdAt ?? '').localeCompare(left.createdAt ?? ''));
}
/**
 * Recall memory matching a keyword (title/content/tags/kind) plus optional
 * kind and tag filters. A memory with no marked kind is still matched by content
 * so recall works on older or ad-hoc files.
 */
export function searchMemory(config, filter) {
    const q = (filter.query ?? '').trim().toLowerCase();
    return scanMemory(config).filter((memo) => {
        if (!isActiveStatus(memo.status) || isExpired(memo.expiresAt))
            return false;
        if (filter.kind !== undefined && memo.kind !== filter.kind)
            return false;
        if (filter.tag !== undefined && memo.tags.includes(filter.tag) === false)
            return false;
        if (q.length === 0)
            return true;
        const haystack = [memo.title ?? '', memo.content, memo.kind ?? '', ...memo.tags].join(' ').toLowerCase();
        return haystack.includes(q);
    }).sort((left, right) => (right.createdAt ?? '').localeCompare(left.createdAt ?? ''));
}
/** A coarse relevance score over metadata only (bodies load lazily for top-K). */
function scoreEntry(entry, query) {
    if (query === '')
        return 1;
    const title = (entry.title ?? '').toLowerCase();
    const kind = (entry.kind ?? '').toLowerCase();
    const branch = (entry.branch ?? '').toLowerCase();
    const source = (entry.source ?? '').toLowerCase();
    const tags = entry.tags.map((tag) => tag.toLowerCase());
    let score = 0;
    if (title.includes(query))
        score += 1;
    if (kind.includes(query))
        score += 0.5;
    if (tags.some((tag) => tag.includes(query)))
        score += 0.5;
    if (branch.includes(query))
        score += 0.25;
    if (source.includes(query))
        score += 0.25;
    return score;
}
/** Read one record's body (frontmatter stripped) — used only for top-K hits. */
function readBody(path) {
    const raw = readFileSync(path, 'utf8');
    return raw.replace(/^---\n[\s\S]*?\n---\n?/, '').trim();
}
/**
 * Budgeted recall. Metadata is matched and ranked from the cached index; only
 * the top-K candidates have their body read, and content is truncated so the
 * returned content never exceeds maxChars in total.
 */
export function recall(config, filter, budget = {}) {
    const entries = getMemoryIndex(config);
    const query = (filter.query ?? '').trim().toLowerCase();
    const topK = Math.max(0, budget.topK ?? 10);
    const minScore = Math.max(0, budget.minScore ?? 0);
    const maxChars = Math.max(0, budget.maxChars ?? 8000);
    const includeContent = budget.includeContent ?? true;
    const ranked = entries
        .filter((entry) => isActiveStatus(entry.status) && !isExpired(entry.expiresAt))
        .filter((entry) => filter.kind === undefined || entry.kind === filter.kind)
        .filter((entry) => filter.tag === undefined || entry.tags.includes(filter.tag))
        .map((entry) => ({ entry, score: scoreEntry(entry, query) }))
        .filter((item) => item.score >= minScore && (query === '' || item.score > 0))
        .sort((left, right) => (right.score - left.score) || (right.entry.createdAt ?? '').localeCompare(left.entry.createdAt ?? ''));
    let remaining = maxChars;
    return ranked.slice(0, topK).map(({ entry, score }) => {
        let content = '';
        if (includeContent && remaining > 0) {
            const body = readBody(entry.path);
            content = body.length > remaining ? body.slice(0, remaining) : body;
            remaining -= content.length;
        }
        return {
            path: entry.path,
            kind: entry.kind,
            title: entry.title,
            branch: entry.branch,
            source: entry.source,
            tags: entry.tags,
            createdAt: entry.createdAt,
            updatedAt: entry.updatedAt,
            id: entry.id,
            status: entry.status,
            supersedes: entry.supersedes,
            supersededBy: entry.supersededBy,
            expiresAt: entry.expiresAt,
            sensitivity: entry.sensitivity,
            score,
            content,
        };
    });
}
