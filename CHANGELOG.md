# Changelog

## v0.6.2 — Publish missing lib/ build artifacts

- Force-include `lib/` artifacts so `github:` installs can resolve `lib/core.js`, `lib/memory-index.js`, `lib/update.js`, `lib/forget.js`, and `lib/privacy.js`.

## v0.6.1 — Fix /evolve command routing

- Strip a leading `/evolve` prefix in `normalizeEvolveCommand` before command dispatch.
- Fixes `/evolve search ...` falling through to the legacy help text when the host passes the full command string.
- Adds a regression test in `tests/harness.spec.ts`.

## v0.6.0 — MVP (Git-backed long-term memory + evolution)

### Core
- Framework-free `MemoryCore` (no `@deepseek-ai/*` imports) in `src/core.ts`.
- Metadata-indexed recall with `topK`/`minScore`/`maxChars`/`includeContent` budgets and lazy body loading.
- Versioned update (`updateMemory`) — new active record + `supersedes`/`supersededBy` chain, old record never deleted.
- Soft-delete/restore (`forget`/`restore`) with `expiresAt` filtering (fail-closed on malformed timestamps).
- Reversible skill drafts (`drafts` ↔ `enabled`) via `git mv`, never a copy.

### Privacy
- Sensitive-content detection (email/phone/id-card/credit-card/AWS key/GitHub token/private key/secrets).
- Write gate `privacyMode`: `block` rejects, `redact` stores redacted content (global, never plaintext), `ask` stores as-is with a `sensitivity` flag.
- `evolve_show`/`evolve_export` respect `sensitivity`; unknown/legacy sensitivity is treated as `secret` (fail-closed).

### DSH adapter
- Tools: `evolve_*` + `memory_*` aliases (`memory_search`/`save`/`update`/`delete`).
- The repo `<skillsRoot>/enabled/` directory is registered as a DSH skill provider, so promoted skills are callable.
- `/evolve` command + system-prompt injection of the `persona`+`warning` digest (budgeted).

### Config (six layers: defaults / config file / schema / client / locales / README)
- `recallTopK`, `recallMinScore`, `recallMaxChars`, `archiveRoot`, `privacyMode`, `digestEnabled`, `digestMaxRecords`, `digestMaxChars`.

### Reliability
- `pretest` regenerates the `@deepseek-ai/dsh-tools` stub so a clean clone can run `npx pnpm test`.
- `forget`/`restore` commit their renames when `autoCommit` is enabled.
- `markSuperseded` preserves hand-authored frontmatter fields.

### Non-blocking TODOs
- `getMemoryIndex` still re-walks the memory root on cache hits (a watcher-based cheap signature is future work).
- The privacy gate is memory-only; skill-draft writes are outside the gate (documented scope).
- `classifySensitivity` never assigns `internal` (the level is reachable only by hand-authored frontmatter).
