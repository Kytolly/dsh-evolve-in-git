# dsh-evolve-in-git 隐私与安全设计（Privacy & Security）

> 本文档说明插件的**隐私与安全现状**，给出**务实、与风险成比例的隐私安全设计**。
> 需明确：**安全不是这个插件的第一目的**。插件的第一目的是 Git 持久化的长期记忆与演化；
> 隐私安全是必要约束，不应喧宾夺主，也不应为了安全牺牲可读性、可回滚和可演化。
> 适用范围：dsh-evolve-in-git **v0.5.0**（当前 `main` @ `ffc0de1`）。

---

## 目录

1. [现状：当前隐私与安全能力](#1-现状当前隐私与安全能力)
2. [定位：安全不是第一目的](#2-定位安全不是第一目的)
3. [设计原则](#3-设计原则)
4. [敏感信息识别](#4-敏感信息识别)
5. [用户控制：查看、导出、删除](#5-用户控制查看导出删除)
6. [加密存储](#6-加密存储)
7. [权限隔离](#7-权限隔离)
8. [合规：GDPR 与数据最小化](#8-合规gdpr-与数据最小化)
9. [与既有记忆机制的关系](#9-与既有记忆机制的关系)
10. [落地到当前代码的最小改造](#10-落地到当前代码的最小改造)
11. [设计要点](#11-设计要点)
12. [风险与后置项](#12-风险与后置项)
13. [附录：与其他设计文档的关系](#13-附录与其他设计文档的关系)

---

## 1. 现状：当前隐私与安全能力

当前实现已经做了一些基础安全工作，但主要集中在**配置层**，而非**记忆内容层**。

已有能力：

- `src/config-route.ts:81-86`：`/api/evolve-git/config` 仅允许 loopback 访问。
- `src/loopback.ts:39-58`：请求级信任边界，检查 socket、Host、Origin、`sec-fetch-site`。
- `src/index.ts:360-372`：`auth.token` 声明为 `role('secret')`。
- `src/client/settings-form.ts:153-161`：密钥字段不回显、保存时不比较 redacted 值。
- Git 远程支持 SSH / token，传输层有基本保护。

仍然缺失：

| 维度 | 现状 |
|---|---|
| 敏感信息识别 | ❌ 电话、地址、密码、密钥、身份证号不会被识别或拦截 |
| 记忆加密 | ❌ Markdown 明文存储，本地和远程都没有加密 |
| 用户查看/导出/删除 | ⚠️ 只有 `evolve_timeline/recall` 可查看，`rollback` 可回滚；没有导出和真正删除 |
| 权限隔离 | ⚠️ 单仓库、单配置；项目隔离只能靠 branch，没有强制 |
| GDPR 被遗忘权 | ❌ Git 历史让彻底删除困难，没有 purge 机制 |
| 数据最小化 | ❌ 没有“哪些内容默认不记”的策略 |

结论：**当前实现保护了配置和通道，但没有保护记忆本身。**

---

## 2. 定位：安全不是第一目的

本插件的第一目的是：

> 用 Git 让 Agent 拥有可版本化、可回滚、可检索、可演化的长期记忆。

隐私与安全是**约束条件**，不是产品目标。因此：

- 不追求企业级加密、多租户 ACL、完整合规平台。
- 优先选择简单、透明、可回滚的方案。
- 安全机制不能破坏 Markdown 可读性、Git 可审计性和技能可发现性。
- 默认采取“够用就好”的防护，高风险场景再升级。

非目标：

- 不做完整的 PII 扫描平台
- 不做全仓库透明加密
- 不做多用户 RBAC/ACL 系统
- 不承诺绝对 GDPR 合规，只提供可操作的删除/导出路径

---

## 3. 设计原则

1. **默认不记敏感信息。**
   写入前识别并阻断，比事后清理可靠。
2. **用户优先于自动。**
   在自动捕获成熟之前，先保证用户能查看、导出、删除。
3. **分级处理，不过度加密。**
   大部分记忆明文可读；只有 secret/confidential 才需要额外保护。
4. **Git 是双刃剑。**
   它提供审计与回滚，也让删除困难；敏感数据应考虑不进入 Git。
5. **安全机制可关闭、可解释。**
   用户应能看到某条记忆为什么被拦截、脱敏或加密。

---

## 4. 敏感信息识别

### 4.1 默认策略

```text
phone / email / ID card / password / token / api key / private key / address
  → 默认阻断或脱敏
  → 除非用户显式确认“这条可以记”
```

实现方式：

- 正则扫描：电话、邮箱、身份证、银行卡、AWS Key、GitHub Token、私钥头等。
- 上下文关键词：password、secret、token、api_key 等。
- 命中后动作：
  - `block`：禁止写入
  - `redact`：替换为 `<REDACTED>`
  - `ask`：询问用户

### 4.2 敏感级别

```yaml
sensitivity: public | internal | confidential | secret
```

| 级别 | 本地 | 云端 | 检索注入 | 导出 |
|---|---|---|---|---|
| public | 明文 | 可同步 | 可注入 | 可导出 |
| internal | 明文 | 私有仓库 | 可注入 | 可导出 |
| confidential | 可加密 | 加密后同步 | 谨慎注入 | 需确认 |
| secret | 字段级加密 | 默认不同步 | 禁止自动注入 | 需显式授权 |

---

## 5. 用户控制：查看、导出、删除

### 查看

- `evolve_timeline`：时间线查看
- `evolve_show <id|path>`：查看单条完整记忆
- Web UI 记忆浏览页

### 导出

- `evolve_export [--format json|markdown] [--scope <scope>]`
- 按 `sensitivity` 过滤，`secret` 默认不导出
- 保留 frontmatter，方便迁移

### 删除

- `evolve_forget <id|path> [--dry] [--hard]`
- 默认软删除：归档
- `--hard`：从工作树删除
- 合规删除：
  - `evolve_purge <id|path>`：从 Git 历史中移除
  - 使用 `git filter-repo` 或等价工具
  - 操作前必须 dry-run 并警告

---

## 6. 加密存储

### 6.1 本地加密

不建议一开始全仓库加密，否则牺牲 Git diff 和可读性。

推荐：

- **字段级加密**：只加密 `secret` 或 `confidential` 字段
- 使用 age / sops / git-crypt 等成熟工具
- Markdown 正文仍可读，敏感字段被加密

### 6.2 云端加密

- 传输层：SSH / HTTPS 已经提供
- 存储层：私有仓库提供访问控制，但不是端到端加密
- 敏感数据策略：
  - 默认不同步到云端
  - 或客户端加密后再 push

建议配置：

```yaml
privacy:
  localEncryption: off | field | full
  cloudSync: allow | deny-sensitive | allow-encrypted
  sensitiveKinds: [secret]
```

---

## 7. 权限隔离

当前单 `repoPath` 无法区分不同用户/项目。

### 命名空间

```text
<repo>/<memoryRoot>/<scope>/<kind>/<timestamp>-<slug>.md
```

例如：

```text
personal/preference/...
project-x/decision/...
work/env/...
```

### 隔离策略

| 方案 | 适用 | 说明 |
|---|---|---|
| 单仓库 + scope 目录 | 同一用户多个项目 | 简单，默认推荐 |
| 单仓库 + branch | 同一用户不同演化线 | 复杂，检索容易漏 |
| 多仓库 | 不同用户/完全隔离 | 最安全，配置更重 |

建议：

- 同一用户多项目：**单仓库 + scope 目录**
- 不同用户：**不同仓库**
- 工具调用默认带 `scope`，只检索当前 scope
- 禁止跨 scope 自动注入

---

## 8. 合规：GDPR 与数据最小化

### 数据最小化

- 只记录有长期价值、跨会话复用价值的信息
- 临时任务必须带 `expiresAt`
- 短期记忆默认 TTL
- 长期记忆定期 consolidation 和淘汰

### 被遗忘权

难点：**Git 历史让删除困难。**

应对：

- 普通遗忘：归档即可
- 合规删除：支持从历史中清除
- 极其敏感的信息：不写入 Git，或使用独立加密存储

### 审计

Git log 是天然审计日志，但应转成用户可读视图：

```text
谁在什么时候写入了什么
谁在什么时候修改了什么
谁在什么时候删除了什么
```

---

## 9. 与既有记忆机制的关系

隐私安全贯穿记忆全生命周期：

```text
写入前：敏感识别 + 价值过滤 + 用户授权
写入中：字段级加密 + 最小化 + scope 隔离
存储后：查看 + 导出 + 删除 + 审计
同步时：传输加密 + 敏感数据不同步
```

| 相关文档 | 隐私安全如何衔接 |
|---|---|
| 格式与可解释性 | `sensitivity/sourceQuote` 等字段 |
| 写入时机 | 写入前敏感识别；显式触发优先 |
| 检索方式 | 敏感记忆禁止自动注入 |
| 更新冲突 | 更新时保留敏感字段的保护 |
| 遗忘机制 | `forget/purge` 支撑被遗忘权 |
| 技能发现 | 技能内容若含敏感信息，同样需要过滤 |

---

## 10. 落地到当前代码的最小改造

- **数据模型**（`src/types.ts` / `src/git.ts:frontmatter`）：
  增加 `sensitivity`、`redactions`、`scope`。
- **写入前门禁**（新增 `src/privacy.ts` 或扩展 `src/strategy.ts`）：
  `scanSensitiveContent` 返回 `block | redact | ask`。
- **用户控制工具**：
  - `evolve_show <id|path>`
  - `evolve_export [--format json|markdown] [--scope <scope>]`
  - `evolve_forget <id|path> [--dry] [--hard]`
  - `evolve_purge <id|path> [--dry]`
- **配置**（`src/defaults.ts` / `src/config.ts`）：
  增加 `privacy.localEncryption`、`privacy.cloudSync`、
  `privacy.sensitiveKinds`、`scope`。
- **复用现有设施**：loopback 信任边界、`role('secret')`、
  Git `autoCommit/rollback`、归档机制。

---

## 11. 设计要点

1. **安全是约束，不是卖点。**
   不要为了安全把记忆系统做重；优先可读、可回滚、可演化。
2. **敏感信息默认不记。**
   写入前拦截和脱敏比事后清理可靠。
3. **用户控制优先于自动捕获。**
   先能查看、导出、删除，再谈自动记忆。
4. **字段级加密优先于全仓库加密。**
   保留 Markdown 可读性和 Git diff 能力。
5. **Git 历史是隐私的双刃剑。**
   普通记忆受益于历史，敏感记忆应避免进入 Git。
6. **scope 隔离先行。**
   在支持多项目/多用户之前，就应预留命名空间。

---

## 12. 风险与后置项

- **过度设计风险**：企业级加密、ACL、合规平台不是当前阶段目标。
- **敏感识别误报**：正则可能误伤正常内容；需要可解释的 block/redact/ask 策略。
- **历史清除不可逆**：`evolve_purge` 重写 Git 历史，可能破坏其他记录和远程同步。
- **scope 迁移成本**：现有记忆没有 scope，需要默认 `scope=default` 的兼容策略。
- **加密密钥管理**：字段级加密需要用户保存密钥；密钥丢失会导致记忆不可恢复。
- **合规边界**：插件只提供工具，不替代法律意见；GDPR 责任仍在部署者/用户。

---

## 13. 附录：与其他设计文档的关系

- `MEMORY-ARCHITECTURE.md` 回答“记忆如何分层、如何流转”；
  `MEMORY_WRITE_IN_TIMING.md` 回答“什么时候写”；
  `MEMORY_RETRIEVAL.md` 回答“怎么取出来”；
  `MEMORY_UPDATE_CONFLICT.md` 回答“同一事实被更新或推翻时怎么办”；
  `MEMORY_FORGETTING.md` 回答“哪些记忆不该永久保留”；
  `MEMORY_FORMAT_EXPLAINABILITY.md` 回答“记忆应该长什么样”；
  `MEMORY_SKILL_DISCOVERY.md` 回答“技能如何被发现和可逆提升”；
  本文档回答“如何在不过度设计的前提下，保护持久化的用户数据”。
- 本文档是记忆系统的**横切约束**，与所有文档相关。
- 本文档仍是**可选扩展提案**，是否实施取决于后续需求。

---
