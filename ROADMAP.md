# dsh-evolve-in-git Roadmap

> 版本策略：`0.x`。新功能升 minor，修 bug 升 patch。当前已发布版本：**0.1.7**。
> 本表标注「done」的能力已由对应版本提交落地，`[ ]` 为尚未实现。

---

## 已落地（截止 0.1.7）

- [x] 0.1.3 CI/CD + 可安装 lib + `/evolve config` 配置命令。
- [x] 0.1.5 web 设置 UI（`src/client/`：EvolveSettingsCard / ConfigFileEditor / 设置表单）。
- [x] 0.1.6 设置表单**直接读写配置文件**（`src/config-route.ts`），配置改动即时生效，无需重启。
- [x] 0.1.7 `repoPath` 等路径支持 `~` 展开（`expandHome`）。

**结论**：原计划的 `0.1.4 配置实时生效` 已被 0.1.6 覆盖；当前 0.1 线基本收尾，重心转入 0.2.0 起的「记忆/技能进化」能力。

---

## 0.2.0 — 技能进化闭环（next, minor）

已具备：`draftSkillFromRecord` / `renderSkillDraft` / `suggestEvolution` / `shouldOfferSkillPromotion`（只产出草稿+提示）。

- [ ] `/evolve skill promote <title>`：把 `skillsRoot` 下的草稿提升为正式技能，写入 DSH skill registry（`@deepseek-ai/dsh-skill` 侧）。
- [ ] `/evolve skill list|review`：列出待提升草稿、与正式技能差异。
- [ ] `sync`：记忆/技能变更同步到 skill registry；`sync` 提醒（commit 前后提示）。
- [ ] 选项：`autoPromote`、`remember` 后即时生成草稿。

**验收**：`/evolve skill promote <title>` 后技能出现在 DSH 技能列表；`suggestEvolution` 草稿可一键提升。

---

## 0.3.0 — 安全回滚 & 冲突合并（minor）

- [ ] `rollback <ref>`：撤销某次记忆写入（只影响记忆/技能文件），生成 revert commit。
- [ ] `conflicts`：检测多分支/多会话写入冲突并列出。
- [ ] merge/conflict resolver：解决策略（取哪条/合并/丢弃）+ 提交结果。
- [ ] 护栏：回滚/合并前 dry-run + 确认；`autoCommit=false` 时提示。

---

## 0.4.0 — 分支 & 时间线命令面（minor）

- [ ] `/evolve branch switch|diff|revert <name|ref>`。
- [ ] `timeline`：历史记忆记录时间线（按时间/分支过滤），或扩展 `evolve_branches`。

---

## 0.5.0 — 自动记忆注入 & 召回（minor）

- [ ] 自动 prompt 注入：按当前任务召回相关记忆注入 `systemPrompt`/上下文（当前 `systemPrompt.section` 是静态引导）。
- [ ] `search`/`recall`：按 kind/标签/关键词/时间召回。
- [ ] 摘要：长记忆折叠为短期上下文摘要。

---

## 1.0.0 — 稳定 & 冻结（计划）

- [ ] 冻结接口（工具名、命令面、配置 schema、设置命名空间）。
- [ ] 补齐 rollback/conflict/promote/search/prompt 注入的测试。
- [ ] CHANGELOG + `v1.0.0` tag 走 Release 出正式包。

---

## 优先级建议（先做三个）

1. **0.2.0 技能进化闭环** —— 最贴「evolution」定位，复用已有草稿能力。
2. **0.3.0 回滚/冲突** —— 记忆写入可信度的关键。
3. **0.5.0 自动注入** —— 让记忆真正被模型用起来。