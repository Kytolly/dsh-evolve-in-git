# dsh-evolve-in-git 记忆更新与冲突处理设计（Memory Update & Conflict）

> 本文档说明插件的**记忆更新与冲突处理现状**，给出**可演化的记忆更新模型**：
> 稳定身份、时间属性、覆盖/合并/版本化/置信度，以及语义冲突的检测与决策策略。
> 适用范围：dsh-evolve-in-git **v0.5.0**（当前 `main` @ `ffc0de1`）。

---

## 目录

1. [现状：当前更新与冲突处理](#1-现状当前更新与冲突处理)
2. [设计理念：不静默删除旧事实](#2-设计理念不静默删除旧事实)
3. [稳定身份与时间属性](#3-稳定身份与时间属性)
   - [3.1 稳定 ID](#31-稳定-id)
   - [3.2 时间字段](#32-时间字段)
4. [更新操作](#4-更新操作)
   - [4.1 覆盖 overwrite](#41-覆盖-overwrite)
   - [4.2 合并 merge](#42-合并-merge)
   - [4.3 版本化 version](#43-版本化-version)
   - [4.4 置信度标记 confidence](#44-置信度标记-confidence)
5. [冲突检测与决策](#5-冲突检测与决策)
   - [5.1 检测流程](#51-检测流程)
   - [5.2 决策矩阵](#52-决策矩阵)
6. [与三层记忆 / 写入时机 / 检索方式的关系](#6-与三层记忆--写入时机--检索方式的关系)
7. [落地到当前代码的最小改造](#7-落地到当前代码的最小改造)
8. [设计要点](#8-设计要点)
9. [风险与后置项](#9-风险与后置项)
10. [附录：与其他设计文档的关系](#10-附录与其他设计文档的关系)

---

## 1. 现状：当前更新与冲突处理

**当前记忆写入是 append-only，没有语义层面的“更新”。**

- `writeMemoryRecord`（`src/git.ts:221-260`）每次都用
  `<repo>/<memoryRoot>/<kind>/<timestamp>-<slug>.md` 生成一个**新文件**。
- 即使标题、kind、内容完全相同，时间戳不同，也会再写一条新记录。
- frontmatter 只有 `createdAt`，没有 `updatedAt`、`supersedes`、
  `supersededBy`、`confidence`、`status`。
- 检索时旧记忆不会自动失效，所以“我住在上海”和“我现在住在北京”会同时出现在 `evolve_recall` 里。
- 现有的 `evolve_conflicts` / `evolve_resolve`（`src/git.ts:291-357`，
  `src/index.ts:528-548`）处理的是 **Git merge/rebase 文件冲突**，不是语义冲突。
- `evolve_rollback` 可以撤销提交，但它是“回滚历史”，不是“更新当前事实”。

当前更新能力可以概括为：

```text
旧记忆 + 新记忆 = 两条并存记录，检索时都会返回
```

结论：当前实现能保存历史，但不能表达“哪个是当前事实”。

---

## 2. 设计理念：不静默删除旧事实

记忆更新与冲突处理要解决四件事：

1. **同一事实的稳定身份**：知道哪条记忆和哪条记忆是“同一个事实”。
2. **更新操作**：覆盖、合并、版本化、置信度标记。
3. **冲突检测**：写入前发现旧记忆与新记忆矛盾。
4. **冲突决策**：自动采用最新信息，还是询问用户，还是同时保留。

核心原则：

> **新信息默认优先，但旧信息不消失。**
> 旧记忆应当被标记为 `superseded`，而不是被删除；
> 这样既保证检索时优先看到新事实，又保留完整演进历史。

Git 与 frontmatter 的分工：

| 层 | 职责 |
|---|---|
| Git | 保证每次更新都有 commit，可 `evolve_rollback` |
| frontmatter | 表达“哪条记忆已经过时、哪条是当前事实” |
| 检索 | 默认只返回 `status: active` 的记录 |
| `evolve_conflicts` | 继续处理 Git 文件冲突 |
| 语义冲突层 | 处理“同一事实的不同版本互相矛盾” |

---

## 3. 稳定身份与时间属性

### 3.1 稳定 ID

当前路径里的 `timestamp-slug` 不适合做更新目标，因为每次写入都变。

建议给每条记忆增加稳定身份：

- `id`：内容寻址或规范化 key，例如：
  - `persona/location`
  - `note/toolchain-version`
- `canonicalSubject`：规范化主题，例如“用户居住地”
- 检索时优先按 `id` / `canonicalSubject` 查重，而不是只靠关键词

这样“我住在上海”和“我住在北京”才能被识别为**同一事实的不同版本**。

### 3.2 时间字段

记忆应该天生带时间属性，但至少要区分：

| 字段 | 含义 |
|---|---|
| `createdAt` | 这条记录第一次写入的时间 |
| `updatedAt` | 最后一次更新/覆盖的时间 |
| `observedAt` | 事实被观察或声明的时间，例如“用户在 2026-01-01 说住在北京” |
| `validFrom / validTo` | 事实有效区间，适合“某段时间住在上海，后来搬到北京” |

只有 `createdAt` 是不够的；`updatedAt` 和 `observedAt` 才是判断“新信息”的关键。

---

## 4. 更新操作

| 操作 | 适用场景 | 语义 |
|---|---|---|
| **覆盖 overwrite** | 用户明确纠正错误事实 | 替换正文，更新 `updatedAt`，旧版本进入 Git 历史 |
| **合并 merge** | 同一主题补充信息，不矛盾 | 合并 tags、source、正文，保留 provenance |
| **版本化 version** | 事实可能在不同时间/上下文有效 | 保留多条记录，用 `validFrom/validTo` 表达 |
| **置信度标记 confidence** | 区分确定事实和推测 | `confidence: high/medium/low` 或数值 `0..1` |

### 4.1 覆盖 overwrite

- 触发：用户明确纠正旧事实。
- 动作：
  - 新记录写入正文
  - 旧记录 `status` 改为 `superseded`
  - 旧记录 `supersededBy` 指向新记录
  - 新记录 `supersedes` 指向旧记录
  - `updatedAt` 更新
- 注意：旧文件仍在 Git 中，可回滚，只是检索默认不返回。

### 4.2 合并 merge

- 触发：同一主题补充信息，且不矛盾。
- 动作：
  - 合并 `tags / source / content`
  - 保留多来源 provenance
  - 更新 `updatedAt`
- 注意：merge 不产生新版本链，只增强当前记录。

### 4.3 版本化 version

- 触发：新旧信息可能都对，只是时间/语境不同。
- 动作：
  - 不覆盖，保留多条记录
  - 用 `validFrom / validTo` 表达时间分片
  - 检索时根据当前时间或上下文选择有效版本
- 示例：
  - `validFrom: 2024, validTo: 2025` → 住在上海
  - `validFrom: 2026` → 住在北京

### 4.4 置信度标记 confidence

- 用于判断“这条记忆有多可信”：
  - `high`：用户显式声明
  - `medium`：模型从可靠上下文推断
  - `low`：模型隐式捕获、未经确认
- 置信度参与冲突决策和检索排序。

---

## 5. 冲突检测与决策

### 5.1 检测流程

```text
新记忆
  → 按 id / canonicalSubject 召回旧记忆
  → 判断关系：
      - 无冲突：直接写入
      - 补充关系：merge
      - 矛盾关系：进入冲突决策
```

“冲突”不等于“重复”。重复可以 merge，矛盾才需要特殊处理。

### 5.2 决策矩阵

不建议简单二选一“询问用户”或“自动采用最新信息”，而应按**写入来源和置信度**分层：

| 场景 | 策略 |
|---|---|
| 用户显式纠正，且新信息置信度高于旧信息 | **自动覆盖**，旧记忆标记 `superseded` |
| 用户显式声明，但旧记忆也是高置信度且矛盾 | **询问用户**，或保留两个版本并标记冲突 |
| 模型隐式捕获，置信度低 | **不覆盖显式记忆**，先写短期层候选 |
| 新旧信息可能都对，只是时间/语境不同 | **版本化**，用 `validFrom/validTo` 同时保留 |
| 同一主题重复出现，但信息不矛盾 | **merge**，不产生冲突 |

为什么不能简单“自动采用最新信息”：

- 最新信息不等于最准确信息
- 用户可能口误
- 模型可能误判
- 旧记忆可能仍然有效，只是语境不同
- “北京”和“上海”可能是两个不同时间段的事实

因此推荐策略是：

> **新信息默认优先，但旧信息不消失。**

---

## 6. 与三层记忆 / 写入时机 / 检索方式的关系

更新与冲突处理不是孤立能力，它位于写入与检索之间：

```text
写入时机（MEMORY_WRITE_IN_TIMING.md）
   T1/T2/T3/T4 决定新记忆从哪来、置信度多高
        │
        ▼
更新与冲突处理（本文档）
   稳定 ID → 查重 → 覆盖/合并/版本化 → 标记 superseded/contradicted
        │
        ▼
检索方式（MEMORY_RETRIEVAL.md）
   默认过滤 status=active，按相关性/新鲜度/置信度排序
```

| 写入时机 | 更新策略 |
|---|---|
| T1 显式触发 | 高置信度，可自动覆盖低置信度旧记忆 |
| T2 隐式触发 | 低置信度，不覆盖显式记忆，先入短期层 |
| T3 周期性整理 | 会话摘要候选，矛盾时询问用户 |
| T4 阈值触发 | 未来作为“确认/覆盖”的触发信号 |

---

## 7. 落地到当前代码的最小改造

- **数据模型**（`src/types.ts` / `src/git.ts:frontmatter`）：
  增加 `id`、`canonicalSubject`、`updatedAt`、`observedAt`、
  `status`、`supersedes`、`supersededBy`、`confidence`、
  `validFrom`、`validTo`。
- **写入路径**（`src/git.ts`）：
  在 `writeMemoryRecord` 之前增加 `resolveUpdate`：
  按 `id/canonicalSubject` 查重，返回 `overwrite | merge | version | conflict`。
- **检索路径**（`src/memory.ts`）：
  `scanMemory` 解析 `status`；
  `searchMemory` / `memoryTimeline` 默认过滤 `status != active`。
- **新工具/命令**：
  - `evolve_update` —— 按 `id/path` 更新一条记忆，支持 `overwrite/merge/version`
  - `evolve_conflicts` 扩展为同时列出 Git 冲突和语义冲突
  - `evolve_resolve` 增加语义冲突策略：`latest | keep-both | ask`
  - `evolve_history <id|path>` —— 查看同一事实的版本链
- **复用现有设施**：`autoCommit`（每次更新一个 commit）、`rollback`（撤销更新）、
  `conflicts/resolve`（Git 冲突兜底）、`evolve_recall`（更新前查重）。

---

## 8. 设计要点

1. **没有稳定 ID，就没有更新。**
   先给记忆建立稳定身份，再谈覆盖、合并、版本化。
2. **旧事实不删除，只标记过时。**
   删除会丢失纠错能力；`superseded` + Git 历史是更好的选择。
3. **“更新时间”和“观察时间”比“创建时间”更重要。**
   判断新旧事实应看 `updatedAt/observedAt`，而不是 `createdAt`。
4. **冲突决策依赖来源和置信度。**
   显式纠正可自动覆盖，隐式捕获不能覆盖显式记忆。
5. **Git 冲突和语义冲突是两层问题。**
   Git 处理文件版本，frontmatter 处理事实版本，二者都要有。
6. **检索必须配合过滤。**
   如果检索不默认过滤 `superseded`，更新机制就没有意义。

---

## 9. 风险与后置项

- **稳定 ID 的规范化**：`canonicalSubject` 若不一致，会漏判同一事实；需要统一 slug/别名规则。
- **误覆盖风险**：自动覆盖必须要求新信息置信度更高，否则容易覆盖掉用户重要规则。
- **时间分片复杂度**：`validFrom/validTo` 适合简单事实，复杂时间关系应后置。
- **语义冲突与 Git 冲突叠加**：两个层级的 `evolve_conflicts` 需要清晰区分，避免模型混淆。
- **迁移成本**：旧记忆没有 `id/status`，需要兼容策略，例如默认 `status=active`、按路径生成临时 `id`。

---

## 10. 附录：与其他设计文档的关系

- `MEMORY-ARCHITECTURE.md` 回答“记忆如何分层、如何流转”；
  `MEMORY_WRITE_IN_TIMING.md` 回答“什么时候写”；
  `MEMORY_RETRIEVAL.md` 回答“怎么取出来”；
  本文档回答“同一事实被更新或推翻时怎么办”。
- 本文档的“覆盖/合并/版本化”对应 `MEMORY-ARCHITECTURE.md` §2.2 的
  **巩固 consolidation** 与 **降级/回写**。
- 本文档的“语义冲突”是 `MEMORY_WRITE_IN_TIMING.md` T3 周期性整理的关键闸门。
- 本文档的 `status/confidence` 直接服务 `MEMORY_RETRIEVAL.md` 的过滤与排序。
- 本文档仍是**可选扩展提案**，是否实施取决于后续需求。

---
