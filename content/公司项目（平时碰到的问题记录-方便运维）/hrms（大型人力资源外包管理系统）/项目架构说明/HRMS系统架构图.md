---
title: HRMS系统机构图
date: 2026-09-07 10:52:20
publish: true
---

![HRMS 系统主架构图](image/hrms-system-architecture.webp)

[打开交互版架构图](../../../archify/hrms-system-architecture.html)

## 一、💡 一句话理解

> [!tip] 核心结论
> HRMS 将“接请求、编排流程、执行业务规则、读写数据、调用外部系统”拆成独立模块：业务规则放在中间，HTTP、MySQL、RPC、消息队列和定时任务都放在外围。

可以把它理解为一家人力资源外包公司的业务中台：入口负责接待，服务层负责安排流程，领域层负责按制度办事，基础设施负责查档案、联系外部单位和发送通知。

## 二、🧭 一次请求如何流转

以“创建外包人员”为例，主链路是：

```text
浏览器 / 内部门户
  → bootstrap / Controller
  → web 接口与 DTO
  → service（流程编排）
  → domain（业务规则）
  → repository（数据访问）
  → MySQL
```

在领域处理期间，还可能通过 `integration` 调用组织、审批、账号、协议、消息和文档等外部系统；消息队列和定时任务则会从另一条入口触发同一套领域规则。

## 三、⚙️ 每个模块是做什么的

| 模块 | 主要职责 | 典型内容 |
| --- | --- | --- |
| `bootstrap` | 应用启动、HTTP 接入、配置装配和最终打包。 | `HrmsApplication`、各业务 `Controller`、环境配置。 |
| `web` | 定义 Controller 可调用的内部 Web 契约。 | `*Web` 接口、请求/响应 DTO、分页对象。 |
| `service` | 实现 Web 与 Facade 契约，完成校验、事务和调用编排。 | `*WebImpl`、`OutsourcedStaffFacadeImpl`、事件监听器、操作模板。 |
| `domain` | 保存人员、项目、协议、供应商等核心业务模型与规则；声明数据和外部能力接口。 | 领域服务、模型、`Repository` 接口、`Integration` 接口。 |
| `infrastructure/repository` | 用 MyBatis-Plus 和 MySQL 实现数据持久化。 | Entity、Mapper、Mapper XML、Converter、Repository 实现。 |
| `infrastructure/integration` | 调用外部系统并隔离 RPC、DTO 转换和异常处理。 | 组织、流程、协议、账号、消息、文档等 Integration 实现。 |
| `infrastructure/scheduler` | 在约定时间触发业务动作。 | 协议到期提醒/终止、人员状态更新、项目初始化等 Handler。 |
| `infrastructure/queue` | 提供 RocketMQ/SOFAMQ 的消息发送与配置能力。 | Producer 配置、`SendMessageService`。 |
| `facade` | 向其他系统暴露稳定的 RPC 契约。 | `OutsourcedStaffFacade`、对外 DTO、业务事件。 |
| `common` | 跨业务复用的基础能力。 | 异常、枚举、用户上下文、日期/Excel/ID 工具、通用配置。 |

### 3.1 `bootstrap`：系统的门厅和总装配台

它负责把所有模块装配为可运行应用，并通过 Controller 接收 HTTP 请求。Controller 应只做参数接收和转发，不应写人员入离场、协议续签等业务规则；这样接口路径或前端页面改变时，不会影响核心业务。

### 3.2 `web`：面向本系统的内部合同

`web` 规定了 Controller 能调用什么方法、传什么请求对象、得到什么响应对象。它保护领域模型不被页面字段直接绑死：前端即使增加展示字段，也不必直接改动人员、协议等领域对象。

### 3.3 `service`：流程调度员

`service` 知道“一次操作要按什么顺序完成”：校验入参、开启事务、调用领域服务、转换结果、返回统一响应。它负责流程，不负责制定业务制度；核心规则应沉在 `domain`，这样 HTTP、RPC、定时任务都能复用。

