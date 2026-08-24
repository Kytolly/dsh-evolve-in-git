export type MemoryKind = 'session' | 'skill' | 'warning' | 'persona' | 'note';
export interface MemoryRecordInput {
    kind: MemoryKind;
    title: string;
    content: string;
    tags?: readonly string[];
    source?: string;
    branch?: string;
}
export interface MemoryRecord extends MemoryRecordInput {
    createdAt: string;
    path: string;
}
export interface SkillDraftInput {
    name: string;
    description: string;
    whenToUse: string;
    instructions: string;
    tags?: readonly string[];
}
export interface SkillDraft extends SkillDraftInput {
    path: string;
    content: string;
}
export interface EvolutionSuggestion {
    question: string;
    rationale: string;
    branchName: string;
    draft: SkillDraft;
}
export interface CommittedArtifact {
    path: string;
    branch: string;
    commit: string | undefined;
    message: string;
}
export interface GitStatus {
    branch: string;
    head: string | undefined;
    ahead: number;
    behind: number;
    clean: boolean;
    changedFiles: string[];
}
export interface StatusView {
    repoPath: string;
    repoUrl: string;
    remoteName: string;
    verified: true;
    branch: string;
    head: string | null;
    ahead: number;
    behind: number;
    clean: boolean;
    changedFiles: string[];
}
export interface BranchesView {
    repoPath: string;
    repoUrl: string;
    remoteName: string;
    currentBranch: string;
    branches: string[];
}
export interface RememberView {
    repoPath: string;
    repoUrl: string;
    path: string;
    branch: string;
    commit: string | null;
    message: string;
    kind: MemoryKind;
    title: string;
    createdAt: string;
    source: string | null;
    tags: string[];
}
export interface HelpView {
    command: string;
    tools: string[];
    usage: string[];
    safety: string[];
}
export interface ResolvedConfig {
    repoPath: string;
    repoUrl: string;
    auth: GitAuthConfig;
    memoryRoot: string;
    skillsRoot: string;
    defaultBranch: string;
    remoteName: string;
    autoCommit: boolean;
}
export interface GitAuthConfig {
    mode: 'ssh' | 'token';
    sshCommand?: string;
    tokenEnv?: string;
    token?: string;
    username?: string;
}
