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

import type { ReactNode } from 'react'
import type { InjectFace, PropsLocale, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import type { SettingsScope, SnapshotStore } from '@deepseek-ai/dsh-client-runtime/client'
// Type-only: pulls the settings-surface SlotMap merge (the 'settings.section' entry).
import type {} from '@deepseek-ai/dsh-client-ui-settings/client'
import type { EvolveClientKey } from './locales.ts'
import { PluginSettingsCard, ValueField, BooleanField, ChoiceField } from './PluginSettingsCard.tsx'
import { ConfigFileEditor } from './ConfigFileEditor.tsx'
import { CardForm, booleanField, choiceField, objectField, secretField, textField, type CardActions, type CardShell, type FieldState as CardFieldState } from './settings-form.ts'
import sectionCss from './settings-section.module.css'

/** The evolve-git settings fields this card edits (the namespace's full schema). */
export interface EvolveSettings {
  /** Local Git checkout where memory and skills are written. */
  repoPath?: string
  /** Remote memory repository URL. */
  repoUrl?: string
  /** Git auth settings for private access. */
  auth?: {
    mode?: 'ssh' | 'token'
    sshCommand?: string
    tokenEnv?: string
    token?: string
    username?: string
  }
  /** Where memory records are written, relative to the repo. */
  memoryRoot?: string
  /** Where skill drafts are written, relative to the repo. */
  skillsRoot?: string
  /** Branch to evolve from when creating new branches. */
  defaultBranch?: string
  /** Remote to fetch and push. */
  remoteName?: string
  /** Whether writes auto-commit. */
  autoCommit?: boolean
}

/** What the evolve settings card renders. */
export interface EvolveSettingsCardState extends CardShell {
  repoPath: CardFieldState
  repoUrl: CardFieldState
  authMode: CardFieldState
  authSshCommand: CardFieldState
  authTokenEnv: CardFieldState
  authToken: CardFieldState
  authUsername: CardFieldState
  memoryRoot: CardFieldState
  skillsRoot: CardFieldState
  defaultBranch: CardFieldState
  remoteName: CardFieldState
  autoCommit: CardFieldState
}

/** The registration-side face the card's slot entry injects. */
export interface EvolveSettingsCardFace extends CardActions {
  hooks: {
    /** Card snapshot bound by the renderer as useEvolveSettingsCard. */
    evolveSettingsCard: SnapshotStore<EvolveSettingsCardState>
  }
}

/** Bridges the 'evolve-git' scope onto the card's staged form. */
export class EvolveSettingsCardController {
  private readonly form: CardForm<EvolveSettings>
  private readonly store: SnapshotStore<EvolveSettingsCardState>

  /** @param scope - the bound settings scope for the 'evolve-git' namespace. */
  constructor(scope: SettingsScope<EvolveSettings>) {
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
    ])
    this.store = this.form.bind(() => this.projection())
  }

  private projection(): EvolveSettingsCardState {
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
    }
  }

  /**
   * Build the face the card's slot registration injects.
   * @returns the card's snapshot and its form actions.
   */
  inject(): EvolveSettingsCardFace {
    return { hooks: { evolveSettingsCard: this.store }, ...this.form.actions() }
  }

  /**
   * Release the card's scope subscription and bound stores; the slot
   * disposer calls this on teardown.
   */
  dispose(): void {
    this.form.dispose()
  }
}

/** Props the renderer binds for the evolve settings card. */
export type EvolveSettingsCardProps =
  PropsLocale<'evolve-git'>
  & InjectFace<EvolveSettingsCardFace>

/**
 * Render the evolve settings card.
 * @param props - locale copy, the card snapshot, and its form actions.
 * @returns the card.
 */
