# dsh-evolve-in-git 记忆写入时机设计（Memory Write Timing）

> 本文档说明插件的**记忆写入现状**，给出**记忆写入时机（Write Timing）的四触发策略设计**，
> 并把它绑定到 `MEMORY-ARCHITECTURE.md` 的三层记忆模型上。
> 适用范围：dsh-evolve-in-git **v0.5.0**（当前 `main` @ `ffc0de1`）。

---

## 目录

1. [现状：当前记忆写入时机](#1-现状当前记忆写入时机)
2. [设计理念：四触发策略](#2-设计理念四触发策略)
   - [2.1 核心原则](#21-核心原则)
   - [2.2 触发矩阵](#22-触发矩阵)
   - [2.3 T1 显式触发](#23-t1-显式触发)
   - [2.4 T2 隐式触发](#24-t2-隐式触发)
   - [2.5 T3 周期性整理](#25-t3-周期性整理)
   - [2.6 T4 阈值触发](#26-t4-阈值触发)
3. [与三层记忆的关系](#3-与三层记忆的关系)
4. [落地到当前代码的最小改造](#4-落地到当前代码的最小改造)
5. [设计要点](#5-设计要点)
6. [风险与后置项](#6-风险与后置项)
7. [附录：与 MEMORY-ARCHITECTURE / ROADMAP 的关系](#7-附录与-memory-architecture--roadmap-的关系)

---

## 1. 现状：当前记忆写入时机

**当前实现只有一种写入时机：显式触发。** 没有隐式触发、没有会话结束整理、没有阈值触发。

- **唯一写入入口**：`evolve_remember` 工具（`src/index.ts:423-449`）与
  `/evolve remember <kind> <title> :: <content>` 命令（`src/index.ts:731-740`）。
- **写入路径**：

```text
用户/模型 → evolve_remember 工具 或 /evolve remember 命令
     → GitEvolutionService.rememberView()
     → writeMemoryRecord()
     → Markdown + YAML frontmatter + auto git commit
```

- **提示词现状**：`src/index.ts:116-121` 的 `PROMPT_TEXT` 只提示模型
  “use `evolve_remember` to persist a reusable memory note”，**没有定义什么时候该写、什么时候不该写**。
- **客户端现状**：`src/client/index.tsx` 只注册了 `settings.section`（设置页），
  没有“会话右侧三个点 → 整理会话到记忆仓库”这类会话级入口。
- **数据模型现状**：`MemoryRecordInput`（`src/types.ts:1-15`）只有
  `kind / title / content / tags / source / branch`，没有 `sessionId`、`expiresAt`、`consolidated`。
- **写前检查现状**：`searchMemory`（`src/memory.ts:102-110`）和 `memoryTimeline`（`src/memory.ts:87-89`）
  已经存在，但它们是**只读检索工具**，没有接入写入路径做查重或去重。
- **频次统计现状**：没有任何“同一主题重复出现 N 次”的计数机制。

结论：当前系统是**“记忆仓库 + 手动写入”**，而不是具备写入策略的“记忆系统”。

---

## 2. 设计理念：四触发策略

### 2.1 核心原则

> **默认不写，命中触发条件才写。不能什么都说“记住”。**

写入不是“把对话复制进仓库”，而是把**可复用、低噪声、跨会话有价值**的信息提炼出来。
因此每一次写入都必须能回答三个问题：

1. **谁触发**：显式用户指令、模型判断、会话整理，还是阈值？
2. **写到哪层**：短期层（`kind: session`）还是长期层（`note/warning/persona/skill`）？
3. **如何防噪声**：写前查重、价值过滤、预览确认、TTL 淘汰。

### 2.2 触发矩阵

| 触发 | 触发源 | 写入层级 | 动作 | 当前实现 | 优先级 |
|---|---|---|---|---|---|
| **T1 显式触发** | 用户输入指令 | 长期层 | 直接写 `note/warning/persona/skill` | ✅ 已有，缺写前查重 | 决策优先级最高 |
| **T2 隐式触发** | 模型判断长期价值 | 短期层 | 先写 `kind: session`，再巩固 | ❌ 没有 | 能力升级核心 |
| **T3 周期性整理** | 会话结束 / 用户点击菜单 | 短期候选 → 长期 | 摘要预览 → 用户确认 → 写长期 | ❌ 没有 | 工程实施最优先 |
| **T4 阈值触发** | 同类信息重复 N 次 | 短期 → 长期信号 | 达到阈值后提示巩固 | ❌ 没有 | 暂缓，必要时再设计 |

**决策优先级**：T1 > T2 > T3 > T4。冲突时按更高优先级处理。
**工程实施顺序**：先补齐 T1 的查重闭环 → 再做 T3 会话整理 → 再做 T2 隐式捕获 → T4 最后。

### 2.3 T1 显式触发

- **定义**：用户通过指令明确要求记忆。
  - 工具：`evolve_remember`
  - 命令：`/evolve remember <kind> <title> :: <content>`
- **语义**：用户已经完成策展，模型只负责结构化写入。
- **写入层级**：直接写长期层。
- **必须补强**：写前先调用 `evolve_recall` / `searchMemory` 查重，命中则合并而不是新建；
  涉及隐私、凭证、密钥时先确认。

### 2.4 T2 隐式触发

- **定义**：模型在对话中识别到“值得跨会话保留的信息”，主动写入。
- **关键不是“模型想记就记”，而是必须有价值信号**：
  - 用户纠正了我的错误、偏好、规则
  - 稳定的环境约束 / 用户人格 / 工作流约定
  - 跨会话需要复用的结论、决策、坑
  - 反复出现的主题或已确认的解决方案
- **写入层级**：先写短期层（`kind: session`，`source: <sessionId>`），
  再由巩固流程升格为长期层。
- **明确不写（负面清单）**：
  - 一次性事实、闲聊、当前任务的临时细节
  - 可以随时重新推导或重新查询的内容
  - 未经用户确认的推测
  - 隐私敏感、凭证、密钥类信息

### 2.5 T3 周期性整理

- **定义**：会话结束后自动或半自动总结关键信息并写入长期记忆。
- **简单设计**：会话右侧“三个点”菜单新增一项 **“整理会话到记忆仓库”**。
- **流程**：
  1. 读取当前会话上下文
  2. 提炼出 1–N 条候选记忆
  3. 展示摘要预览
  4. 用户确认后写入长期记忆
- **写入层级**：候选先进入短期层；用户勾选或确认的高价值项直接升格为长期。
- **意义**：这是“低门槛、有上下文、用户可控”的最重要兜底入口。
  会话结束时上下文仍然新鲜，此时整理成本最低，且用户点击提供了明确授权。

### 2.6 T4 阈值触发

- **定义**：某类信息重复出现 N 次才写入，避免噪声。
- **当前决策**：**不优先实现**，只在文档中保留扩展位。
- **未来方向**：基于 `evolve_recall` 的结果做主题/标签频次统计，
  达到阈值后提示“是否巩固为长期记忆”，而不是静默写入。

---

## 3. 与三层记忆的关系

写入时机不是孤立策略，它必须与 `MEMORY-ARCHITECTURE.md` 的三层记忆绑定：

```text
T1 显式触发 ──────────────► 长期层（note/warning/persona/skill）
T2 隐式触发 ──────────────► 短期层（kind=session, sessionId, expiresAt）
T3 周期性整理 ──候选摘要──► 短期层 ──用户确认──► 长期层
T4 阈值触发 ──────────────► 未来作为“短期 → 长期”的巩固信号
```

| 触发 | 初始层 | 后续流转 |
|---|---|---|
| T1 | 长期层 | 直接进入可召回集合；必要时回滚 |
| T2 | 短期层 | 经过 consolidation（去重→合并→升格） |
| T3 | 短期层 → 长期层 | 预览确认是 consolidation 的人工闸门 |
| T4 | 短期层 | 命中阈值后触发 consolidation 建议 |

---

## 4. 落地到当前代码的最小改造

- **数据模型**（`src/types.ts` / `src/git.ts:frontmatter`）：
  frontmatter 增加 `sessionId`、`expiresAt`、`consolidated` 字段；
  `kind: session` 即短期层。可选富字段：`importance`、`confidence`、`lastAccessedAt`。
- **配置**（`src/defaults.ts` / `src/config.ts` / `src/index.ts:Config`）：
  新增 `autoCapture`、`sessionNoteTtlDays`、`digestMaxRecords`、`digestMaxChars`、
  `consolidationMode: off|manual|auto-review`。
- **新工具/命令**：
  - `evolve_capture` —— 免分类快速记一条，自动 `kind=session` + `source=<sessionId>`（支撑 T2/T3 候选写入）
  - `evolve_summarize [--session <id>]` —— 生成当前会话摘要候选（支撑 T3）
  - `evolve_consolidate [--session <id>|--all]` —— 查重→合并→升格（支撑 T2/T3 后续流转）
  - `evolve_forget <path|ref> [--dry]` —— TTL/清理（支撑遗忘，后续实现）
- **客户端**：在 `src/client/` 增加会话菜单项注入（`session.menu` 或等价 slot），
  文案为“整理会话到记忆仓库”；若宿主暂无对应 slot，先提供 `/evolve summarize` 命令作为降级入口。
- **写入路径加固**：在 `rememberView` / `capture` 之前加一层
  “查重 + 价值过滤 + 预览确认”的 wrapper，复用 `searchMemory` 与 `autoCommit`。
- **复用现有设施**：`autoCommit`（每次写入一个 commit）、`rollback`（撤销写入）、
  `conflicts/resolve`（并发写入冲突兜底）、`skill draft/promote`（能力化出口）。

---

## 5. 设计要点

1. **写入时机是策略，不是存储问题。**
   存储位置沿用现有 Git 仓库，关键差异是“什么时候允许写、写到哪一层、写之前做什么检查”。
2. **显式优先，隐式克制。**
   T1 是最高优先级且必须保留；T2 必须先写短期层，不让模型直接污染长期层。
3. **隐式触发必须有价值信号和负面清单。**
   否则会退化成“模型什么都记”，长期记忆变成噪声。
4. **会话末整理是用户可控的兜底入口。**
   “会话右侧三个点 → 整理会话到记忆仓库”是低门槛、有上下文、有授权的设计，
   比全自动捕获更安全，比每轮判断更便宜。
5. **每条写入都可追溯、可回滚。**
   写入必须带 `source: <sessionId>`（T2/T3）并走 auto-commit，
   `evolve_rollback` 就是写入时机的“撤销键”。
6. **阈值触发正确后置。**
   在没有短期层、频次统计和去重基础时做阈值触发，会过早引入复杂度。

---

## 6. 风险与后置项

- **宿主会话钩子**：T2/T3 需要拿到当前 `sessionId` 和会话上下文，
  若插件层没有稳定的宿主 API，先通过命令/工具手动传入 `sessionId`。
- **客户端 slot 能力**：会话右侧菜单依赖宿主 UI slot；不可用时应提供命令降级路径。
- **摘要质量与隐私**：T3 的会话摘要必须在用户可见的预览中确认，
  敏感信息默认不进入候选。
- **查重准确性**：T1/T2 的写前查重不能只靠关键词，需至少结合 kind、标题、tags 和内容相似度。
- **TTL 与回滚关系**：`expiresAt` 清理、归档分支、`evolve_rollback` 的语义必须明确分层，
  避免“遗忘”与“撤销”混在一起。

---

## 7. 附录：与 MEMORY-ARCHITECTURE / ROADMAP 的关系

- 本文档是 `MEMORY-ARCHITECTURE.md` 的**配套设计**：它回答“什么时候写”，
  三层记忆架构回答“写到哪里、如何流转”。
- T2/T3 的落点对应 `MEMORY-ARCHITECTURE.md` §2.2 的 **捕获 capture** 与 **巩固 consolidation**。
- T4 对应 consolidation 的“重复出现”信号，但明确后置。
- 与 ROADMAP 的关系：本文档仍是**可选扩展提案**，不改变
  “当前 v0.5.0 只修 bug、不再新增功能”的既有声明；是否实施取决于后续需求。

---
