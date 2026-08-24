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
> The built `lib/` (including the browser `lib/client.js`) is committed, so the
> `github:` route works as-is. Rebuild locally with `pnpm build` after source
> changes, then commit the artifacts.

## Config

> **Web settings UI (v0.1.4+).** The plugin ships a browser half that registers a
> first-level **Settings → 演进记忆** section on the web profile's Settings page.
> The section binds the `evolve-git` settings namespace and edits every field
> below through the official settings transport (nested `auth` is written as one
> merged object); the `auth.token` field is write-only (redacted from the wire).
> Requires the profile to be restarted after install so the client manifest is
> rescanned.

- `repoPath` - the local Git checkout that stores memory and skills. Defaults to `~/.dsh-evolve-in-git/remote-memory`.
- `repoUrl` - the remote memory repository. **No personal default ships with the plugin**: the built-in default is the placeholder `https://github.com/<your-github-username>/<your-memory-repo>.git`, so configure your own repository (see "Per-user config file" below).
- `auth` - Git auth settings for private access. The default profile is SSH-first and token-capable.
- `memoryRoot` - where memory records are written, default `.dsh-evolve/memory`.
- `skillsRoot` - where skill drafts are written, default `.dsh-evolve/skills`.
- `defaultBranch` - branch to evolve from when creating new branches, default `main`.
- `remoteName` - remote to fetch and push, default `origin`.
- `autoCommit` - whether writes auto-commit, default `true`.

### Auth

- `auth.mode: "ssh"` - use `ssh` or a custom `sshCommand`.
- `auth.mode: "token"` - use `token` or a token from `tokenEnv` and a GitHub-style `Authorization` header.

### Per-user config file

Each DSH user keeps one local config file at `$DSH_HOME/evolve-in-git.json`
(`~/.dsh/evolve-in-git.json` by default). It is **user-local and never part of any
Git repository** — do not commit it. Create or edit it directly, or use the
`/evolve config show|open|refresh|set <key> <value>` command. Values here override
the plugin defaults and the profile patch layer; the web Settings → 演进记忆
section edits the same fields through the settings document.

Example:

```json
{
  "repoPath": "/absolute/path/to/your/local-memory-checkout",
  "repoUrl": "https://github.com/<your-github-username>/<your-memory-repo>.git"
}
```

> **Never put access tokens in this file** — use `auth.tokenEnv` to name an
> environment variable, or the web settings token field (write-only).

The web Settings → 演进记忆 section also embeds a **config-file editor** that
opens this file directly, edits it as raw JSON, and saves it through the
loopback-only `/api/evolve-git/config` route (saves apply immediately).

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

## Browser half (`v0.1.4+`)

- `src/client/` - the browser bundle (`lib/client.js`) compiled by
  `tsc -p tsconfig.client.json && tsdown` (see `tsdown.config.ts`); registered as
  a `settings.section` slot so the web Settings page renders the config form.
- `package.json` - `exports["./client"]` + `dsh.client` (`platform: "web"`) are
  the manifest contract `dsh-client-modules` scans to include the bundle in
  `window.__DSH_BOOT__`.

## Current slice

`v0.1.4` makes the plugin directly usable from Harness and adds the web
settings UI.
It adds the first tool and command surfaces, but still leaves skill-promotion strategy, safe rollback, sync reminders, and timeline views for later versions.

## Limits

- No automatic prompt injection yet.
- No merge/conflict resolver yet.
- No sync to the DSH skill registry yet.
- No branch switch, diff, or revert command surface yet.