# dsh-evolve-in-git Roadmap

> 状态：**开发仍在继续（当前 0.5.0）**。0.4.0（分支/时间线）、0.5.0（召回/半自动注入）已实现。早期曾评估以 [dsh-memory-evolve](https://github.com/csyangwen/dsh-memory-evolve) 替代，但按后续要求本仓库继续完善；两者定位不同（独立记忆仓库 vs 一体化记忆+调度）。

---

## 已落地（0.1.3 → 0.3.1）

- [x] 0.1.3 CI/CD + 可安装 lib + `/evolve config` 配置命令。
- [x] 0.1.5 web 设置 UI（`src/client/`）。
- [x] 0.1.6 设置表单直接读写配置文件（`src/config-route.ts`）。
- [x] 0.1.7 `repoPath` 等路径 `~` 展开。
- [x] 0.2.0 技能草稿 promote 进技能注册表（`evolve_skill_list`/`evolve_skill_promote`）。
- [x] 0.2.1 `evolve_skill_draft` + 内置 `evolve-process` 技能 + 加载时自动同步到 `~/.dsh/skills`。
- [x] 0.3.0 安全回滚（`rollback`，dry-run）+ 冲突检测（`conflicts`）。
- [x] 0.3.1 冲突解决器（`resolve <path> ours|theirs|both`）。

## 剩余 TODO（不再开发，由 dsh-memory-evolve 覆盖）

- [ ] 0.4.0 分支 switch/diff/revert + 时间线 —— dsh-memory-evolve 提供项目分支记忆 + 项目/每日日志（时间线）。
- [ ] 0.5.0 自动记忆注入 & 召回 —— dsh-memory-evolve 记忆自动注入上下文 + 本地/会话搜索。
- [ ] 1.0.0 接口冻结 + 全量测试 + CHANGELOG/正式包 —— 无必要（本插件转为可选的轻量替代）。

---

## 决策记录

- **采用方案**：改用 `dsh-memory-evolve`（git 分支感知的五轨记忆 + 技能自我进化 + 待办 + COI/外部代理调度 + WebUI 管理），覆盖本插件全部需求。
- **本插件定位**：作为“独立记忆仓库 + 手动技能提升”的极简/可测替代保留，不再新增功能；仅修 bug。

## 安装（如需保留使用）

```sh
dsh plugin --profile web add github:Kytolly/dsh-evolve-in-git
```