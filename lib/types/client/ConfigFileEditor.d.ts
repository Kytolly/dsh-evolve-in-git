/**
 * Config-file editor inside the evolve settings card: opens the per-user
 * `$DSH_HOME/evolve-in-git.json` document, edits it as raw JSON text, and
 * saves it back through the loopback-only '/api/evolve-git/config' route.
 * The config file is the highest-priority user layer (it overrides the
 * settings-namespace form above and the profile patch layer), so this editor
 * is the advanced / every-user surface — each DSH user keeps their own file
 * and it never enters any Git repository.
 * @module dsh-evolve-in-git/client/ConfigFileEditor
 */
import type { EvolveClientKey } from './locales.ts';
interface ConfigFileEditorProps {
    /** Locale reader for this card's copy. */
    t: (key: EvolveClientKey, params?: Record<string, string | number>) => string;
}
/**
 * Render the config-file editor.
 * @param props - locale copy.
 * @returns the editor.
 */
export declare function ConfigFileEditor(props: ConfigFileEditorProps): import("react").JSX.Element;
export {};
