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

import type { SettingsScope, SettingsScopeSnapshot, SnapshotStore } from '@deepseek-ai/dsh-client-runtime/client'
import { createSnapshotStore } from '@deepseek-ai/dsh-client-runtime/client'

/** The write one field's staged text performs when the card is saved. */
export type FieldWrite =
  | { kind: 'set'; value: unknown }
  | { kind: 'clear' }

/** How one field converts between its stored value and its draft text. */
export interface FieldSpec {
  /** Field name inside the namespace section; dotted names address nested objects. */
  field: string
  /**
   * Whether the Host treats this field as a secret and redacts its value from
   * the read-back (role('secret') in the section schema). Redacted secrets are
   * never compared against the draft on save; the field lands when the scope
   * reports the write succeeded.
   */
  secret?: boolean
  /**
   * When set, this field is one member of the named root object and every
   * grouped member is written in a single `scope.set(root, merged)` op (the
   * official scope addresses only single-segment paths). All specs sharing a
   * root must name fields directly under it.
   */
  objectRoot?: string
  /** Render a stored value as draft text; the empty string when the section carries none. */
  format: (value: unknown) => string
  /**
   * The write this draft text stages, or undefined when the text is not a
   * value this field accepts — which blocks the save rather than discarding it.
   */
  parse: (text: string) => FieldWrite | undefined
}

/** One field as the card renders it. */
export interface FieldState {
  /** Draft text the control renders. */
  text: string
  /** Whether saving would leave a user-layer entry for this field. */
  overridden: boolean
  /** Whether the draft is not a value this field accepts, which blocks saving. */
  invalid: boolean
}

/** Form state every plugin settings card shares. */
export interface CardShell {
  /** False while the namespace is still loading; the card renders nothing. */
  available: boolean
  /**
   * Whether the namespace is actually served to this client. False when the
   * Host deployment does not expose it: the card renders an explanation
   * instead of its form, so a missing namespace never looks like a missing
   * plugin.
   */
  exposed: boolean
  /** Whether the Host document accepts writes. */
  writable: boolean
  /** Whether the form holds edits that a save would write. */
  dirty: boolean
  /** Whether any staged draft is invalid, which blocks the save. */
  invalid: boolean
  /** Whether a save is crossing the wire. */
  saving: boolean
  /** Whether the last save did not land as staged; cleared by the next edit or save. */
  failed: boolean
  /** The rejection code/message the Host returned for the last failed save. */
  failedReason?: string
}

/** The write actions the card's slot entry injects. */
export interface CardActions {
  /** Stage draft text for one field. */
  edit: (field: string, text: string) => void
  /** Stage a clear, so saving lets the field re-inherit the composition layer. */
  resetField: (field: string) => void
  /** Write every staged edit, then re-seed from what the Host accepted. */
  save: () => void
  /** Drop every staged edit. */
  discard: () => void
}

/** One field's staged edit. */
interface StagedEdit {
  /** Draft text the control renders. */
  text: string
  /** True when this edit clears the field whatever text it shows. */
  clear: boolean
}

/** One staged edit resolved into the write a save performs. */
interface PlannedWrite {
  /** Field this entry writes (a member field for grouped writes). */
  field: string
  /** Perform the write and report whether the Host holds the staged value afterwards. */
  run: (() => Promise<boolean>) | undefined
}

/** Constraints a numeric field's accepted drafts must satisfy, mirroring the host schema. */
export interface NumberConstraints {
  /** The accepted value must be a whole number. */
  integer?: boolean
  /** The accepted value must be at least this. */
  min?: number
}

/** A whole- or decimal-number field. An empty draft clears the field; any other draft that is not a finite number within the constraints blocks the save. */
export function numberField(field: string, constraints: NumberConstraints = {}): FieldSpec {
  const { integer = false, min } = constraints
  return {
    field,
    format: value => typeof value === 'number' ? String(value) : '',
    parse: (text) => {
      const trimmed = text.trim()
      if (trimmed === '') return { kind: 'clear' }
      const parsed = Number(trimmed)
      if (!Number.isFinite(parsed)) return undefined
      if (integer && !Number.isInteger(parsed)) return undefined
      if (min !== undefined && parsed < min) return undefined
      return { kind: 'set', value: parsed }
    },
  }
}

