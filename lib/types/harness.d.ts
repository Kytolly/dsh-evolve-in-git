import type { BranchesView, HelpView, MemoryKind, RememberView, StatusView } from './types.js';
export declare const EVOLVE_TOOL_NAMES: readonly ["evolve_connect", "evolve_status", "evolve_remember", "evolve_update", "evolve_forget", "evolve_restore", "evolve_show", "evolve_export", "evolve_branches", "evolve_branch_switch", "evolve_branch_diff", "evolve_skill_draft", "evolve_skill_list", "evolve_skill_promote", "evolve_skill_demote", "evolve_rollback", "evolve_conflicts", "evolve_resolve", "evolve_timeline", "evolve_recall", "evolve_help", "memory_search", "memory_save", "memory_update", "memory_delete"];
export declare const EVOLVE_COMMAND = "/evolve";
export declare const EVOLVE_USAGE: readonly ["/evolve connect", "/evolve status", "/evolve branches", "/evolve remember <kind> <title> [--expires <iso>] :: <content>", "/evolve update <id> [--merge] :: <content>", "/evolve forget <id>", "/evolve restore <id>", "/evolve config show|open|refresh|set <key> <value>", "/evolve skill draft <kind> <title> :: <content>", "/evolve skill list", "/evolve skill promote <name>", "/evolve skill demote <name>", "/evolve skill sync", "/evolve rollback <ref> [--dry]", "/evolve conflicts", "/evolve resolve <path> <ours|theirs|both>", "/evolve timeline", "/evolve search <q> [--kind k] [--tag t]", "/evolve branch switch <name>", "/evolve branch diff <a> [b]", "/evolve branch revert <ref>", "/evolve help"];
export declare const EVOLVE_SAFETY: readonly ["connect verifies the local checkout, remote URL, and auth before reporting success", "remember/update/forget/restore write only to the configured memory repository", "rollback only reverts commits that touch memory/skills roots", "privacyMode block/redact applies before memory writes"];
export type ParsedEvolveCommand = {
    kind: 'connect';
} | {
    kind: 'status';
} | {
    kind: 'branches';
} | {
    kind: 'help';
} | {
    kind: 'remember';
    record: {
        kind: MemoryKind;
        title: string;
        content: string;
        expiresAt?: string;
    };
} | {
    kind: 'invalid';
    message: string;
};
/** Strip a leading '/evolve' prefix when the host passes the full command text. */
export declare function normalizeEvolveCommand(rawInput: string): string;
export declare function parseEvolveCommand(rawInput: string): ParsedEvolveCommand;
export declare function renderHelpView(): HelpView;
export declare function renderHelpText(): string;
export declare function renderStatusText(title: string, view: StatusView): string;
export declare function renderBranchesText(view: BranchesView): string;
export declare function renderRememberText(view: RememberView): string;
export declare function userFacingError(error: unknown): string;
