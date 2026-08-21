# dsh-evolve-in-git

Git-backed long-term memory and evolution plugin for DeepSeek Harness.

## What it does

This plugin treats a user-chosen Git repository as the memory store.
It can write session notes, branch-specific records, and reusable skill drafts into that repo, then commit them as ordinary Git history.

## Config

- `repoPath` - the Git repository that stores memory and skills.
- `memoryRoot` - where memory records are written, default `.dsh-evolve/memory`.
- `skillsRoot` - where skill drafts are written, default `.dsh-evolve/skills`.
- `defaultBranch` - branch to evolve from when creating new branches, default `main`.
- `remoteName` - remote to fetch and push, default `origin`.
- `autoCommit` - whether writes auto-commit, default `true`.

## Current API

- `status()` - read branch, head, and working-tree state.
- `branches()` - list local branches.
- `record(...)` - write one memory entry as markdown.
- `draftSkill(...)` - generate a reusable skill draft.
- `suggest(...)` - return a user-facing skill-promotion prompt.
- `saveSkillDraft(...)` - persist a generated skill draft.
- `createBranch(...)`, `checkout(...)`, `fetch()`, `push()` - Git workflow helpers.

## Current slice

Phase 1 focuses on the storage and branch layer.
The next steps are user prompting, DSH tool exposure, skill sync, and branch-recovery policy.

## Limits

- No automatic prompt injection yet.
- No merge/conflict resolver yet.
- No remote auth flow yet.
- No sync to the DSH skill registry yet.
