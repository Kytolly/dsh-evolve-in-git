/**
 * Settings-scope adapter over the per-user config file. The web settings form
 * now reads and writes `$DSH_HOME/evolve-in-git.json` directly (through the
 * loopback-only '/api/evolve-git/config' route) instead of a settings
 * namespace — the config file is the single user layer, so what the form
 * shows is exactly what takes effect (defaults overlaid by the file), and
 * saving writes the file immediately.
 *
 * Implements the SettingsScope contract the shared CardForm consumes
 * (getSnapshot/subscribe/set/unset) plus load/reload/dispose.
 * @module dsh-evolve-in-git/client/config-file-scope
 */
import type { SettingsScope, SettingsScopeSnapshot } from '@deepseek-ai/dsh-client-runtime/client';
import type { EvolveSettings } from './EvolveSettingsCard.tsx';
/** Window event the config-file editor dispatches after a successful save. */
export declare const CONFIG_SAVED_EVENT = "evolve-git:config-saved";
/** Deep-merge one plain-object layer over another (auth merges per subkey). */
export declare function mergeLayers(base: Record<string, unknown>, over: Record<string, unknown>): Record<string, unknown>;
/** Set a value at a dotted path ('' segments are ignored), creating containers. */
export declare function setByPath(root: Record<string, unknown>, path: string, value: unknown): void;
/** Delete a value at a dotted path (no-op when absent). */
export declare function deleteByPath(root: Record<string, unknown>, path: string): void;
/**
 * The config file as a live settings scope. Loading fetches the file plus the
 * plugin defaults; the effective value is defaults overlaid by the file, so a
 * configured field visibly overrides its default. set/unset merge into the
 * file and PUT it back; a successful write re-seeds from the host response.
 */
export declare class ConfigFileScope implements SettingsScope<EvolveSettings> {
    private readonly listeners;
    private snapshot;
    private user;
    private defaults;
    private revision;
    private disposed;
    constructor();
    /** Fetch the config document and defaults, then publish a ready snapshot. */
    load(): Promise<void>;
    /** Re-fetch after an external save (config-file editor). */
    reload(): Promise<void>;
    /** @returns the current sync snapshot (stable reference until the next change). */
    getSnapshot(): SettingsScopeSnapshot<EvolveSettings>;
    /** Observe snapshot replacements. */
    subscribe(listener: () => void): () => void;
    /** Merge one field into the file and persist. */
    set(field: string, value: unknown): Promise<void>;
    /** Remove one field from the file and persist. */
    unset(field: string): Promise<void>;
    /** Release the window listener and every subscriber. */
    dispose(): void;
    private readonly onConfigSaved;
    private persist;
    private publish;
}