### 3.4 `domain`：业务大脑

这里表达 HRMS 最重要的事实和规则，例如外包人员状态如何变更、项目额度是否足够、协议是否允许续签。它只声明“需要查询或保存什么”“需要从外部获得什么信息”，而不关心 SQL 和 RPC 的具体写法。

### 3.5 `repository`：档案室

领域层通过 Repository 接口提出数据需求，`repository` 模块再以 Entity、Mapper 和 SQL 将其落到 MySQL。这样表结构、SQL 性能优化或 ORM 调整主要局限在这个模块，业务规则不必跟着变化。

### 3.6 `integration`：对外联络处

HRMS 需要组织信息、审批流程、账号、协议、消息、文档等能力，但这些系统不属于 HRMS。`integration` 统一处理 RPC 调用、外部 DTO 到内部对象的转换和调用失败处理，避免外部系统的细节散落到人员、项目、协议服务中。

### 3.7 `scheduler` 与 `queue`：两个非人工入口

`scheduler` 解决“什么时候做”，例如协议到期前通知或每日更新人员状态；`queue` 解决“发生后异步通知谁”，例如人员或项目变更后发消息。二者都应只负责触发或传递，最终仍调用 `domain` 的同一套规则，避免人工操作和自动任务行为不一致。

### 3.8 `facade` 与 `common`：对外边界和公共底座

`facade` 是给其他系统依赖的轻量 RPC 合同，采用独立版本，避免 HRMS 内部实现变化迫使调用方同步升级。`common` 则只承载真正跨模块、跨业务可复用的能力；人员、协议等具体规则不能放入其中，否则会逐渐变成难以维护的“万能模块”。

## 四、🔍 为什么要这样设计

1. **让变化停在正确的边界。** 页面和 HTTP 路径变化主要影响 `bootstrap`、`web`、`service`；数据库变化主要影响 `repository`；外部系统变化主要影响 `integration`。
2. **同一业务规则可以被多个入口复用。** 人工页面、其他系统 RPC、定时任务和消息消费，都可以调用同一个领域服务。
3. **依赖方向更清晰。** `domain` 先定义所需能力，基础设施模块去实现，业务代码不会主动依赖 MySQL、RocketMQ 或某个 RPC 客户端。
4. **更适合复杂且长期演进的业务。** 人员、协议、项目之间规则多、生命周期长；将规则集中后，更容易测试、排查和调整。
5. **对外调用更可控。** `facade` 用作稳定边界，调用方只看到必要的接口和 DTO，不会依赖 HRMS 的内部实现。

## 五、📌 读图时最容易混淆的三组关系

| 容易混淆的模块 | 区别 |
| --- | --- |
| `web` 与 `facade` | `web` 面向本系统 Controller；`facade` 面向其他系统的 RPC 调用方。 |
| `service` 与 `domain` | `service` 编排一次操作；`domain` 决定业务上能否执行以及状态如何变化。 |
| `domain` 与 `repository` / `integration` | `domain` 定义需要的能力接口；基础设施模块用数据库和 RPC 技术完成实现。 |

> [!info] 项目的实际取舍
> 当前项目以 DDD 分层为主，但并非完全“纯领域”：`domain` 中已经直接使用了部分外部 Facade 的 DTO。这样集成开发更直接，但会增加领域层对外部类型的耦合。若外部系统改动频繁，优先在 `integration` 做内部模型转换，会更利于长期维护。

## 六、📌 快速回顾

- `bootstrap` 接请求，`service` 串流程，`domain` 执行核心规则。
- `repository` 管数据库，`integration` 管外部系统。
- `scheduler` 管时间触发，`queue` 管异步通知。
- `web` 是系统内合同，`facade` 是系统外合同。
- 分层的目的不是增加目录，而是让业务规则不被 HTTP、SQL、RPC 等技术细节绑住。
