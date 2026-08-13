---
title: Codex第三方插件安装与使用指南
publish: true
---

# Codex 第三方插件安装与使用指南

## 1. 什么是 Codex 插件

Codex 插件是一个可安装、可分发的能力包，可以包含以下一种或多种内容：

- **Skill**：可复用的工作流程、操作规范和参考资料
- **MCP Server**：为 Codex 提供外部工具或数据
- **Connector**：连接 Gmail、Slack、GitHub、Google Drive 等服务
- **Hook**：在工具调用、命令执行或文件修改等生命周期节点运行检查
- **Browser Extension**：插件工作流需要的浏览器能力
- **Scheduled Task Template**：可复用的定时任务模板
- **可选 UI**：在支持的界面中展示交互内容

插件是完整安装包，Skill 则通常是插件内部的一项具体能力。

---

## 2. 支持插件的 Codex 环境

目前可以通过以下环境浏览和安装插件：

- Codex 桌面版
- Codex CLI

Codex IDE 扩展目前不提供插件浏览和安装功能。安装插件后，通常需要重新启动 Codex，或者新建任务，才能使用插件新加入的 Skill 和工具。

---

## 3. 在 Codex 桌面版安装插件

这是最简单的安装方式：

1. 打开 Codex。
2. 进入 **Plugins** 页面。
3. 搜索或浏览需要的插件。
4. 打开插件详情。
5. 点击 `+` 安装。
6. 如果插件需要外部服务，按提示完成登录和授权。
7. 安装完成后，新建一个任务。

插件目录通常包含以下分类：

- **OpenAI**：OpenAI 提供的插件
- **Workspace**：工作空间提供的插件
- **Personal**：个人 Marketplace 中的插件
- **Installed**：已经安装的插件

---

## 4. 在 Codex CLI 安装插件

### 4.1 使用插件浏览器

启动 Codex CLI：

```bash
codex
```

在 Codex 会话中输入：

```text
/plugins
```

插件浏览器支持：

- 按 Marketplace 浏览插件
- 查看插件详情
- 安装或卸载插件
- 按 `Space` 启用或停用已安装插件

安装完成后，需要启动新的 Codex 会话。

### 4.2 使用命令行安装

查看当前 Marketplace 和插件：

```bash
codex plugin list
```

安装指定插件：

```bash
codex plugin add 插件名@市场名
```

也可以把 Marketplace 单独写成参数：

```bash
codex plugin add 插件名 --marketplace 市场名
```

---

## 5. 安装 GitHub 上的第三方插件

GitHub 仓库需要采用 Codex Marketplace 格式。不能把任意 GitHub 代码仓库直接当作插件安装。

### 5.1 添加第三方 Marketplace

```bash
codex plugin marketplace add owner/repo --ref main
```

支持的 Marketplace 来源包括：

- GitHub 风格的 `owner/repo`
- HTTPS Git 地址
- SSH Git 地址
- 本地目录

示例：

```bash
codex plugin marketplace add https://github.com/owner/repo
codex plugin marketplace add ./path/to/marketplace
```

如果只需要仓库中的部分目录，可以使用稀疏检出：

```bash
codex plugin marketplace add https://github.com/owner/repo --sparse plugins/example
```

### 5.2 查看 Marketplace 中的插件

```bash
codex plugin list
```

输出中会显示：

- Marketplace 名称
- 插件名称
- 是否安装
- 是否启用
- 插件版本
- 本地路径或 Git 来源

### 5.3 安装插件

```bash
codex plugin add 插件名@市场名
```

例如安装 Ponytail：

```bash
codex plugin marketplace add DietrichGebert/ponytail
codex plugin add ponytail@ponytail
```

安装后重新启动 Codex 桌面版，或者创建新的 Codex CLI 会话。

---

## 6. 如何使用插件

### 6.1 直接描述目标

安装插件后，可以直接描述需要的结果：

```text
检查当前代码是否存在过度设计。
```

```text
总结今天 Gmail 中未读的重要邮件。
```

Codex 会根据插件和 Skill 的描述选择合适的能力。

### 6.2 使用 `@` 明确指定插件或 Skill

如果希望明确指定能力，可以在输入框中键入 `@`：

```text
@ponytail 帮我用最简单的方式实现这个需求。
```

