# dsh-evolve-in-git 记忆格式与可解释性设计（Memory Format & Explainability）

> 本文档说明插件的**记忆格式现状**，给出**人机可读、可审计、可校验的记忆格式设计**，
> 定义哪些要素适合作为长期记忆，并把它绑定到三层记忆、写入时机、检索、更新冲突与遗忘机制上。
> 适用范围：dsh-evolve-in-git **v0.5.0**（当前 `main` @ `ffc0de1`）。

---

## 目录

1. [现状：当前记忆格式](#1-现状当前记忆格式)
2. [设计理念：原始文本是唯一事实源](#2-设计理念原始文本是唯一事实源)
3. [目标格式](#3-目标格式)
   - [3.1 frontmatter 元数据](#31-frontmatter-元数据)
   - [3.2 正文结构](#32-正文结构)
4. [哪些要素适合作为记忆](#4-哪些要素适合作为记忆)
   - [4.1 判断标准](#41-判断标准)
   - [4.2 recordType 分类](#42-recordtype-分类)
   - [4.3 不值得记的负面清单](#43-不值得记的负面清单)
5. [与三层记忆 / 写入时机 / 检索 / 更新冲突 / 遗忘的关系](#5-与三层记忆--写入时机--检索--更新冲突--遗忘的关系)
6. [落地到当前代码的最小改造](#6-落地到当前代码的最小改造)
7. [设计要点](#7-设计要点)
8. [风险与后置项](#8-风险与后置项)
9. [附录：与其他设计文档的关系](#9-附录与其他设计文档的关系)

---

## 1. 现状：当前记忆格式

当前记忆格式是 **Markdown + YAML frontmatter**，方向正确，但仍停留在“自由笔记”阶段。

- `writeMemoryRecord`（`src/git.ts:221-260`）写入的 frontmatter 只有：
  `kind / title / branch / source / tags / createdAt`。
- 正文 `content` 是完全自由文本，没有结构化段落。
- `parseFrontmatterFields`（`src/memory.ts:29-53`）只识别简单 `key: value`，
  tags 解析依赖逗号分隔，没有 schema 版本、校验或默认值。
- `MemoryKind` 只有 `session | skill | warning | persona | note`，语义太粗。
- 没有 `recordType / confidence / importance / status / expiresAt / sourceQuote / sessionId`
  等可解释性字段。

当前格式能力对照：

| 维度 | 现状 |
|---|---|
| 人类可读 | ✅ Markdown 正文 + YAML 头部 |
| 模型可读 | ✅ 工具返回结构化 JSON |
| 原始文本保留 | ✅ 没有只存 embedding |
| 结构化程度 | ⚠️ 只有 coarse kind，正文自由发挥 |
| 可调试性 | ⚠️ 有路径和时间，但缺少来源引用和版本链 |
| 可校验性 | ❌ 无 schema 校验，字段写错也不会报错 |
| 可解释性 | ❌ 不知道这条记忆为何存在、来自哪次会话、置信度如何 |

---

## 2. 设计理念：原始文本是唯一事实源

### 原则一：原始文本优先

- 记忆的 **source of truth** 必须是 Markdown 原文。
- embedding、向量索引、摘要、倒排索引都只是**派生数据**，可以随时重建。
- 永远不允许“只存 embedding，丢掉原始文本”。

### 原则二：元数据负责可解释，正文负责可理解

一条记忆应能回答：

- 这是什么类型的记忆？
- 谁在什么时候记录的？
- 来源是哪次会话、哪句话？
- 置信度多高？
- 现在是否仍然有效？
- 被谁更新、取代或归档过？

### 原则三：正文保持结构化但不过度僵化

不要把所有内容都塞进 key-value；用 Markdown 小节表达：

- `## 事实`
- `## 偏好`
- `## 决策与原因`
- `## 约束`
- `## 术语`

### 原则四：机器可校验

- frontmatter 应有 `schemaVersion`。
- 必填字段和枚举值应可校验。
- 非法记录应能被发现，而不是默默进入检索。

---

## 3. 目标格式

### 3.1 frontmatter 元数据

示例：

```yaml
---
schemaVersion: 1
id: persona/language-style
kind: persona
recordType: preference
title: 用户回答语言与解释风格
tags: [偏好, 语言, 解释风格]
confidence: high
importance: high
status: active
createdAt: 2026-01-01T10:00:00Z
updatedAt: 2026-01-02T10:00:00Z
source: session-abc123
sourceQuote: "回答使用中文，代码示例用 TypeScript，解释要带原理说明。"
sessionId: session-abc123
expiresAt: null
---
```

| 字段 | 作用 |
|---|---|
| `schemaVersion` | 格式版本，便于迁移 |
| `id` | 稳定身份，更新/冲突/遗忘都依赖它 |
| `kind` | 生命周期层：session/note/warning/persona/skill |
| `recordType` | 语义类型：preference/fact/decision/... |
| `confidence` | 可信程度 |
| `importance` | 重要程度，用于检索排序和容量淘汰 |
| `status` | active/superseded/expired/archived |
| `source` / `sessionId` | 来源会话 |
| `sourceQuote` | 原始关键句，增强可解释性 |
| `expiresAt` | 过期时间，用于临时任务 |
| `updatedAt` | 更新时间 |

### 3.2 正文结构

正文继续保持 Markdown，但按 `recordType` 使用轻量模板。示例：

```markdown
# 用户回答语言与解释风格

## 偏好
- 回答使用中文
- 代码示例使用 TypeScript
- 解释要带原理说明

## 适用场景
- 默认回答
- 技术解释
```

模板不是强制 schema，而是降低模型写作负担；真正校验的是 frontmatter。

---

## 4. 哪些要素适合作为记忆

### 4.1 判断标准

一条信息值得进入长期记忆，至少应满足：

1. **跨会话复用价值**：下次还会用到
2. **稳定性**：不会很快失效
3. **个性化**：与这个用户/项目强相关
4. **可验证或可溯源**：有明确来源
5. **低噪声**：不是一次性闲聊

### 4.2 recordType 分类

| recordType | 含义 | 建议 kind | 生命周期 |
|---|---|---|---|
| `preference` | 用户偏好与习惯 | persona | 长期，高保留 |
| `fact` | 稳定事实信息 | note / persona | 长期 |
| `project_context` | 项目上下文与约束 | note | 长期 |
| `decision` | 决策与原因 | note | 长期，强调“为什么” |
| `relationship` | 关系与实体 | note / glossary | 长期 |
| `goal` | 长期目标与计划 | note | 中期，可更新 |
| `feedback` | 反馈历史与纠错记录 | warning / persona | 长期，高保留 |
| `glossary` | 术语表与缩写 | note | 长期 |
| `task` | 临时但重要的任务状态 | session | 短期，必须 `expiresAt` |

典型示例：

- `preference`：用户偏好：回答使用中文，代码示例用 TypeScript，解释要带原理说明。
- `fact`：用户是一名后端工程师，主要使用 Go 和 PostgreSQL，正在开发一个电商中台。
- `project_context`：项目“X”必须兼容 iOS 15，不能使用 SwiftUI 新特性。
- `decision`：用户拒绝使用微服务架构，理由是团队规模小、维护成本高。
- `relationship`：小王负责前端，小李负责数据；前端通过 BFF 层调用后端。
- `goal`：用户计划在 2026 年 Q4 将系统从 REST 迁移到 GraphQL。
- `feedback`：用户提醒过：解释概念时不要用过度简化的类比。
- `glossary`：“OM”在用户项目中指 Order Management，不是 Object Model。
- `task`：截至 2026-08-28，用户正在修复支付回调的并发问题，尚未完成。

### 4.3 不值得记的负面清单

- 一次性事实
- 纯闲聊
- 可以随时重新查询或推导的内容
- 未经确认的推测
- 隐私、凭证、密钥
- 没有来源的模型臆测

---

## 5. 与三层记忆 / 写入时机 / 检索 / 更新冲突 / 遗忘的关系

格式不是孤立设计，它为其他机制提供字段基础：

```text
写入时机（MEMORY_WRITE_IN_TIMING.md）
   决定 kind / recordType / confidence / expiresAt
        │
        ▼
更新与冲突（MEMORY_UPDATE_CONFLICT.md）
   使用 id / status / updatedAt / supersedes
        │
        ▼
检索方式（MEMORY_RETRIEVAL.md）
   使用 tags / recordType / importance / lastAccessedAt
        │
        ▼
遗忘机制（MEMORY_FORGETTING.md）
   使用 expiresAt / status / archivedAt
```

| 相关文档 | 格式字段如何服务 |
|---|---|
| 三层记忆 | `kind` 区分短期/长期；`recordType` 细化语义 |
| 写入时机 | `confidence` 表达显式/隐式；`expiresAt` 表达临时任务 |
| 检索方式 | `recordType/tags/importance` 用于过滤、排序和主动注入 |
| 更新冲突 | `id/status/updatedAt` 支撑覆盖、合并、版本化 |
| 遗忘机制 | `expiresAt/status/archivedAt` 支撑过期、归档和容量淘汰 |

---

## 6. 落地到当前代码的最小改造

- **数据模型**（`src/types.ts`）：
  `MemoryRecordInput` 增加 `recordType`、`confidence`、`importance`、
  `sourceQuote`、`sessionId`；`MemoryMeta` 增加 `status`、`updatedAt`。
- **写入路径**（`src/git.ts:frontmatter`）：
  支持完整字段序列化；增加 `schemaVersion`。
- **解析路径**（`src/memory.ts`）：
  解析新增字段；对 `kind/recordType/status/confidence` 做枚举校验；
  解析失败时记录 warning 而不是静默丢弃。
- **策略层**（`src/strategy.ts`）：
  增加 `recordTypeFromInput` 推断辅助；`memoryPreview` 渲染结构化小节。
- **工具/命令**：
  `evolve_remember` 增加 `recordType`、`confidence`、`expiresAt` 参数；
  `evolve_recall` 增加 `recordType` 过滤。
- **复用现有设施**：Markdown 正文、YAML frontmatter、Git autoCommit、
  `evolve_timeline` / `evolve_recall`。

---

## 7. 设计要点

1. **原始文本是唯一事实源。**
   embedding、摘要、索引都是派生数据；删除它们后，记忆仍应完整可读。
2. **`kind` 与 `recordType` 分离。**
   `kind` 管生命周期，`recordType` 管语义类型。
3. **可解释性的关键不是正文写得好，而是来源可追溯。**
   `sourceQuote + sessionId + source` 应成为标配。
4. **模板降低负担，schema 保证质量。**
   模板帮助模型写作，frontmatter 校验保证机器可读。
5. **九类要素不是九种文件格式，而是一套受控词表。**
   统一 frontmatter，`recordType` 用枚举区分，正文用可选模板。
6. **临时任务必须走短期层。**
   `task` 类记录必须有 `expiresAt`，完成后标记 `done` 或归档。

---

## 8. 风险与后置项

- **schema 迁移成本**：旧记录没有新字段，需要兼容策略，例如默认 `status=active`、
  `schemaVersion=0`、按 kind 推导临时 `recordType`。
- **枚举过细风险**：`recordType` 过多会增加分类负担；第一阶段可只启用核心枚举。
- **sourceQuote 隐私风险**：引文可能包含敏感信息，写入前需要过滤或确认。
- **正文模板漂移**：模板不是强约束，模型可能写偏；必要时用示例和校验兜底。
- **解析器兼容性**：当前解析器较简单，扩展字段时要避免破坏旧文件读取。

---

## 9. 附录：与其他设计文档的关系

- `MEMORY-ARCHITECTURE.md` 回答“记忆如何分层、如何流转”；
  `MEMORY_WRITE_IN_TIMING.md` 回答“什么时候写”；
  `MEMORY_RETRIEVAL.md` 回答“怎么取出来”；
  `MEMORY_UPDATE_CONFLICT.md` 回答“同一事实被更新或推翻时怎么办”；
  `MEMORY_FORGETTING.md` 回答“哪些记忆不该永久保留”；
  本文档回答“记忆应该长什么样，以及如何让人和模型都能读懂、审查它”。
- 本文档是其他所有机制的**数据契约基础**。
- 本文档仍是**可选扩展提案**，是否实施取决于后续需求。

---
