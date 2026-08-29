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
/** Window event the config-file editor dispatches after a successful save. */
export const CONFIG_SAVED_EVENT = 'evolve-git:config-saved';
/** Deep-merge one plain-object layer over another (auth merges per subkey). */
export function mergeLayers(base, over) {
    const merged = { ...base };
    for (const [key, value] of Object.entries(over)) {
        const under = merged[key];
        if (isPlainObject(value) && isPlainObject(under)) {
            merged[key] = { ...under, ...value };
        }
        else {
            merged[key] = value;
        }
    }
    return merged;
}
function isPlainObject(value) {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}
/** Set a value at a dotted path ('' segments are ignored), creating containers. */
export function setByPath(root, path, value) {
    const segments = path.split('.').filter(segment => segment !== '');
    if (segments.length === 0)
        return;
    let cursor = root;
    for (let index = 0; index < segments.length - 1; index++) {
        const segment = segments[index];
        const child = cursor[segment];
        if (!isPlainObject(child)) {
            const created = {};
            cursor[segment] = created;
            cursor = created;
        }
        else {
            cursor = child;
        }
    }
    cursor[segments[segments.length - 1]] = value;
}
/** Delete a value at a dotted path (no-op when absent). */
export function deleteByPath(root, path) {
    const segments = path.split('.').filter(segment => segment !== '');
    if (segments.length === 0)
        return;
    let cursor = root;
    for (let index = 0; index < segments.length - 1; index++) {
        const child = cursor[segments[index]];
        if (!isPlainObject(child))
            return;
        cursor = child;
    }
    delete cursor[segments[segments.length - 1]];
}
/**
 * The config file as a live settings scope. Loading fetches the file plus the
 * plugin defaults; the effective value is defaults overlaid by the file, so a
 * configured field visibly overrides its default. set/unset merge into the
 * file and PUT it back; a successful write re-seeds from the host response.
 */
export class ConfigFileScope {
    listeners = new Set();
    snapshot;
    user = {};
    defaults = {};
    revision = 1;
    disposed = false;
    constructor() {
        this.snapshot = {
            status: 'loading',
            value: undefined,
            base: undefined,
            user: undefined,
            revision: undefined,
            writable: false,
            mode: 'host',
        };
        // The config-file editor saves the same document; reload so the form and
        // the editor never disagree.
        window.addEventListener(CONFIG_SAVED_EVENT, () => { void this.reload(); });
    }
    /** Fetch the config document and defaults, then publish a ready snapshot. */
    async load() {
        if (this.disposed)
            return;
        this.snapshot = { ...this.snapshot, status: 'loading' };
        this.publish();
        try {
            const body = await fetchConfigFile();
            this.defaults = body.defaults ?? {};
            this.user = body.config ?? {};
            this.snapshot = {
                status: 'ready',
                value: mergeLayers(this.defaults, this.user),
                base: this.defaults,
                user: this.user,
                revision: this.revision,
                writable: true,
                mode: 'host',
            };
            this.publish();
        }
        catch {
            this.snapshot = { status: 'unavailable', value: undefined, base: undefined, user: undefined, revision: undefined, writable: false, mode: 'host' };
            this.publish();
        }
    }
    /** Re-fetch after an external save (config-file editor). */
    reload() {
        return this.load();
    }
    /** @returns the current sync snapshot (stable reference until the next change). */
    getSnapshot() {
        return this.snapshot;
    }
    /** Observe snapshot replacements. */
    subscribe(listener) {
        this.listeners.add(listener);
        return () => { this.listeners.delete(listener); };
    }
    /** Merge one field into the file and persist. */
    async set(field, value) {
        const next = structuredClone(this.user);
        setByPath(next, field, value);
        await this.persist(next);
    }
    /** Remove one field from the file and persist. */
    async unset(field) {
        const next = structuredClone(this.user);
        deleteByPath(next, field);
        await this.persist(next);
    }
    /** Release the window listener and every subscriber. */
    dispose() {
        if (this.disposed)
            return;
        this.disposed = true;
        window.removeEventListener(CONFIG_SAVED_EVENT, this.onConfigSaved);
        this.listeners.clear();
    }
    onConfigSaved = () => { void this.reload(); };
    async persist(next) {
        const raw = JSON.stringify(next, null, 2) + '\n';
        const body = await saveConfigFile(raw);
        this.user = body.config ?? next;
        this.revision += 1;
        this.snapshot = {
            status: 'ready',
            value: mergeLayers(this.defaults, this.user),
            base: this.defaults,
            user: this.user,
            revision: this.revision,
            writable: true,
            mode: 'host',
        };
        this.publish();
    }
    publish() {
        for (const listener of this.listeners)
            listener();
    }
}
async function fetchConfigFile() {
    const response = await fetch('/api/evolve-git/config');
    const body = await response.json();
    if (!response.ok || body.ok !== true)
        throw new Error(body.error ?? 'load failed');
    return body;
}
async function saveConfigFile(raw) {
    const response = await fetch('/api/evolve-git/config', {
        method: 'PUT',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ raw }),
    });
    const body = await response.json();
    if (!response.ok || body.ok !== true)
        throw new Error(body.error ?? 'save failed');
    return body;
}
