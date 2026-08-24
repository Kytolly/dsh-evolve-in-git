import type { EvolutionSuggestion, MemoryRecordInput, SkillDraft, SkillDraftInput } from './types.js';
export declare function slugify(value: string): string;
export declare function sanitizeSegment(value: string): string;
export declare function shouldOfferSkillPromotion(record: MemoryRecordInput): boolean;
export declare function branchNameForRecord(record: MemoryRecordInput): string;
export declare function draftSkillFromRecord(record: MemoryRecordInput): SkillDraftInput;
export declare function renderSkillDraft(draft: SkillDraftInput): SkillDraft;
export declare function suggestEvolution(record: MemoryRecordInput): EvolutionSuggestion;
export declare function memoryPreview(record: MemoryRecordInput): string;
