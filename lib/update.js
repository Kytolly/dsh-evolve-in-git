/**
 * Memory update and version chain for dsh-evolve-in-git.
 *
 * Updates never delete the old fact: overwrite/merge write a new active record
 * (with its own id), link it to the previous version via frontmatter
 * \`supersedes\`/\`supersededBy\`, and mark the old file \`status: superseded\`.
 * Retrieval then hides superseded records by default while Git history keeps the
 * full chain.
 * @module dsh-evolve-in-git/update
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { commitPaths, openRepository, writeMemoryRecord } from './git.js';
import { getMemoryIndex, parseFrontmatterFields } from './memory-index.js';
/** Read one record's body (frontmatter stripped). */
function readBody(path) {
    const raw = readFileSync(path, 'utf8');
    return raw.replace(/^---\n[\s\S]*?\n---\n?/, '').trim();
}
/**
 * Mark one record superseded in place while preserving every frontmatter field
 * the writer did not emit (e.g. hand-edited multi-line blocks). Only
 * status/supersededBy/updatedAt are touched; the body is never rewritten.
 */
function markSuperseded(config, path, supersededBy) {
    const raw = readFileSync(path, 'utf8');
    const fm = parseFrontmatterFields(raw);
    const match = raw.match(/^---\n([\s\S]*?)\n---/m);
    if (match === null || match[1] === undefined) {
        throw new Error('record has no frontmatter block: ' + path);
    }
    const patch = {
        status: 'superseded',
        supersededBy,
        updatedAt: new Date().toISOString(),
    };
    const seen = new Set();
    const lines = [];
    for (const line of match[1].split(/\r?\n/)) {
        const key = line.match(/^([A-Za-z0-9_-]+):/);
        const patchValue = key === null ? undefined : patch[key[1]];
        if (patchValue === undefined) {
            lines.push(line);
        }
        else {
            lines.push(`${key[1]}: ${JSON.stringify(patchValue)}`);
            seen.add(key[1]);
        }
    }
    for (const [key, value] of Object.entries(patch)) {
        if (!seen.has(key))
            lines.push(`${key}: ${JSON.stringify(value)}`);
    }
    const body = raw.slice((match.index ?? 0) + match[0].length);
    writeFileSync(path, '---\n' + lines.join('\n') + '\n---' + body, 'utf8');
    if (config.autoCommit) {
        commitPaths(openRepository(config), [path], 'memory(superseded): ' + (fm['title'] ?? ''));
    }
}
/**
 * Update the active record with the given id. overwrite replaces content/title/
 * tags; merge appends content and unions tags. Either way the previous version
 * is kept on disk and marked superseded, and the returned record is the new
 * active version.
 */
export function updateMemory(config, id, patch = {}) {
    const entry = getMemoryIndex(config).find((item) => item.id === id && (item.status === undefined || item.status === 'active'));
    if (entry === undefined) {
        throw new Error("no active memory record with id '" + id + "'");
    }
    const kind = (entry.kind ?? 'note');
    const oldContent = readBody(entry.path);
    const mode = patch.mode ?? 'overwrite';
    const title = patch.title ?? entry.title ?? '';
    const content = mode === 'merge'
        ? (patch.content === undefined ? oldContent : oldContent + '\n\n' + patch.content)
        : (patch.content ?? oldContent);
    const tags = mode === 'merge'
        ? Array.from(new Set([...entry.tags, ...(patch.tags ?? [])]))
        : (patch.tags ?? entry.tags);
    const source = patch.source ?? entry.source;
    const updated = writeMemoryRecord(config, {
        kind,
        title,
        content,
        ...(tags.length === 0 ? {} : { tags }),
        ...(source === undefined ? {} : { source }),
    }, { supersedes: id });
    markSuperseded(config, entry.path, updated.id);
    return updated;
}
