/**
 * Config-file management for dsh-evolve-in-git.
 *
 * The plugin keeps its runtime configuration in a small JSON file under DSH_HOME
 * (configFilePath()). The settings surface and the '/evolve config' commands read
 * and write this file; the GitEvolutionService loads it at startup and overlays it
 * over any Cordis-provided config, so the file is the user-facing source of truth.
 * @module dsh-evolve-in-git/config
 */
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { homedir } from 'node:os';
import { join, dirname } from 'node:path';
/** DSH home directory (`DSH_HOME` env, else `~/.dsh`). */
export function dshHome() {
    return process.env['DSH_HOME']?.trim() || join(homedir(), '.dsh');
}
/** Path to the user-facing config file. */
export function configFilePath() {
    return join(dshHome(), 'evolve-in-git.json');
}
/** Read the config file if it exists; return an empty object otherwise. */
export function readConfigFile() {
    const path = configFilePath();
    if (!existsSync(path))
        return {};
    try {
        const raw = readFileSync(path, 'utf8');
        const parsed = JSON.parse(raw);
        return parsed && typeof parsed === 'object' ? parsed : {};
    }
    catch {
        return {};
    }
}
/** Persist a whole config object to the config file. */
export function writeConfigFile(config) {
    const path = configFilePath();
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, JSON.stringify(config, null, 2) + '\n', 'utf8');
}
/**
 * Merge Cordis config with the on-disk file. The file wins for any key it
 * provides; nested auth is replaced wholesale rather than deep-merged.
 */
export function mergeConfig(cordis, file) {
    return { ...cordis, ...file };
}
