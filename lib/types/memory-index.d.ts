import type { ResolvedConfig } from './types.js';
/** One memory record's metadata, without its body. */
export interface MemoryIndexEntry {
    path: string;
    kind: string | undefined;
    title: string | undefined;
    branch: string | undefined;
    source: string | undefined;
    tags: string[];
    createdAt: string | undefined;
    updatedAt: string | undefined;
    id: string | undefined;
    status: string | undefined;
    supersedes: string | undefined;
    supersededBy: string | undefined;
    expiresAt: string | undefined;
    sensitivity: string | undefined;
}
/** Parse a minimal YAML frontmatter block into its string fields. */
export declare function parseFrontmatterFields(raw: string): Record<string, string | undefined>;
/** Parse a frontmatter tags value (YAML list or whitespace-separated). */
export declare function parseTags(value: string | undefined): string[];
/** Scan every memory record's metadata under the configured memory root. */
export declare function scanMemoryIndex(config: ResolvedConfig): MemoryIndexEntry[];
/**
 * A cache-invalidation signature: the repository HEAD plus the sorted file
 * list with each file's mtime. Any commit (HEAD move), file edit (mtime), or
 * file add/remove (file set) changes the signature.
 */
export declare function memoryIndexSignature(config: ResolvedConfig): string;
/** Get the cached metadata index, rebuilding it only when the signature changes. */
export declare function getMemoryIndex(config: ResolvedConfig): MemoryIndexEntry[];
/** Drop every cached index (tests use this for deterministic invalidation). */
export declare function clearMemoryIndexCache(): void;