/** A free-text field. An empty draft clears the field. */
export function textField(field: string): FieldSpec {
  return {
    field,
    format: value => typeof value === 'string' ? value : '',
    parse: (text) => {
      const trimmed = text.trim()
      return trimmed === '' ? { kind: 'clear' } : { kind: 'set', value: trimmed }
    },
  }
}

/**
 * A free-text field the Host treats as a secret and redacts from the read-back
 * (role('secret') in the section schema). The card still edits it like text,
 * but a save never compares the redacted value back and relies on the scope
 * reporting the write landed.
 */
export function secretField(field: string): FieldSpec {
  return { ...textField(field), secret: true }
}

/** A boolean field, edited through true/false draft text. */
export function booleanField(field: string): FieldSpec {
  return {
    field,
    format: value => typeof value === 'boolean' ? String(value) : '',
    parse: (text) => {
      const trimmed = text.trim()
      if (trimmed === '') return { kind: 'clear' }
      if (trimmed === 'true') return { kind: 'set', value: true }
      if (trimmed === 'false') return { kind: 'set', value: false }
      return undefined
    },
  }
}

/** An enumerated string field; only the listed choices are accepted. An empty draft clears the field. */
export function choiceField(field: string, choices: readonly string[]): FieldSpec {
  return {
    field,
    format: value => typeof value === 'string' && choices.includes(value) ? value : '',
    parse: (text) => {
      if (text === '') return { kind: 'clear' }
      return choices.includes(text) ? { kind: 'set', value: text } : undefined
    },
  }
}

/**
 * Attach an object root to a field spec: the field is written as one member of
 * the named root object in a single wholesale write (see FieldSpec.objectRoot).
 */
export function objectField(spec: FieldSpec, objectRoot: string): FieldSpec {
  return { ...spec, objectRoot }
}

/** Deep equality over JSON-compatible data. */
function deepEqualJson(a: unknown, b: unknown): boolean {
  if (a === b) return true
  if (typeof a !== 'object' || typeof b !== 'object' || a === null || b === null) return false
  if (Array.isArray(a) || Array.isArray(b)) {
    if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length) return false
    return a.every((entry, index) => deepEqualJson(entry, b[index]))
  }
  const left = a as Record<string, unknown>
  const right = b as Record<string, unknown>
  const keys = Object.keys(left)
  if (keys.length !== Object.keys(right).length) return false
  return keys.every(key => key in right && deepEqualJson(left[key], right[key]))
}

/** Read a value at a dotted path ('' segments are ignored). */
function getByPath(root: unknown, path: string): unknown {
  let cursor = root
  for (const segment of path.split('.')) {
    if (segment === '') continue
    if (typeof cursor !== 'object' || cursor === null) return undefined
    cursor = (cursor as Record<string, unknown>)[segment]
  }
  return cursor
}

/** Whether a value has an own key at a dotted path. */
function hasByPath(root: unknown, path: string): boolean {
  const segments = path.split('.').filter(segment => segment !== '')
  if (segments.length === 0) return false
  let cursor = root
  for (let index = 0; index < segments.length; index++) {
    if (typeof cursor !== 'object' || cursor === null) return false
    const record = cursor as Record<string, unknown>
    const segment = segments[index] as string
    if (index === segments.length - 1) return Object.hasOwn(record, segment)
    if (!Object.hasOwn(record, segment)) return false
    cursor = record[segment]
  }
  return false
}

/** Clone a plain JSON-shaped object (the merged root draft). */
function clonePlain(value: unknown): Record<string, unknown> {
  if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
    return { ...value as Record<string, unknown> }
  }
  return {}
}

/**
 * Stages one card's edits over one settings namespace and writes them on save.
 *
 * The Host is the only authority on whether a value was accepted — its
 * validators own the constraints no schema can express — so the outcome is
 * read back from the section rather than predicted here. A save that did not
 * land keeps its drafts, so the user can correct them instead of retyping.
 */
