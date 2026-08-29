/**
 * Staged form model behind the plugin settings card. A card stages what the
 * user types and writes it only when they save — the settings write is a
 * durable, revision-fenced document mutation, so staging keeps what is on
 * screen exactly what a save would store. Family-shared slice inlined into
 * each plugin's client bundle (mirrors the official ui-plugin-config
 * card-store pattern), extended here in two ways:
 *
 * - dotted field names resolve nested section values (sectionValue/baseValue/
 *   userLayer lookups walk `auth.mode` style paths);
 * - `objectRoot` groups several field specs into ONE write of their shared
 *   root object (the official scope only addresses single segments, so nested
 *   config like `auth` is written wholesale via `scope.set(root, merged)`).
 * @module dsh-evolve-in-git/client/settings-form
 */
import { createSnapshotStore } from '@deepseek-ai/dsh-client-runtime/client';
/** A whole- or decimal-number field. An empty draft clears the field; any other draft that is not a finite number within the constraints blocks the save. */
export function numberField(field, constraints = {}) {
    const { integer = false, min } = constraints;
    return {
        field,
        format: value => typeof value === 'number' ? String(value) : '',
        parse: (text) => {
            const trimmed = text.trim();
            if (trimmed === '')
                return { kind: 'clear' };
            const parsed = Number(trimmed);
            if (!Number.isFinite(parsed))
                return undefined;
            if (integer && !Number.isInteger(parsed))
                return undefined;
            if (min !== undefined && parsed < min)
                return undefined;
            return { kind: 'set', value: parsed };
        },
    };
}
/** A free-text field. An empty draft clears the field. */
export function textField(field) {
    return {
        field,
        format: value => typeof value === 'string' ? value : '',
        parse: (text) => {
            const trimmed = text.trim();
            return trimmed === '' ? { kind: 'clear' } : { kind: 'set', value: trimmed };
        },
    };
}
/**
 * A free-text field the Host treats as a secret and redacts from the read-back
 * (role('secret') in the section schema). The card still edits it like text,
 * but a save never compares the redacted value back and relies on the scope
 * reporting the write landed.
 */
export function secretField(field) {
    return { ...textField(field), secret: true };
}
/** A boolean field, edited through true/false draft text. */
export function booleanField(field) {
    return {
        field,
        format: value => typeof value === 'boolean' ? String(value) : '',
        parse: (text) => {
            const trimmed = text.trim();
            if (trimmed === '')
                return { kind: 'clear' };
            if (trimmed === 'true')
                return { kind: 'set', value: true };
            if (trimmed === 'false')
                return { kind: 'set', value: false };
            return undefined;
        },
    };
}
/** An enumerated string field; only the listed choices are accepted. An empty draft clears the field. */
export function choiceField(field, choices) {
    return {
        field,
        format: value => typeof value === 'string' && choices.includes(value) ? value : '',
        parse: (text) => {
            if (text === '')
                return { kind: 'clear' };
            return choices.includes(text) ? { kind: 'set', value: text } : undefined;
        },
    };
}
/**
 * Attach an object root to a field spec: the field is written as one member of
 * the named root object in a single wholesale write (see FieldSpec.objectRoot).
 */
export function objectField(spec, objectRoot) {
    return { ...spec, objectRoot };
}
/** Deep equality over JSON-compatible data. */
function deepEqualJson(a, b) {
    if (a === b)
        return true;
    if (typeof a !== 'object' || typeof b !== 'object' || a === null || b === null)
        return false;
    if (Array.isArray(a) || Array.isArray(b)) {
        if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length)
            return false;
        return a.every((entry, index) => deepEqualJson(entry, b[index]));
    }
    const left = a;
    const right = b;
    const keys = Object.keys(left);
    if (keys.length !== Object.keys(right).length)
        return false;
    return keys.every(key => key in right && deepEqualJson(left[key], right[key]));
}
/** Read a value at a dotted path ('' segments are ignored). */
function getByPath(root, path) {
    let cursor = root;
    for (const segment of path.split('.')) {
        if (segment === '')
            continue;
        if (typeof cursor !== 'object' || cursor === null)
            return undefined;
        cursor = cursor[segment];
    }
    return cursor;
}
/** Whether a value has an own key at a dotted path. */
function hasByPath(root, path) {
    const segments = path.split('.').filter(segment => segment !== '');
    if (segments.length === 0)
        return false;
    let cursor = root;
    for (let index = 0; index < segments.length; index++) {
        if (typeof cursor !== 'object' || cursor === null)
            return false;
        const record = cursor;
        const segment = segments[index];
        if (index === segments.length - 1)
            return Object.hasOwn(record, segment);
        if (!Object.hasOwn(record, segment))
            return false;
        cursor = record[segment];
    }
    return false;
}
/** Clone a plain JSON-shaped object (the merged root draft). */
function clonePlain(value) {
    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        return { ...value };
    }
    return {};
}
/**
 * Stages one card's edits over one settings namespace and writes them on save.
 *
 * The Host is the only authority on whether a value was accepted — its
 * validators own the constraints no schema can express — so the outcome is
 * read back from the section rather than predicted here. A save that did not
 * land keeps its drafts, so the user can correct them instead of retyping.
 */
