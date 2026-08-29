# dsh-evolve-in-git 记忆遗忘机制设计（Memory Forgetting）

> 本文档说明插件的**记忆遗忘现状**，给出**“降权 → 归档 → 删除”的渐进遗忘模型**，
> 覆盖过期记忆、低价值记忆、用户主动删除与容量限制四类触发，并绑定到既有记忆架构文档。
> 适用范围：dsh-evolve-in-git **v0.5.0**（当前 `main` @ `ffc0de1`）。

---

## 目录

1. [现状：当前遗忘机制](#1-现状当前遗忘机制)
2. [设计理念：遗忘不等于删除](#2-设计理念遗忘不等于删除)
3. [四类遗忘触发](#3-四类遗忘触发)
   - [3.1 过期记忆](#31-过期记忆)
   - [3.2 低价值记忆](#32-低价值记忆)
   - [3.3 用户主动删除](#33-用户主动删除)
   - [3.4 容量限制](#34-容量限制)
4. [状态机与存储布局](#4-状态机与存储布局)
5. [与三层记忆 / 写入时机 / 检索 / 更新冲突的关系](#5-与三层记忆--写入时机--检索--更新冲突的关系)
6. [落地到当前代码的最小改造](#6-落地到当前代码的最小改造)
7. [设计要点](#7-设计要点)
8. [风险与后置项](#8-风险与后置项)
9. [附录：与其他设计文档的关系](#9-附录与其他设计文档的关系)

---

## 1. 现状：当前遗忘机制

**当前记忆一旦写入，就永久保留在工作树中，没有遗忘机制。**

- `scanMemory`（`src/memory.ts:79-84`）扫描 memoryRoot 下所有 Markdown，
  不区分是否过期。
- `searchMemory` / `memoryTimeline` 没有 TTL、归档、容量限制或访问频次概念。
- 唯一的“撤销”是 `evolve_rollback`，它回滚某个 Git commit，不是“遗忘某条记忆”。
- 没有 `expiresAt`、`lastAccessedAt`、`accessCount`、`importance`，
  因此无法判断低价值或过期记忆。
- 没有 archive 目录或 archive 分支，也没有 `evolve_forget` / `evolve_restore`。

当前状态：

```text
记忆写入后永久存在，除非用户手动回滚某个 commit
```

这会带来两个问题：

1. 过期信息继续污染检索结果，例如“本周五要交报告”到了下个月还会被召回。
2. 长期记忆无限增长，最终所有记忆都变成噪声。

---

## 2. 设计理念：遗忘不等于删除

先回答关键问题：

> **真的过时的记忆就要遗忘吗？**

不一定。遗忘应该分阶段：

```text
active（正常召回）
  → expired / low-value（降权或标记）
  → archived（移出默认检索，但可恢复）
  → deleted（显式删除，Git 历史仍保留）
```

核心原则：

> **默认只归档，不硬删除。**
> 删除是最后手段，且必须显式触发；Git 历史仍然兜底。

理由：

- 有些记忆虽然暂时没用，但未来可能仍有参考价值
- “很少被检索”可能只是检索能力弱，不一定是记忆本身没价值
- 用户可能后悔删除
- Git 天然适合做可逆归档

---

## 3. 四类遗忘触发

### 3.1 过期记忆

典型：`本周五要交报告`、`临时调试端口是 8080`。

策略：

- 写入时给时间敏感记忆加 `expiresAt`
- 到期后先**降权**，不再进入默认检索
- 然后由清理流程**归档**到 archive
- 只有用户明确要求才真正删除

建议字段：

```yaml
expiresAt: 2026-01-17T00:00:00Z
status: active → expired → archived
```

注意区分：

- `validTo`：事实的有效区间，用于版本化
- `expiresAt`：这条记忆本身的保留期限，用于遗忘

### 3.2 低价值记忆

典型：很少被检索、没有 consolidation、没有用户反馈的记忆。

策略：

- 记录 `lastAccessedAt` 和 `accessCount`
- 当一条记忆长期未被访问，且重要性不高时，归档
- **不能只按“最近没被访问”判断**，因为可能是检索能力不够，而不是记忆没价值

建议归档条件：

```text
低价值 = 长期未访问
       + accessCount 低
       + importance 低
       + kind 不是 persona/warning
```

### 3.3 用户主动删除

典型：用户说“忘掉我上次说的那个偏好”。

策略：

- 必须支持显式删除
- 但默认做**软删除**：把记录移入 archive，而不是直接删除文件
- 返回 dry-run 预览，让用户确认
- 如果涉及隐私，需要提示 Git 历史中仍可能保留内容

命令形态：

```text
/evolve forget <id|path> [--dry] [--hard]
```

- `--dry`：预览将归档/删除什么
- `--hard`：从工作树删除，但 Git 历史仍可追溯

### 3.4 容量限制

策略：

- 设置每个用户最多 N 条长期记忆
- 超出后按淘汰分数从低到高归档
- 淘汰不是删除，移入 archive 即可

建议淘汰分数：

```text
evictionScore =
    importance
  + kindWeight(persona/warning 高，note 中，session 低)
  + timeDecay(lastAccessedAt)
  + accessCountBonus
  - agePenalty(createdAt 过久)
```

`persona` 和 `warning` 属于规则类记忆，应设置更高的保留权重，
避免被容量淘汰误伤。

---

## 4. 状态机与存储布局

```text
写入
  │
  ▼
active ──expiresAt 到期──► expired ──清理──► archived
  │                                            ▲
  │──低价值/容量淘汰───────────────────────────┘
  │
  │──用户主动删除──────────────────────────────► archived ──restore──► active
  │
  └──用户 --hard────────────────────────────────► deleted（Git 历史保留）
```

建议 frontmatter：

```yaml
status: active | expired | archived
archiveReason: expired | low-value | user-delete | capacity
archivedAt: 2026-02-01T00:00:00Z
restoreFrom: <path or commit>
```

检索默认行为：

```text
evolve_recall / searchMemory：只返回 status=active
evolve_recall --include-archive：返回 archived
evolve_timeline：可显示完整生命周期
```

归档存储建议：

- 默认 `archiveRoot`：`.dsh-evolve/archive`
- 与 memoryRoot 平级，避免被默认扫描
- 保留原路径结构：`<archiveRoot>/<kind>/<原文件名>.md`
- 也可使用 Git 分支 `archive/<kind>/<id>`，作为多会话归档方案

---

## 5. 与三层记忆 / 写入时机 / 检索 / 更新冲突的关系

遗忘不是孤立能力，它贯穿记忆生命周期：

```text
写入时机（MEMORY_WRITE_IN_TIMING.md）
   决定 expiresAt / importance / kind
        │
        ▼
更新与冲突（MEMORY_UPDATE_CONFLICT.md）
   旧记忆 superseded 后进入遗忘候选
        │
        ▼
检索方式（MEMORY_RETRIEVAL.md）
   更新 lastAccessedAt / accessCount
        │
        ▼
遗忘机制（本文档）
   过期 / 低价值 / 用户删除 / 容量限制 → 归档或删除
```

| 相关文档 | 遗忘机制的衔接 |
|---|---|
| 三层记忆 | 短期 `session` 优先过期；长期 `persona/warning` 保留权重高 |
| 写入时机 | T1/T2/T3 决定 `expiresAt`；T4 可作为“是否遗忘”的频次信号 |
| 检索方式 | 检索命中时更新 `lastAccessedAt/accessCount`，为低价值淘汰提供数据 |
| 更新冲突 | `superseded` 记忆可在后续清理中归档 |

---

## 6. 落地到当前代码的最小改造

- **数据模型**（`src/types.ts` / `src/git.ts:frontmatter`）：
  增加 `status`、`expiresAt`、`archiveReason`、`archivedAt`、
  `lastAccessedAt`、`accessCount`、`importance`。
- **检索路径**（`src/memory.ts`）：
  `scanMemory` 支持排除 archiveRoot；
  `searchMemory` / `memoryTimeline` 默认过滤 `status=active`；
  检索命中后更新 `lastAccessedAt/accessCount`。
- **遗忘路径**（新增 `src/forget.ts` 或扩展 `src/git.ts`）：
  `moveToArchive` 将文件移入 archiveRoot 并生成 commit；
  `restoreFromArchive` 反向恢复。
- **新工具/命令**：
  - `evolve_forget <id|path> [--dry] [--hard] [--reason expired|low-value|user|capacity]`
  - `evolve_restore <id|path>`
  - `evolve_expire [--dry]` —— 批量处理到期/淘汰
  - `evolve_stats` —— 查看访问频次与容量水位
- **配置**（`src/defaults.ts` / `src/config.ts`）：
  新增 `archiveRoot`、`maxLongTermRecords`、`sessionNoteTtlDays`、
  `lowValueAccessThreshold`、`lowValueDaysThreshold`、`autoExpire`。
- **复用现有设施**：`autoCommit`（归档/恢复各一个 commit）、
  `rollback`（撤销遗忘）、`conflicts/resolve`（归档冲突兜底）。

---

## 7. 设计要点

1. **遗忘的本质是管理检索可见性，不是删除文件。**
   先让过期/低价值记忆从默认检索中消失，再考虑是否归档或删除。
2. **归档优于删除。**
   归档保留纠错和恢复能力，也符合 Git 哲学；硬删除只用于用户明确要求。
3. **低价值判断要谨慎。**
   若检索系统本身弱，则“很少被检索”可能不是记忆的错。
   应先补上 `lastAccessedAt/accessCount`，再谈低价值淘汰。
4. **容量限制是最后一道保险。**
   先做 TTL、归档、用户删除；长期记忆真正影响检索性能时再启用容量淘汰。
5. **规则类记忆不应被轻易遗忘。**
   `persona/warning` 需要更高的保留权重。
6. **隐私删除要诚实提示。**
   归档只是移出默认检索，Git 历史仍可能保留内容；真正擦除历史需要额外手段。

---

## 8. 风险与后置项

- **误归档风险**：低价值判断若过于激进，会归档掉用户还需要的记忆；必须可 `evolve_restore`。
- **访问统计写入成本**：每次检索命中都更新 frontmatter 会产生额外 commit；应批量或异步更新。
- **archiveRoot 与 rollback 边界**：现有 `revertCommit` 只允许 memoryRoot/skillsRoot，
  需要扩展允许 archiveRoot。
- **容量淘汰公平性**：`importance` 若长期缺失，淘汰会退化成纯时间淘汰，需要默认值。
- **隐私删除的 Git 历史问题**：硬删除仍无法从旧 commit 中抹去内容；敏感数据应提前提示。

---

## 9. 附录：与其他设计文档的关系

- `MEMORY-ARCHITECTURE.md` 回答“记忆如何分层、如何流转”；
  `MEMORY_WRITE_IN_TIMING.md` 回答“什么时候写”；
  `MEMORY_RETRIEVAL.md` 回答“怎么取出来”；
  `MEMORY_UPDATE_CONFLICT.md` 回答“同一事实被更新或推翻时怎么办”；
  本文档回答“哪些记忆不该永久保留，以及如何安全遗忘”。
- 本文档的 `expiresAt` 与 `MEMORY_WRITE_IN_TIMING.md` 的短期记忆 TTL 对应。
- 本文档的 `lastAccessedAt/accessCount` 直接服务 `MEMORY_RETRIEVAL.md` 的时间衰减与排序。
- 本文档的 `superseded → archived` 流程衔接 `MEMORY_UPDATE_CONFLICT.md`。
- 本文档仍是**可选扩展提案**，是否实施取决于后续需求。

---
