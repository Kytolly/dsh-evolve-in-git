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
import type { SettingsScope, SnapshotStore } from '@deepseek-ai/dsh-client-runtime/client';
/** The write one field's staged text performs when the card is saved. */
export type FieldWrite = {
    kind: 'set';
    value: unknown;
} | {
    kind: 'clear';
};
/** How one field converts between its stored value and its draft text. */
export interface FieldSpec {
    /** Field name inside the namespace section; dotted names address nested objects. */
    field: string;
    /**
     * Whether the Host treats this field as a secret and redacts its value from
     * the read-back (role('secret') in the section schema). Redacted secrets are
     * never compared against the draft on save; the field lands when the scope
     * reports the write succeeded.
     */
    secret?: boolean;
    /**
     * When set, this field is one member of the named root object and every
     * grouped member is written in a single `scope.set(root, merged)` op (the
     * official scope addresses only single-segment paths). All specs sharing a
     * root must name fields directly under it.
     */
    objectRoot?: string;
    /** Render a stored value as draft text; the empty string when the section carries none. */
    format: (value: unknown) => string;
    /**
     * The write this draft text stages, or undefined when the text is not a
     * value this field accepts — which blocks the save rather than discarding it.
     */
    parse: (text: string) => FieldWrite | undefined;
}
/** One field as the card renders it. */
export interface FieldState {
    /** Draft text the control renders. */
    text: string;
    /** Whether saving would leave a user-layer entry for this field. */
    overridden: boolean;
    /** Whether the draft is not a value this field accepts, which blocks saving. */
    invalid: boolean;
}
/** Form state every plugin settings card shares. */
export interface CardShell {
    /** False while the namespace is still loading; the card renders nothing. */
    available: boolean;
    /**
     * Whether the namespace is actually served to this client. False when the
     * Host deployment does not expose it: the card renders an explanation
     * instead of its form, so a missing namespace never looks like a missing
     * plugin.
     */
    exposed: boolean;
    /** Whether the Host document accepts writes. */
    writable: boolean;
    /** Whether the form holds edits that a save would write. */
    dirty: boolean;
    /** Whether any staged draft is invalid, which blocks the save. */
    invalid: boolean;
    /** Whether a save is crossing the wire. */
    saving: boolean;
    /** Whether the last save did not land as staged; cleared by the next edit or save. */
    failed: boolean;
    /** The rejection code/message the Host returned for the last failed save. */
    failedReason?: string;
}
/** The write actions the card's slot entry injects. */
export interface CardActions {
    /** Stage draft text for one field. */
    edit: (field: string, text: string) => void;
    /** Stage a clear, so saving lets the field re-inherit the composition layer. */
    resetField: (field: string) => void;
    /** Write every staged edit, then re-seed from what the Host accepted. */
    save: () => void;
    /** Drop every staged edit. */
    discard: () => void;
}
/** Constraints a numeric field's accepted drafts must satisfy, mirroring the host schema. */
export interface NumberConstraints {
    /** The accepted value must be a whole number. */
    integer?: boolean;
    /** The accepted value must be at least this. */
    min?: number;
}
/** A whole- or decimal-number field. An empty draft clears the field; any other draft that is not a finite number within the constraints blocks the save. */
export declare function numberField(field: string, constraints?: NumberConstraints): FieldSpec;
/** A free-text field. An empty draft clears the field. */
export declare function textField(field: string): FieldSpec;
/**
 * A free-text field the Host treats as a secret and redacts from the read-back
 * (role('secret') in the section schema). The card still edits it like text,
 * but a save never compares the redacted value back and relies on the scope
 * reporting the write landed.
 */
export declare function secretField(field: string): FieldSpec;
/** A boolean field, edited through true/false draft text. */
export declare function booleanField(field: string): FieldSpec;
/** An enumerated string field; only the listed choices are accepted. An empty draft clears the field. */
export declare function choiceField(field: string, choices: readonly string[]): FieldSpec;
/**
 * Attach an object root to a field spec: the field is written as one member of
 * the named root object in a single wholesale write (see FieldSpec.objectRoot).
 */
export declare function objectField(spec: FieldSpec, objectRoot: string): FieldSpec;
/**
 * Stages one card's edits over one settings namespace and writes them on save.
 *
 * The Host is the only authority on whether a value was accepted — its
 * validators own the constraints no schema can express — so the outcome is
 * read back from the section rather than predicted here. A save that did not
 * land keeps its drafts, so the user can correct them instead of retyping.
 */
export declare class CardForm<T> {
    private readonly scope;
    private readonly specs;
    private readonly staged;
    private readonly listeners;
    /** The scope subscription installed in the constructor; released by dispose(). */
    private readonly disposeScope;
    private disposed;
    private saving;
    private failed;
    private failedReason;
    /** @param scope - the bound settings scope for this card's namespace. */
    constructor(scope: SettingsScope<T>, specs: FieldSpec[]);
    /**
     * Release the scope subscription and every bound store listener. The card
     * must call this on teardown; later calls are no-ops.
     */
    dispose(): void;
    /** Publish a projection of this form, rebuilt whenever the scope or a draft changes. */
    bind<S>(project: () => S): SnapshotStore<S>;
    /** Read the card-level state: what the Host serves, and what a save would do. */
    shell(): CardShell;
    /** Read one field's state from the effective section and its staged draft. */
    field(field: string): FieldState;
    /** The actions the card's slot registration injects. */
    actions(): CardActions;
    /**
     * Write every staged edit, then re-seed from what the Host accepted.
     * A field lands only when the Host reports it held the staged value; a
     * landed field's draft is dropped, a failed one stays staged for the user.
     * @returns settlement after every write and the read-back.
     */
    save(): Promise<void>;
    /**
     * Every staged edit a save would write. Scalar fields write one op each;
     * object-rooted fields coalesce per root into one wholesale write of the
     * merged root object. An entry whose draft is not a value its field accepts
     * carries no write: the form is still dirty, and the save refuses rather
     * than dropping the edit.
     * @returns the planned writes, in the order the fields were staged.
     */
    private plan;
    /** Coalesce one root's staged members into a single merged-object write. */
    private planGroup;
    private clear;
    private store;
    /** Write one root object wholesale (the official scope is single-segment). */
    private storeObject;
    private stage;
    private specOf;
    private snapshotOf;
    private sectionValue;
    private baseValue;
    private userLayer;
    private stored;
    private publish;
}