export class CardForm<T> {
  private readonly specs: Map<string, FieldSpec>
  private readonly staged = new Map<string, StagedEdit>()
  private readonly listeners = new Set<() => void>()
  /** The scope subscription installed in the constructor; released by dispose(). */
  private readonly disposeScope: () => void
  private disposed = false
  private saving = false
  private failed = false
  private failedReason: string | undefined

  /** @param scope - the bound settings scope for this card's namespace. */
  constructor(
    private readonly scope: SettingsScope<T>,
    specs: FieldSpec[],
  ) {
    this.specs = new Map(specs.map(spec => [spec.field, spec]))
    this.disposeScope = scope.subscribe(() => { this.publish() })
  }

  /**
   * Release the scope subscription and every bound store listener. The card
   * must call this on teardown; later calls are no-ops.
   */
  dispose(): void {
    if (this.disposed) return
    this.disposed = true
    this.disposeScope()
    this.listeners.clear()
  }

  /** Publish a projection of this form, rebuilt whenever the scope or a draft changes. */
  bind<S>(project: () => S): SnapshotStore<S> {
    const store = createSnapshotStore(project())
    this.listeners.add(() => { store.set(project()) })
    return store
  }

  /** Read the card-level state: what the Host serves, and what a save would do. */
  shell(): CardShell {
    const snapshot = this.scope.getSnapshot()
    const plan = this.plan()
    return {
      available: snapshot.status !== 'loading',
      exposed: snapshot.status === 'ready',
      writable: snapshot.writable,
      dirty: plan.length > 0,
      invalid: plan.some(item => item.run === undefined),
      saving: this.saving,
      failed: this.failed,
      ...this.failedReason === undefined ? {} : { failedReason: this.failedReason },
    }
  }

  /** Read one field's state from the effective section and its staged draft. */
  field(field: string): FieldState {
    const spec = this.specOf(field)
    const staged = this.staged.get(field)
    if (staged === undefined) {
      return { text: spec.format(this.sectionValue(field)), overridden: this.stored(field), invalid: false }
    }
    const write = staged.clear ? { kind: 'clear' as const } : spec.parse(staged.text)
    return {
      text: staged.text,
      overridden: write?.kind === 'set',
      invalid: write === undefined,
    }
  }

  /** The actions the card's slot registration injects. */
  actions(): CardActions {
    return {
      edit: (field, text) => { this.stage(field, { text, clear: false }) },
      resetField: (field) => {
        this.stage(field, { text: this.specOf(field).format(this.baseValue(field)), clear: true })
      },
      save: () => { void this.save() },
      discard: () => {
        if (this.staged.size === 0 && !this.failed) return
        this.staged.clear()
        this.failed = false
        this.failedReason = undefined
        this.publish()
      },
    }
  }

  /**
   * Write every staged edit, then re-seed from what the Host accepted.
   * A field lands only when the Host reports it held the staged value; a
   * landed field's draft is dropped, a failed one stays staged for the user.
   * @returns settlement after every write and the read-back.
   */
  async save(): Promise<void> {
    const plan = this.plan()
    const valid = plan.filter(item => item.run !== undefined)
    if (plan.length === 0 || this.saving || valid.length !== plan.length) return
    // Snapshot the staged entries this save writes, so an edit staged while it
    // is in flight (which replaces the same key) survives: only delete the key
    // when the entry is still the one this save started from.
    const pending = new Map<string, StagedEdit | undefined>()
    for (const item of plan) pending.set(item.field, this.staged.get(item.field))
    this.saving = true
    this.failed = false
    this.failedReason = undefined
    this.publish()
    const landed = new Set<string>()
    for (const item of valid) {
      if (await item.run!()) landed.add(item.field)
    }
    for (const [field, before] of pending) {
      if (landed.has(field) && this.staged.get(field) === before) this.staged.delete(field)
    }
    this.saving = false
    this.failed = landed.size !== pending.size
    this.publish()
  }

