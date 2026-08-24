/**
 * Browser half of the dsh-evolve-in-git plugin: one first-level settings
 * section on the web Settings page. The section binds the host-registered
 * 'evolve-git' settings namespace through the official settings scope (or the
 * optional dsh-web family bridge when present) and renders the staged
 * repository/auth/storage form; saves write the namespace document through
 * the official settings transport.
 *
 * Failure policy: every DOM/runtime wiring failure is logged, never thrown —
 * the web shell fails the whole boot when a plugin apply throws.
 * @module dsh-evolve-in-git/client
 */

import type { ClientContext, SettingsScope, SettingsScopeSpec } from '@deepseek-ai/dsh-client-runtime/client'
import type {} from '@deepseek-ai/dsh-client-ui-slots'
import type {} from '@deepseek-ai/dsh-client-ui-settings/client'
import type {} from '@deepseek-ai/dsh-client-locale/client'
import { EvolveSettingsSection, EvolveSettingsCardController, type EvolveSettings } from './EvolveSettingsCard.tsx'
import { dictionaries, type EvolveClientKey } from './locales.ts'

declare module '@deepseek-ai/dsh-client-ui-slots' {
  interface LocaleNamespaceMap {
    /** The evolve-git settings section copy. */
    'evolve-git': EvolveClientKey
  }
}

declare module '@deepseek-ai/cordis' {
  interface Context {
    /**
     * Optional rc.6 compatibility binder provided by the dsh-web settings
     * family; absent when that group plugin is not installed, so callers fall
     * back to the official settings scope.
     */
    webUiSettings?: { bind<S>(spec: SettingsScopeSpec<S>): SettingsScope<S> }
  }
}

/** Locale namespace of the browser half (mirrors the settings namespace id). */
export const NS = 'evolve-git' as const

/** Required services: slots for the settings section, locale for the copy, and the settings scope the form binds. */
export const inject = ['slots', 'locale', 'settingsScope']

/** Apply the browser half. */
export function apply(ctx: ClientContext): void {
  ctx.effect(() => {
    try {
      return ctx.locale.register(NS, dictionaries)
    } catch {
      return () => {}
    }
  }, 'dsh-evolve-in-git: dictionaries')

  // Bound through the family bridge when the official scope does not expose
  // the namespace directly (the same fallback dsh-pet / describe-image use).
  const binder = ctx.get('webUiSettings') ?? ctx.settingsScope
  const settingsScope = binder.bind<EvolveSettings>({ namespace: NS })
  const controller = new EvolveSettingsCardController(settingsScope)

  // First-level settings section: one staged form over the 'evolve-git'
  // namespace, registered as a top-level settings page. The section entry
  // owns the controller: unregistering it (fiber disposal, hot reload)
  // releases the scope subscription through controller.dispose.
  ctx.slots.inject('settings.section', () => {
    try {
      const unregister = ctx.slots.register({
        name: 'settings.section',
        id: 'evolve-git',
        order: 120,
        label: () => ctx.locale.bind(NS)('settings.nav'),
        locale: NS,
        inject: () => controller.inject(),
      }, EvolveSettingsSection)
      return () => {
        unregister()
        controller.dispose()
      }
    } catch {
      return () => {}
    }
  })
}