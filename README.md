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

> **Windows local install.** A `file:` source containing spaces (`D:\Deepseek Harness\…`)
is split by the CLI argument parser, so use a space-less path (a junction or short path):
>
> ```sh
> dsh plugin --profile web add file:C:/Users/13928/.dsh/evolve-in-git
> ```
>
> `lib/` is git-ignored, so the `github:` route only works once the built `lib/` is
> shipped (commit it, or let `prepare` build it on install).

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

## Harness entry points (`v0.1.3`)

The plugin targets the current Harness `0.1.1-rc.2` host contracts for commands,
tools, system prompt, and invariants (peerDependencies are `^0.1.1-rc.2`). Install it
into a profile, then restart that profile so the bundle layer is composed.

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

After installation, verify composition before starting a long-lived profile:

```sh
dsh --profile web --dump-config
dsh --profile web
```

The first command should show the `evolve-git` row from the plugin bundle. The
second command boots the profile; once loaded, the model sees the five
`evolve_*` tools and the UI command registry exposes `/evolve`.

## Current slice

`v0.1.3` makes the plugin directly usable from Harness.
It adds the first tool and command surfaces, but still leaves skill-promotion strategy, safe rollback, sync reminders, and timeline views for later versions.

## Limits

- No automatic prompt injection yet.
- No merge/conflict resolver yet.
- No sync to the DSH skill registry yet.
- No branch switch, diff, or revert command surface yet.
