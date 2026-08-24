/** The plugin config shape shared with the runtime (mirrors Config in index). */
export interface ConfigFile {
    repoPath?: string;
    repoUrl?: string;
    auth?: {
        mode?: 'ssh' | 'token';
        sshCommand?: string;
        tokenEnv?: string;
        token?: string;
        username?: string;
    };
    memoryRoot?: string;
    skillsRoot?: string;
    defaultBranch?: string;
    remoteName?: string;
    autoCommit?: boolean;
}
/** Path to the user-facing config file. */
export declare function configFilePath(): string;
/** Read the config file if it exists; return an empty object otherwise. */
export declare function readConfigFile(): ConfigFile;
/** Persist a whole config object to the config file. */
export declare function writeConfigFile(config: ConfigFile): void;
/**
 * Merge Cordis config with the on-disk file. The file wins for any key it
 * provides; nested auth is replaced wholesale rather than deep-merged.
 */
export declare function mergeConfig(cordis: ConfigFile, file: ConfigFile): ConfigFile;
