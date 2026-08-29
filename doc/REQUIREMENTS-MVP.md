# dsh-evolve-in-git MVP 验收需求（0.5.x）

> 本文档定义 0.5.0 基线到「可验收 MVP」的需求与验收标准，是下游实现
> （t4–t10）、验证（t11–t17）、审查（t18–t24）、集成（t25）与最终验收
> （t26）的契约。范围由 `doc/ROADMAP.md` 的 0.5.3–0.5.26 候选修订队列推导，
> 并与 `doc/MEMORY_*.md` 设计文档保持一致。
>
> 基线事实（写本文件时实测）：`npx pnpm test` 通过 16 个测试；
> `pnpm` 不在 PATH，需用 `npx pnpm`；测试导入 `../lib/*.js`（编译产物），
> 因此验证前必须先 build。

---

## 1. 范围（Scope）

### 1.1 在范围内（MVP 必须交付）

按 ROADMAP 0.5.x 队列，7 个能力域 + 验收：

| 域 | ROADMAP 条目 | 下游任务 |
|---|---|---|
| 内核/适配器解耦 | 0.5.3–0.5.6 | t4 |
| 检索预算 | 0.5.7–0.5.10 | t5 |
| 更新 | 0.5.11–0.5.14 | t6 |
| 遗忘 | 0.5.15–0.5.17 | t7 |
| 技能发现 | 0.5.18–0.5.20 | t8 |
| 隐私门禁 | 0.5.21–0.5.23 | t9 |
| DSH 集成别名 + 摘要注入 | 0.5.24–0.5.26 | t10 |
| 端到端验收 + CHANGELOG | 0.5.27–0.5.28 | t26 |

### 1.2 明确排除（TODO，不排期，不得实现）

- 语义检索：本地 embedding、向量索引、RRF（ROADMAP TODO）
- 中间件拦截模式：自动上下文增强
- 自动捕获：会话事件隐式写入短期记忆
- UI 会话菜单：「整理会话到记忆仓库」
- 多用户 / 多项目权限隔离
- 全仓库加密或字段级加密
- 自适应注入：根据任务动态决定注入量

**验收红线**：任何排除项不得作为 MVP 的「完成」依据，也不得阻塞交付；
若实现中需要触碰这些能力，必须降级为「留接口、不实现」。

---

## 2. 总体验收门槛（Definition of Done）

对每一个能力域，同时满足：

1. **内核不依赖 DSH/Cordis**：核心模块（见 §3.1）不得 import 任何
   `@deepseek-ai/*` 包；用 `grep -rn "@deepseek-ai" src/<core>` 断言为空。
2. **适配器只做协议转换**：DSH 工具/命令/schema/prompt/route 全部收敛到
   `src/index.ts`（及 adapter 侧 `invariant.ts`、`config-route.ts`、`client/`），
   只把 `MemoryCore` 的结果映射成 host 视图/工具输出。
3. **无 DSH runtime 的测试**：每个能力的单元测试只构造 core（临时目录 +
   `MemoryCore`），不启动 Cordis/DSH host；DSH 适配器映射单独测试。
4. **验证命令全绿**（见 §6）：`npx pnpm build`、`npx pnpm typecheck`、
   `npx pnpm test`。
5. **配置同步**：每个新增用户可配置项同步到 §4 的全部 6 层
   （defaults / config / index.ts:Config / client / locales / README）。
6. **原子提交**：功能、自动测试、验收各为独立 commit；每个 commit 对应一个
   修订号，不把实现与测试混在一个 commit。

---

## 3. 分域验收标准

### 3.1 内核/适配器解耦（t4）

- 新增 `MemoryCore` 接口（建议 `src/core.ts` 或 `src/memory-core.ts`），
  方法覆盖后续全部能力：connect/status/remember/recall/update/forget/restore/
  listSkills/promoteSkill/show/export（参数见各域）。
