/**
 * Plugin default configuration, shared by the host runtime (schema defaults /
 * resolveConfig) and the config-file route (the browser form's fallback
 * layer). No personal repository URLs ship here — the repoUrl default is a
 * placeholder every user must replace with their own repository.
 * @module dsh-evolve-in-git/defaults
 */
export declare const DEFAULT_MEMORY_ROOT = ".dsh-evolve/memory";
export declare const DEFAULT_SKILLS_ROOT = ".dsh-evolve/skills";
export declare const DEFAULT_BRANCH = "main";
export declare const DEFAULT_REMOTE = "origin";
export declare const DEFAULT_REPO_URL = "https://github.com/<your-github-username>/<your-memory-repo>.git";
export declare const DEFAULT_REPO_PATH: string;
export declare const DEFAULT_AUTH: {
    mode: "ssh";
    sshCommand: string;
    tokenEnv: string;
    token: string;
    username: string;
};
/** The plugin's full default configuration (mirrors the Config schema defaults). */
export declare const DEFAULT_CONFIG: {
    readonly repoPath: string;
    readonly repoUrl: "https://github.com/<your-github-username>/<your-memory-repo>.git";
    readonly auth: {
        mode: "ssh";
        sshCommand: string;
        tokenEnv: string;
        token: string;
        username: string;
    };
    readonly memoryRoot: ".dsh-evolve/memory";
    readonly skillsRoot: ".dsh-evolve/skills";
    readonly defaultBranch: "main";
    readonly remoteName: "origin";
    readonly autoCommit: true;
};
