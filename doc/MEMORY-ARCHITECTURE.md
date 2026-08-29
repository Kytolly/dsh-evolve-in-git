# dsh-evolve-in-git 记忆架构（Memory Architecture）

> 本文档说明插件的**记忆存储现状**，给出**三层记忆（工作 / 短期 / 长期）的层级与转化设计**，
> 并在附录中收录 `ROADMAP.md`、`DSH_PLUGIN_MIGRATION.md` 与 README 中「Principal」设计思考的原文。
> 适用范围：dsh-evolve-in-git **v0.5.0**（当前 `main` @ `ffc0de1`）。

---

## 目录

1. [现状：当前记忆存储形式](#1-现状当前记忆存储形式)
2. [三层记忆设计](#2-三层记忆设计)
   - [2.1 层级关系](#21-层级关系)
   - [2.2 转化关系](#22-转化关系)
   - [2.3 注入策略（工作记忆的构成）](#23-注入策略工作记忆的构成)
   - [2.4 落地到当前代码的最小改造](#24-落地到当前代码的最小改造)
   - [2.5 设计要点](#25-设计要点)
3. [附录 A：ROADMAP（原文收录）](#附录-a：roadmap原文收录)
4. [附录 B：DSH 插件清单 & Ubuntu 迁移备忘（原文收录）](#附录-b：dsh-插件清单--ubuntu-迁移备忘原文收录)
5. [附录 C：README「Principal」设计思考（原文收录）](#附录-c：readmeprincipal设计思考原文收录)

---

## 1. 现状：当前记忆存储形式

**当前实现是"单一的、Git 持久化的长期记忆库"，不存在三层记忆架构。**

- **载体**：一个用户配置的 Git 仓库（`repoPath` / `repoUrl`），记忆就是仓库里的普通文件。
- **文件格式**：Markdown + YAML frontmatter，路径规则
  `<repo>/<memoryRoot>/<kind>/<时间戳>-<标题slug>.md`（默认 `memoryRoot: .dsh-evolve/memory`）。
- **记录结构**：frontmatter 含 `kind / title / branch / source / tags / createdAt`，正文为记忆内容；
  每次写入默认**自动 git 提交**（`autoCommit`，见 `src/git.ts`）。
- **读取方式**：扫描 + 解析 frontmatter 得到时间线（`evolve_timeline`）与关键词检索
  （`evolve_recall`，可按 `kind` / `tag` 过滤）；跨分支对比用 `evolve_branch_diff`。
- **5 种 kind**：`session | skill | warning | persona | note` —— 这只是"分类标签"，不是分层存储。

**对照三种模式：**

| 概念 | 现状 | 说明 |
|---|---|---|
| 长期记忆 | ✅ 就是它 | 跨会话、可检索、Git 版本化、支持回滚/冲突解决/技能提升 |
| 短期记忆 | ⚠️ 只有"标签"没有"模式" | `kind: session` 语义上像短期记忆，但物理存储与长期记忆完全相同：同一仓库、同样 auto-commit、**没有过期/淘汰/自动合并**；也没有自动会话捕获（需手动 `evolve_remember` 并填 `source` 关联会话） |
| 工作记忆 | ❌ 没有 | 当前会话上下文由 **DSH 宿主**承担（`session-persistence-jsonl`）；插件只提供"按需召回"（`evolve_recall`），本质是**检索**而非工作记忆 |

> 源码验证：整个 `src/` 没有 `expire / TTL / decay / consolidation / 自动捕获` 相关代码，
> 即"写进去就永久保留（直到手动 rollback/清理）"。

---

## 2. 三层记忆设计

核心原则：**工作记忆不是第三个存储，而是"注意力层"**（宿主会话上下文 + 注入摘要 + 主动召回的投影），
三层之间用明确的转化规则串成闭环。

### 2.1 层级关系

```
┌─────────────────────────────────────────────────────────┐
│  工作记忆 Working  ＝  宿主会话上下文 + 注入摘要 + 主动召回   │  ← 不落地存储，每会话重建
└──────────────────────────┬──────────────────────────────┘
        ▲ 注入/召回          │ 捕获（自动、低门槛）
        │                   ▼
┌─────────────────────────────────────────────────────────┐
│  短期记忆 Short  ＝  kind=session 记录（sessionId + TTL）   │  ← 暂存层：高频写入、低策展
└──────────────────────────┬──────────────────────────────┘
        ▲ 降级/回写          │ 巩固（会话结束/定期：去重→合并→升格）
        │                   ▼
┌─────────────────────────────────────────────────────────┐
│  长期记忆 Long  ＝  note/warning/persona/skill（版本化）      │  ← 规范层：低频写入、高策展
└──────────────────────────┬──────────────────────────────┘
                           │ 能力化
                           ▼
                   技能草稿 → 提升为可调用 DSH 技能（现有流程）
```

| 层级 | 写入频率 | 策展程度 | 保留策略 | 作用域 | 存储位置 |
|---|---|---|---|---|---|
| 工作记忆 | 极高（宿主自动） | 无 | 会话结束即弃 | 当前会话 | **不存储**——宿主 session JSONL + 插件注入摘要 + 召回结果 |
| 短期记忆 | 高（自动捕获） | 低 | TTL 过期 / 巩固后转出 | 单会话/近 N 天 | `<repo>/<memoryRoot>/session/...`，frontmatter 加 `sessionId`、`expiresAt` |
| 长期记忆 | 低（人工/巩固写入） | 高 | 永久（可回滚） | 跨会话 | 现有 `<repo>/<memoryRoot>/<kind>/...`（kind: note/warning/persona/skill） |

**关键点**：不要把工作记忆做成第三个 Git 存储。宿主已有 `session-persistence-jsonl`（会话上下文持久化），
插件再存一份就是重复 + 烧上下文预算。工作记忆在插件侧只体现为两件事：
**注入摘要**（会话开始时把最相关的长期记忆 + 最近短期记忆拼进 system prompt，设大小上限）和
**主动召回**（`evolve_recall` 按需拉取）。

### 2.2 转化关系

5 条主转化 + 1 条能力化，全部走 Git（每步都是显式 commit，可回滚）：

| 转化 | 方向 | 触发时机 | 规则 | 幂等/安全 |
|---|---|---|---|---|
| **捕获 capture** | 工作→短期 | 会话事件（消息、工具调用、关键决策、会话开始/结束） | 自动写 `kind: session`，`source: <sessionId>`，**免分类负担**（标题+内容即可），批量化提交（每 N 条或会话结束时一次 commit，避免 git 噪音） | 低门槛；可设 `autoCapture: off` 降级为手动 |
| **巩固 consolidation** | 短期→长期 | 会话结束 / 每 N 个会话 / agent 判断（复用现有 `shouldOfferSkillPromotion` 启发式 + 新增"重复出现、用户纠正、人格/规则声明"信号） | ①先用 `evolve_recall` 查重 → ②合并进已有长期记录（去重、补 tags、附 origin sessionId）→ ③按价值升格为 `note/warning/persona/skill` 或直接进技能草稿 → ④原短期记录标记 `consolidated: <commit>` 或按 TTL 清理 | 每次转化一个 commit，可 `evolve_rollback` |
| **遗忘 decay** | 短期→废弃 | TTL 到期（如未巩固的 session 记录 30 天） | 移入归档分支 `archive/session/<id>` 或直接删除；全量可 dry-run 预览 | Git 兜底，可恢复 |
| **召回 recall** | 长期→工作 | agent 需要 / 会话开始注入 | 现有 `evolve_recall`（关键词+kind/tag 过滤）+ 自动摘要注入 | 只读 |
| **降级/回写** | 长期→短期 | 会话中发现长期记录过时/冲突 | agent 写一条 session 记录标记"待修正"，下次巩固时更新长期记录 | 显式操作 |
| **能力化** | 长期→技能 | 复用现有 `evolve_skill_draft → list → promote` | 长期记忆里的稳定规则蒸馏为 SKILL.md，提升到 `~/.dsh/skills` | 现有流程，kebab-case + frontmatter 校验 |

**生命周期流转：**

```
会话进行中（工作记忆 = 宿主上下文 + 注入摘要 + 主动召回）
    │ 捕获（自动、低门槛）
    ▼
短期记忆（kind=session, sessionId, TTL）
    │ 巩固（会话结束/定期/agent 判断：去重→合并→升格）
    ▼
长期记忆（note/warning/persona/skill，版本化）
    │ 召回（evolve_recall / 摘要注入）
    ▼
工作记忆（回到顶部）
短期记忆未巩固部分 → 过期/清理（归档分支 或 删除）
长期记忆 → 技能草稿 → 提升为技能（能力化，闭环出口）
```

### 2.3 注入策略（工作记忆的构成）

避免上下文膨胀，分三档：

1. **常驻注入（每次会话）**：`persona` 类 + 高优先级 `warning`（用户规则），数量上限可配
   （如 5 条 / 2000 字符）。当前插件只注入静态的 `PROMPT_TEXT`（`src/index.ts`），
   可扩展为在同一 system-prompt section（`order: 116`）里拼一个**动态摘要块**。
2. **会话开始摘要**：最近短期记录摘要 + 与当前任务关键词相关的前 K 条长期记忆（K 可配）。
3. **按需召回**：`evolve_recall`，不占常驻预算。

原则：**检索优先于注入**——只有 persona/规则类常驻，其余靠召回，避免每轮都带一堆记忆。

### 2.4 落地到当前代码的最小改造

- **数据模型**（`src/types.ts` / `src/git.ts:frontmatter`）：frontmatter 增加 `sessionId`、`expiresAt`、
  `consolidated` 字段；`kind: session` 即短期层。可扩展 README「Principal」中的富字段（可选）：
  `importance`、`confidence`、`lastAccessedAt`（用于时间衰减权重与容量淘汰，见附录 C）。
- **配置**（`src/defaults.ts` / `src/config.ts`）：新增 `autoCapture`、`sessionNoteTtlDays`、
  `digestMaxRecords`、`digestMaxChars`、`consolidationMode: off|manual|auto-review`。
- **新工具/命令**：
  - `evolve_capture` —— 免分类快速记一条，自动 kind=session + source=sessionId
  - `evolve_consolidate [--session <id>|--all]` —— 查重→合并→升格，dry-run 可预览
  - `evolve_digest` —— 生成当前工作记忆摘要
  - `evolve_forget <path|ref> [--dry]` —— TTL/清理，走现有 `revertCommit` 的安全边界
- **存储布局**：短期走 `<repo>/<memoryRoot>/session/<时间戳>-<slug>.md`，与现有扫描器
  （`src/memory.ts`）天然兼容，`memoryTimeline` / `searchMemory` 直接可用；长期沿用现有 kind 目录。
- **复用现有设施**：`autoCommit`（每步转化都是 commit）、`rollback`（安全撤销转化）、
  `conflicts/resolve`（多会话并发巩固的冲突兜底）、`skill draft/promote`（能力化闭环）、
  system-prompt section 注入（摘要块）。

### 2.5 设计要点

1. **分层 = 按"策展成本"分层，不是按"存储位置"分层** —— 三个层共用同一个 Git 仓库，
   靠 `kind` + 目录 + 字段区分；转化就是"复制/移动文件 + 一次 commit"，安全且可回滚。
2. **工作记忆保持"无状态"** —— 它是宿主会话上下文 + 动态摘要 + 召回结果，
   插件只负责"生成摘要"和"按需检索"，不负责存储，否则与宿主重复。
3. **短期必须自动捕获，长期必须人工/半自动策展** —— 捕获门槛高就用不起来，长期不策展就变成噪声。
4. **每条转化都进 Git** —— 巩固、遗忘、回写全部是显式 commit，
   `evolve_rollback` 就是整个系统的"撤销键"，冲突用现有 resolver 兜底。
5. **能力化的终点是技能** —— "记忆 → 技能"是这套系统唯一的"自我进化"出口，
   正好接上现有的 `evolve-process` 技能。

> **与 ROADMAP 的关系**：ROADMAP 中 0.4.0/0.5.0 的"分支/时间线、召回/注入"已在本插件实现；
> 本设计是**可选的扩展提案**（三层记忆），与 ROADMAP"不再新增功能、仅修 bug"的声明相区分，
> 是否实施取决于后续需求。

---