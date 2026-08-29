import type { ResolvedConfig } from './types.js';
export interface MemoryMeta {
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
    content: string;
}
/** Scan every memory record under the configured memory root (full bodies). */
export declare function scanMemory(config: ResolvedConfig): MemoryMeta[];
/** Memory records sorted newest-first by their createdAt stamp (active only). */
export declare function memoryTimeline(config: ResolvedConfig): MemoryMeta[];
export interface RecallFilter {
    query?: string;
    kind?: string;
    tag?: string;
}
/**
 * Recall memory matching a keyword (title/content/tags/kind) plus optional
 * kind and tag filters. A memory with no marked kind is still matched by content
 * so recall works on older or ad-hoc files.
 */
export declare function searchMemory(config: ResolvedConfig, filter: RecallFilter): MemoryMeta[];
/** Retrieval budget the recall tool and config surface control. */
export interface RecallBudget {
    /** Maximum number of results to return (default from config, fallback 10). */
    topK?: number;
    /** Minimum relevance score to keep (default 0). */
    minScore?: number;
    /** Cumulative character budget for returned content (default 8000). */
    maxChars?: number;
    /** Whether to load and return body content at all (default true). */
    includeContent?: boolean;
}
/** One recall result: metadata plus a relevance score and (budgeted) content. */
export interface RecallHit {
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
    score: number;
    content: string;
}
/**
 * Budgeted recall. Metadata is matched and ranked from the cached index; only
 * the top-K candidates have their body read, and content is truncated so the
 * returned content never exceeds maxChars in total.
 */
export declare function recall(config: ResolvedConfig, filter: RecallFilter, budget?: RecallBudget): RecallHit[];