- `MemoryCore` 及其实现在无 DSH runtime 下可被 `node --test` 直接实例化。
- 核心模块清单（DSH 零依赖）：`git.ts`、`memory.ts`、`strategy.ts`、
  `skill.ts`、`types.ts`、`defaults.ts`、`config.ts`、`loopback.ts`、
  以及新增的 `core.ts`。当前唯一泄漏点 `skill.ts` 的 `dshSkillsRoot()`
  （写 `~/.dsh/skills`）在 t8 中被「注册仓库技能目录」取代后必须移除。
- 适配器 `GitEvolutionService`（`src/index.ts`）不再内联业务逻辑（
  `resolveConfig/normalize*/rememberView/…` 移入 core），只保留工具/命令/
  schema/prompt/route 注册与映射。
- **测试**：`tests/core.spec.ts`（无 DSH runtime 直接测 MemoryCore）+
  `tests/harness.spec.ts` 扩展（DSH 工具名 ↔ core 方法、命令 ↔ core 方法映射）。

### 3.2 检索预算（t5）

- recall 增加预算参数 `topK`（默认 10）、`minScore`（默认 0）、
  `maxChars`（默认 8000），默认值来自配置而非魔法常量。
- 检索结果按 `score` 降序；`score < minScore` 的条目被丢弃；最多返回
  `topK` 条；返回正文累计不超过 `maxChars`（超出的条目截断或丢弃）。
- 引入元数据索引 + 缓存（0.5.8）：扫描产物（frontmatter/路径/标签）缓存，
  不重复读全量文件；命中缓存时不做二次全目录 walk。
- 惰性正文加载（0.5.9）：先按元数据排序/筛出 top-K 候选，再读候选正文，
  避免为所有文件读正文。
- 结果结构增加 `score`（`MEMORY_ITEM_SCHEMA` 同步）。
- **测试**：`tests/retrieval.spec.ts` 覆盖 topK 截断、minScore 过滤、
  maxChars 预算、缓存命中（同一目录二次检索不发生活跃 walk 或可观测到缓存复用）。

### 3.3 更新（t6）

- 稳定记忆 id（写入时生成并写入 frontmatter `id`），新增 `updatedAt`
  frontmatter（0.5.11）。
- 新增 `evolve_update`（工具 + `/evolve update` 命令），支持
  `overwrite`（默认）与 `merge` 两种模式，按 `id` 定位（0.5.12）。
- `status: superseded` + `supersededBy` frontmatter（0.5.13）：被取代的旧记忆
  在检索/时间线默认被过滤，仅新版本返回。
- **测试**：`tests/update.spec.ts` 覆盖 id 稳定、updatedAt 递增、
  overwrite 替换正文、merge 追加/合并、superseded 默认过滤、版本链可见。

### 3.4 遗忘（t7）

- 新增 `evolve_forget` / `evolve_restore`（工具 + 命令），forget 将记录移动到
  `archiveRoot`（默认 `.dsh-evolve/archive`），restore 移回（0.5.15）。
- `expiresAt` frontmatter 过滤（0.5.16）：`expiresAt` 已过期的记录在检索/
  时间线默认被过滤。
- **测试**：`tests/forget.spec.ts` 覆盖 forget→归档、restore→还原、
  expiresAt 过期默认过滤、未过期仍可见。

### 3.5 技能发现（t8）

- 用「注册仓库技能目录为 DSH 技能根」取代「复制到 `~/.dsh/skills`」：把
  `<repo>/<skillsRoot>/enabled` 注册为 DSH 文件系统技能目录（0.5.18）。
- promote 从「复制」改为 `git mv drafts/<name> enabled/<name>`（0.5.19），
  使技能留在 Git 仓库、可回滚、更新可传播。
- 目录约定：草稿在 `<skillsRoot>/drafts/<name>/SKILL.md`，启用后位于
  `<skillsRoot>/enabled/<name>/SKILL.md`。
- **测试**：`tests/skill.spec.ts` 覆盖可逆提升路径：promote 后 enabled 出现、
  无 `~/.dsh/skills` 副本、git 历史可回滚（`evolve_rollback` 可撤销提升）。

### 3.6 隐私门禁（t9）

- 敏感内容扫描（0.5.21）：对写入内容做模式匹配（电话/邮箱/密钥/身份证号/
  明文 token 等），按策略 block（拒绝写入）/ redact（脱敏后写入）/
  ask（返回需确认信号）处理。
