# dsh-evolve-in-git 成本与性能设计（Cost & Performance）

> 本文档说明插件的**成本与性能现状**，给出**可预算的记忆检索与注入设计**：
> 在“记忆带来的上下文提升”和“额外 token / 延迟 / 计算开销”之间建立平衡。
> 适用范围：dsh-evolve-in-git **v0.5.0**（当前 `main` @ `ffc0de1`）。

---

## 目录

1. [现状：当前成本与性能特征](#1-现状当前成本与性能特征)
2. [设计理念：记忆检索必须可预算](#2-设计理念记忆检索必须可预算)
3. [成本来源分析](#3-成本来源分析)
   - [3.1 检索 token 成本](#31-检索-token-成本)
   - [3.2 embedding 与向量成本](#32-embedding-与向量成本)
   - [3.3 延迟成本](#33-延迟成本)
4. [成本控制策略](#4-成本控制策略)
   - [4.1 两级检索](#41-两级检索)
   - [4.2 缓存与失效](#42-缓存与失效)
   - [4.3 Token 预算](#43-token-预算)
   - [4.4 分阶段路线](#44-分阶段路线)
5. [与既有记忆机制的关系](#5-与既有记忆机制的关系)
6. [落地到当前代码的最小改造](#6-落地到当前代码的最小改造)
7. [设计要点](#7-设计要点)
8. [风险与后置项](#8-风险与后置项)
9. [附录：与其他设计文档的关系](#9-附录与其他设计文档的关系)

---

## 1. 现状：当前成本与性能特征

当前检索路径非常直接，但也非常“重”。

- `scanMemory`（`src/memory.ts:79-84`）每次调用都会：
  1. 递归扫描 memoryRoot 下所有 `.md`
  2. 读取每个文件的完整内容
  3. 解析 frontmatter
  4. 返回全部记录
- `searchMemory`（`src/memory.ts:102-110`）在扫描结果上做子串匹配，
  **没有 Top-K、没有字符预算、没有缓存**。
- `evolve_recall` 会把所有命中记录的完整正文返回给模型。
- `memoryTimeline` 同样全量扫描、全量返回。
- 当前没有 embedding、没有向量库，所以暂无 embedding 计算成本，
  但也没有索引和预算控制。

当前成本模型：

```text
每次 recall = O(N) 文件扫描 + O(N) 文件读取 + O(N) frontmatter 解析 + 全量正文输出
```

其中 N 是记忆文件总数。

风险：

1. **Token 风险**：记忆越多，单次 recall 返回越大，可能爆上下文。
2. **延迟风险**：没有索引和缓存，每次检索都重复做文件 I/O。
3. **扩展性风险**：当记忆从几十条增长到几百、几千条时，性能会明显退化。

---

## 2. 设计理念：记忆检索必须可预算

核心目标不是“让检索最快”，而是：

> 用可接受的延迟和 token 开销，换取足够的上下文提升。

成本和性能围绕三个预算设计：

| 预算 | 控制什么 | 建议配置 |
|---|---|---|
| Token 预算 | 注入多少记忆、返回多少正文 | `recallTopK`、`recallMaxChars`、`digestMaxRecords`、`digestMaxChars` |
| 延迟预算 | 检索多久返回 | 本地缓存、元数据索引、正文懒加载 |
| 计算预算 | 是否做 embedding、是否实时计算 | `embedding.enabled`、离线/增量索引 |

---

## 3. 成本来源分析

### 3.1 检索 token 成本

主要来自：

- 主动注入的记忆摘要
- `evolve_recall` 返回的正文
- `evolve_timeline` 返回的时间线
- 系统提示词中的静态工具说明

建议：

- **默认检索优先，注入最小化**
- `evolve_recall` 必须支持 `topK` 和 `maxChars`
- 返回时优先给 `title/kind/tags/score`，正文可截断或按需加载
- 主动注入只放 `persona + warning`，其他记忆按需召回

### 3.2 embedding 与向量成本

embedding 不是当前必需项，其成本包括：

- 模型加载/调用成本
- 向量存储空间
- 索引构建与刷新成本
- 记忆更新后向量失效与重算

建议：

- 第一阶段**不引入 embedding**
- 先用 BM25 + 规则过滤 + 时间衰减
- 如果未来需要语义检索：
  - 使用本地 embedding 模型
  - 只对长期记忆做向量化
  - 离线/增量更新，而不是每次写入都计算
  - 向量索引作为可再生缓存，丢失后可从 Markdown 重建

### 3.3 延迟成本

当前最大延迟来自：

- 每次扫描全部文件
- 每次读取全部正文
- Git 操作在热路径中执行

优化方向：

- 先扫描并缓存元数据，正文懒加载
- 用 `git rev-parse HEAD` 或文件 mtime 判断缓存是否失效
- 首次查询建立内存索引，后续查询直接命中缓存
- Git 操作只在写入/同步/冲突时执行，不进入检索热路径

---

## 4. 成本控制策略

### 4.1 两级检索

```text
第一级：元数据扫描
  - 只读取 frontmatter 或维护内存索引
  - 返回候选 id / title / kind / tags / score

第二级：正文加载
  - 只对 Top-K 候选读取正文
  - 按 maxChars 截断
```

这样避免为所有候选读取正文。

### 4.2 缓存与失效

```text
memoryIndex:
  - 由 scanMemory 构建
  - 按 repo HEAD 或文件 mtime 失效
  - 内存缓存优先，必要时落盘为 .dsh-evolve/index/
```

当前实现没有缓存，因此每次 recall 都是冷启动。

### 4.3 Token 预算

检索结果遵守：

```text
resultBytes <= recallMaxChars
resultCount <= recallTopK
contentPerItem <= contentMaxChars
```

主动注入遵守：

```text
digestBytes <= digestMaxChars
digestRecords <= digestMaxRecords
```

### 4.4 分阶段路线

| 阶段 | 目标 | 关键动作 |
|---|---|---|
| 0 | 现状 | O(N) 全量扫描，无 Top-K，无缓存 |
| 1 | 基础预算控制 | 增加 `topK/maxChars`，元数据索引，正文懒加载 |
| 2 | 关键词检索升级 | BM25 打分 + 缓存 + 时间衰减 |
| 3 | 可选语义检索 | 本地 embedding + 增量向量索引 + RRF |
| 4 | 自适应注入 | 根据会话任务动态决定注入多少 |

---

## 5. 与既有记忆机制的关系

成本与性能是记忆系统的横切约束：

```text
写入时机（MEMORY_WRITE_IN_TIMING.md）
   控制写入频率，减少无价值记忆
        │
        ▼
检索方式（MEMORY_RETRIEVAL.md）
   控制召回、排序、截断与注入
        │
        ▼
成本与性能（本文档）
   控制 token、延迟、embedding 计算
```

| 相关文档 | 成本性能如何衔接 |
|---|---|
| 三层记忆 | 短期层优先过期，长期层控制数量 |
| 写入时机 | 减少隐式噪声写入，从源头降低检索成本 |
| 检索方式 | `topK/maxChars` 是检索预算的直接体现 |
| 更新冲突 | 旧版本默认不检索，减少无效候选 |
| 遗忘机制 | 归档和容量淘汰降低 N，缓解性能退化 |
| 格式与可解释性 | 元数据索引依赖 frontmatter 结构化程度 |
| 隐私安全 | 敏感记忆禁止自动注入，也减少泄露面 |

---

## 6. 落地到当前代码的最小改造

- **检索核心**（`src/memory.ts`）：
  `scanMemory` 拆分为 `scanMemoryMeta` 与 `readMemoryBody`；
  `searchMemory` 增加 `topK`、`minScore`、`maxChars` 参数。
- **缓存层**（新增 `src/memory-index.ts` 或扩展 `src/memory.ts`）：
  内存元数据索引，按 `HEAD/mtime` 失效。
- **工具/命令**：
  - `evolve_recall` 增加 `topK/minScore/maxChars/includeContent`
  - `/evolve search` 同步支持 `--top K`、`--max-chars N`
- **主动注入**（`src/index.ts` system-prompt section）：
  静态 `PROMPT_TEXT` 扩展为动态摘要块，受 `digestMaxRecords/digestMaxChars` 约束。
- **配置**（`src/defaults.ts` / `src/config.ts`）：
  新增 `recallTopK`、`recallMaxChars`、`contentMaxChars`、
  `digestMaxRecords`、`digestMaxChars`、`embedding.enabled`。
- **观测指标**：
  可选记录 recall 次数、命中条数、返回字符数、缓存命中率、p50/p95 延迟。

---

## 7. 设计要点

1. **预算优先于绝对速度。**
   记忆检索不是搜索引擎，必须控制 token 和上下文膨胀。
2. **两级检索是基础优化。**
   元数据扫描和正文懒加载能显著降低 I/O 和 token。
3. **缓存必须可失效、可重建。**
   缓存不是事实源；Git HEAD 或文件 mtime 变化后应失效。
4. **embedding 后置且可关闭。**
   先证明 BM25 + 规则 + 时间衰减不够用，再引入语义检索。
5. **Git 操作远离检索热路径。**
   连接、同步、冲突处理不应在每次 recall 时执行。
6. **记忆收益应可观测。**
   记录 token、延迟、命中率，才能判断记忆是否划算。

---

## 8. 风险与后置项

- **缓存一致性**：缓存失效逻辑错误会返回过期记忆；需要清晰的 `HEAD/mtime` 策略。
- **Top-K 阈值难调**：过低漏召回，过高烧上下文；应可配置并允许用户调整。
- **embedding 成本失控**：实时 embedding 会显著增加延迟和计算；只允许离线/增量。
- **性能优化过早**：文件量少时不必引入复杂索引；先加预算控制，再优化缓存。
- **观测缺失**：没有指标时无法判断优化是否有效，也无法发现性能退化。

---

## 9. 附录：与其他设计文档的关系

- `MEMORY-ARCHITECTURE.md` 回答“记忆如何分层、如何流转”；
  `MEMORY_WRITE_IN_TIMING.md` 回答“什么时候写”；
  `MEMORY_RETRIEVAL.md` 回答“怎么取出来”；
  `MEMORY_UPDATE_CONFLICT.md` 回答“同一事实被更新或推翻时怎么办”；
  `MEMORY_FORGETTING.md` 回答“哪些记忆不该永久保留”；
  `MEMORY_FORMAT_EXPLAINABILITY.md` 回答“记忆应该长什么样”；
  `MEMORY_SKILL_DISCOVERY.md` 回答“技能如何被发现和可逆提升”；
  `MEMORY_PRIVACY_SECURITY.md` 回答“如何保护持久化数据”；
  本文档回答“如何让记忆系统在 token、延迟和计算上可持续”。
- 本文档是记忆系统的**横切约束**，与所有文档相关。
- 本文档仍是**可选扩展提案**，是否实施取决于后续需求。

---
