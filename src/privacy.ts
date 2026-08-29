/**
 * Privacy gate and user controls for dsh-evolve-in-git.
 *
 * Pure helpers (no DSH, no Git, no filesystem): sensitive-content detection,
 * sensitivity classification, redaction, and export rendering/filtering. The
 * MemoryCore and the DSH adapter compose these into evolve_show/evolve_export
 * and the write-time sensitivity field.
 * @module dsh-evolve-in-git/privacy
 */

export type SensitivityLevel = 'public' | 'internal' | 'confidential' | 'secret'

/** One detected sensitive fragment. */
export interface SensitiveMatch {
  type: string
  level: 'confidential' | 'secret'
  value: string
}

export interface SensitivePattern {
  type: string
  level: 'confidential' | 'secret'
  pattern: RegExp
}

/** MVP detection patterns: emails, phones, IDs, cards, keys, tokens, private keys, secret keywords. */
export const SENSITIVE_PATTERNS: readonly SensitivePattern[] = [
  { type: 'email', level: 'confidential', pattern: /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/ },
  { type: 'phone', level: 'confidential', pattern: /(?:\+?\d{1,3}[-.\s]?)?(?:\(\d{2,4}\)|\d{3,4})[-.\s]?\d{3,4}[-.\s]?\d{3,4}/ },
  { type: 'id-card', level: 'confidential', pattern: /\b\d{17}[\dXx]\b|\b\d{15}\b/ },
  { type: 'credit-card', level: 'confidential', pattern: /\b(?:\d[ -]?){13,16}\b/ },
  { type: 'aws-access-key', level: 'secret', pattern: /\bAKIA[0-9A-Z]{16}\b/ },
  { type: 'github-token', level: 'secret', pattern: /\bghp_[A-Za-z0-9]{20,}\b|\bgithub_pat_[A-Za-z0-9_]{20,}\b/ },
  { type: 'private-key', level: 'secret', pattern: /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/ },
  { type: 'secret-keyword', level: 'secret', pattern: /\b(?:password|passwd|pwd|secret|token|api[_-]?key)\b\s*[:=]\s*\S+/i },
]

/** Detect every sensitive fragment in a string (first match per pattern). */
export function detectSensitive(content: string): SensitiveMatch[] {
  const matches: SensitiveMatch[] = []
  for (const { type, level, pattern } of SENSITIVE_PATTERNS) {
    const found = content.match(pattern)
    if (found !== null) matches.push({ type, level, value: found[0] })
  }
  return matches
}

/** Classify a piece of content into its most sensitive level (public by default). */
export function classifySensitivity(content: string, base: SensitivityLevel = 'public'): SensitivityLevel {
  const matches = detectSensitive(content)
  if (matches.some((match) => match.level === 'secret')) return 'secret'
  if (matches.some((match) => match.level === 'confidential')) return 'confidential'
  return base
}

/** Replace every detected sensitive fragment with a redaction marker (global). */
export function redactSensitive(content: string): string {
  let out = content
  for (const { pattern } of SENSITIVE_PATTERNS) {
    // Patterns are declared without /g, so compile a global variant here to
    // redact every occurrence of each sensitive type, not only the first.
    const flags = pattern.flags.includes('g') ? pattern.flags : pattern.flags + 'g'
    out = out.replace(new RegExp(pattern.source, flags), '<REDACTED>')
  }
  return out
}

const SENSITIVITY_ORDER: readonly SensitivityLevel[] = ['public', 'internal', 'confidential', 'secret']

/** Numeric rank of a sensitivity level (unknown/empty levels rank as secret, fail-closed). */
export function sensitivityRank(level: string | undefined): number {
  const index = SENSITIVITY_ORDER.indexOf(level as SensitivityLevel)
  return index === -1 ? SENSITIVITY_ORDER.indexOf('secret') : index
}

export interface ExportOptions {
  format?: 'json' | 'markdown'
  maxSensitivity?: SensitivityLevel
}

/** Keep only records whose sensitivity is no more sensitive than max. */
export function filterBySensitivity<T extends { sensitivity: string | undefined }>(records: readonly T[], max: SensitivityLevel): T[] {
  const ceiling = sensitivityRank(max)
  return records.filter((record) => sensitivityRank(record.sensitivity) <= ceiling)
}

/** Find one record by its stable id. */
export function findById<T extends { id: string | undefined }>(records: readonly T[], id: string): T | undefined {
  return records.find((record) => record.id === id)
}

interface ExportableRecord {
  kind: string | undefined
  title: string | undefined
  content: string
  tags: string[]
  createdAt: string | undefined
  sensitivity: string | undefined
  source: string | undefined
}

/** Render records as JSON text or as frontmatter-backed Markdown. */
export function renderExport(records: readonly ExportableRecord[], format: 'json' | 'markdown'): string {
  if (format === 'markdown') {
    return records.map((record) => {
      const fm = [
        '---',
        'kind: ' + JSON.stringify(record.kind ?? ''),
        'title: ' + JSON.stringify(record.title ?? ''),
        'sensitivity: ' + JSON.stringify(record.sensitivity ?? 'public'),
        'createdAt: ' + JSON.stringify(record.createdAt ?? ''),
      ].join('\n')
      return fm + '\n---\n\n' + record.content.trim()
    }).join('\n\n')
  }
  return JSON.stringify(records, null, 2)
}
