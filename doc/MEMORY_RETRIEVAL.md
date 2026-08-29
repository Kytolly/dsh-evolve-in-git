# dsh-evolve-in-git 记忆检索设计（Memory Retrieval）

> 本文档说明插件的**记忆检索现状**，给出面向 **RAG（检索增强生成）** 的**检索管道设计**，
> 覆盖关键词检索、语义检索、混合检索、时间衰减与主动注入，并绑定到
> `MEMORY-ARCHITECTURE.md` 与 `MEMORY_WRITE_IN_TIMING.md` 的设计上。
> 适用范围：dsh-evolve-in-git **v0.5.0**（当前 `main` @ `ffc0de1`）。

---

## 目录

1. [现状：当前记忆检索方式](#1-现状当前记忆检索方式)
2. [设计理念：检索的目的是 RAG](#2-设计理念检索的目的是-rag)
3. [五种检索方式](#3-五种检索方式)
   - [3.1 关键词检索：BM25 / 全文索引](#31-关键词检索bm25--全文索引)
   - [3.2 语义检索：embedding + 向量相似度](#32-语义检索embedding--向量相似度)
   - [3.3 混合检索](#33-混合检索)
   - [3.4 时间衰减](#34-时间衰减)
   - [3.5 主动注入](#35-主动注入)
4. [推荐分阶段路线](#4-推荐分阶段路线)
5. [与三层记忆 / 写入时机的关系](#5-与三层记忆--写入时机的关系)
6. [落地到当前代码的最小改造](#6-落地到当前代码的最小改造)
7. [设计要点](#7-设计要点)
8. [风险与后置项](#8-风险与后置项)
9. [附录：与 MEMORY-ARCHITECTURE / MEMORY_WRITE_IN_TIMING 的关系](#9-附录与-memory-architecture--memory_write_in_timing-的关系)

---

## 1. 现状：当前记忆检索方式

**当前检索是“线性扫描 + 子串匹配 + 按创建时间倒序”，不是 RAG 检索管道。**

- **关键词检索**：`searchMemory`（`src/memory.ts:102-110`）把
  `title + content + kind + tags` 拼成一个字符串，用 `haystack.includes(q)`
  做大小写不敏感的子串匹配，再按 `createdAt` 倒序。
- **时间线**：`memoryTimeline`（`src/memory.ts:87-89`）全量扫描后按 `createdAt` 倒序。
- **工具出口**：`evolve_recall`（`src/index.ts:560-572`）和
  `/evolve search`（`src/index.ts:912-933`）都复用同一条路径。
- **提示词注入**：`src/index.ts:116-121` 的 `PROMPT_TEXT` 是静态工具说明，
  没有任何动态记忆注入。
- **返回结构**：`MEMORY_ITEM_SCHEMA`（`src/index.ts:245-258`）返回
  `path/kind/title/branch/source/tags/createdAt/content`，具备基础溯源能力，
  但没有 `score`、`topK`、`minScore` 等检索语义。

当前能力对照：

| 能力 | 现状 |
|---|---|
| 关键词检索 | ✅ 有，但是最原始的子串匹配，不是 BM25/全文索引 |
| 语义检索 | ❌ 没有 embedding、没有向量 |
| 混合检索 | ❌ 没有 |
| 时间衰减 | ⚠️ 只有“按创建时间倒序”，没有权重衰减 |
| 主动注入 | ❌ 没有，每次新会话不会自动加载相关记忆 |
| Top-K / 上下文预算 | ❌ 没有，匹配多少返回多少，可能爆上下文 |
| 相关性排序 | ❌ 没有，命中即返回，无打分 |
| 结果溯源 | ✅ 返回了 `path/kind/title/createdAt/tags` |

结论：当前实现是**“记忆仓库的文件搜索”**，而不是面向 RAG 的**“检索增强生成”**。

---

## 2. 设计理念：检索的目的是 RAG

记忆写进去后，真正的问题不是“能不能找到”，而是：

> 在需要时，用最低的上下文成本，把**最相关、最新鲜、最可信**的记忆拼进生成上下文。

因此检索应当被看作一个管道，而不是一个 `grep`：

```text
query 理解
  → 召回（关键词 + 语义）
  → 过滤（kind / tag / 时间 / 价值）
  → 排序（相关性 + 时间衰减 + importance）
  → 截断（Top-K + 字符预算）
  → 组装（溯源信息 + 提示词注入）
```

这跟 `MEMORY-ARCHITECTURE.md` 里“工作记忆 = 宿主上下文 + 注入摘要 + 主动召回”是对齐的。

---

## 3. 五种检索方式

### 3.1 关键词检索：BM25 / 全文索引

**目标**：把当前子串匹配升级为真正的关键词检索。

当前差距：

- 没有分词、停用词、词干化
- 没有 TF-IDF / BM25 打分
- `go` 会命中 `algorithm`，噪声大
- 没有最小相关度阈值，所有命中都返回

建议：

- 第一阶段引入轻量 BM25/Okapi 打分，字段覆盖 `title/content/tags/kind`
- `title` 和 `tags` 的权重应高于正文
- 返回结果带 `score`，低于阈值直接丢弃
- 当前本地文件量级使用内存倒排索引即可，不必引入重型全文索引

### 3.2 语义检索：embedding + 向量相似度

**目标**：解决“用户说的是 A，记忆里写的是 B”的同义/改写问题。

当前差距：

- 完全没有向量化
- 没有 embedding 依赖，也没有向量索引存储

建议：

- **不建议第一版做**。语义检索会引入 embedding 模型、依赖体积、索引刷新和成本控制问题
- 若要预留，把向量索引设计成可再生的本地缓存，例如 `.dsh-evolve/index/vectors.json` 或 SQLite
- 语义检索适合后置于关键词检索：先关键词召回，再对候选做语义重排

### 3.3 混合检索

**目标**：结合语义召回和规则过滤，兼顾召回率与精确率。

建议：

- 真正适合作为最终形态，但不是当前优先项
- 轻量替代：**先关键词/BM25 召回 → 用 kind/tag/时间/价值规则过滤 → Top-K**
- 未来引入 embedding 后，用 RRF（Reciprocal Rank Fusion）融合两种打分
- 规则过滤应始终存在，因为记忆的 `kind` / `tag` 是高质量元数据，不应浪费

### 3.4 时间衰减

**目标**：让检索排序更符合“近期记忆通常更相关”。

当前差距：

- 只有 `createdAt` 倒序，没有真正的时间衰减
- 没有 `lastAccessedAt`，无法衡量“最近被使用”
- 没有 `importance`，老但重要的记忆会被无差别沉底

建议：

- 第一阶段就给排序函数加入时间衰减因子，例如：
  `finalScore = relevanceScore * exp(-λ * ageDays)`
- 给 `persona` / `warning` 这类规则性记忆更高的基础权重，避免被时间衰减误伤
- 可选字段 `importance / confidence / lastAccessedAt` 正好在这里使用

### 3.5 主动注入

**目标**：会话开始时，自动把最相关的记忆注入工作记忆。

当前差距：

- 现在只有静态 `PROMPT_TEXT`
- 没有任何“会话开始 → 计算相关性 → 注入 Top-K”的机制

建议：

- 必须严格限制预算：例如 Top-K 条数 + 总字符数
- 只常驻 `persona` + 高优先级 `warning`
- 其他记忆遵循“检索优先于注入”，避免每轮都带一堆上下文
- 主动注入的产物应当是**摘要块**，不是把整篇 memory 全部塞进去

---

## 4. 推荐分阶段路线

### 阶段 0：现状
`substring + kind/tag filter + createdAt 倒序`

### 阶段 1：关键词检索升级
- `searchMemory` 改成 BM25 打分
- 增加 `score`、`threshold`、`topK`
- 加入时间衰减
- `evolve_recall` 支持 `topK` / `minScore` 参数

这是收益最高、风险最低的一步。

### 阶段 2：RAG 化检索接口
- 增加 `evolve_retrieve` 或扩展 `evolve_recall`：
  - `query`
  - `kind/tag`
  - `topK`
  - `minScore`
  - `freshness`
  - `includeContent`
- 返回结构带溯源和 `score`，方便模型引用

### 阶段 3：主动注入
- 新会话开始时生成动态摘要块
- `persona + warning` 常驻
- 最近短期记忆 + 相关 Top-K 长期记忆注入
- 用 `digestMaxRecords / digestMaxChars` 控制预算

### 阶段 4：语义检索 / 混合检索
- 先做可再生的本地 embedding 索引
- 用 RRF 融合 BM25 + 向量
- 再考虑 LLM 重排

---

## 5. 与三层记忆 / 写入时机的关系

检索不是孤立能力，它和写入时机共同构成闭环：

```text
写入时机（MEMORY_WRITE_IN_TIMING.md）
   T1/T2/T3/T4 决定记忆怎么进仓库
        │
        ▼
三层记忆（MEMORY-ARCHITECTURE.md）
   短期层 / 长期层 / 工作记忆
        │
        ▼
检索方式（本文档）
   召回 → 过滤 → 排序 → 截断 → 组装 → 注入
        │
        ▼
工作记忆（宿主上下文 + 注入摘要 + 主动召回）
```

| 写入时机 | 检索如何配合 |
|---|---|
| T1 显式触发 | 写前调用检索查重；长期记忆进入可召回集合 |
| T2 隐式触发 | 短期记忆先入短期层；检索时短期层可优先或时间衰减 |
| T3 周期性整理 | 会话摘要候选依赖检索去重；确认后进入长期层 |
| T4 阈值触发 | 未来依赖检索做主题/标签频次统计 |

---

## 6. 落地到当前代码的最小改造

- **检索核心**（`src/memory.ts`）：
  `searchMemory` 从子串匹配升级为 BM25 打分，返回 `MemoryMeta & { score }`；
  增加 `topK`、`minScore`、`freshness` 参数。
- **数据模型**（`src/types.ts` / `src/git.ts:frontmatter`）：
  可选字段增加 `importance`、`confidence`、`lastAccessedAt`；
  `lastAccessedAt` 在每次检索命中后更新，作为时间衰减的辅助信号。
- **工具/命令**：
  - `evolve_recall` 扩展参数：`query / kind / tag / topK / minScore / freshness / includeContent`
  - `/evolve search` 同步支持 `--top K`、`--min-score N`、`--fresh N`
  - 可选新增 `evolve_retrieve` 作为面向 RAG 的显式检索入口
- **主动注入**（`src/index.ts` system-prompt section）：
  将静态 `PROMPT_TEXT` 扩展为“静态工具说明 + 动态摘要块”；
  摘要块由 `evolve_digest` 生成，受 `digestMaxRecords / digestMaxChars` 约束。
- **配置**（`src/defaults.ts` / `src/config.ts`）：
  新增 `recallTopK`、`recallMinScore`、`freshnessHalfLifeDays`、
  `digestMaxRecords`、`digestMaxChars`。
- **索引缓存**：
  第一阶段可每次扫描时构建内存倒排索引；若仓库变大，再引入
  `.dsh-evolve/index/` 作为可再生缓存。
- **复用现有设施**：`scanMemory`、frontmatter 解析、`kind/tag` 过滤、
  `autoCommit`、`rollback`。

---

## 7. 设计要点

1. **检索是管道，不是单次查找。**
   召回、过滤、排序、截断、组装必须分开设计，否则会退化成“返回所有命中文件”。
2. **排序公式要同时考虑相关性、新鲜度、kind 权重和 importance。**
   单靠时间倒序会埋没重要的 `persona/warning`，单靠关键词会忽略改写。
3. **Top-K 与字符预算是硬约束。**
   RAG 的上下文有限，检索结果必须可截断、可预算；不能“匹配多少返回多少”。
4. **语义检索后置，规则过滤前置。**
   `kind/tag` 是现有高质量信号，先用足；embedding 是增强而非基础。
5. **结果必须可溯源。**
   返回 `path/kind/title/createdAt/source`，让模型能引用来源，也方便用户审计。
6. **主动注入必须克制。**
   只常驻规则类记忆，其余靠按需召回；动态摘要块要限制条数和字符数。

---

## 8. 风险与后置项

- **BM25 对 Markdown 的解析**：frontmatter 与正文应分开索引，避免 YAML 字段污染正文权重。
- **Top-K 阈值难以一次调准**：过低漏召回，过高烧上下文；需要可配置且可观察。
- **embedding 索引漂移**：记忆文件更新后向量索引可能过期，必须支持重建和校验。
- **时间衰减误伤规则记忆**：`persona/warning` 需要独立的基础权重。
- **主动注入的隐私风险**：自动注入可能把敏感记忆带进新会话，需要过滤与预算。
- **大仓库性能**：当前全量扫描在文件少时可用，文件多时需要增量索引或缓存。

---

## 9. 附录：与 MEMORY-ARCHITECTURE / MEMORY_WRITE_IN_TIMING 的关系

- `MEMORY-ARCHITECTURE.md` 回答“记忆如何分层、如何流转”；
  `MEMORY_WRITE_IN_TIMING.md` 回答“什么时候写”；
  本文档回答“写进去之后怎么取出来、怎么回到生成上下文”。
- 本文档的“主动注入”对应 `MEMORY-ARCHITECTURE.md` §2.3 的注入策略。
- 本文档的“召回/过滤/排序”对应 `MEMORY-ARCHITECTURE.md` §2.2 的 **召回 recall** 转化。
- 本文档的“时间衰减”与 `MEMORY_WRITE_IN_TIMING.md` 的 T4 阈值触发互补：
  阈值触发依赖检索频次统计，时间衰减依赖写入/访问时间。
- 本文档仍是**可选扩展提案**，是否实施取决于后续需求。

---
