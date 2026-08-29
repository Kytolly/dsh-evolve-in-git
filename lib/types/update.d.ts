import type { CommittedArtifact, MemoryRecord, ResolvedConfig } from './types.js';
export type UpdateMode = 'overwrite' | 'merge';
/** The fields an update may change; \`mode\` picks overwrite (default) or merge. */
export interface UpdatePatch {
    mode?: UpdateMode;
    title?: string;
    content?: string;
    tags?: readonly string[];
    source?: string;
}
/**
 * Update the active record with the given id. overwrite replaces content/title/
 * tags; merge appends content and unions tags. Either way the previous version
 * is kept on disk and marked superseded, and the returned record is the new
 * active version.
 */
export declare function updateMemory(config: ResolvedConfig, id: string, patch?: UpdatePatch): CommittedArtifact & MemoryRecord;
