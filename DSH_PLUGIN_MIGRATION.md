# DSH 插件清单 & Ubuntu 迁移备忘

> 采集自当前 Windows 机（DSH_HOME = C:\Users\13928\.dsh），运行中的 profile 为 **web**（Web GUI / Web 服务器）。
> 核心 DSH 版本：`@deepseek-ai/dsh-*` = **0.1.1-rc.2**。

---

## 一、已安装的 DSH 插件

### 1. Web profile 社区插件（当前 GUI 实际使用）—— 来源：`~/.dsh/profiles/web/package.json` 的 `dsh.profile.bundles`

| 插件 | 安装版本 | 声明来源 | 说明 |
|---|---|---|---|
| dshmarket | 1.18.0 | `^1.15.0`（npm） | 可视化插件市场 UI |
| dsh-skill-mcp-panel | 2.0.1 | GitHub release tarball（Fishquito7） | 技能 & MCP 管理面板 + dsh-panel CLI |
| @liustack/modlens | 3.23.1 | `3.23.1`（npm） | 纯文本模型外挂视觉能力（OCR/版面/语义） |
| @linxin666/dsh-web-ui-all | 0.2.8 | `0.2.8`（npm） | UI 全家桶聚合（task-board / git-graph / pet / remote-web-ui / web-ui-settings / skin-center / community-plugins / skins） |
| @michengai/dsh-skills-manager | 0.1.23 | `^0.1.23`（npm） | 本地技能管理与安全查看 |
| whale-purse | 1.1.0 | `github:liuherong808-dev/dsh-whale-purse` | 鲸鱼娘桌宠（余额/token 用量/趋势） |
| dsh-session-manager | 0.2.2 | `github:dream12347/dsh-session-manager#v0.2.2` | 会话管理（删除/恢复/统计/继续/分叉） |
| dsh-better-sidebar | 0.14.0 | `^0.14.0`（npm） | VSCode 式右侧栏 —— **当前被禁用**（见 cordis.patch.yml） |
| dsh-at-file | 0.6.7 | GitHub tarball（omdsh-dev/dsh-at-file v0.6.7） | Codex 风格 @文件 引用 |
| dsh-bash-terminal | 0.3.14 | `^0.3.14`（npm） | 统一 shell 工具（Windows: PowerShell/Git Bash/WSL） |

**启用状态（`~/.dsh/profiles/web/cordis.patch.yml`）：**
- `dsh-better-sidebar` 被 `disabled: true`（已安装，但未激活）。

**核心 bundle（由 DSH 运行时分发，非自装）：** `@deepseek-ai/dsh-base`、`@deepseek-ai/dsh-web-app`。

---

### 2. desktop profile（Windows Electron 壳，仅本机有效）—— `~/.dsh/profiles/desktop/`
- bundle：`@deepseek-ai/dsh-base`、`@deepseek-ai/dsh-web-app`、`dsh-find-plugin`（0.3.7）。
- 依赖 `dsh-plugin-desktop`（2.0.2，Electron 壳）+ `koffi`、`dsh-sandbox-windows-acl`、`dsh-pwsh-sandbox` 等 Windows 专用组件。
- **迁移到 Ubuntu 时无需/无法照搬**——用 Ubuntu 版 DSH（Linux 构建或 `dsh web`）替代。

---

### 3. 市场基础设施
- `dsh-community-market`（0.1.0-dev.0，核心市场框架，被 dshmarket 传递依赖装载）
- 市场源（`~/.dsh/settings.yaml` 的 `dsh-community-market.sources`）：
  - `dshfind`（market.dshfind-v1）—— 启用
  - `dsh-1024store`（market.dsh-1024store-v1）—— 禁用

---

## 二、迁移到 Ubuntu 的操作要点