或者指定插件中的某个 Skill：

```text
@ponytail-review 检查当前代码改动是否过度设计。
```

输入 `@` 后，Codex 会显示当前任务中可用的插件和 Skill。

### 6.3 使用 Connector

包含 Connector 的插件可能会在以下时间要求登录：

- 安装插件时
- 第一次使用相关功能时

例如：

```text
使用 Gmail 插件总结今天的未读邮件。
```

外部服务操作同时受到以下限制：

- 外部服务账号自身的权限
- Codex 沙箱策略
- Codex 操作审批策略
- 工作空间管理员配置

### 6.4 使用 MCP 工具

插件中的 MCP Server 负责向 Codex提供外部工具和结构化数据。部分 MCP Server 可能需要额外配置、网络权限或身份认证。

通常不需要直接调用 MCP 工具名，只需要描述目标；只有在需要严格指定工具时，才显式指定插件或 Skill。

### 6.5 检查 Hook

插件可能包含自动运行的 Hook。启用前应检查并确认其用途，尤其关注：

- 会执行哪些本地命令
- 会读取或修改哪些文件
- 是否需要网络访问
- 是否会把数据发送给外部服务

---

## 7. 管理插件和 Marketplace

### 查看插件

```bash
codex plugin list
```

### 更新第三方 Marketplace

```bash
codex plugin marketplace upgrade 市场名
```

### 卸载插件

```bash
codex plugin remove 插件名@市场名
```

也可以使用：

```bash
codex plugin remove 插件名 --marketplace 市场名
```

### 删除 Marketplace

```bash
codex plugin marketplace remove 市场名
```

卸载插件只会从当前 Codex 环境移除插件包。如果插件使用了 Connector，外部服务连接可能仍然保留，需要在 ChatGPT 或对应服务的连接管理页面中单独断开。

---

## 8. Plugin、Skill、MCP 和 Connector 的区别

| 名称 | 主要作用 |
|---|---|
| Plugin | 可安装、可分发的完整能力包 |
| Skill | 特定任务的操作流程和说明 |
| MCP Server | 为 Codex 提供工具、数据和外部操作能力 |
| Connector | 带身份认证的外部服务连接 |
| Hook | 在生命周期节点自动执行检查或命令 |
| Marketplace | 用于发布和发现插件的目录 |

选择建议：

- 只想保存一套重复使用的操作流程：使用 Skill
- 想把多个 Skill 打包分享：使用 Plugin
- 需要连接内部系统或外部 API：使用 MCP Server
- 需要连接 Gmail、Slack、Google Drive 等账号：使用 Connector 插件
- 需要在执行命令或修改文件前后强制检查：使用 Hook

---

## 9. 常见问题

### 安装后为什么看不到插件？

安装完成后需要新建任务或重新启动 Codex。旧任务不会自动获得新安装的 Skill 和工具。

### 为什么插件能看到，但功能不能使用？

依次检查：

1. 插件是否已经安装并启用
2. 是否新建了任务或会话
3. Connector 是否完成登录授权
4. MCP Server 是否完成配置
5. Hook 是否已经审查和信任
6. Codex 沙箱或管理员策略是否阻止了相关操作

### 为什么 IDE 扩展中找不到插件入口？

插件浏览和安装目前不支持 Codex IDE 扩展。请使用 Codex 桌面版或 Codex CLI。

### 第三方插件是否安全？

安装前应检查：

- 插件来源和维护者
- `.codex-plugin/plugin.json`
- `skills/` 中的操作说明
- MCP Server 地址和认证方式
- Hook 中运行的命令
- 插件请求的文件、网络和外部服务权限

---

## 10. 最短上手流程

```bash
# 1. 添加第三方 Marketplace
codex plugin marketplace add owner/repo --ref main

# 2. 查看插件
codex plugin list

# 3. 安装插件
codex plugin add 插件名@市场名

# 4. 重新启动 Codex 或新建会话
```

然后直接描述需求，或者用 `@插件名`、`@Skill名` 明确指定能力。

---

## 参考资料

- [Codex 插件使用说明](https://developers.openai.com/codex/plugins)
- [Codex 插件开发说明](https://developers.openai.com/codex/build-plugins)
- [OpenAI Plugins 文档](https://developers.openai.com/plugins)
