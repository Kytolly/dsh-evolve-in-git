# dsh-evolve-in-git

Git-backed long-term memory and evolution plugin for DeepSeek Harness.

## Version status

`v0.1.1` has been accepted. It establishes the private-memory repository connection, secure SSH/token configuration, and the default local clone location.

## What it does

This plugin treats a user-chosen Git repository as the memory store.
It can write session notes, branch-specific records, and reusable skill drafts into that repo, then commit them as ordinary Git history.

## Config

- `repoPath` - the local Git checkout that stores memory and skills. Defaults to `~/.dsh-evolve-in-git/remote-memory`.
- `repoUrl` - the remote memory repository. Defaults to `https://github.com/Kytolly/dsh-remote-memory.git`.
- `auth` - optional Git auth settings for private access.
- `memoryRoot` - where memory records are written, default `.dsh-evolve/memory`.
- `skillsRoot` - where skill drafts are written, default `.dsh-evolve/skills`.
- `defaultBranch` - branch to evolve from when creating new branches, default `main`.
- `remoteName` - remote to fetch and push, default `origin`.
- `autoCommit` - whether writes auto-commit, default `true`.

### Auth

- `auth.mode: "ssh"` - use `ssh` or a custom `sshCommand`.
- `auth.mode: "token"` - use `token` or a token from `tokenEnv` and a GitHub-style `Authorization` header.

## Current API

- `status()` - read branch, head, and working-tree state.
- `branches()` - list local branches.
- `record(...)` - write one memory entry as markdown.
- `draftSkill(...)` - generate a reusable skill draft.
- `suggest(...)` - return a user-facing skill-promotion prompt.
- `saveSkillDraft(...)` - persist a generated skill draft.
- `createBranch(...)`, `checkout(...)`, `fetch()`, `push()` - Git workflow helpers.
- `connect()` - ensure the local checkout exists and is linked to the remote memory repo.

## Current slice

`v0.1.1` completes the accepted private-memory connection slice: a user-chosen private repository can be cloned to the default local location and accessed with SSH or token-based Git authentication.

The next release is `v0.1.2`, which will expose the existing service through DSH tools and commands so it can be used directly inside Harness.

## Limits

- No automatic prompt injection yet.
- No merge/conflict resolver yet.
- No interactive credential setup or credential-management UI yet; SSH/token authentication is configured through plugin settings or environment variables.
- No sync to the DSH skill registry yet.
