/**
 * Reversible skill discovery for dsh-evolve-in-git.
 *
 * A skill lives entirely inside the memory repository under the configured
 * skillsRoot: drafts under <skillsRoot>/drafts/<name>/SKILL.md, enabled skills
 * under <skillsRoot>/enabled/<name>/SKILL.md. Promoting a draft runs
 * git mv drafts/<name> enabled/<name> (never a copy), so the skill stays in Git
 * history and can be demoted or rolled back. The DSH adapter discovers only the
 * enabled/ directory (listEnabledSkills); to bridge the case where that adapter
 * could not register, enabled skills are also symlinked into ~/.dsh/skills/ so
 * the filesystem skill provider exposes them (see mountSkill / syncMountedSkills).
 * @module dsh-evolve-in-git/skill
 */
import { existsSync, lstatSync, mkdirSync, readFileSync, readdirSync, readlinkSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { commitPaths, gitAdd, gitMove, openRepository } from './git.js';
/** Kebab-case skill-name grammar, mirroring @deepseek-ai/dsh-skill isSkillName. */
const SKILL_NAME = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
/** Kebab-case skill-name validation (same grammar as the host skill registry). */
export function isSkillName(name) {
    return SKILL_NAME.test(name);
}
function skillsRootOf(config) {
    return join(config.repoPath, config.skillsRoot);
}
function draftsRootOf(config) {
    return join(skillsRootOf(config), 'drafts');
}
function enabledRootOf(config) {
    return join(skillsRootOf(config), 'enabled');
}
/** DSH user skills directory (~/.dsh/skills, honoring DSH_HOME). */
function dshSkillsDir() {
    const dshHome = (process.env['DSH_HOME'] || '').trim() || join(homedir(), '.dsh');
    return join(dshHome, 'skills');
}
/** True if a path exists (including a dangling symlink). */
function pathExists(p) {
    try {
        lstatSync(p);
        return true;
    }
    catch {
        return false;
    }
}
/**
 * Mount an enabled skill into the DSH user skills dir as a symlink so the
 * filesystem skill provider sees it even when the in-host skill provider could
 * not be registered. Replaces any stale copy/symlink at the link path.
 */
export function mountSkill(config, name) {
    const link = join(dshSkillsDir(), name);
    const target = join(enabledRootOf(config), name);
    mkdirSync(dirname(link), { recursive: true });
    let action = 'mounted';
    if (pathExists(link)) {
        rmSync(link, { recursive: true, force: true });
        action = 'relinked';
    }
    symlinkSync(target, link, 'dir');
    return { name, link, target, action };
}
/** Remove the DSH user skills symlink for a demoted skill (only if it points into our enabled root). */
export function unmountSkill(config, name) {
    const link = join(dshSkillsDir(), name);
    if (!pathExists(link))
        return { name, link, action: 'noop' };
    let ours = false;
    try {
        const st = lstatSync(link);
        const real = readlinkSync(link);
        ours = st.isSymbolicLink() && real.includes(enabledRootOf(config));
    }
    catch {
        ours = false;
    }
    if (!ours)
        return { name, link, action: 'skipped' };
    rmSync(link, { recursive: true, force: true });
    return { name, link, action: 'unmounted' };
}
/** Mount every enabled skill into the DSH user skills dir; return per-skill results. */
export function syncMountedSkills(config) {
    return listEnabledSkills(config).map((s) => mountSkill(config, s.name));
}
/** Repo-relative path (forward slashes) for git mv. */
function relMovePath(config, section, name) {
    return config.skillsRoot.replace(/\\/g, '/') + '/' + section + '/' + name;
}
/** Minimal YAML-frontmatter reader: extracts name and description from a draft. */
function parseFrontmatter(raw) {
    const match = raw.match(/^---\n([\s\S]*?)\n---/m);
    if (match === null)
        return {};
    const body = match[1];
    if (body === undefined)
        return {};
    const out = {};
    for (const line of body.split(/\r?\n/)) {
        const kv = line.match(/^([A-Za-z0-9_-]+):\s*(.*)$/);
        if (kv === null)
            continue;
        const key = kv[1];
        let value = (kv[2] ?? '').trim();
        if (value.startsWith('"') && value.endsWith('"')) {
            value = value.slice(1, -1).replace(/\\"/g, '"').replace(/\\\\/g, '\\');
        }
        if (key === 'name')
            out.name = value;
        else if (key === 'description')
            out.description = value;
    }
    return out;
}
/** List <name>/SKILL.md skills under a directory, sorted by name. */
function scanSkillDirs(root) {
    if (!existsSync(root))
        return [];
    const summaries = [];
    for (const entry of readdirSync(root, { withFileTypes: true })) {
        if (!entry.isDirectory())
            continue;
        const skillPath = join(root, entry.name, 'SKILL.md');
        if (!existsSync(skillPath))
            continue;
        const fm = parseFrontmatter(readFileSync(skillPath, 'utf8'));
        if (fm.name === undefined || fm.description === undefined)
            continue;
        if (!isSkillName(fm.name))
            continue;
        summaries.push({ name: fm.name, description: fm.description, path: skillPath });
    }
    return summaries.sort((left, right) => left.name.localeCompare(right.name));
}
/** List promotable skill drafts under <skillsRoot>/drafts. */
export function listSkillDrafts(config) {
    return scanSkillDirs(draftsRootOf(config));
}
/** List enabled (discoverable) skills under <skillsRoot>/enabled. */
export function listEnabledSkills(config) {
    return scanSkillDirs(enabledRootOf(config));
}
/** Move a skill directory between drafts/ and enabled/ with git mv, then commit. */
function moveSkill(config, from, to, name) {
    if (!isSkillName(name)) {
        throw new Error("invalid skill name '" + name + "': must be kebab-case");
    }
    const repoPath = openRepository(config);
    const fromAbs = join(repoPath, config.skillsRoot, from, name);
    const skillPath = join(fromAbs, 'SKILL.md');
    if (!existsSync(skillPath)) {
        throw new Error("no skill '" + name + "' at " + skillPath);
    }
    const fm = parseFrontmatter(readFileSync(skillPath, 'utf8'));
    if (fm.name === undefined || fm.description === undefined || fm.name !== name) {
        throw new Error("skill '" + name + "' frontmatter must declare the matching name and a description");
    }
    const toAbs = join(repoPath, config.skillsRoot, to, name);
    mkdirSync(join(repoPath, config.skillsRoot, to), { recursive: true });
    gitAdd(repoPath, relMovePath(config, from, name));
    gitMove(repoPath, relMovePath(config, from, name), relMovePath(config, to, name));
    if (config.autoCommit) {
        commitPaths(repoPath, [relMovePath(config, to, name)], 'skill(' + (to === 'enabled' ? 'promote' : 'demote') + '): ' + name);
    }
    // Expose promoted skills to the DSH filesystem provider and unlink demoted ones.
    if (to === 'enabled') {
        try {
            mountSkill(config, name);
        }
        catch { /* best-effort */ }
    }
    else if (to === 'drafts') {
        try {
            unmountSkill(config, name);
        }
        catch { /* best-effort */ }
    }
    return { name: fm.name, description: fm.description, path: join(toAbs, 'SKILL.md'), targetPath: join(toAbs, 'SKILL.md') };
}
/** Promote a draft: git mv drafts/<name> -> enabled/<name> (discoverable). */
export function promoteSkillDraft(config, name) {
    return moveSkill(config, 'drafts', 'enabled', name);
}
/** Demote an enabled skill: git mv enabled/<name> -> drafts/<name> (reversible). */
export function demoteSkillDraft(config, name) {
    return moveSkill(config, 'enabled', 'drafts', name);
}
/** The bundled skill directory inside the installed package. */
function packageRoot() {
    return join(dirname(fileURLToPath(import.meta.url)), '..');
}
/**
 * Materialize the skills shipped in this package (skills/<name>/SKILL.md) into
 * the repo's <skillsRoot>/drafts so they can be reviewed and promoted. Only runs
 * when the repo is already a Git checkout (the constructor calls this
 * best-effort, so a not-yet-connected repo is left untouched). force=false only
 * creates missing drafts; force=true overwrites them with the bundled copy.
 * @returns one summary per bundled skill, in discovery order.
 */
export function syncBundledSkills(config, force = false) {
    const bundledRoot = join(packageRoot(), 'skills');
    if (!existsSync(bundledRoot))
        return [];
    if (!existsSync(join(config.repoPath, '.git')))
        return [];
    const targetRoot = draftsRootOf(config);
    const results = [];
    for (const entry of readdirSync(bundledRoot, { withFileTypes: true })) {
        if (!entry.isDirectory())
            continue;
        const src = join(bundledRoot, entry.name, 'SKILL.md');
        if (!existsSync(src))
            continue;
        const target = join(targetRoot, entry.name, 'SKILL.md');
        const content = readFileSync(src, 'utf8');
        let action = 'skipped';
        if (!existsSync(target)) {
            mkdirSync(join(targetRoot, entry.name), { recursive: true });
            writeFileSync(target, content, 'utf8');
            action = 'created';
        }
        else if (force) {
            writeFileSync(target, content, 'utf8');
            action = 'updated';
        }
        results.push({ name: entry.name, targetPath: target, action });
    }
    return results;
}