export function EvolveSettingsCard(props: EvolveSettingsCardProps) {
  const { t } = props
  const state = props.useEvolveSettingsCard(snapshot => snapshot)
  const disabled = !state.writable
  const fieldProps = {
    overriddenLabel: t('settings.overridden'),
    resetLabel: t('settings.reset'),
    invalidLabel: t('settings.invalidNumber'),
    disabled,
  }
  return (
    <PluginSettingsCard
      t={t}
      titleKey="settings.title"
      descriptionKey="settings.description"
      state={state}
      onSave={props.save}
      onDiscard={props.discard}
      alwaysOpen
    >
      <ValueField
        id="settings-evolve-git-repo-path"
        label={t('field.repoPath')}
        hint={t('field.repoPath.hint')}
        {...fieldProps}
        {...state.repoPath}
        onEdit={(text) => { props.edit('repoPath', text) }}
        onReset={() => { props.resetField('repoPath') }}
      />
      <ValueField
        id="settings-evolve-git-repo-url"
        label={t('field.repoUrl')}
        hint={t('field.repoUrl.hint')}
        {...fieldProps}
        {...state.repoUrl}
        onEdit={(text) => { props.edit('repoUrl', text) }}
        onReset={() => { props.resetField('repoUrl') }}
      />
      <ChoiceField
        id="settings-evolve-git-auth-mode"
        label={t('field.authMode')}
        hint={t('field.authMode.hint')}
        inheritLabel={t('settings.inherit')}
        {...fieldProps}
        {...state.authMode}
        choices={[
          { value: 'ssh', label: t('field.authMode.ssh') },
          { value: 'token', label: t('field.authMode.token') },
        ]}
        onEdit={(text) => { props.edit('auth.mode', text) }}
        onReset={() => { props.resetField('auth.mode') }}
      />
      <ValueField
        id="settings-evolve-git-auth-ssh-command"
        label={t('field.authSshCommand')}
        hint={t('field.authSshCommand.hint')}
        {...fieldProps}
        {...state.authSshCommand}
        onEdit={(text) => { props.edit('auth.sshCommand', text) }}
        onReset={() => { props.resetField('auth.sshCommand') }}
      />
      <ValueField
        id="settings-evolve-git-auth-token-env"
        label={t('field.authTokenEnv')}
        hint={t('field.authTokenEnv.hint')}
        {...fieldProps}
        {...state.authTokenEnv}
        onEdit={(text) => { props.edit('auth.tokenEnv', text) }}
        onReset={() => { props.resetField('auth.tokenEnv') }}
      />
      <ValueField
        id="settings-evolve-git-auth-token"
        label={t('field.authToken')}
        hint={t('field.authToken.hint')}
        {...fieldProps}
        {...state.authToken}
        onEdit={(text) => { props.edit('auth.token', text) }}
        onReset={() => { props.resetField('auth.token') }}
      />
      <ValueField
        id="settings-evolve-git-auth-username"
        label={t('field.authUsername')}
        hint={t('field.authUsername.hint')}
        {...fieldProps}
        {...state.authUsername}
        onEdit={(text) => { props.edit('auth.username', text) }}
        onReset={() => { props.resetField('auth.username') }}
      />
      <ValueField
        id="settings-evolve-git-memory-root"
        label={t('field.memoryRoot')}
        hint={t('field.memoryRoot.hint')}
        {...fieldProps}
        {...state.memoryRoot}
        onEdit={(text) => { props.edit('memoryRoot', text) }}
        onReset={() => { props.resetField('memoryRoot') }}
      />
      <ValueField
        id="settings-evolve-git-skills-root"
        label={t('field.skillsRoot')}
        hint={t('field.skillsRoot.hint')}
        {...fieldProps}
        {...state.skillsRoot}
        onEdit={(text) => { props.edit('skillsRoot', text) }}
        onReset={() => { props.resetField('skillsRoot') }}
      />
      <ValueField
        id="settings-evolve-git-default-branch"
        label={t('field.defaultBranch')}
        hint={t('field.defaultBranch.hint')}
        {...fieldProps}
        {...state.defaultBranch}
        onEdit={(text) => { props.edit('defaultBranch', text) }}
        onReset={() => { props.resetField('defaultBranch') }}
      />
      <ValueField
        id="settings-evolve-git-remote-name"
        label={t('field.remoteName')}
        hint={t('field.remoteName.hint')}
        {...fieldProps}
        {...state.remoteName}
        onEdit={(text) => { props.edit('remoteName', text) }}
        onReset={() => { props.resetField('remoteName') }}
      />
      <BooleanField
        id="settings-evolve-git-auto-commit"
        label={t('field.autoCommit')}
        hint={t('field.autoCommit.hint')}
        inheritLabel={t('settings.inherit')}
        onLabel={t('settings.on')}
        offLabel={t('settings.off')}
        {...fieldProps}
        {...state.autoCommit}
        onEdit={(text) => { props.edit('autoCommit', text) }}
        onReset={() => { props.resetField('autoCommit') }}
      />
      <ConfigFileEditor t={t} />
    </PluginSettingsCard>
  )
}

/** Props the settings section binds for the evolve card page. */
export type EvolveSettingsSectionProps =
  PropsRuntime<'settings.section'>
  & PropsLocale<'evolve-git'>
  & InjectFace<EvolveSettingsCardFace>

/** Render the evolve settings card as a first-level settings page. */
export function EvolveSettingsSection(props: EvolveSettingsSectionProps): ReactNode {
  const { t, useEvolveSettingsCard, save, discard, edit, resetField } = props
  return (
    <ul className={sectionCss.sectionList}>
      <EvolveSettingsCard t={t} useEvolveSettingsCard={useEvolveSettingsCard} save={save} discard={discard} edit={edit} resetField={resetField} />
    </ul>
  )
}