import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { PluginSettingsCard, ValueField, BooleanField, ChoiceField } from "./PluginSettingsCard.js";
import { ConfigFileEditor } from "./ConfigFileEditor.js";
import { CardForm, booleanField, choiceField, numberField, objectField, secretField, textField } from "./settings-form.js";
import sectionCss from './settings-section.module.css';
/** Bridges the 'evolve-git' scope onto the card's staged form. */
export class EvolveSettingsCardController {
    form;
    store;
    /** @param scope - the bound settings scope for the 'evolve-git' namespace. */
    constructor(scope) {
        this.form = new CardForm(scope, [
            textField('repoPath'),
            textField('repoUrl'),
            // The auth object is nested: the official scope writes single segments
            // only, so its members are grouped under objectRoot 'auth' and saved as
            // one wholesale write of the merged object.
            objectField(choiceField('auth.mode', ['ssh', 'token']), 'auth'),
            objectField(textField('auth.sshCommand'), 'auth'),
            objectField(textField('auth.tokenEnv'), 'auth'),
            objectField(secretField('auth.token'), 'auth'),
            objectField(textField('auth.username'), 'auth'),
            textField('memoryRoot'),
            textField('skillsRoot'),
            textField('defaultBranch'),
            textField('remoteName'),
            booleanField('autoCommit'),
            textField('archiveRoot'),
            numberField('recallTopK', { integer: true, min: 1 }),
            numberField('recallMinScore', { min: 0 }),
            numberField('recallMaxChars', { integer: true, min: 0 }),
            choiceField('privacyMode', ['block', 'redact', 'ask']),
            booleanField('digestEnabled'),
            numberField('digestMaxRecords', { integer: true, min: 0 }),
            numberField('digestMaxChars', { integer: true, min: 0 }),
        ]);
        this.store = this.form.bind(() => this.projection());
    }
    projection() {
        return {
            ...this.form.shell(),
            repoPath: this.form.field('repoPath'),
            repoUrl: this.form.field('repoUrl'),
            authMode: this.form.field('auth.mode'),
            authSshCommand: this.form.field('auth.sshCommand'),
            authTokenEnv: this.form.field('auth.tokenEnv'),
            authToken: this.form.field('auth.token'),
            authUsername: this.form.field('auth.username'),
            memoryRoot: this.form.field('memoryRoot'),
            skillsRoot: this.form.field('skillsRoot'),
            defaultBranch: this.form.field('defaultBranch'),
            remoteName: this.form.field('remoteName'),
            autoCommit: this.form.field('autoCommit'),
            archiveRoot: this.form.field('archiveRoot'),
            recallTopK: this.form.field('recallTopK'),
            recallMinScore: this.form.field('recallMinScore'),
            recallMaxChars: this.form.field('recallMaxChars'),
            privacyMode: this.form.field('privacyMode'),
            digestEnabled: this.form.field('digestEnabled'),
            digestMaxRecords: this.form.field('digestMaxRecords'),
            digestMaxChars: this.form.field('digestMaxChars'),
        };
    }
    /**
     * Build the face the card's slot registration injects.
     * @returns the card's snapshot and its form actions.
     */
    inject() {
        return { hooks: { evolveSettingsCard: this.store }, ...this.form.actions() };
    }
    /**
     * Release the card's scope subscription and bound stores; the slot
     * disposer calls this on teardown.
     */
    dispose() {
        this.form.dispose();
    }
}
/**
 * Render the evolve settings card.
 * @param props - locale copy, the card snapshot, and its form actions.
 * @returns the card.
 */
