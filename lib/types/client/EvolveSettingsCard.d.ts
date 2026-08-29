/**
 * The EvolveInGit settings card: the Git memory repository (path, remote URL,
 * auth, storage roots, default branch, auto-commit), bound to the
 * 'evolve-git' settings namespace the host plugin registers. Rendered as a
 * first-level settings section; the wrapper below mounts it as the content of
 * the top-level 'settings.section' nav entry.
 *
 * The nested `auth` object cannot be addressed by the official settings scope
 * (single-segment writes only), so the five auth fields are grouped through
 * `objectRoot: 'auth'` and saved as one wholesale write of the merged object.
 * @module dsh-evolve-in-git/client/EvolveSettingsCard
 */
import type { ReactNode } from 'react';
import type { InjectFace, PropsLocale, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots';
import type { SettingsScope, SnapshotStore } from '@deepseek-ai/dsh-client-runtime/client';
import { type CardActions, type CardShell, type FieldState as CardFieldState } from './settings-form.ts';
/** The evolve-git settings fields this card edits (the namespace's full schema). */
export interface EvolveSettings {
    /** Local Git checkout where memory and skills are written. */
    repoPath?: string;
    /** Remote memory repository URL. */
    repoUrl?: string;
    /** Git auth settings for private access. */
    auth?: {
        mode?: 'ssh' | 'token';
        sshCommand?: string;
        tokenEnv?: string;
        token?: string;
        username?: string;
    };
    /** Where memory records are written, relative to the repo. */
    memoryRoot?: string;
    /** Where skill drafts are written, relative to the repo. */
    skillsRoot?: string;
    /** Branch to evolve from when creating new branches. */
    defaultBranch?: string;
    /** Remote to fetch and push. */
    remoteName?: string;
    /** Whether writes auto-commit. */
    autoCommit?: boolean;
    /** Where forgotten records are archived, relative to the repo. */
    archiveRoot?: string;
    /** Maximum number of recall results. */
    recallTopK?: number;
    /** Minimum recall relevance score. */
    recallMinScore?: number;
    /** Cumulative character budget for recall content. */
    recallMaxChars?: number;
    /** Write-path privacy gate strategy for sensitive content. */
    privacyMode?: 'block' | 'redact' | 'ask';
    /** Whether to inject a session-start persona/warning digest. */
    digestEnabled?: boolean;
    /** Maximum persona/warning records in the session-start digest. */
    digestMaxRecords?: number;
    /** Maximum characters of the session-start digest. */
    digestMaxChars?: number;
}
/** What the evolve settings card renders. */
export interface EvolveSettingsCardState extends CardShell {
    repoPath: CardFieldState;
    repoUrl: CardFieldState;
    authMode: CardFieldState;
    authSshCommand: CardFieldState;
    authTokenEnv: CardFieldState;
    authToken: CardFieldState;
    authUsername: CardFieldState;
    memoryRoot: CardFieldState;
    skillsRoot: CardFieldState;
    defaultBranch: CardFieldState;
    remoteName: CardFieldState;
    autoCommit: CardFieldState;
    archiveRoot: CardFieldState;
    recallTopK: CardFieldState;
    recallMinScore: CardFieldState;
    recallMaxChars: CardFieldState;
    privacyMode: CardFieldState;
    digestEnabled: CardFieldState;
    digestMaxRecords: CardFieldState;
    digestMaxChars: CardFieldState;
}
/** The registration-side face the card's slot entry injects. */
export interface EvolveSettingsCardFace extends CardActions {
    hooks: {
        /** Card snapshot bound by the renderer as useEvolveSettingsCard. */
        evolveSettingsCard: SnapshotStore<EvolveSettingsCardState>;
    };
}
/** Bridges the 'evolve-git' scope onto the card's staged form. */
export declare class EvolveSettingsCardController {
    private readonly form;
    private readonly store;
    /** @param scope - the bound settings scope for the 'evolve-git' namespace. */
    constructor(scope: SettingsScope<EvolveSettings>);
    private projection;
    /**
     * Build the face the card's slot registration injects.
     * @returns the card's snapshot and its form actions.
     */
    inject(): EvolveSettingsCardFace;
    /**
     * Release the card's scope subscription and bound stores; the slot
     * disposer calls this on teardown.
     */
    dispose(): void;
}
/** Props the renderer binds for the evolve settings card. */
export type EvolveSettingsCardProps = PropsLocale<'evolve-git'> & InjectFace<EvolveSettingsCardFace>;
/**
 * Render the evolve settings card.
 * @param props - locale copy, the card snapshot, and its form actions.
 * @returns the card.
 */
export declare function EvolveSettingsCard(props: EvolveSettingsCardProps): import("react").JSX.Element;
/** Props the settings section binds for the evolve card page. */
export type EvolveSettingsSectionProps = PropsRuntime<'settings.section'> & PropsLocale<'evolve-git'> & InjectFace<EvolveSettingsCardFace>;
/** Render the evolve settings card as a first-level settings page. */
export declare function EvolveSettingsSection(props: EvolveSettingsSectionProps): ReactNode;