### A. 拷走（数据与配置）
从 `C:\Users\13928\.dsh\` 拷到 Ubuntu 的 `~/.dsh/`：

- `profiles/web/` —— 但**只拷源码类**：
  - `package.json`、`pnpm-workspace.yaml`、`pnpm-lock.yaml`、`cordis.yml`、`cordis.patch.yml`
  - 不要拷 `node_modules`（在 Ubuntu 上重新 `pnpm install`）
- `settings.yaml`（市场源 / UI 配置）
- `.credentials.yaml`（API Key）—— **含密钥，务必安全传输**，或到新机重新填写
- `llm-deepseek/files-v3.json`（DeepSeek 模型/代码文件配置）
- 按需：`sessions/`、`attachments/`、`storages/`、`skin-center/`、`task-board/`、`.agent-presets/`、`pet.json`、`skin-center-active.json`

### B. 在 Ubuntu 上重建
1. 安装 Ubuntu 版 DSH（Linux 构建 / `npm i -g @deepseek-ai/dsh` / `dsh web`），先让核心 `@deepseek-ai/dsh-*` 就位并确认版本。
2. 进入 `~/.dsh/profiles/web/`：`pnpm install`（需要 pnpm；lockfile 已带）。
3. 启动 `dsh --profile web` 或 `dsh web`。

### C. 平台注意
- **dsh-bash-terminal**：偏 Windows（PowerShell / Git Bash / WSL）。Ubuntu 上 DSH 核心已含 `dsh-bash-local`、`dsh-terminal-bash`，此插件可考虑移除或保留（其声称支持 WSL/Git Bash，但默认终端选 PowerShell 不适用）。
- 两组插件走 **GitHub tarball / git 地址**（dsh-at-file、dsh-skill-mcp-panel、dsh-session-manager、whale-purse），Ubuntu 机需能访问 GitHub 才能 `pnpm install`。
- **desktop profile / Electron 壳**不迁移；Ubuntu 用 web/headless profile。
- 核心 DSH 版本不同则 `@deepseek-ai` 版本可能不同，届时重新 `pnpm install` 会按新版本解析。

---

## 三、dsh-evolve-in-git 能否作为插件安装？—— 可以，但有一处 peer 版本需注意

**结论：结构上是一个合规的 Harness/Cordis 插件，可安装；唯一风险是 peerDependencies 版本不匹配。**

依据：
- `package.json`：`type: module`、`main: lib/index.js`、`exports` 子路径、`dsh.bundle.patch: ./cordis.patch.yml`；`cordis.patch.yml` 注入 `evolve-git` 行 —— 与 dsh-skill-mcp-panel 等插件同构。
- `lib/` 已构建（index/git/harness/invariant/strategy/types）。
- 用到的宿主 API 在当前核心 0.1.1-rc.2 均存在：
  - `ctx.tools.register(defineTool(...))` ✓（多个已装插件在用）
  - `ctx.commands.register({name,...})` ✓（dsh-commands 的 `register(definition)`）
  - `ctx.systemPrompt.section({...})` ✓（dsh-system-prompt 的 `section(section)`）
  - `ctx.invariants.register(name, installer)` ✓（dsh-invariants 的 `register`）

**⚠️ 唯一问题：peerDependency 版本**
- 声明：`@deepseek-ai/dsh-commands|dsh-invariants|dsh-system-prompt|dsh-tools` 均为 `^0.1.0-rc.8`
- 实际：核心为 `0.1.1-rc.2`，`semver.satisfies('0.1.1-rc.2','^0.1.0-rc.8')` === **false**（pre-release 的 semver 规则：只有 comparator set 中存在同 [major.minor.patch] 且带 pre-release 标签的比较器，pre-release 版本才被允许匹配）。
- 影响：`dsh plugin add` / `pnpm add` 仍会装上，但会报 **unmet peer dependency** 警告；插件是按旧宿主契约 `0.1.0-rc.8` 写的。
- **建议**：把该插件的四行 peerDependencies 放宽到 `^0.1.1-rc.2`（或 `*`）再装；装完用 `dsh --profile web --dump-config` 确认出现 `evolve-git` 行，再启动长期 profile。

### 安装方式（README 推荐）
    dsh plugin --profile web add github:Kytolly/dsh-evolve-in-git

或本地开发版：在 `~/.dsh/profiles/web/package.json` 的 dependencies 加入 `"dsh-evolve-in-git": "file:本仓库路径"`，并把它加进 `dsh.profile.bundles`，然后 `pnpm install`。

### 当前状态
- 尚未安装：`dsh-evolve-in-git` 在 web/desktop profile 的 package.json、cordis.patch.yml、node_modules 中均不存在。
- 本仓库 git remote：`https://github.com/Kytolly/dsh-evolve-in-git.git`（origin/main），工作区有未提交改动：README.md、package.json。