export function EvolveSettingsCard(props) {
    const { t } = props;
    const state = props.useEvolveSettingsCard(snapshot => snapshot);
    const disabled = !state.writable;
    const fieldProps = {
        overriddenLabel: t('settings.overridden'),
        resetLabel: t('settings.reset'),
        invalidLabel: t('settings.invalidNumber'),
        disabled,
    };
    return (_jsxs(PluginSettingsCard, { t: t, titleKey: "settings.title", descriptionKey: "settings.description", state: state, onSave: props.save, onDiscard: props.discard, alwaysOpen: true, children: [_jsx(ValueField, { id: "settings-evolve-git-repo-path", label: t('field.repoPath'), hint: t('field.repoPath.hint'), ...fieldProps, ...state.repoPath, onEdit: (text) => { props.edit('repoPath', text); }, onReset: () => { props.resetField('repoPath'); } }), _jsx(ValueField, { id: "settings-evolve-git-repo-url", label: t('field.repoUrl'), hint: t('field.repoUrl.hint'), ...fieldProps, ...state.repoUrl, onEdit: (text) => { props.edit('repoUrl', text); }, onReset: () => { props.resetField('repoUrl'); } }), _jsx(ChoiceField, { id: "settings-evolve-git-auth-mode", label: t('field.authMode'), hint: t('field.authMode.hint'), inheritLabel: t('settings.inherit'), ...fieldProps, ...state.authMode, choices: [
                    { value: 'ssh', label: t('field.authMode.ssh') },
                    { value: 'token', label: t('field.authMode.token') },
                ], onEdit: (text) => { props.edit('auth.mode', text); }, onReset: () => { props.resetField('auth.mode'); } }), _jsx(ValueField, { id: "settings-evolve-git-auth-ssh-command", label: t('field.authSshCommand'), hint: t('field.authSshCommand.hint'), ...fieldProps, ...state.authSshCommand, onEdit: (text) => { props.edit('auth.sshCommand', text); }, onReset: () => { props.resetField('auth.sshCommand'); } }), _jsx(ValueField, { id: "settings-evolve-git-auth-token-env", label: t('field.authTokenEnv'), hint: t('field.authTokenEnv.hint'), ...fieldProps, ...state.authTokenEnv, onEdit: (text) => { props.edit('auth.tokenEnv', text); }, onReset: () => { props.resetField('auth.tokenEnv'); } }), _jsx(ValueField, { id: "settings-evolve-git-auth-token", label: t('field.authToken'), hint: t('field.authToken.hint'), ...fieldProps, ...state.authToken, onEdit: (text) => { props.edit('auth.token', text); }, onReset: () => { props.resetField('auth.token'); } }), _jsx(ValueField, { id: "settings-evolve-git-auth-username", label: t('field.authUsername'), hint: t('field.authUsername.hint'), ...fieldProps, ...state.authUsername, onEdit: (text) => { props.edit('auth.username', text); }, onReset: () => { props.resetField('auth.username'); } }), _jsx(ValueField, { id: "settings-evolve-git-memory-root", label: t('field.memoryRoot'), hint: t('field.memoryRoot.hint'), ...fieldProps, ...state.memoryRoot, onEdit: (text) => { props.edit('memoryRoot', text); }, onReset: () => { props.resetField('memoryRoot'); } }), _jsx(ValueField, { id: "settings-evolve-git-skills-root", label: t('field.skillsRoot'), hint: t('field.skillsRoot.hint'), ...fieldProps, ...state.skillsRoot, onEdit: (text) => { props.edit('skillsRoot', text); }, onReset: () => { props.resetField('skillsRoot'); } }), _jsx(ValueField, { id: "settings-evolve-git-default-branch", label: t('field.defaultBranch'), hint: t('field.defaultBranch.hint'), ...fieldProps, ...state.defaultBranch, onEdit: (text) => { props.edit('defaultBranch', text); }, onReset: () => { props.resetField('defaultBranch'); } }), _jsx(ValueField, { id: "settings-evolve-git-remote-name", label: t('field.remoteName'), hint: t('field.remoteName.hint'), ...fieldProps, ...state.remoteName, onEdit: (text) => { props.edit('remoteName', text); }, onReset: () => { props.resetField('remoteName'); } }), _jsx(BooleanField, { id: "settings-evolve-git-auto-commit", label: t('field.autoCommit'), hint: t('field.autoCommit.hint'), inheritLabel: t('settings.inherit'), onLabel: t('settings.on'), offLabel: t('settings.off'), ...fieldProps, ...state.autoCommit, onEdit: (text) => { props.edit('autoCommit', text); }, onReset: () => { props.resetField('autoCommit'); } }), _jsx(ValueField, { id: "settings-evolve-git-archive-root", label: t('field.archiveRoot'), hint: t('field.archiveRoot.hint'), ...fieldProps, ...state.archiveRoot, onEdit: (text) => { props.edit('archiveRoot', text); }, onReset: () => { props.resetField('archiveRoot'); } }), _jsx(ValueField, { id: "settings-evolve-git-recall-top-k", label: t('field.recallTopK'), hint: t('field.recallTopK.hint'), ...fieldProps, ...state.recallTopK, onEdit: (text) => { props.edit('recallTopK', text); }, onReset: () => { props.resetField('recallTopK'); } }), _jsx(ValueField, { id: "settings-evolve-git-recall-min-score", label: t('field.recallMinScore'), hint: t('field.recallMinScore.hint'), ...fieldProps, ...state.recallMinScore, onEdit: (text) => { props.edit('recallMinScore', text); }, onReset: () => { props.resetField('recallMinScore'); } }), _jsx(ValueField, { id: "settings-evolve-git-recall-max-chars", label: t('field.recallMaxChars'), hint: t('field.recallMaxChars.hint'), ...fieldProps, ...state.recallMaxChars, onEdit: (text) => { props.edit('recallMaxChars', text); }, onReset: () => { props.resetField('recallMaxChars'); } }), _jsx(ChoiceField, { id: "settings-evolve-git-privacy-mode", label: t('field.privacyMode'), hint: t('field.privacyMode.hint'), inheritLabel: t('settings.inherit'), ...fieldProps, ...state.privacyMode, choices: [
                    { value: 'block', label: t('field.privacyMode.block') },
                    { value: 'redact', label: t('field.privacyMode.redact') },
                    { value: 'ask', label: t('field.privacyMode.ask') },
                ], onEdit: (text) => { props.edit('privacyMode', text); }, onReset: () => { props.resetField('privacyMode'); } }), _jsx(BooleanField, { id: "settings-evolve-git-digest-enabled", label: t('field.digestEnabled'), hint: t('field.digestEnabled.hint'), inheritLabel: t('settings.inherit'), onLabel: t('settings.on'), offLabel: t('settings.off'), ...fieldProps, ...state.digestEnabled, onEdit: (text) => { props.edit('digestEnabled', text); }, onReset: () => { props.resetField('digestEnabled'); } }), _jsx(ValueField, { id: "settings-evolve-git-digest-max-records", label: t('field.digestMaxRecords'), hint: t('field.digestMaxRecords.hint'), ...fieldProps, ...state.digestMaxRecords, onEdit: (text) => { props.edit('digestMaxRecords', text); }, onReset: () => { props.resetField('digestMaxRecords'); } }), _jsx(ValueField, { id: "settings-evolve-git-digest-max-chars", label: t('field.digestMaxChars'), hint: t('field.digestMaxChars.hint'), ...fieldProps, ...state.digestMaxChars, onEdit: (text) => { props.edit('digestMaxChars', text); }, onReset: () => { props.resetField('digestMaxChars'); } }), _jsx(ConfigFileEditor, { t: t })] }));
}
/** Render the evolve settings card as a first-level settings page. */
export function EvolveSettingsSection(props) {
    const { t, useEvolveSettingsCard, save, discard, edit, resetField } = props;
    return (_jsx("ul", { className: sectionCss.sectionList, children: _jsx(EvolveSettingsCard, { t: t, useEvolveSettingsCard: useEvolveSettingsCard, save: save, discard: discard, edit: edit, resetField: resetField }) }));
}
