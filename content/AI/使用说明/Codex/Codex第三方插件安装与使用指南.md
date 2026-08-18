---
title: Codex第三方插件安装与使用指南
publish: true
---

# Codex 第三方插件安装与使用指南

## 一、一句话理解

Codex 插件是一个可安装的能力包：它可以给 Codex 增加一套工作流程、外部服务连接或 MCP 工具。使用第三方插件时，关键不是把代码仓库下载下来，而是找到插件所属的 Marketplace，检查权限，安装后在新的 Codex 会话中使用。

## 二、理论：插件到底是什么

### 2.1 插件是能力包

可以把 Codex 想成一个会写代码、查资料和执行任务的通用助手，把插件想成给它安装的“工具包”。插件可以包含以下一种或多种能力：

- **Skill**：某类任务的工作方法和操作说明。
- **Connector**：连接 GitHub、Gmail、Slack、Google Drive 等外部服务。
- **MCP Server**：向 Codex 提供外部工具和结构化数据。
- **Hook**：在命令执行、文件修改等生命周期节点自动运行检查或命令。
- **Browser Extension**：为插件工作流提供浏览器能力。
- **Scheduled Task Template**：为定时任务提供可复用模板。

一个插件可以只包含 Skill，也可以同时包含 Skill、Connector 和 MCP Server。

### 2.2 四个容易混淆的词

| 名称 | 白话理解 | 是否等同于插件 |
| --- | --- | --- |
| Plugin | 可以安装和分发的完整能力包 | 是 |
| Skill | 一套具体的工作方法和操作说明 | 不是，通常是插件的一部分 |
| MCP Server | 让 Codex 获得外部工具或数据的服务 | 不是，可能被插件打包 |
| Connector | 已经定义好登录和权限的外部服务连接 | 不是，通常由 MCP 等能力支撑 |
| Marketplace | 用来发现、安装和分发插件的来源或目录 | 不是插件 |

最简单的判断方法是：想复用“怎么做”，关注 Skill；想连接“外部系统”，关注 Connector 或 MCP；想安装一整套能力，关注 Plugin。

### 2.3 什么叫第三方插件

第三方插件不是 OpenAI 官方维护的插件，可能来自个人、团队、公司或开源社区。它通常通过某个 Marketplace 发布，Marketplace 可以是公共目录、团队目录、个人目录，也可以是用于本地测试的本地 Marketplace。

任意 GitHub 仓库都不能直接当成 Codex 插件安装。仓库需要按照 Codex Marketplace 和插件格式提供清单、插件目录及相关文件。

## 三、理论：插件是怎么工作的

### 3.1 从安装到使用的完整链路

插件生效大致经过以下过程：

1. **选择来源**：从公共目录、工作区、个人 Marketplace 或第三方 Marketplace 查找插件。
2. **安装插件**：Codex 保存插件包及其配置。
3. **连接服务**：如果插件需要 Gmail、GitHub 或其他外部服务，按提示登录并授权。
4. **创建新会话**：新安装的 Skill、MCP 工具通常在新的聊天或新的 CLI 会话中可用。
5. **提出任务**：可以直接描述目标，也可以使用 `@` 明确指定插件或其中的 Skill。
6. **执行并受控**：Codex 仍然受当前环境的沙箱、审批、文件权限、网络权限和外部账号权限约束。

所以，“插件已安装”只代表能力包已经加入当前环境，不代表它已经登录外部服务，也不代表它可以绕过 Codex 的安全限制。

### 3.2 Marketplace 和插件目录的关系

Marketplace 更像“货架”或“软件源”，插件是货架上的具体商品。一个 Marketplace 可以提供多个插件，一个插件也可以被发布到公共目录或团队目录中。

在 ChatGPT 和 Codex 支持的界面中，公共插件目录可以统一发现插件；在 Codex CLI 中，插件浏览器按 Marketplace 分组展示插件。第三方插件通常需要先添加或切换到对应的 Marketplace，再进行安装。

### 3.3 插件、账号和权限的关系

插件可能同时涉及三层权限：

| 权限层 | 解决的问题 |
| --- | --- |
| Codex 环境权限 | 能否读写文件、运行命令或访问网络 |
| 外部服务权限 | 能否读取 Gmail、GitHub、Slack 等账号数据或执行操作 |
| 插件自身行为 | 是否包含 Hook、MCP Server 或会向外部服务发送数据 |

这三层互相独立。即使插件需要登录，登录也不等于自动批准所有操作；即使 Codex 允许运行命令，插件也不应被默认信任。

## 四、实践：安装前怎么选择和检查

### 4.1 先确认使用环境

目前安装 Codex 插件主要使用以下入口：

