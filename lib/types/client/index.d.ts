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
import type { ClientContext } from '@deepseek-ai/dsh-client-runtime/client';
import { type EvolveClientKey } from './locales.ts';
declare module '@deepseek-ai/dsh-client-ui-slots' {
    interface LocaleNamespaceMap {
        /** The evolve-git settings section copy. */
        'evolve-git': EvolveClientKey;
    }
}
/** Locale namespace of the browser half (matches the plugin package id). */
export declare const NS: "evolve-git";
/** Required services: slots for the settings section and locale for the copy. The form reads the config file directly. */
export declare const inject: string[];
/** Apply the browser half. */
export declare function apply(ctx: ClientContext): void;
