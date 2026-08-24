/**
 * Family-shared chrome for plugin settings cards: a disclosure header naming
 * the plugin and what its settings govern, the controls inside, and the save
 * that writes them. Renders nothing while the namespace is unavailable — a
 * deployment that does not compose the owning plugin should show no trace of
 * it. Inlined into each consumer's client bundle; mirrors the official
 * ui-plugin-config PluginCard in a self-contained slice.
 * @module dsh-evolve-in-git/client/PluginSettingsCard
 */
import { type ReactNode } from 'react';
import type { CardShell } from './settings-form.ts';
/** Copy keys the card chrome itself reads; every consumer locale carries this shared vocabulary. */
export declare const CARD_COPY_KEYS: readonly ["settings.collapse", "settings.expand", "settings.notExposed", "settings.unsaved", "settings.readOnly", "settings.saveFailed", "settings.discard", "settings.save", "settings.saving"];
/** Copy key the card chrome itself reads. */
export type CardCopyKey = (typeof CARD_COPY_KEYS)[number];
/** Key domain for the plugin's own copy (inferred per consumer). */
export type SettingsCardKey<TKey extends string = string> = TKey | CardCopyKey;
/** Card chrome shared by every plugin settings card. */
export interface PluginSettingsCardProps<TKey extends string = string> {
    /** Locale reader for this card's copy. */
    t: (key: SettingsCardKey<TKey>, params?: Record<string, string | number>) => string;
    /** Locale key of the plugin's name. */
    titleKey: TKey;
    /** Locale key of the line describing what this plugin's settings govern. */
    descriptionKey: TKey;
    /** The card's form state: availability, writability, and what a save would do. */
    state: CardShell;
    /** Write every staged edit. */
    onSave: () => void;
    /** Drop every staged edit. */
    onDiscard: () => void;
    /**
     * Render the controls expanded on arrival (still collapsible). Defaults to
     * true: promoted first-level sections show their settings immediately.
     */
    defaultOpen?: boolean;
    /**
     * Render without the collapse affordance: a static header and an always
     * visible body. Used by first-level settings sections whose nav entry
     * already provides the selection.
     */
    alwaysOpen?: boolean;
    /** The plugin's controls. */
    children: ReactNode;
}
/**
 * Render one plugin settings card.
 * @param props - the plugin's copy keys, its form state, and its controls.
 * @returns the card, or nothing while the namespace is still loading.
 */
export declare function PluginSettingsCard<TKey extends string = string>(props: PluginSettingsCardProps<TKey>): import("react").JSX.Element | null;
/** Props every field control needs regardless of its value type. */
export interface FieldProps {
    /** Stable id associating the label with its control. */
    id: string;
    /** Visible label. */
    label: string;
    /** One-line explanation rendered under the control. */
    hint: string;
    /** Draft text this control renders. */
    text: string;
    /** True when saving would leave a user-layer entry for this field. */
    overridden: boolean;
    /** True when the draft is not a value this field accepts. */
    invalid: boolean;
    /** Copy for the overridden badge. */
    overriddenLabel: string;
    /** Copy for the reset control. */
    resetLabel: string;
    /** Copy shown in place of the hint while the draft is invalid. */
    invalidLabel: string;
    /** Disables every control (read-only document, or an unavailable namespace). */
    disabled: boolean;
    /** Stage draft text. */
    onEdit: (text: string) => void;
    /** Stage a clear so the field re-inherits the composition layer. */
    onReset: () => void;
}
/** A staged value field. `numeric` only hints the keypad: which drafts a field accepts is decided by its spec. */
export declare function ValueField(props: FieldProps & {
    /** Hints a numeric keypad without narrowing what the control accepts. */
    numeric?: boolean;
    /** Placeholder shown while the draft is empty. */
    placeholder?: string;
}): import("react").JSX.Element;
interface SelectOption {
    value: string;
    label: string;
}
/**
 * The shared dual-mode select control. While an appearance skin is active it
 * renders the legacy native <select> untouched, so element-level skin
 * selectors keep working; under the default appearance it renders a
 * self-drawn role="listbox" popup whose open/close is transition-animated.
 * 双模式下拉框：皮肤激活时用原生 select，默认外观用自绘动画弹层。
 */
export declare function SelectField(props: {
    id: string;
    options: ReadonlyArray<SelectOption>;
    value: string;
    disabled: boolean;
    invalid: boolean;
    onEdit: (text: string) => void;
}): import("react").JSX.Element;
/** A staged boolean field: 继承 / 开 / 关. */
export declare function BooleanField(props: FieldProps & {
    /** Copy for the inherit option. */
    inheritLabel: string;
    /** Copy for the on option. */
    onLabel: string;
    /** Copy for the off option. */
    offLabel: string;
}): import("react").JSX.Element;
/** A staged enumerated field rendered as a select. */
export declare function ChoiceField(props: FieldProps & {
    /** Copy for the inherit option (draft text is the empty string). */
    inheritLabel: string;
    /** Choices rendered in order; `value` is the draft/stored text. */
    choices: ReadonlyArray<{
        value: string;
        label: string;
    }>;
}): import("react").JSX.Element;
export {};
