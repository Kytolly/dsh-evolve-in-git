/**
 * Privacy gate and user controls for dsh-evolve-in-git.
 *
 * Pure helpers (no DSH, no Git, no filesystem): sensitive-content detection,
 * sensitivity classification, redaction, and export rendering/filtering. The
 * MemoryCore and the DSH adapter compose these into evolve_show/evolve_export
 * and the write-time sensitivity field.
 * @module dsh-evolve-in-git/privacy
 */
export type SensitivityLevel = 'public' | 'internal' | 'confidential' | 'secret';
/** One detected sensitive fragment. */
export interface SensitiveMatch {
    type: string;
    level: 'confidential' | 'secret';
    value: string;
}
export interface SensitivePattern {
    type: string;
    level: 'confidential' | 'secret';
    pattern: RegExp;
}
/** MVP detection patterns: emails, phones, IDs, cards, keys, tokens, private keys, secret keywords. */
export declare const SENSITIVE_PATTERNS: readonly SensitivePattern[];
/** Detect every sensitive fragment in a string (first match per pattern). */
export declare function detectSensitive(content: string): SensitiveMatch[];
/** Classify a piece of content into its most sensitive level (public by default). */
export declare function classifySensitivity(content: string, base?: SensitivityLevel): SensitivityLevel;
/** Replace every detected sensitive fragment with a redaction marker (global). */
export declare function redactSensitive(content: string): string;
/** Numeric rank of a sensitivity level (unknown/empty levels rank as secret, fail-closed). */
export declare function sensitivityRank(level: string | undefined): number;
export interface ExportOptions {
    format?: 'json' | 'markdown';
    maxSensitivity?: SensitivityLevel;
}
/** Keep only records whose sensitivity is no more sensitive than max. */
export declare function filterBySensitivity<T extends {
    sensitivity: string | undefined;
}>(records: readonly T[], max: SensitivityLevel): T[];
/** Find one record by its stable id. */
export declare function findById<T extends {
    id: string | undefined;
}>(records: readonly T[], id: string): T | undefined;
interface ExportableRecord {
    kind: string | undefined;
    title: string | undefined;
    content: string;
    tags: string[];
    createdAt: string | undefined;
    sensitivity: string | undefined;
    source: string | undefined;
}
/** Render records as JSON text or as frontmatter-backed Markdown. */
export declare function renderExport(records: readonly ExportableRecord[], format: 'json' | 'markdown'): string;
export {};
