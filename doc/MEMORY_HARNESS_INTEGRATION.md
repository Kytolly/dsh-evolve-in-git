# dsh-evolve-in-git 与 DeepSeek Harness 的集成设计（Harness Integration）

> 本文档说明插件与 DeepSeek Harness 的**集成边界**：
> 采用“**可移植内核 + 薄 Harness 适配器**”架构，以工具调用和受限提示词注入为 MVP，
> 不把中间件拦截作为第一版实现。目标是换一个 Harness 框架时，核心记忆能力仍然可运行。
> 适用范围：dsh-evolve-in-git **v0.5.0**（当前 `main` @ `ffc0de1`）。

---

## 目录

1. [现状：当前集成方式](#1-现状当前集成方式)
2. [设计原则：可移植内核 + 薄适配器](#2-设计原则可移植内核--薄适配器)
   - [2.1 内核主循环（参考架构）](#21-内核主循环参考架构)
3. [集成模式选择](#3-集成模式选择)
   - [3.1 工具调用（主路径）](#31-工具调用主路径)
   - [3.2 中间件拦截（后置）](#32-中间件拦截后置)
   - [3.3 Prompt 注入（受限动态）](#33-prompt-注入受限动态)
   - [3.4 多轮动态调用](#34-多轮动态调用)
4. [内核与适配器分层](#4-内核与适配器分层)
5. [工具命名与 API 映射](#5-工具命名与-api-映射)
6. [与既有记忆机制的关系](#6-与既有记忆机制的关系)
7. [落地到当前代码的最小改造](#7-落地到当前代码的最小改造)
8. [设计要点](#8-设计要点)
9. [风险与后置项](#9-风险与后置项)
10. [附录：与其他设计文档的关系](#10-附录与其他设计文档的关系)

---

## 1. 现状：当前集成方式

当前插件已经是一个 DSH Cordis 插件，主要集成点：

- `src/index.ts:73-74` 声明 `inject = ['commands', 'tools', 'systemPrompt']`
- 注册 15 个 `evolve_*` 工具
- 注册 `/evolve` 命令
- `ctx.systemPrompt.section({ order: 116 })` 注入静态 `PROMPT_TEXT`
- 注册 loopback 配置路由

当前集成方式基本正确，但耦合度偏高：

- `GitEvolutionService` 同时承担内核逻辑、DSH 工具注册、命令解析、路由注册。
- 核心函数（`git.ts/memory.ts/strategy.ts/skill.ts`）基本不依赖 DSH，但边界没有固化。
- 没有明确的“内核 API”，换 Harness 时需要从 `index.ts` 中手工拆解。

结论：**当前集成可用，但需要显式解耦成“内核 + 适配器”。**

---

## 2. 设计原则：可移植内核 + 薄适配器

架构目标：

```text
┌────────────────────────────────────────────┐
│  Harness 适配层（DSH）                       │
│  - 工具注册 / 命令解析 / prompt section      │
│  - 配置路由 / 客户端 UI                      │
└───────────────────┬────────────────────────┘
                    │ 只调用 MemoryCore
┌───────────────────▼────────────────────────┐
│  可移植内核（无 DSH/Cordis 依赖）            │
│  - connect/status/remember/recall/timeline  │
│  - update/forget/skill draft/list/promote   │
│  - 检索 / 更新冲突 / 遗忘 / 隐私门禁        │
└────────────────────────────────────────────┘
```

原则：

1. 内核不导入 `@deepseek-ai/cordis`、`dsh-*`，只依赖 Node 标准库和配置对象。
2. 适配器只做协议转换：DSH 工具参数 → 内核方法 → DSH 返回结构。
3. 测试优先覆盖内核；适配器只做薄集成测试。
4. 换 Harness 时，只需重写适配器，不需要改内核。

### 2.1 内核主循环（参考架构）

参考的简洁主循环：

```text
用户输入
  → 记忆检索器
  → 注入相关记忆到 system prompt
  → 主模型生成
  → 记忆写入器
  → 保存有价值信息
```

这应该成为 `MemoryCore` 的**目标形态**，但 MVP 不必一步到位：

| 阶段 | 实现方式 |
|---|---|
| MVP | 检索器和写入器都是**工具**；注入只做受限静态/动态摘要块 |
| 增强 | 检索器可在会话开始自动运行；写入器可在会话结束或阈值触发 |
| 目标 | 完整 loop：检索 → 注入 → 生成 → 写入，但始终受预算和用户控制约束 |

内核 API 应围绕这个 loop 设计：

- `retrieve(query)`：记忆检索器
- `renderDigest(results)`：把检索结果渲染成可注入摘要
- `write(input)`：记忆写入器
- `update/forget`：维护记忆生命周期

这样无论 Harness 是工具调用还是中间件，都能复用同一内核。

---

## 3. 集成模式选择

### 3.1 工具调用（主路径）

**结论：MVP 采用工具调用。**

- 模型通过 `evolve_recall/remember/update/forget` 等工具显式操作记忆。
- 优点：
  - 低侵入、低开销、易测试
  - 模型自主决定何时查询
  - 不改变 Harness 请求链路
- 缺点：
  - 依赖模型记得调用工具
  - 冷启动时可能不主动召回

### 3.2 中间件拦截（后置）

**结论：MVP 不实现中间件拦截所有请求。**

原因：

- 侵入性强，与 Harness 请求生命周期强耦合
- 每个请求都过一遍记忆逻辑，token 和延迟不可控
- 当前阶段收益不明显，风险高

放入 TODO，未来仅在需要“自动上下文增强”时评估。

### 3.3 Prompt 注入（受限动态）

**结论：静态提示词保留，动态摘要块受限引入。**

- `PROMPT_TEXT` 保持静态工具说明，成本低。
- 会话开始时可注入一个受限动态摘要块：
  - 只放 `persona + warning`
  - 受 `digestMaxRecords / digestMaxChars` 约束
- 不自动在每轮 prompt 前插入全量记忆；其余记忆由模型按需召回。

### 3.4 多轮动态调用

**结论：支持。**

多轮对话中，模型可以随时调用：

- `memory_search / evolve_recall`
- `memory_save / evolve_remember`
- `memory_update / evolve_update`
- `memory_delete / evolve_forget`

这些操作是普通工具调用，天然支持多轮。DSH 工具注册表会保留工具历史，模型可在后续轮次继续调用。

---

## 4. 内核与适配器分层

建议新增内核接口：

```ts
interface MemoryCore {
  connect(): Promise<StatusView>
  status(): Promise<StatusView>
  remember(input: MemoryRecordInput): Promise<RememberView>
  recall(filter: RecallFilter): Promise<MemoryMeta[]>
  timeline(): Promise<MemoryMeta[]>
  update(id: string, patch: MemoryPatch): Promise<RememberView>
  forget(id: string, opts: ForgetOptions): Promise<ForgetView>
  skillDraft(input: SkillDraftInput): Promise<SkillDraft>
  skillList(): Promise<SkillDraftSummary[]>
  skillPromote(name: string): Promise<PromotedSkill>
}
```

当前 `GitEvolutionService` 的职责拆成：

- `MemoryCore`：核心记忆能力，无 DSH 依赖
- `DshMemoryAdapter`：工具/命令/prompt/route 适配
- `Client`：浏览器设置 UI

---

## 5. 工具命名与 API 映射

保留现有 `evolve_*` 工具以保证兼容；内核 API 使用中性命名，未来可挂到其他 Harness。

| 内核方法 | 当前 DSH 工具 | 未来中性工具别名 |
|---|---|---|
| `recall` | `evolve_recall` | `memory_search` |
| `remember` | `evolve_remember` | `memory_save` |
| `update` | `evolve_update` | `memory_update` |
| `forget` | `evolve_forget` | `memory_delete` |
| `timeline` | `evolve_timeline` | `memory_list` |

别名只是适配器层映射，不改内核。

---

## 6. 与既有记忆机制的关系

集成方式决定哪些能力进入 Harness，哪些留在内核：

```text
内核：写入/检索/更新/遗忘/技能/隐私
        │
        ▼
适配器：DSH 工具 + /evolve 命令 + prompt section + 配置路由
        │
        ▼
模型体验：多轮工具调用 + 受限主动注入
```

| 相关文档 | 集成如何体现 |
|---|---|
| 写入时机 | T1 显式触发通过工具/命令进入 |
| 检索方式 | `recall` 工具支持预算参数 |
| 更新冲突 | `update` 工具承载覆盖/合并/版本化 |
| 遗忘机制 | `forget` 工具承载归档/删除 |
| 技能发现 | `skillPromote` 改为可逆 Git 操作 |
| 成本性能 | 工具调用 + 受限注入控制开销 |

---

## 7. 落地到当前代码的最小改造

- **内核抽取**（新增 `src/core.ts` 或 `src/core/`）：
  定义 `MemoryCore` 接口和纯函数实现，不导入 DSH。
- **适配器改造**（`src/index.ts`）：
  `GitEvolutionService` 只保留 DSH 注册和协议转换。
- **测试**：
  - 内核测试：`tests/core.spec.ts` 不启动 DSH
  - 适配器测试：仅覆盖工具/命令映射
- **别名工具**：
  可选注册 `memory_search/save/update/delete` 别名，降低模型记忆负担。
- **MVP 范围**：
  - 保留现有工具
  - 不实现中间件拦截
  - 动态注入仅做 `persona + warning` 小摘要块
  - 向量/语义检索、自动捕获等进入 TODO

---

## 8. 设计要点

1. **先内核，后适配器。**
   功能正确性和可移植性来自内核；Harness 只是外壳。
2. **MVP 用工具调用，不做中间件。**
   中间件拦截开销大、耦合高，不符合当前阶段。
3. **自动注入要克制。**
   只注入规则类记忆；其余由模型决定何时查询。
4. **多轮动态调用是基本能力。**
   `memory_search/save/update/delete` 应作为稳定工具长期存在。
5. **工具命名兼容现有 `evolve_*`。**
   新名字只作为别名，避免破坏已有用户脚本和提示词。
6. **可扩展性优先于功能堆叠。**
   可选能力先进 issue/TODO，不阻塞内核稳定。

---

## 9. 风险与后置项

- **中间件模式暂缓**：未来若需要自动上下文增强，再评估请求拦截点。
- **自动注入扩展**：`evolve_digest` 的会话摘要注入需要宿主会话钩子，MVP 可先做命令/工具版本。
- **多轮工具历史**：工具定义变化可能影响 KV cache；DSH 宿主已有目录替换机制，适配器应保持工具 schema 稳定。
- **跨 Harness 可移植性**：内核需避免 `ctx/Service/inject` 等 DSH 概念。
- **别名工具维护**：别名会增多工具数量，需确认不会造成模型工具选择负担。

---

## 10. 附录：与其他设计文档的关系

- `MEMORY-ARCHITECTURE.md` 回答“记忆如何分层、如何流转”；
  `MEMORY_WRITE_IN_TIMING.md` 回答“什么时候写”；
  `MEMORY_RETRIEVAL.md` 回答“怎么取出来”；
  `MEMORY_UPDATE_CONFLICT.md` 回答“同一事实被更新或推翻时怎么办”；
  `MEMORY_FORGETTING.md` 回答“哪些记忆不该永久保留”；
  `MEMORY_FORMAT_EXPLAINABILITY.md` 回答“记忆应该长什么样”；
  `MEMORY_SKILL_DISCOVERY.md` 回答“技能如何被发现和可逆提升”；
  `MEMORY_PRIVACY_SECURITY.md` 回答“如何保护持久化数据”；
  `MEMORY_COST_PERFORMANCE.md` 回答“如何控制开销”；
  本文档回答“这些能力如何与 DeepSeek Harness 对接，同时保持可移植性”。
- 本文档是记忆系统的**集成边界**。
- 本文档仍是**可选扩展提案**，是否实施取决于后续需求。

---
