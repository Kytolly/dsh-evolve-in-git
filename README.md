# dsh-evolve-in-git

Git-backed long-term memory and evolution plugin for DeepSeek Harness.

## What it does

This plugin treats a user-chosen or preconfigured Git repository as the memory store.
It can write session notes, branch-specific records, and reusable skill drafts into that repo, then commit them as ordinary Git history.

## Config

- `repoPath` - the local Git checkout that stores memory and skills. Defaults to `~/.dsh-evolve-in-git/remote-memory`.
- `repoUrl` - the remote memory repository. Defaults to `https://github.com/Kytolly/dsh-remote-memory.git`.
- `auth` - Git auth settings for private access. The default profile is SSH-first and token-capable.
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
  It now validates that the configured remote exists, matches `repoUrl`, and is reachable with the current auth settings.

## Current slice

`v0.1.1` focuses on the storage, branch, and private-remote connection layer.
The next steps are user prompting, DSH tool exposure, skill sync, and branch-recovery policy.

## Limits

- No automatic prompt injection yet.
- No merge/conflict resolver yet.
- No DSH tool or command registration yet.
- No sync to the DSH skill registry yet.
