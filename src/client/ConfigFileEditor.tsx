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

import { useCallback, useEffect, useState } from 'react'
import { CONFIG_SAVED_EVENT } from './config-file-scope.ts'
import type { EvolveClientKey } from './locales.ts'
import css from './settings-card.module.css'

/** Load/save outcome of the editor. */
type Status = 'idle' | 'loading' | 'saving' | 'saved' | 'error'

interface ConfigFileEditorProps {
  /** Locale reader for this card's copy. */
  t: (key: EvolveClientKey, params?: Record<string, string | number>) => string
}

/** Wire shape of the config-file route responses. */
interface ConfigFileResponse {
  ok?: boolean
  error?: string
  path?: string
  raw?: string
  exists?: boolean
}

/** Load the config document text. */
async function fetchConfig(): Promise<ConfigFileResponse> {
  const response = await fetch('/api/evolve-git/config')
  const body = await response.json() as ConfigFileResponse
  if (!response.ok || body.ok !== true) throw new Error(body.error ?? 'load failed')
  return body
}

/** Save the config document text. */
async function saveConfig(raw: string): Promise<ConfigFileResponse> {
  const response = await fetch('/api/evolve-git/config', {
    method: 'PUT',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ raw }),
  })
  const body = await response.json() as ConfigFileResponse
  if (!response.ok || body.ok !== true) throw new Error(body.error ?? 'save failed')
  return body
}

/**
 * Render the config-file editor.
 * @param props - locale copy.
 * @returns the editor.
 */
export function ConfigFileEditor(props: ConfigFileEditorProps) {
  const { t } = props
  const [open, setOpen] = useState(false)
  const [status, setStatus] = useState<Status>('idle')
  const [text, setText] = useState('')
  const [path, setPath] = useState('')
  const [message, setMessage] = useState('')

  const load = useCallback(() => {
    setStatus('loading')
    void fetchConfig()
      .then((body) => {
        setText(body.raw ?? '')
        setPath(body.path ?? '')
        setStatus('idle')
        setMessage('')
      })
      .catch((error: unknown) => {
        setStatus('error')
        setMessage(error instanceof Error ? error.message : String(error))
      })
  }, [])

  // Load once when the editor is first expanded.
  useEffect(() => {
    if (open && status === 'idle' && text === '' && path === '') load()
  }, [open, status, text, path, load])

  const save = useCallback(() => {
    setStatus('saving')
    void saveConfig(text)
      .then((body) => {
        setPath(body.path ?? path)
        setStatus('saved')
        setMessage('')
        // The settings form reads the same document; tell it to reload.
        window.dispatchEvent(new CustomEvent(CONFIG_SAVED_EVENT))
      })
      .catch((error: unknown) => {
        setStatus('error')
        setMessage(error instanceof Error ? error.message : String(error))
      })
  }, [text, path])

  const busy = status === 'loading' || status === 'saving'
  return (
    <div className={css.configFile}>
      <button
        type="button"
        className={css.configFileHeader}
        aria-expanded={open}
        onClick={() => { setOpen(!open) }}
      >
        <span className={css.headText}>
          <span className={css.name}>{t('configFile.title')}</span>
          <span className={css.description}>{t('configFile.description')}</span>
        </span>
        <svg
          width="14"
          height="14"
          viewBox="0 0 14 14"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className={open ? `${css.chevron} ${css.chevronOpen}` : css.chevron}
          aria-hidden="true"
        >
          <path
            d="M11.8486 5.5L11.4238 5.92383L8.69727 8.65137C8.44157 8.90706 8.21562 9.13382 8.01172 9.29785C7.79912 9.46883 7.55595 9.61756 7.25 9.66602C7.08435 9.69222 6.91565 9.69222 6.75 9.66602C6.44405 9.61756 6.20088 9.46883 5.98828 9.29785C5.78438 9.13382 5.55843 8.90706 5.30273 8.65137L2.57617 5.92383L2.15137 5.5L3 4.65137L3.42383 5.07617L6.15137 7.80273C6.42595 8.07732 6.59876 8.24849 6.74023 8.3623C6.87291 8.46904 6.92272 8.47813 6.9375 8.48047C6.97895 8.48703 7.02105 8.48703 7.0625 8.48047C7.07728 8.47813 7.12709 8.46904 7.25977 8.3623C7.40124 8.24849 7.57405 8.07732 7.84863 7.80273L10.5762 5.07617L11 4.65137L11.8486 5.5Z"
            fill="currentColor"
          />
        </svg>
      </button>
      {open
        ? (
          <div className={css.configFileBody}>
            {status === 'loading'
              ? <p className={css.hint} role="status">{t('configFile.loading')}</p>
              : null}
            <textarea
              className={css.textarea}
              rows={10}
              spellCheck={false}
              aria-label={t('configFile.title')}
              value={text}
              disabled={busy}
              onChange={(event) => { setText(event.target.value); if (status === 'saved' || status === 'error') setStatus('idle') }}
            />
            <p className={css.configFilePath} title={path}>{path === '' ? t('configFile.empty') : path}</p>
            {status === 'saved'
              ? <p className={css.saved} role="status">{t('configFile.saved', { path: path === '' ? '?' : path })}</p>
              : null}
            {status === 'error'
              ? <p className={css.failed} role="status">{t('configFile.error', { error: message })}</p>
              : null}
            <div className={css.footer}>
              <button
                type="button"
                className={css.discard}
                disabled={busy}
                onClick={load}
              >
                {t('configFile.reload')}
              </button>
              <button
                type="button"
                className={css.save}
                disabled={busy}
                onClick={save}
              >
                {status === 'saving' ? t('configFile.saving') : t('configFile.save')}
              </button>
            </div>
          </div>
        )
        : null}
    </div>
  )
}