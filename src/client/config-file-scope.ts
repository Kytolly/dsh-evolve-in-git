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

import type { SettingsScope, SettingsScopeSnapshot } from '@deepseek-ai/dsh-client-runtime/client'
import type { EvolveSettings } from './EvolveSettingsCard.tsx'

/** Window event the config-file editor dispatches after a successful save. */
export const CONFIG_SAVED_EVENT = 'evolve-git:config-saved'

/** Wire shape of the config-file route responses. */
interface ConfigFileResponse {
  ok?: boolean
  error?: string
  path?: string
  exists?: boolean
  raw?: string
  config?: Record<string, unknown>
  defaults?: Record<string, unknown>
}

/** Deep-merge one plain-object layer over another (auth merges per subkey). */
export function mergeLayers(base: Record<string, unknown>, over: Record<string, unknown>): Record<string, unknown> {
  const merged = { ...base }
  for (const [key, value] of Object.entries(over)) {
    const under = merged[key]
    if (isPlainObject(value) && isPlainObject(under)) {
      merged[key] = { ...under, ...value }
    } else {
      merged[key] = value
    }
  }
  return merged
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/** Set a value at a dotted path ('' segments are ignored), creating containers. */
export function setByPath(root: Record<string, unknown>, path: string, value: unknown): void {
  const segments = path.split('.').filter(segment => segment !== '')
  if (segments.length === 0) return
  let cursor = root
  for (let index = 0; index < segments.length - 1; index++) {
    const segment = segments[index] as string
    const child = cursor[segment]
    if (!isPlainObject(child)) {
      const created: Record<string, unknown> = {}
      cursor[segment] = created
      cursor = created
    } else {
      cursor = child
    }
  }
  cursor[segments[segments.length - 1] as string] = value
}

/** Delete a value at a dotted path (no-op when absent). */
export function deleteByPath(root: Record<string, unknown>, path: string): void {
  const segments = path.split('.').filter(segment => segment !== '')
  if (segments.length === 0) return
  let cursor = root
  for (let index = 0; index < segments.length - 1; index++) {
    const child = cursor[segments[index] as string]
    if (!isPlainObject(child)) return
    cursor = child
  }
  delete cursor[segments[segments.length - 1] as string]
}

/**
 * The config file as a live settings scope. Loading fetches the file plus the
 * plugin defaults; the effective value is defaults overlaid by the file, so a
 * configured field visibly overrides its default. set/unset merge into the
 * file and PUT it back; a successful write re-seeds from the host response.
 */
export class ConfigFileScope implements SettingsScope<EvolveSettings> {
  private readonly listeners = new Set<() => void>()
  private snapshot: SettingsScopeSnapshot<EvolveSettings>
  private user: Record<string, unknown> = {}
  private defaults: Record<string, unknown> = {}
  private revision = 1
  private disposed = false

  constructor() {
    this.snapshot = {
      status: 'loading',
      value: undefined,
      base: undefined,
      user: undefined,
      revision: undefined,
      writable: false,
      mode: 'host',
    }
    // The config-file editor saves the same document; reload so the form and
    // the editor never disagree.
    window.addEventListener(CONFIG_SAVED_EVENT, () => { void this.reload() })
  }

  /** Fetch the config document and defaults, then publish a ready snapshot. */
  async load(): Promise<void> {
    if (this.disposed) return
    this.snapshot = { ...this.snapshot, status: 'loading' }
    this.publish()
    try {
      const body = await fetchConfigFile()
      this.defaults = body.defaults ?? {}
      this.user = body.config ?? {}
      this.snapshot = {
        status: 'ready',
        value: mergeLayers(this.defaults, this.user) as EvolveSettings,
        base: this.defaults as EvolveSettings,
        user: this.user as EvolveSettings,
        revision: this.revision,
        writable: true,
        mode: 'host',
      }
      this.publish()
    } catch {
      this.snapshot = { status: 'unavailable', value: undefined, base: undefined, user: undefined, revision: undefined, writable: false, mode: 'host' }
      this.publish()
    }
  }

  /** Re-fetch after an external save (config-file editor). */
  reload(): Promise<void> {
    return this.load()
  }

  /** @returns the current sync snapshot (stable reference until the next change). */
  getSnapshot(): SettingsScopeSnapshot<EvolveSettings> {
    return this.snapshot
  }

  /** Observe snapshot replacements. */
  subscribe(listener: () => void): () => void {
    this.listeners.add(listener)
    return () => { this.listeners.delete(listener) }
  }

  /** Merge one field into the file and persist. */
  async set(field: string, value: unknown): Promise<void> {
    const next = structuredClone(this.user)
    setByPath(next, field, value)
    await this.persist(next)
  }

  /** Remove one field from the file and persist. */
  async unset(field: string): Promise<void> {
    const next = structuredClone(this.user)
    deleteByPath(next, field)
    await this.persist(next)
  }

  /** Release the window listener and every subscriber. */
  dispose(): void {
    if (this.disposed) return
    this.disposed = true
    window.removeEventListener(CONFIG_SAVED_EVENT, this.onConfigSaved)
    this.listeners.clear()
  }

  private readonly onConfigSaved = (): void => { void this.reload() }

  private async persist(next: Record<string, unknown>): Promise<void> {
    const raw = JSON.stringify(next, null, 2) + '\n'
    const body = await saveConfigFile(raw)
    this.user = body.config ?? next
    this.revision += 1
    this.snapshot = {
      status: 'ready',
      value: mergeLayers(this.defaults, this.user) as EvolveSettings,
      base: this.defaults as EvolveSettings,
      user: this.user as EvolveSettings,
      revision: this.revision,
      writable: true,
      mode: 'host',
    }
    this.publish()
  }

  private publish(): void {
    for (const listener of this.listeners) listener()
  }
}

async function fetchConfigFile(): Promise<ConfigFileResponse> {
  const response = await fetch('/api/evolve-git/config')
  const body = await response.json() as ConfigFileResponse
  if (!response.ok || body.ok !== true) throw new Error(body.error ?? 'load failed')
  return body
}

async function saveConfigFile(raw: string): Promise<ConfigFileResponse> {
  const response = await fetch('/api/evolve-git/config', {
    method: 'PUT',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ raw }),
  })
  const body = await response.json() as ConfigFileResponse
  if (!response.ok || body.ok !== true) throw new Error(body.error ?? 'save failed')
  return body
}