- 新增 `evolve_show`（查看单条完整记忆）与 `evolve_export`（导出记忆为
  可读文件）（0.5.22）。
- **测试**：`tests/privacy.spec.ts` 覆盖三种策略、redact 不落盘明文敏感值、
  show/export 正常输出。

### 3.7 DSH 集成别名 + 摘要注入（t10）

- 新增工具别名 `memory_search`、`memory_save`、`memory_update`、
  `memory_delete`，分别映射到 recall/remember/update/forget（0.5.24）。
- 会话起始摘要注入（0.5.25）：只注入 `persona` + `warning` 两类，受预算
  约束（不注入全部记忆），格式稳定。
- **测试**：`tests/aliases.spec.ts`（别名映射）+ `tests/digest.spec.ts`
  （摘要只含 persona/warning、受预算约束）。

---

## 4. 配置面（用户可配置项清单）

> 任何新增可配置项必须同步到全部 6 层：`src/defaults.ts`（`DEFAULT_*`）、
> `src/config.ts`（`ConfigFile`）、`src/index.ts`（`Config` + schema）、
> `src/client/`（`settings-form.ts` + 卡片）、`src/client/locales.ts`、`README.md`。

| 配置键 | 默认值 | 所属域 | 说明 |
|---|---|---|---|
| `recallTopK` | `10` | 检索 | recall 最大返回条数 |
| `recallMinScore` | `0` | 检索 | 最低相关性分数 |
| `recallMaxChars` | `8000` | 检索 | 返回正文累计字符预算 |
| `archiveRoot` | `.dsh-evolve/archive` | 遗忘 | forget 归档目录（repo 内相对路径） |
| `skillsEnabled` | `true` | 技能发现 | 是否把仓库 `enabled` 目录注册为 DSH 技能根 |
| `privacyMode` | `ask` | 隐私 | `block` / `redact` / `ask` |
| `digestEnabled` | `true` | 集成 | 是否启用会话起始摘要注入 |
| `digestMaxChars` | `2000` | 集成 | 摘要注入的字符预算 |

已有键（沿用，不重复新增）：`repoPath`、`repoUrl`、`auth`、`memoryRoot`、
`skillsRoot`、`defaultBranch`、`remoteName`、`autoCommit`。

---

## 5. 契约性约束（跨域）

- **隐私优先于检索**：隐私门禁在写入路径执行，block 策略下敏感内容不得进入
  仓库；redact 下检索/导出只暴露脱敏值。
- **遗忘优先于检索/更新**：superseded 与 expiresAt 过期的记录默认从
  recall/timeline 过滤，但 `evolve_show` 仍可按 id 查看（审计）。
- **别名语义等价**：memory_* 与 evolve_* 在参数与返回结构上等价，
  仅名称不同；测试断言同一输入产生同一输出。
- **不破坏现有 16 个测试**：重构后 `npx pnpm test` 仍需全绿（可扩展断言）。

---

## 6. 验证命令

```sh
npx pnpm build       # 编译 src/ 与 src/client/ 到 lib/
npx pnpm typecheck   # tsc --noEmit 双 tsconfig
npx pnpm test        # node --import tsx/esm --test "tests/**/*.spec.ts"
```

> 测试导入 `../lib/*.js`，因此 test 前必须先 build；
> 建议验收脚本固定为 `npx pnpm build && npx pnpm test`。
> pnpm 不在 PATH 时一律使用 `npx pnpm`（或仓库内 `node_modules/.bin`）。

---

## 7. 交付物清单（验收时核对）

- [ ] `src/core.ts`（MemoryCore 接口 + 实现），core 无 `@deepseek-ai/*` 导入
- [ ] 7 个能力的工具/命令/配置全部落地
- [ ] 新增测试文件：core / retrieval / update / forget / skill / privacy /
      aliases / digest 对应的 `.spec.ts`，且 `npx pnpm test` 全绿
- [ ] 配置 6 层同步（§4 全部 8 个新键）
- [ ] README 的「Config」「Harness entry points」章节更新
- [ ] CHANGELOG 记录 0.5.1–0.5.28 修订