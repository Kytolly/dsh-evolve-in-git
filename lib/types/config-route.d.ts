/**
 * Host routes backing the browser config-file editor: read and write the
 * per-user `$DSH_HOME/evolve-in-git.json` document through same-origin JSON
 * endpoints (the pattern dsh-pet's '/api/pet/*' family uses). The routes are
 * loopback-only — they write user-local data, so only the desktop may enter.
 * @module dsh-evolve-in-git/config-route
 */
import type { WebRoute } from '@deepseek-ai/dsh-host-webserver';
/** Browser-facing base path of the config-file API. */
export declare const CONFIG_FILE_ROUTE = "/api/evolve-git/config";
/**
 * Build the config-file routes.
 * @param onSaved - invoked after a successful write so the caller can reload
 *   its runtime config immediately (the config file is the highest-priority
 *   user layer).
 */
export declare function makeConfigRoutes(onSaved?: () => void): WebRoute[];