- **ChatGPT 桌面版中的 Codex**：通过 Plugins 页面浏览和安装。
- **Codex CLI**：通过会话内的 `/plugins` 打开插件浏览器。

Codex IDE 扩展目前不提供插件浏览和安装入口。如果在 IDE 中找不到插件页面，应改用 ChatGPT 桌面版或 Codex CLI 完成安装，再确认该插件能力是否能在目标界面使用。

### 4.2 安装前检查清单

安装第三方插件前，至少检查：

1. 插件名称、维护者和来源是否可信。
2. 它所在的 Marketplace 是否确实是项目、团队或个人维护的插件市场。
3. 插件说明中包含哪些 Skill、Connector、MCP Server、Hook 或浏览器能力。
4. 是否需要登录外部服务，申请了哪些数据和操作权限。
5. MCP Server 的启动命令、远程地址、环境变量和认证方式是什么。
6. Hook 会运行哪些命令，是否会读取、修改或上传本地文件。
7. 插件是否长期维护，版本和依赖是否有明确说明。

来源不明、权限过宽、包含无法解释的命令或要求把密码写入配置文件的插件，不应直接安装到日常工作环境。

## 五、最小例子：安装并使用一个第三方插件

### 5.1 在 ChatGPT 桌面版中安装

1. 打开 ChatGPT 桌面版，并进入 Codex 可用的工作界面。
2. 打开 **Plugins** 页面。
3. 搜索插件，或切换到对应的 Workspace、Personal 或第三方来源。
4. 打开插件详情，先阅读说明和权限，再点击 `+` 安装。
5. 如果插件需要 Connector，按提示登录并授权；有些插件会等到第一次使用时才要求连接。
6. 新建一个 Codex 任务，再开始使用插件。

### 5.2 在 Codex CLI 中安装第三方 Marketplace 插件

启动 Codex：

```bash
codex
```

在 Codex 会话中输入：

```text
/plugins
```

在插件浏览器中：

1. 选择 **Add Marketplace**，按界面提示添加第三方 Marketplace 来源。
2. 切换到该 Marketplace，搜索并打开目标插件。
3. 查看插件详情、来源和权限。
4. 安装插件；已安装的插件可以使用 `Space` 启用或停用。
5. 退出当前会话并重新启动一个新的 Codex 会话。

不同版本的 CLI 可能调整命令行子命令和界面布局，因此以当前 `/plugins` 浏览器中的操作为准，不要机械照抄旧教程中的固定命令。

### 5.3 使用已安装插件

可以直接描述想要的结果，让 Codex 自己选择合适的已安装能力：

```text
请总结今天 Gmail 中未读的重要邮件，只读取邮件，不发送或删除任何内容。
```

如果希望明确指定插件或其中的 Skill，可以使用 `@`：

```text
@插件名 检查当前代码改动中的安全风险，只输出问题和修复建议，不修改文件。
```

第一次使用连接类插件时，按提示完成外部服务登录。任务中仍应明确数据范围和允许的操作，例如“只读”“不要发送”“不要修改仓库”。

### 5.4 管理、停用和卸载

发现插件不再需要时，可以在插件目录或 CLI 的 `/plugins` 浏览器中查看、停用或卸载插件。

卸载插件不一定会自动撤销外部服务的授权。如果插件曾连接 Gmail、GitHub 或其他服务，还应到对应的账号或连接管理页面单独检查并断开授权。

## 六、实例：安装和使用 archify

### 6.1 archify 是什么

