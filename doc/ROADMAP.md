# dsh-evolve-in-git Roadmap

> 状态：**开发继续（当前 0.6.0，MVP 已发布）**。
> 版本策略：**每个原子提交递增一个修订号**。例如 `0.5.0 → 0.5.1` 可以是一个最小特性、
> 一个 bug 修复、一次重构，或一个文档/测试提交。
> **1.0.0 不由本路线图预设**，最终可发行版本由用户决定；当前仍在开发。

---

## 版本规则

- 每个 commit 只做一件事，并对应下一个修订号。
- `patch` 修订（0.5.x）：bug 修复、重构、文档、配置/UI、测试。
- `minor` 修订（0.6.0 等）：仅当出现足够大的能力集或破坏性边界时使用。
- **自动测试和验收各自单独 commit**，不与功能实现混在同一个 commit。
- 每个含用户可配置项的 commit，必须同步完成配置、UI、文案和文档。
- 不做 `1.0.0` 规划；该版本由用户决定。

---

## 候选修订队列（每个条目 = 一个原子 commit）

> 编号会随实际提交顺序滚动更新；下面的顺序是当前计划，不是固定承诺。

### 文档与基线

- [ ] `0.5.1` docs: add memory design documents under `doc/`
- [ ] `0.5.2` docs: update roadmap with atomic revision strategy

### 内核解耦

- [ ] `0.5.3` refactor: introduce `MemoryCore` interface
- [ ] `0.5.4` refactor: remove DSH-specific imports from core modules
- [ ] `0.5.5` test: cover `MemoryCore` without a DSH runtime
- [ ] `0.5.6` test: cover DSH adapter tool/command mapping

### 检索 MVP

- [ ] `0.5.7` feat: recall `topK/minScore/maxChars`
- [ ] `0.5.8` feat: metadata index and cache
- [ ] `0.5.9` perf: lazy body loading for top-K candidates
- [ ] `0.5.10` test: retrieval budget and cache behavior

### 更新 MVP

- [ ] `0.5.11` feat: stable memory id and `updatedAt` frontmatter
- [ ] `0.5.12` feat: `evolve_update` overwrite/merge
- [ ] `0.5.13` feat: `status: superseded` and retrieval filtering
- [ ] `0.5.14` test: update and version-chain behavior

### 遗忘 MVP

- [ ] `0.5.15` feat: `evolve_forget/restore` with archiveRoot
- [ ] `0.5.16` feat: `expiresAt` filtering
- [ ] `0.5.17` test: archive/restore and TTL behavior

### 技能发现

- [ ] `0.5.18` feat: register repo `skillsRoot/enabled` as a DSH skill dir
- [ ] `0.5.19` feat: promote as `git mv drafts/<name> enabled/<name>`
- [ ] `0.5.20` test: reversible promotion path

### 隐私 MVP

- [ ] `0.5.21` feat: sensitive-content scan block/redact/ask
- [ ] `0.5.22` feat: `evolve_show` and `evolve_export`
- [ ] `0.5.23` test: privacy gate behavior

### 集成补齐

- [ ] `0.5.24` feat: `memory_search/save/update/delete` aliases
- [ ] `0.5.25` feat: session-start digest injection with persona + warning only
- [ ] `0.5.26` test: alias mapping and injection budget

### 验收

- [ ] `0.5.27` test: end-to-end acceptance suite
- [ ] `0.5.28` chore: CHANGELOG for completed revisions

---

## 配置与 UI 交付约定

每个新增或修改的特性，如果引入用户可配置项，必须同步完成：

- [ ] `src/defaults.ts`：提供默认值，避免魔法常量。
- [ ] `src/config.ts` / `src/index.ts:Config`：补充配置类型与运行时解析。
- [ ] `src/client/`：在设置界面中暴露可编辑字段。
- [ ] `src/client/locales.ts`：补充界面文案。
- [ ] `README.md`：说明配置项含义、默认值和示例。
- [ ] 命令/工具：如配置可通过 `/evolve config` 修改，需同步支持。

原则：**没有隐藏配置；用户能在 UI 或文档中看到并修改它。**

---

## TODO / 可选增强（不排期，待用户决定）

- 语义检索：本地 embedding + 向量索引 + RRF
- 中间件拦截模式：自动上下文增强
- 自动捕获：会话事件隐式写入短期记忆
- UI 会话菜单：“整理会话到记忆仓库”
- 多用户/多项目权限隔离
- 全仓库加密或字段级加密
- 自适应注入：根据任务动态决定注入量

---

## 决策记录

- **采用方案**：继续维护本仓库，按“内核/适配器解耦 + 原子修订”推进。
- **版本决定**：1.0.0 由用户决定；当前只做 0.5.x 原子修订。
- **测试策略**：功能、自动测试、验收分别提交。
- **本插件定位**：独立、可移植、可测试的 Git 记忆内核；DSH 只是第一适配器。
- **安全定位**：安全是约束，不是第一目的；不做企业级加密/ACL。
