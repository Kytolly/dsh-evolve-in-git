# dsh-evolve-in-git 技能发现与可逆提升设计（Skill Discovery & Reversible Promotion）

> 本文档说明当前 `promoteSkillDraft` 复制到 `~/.dsh/skills` 的问题，
> 并给出**让 DSH 文件系统直接发现插件配置技能库**的设计：promote 从“复制”改为
> “Git 可逆启用/发布”，使技能始终留在 Git 记忆仓库中。
> 适用范围：dsh-evolve-in-git **v0.5.0**（当前 `main` @ `ffc0de1`）。

---

## 目录

1. [现状：promoteSkillDraft 的复制问题](#1-现状promoteskilldraft-的复制问题)
2. [宿主能力：dsh-skill-filesystem](#2-宿主能力dsh-skill-filesystem)
3. [设计理念：技能库是 Git 的一部分](#3-设计理念技能库是-git-的一部分)
4. [目录结构与提升操作](#4-目录结构与提升操作)
5. [实现路径](#5-实现路径)
6. [与记忆架构文档的关系](#6-与记忆架构文档的关系)
7. [落地到当前代码的最小改造](#7-落地到当前代码的最小改造)
8. [设计要点](#8-设计要点)
9. [风险与后置项](#9-风险与后置项)
10. [附录：与其他设计文档的关系](#10-附录与其他设计文档的关系)

---

## 1. 现状：promoteSkillDraft 的复制问题

当前实现：

- `promoteSkillDraft`：`src/skill.ts:91-109`
- 它把 `<repo>/<skillsRoot>/<name>/SKILL.md` **复制**到 `~/.dsh/skills/<name>/SKILL.md`
- `syncBundledSkills`：`src/skill.ts:125-147` 也会把插件自带技能写入用户技能目录

复制操作不是“物理上无法删除”，而是**语义上不可逆**：

1. **脱离 Git**：副本不再是 Git 记忆仓库的一部分。
2. **更新不传播**：仓库里的草稿改了，已提升副本不会跟着变。
3. **回滚不完整**：`evolve_rollback` 只回滚仓库提交，不回滚 `~/.dsh/skills`。
4. **双源漂移**：仓库草稿与用户技能目录可能出现同名不同内容。

---

## 2. 宿主能力：dsh-skill-filesystem

DSH 宿主的 `@deepseek-ai/dsh-skill-filesystem` 已经支持额外技能根：

| 字段 | 默认值 | 含义 |
|---|---|---|
| `providerName` | `filesystem` | 注册到 `ctx.skills` 的唯一提供方名称 |
| `includeDefaultRoots` | `true` | 是否包含项目根和用户根 |
| `customSkillDirs` | `[]` | 额外扫描的本地 skill 根目录 |
| `watch` | `true` | 监视技能根并自动失效缓存 |

它支持：

- `<root>/<name>/SKILL.md`
- `<root>/<name>.md`
- frontmatter 解析 `name/description/whenToUse/disable-model-invocation/user-invocable`
- `resourceBase` 指向技能目录，因此技能可引用仓库内资源
- watcher 检测文件变化

这意味着：**我们不需要复制到 `~/.dsh/skills`，完全可以让 Git 仓库技能根直接被 DSH 发现。**

---

## 3. 设计理念：技能库是 Git 的一部分

核心变化：

```text
旧：repo skillsRoot → copy → ~/.dsh/skills → DSH 发现
新：repo skillsRoot → 注册为 customSkillDir → DSH 直接发现
```

这样：

- `promote` 不再是复制，而是**启用/发布**
- 技能始终留在 Git 仓库里
- 修改、回滚、遗忘都继续走 Git
- 没有第二份副本

`evolve_skill_promote` 语义变化：

| 旧语义 | 新语义 |
|---|---|
| 复制到 `~/.dsh/skills` | Git 移动或标记启用 |
| 返回 `targetPath` 是用户技能目录 | 返回 `targetPath` 是仓库内 `enabled/` 路径 |
| 副本脱离 Git | 技能仍在 Git 仓库中 |
| 更新不传播 | 仓库变更被 watcher 发现 |
| 回滚不完整 | `evolve_rollback` 可完整撤销 |

---

## 4. 目录结构与提升操作

为保留“草稿”和“已提升”的边界，建议拆分：

```text
<repo>/.dsh-evolve/skills/
  drafts/
    my-skill/
      SKILL.md
  enabled/
    my-skill/
      SKILL.md
```

DSH 只发现 `enabled/`：

- `drafts/`：模型可以继续编辑，尚未启用
- `enabled/`：被 DSH 文件系统发现，作为可调用技能

提升：

```text
git mv skills/drafts/my-skill skills/enabled/my-skill
git commit -m "skill(my-skill): promote"
```

取消提升：

```text
git mv skills/enabled/my-skill skills/drafts/my-skill
git commit -m "skill(my-skill): demote"
```

这完全是可逆的，也可以被 `evolve_rollback` 覆盖。

---

## 5. 实现路径

### 路径 A：插件运行时注册专用 provider（推荐）

插件直接使用 `ctx.skills.registerProvider`，或复用 `FileSystemSkillProvider`：

```ts
ctx.skills.registerProvider(() => new FileSystemSkillProvider(ctx, control, {
  providerName: 'evolve-git-skills',
  includeDefaultRoots: false,
  customSkillDirs: [join(this.config.repoPath, this.config.skillsRoot, 'enabled')],
  watch: true,
}))
```

优点：

- 路径来自用户配置的 `repoPath/skillsRoot`，可以动态解析
- 不需要宿主新功能
- 不污染 `~/.dsh/skills`

### 路径 B：宿主增加动态 skill-root 注册 API

如果希望做成通用能力，可以让 DSH 宿主提供类似：

```ts
ctx.skills.registerSkillDir(path, options)
```

然后由 `dsh-skill-filesystem` 合并这些动态根。

优点：

- 所有插件都能复用，不用各自实现 provider
- 更符合“DSH 文件系统能够额外发现插件配置的技能库”

### 路径 C：静态 cordis 配置

如果技能根路径固定，可以静态配置：

```yaml
- id: evolve-skill-filesystem
  name: '@deepseek-ai/dsh-skill-filesystem'
  config:
    providerName: evolve-git-skills
    includeDefaultRoots: false
    customSkillDirs:
      - <absolute skillsRoot/enabled>
```

缺点：

- `repoPath` 是用户配置，路径通常不是静态的，因此静态方案不够通用。

---

## 6. 与记忆架构文档的关系

技能发现不是孤立能力，它是“记忆 → 技能”能力化出口：

```text
长期记忆
   → skill draft（Git 仓库 skillsRoot）
   → 发现（DSH 文件系统扫描 enabled/）
   → 可调用 DSH skill
   → 回滚/降级（Git 可逆）
```

| 相关文档 | 技能发现的衔接 |
|---|---|
| 三层记忆 | `skill` 是长期记忆的能力化出口 |
| 写入时机 | `evolve_skill_draft` 产生草稿；promote 是显式发布 |
| 更新冲突 | promote/demote 是 Git 移动，不是覆盖副本 |
| 遗忘机制 | demote 或删除草稿可走 Git，不需要清理 `~/.dsh/skills` |

---

## 7. 落地到当前代码的最小改造

- **目录布局**（`src/git.ts` / `src/skill.ts`）：
  `writeSkillDraft` 写入 `skillsRoot/drafts/<name>/SKILL.md`。
- **promote 实现**（`src/skill.ts`）：
  `promoteSkillDraft` 改为 `git mv drafts/<name> enabled/<name>` 并 commit。
- **demote 实现**：
  新增 `demoteSkillDraft` 或复用 `evolve_rollback`，把技能移回 `drafts/`。
- **list 实现**：
  `listSkillDrafts` 分别列出 drafts 和 enabled，返回 `status: draft | promoted`。
- **provider 注册**：
  在 `GitEvolutionService` 构造阶段注册 `evolve-git-skills` provider，
  扫描 `skillsRoot/enabled`。
- **保留 bundled 安装**：
  `syncBundledSkills` 继续处理插件自带技能的初始安装，与 Git 技能库分开。

---

## 8. 设计要点

1. **promote 是 Git 操作，不是文件复制。**
   可逆性来自 Git，而不是来自“删掉副本”。
2. **DSH 文件系统只发现 `enabled/`。**
   草稿和已发布技能应有明确边界。
3. **技能始终留在记忆仓库。**
   更新、回滚、遗忘都作用于同一个 Git 源。
4. **路径必须动态解析。**
   因为 `repoPath` 来自用户配置，不能写死。
5. **注意发现深度只有一层。**
   DSH 只识别 `<root>/<name>/SKILL.md`，不要做嵌套分组。
6. **rank 优先级要明确。**
   `customSkillDirs` 的 rank 高于用户 `~/.dsh/skills`，插件技能会优先于同名用户技能。

---

## 9. 风险与后置项

- **宿主版本依赖**：依赖 `@deepseek-ai/dsh-skill-filesystem` 的内部导出，
  若未来 API 变化需要适配。
- **provider 名称冲突**：`evolve-git-skills` 必须与宿主其他提供方名称不冲突。
- **watcher 生命周期**：仓库技能根被 watcher 监听，插件释放时要正确 dispose。
- **旧副本迁移**：已复制到 `~/.dsh/skills` 的技能需要一次性迁移或清理策略。
- **静态配置不可用**：如果仓库路径变化，静态 `customSkillDirs` 会失效；
  动态 provider 是更稳的方案。

---

## 10. 附录：与其他设计文档的关系

- `MEMORY-ARCHITECTURE.md` 回答“记忆如何分层、如何流转”；
  `MEMORY_WRITE_IN_TIMING.md` 回答“什么时候写”；
  `MEMORY_RETRIEVAL.md` 回答“怎么取出来”；
  `MEMORY_UPDATE_CONFLICT.md` 回答“同一事实被更新或推翻时怎么办”；
  `MEMORY_FORGETTING.md` 回答“哪些记忆不该永久保留”；
  `MEMORY_FORMAT_EXPLAINABILITY.md` 回答“记忆应该长什么样”；
  本文档回答“技能如何从记忆仓库中被 DSH 发现、如何可逆提升”。
- 本文档是 `MEMORY-ARCHITECTURE.md` 能力化闭环的具体实现方案。
- 本文档仍是**可选扩展提案**，是否实施取决于后续需求。

---