[archify](https://github.com/tt-a1i/archify) 是 `tt-a1i` 发布的第三方 Agent Skill，专门帮助 Codex 生成可验证的架构图、工作流图、时序图、数据流图和生命周期图。

它生成的是自包含 HTML 文件，并支持预览、校验、导出 PNG 以及静态或带动画的图形。

严格来说，archify 当前是一个第三方 **Skill**，不是通过 Codex `/plugins` 浏览器安装的完整 **Plugin**。它适合作为“从 GitHub 安装第三方 Codex 能力”的示例。

### 6.2 安装 archify

根据仓库 README，全局安装：
[npm与npx的区别](../../../前端/Node.js/npm与npx的区别.md)

```bash
npx skills add tt-a1i/archify -g
```

如果希望明确指定“只安装到 Codex 的全局环境”，可以使用完整写法：

```bash
npx -y skills add tt-a1i/archify \
  --skill archify \
  --global \
  --agent codex \
  --yes
```

这条命令可以拆成几部分理解：

| 参数 | 作用 |
| --- | --- |
| `npx` | 临时下载并运行 `skills` 命令，不需要提前全局安装它 |
| `-y` | 自动确认 npx 是否下载并运行 `skills` |
| `skills add tt-a1i/archify` | 从 GitHub 仓库添加 archify |
| `--skill archify` | 明确指定仓库中的 `archify` Skill |
| `--global` | 安装到当前用户的全局 Skill 目录，而不是当前项目 |
| `--agent codex` | 只为 Codex 安装，不再询问其他 Agent |
| `--yes` | 自动确认安装过程中的其他提示 |

其中，`-y` 和 `--yes` 不是重复参数：`-y` 主要确认 npx 运行远程命令，`--yes` 主要确认 `skills add` 自己的安装选项。想看到选择界面时，可以去掉这两个参数；想避免误选其他 Agent 时，保留 `--agent codex`。

安装后可以用下面的命令检查 Codex 是否已经识别到 archify：

```bash
npx skills list -g -a codex
```

如果只想临时试用，不写入全局环境：

```bash
npx skills use tt-a1i/archify@archify --agent codex
```

README 中说明，Codex CLI 的全局 Skill 通常位于：

```text
~/.agents/skills/
```

项目级安装则可以放在项目目录下的：

```text
.agents/skills/
```

安装完成后，重新启动 Codex 或新建会话，让 Codex 加载新的 Skill。

### 6.3 使用 archify 生成架构图

进入需要分析的代码仓库，启动 Codex：

```bash
codex
```

然后直接描述目标：

```text
分析当前仓库，然后使用 archify 创建一张高层运行时架构图。
展示 8 到 12 个核心组件、主要调用路径、外部依赖和信任边界。
把辅助信息放到卡片中，不要增加过多连线。
```

也可以生成具体的登录时序图：

```text
使用 archify 绘制登录流程：
浏览器 -> Web 应用 -> API -> JWT 校验 -> Redis 会话查询 -> PostgreSQL 回源。
请把缓存未命中路径作为次要路径展示。
```

archify 支持的主要图类型包括：

| 图类型 | 适合场景 |
| --- | --- |
| Architecture | 系统组件、服务、存储和边界 |
| Workflow | CI/CD、审批、工具调用和操作流程 |
| Sequence | API 调用、认证、缓存回源和异步交互 |
| Data Flow | 数据管道、数据来源、转换和存储 |
| Lifecycle | 状态、重试、等待和终止结果 |

### 6.4 继续修改和导出

生成初稿后，可以继续用自然语言要求局部修改：

```text
增加 Redis 节点，把认证服务移动到左侧，并突出回滚路径。
```

archify 会保留结构化源数据，便于继续调整。完成后可以使用 Export 菜单导出 PNG、静态格式或带动画的格式。

如果需要直接使用仓库中的命令行工具，可以在 archify 目录中执行：

```bash
node bin/archify.mjs doctor
node bin/archify.mjs demo /tmp/archify-demo
node bin/archify.mjs guide "展示 CI/CD 检查、审批、部署和回滚"
```

### 6.5 archify 与完整 Plugin 的区别

这个例子可以帮助理解两种安装方式：

| 能力类型 | archify 的方式 | 完整 Plugin 的方式 |
| --- | --- | --- |
| 发布形式 | GitHub 上的 Skill 仓库 | Marketplace 中的插件包 |
| 安装入口 | `npx skills add` 或 `npx skills use` | ChatGPT Plugins 页面或 Codex `/plugins` |
| 主要内容 | `SKILL.md`、脚本和示例 | `plugin.json`、Skill、MCP、Connector 或 Hook |
| 使用方式 | 直接说明“使用 archify” | 直接描述目标或用 `@插件名` 指定 |

因此，不能仅因为仓库在 GitHub 上，就把 archify 当作完整 Plugin 运行 `codex /plugins` 安装。应优先按照仓库 README 提供的安装方式操作。

## 七、总结

### 7.1 最短上手流程

```text
确认来源和权限
    ↓
打开 ChatGPT 桌面版 Plugins 页面，或在 Codex CLI 输入 /plugins
    ↓
添加或选择第三方 Marketplace
    ↓
查看详情并安装
    ↓
完成 Connector 或 MCP 配置
    ↓
新建 Codex 会话
    ↓
直接描述目标，或使用 @插件名 明确指定
```

### 7.2 一句话记忆

**Marketplace 是插件来源，Plugin 是能力包，Skill 是工作方法，MCP 和 Connector 是外部工具与服务连接；安装前看来源和权限，安装后开新会话再使用。**

### 7.3 官方参考资料

- [OpenAI：Plugins](https://developers.openai.com/codex/plugins)
- [OpenAI：Build plugins](https://developers.openai.com/codex/build-plugins)
- [OpenAI：Codex CLI](https://developers.openai.com/codex/cli)
- [OpenAI：Configuration Reference](https://developers.openai.com/codex/config-reference)
