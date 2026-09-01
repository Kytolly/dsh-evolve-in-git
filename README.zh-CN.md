# dsh-evolve-in-git

<p align="center">
  <a href="https://github.com/Kytolly/dsh-evolve-in-git"><img src="https://img.shields.io/badge/DeepSeek%20Harness-plugin-4D6BFE" alt="DeepSeek Harness 插件"></a>
  <img src="https://img.shields.io/badge/version-0.6.3-4D6BFE" alt="版本 0.6.3">
  <img src="https://img.shields.io/badge/license-MIT-green" alt="MIT 许可证">
</p>

<p align="center">
  <a href="./README.md">English</a> · <a href="./README.zh-CN.md">中文</a>
</p>

面向 DeepSeek Harness 的 Git 长效记忆与演化插件。

## 目录

- [简介](#简介)
- [架构](#架构)
- [数据布局](#数据布局)
- [快速安装](#快速安装)
- [使用方式](#使用方式)
- [配置](#配置)
- [Harness 入口](#harness-入口)
- [浏览器端](#浏览器端)
- [开发](#开发)
- [发布说明](#发布说明)
- [许可证](#许可证)

## 简介

这个插件把用户指定或预配置的 Git 仓库当作记忆存储：把会话笔记、分支记录、
可复用的技能草稿写进仓库，再作为普通 Git 历史提交。

## 架构

代码拆成 **无框架 core** 和薄薄的 **DSH adapter** 两层：

- `src/core.ts`（`GitMemoryCore`）是可移植边界：只依赖 Node 内置模块与同级
  core 模块，不依赖任何 `@deepseek-ai/*` 包；它在宿主提供的配置之上叠加磁盘
  配置文件来解析最终配置。
- `src/index.ts`（`GitEvolutionService`）是 adapter：注册 Cordis 工具、
  `/evolve` 命令、system-prompt 段落、技能 provider 和配置路由，然后把所有
  入口映射到 `GitMemoryCore`。

| 模块 | 职责 |
| --- | --- |
| `src/git.ts` | 调用 `git`：clone/open、status、分支操作、push/fetch、commit、`git mv`、冲突、回滚。 |
| `src/memory.ts` + `src/memory-index.ts` | Markdown + YAML frontmatter 扫描；元数据索引缓存（HEAD + mtime 签名）；带预算的召回；时间线。 |
| `src/update.ts` | 版本化更新：新 active 记录 + `supersedes`/`supersededBy`；旧文件永不删除。 |
| `src/forget.ts` | 软删除（移到 `archiveRoot`）与恢复。 |
| `src/privacy.ts` | 敏感内容检测、敏感级分类、脱敏、导出过滤。 |
| `src/skill.ts` | `drafts/` ↔ `enabled/` 技能发现；用 `git mv` 提升/降级；内置技能同步。 |
| `src/strategy.ts` | slug/段名清洗、由记忆生成草稿、演化建议、预览。 |
| `src/harness.ts` | `/evolve` 命令归一化/解析，以及 help/usage/safety 文案。 |
| `src/config.ts` + `src/defaults.ts` | 配置文件读写/合并与插件默认值。 |
| `src/invariant.ts` | 无运行时不变量（事实源是已配置的 Git 仓库）。 |
| `src/loopback.ts` + `src/config-route.ts` | 仅供 loopback 访问的 `/api/evolve-git/config` 路由，给配置文件编辑器用。 |
| `src/client/` | 浏览器设置分区（`evolve-git` slot）与配置文件编辑器。 |

## 数据布局

- **记忆**：`<repo>/<memoryRoot>/<kind>/<timestamp>-<slug>-<id>.md`，每条记录一个
  Markdown 文件，YAML frontmatter（`kind`、`title`、`branch`、`source`、
  `tags`、`createdAt`、`id`、`updatedAt`、`status`、`supersedes`、
  `supersededBy`、`expiresAt`、`sensitivity`）后接正文。
- **技能**：`<repo>/<skillsRoot>/drafts/<name>/SKILL.md`（可提升）与
  `<repo>/<skillsRoot>/enabled/<name>/SKILL.md`（可被发现）。提升是两者之间的
  `git mv`，不是复制，因此可逆且留在历史里。
- **归档**：`<repo>/<archiveRoot>/…`（与记忆相同的相对布局）；`evolve_forget`
  把记录移到这里，使其离开召回/时间线但仍可恢复。`archiveRoot` 必须保持在
  `memoryRoot` 之外。

## 快速安装

```sh
# 1) 安装到某个 profile（例如 web）
dsh plugin --profile web add github:Kytolly/dsh-evolve-in-git

# 2) 重启该 profile，并让它指向你自己的记忆仓库
#    （编辑 ~/.dsh/evolve-in-git.json，或用 Settings → 演进记忆 表单）
dsh --profile web
```

安装后先验证组合是否生效：

```sh
dsh --profile web --dump-config   # 应能看到 evolve-git 这一行
dsh --profile web                 # 启动 profile；加载后模型能看到 evolve_* 工具
```

> **Windows 本地安装。** 带空格的 `file:` 路径（如 `D:\Deepseek Harness\…`）
> 会被 CLI 参数解析器拆开，所以请使用不含空格的路径（junction 或短路径）：
>
> ```sh
> dsh plugin --profile web add file:C:/Users/13928/.dsh/evolve-in-git
> ```
>
> 已构建的 `lib/`（含浏览器 `lib/client.js`）已提交进仓库，因此 `github:`
> 方式可直接使用；改动源码后请本地 `pnpm build` 并提交构建产物。

## 使用方式

### 自然语言使用

不需要记工具名：直接描述你想要的结果，模型会自动选择 `evolve_*` / `memory_*`
工具：

| 你这样说（或类似） | 模型会调用 |
| --- | --- |
| "记住：每次 X 发生就做 Y" | `evolve_remember` / `memory_save` |
| "有没有关于部署流程的记忆？" | `evolve_recall` / `memory_search` |
| "读一下我最近的记忆历史" | `evolve_timeline` |
| "把这条警告变成可复用技能" | `evolve_skill_draft` → `evolve_skill_promote` |
| "记忆仓库现在是什么状态？" | `evolve_status` / `evolve_branches` |
| "撤销上次的记忆提交" | `evolve_rollback` |

### 指令调用（/evolve）

需要确定性的手动控制时，直接输入 `/evolve <子命令>`：

```sh
/evolve remember warning "坑" :: <内容>
/evolve search deploy
/evolve skill list
/evolve skill promote evolve-process
/evolve status
/evolve help
```

完整命令参考见 [Harness 入口](#harness-入口)。

## 配置

> **Web 设置 UI（v0.1.4+）。** 插件内置浏览器端，在 web profile 的设置页注册
> 一个一级 **Settings → 演进记忆** 分区（通过 `settings.section` slot）。表单
> 用一个 `SettingsScope` 适配器直接读写用户配置文件（经 loopback-only 的
> `/api/evolve-git/config` 路由），所以表单显示的就是真正生效的值（默认值叠加
> 文件值），保存即写文件。嵌套的 `auth` 以合并对象写入，`auth.token` 字段
> 只写（secret，读回时脱敏）。安装后需重启 profile 让客户端清单重新扫描。

- `repoPath` - 存放记忆和技能的本地 Git 检出目录，默认 `~/.dsh-evolve-in-git/remote-memory`。
- `repoUrl` - 远程记忆仓库。**插件不内置任何个人默认值**：内置默认是占位符 `https://github.com/<your-github-username>/<your-memory-repo>.git`，请配置你自己的仓库。
- `auth` - 私有访问的 Git 认证，默认 SSH 优先、支持 token。
- `memoryRoot` - 记忆记录写入位置，默认 `.dsh-evolve/memory`。
- `skillsRoot` - 技能草稿写入位置，默认 `.dsh-evolve/skills`。
- `defaultBranch` - 新建分支的起点，默认 `main`。
- `remoteName` - fetch/push 的远程名，默认 `origin`。
- `autoCommit` - 写入是否自动提交，默认 `true`。
- `archiveRoot` - `evolve_forget` 移动记录的位置，默认 `.dsh-evolve/archive`。
- `recallTopK` - `evolve_recall` 最多返回条数，默认 `10`。
- `recallMinScore` - 保留结果的最低相关度，默认 `0`。
- `recallMaxChars` - 召回内容累计字符预算，默认 `8000`。
- `privacyMode` - 敏感内容写入闸门，默认 `ask`。`block` 检测到敏感内容即拒绝写入；`redact` 写入脱敏后的内容（绝不落盘明文）；`ask` 照常写入并标注 `sensitivity` 供复核。
- `digestEnabled` - 是否在会话开始注入 `persona`+`warning` 摘要，默认 `true`。
- `digestMaxRecords` - 会话开始摘要中 `persona`/`warning` 的最大条数，默认 `5`。
- `digestMaxChars` - 会话开始摘要的最大字符数，默认 `2000`。

### 认证

- `auth.mode: "ssh"` - 使用 `ssh` 或自定义 `sshCommand`。
- `auth.mode: "token"` - 使用 `token` 或来自 `tokenEnv` 的 token，配 GitHub 风格 `Authorization` 头。

### 隐私写入闸门

每次记忆写入都会经过隐私闸门（邮箱、手机号、身份证、银行卡、AWS key、
GitHub token、私钥、`password:` 形式密钥）。`privacyMode` 控制响应：

- `block` - 检测到敏感内容即拒绝写入。
- `redact` - 把检测到的片段替换为 `<REDACTED>` 再落盘，不存明文。
- `ask`（默认）- 照常存储，并记录 `sensitivity` 供复核确认。

`evolve_show`/`evolve_export` 会遵循记录的 `sensitivity` 级别，导出默认排除
`secret` 记录；没有记录 `sensitivity` 的旧记录（闸门出现之前写的）按 `secret`
处理，永远不会被意外导出。

闸门只覆盖 **记忆写入**（`writeMemoryRecord`/`updateMemory`，即
`evolve_remember`/`memory_save`/`evolve_update`/`memory_update`）。技能草稿写入
（`writeSkillDraft`/`saveSkillDraftFromRecord`）本版本**刻意不经过**隐私闸门；
提升前请检查草稿是否含密钥。

> **召回评分。** `evolve_recall`/`memory_search` 只对记录元数据（`title`、
> `kind`、`tags`、`branch`、`source`）打分；正文只对 top 命中懒加载，不参与
> 相关度评分。人工命令 `/evolve search <q>` 用的是同一套元数据索引召回，返回
> 同样的排序结果，而不是另一种匹配器。
>
> **归档约束。** `archiveRoot` 必须保持在 `memoryRoot` 之外（默认
> `.dsh-evolve/archive` 满足）。如果把 `archiveRoot` 指向 `memoryRoot` 内部，
> 被遗忘的记录仍会被扫描，不会消失。

### 用户配置文件

每个 DSH 用户在 `$DSH_HOME/evolve-in-git.json`（默认
`~/.dsh/evolve-in-git.json`）保留一份本地配置。它**只属于用户本地、永远不进入
任何 Git 仓库**——不要提交它。它是**唯一用户配置层**：Web Settings → 演进记忆
表单读写的正是这个文件（显示默认值叠加文件值，保存即写文件），
`/evolve config show|open|refresh|set <key> <value>` 命令也编辑它，内嵌的
配置文件编辑器直接打开原始 JSON。

示例：

```json
{
  "repoPath": "/absolute/path/to/your/local-memory-checkout",
  "repoUrl": "https://github.com/<your-github-username>/<your-memory-repo>.git"
}
```

> **永远不要把访问 token 放进这个文件**——用 `auth.tokenEnv` 指向环境变量，
> 或用 Web 设置里的 token 字段（只写）。

Web Settings → 演进记忆 分区还内嵌一个 **配置文件编辑器**，直接打开该文件、
以原始 JSON 编辑，并通过 loopback-only 的 `/api/evolve-git/config` 路由保存
（保存立即生效）。

## Harness 入口

插件面向当前 Harness `0.1.1-rc.2` 的 commands/tools/system prompt/invariants
宿主契约（peerDependencies 为 `^0.1.1-rc.2`）。装进 profile 后重启该 profile，
让 bundle 层完成组合。

### 工具

- `evolve_connect`
- `evolve_status`
- `evolve_remember`
- `evolve_update`
- `evolve_forget`
- `evolve_restore`
- `evolve_show`
- `evolve_export`
- `evolve_branches`
- `evolve_branch_switch`
- `evolve_branch_diff`
- `evolve_skill_draft`
- `evolve_skill_list`
- `evolve_skill_promote`
- `evolve_skill_demote`
- `evolve_rollback`
- `evolve_conflicts`
- `evolve_resolve`
- `evolve_timeline`
- `evolve_recall`
- `evolve_help`
- `memory_search`（`evolve_recall` 的别名）
- `memory_save`（`evolve_remember` 的别名）
- `memory_update`（`evolve_update` 的别名）
- `memory_delete`（`evolve_forget` 的别名）

### 命令（/evolve）

- `/evolve connect`
- `/evolve status`
- `/evolve branches`
- `/evolve remember <kind> <title> [--expires <iso>] :: <content>`
- `/evolve update <id> [--merge] :: <content>`
- `/evolve forget <id>`
- `/evolve restore <id>`
- `/evolve config show|open|refresh|set <key> <value>`
- `/evolve skill draft <kind> <title> :: <content>`
- `/evolve skill list`
- `/evolve skill promote <name>`
- `/evolve skill demote <name>`
- `/evolve skill sync`
- `/evolve rollback <ref> [--dry]`
- `/evolve conflicts`
- `/evolve resolve <path> <ours|theirs|both>`
- `/evolve timeline`
- `/evolve search <q> [--kind k] [--tag t]`
- `/evolve branch switch <name>` \| `/evolve branch diff <a> [b]` \| `/evolve branch revert <ref>`
- `/evolve help`

### 内置技能

包内 `skills/` 自带 `evolve-process` 技能。插件加载时会把它物化到仓库的
`<skillsRoot>/drafts/evolve-process/`（仅在缺失时创建）；`/evolve skill sync`
可按需覆盖为内置副本。用 `/evolve skill promote evolve-process` 提升它。
adapter 把仓库的 `<skillsRoot>/enabled/` 目录注册为 DSH skill provider，所以
提升后的技能无需复制到 `~/.dsh/skills` 即可被调用。

## 浏览器端

- `src/client/` - 浏览器 bundle（`lib/client.js`），由
  `tsc -p tsconfig.client.json && tsdown` 编译（见 `tsdown.config.ts`）；注册为
  `settings.section` slot，让 Web 设置页渲染配置表单。
- `package.json` - `exports["./client"]` + `dsh.client`（`platform: "web"`）是
  `dsh-client-modules` 扫描的清单契约，用于把 bundle 纳入 `window.__DSH_BOOT__`。

## 开发

需要 Node.js 与 pnpm。工作区设为 `nodeLinker: hoisted` 并允许 `esbuild` 构建。

```sh
pnpm install
pnpm build            # tsc（服务端）+ tsc（客户端）+ tsdown 浏览器 bundle
npx pnpm test         # 重新生成 @deepseek-ai/dsh-tools stub，然后跑测试
npx pnpm typecheck    # 两个项目各自 tsc --noEmit
npx pnpm check        # build + test（CI 使用该命令）
```

`prepack` 脚本会跑 `pnpm build`，所以发布的 `lib/` 产物总是最新的。测试位于
`tests/*.spec.ts`，用 `node --test` 经 `tsx` 运行。

## 发布说明

`v0.6.3` 定稿了 MVP：带预算的元数据索引召回、版本化更新（`supersedes`/
`supersededBy`）、带过期的软删除/恢复、把仓库 `enabled/` 目录注册为 DSH 技能
provider 的可逆技能草稿、`block`/`redact`/`ask` 隐私写入闸门，以及 `memory_*`
别名与会话开始的 `persona`+`warning` 摘要。

验证：`npx pnpm check`（build + test；`build` 也会做类型检查）通过。

### 已知的非阻塞 TODO

- `getMemoryIndex` 在命中缓存时仍会重扫记忆根目录（正确性优先于速度）；基于
  watcher 的低成本签名是后续工作。
- 隐私闸门覆盖记忆写入（`writeMemoryRecord`/`updateMemory`）；技能草稿写入
  （`writeSkillDraft`/`saveSkillDraftFromRecord`）刻意在闸门之外（文档化的
  仅记忆范围）。
- `classifySensitivity` 从不赋 `internal`；只有手工在 frontmatter 里写该值时
  `internal` 导出级别才可达。

## 许可证

MIT — 见 [LICENSE](LICENSE)。
