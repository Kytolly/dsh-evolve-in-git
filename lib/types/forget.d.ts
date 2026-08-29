import type { ResolvedConfig } from './types.js';
export interface ForgetResult {
    id: string;
    archivedPath: string;
}
export interface RestoreResult {
    id: string;
    restoredPath: string;
}
/** Soft-delete an active record: move it into archiveRoot (never removed). */
export declare function forgetMemory(config: ResolvedConfig, id: string): ForgetResult;
/** Restore an archived record back into the memory root. */
export declare function restoreMemory(config: ResolvedConfig, id: string): RestoreResult;
