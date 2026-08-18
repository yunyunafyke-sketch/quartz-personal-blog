---
publish: true
date: 2026-08-18
---

## 一、一句话理解

Archify 是一个面向 Codex 等 AI 编程助手的 Agent Skill：把系统描述或代码仓库转换成可验证、可交互的技术架构图，并输出为可分享的 HTML 文件。

官方仓库：[tt-a1i/archify](https://github.com/tt-a1i/archify)

## 二、理论：它是什么

### 2.1 核心概念

可以把 Archify 理解成：

> 先用文字描述系统，再由 AI 生成结构化图纸，最后经过校验并渲染成网页图表。

它不是普通的手动画图工具，也不是简单的 Mermaid 主题美化器。它的重点是让图表结构可验证、可修改、可复现。

### 2.2 支持的图类型

| 类型 | 适合场景 |
|---|---|
| Architecture | 系统组件、服务、数据库、边界 |
| Workflow | CI/CD、审批、发布、操作流程 |
| Sequence | API 调用、登录认证、缓存回源 |
| Data Flow | 数据管道、数据流转、数据血缘 |
| Lifecycle | 状态、重试、等待、终止 |

## 三、理论：它是怎么工作的

### 3.1 生成结构化图表描述

AI 根据用户的需求或代码仓库生成 typed JSON，也就是有固定字段和类型约束的图表描述。

### 3.2 校验图表结构

Archify 会检查节点、连线、布局、标签、路径和 HTML/SVG 输出，发现问题时返回具体的诊断信息。

### 3.3 输出自包含 HTML

校验通过后，Archify 将图表渲染成一个自包含 HTML 文件。文件可以直接打开和分享，不依赖在线平台才能查看。

### 3.4 支持交互和导出

生成的查看器支持主题切换、搜索、缩放、路径追踪、上下游关系查看，以及 PNG、SVG、WebM 等导出形式。

## 四、实践：可以拿来干什么

- 梳理现有项目的运行时架构。
- 展示前端、后端、缓存、消息队列和数据库之间的调用关系。
- 绘制登录、支付、订单等 API 时序。
- 说明 CI/CD 发布、审批和回滚流程。
- 展示数据从采集、转换到存储和消费的过程。
- 在代码评审或系统设计时快速生成说明图。

## 五、最小例子

### 5.1 通过自然语言生成架构图

在 Codex 中可以直接描述目标：

```text
使用 archify 分析当前仓库，生成一张高层运行时架构图。
展示核心组件、主要调用路径、外部依赖和信任边界。
控制在 8 到 12 个核心节点。
```

### 5.2 绘制登录时序图

```text
使用 archify 绘制登录时序图：
浏览器 -> Web 应用 -> API -> JWT 校验 -> Redis -> PostgreSQL。
把 Redis 未命中的数据库回源路径作为次要路径。
```

### 5.3 继续修改图表

生成初稿后，可以继续提出局部修改：

```text
增加消息队列节点，突出异步通知路径，并把数据库放到存储边界内。
```

## 六、安装与验证

### 6.1 当前环境

当前环境已经安装在：

```text
/Users/chenweili/.agents/skills/archify
```

已通过 Archify 自带检查，Node.js、五类图表渲染器、校验器和预览组件均可用，因此当前环境不需要重复安装。

### 6.2 在其他机器的 Codex CLI 中安装

前提是 Node.js 版本至少为 18。

```bash
npx skills add tt-a1i/archify -g
```

如果希望明确安装到 Codex：

```bash
npx -y skills add tt-a1i/archify \
  --skill archify \
  --global \
  --agent codex \
  --yes
```

安装完成后，重新启动 Codex 或新建会话。

### 6.3 验证安装

```bash
cd ~/.agents/skills/archify
node bin/archify.mjs doctor
```

如果看到下面的结果，就表示安装成功：

```text
Archify is ready.
```

还可以生成示例：

```bash
node bin/archify.mjs demo /tmp/archify-demo
```

### 6.4 临时试用

不写入全局环境时，可以临时使用：

```bash
npx skills use tt-a1i/archify@archify --agent codex
```

### 6.5 直接使用命令行工具

在 Archify 目录中，可以使用以下命令：

```bash
node bin/archify.mjs doctor
node bin/archify.mjs demo /tmp/archify-demo
node bin/archify.mjs guide "展示 CI/CD 检查、审批、部署和回滚"
```

## 七、边界与常见误区

- Archify 生成的是根据输入事实整理出的图，不会自动证明线上系统的真实运行情况。
- 它不是 WYSIWYG 手动画图软件，主要通过自然语言和结构化 JSON 修改。
- Mermaid 可以作为输入参考，但 Archify 的重点是重新组织成自己的结构化图表，而不是简单套一层样式。
- 重新安装时通常不需要单独执行 `npm install`，通过 `npx skills add` 即可完成安装。
- 图表应保持主路径清晰，节点和连线过多会降低可读性。

相关笔记：[[../Codex/Codex第三方插件安装与使用指南]]

## 八、总结

Archify = 用自然语言描述系统，由 AI 生成结构化图表，再经过校验后输出可交互 HTML 的架构图技能。
