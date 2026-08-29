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
import { EvolveSettingsSection, EvolveSettingsCardController } from "./EvolveSettingsCard.js";
import { ConfigFileScope } from "./config-file-scope.js";
import { dictionaries } from "./locales.js";
/** Locale namespace of the browser half (matches the plugin package id). */
export const NS = 'evolve-git';
/** Required services: slots for the settings section and locale for the copy. The form reads the config file directly. */
export const inject = ['slots', 'locale'];
/** Apply the browser half. */
export function apply(ctx) {
    ctx.effect(() => {
        try {
            return ctx.locale.register(NS, dictionaries);
        }
        catch {
            return () => { };
        }
    }, 'dsh-evolve-in-git: dictionaries');
    // The form reads and writes the per-user config file directly (the single
    // user layer), so no settings-namespace bind is involved.
    const configScope = new ConfigFileScope();
    ctx.effect(() => {
        void configScope.load();
        return () => { };
    }, 'dsh-evolve-in-git: config load');
    const controller = new EvolveSettingsCardController(configScope);
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
            }, EvolveSettingsSection);
            return () => {
                unregister();
                controller.dispose();
                configScope.dispose();
            };
        }
        catch {
            return () => { };
        }
    });
}
