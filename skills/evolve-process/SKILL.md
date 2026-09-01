---
name: evolve-process
description: Decide whether a memory in dsh-evolve-in-git is worth evolving into a reusable DSH skill, then carry it through draft, review, and promote so it becomes callable.
whenToUse: Use when you have a repeatable lesson, warning, persona or note, or a candidate skill draft, and want to turn it into a normal DSH skill via dsh-evolve-in-git.
---

# evolve-process

The evolve plugin (dsh-evolve-in-git) keeps long-term memory in a Git repo and promotes reusable patterns into DSH skills. This skill is the decision + step guide for that evolution. The plugin does not run it automatically: you drive it, using the plugin's tools and commands.

## When to evolve

A memory is worth evolving when it is likely to repeat and the rule is stable. The plugin's hard-coded candidacy check is `shouldOfferSkillPromotion`: true when `kind` is `warning`, `persona`, or `note`, or when `title` matches the patterns `error|pitfall|remind|repeat|persona|style|tone`. Use it as a first-cut filter, then apply judgment: a one-off fact is not a skill; a recurring, reusable rule is.

## What a memory is

`evolve_remember` / `/evolve remember` writes `kind` + `title` + `content`, with optional `source` (e.g. a session id) and `tags`, into `<repo>/<memoryRoot>/<kind>/<timestamp>-<slug>-<id8>.md` with YAML frontmatter and a content body, then commits it. `kind` ∈ `session | skill | warning | persona | note`. Link it to a historical session by putting the session id in `source`; there is no automatic session capture.

## Draft

To make a draft SKILL.md from a memory, call `evolve_skill_draft` (or `/evolve skill draft`):
- name: `skill-<slug(title)>` (kebab-case)
- description: `<kind> pattern distilled from <title>`
- whenToUse: `Use when <first 120 chars of content>`
- instructions: the memory content

The draft is written under `<repo>/<skillsRoot>/drafts/<name>/SKILL.md`. If the draft step is unavailable in your build, author the SKILL.md yourself following that recipe.

## Review before promote

Before promoting, check that the draft:
1. Has a kebab-case `name` and a `description` in frontmatter.
2. Ends with the directory name matching the frontmatter `name`.
3. States the contract without narration or change history (one fact, one home).
4. Contains no secrets; if it does, write placeholders and note the source outside.

## Promote and verify

`/evolve skill list` lists drafts; `/evolve skill promote <name>` (or `evolve_skill_promote`) moves the draft from `<skillsRoot>/drafts/<name>` to `<skillsRoot>/enabled/<name>` with `git mv` (never a copy). The plugin registers the repo's `<skillsRoot>/enabled/` directory as a DSH skill provider, so promoted skills become callable without being copied into `~/.dsh/skills`. Verify with a `skill` catalog listing.

## Safety

- Touch only the memory and skill files. Do not modify unrelated repo files.
- Respect `autoCommit`: when false, the record/draft is written but not committed until you commit.
- Do not echo the configured token or auth secrets into a skill title, description, or content.
