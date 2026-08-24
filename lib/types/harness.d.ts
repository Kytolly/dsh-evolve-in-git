import type { BranchesView, HelpView, MemoryKind, RememberView, StatusView } from './types.js';
export declare const EVOLVE_TOOL_NAMES: readonly ["evolve_connect", "evolve_status", "evolve_remember", "evolve_branches", "evolve_help"];
export declare const EVOLVE_COMMAND = "/evolve";
export declare const EVOLVE_USAGE: readonly ["/evolve connect", "/evolve status", "/evolve branches", "/evolve remember <kind> <title> :: <content>", "/evolve help"];
export declare const EVOLVE_SAFETY: readonly ["connect verifies the local checkout, remote URL, and auth before reporting success", "remember writes only to the configured memory repository", "v0.1.2 does not expose branch mutation or rollback through the command surface"];
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
    };
} | {
    kind: 'invalid';
    message: string;
};
export declare function parseEvolveCommand(rawInput: string): ParsedEvolveCommand;
export declare function renderHelpView(): HelpView;
export declare function renderHelpText(): string;
export declare function renderStatusText(title: string, view: StatusView): string;
export declare function renderBranchesText(view: BranchesView): string;
export declare function renderRememberText(view: RememberView): string;
export declare function userFacingError(error: unknown): string;
