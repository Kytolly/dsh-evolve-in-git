# dsh-evolve-in-git

Git-backed long-term memory and evolution plugin for DeepSeek Harness.

## What it does

This plugin treats a user-chosen or preconfigured Git repository as the memory store.
It can write session notes, branch-specific records, and reusable skill drafts into that repo, then commit them as ordinary Git history.

## Install

```sh
# example: install into the web profile
 dsh plugin --profile web add github:Kytolly/dsh-evolve-in-git
```

The bundle inserts one `dsh-evolve-in-git` row with the plugin defaults.
Later profile patches can override `repoPath`, `repoUrl`, `auth`, and the storage roots.

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

## Harness entry points (`v0.1.2`)

Tools:

- `evolve_connect`
- `evolve_status`
- `evolve_remember`
- `evolve_branches`
- `evolve_help`

Human command:

- `/evolve connect`
- `/evolve status`
- `/evolve branches`
- `/evolve remember <kind> <title> :: <content>`
- `/evolve help`

## Current slice

`v0.1.2` makes the plugin directly usable from Harness.
It adds the first tool and command surfaces, but still leaves skill-promotion strategy, safe rollback, sync reminders, and timeline views for later versions.

## Limits

- No automatic prompt injection yet.
- No merge/conflict resolver yet.
- No sync to the DSH skill registry yet.
- No branch switch, diff, or revert command surface yet.
