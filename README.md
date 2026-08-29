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
- `archiveRoot` - where `evolve_forget` moves records, default `.dsh-evolve/archive`.
- `recallTopK` - maximum results `evolve_recall` returns, default `10`.
- `recallMinScore` - minimum relevance score to keep, default `0`.
- `recallMaxChars` - cumulative character budget for returned recall content, default `8000`.
- `privacyMode` - write-path privacy gate for sensitive content, default `ask`. `block` rejects the write when sensitive content is detected; `redact` stores the redacted content (never the plaintext); `ask` stores the content as-is and marks its `sensitivity` so it can be reviewed/confirmed.
- `digestEnabled` - whether to inject the session-start `persona`+`warning` digest, default `true`.
- `digestMaxRecords` - maximum `persona`/`warning` records in the session-start digest, default `5`.
- `digestMaxChars` - maximum characters of the session-start digest, default `2000`.

### Auth

- `auth.mode: "ssh"` - use `ssh` or a custom `sshCommand`.
- `auth.mode: "token"` - use `token` or a token from `tokenEnv` and a GitHub-style `Authorization` header.

### Privacy write gate

Every memory write passes through the privacy gate (emails, phones, ID cards,
credit cards, AWS keys, GitHub tokens, private keys, and `password:`-style
secrets). `privacyMode` controls the response:

- `block` - reject the write when sensitive content is detected.
- `redact` - replace detected fragments with `<REDACTED>` and store that instead of the plaintext.
- `ask` (default) - store the content as-is and record its `sensitivity` so it can be reviewed and confirmed.

`evolve_show`/`evolve_export` respect the recorded `sensitivity` level, and
exports exclude `secret` records by default. Records without a recorded
`sensitivity` (written before the gate existed) are treated as `secret` so they
are never accidentally exported.

The gate covers **memory writes only** (`writeMemoryRecord`/`updateMemory`, i.e.
`evolve_remember`/`memory_save`/`evolve_update`/`memory_update`). Skill-draft
writes (`writeSkillDraft`/`saveSkillDraftFromRecord`) intentionally do **not** go
through the privacy gate in this release; review drafts for secrets before
promoting them.

> **Recall scoring.** `evolve_recall`/`memory_search` score a query against record
> metadata (`title`, `kind`, `tags`, `branch`, `source`) only; the body is loaded
> lazily for the top matches but is not part of the relevance score. Use
> `/evolve search <q>` when you need the older full-text substring match.
>
> **Archive constraint.** `archiveRoot` must stay outside `memoryRoot` (the
> default `.dsh-evolve/archive` does). If you point `archiveRoot` inside
> `memoryRoot`, forgotten records are still scanned and will not disappear.

### Per-user config file

Each DSH user keeps one local config file at `$DSH_HOME/evolve-in-git.json`
(`~/.dsh/evolve-in-git.json` by default). It is **user-local and never part of any
Git repository** — do not commit it. The file is the **single user configuration
layer**: the web Settings → 演进记忆 form reads and writes exactly this file
(showing the defaults overlaid by your file values, and saving writes the file
immediately), and the `/evolve config show|open|refresh|set <key> <value>`
commands edit it too. The embedded config-file editor opens the raw JSON.

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

## Harness entry points (`v0.6.2`)

The plugin targets the current Harness `0.1.1-rc.2` host contracts for commands,
tools, system prompt, and invariants (peerDependencies are `^0.1.1-rc.2`). Install it
into a profile, then restart that profile so the bundle layer is composed.

Tools:

- `evolve_connect`
- `evolve_status`
- `evolve_remember`
- `evolve_update`
- `evolve_forget`
- `evolve_restore`
- `evolve_show`
- `evolve_export`
- `evolve_branches`
- `evolve_branch_switch`
- `evolve_branch_diff`
- `evolve_skill_draft`
- `evolve_skill_list`
- `evolve_skill_promote`
- `evolve_skill_demote`
- `evolve_rollback`
- `evolve_conflicts`
- `evolve_resolve`
- `evolve_timeline`
- `evolve_recall`
- `evolve_help`
- `memory_search` (alias of `evolve_recall`)
- `memory_save` (alias of `evolve_remember`)
- `memory_update` (alias of `evolve_update`)
- `memory_delete` (alias of `evolve_forget`)

Human command:

- `/evolve connect`
- `/evolve status`
- `/evolve branches`
- `/evolve remember <kind> <title> [--expires <iso>] :: <content>`
- `/evolve update <id> [--merge] :: <content>`
- `/evolve forget <id>`
- `/evolve restore <id>`
- `/evolve skill draft <kind> <title> :: <content>`
- `/evolve skill list`
- `/evolve skill promote <name>`
- `/evolve skill demote <name>`
- `/evolve skill sync`
- `/evolve rollback <ref> [--dry]`
- `/evolve conflicts`
- `/evolve resolve <path> <ours|theirs|both>`
- `/evolve timeline`
- `/evolve search <q> [--kind k] [--tag t]`
- `/evolve branch switch <name>` \| `/evolve branch diff <a> [b]` \| `/evolve branch revert <ref>`
- `/evolve help`

After installation, verify composition before starting a long-lived profile:

```sh
dsh --profile web --dump-config
dsh --profile web
```

The first command should show the `evolve-git` row from the plugin bundle. The
second command boots the profile; once loaded, the model sees the
`evolve_*` tools and the UI command registry exposes `/evolve`.

### Bundled skills

The package ships the `evolve-process` skill under `skills/`. On load the plugin
materializes it into the repo's `<skillsRoot>/drafts/evolve-process/` (creating
it only when missing); `/evolve skill sync` overwrites the bundled copy on
demand. Promote it with `/evolve skill promote evolve-process`. The adapter
registers the repo's `<skillsRoot>/enabled/` directory as a DSH skill provider,
so promoted skills become callable without any copy into `~/.dsh/skills`.

## Browser half (`v0.1.4+`)

- `src/client/` - the browser bundle (`lib/client.js`) compiled by
  `tsc -p tsconfig.client.json && tsdown` (see `tsdown.config.ts`); registered as
  a `settings.section` slot so the web Settings page renders the config form.
- `package.json` - `exports["./client"]` + `dsh.client` (`platform: "web"`) are
  the manifest contract `dsh-client-modules` scans to include the bundle in
  `window.__DSH_BOOT__`.

## Delivery notes (`v0.6.x`)

`v0.6.2` finalized the MVP: metadata-indexed recall with budgets, versioned
update (`supersedes`/`supersededBy`), soft-delete/restore plus expiry, reversible
skill drafts with the repo `enabled/` directory registered as a DSH skill
provider, the `block`/`redact`/`ask` privacy write gate, and the `memory_*`
aliases plus the session-start `persona`+`warning` digest.

Verification: `npx pnpm check` (build + typecheck + test) is green.

### Known non-blocking TODOs

- `getMemoryIndex` still re-walks the memory root on cache hits (correctness over
  speed); a watcher-based cheap signature is future work.
- The privacy gate covers memory writes (`writeMemoryRecord`/`updateMemory`);
  skill-draft writes (`writeSkillDraft`/`saveSkillDraftFromRecord`) are
  intentionally outside the gate (documented memory-only scope).
- `classifySensitivity` never assigns `internal`; the `internal` export level is
  reachable only when a record is hand-authored with that frontmatter value.