export class CardForm {
    scope;
    specs;
    staged = new Map();
    listeners = new Set();
    /** The scope subscription installed in the constructor; released by dispose(). */
    disposeScope;
    disposed = false;
    saving = false;
    failed = false;
    failedReason;
    /** @param scope - the bound settings scope for this card's namespace. */
    constructor(scope, specs) {
        this.scope = scope;
        this.specs = new Map(specs.map(spec => [spec.field, spec]));
        this.disposeScope = scope.subscribe(() => { this.publish(); });
    }
    /**
     * Release the scope subscription and every bound store listener. The card
     * must call this on teardown; later calls are no-ops.
     */
    dispose() {
        if (this.disposed)
            return;
        this.disposed = true;
        this.disposeScope();
        this.listeners.clear();
    }
    /** Publish a projection of this form, rebuilt whenever the scope or a draft changes. */
    bind(project) {
        const store = createSnapshotStore(project());
        this.listeners.add(() => { store.set(project()); });
        return store;
    }
    /** Read the card-level state: what the Host serves, and what a save would do. */
    shell() {
        const snapshot = this.scope.getSnapshot();
        const plan = this.plan();
        return {
            available: snapshot.status !== 'loading',
            exposed: snapshot.status === 'ready',
            writable: snapshot.writable,
            dirty: plan.length > 0,
            invalid: plan.some(item => item.run === undefined),
            saving: this.saving,
            failed: this.failed,
            ...this.failedReason === undefined ? {} : { failedReason: this.failedReason },
        };
    }
    /** Read one field's state from the effective section and its staged draft. */
    field(field) {
        const spec = this.specOf(field);
        const staged = this.staged.get(field);
        if (staged === undefined) {
            return { text: spec.format(this.sectionValue(field)), overridden: this.stored(field), invalid: false };
        }
        const write = staged.clear ? { kind: 'clear' } : spec.parse(staged.text);
        return {
            text: staged.text,
            overridden: write?.kind === 'set',
            invalid: write === undefined,
        };
    }
    /** The actions the card's slot registration injects. */
    actions() {
        return {
            edit: (field, text) => { this.stage(field, { text, clear: false }); },
            resetField: (field) => {
                this.stage(field, { text: this.specOf(field).format(this.baseValue(field)), clear: true });
            },
            save: () => { void this.save(); },
            discard: () => {
                if (this.staged.size === 0 && !this.failed)
                    return;
                this.staged.clear();
                this.failed = false;
                this.failedReason = undefined;
                this.publish();
            },
        };
    }
    /**
     * Write every staged edit, then re-seed from what the Host accepted.
     * A field lands only when the Host reports it held the staged value; a
     * landed field's draft is dropped, a failed one stays staged for the user.
     * @returns settlement after every write and the read-back.
     */
    async save() {
        const plan = this.plan();
        const valid = plan.filter(item => item.run !== undefined);
        if (plan.length === 0 || this.saving || valid.length !== plan.length)
            return;
        // Snapshot the staged entries this save writes, so an edit staged while it
        // is in flight (which replaces the same key) survives: only delete the key
        // when the entry is still the one this save started from.
        const pending = new Map();
        for (const item of plan)
            pending.set(item.field, this.staged.get(item.field));
        this.saving = true;
        this.failed = false;
        this.failedReason = undefined;
        this.publish();
        const landed = new Set();
        for (const item of valid) {
            if (await item.run())
                landed.add(item.field);
        }
        for (const [field, before] of pending) {
            if (landed.has(field) && this.staged.get(field) === before)
                this.staged.delete(field);
        }
        this.saving = false;
        this.failed = landed.size !== pending.size;
        this.publish();
    }
    /**
     * Every staged edit a save would write. Scalar fields write one op each;
     * object-rooted fields coalesce per root into one wholesale write of the
     * merged root object. An entry whose draft is not a value its field accepts
     * carries no write: the form is still dirty, and the save refuses rather
     * than dropping the edit.
     * @returns the planned writes, in the order the fields were staged.
     */
    plan() {
        const plan = [];
        const groups = new Map();
        for (const [field, staged] of this.staged) {
            const spec = this.specOf(field);
            if (spec.objectRoot !== undefined) {
                const list = groups.get(spec.objectRoot) ?? [];
                list.push({ spec, staged });
                groups.set(spec.objectRoot, list);
                continue;
            }
            if (staged.clear) {
                if (this.stored(field))
                    plan.push({ field, run: () => this.clear(field) });
                continue;
            }
            if (staged.text === spec.format(this.sectionValue(field)))
                continue;
            const write = spec.parse(staged.text);
            if (write === undefined)
                plan.push({ field, run: undefined });
            else if (write.kind === 'clear')
                plan.push({ field, run: () => this.clear(field) });
            else
                plan.push({ field, run: () => this.store(field, write.value) });
        }
        for (const [root, entries] of groups) {
            plan.push(...this.planGroup(root, entries));
        }
        return plan;
    }
    /** Coalesce one root's staged members into a single merged-object write. */
    planGroup(root, entries) {
        const fields = entries.map(entry => entry.spec.field);
        const merged = clonePlain(this.sectionValue(root));
        let changed = false;
        let hasSecret = false;
        let invalid = false;
        for (const { spec, staged } of entries) {
            if (spec.secret === true)
                hasSecret = true;
            const member = spec.field.slice(root.length + 1);
            if (staged.clear) {
                if (Object.hasOwn(merged, member)) {
                    delete merged[member];
                    changed = true;
                }
                continue;
            }
            const write = spec.parse(staged.text);
            if (write === undefined) {
                invalid = true;
                continue;
            }
            if (write.kind === 'clear') {
                if (Object.hasOwn(merged, member)) {
                    delete merged[member];
                    changed = true;
                }
            }
            else if (merged[member] !== write.value) {
                merged[member] = write.value;
                changed = true;
            }
        }
        if (!changed)
            return [];
        const run = invalid ? undefined : () => this.storeObject(root, merged, hasSecret);
        return fields.map(field => ({ field, run }));
    }
    async clear(field) {
        await this.scope.unset(field);
        return !this.stored(field);
    }
    async store(field, value) {
        await this.scope.set(field, value);
        // A redacted secret never appears in the user layer read-back; judging it
        // by value would misreport a successful secret save as failed.
        if (this.specOf(field).secret)
            return true;
        return getByPath(this.userLayer(), field) === value;
    }
    /** Write one root object wholesale (the official scope is single-segment). */
    async storeObject(root, value, hasSecret) {
        await this.scope.set(root, value);
        if (hasSecret)
            return true;
        return deepEqualJson(getByPath(this.userLayer(), root), value);
    }
    stage(field, edit) {
        this.staged.set(field, edit);
        this.failed = false;
        this.failedReason = undefined;
        this.publish();
    }
    specOf(field) {
        const spec = this.specs.get(field);
        // Every call site names a field this card declared; a missing one is a
        // wiring mistake that must not degrade into a silently inert control.
        if (spec === undefined)
            throw new Error(`settings card has no field ${field}`);
        return spec;
    }
    snapshotOf() {
        return this.scope.getSnapshot();
    }
    sectionValue(field) {
        return getByPath(this.snapshotOf().value, field);
    }
    baseValue(field) {
        return getByPath(this.snapshotOf().base, field);
    }
    userLayer() {
        return this.snapshotOf().user;
    }
    stored(field) {
        return hasByPath(this.userLayer(), field);
    }
    publish() {
        for (const listener of this.listeners)
            listener();
    }
}
