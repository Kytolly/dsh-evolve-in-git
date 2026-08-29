import type { ResolvedConfig } from './types.js';
/** A discovered skill (draft or enabled), identified by its frontmatter. */
export interface SkillDraftSummary {
    name: string;
    description: string;
    /** Absolute path to the SKILL.md inside the memory repo. */
    path: string;
}
/** A skill after a move (promote/demote): where it came from and where it lives now. */
export interface MovedSkill extends SkillDraftSummary {
    /** The skill's new location (promote: enabled/, demote: drafts/). */
    targetPath: string;
}
export type PromotedSkill = MovedSkill;
export type DemotedSkill = MovedSkill;
/** A bundled skill materialized into the repo's drafts root. */
export interface SyncedSkill {
    name: string;
    targetPath: string;
    action: 'created' | 'updated' | 'skipped';
}
/** Kebab-case skill-name validation (same grammar as the host skill registry). */
export declare function isSkillName(name: string): boolean;
/** List promotable skill drafts under <skillsRoot>/drafts. */
export declare function listSkillDrafts(config: ResolvedConfig): SkillDraftSummary[];
/** List enabled (discoverable) skills under <skillsRoot>/enabled. */
export declare function listEnabledSkills(config: ResolvedConfig): SkillDraftSummary[];
/** Promote a draft: git mv drafts/<name> -> enabled/<name> (discoverable). */
export declare function promoteSkillDraft(config: ResolvedConfig, name: string): PromotedSkill;
/** Demote an enabled skill: git mv enabled/<name> -> drafts/<name> (reversible). */
export declare function demoteSkillDraft(config: ResolvedConfig, name: string): DemotedSkill;
/**
 * Materialize the skills shipped in this package (skills/<name>/SKILL.md) into
 * the repo's <skillsRoot>/drafts so they can be reviewed and promoted. Only runs
 * when the repo is already a Git checkout (the constructor calls this
 * best-effort, so a not-yet-connected repo is left untouched). force=false only
 * creates missing drafts; force=true overwrites them with the bundled copy.
 * @returns one summary per bundled skill, in discovery order.
 */
export declare function syncBundledSkills(config: ResolvedConfig, force?: boolean): SyncedSkill[];