  /**
   * Every staged edit a save would write. Scalar fields write one op each;
   * object-rooted fields coalesce per root into one wholesale write of the
   * merged root object. An entry whose draft is not a value its field accepts
   * carries no write: the form is still dirty, and the save refuses rather
   * than dropping the edit.
   * @returns the planned writes, in the order the fields were staged.
   */
  private plan(): PlannedWrite[] {
    const plan: PlannedWrite[] = []
    const groups = new Map<string, { spec: FieldSpec; staged: StagedEdit }[]>()
    for (const [field, staged] of this.staged) {
      const spec = this.specOf(field)
      if (spec.objectRoot !== undefined) {
        const list = groups.get(spec.objectRoot) ?? []
        list.push({ spec, staged })
        groups.set(spec.objectRoot, list)
        continue
      }
      if (staged.clear) {
        if (this.stored(field)) plan.push({ field, run: () => this.clear(field) })
        continue
      }
      if (staged.text === spec.format(this.sectionValue(field))) continue
      const write = spec.parse(staged.text)
      if (write === undefined) plan.push({ field, run: undefined })
      else if (write.kind === 'clear') plan.push({ field, run: () => this.clear(field) })
      else plan.push({ field, run: () => this.store(field, write.value) })
    }
    for (const [root, entries] of groups) {
      plan.push(...this.planGroup(root, entries))
    }
    return plan
  }

  /** Coalesce one root's staged members into a single merged-object write. */
  private planGroup(root: string, entries: { spec: FieldSpec; staged: StagedEdit }[]): PlannedWrite[] {
    const fields = entries.map(entry => entry.spec.field)
    const merged = clonePlain(this.sectionValue(root))
    let changed = false
    let hasSecret = false
    let invalid = false
    for (const { spec, staged } of entries) {
      if (spec.secret === true) hasSecret = true
      const member = spec.field.slice(root.length + 1)
      if (staged.clear) {
        if (Object.hasOwn(merged, member)) {
          delete merged[member]
          changed = true
        }
        continue
      }
      const write = spec.parse(staged.text)
      if (write === undefined) {
        invalid = true
        continue
      }
      if (write.kind === 'clear') {
        if (Object.hasOwn(merged, member)) {
          delete merged[member]
          changed = true
        }
      } else if (merged[member] !== write.value) {
        merged[member] = write.value
        changed = true
      }
    }
    if (!changed) return []
    const run = invalid ? undefined : () => this.storeObject(root, merged, hasSecret)
    return fields.map(field => ({ field, run }))
  }

  private async clear(field: string): Promise<boolean> {
    await this.scope.unset(field)
    return !this.stored(field)
  }

  private async store(field: string, value: unknown): Promise<boolean> {
    await this.scope.set(field, value)
    // A redacted secret never appears in the user layer read-back; judging it
    // by value would misreport a successful secret save as failed.
    if (this.specOf(field).secret) return true
    return getByPath(this.userLayer(), field) === value
  }

  /** Write one root object wholesale (the official scope is single-segment). */
  private async storeObject(root: string, value: Record<string, unknown>, hasSecret: boolean): Promise<boolean> {
    await this.scope.set(root, value)
    if (hasSecret) return true
    return deepEqualJson(getByPath(this.userLayer(), root), value)
  }

  private stage(field: string, edit: StagedEdit): void {
    this.staged.set(field, edit)
    this.failed = false
    this.failedReason = undefined
    this.publish()
  }

  private specOf(field: string): FieldSpec {
    const spec = this.specs.get(field)
    // Every call site names a field this card declared; a missing one is a
    // wiring mistake that must not degrade into a silently inert control.
    if (spec === undefined) throw new Error(`settings card has no field ${field}`)
    return spec
  }

  private snapshotOf(): SettingsScopeSnapshot<T> {
    return this.scope.getSnapshot()
  }

  private sectionValue(field: string): unknown {
    return getByPath(this.snapshotOf().value, field)
  }

  private baseValue(field: string): unknown {
    return getByPath(this.snapshotOf().base, field)
  }

  private userLayer(): Record<string, unknown> | undefined {
    return this.snapshotOf().user as Record<string, unknown> | undefined
  }

  private stored(field: string): boolean {
    return hasByPath(this.userLayer(), field)
  }

  private publish(): void {
    for (const listener of this.listeners) listener()
  }
}