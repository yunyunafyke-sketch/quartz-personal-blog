---
publish: true
date: 2026-08-20
---

## 一、💡 一句话理解

> [!tip] 核心结论
> 架构不是把代码分成很多文件夹，而是把不同类型的变化隔离开：接口怎么进来、业务怎么编排、业务规则是什么、数据库和远程服务怎么调用，分别由不同边界负责。

`aboss-sso` 的主链路可以概括为：

```text
调用方
  → Adapter 适配层
  → App 应用层
  → Domain 领域层
  → Infrastructure 基础设施层
  → MySQL / Redis / IDaaS / 外部平台
```

## 二、🧭 理论：架构到底是什么

### 2.1 架构不是文件夹，而是责任边界

可以把一个系统想象成一家公司：

| 架构部分 | 类比 | 主要问题 |
| --- | --- | --- |
| Adapter | 前台接待 | 请求从哪里进来、参数怎么接收 |
| App | 流程调度员 | 这次业务要经过哪些步骤 |
| Domain | 业务大脑 | 业务上有哪些概念和规则 |
| Infrastructure | 技术执行部门 | 数据库、缓存、HTTP、RPC 具体怎么调用 |

架构的价值不是让代码看起来“高级”，而是让修改的影响范围可控。

例如，接口路径变化时，最好主要修改 Adapter；数据库从 MySQL 换成其他存储时，最好主要修改 Infrastructure；登录流程增加一步时，最好只增加或调整 Pipeline Handler。

### 2.2 为什么要分层

如果所有代码都写在 Controller 或一个 Service 中，通常会同时出现：

- HTTP 参数处理；
- 参数校验；
- 业务判断；
- SQL 查询；
- Redis 操作；
- 远程接口调用；
- 异常处理和返回结果组装。

这样的代码短期开发快，但后续很难测试、修改和复用。

分层以后，每层只承担一种主要责任，代码之间的关系更容易理解。

## 三、⚙️ 理论：这个项目的分层是怎么工作的

### 3.1 `aboss-sso-client`：对外合同

这个模块主要放 Facade 接口、请求对象和响应 DTO。

它表达的是：

> “别人可以调用我哪些能力，以及调用时需要传什么数据。”

例如登录、认证、账户查询等接口会以 Facade 的形式被暴露。它更像一份稳定的服务合同，不负责真正执行登录。

### 3.2 `aboss-sso-adapter`：请求入口

入口代码位于：

```text
aboss-sso-adapter/src/main/java/com/aliyun/fsi/insurance/sso/web/
```

例如 `LoginController` 负责接收 HTTP 登录请求，`AuthRPCController` 负责接收认证鉴权请求。

Adapter 只应该做入口适配：接收参数、调用 Facade、返回结果。它不应该承载完整业务流程。

### 3.3 `aboss-sso-app`：用例编排

应用层的 Facade 实现位于：

```text
aboss-sso-app/src/main/java/com/aliyun/fsi/insurance/sso/impl/
```

例如 `LoginFacadeImpl` 会组织参数校验、登录执行器、用户查询和登出处理。

可以把 App 层理解成“一个完整业务用例的流程负责人”：它知道先做什么、后做什么，但不应该把所有技术细节都亲自实现。

### 3.4 `aboss-sso-domain`：业务模型和能力契约

领域层主要放账户、Token、登录上下文等业务对象，也放 `AccountGateway`、`ValidTokenGateway` 等接口。

例如：

```java
public interface AccountGateway {
    Account queryOne(Account account);
}
```

这个接口只表达“业务需要查询账户”，不表达“必须使用某条 SQL”。这样业务代码不会直接绑定数据库技术。

### 3.5 `aboss-sso-infrastructure`：技术实现

基础设施层负责把领域契约真正落地：

```text
AccountGateway
  → AccountGatewayImpl
  → AccountMapper
  → MySQL
```

同时，这一层还负责：

- Redis 缓存和失效 Token；
- JWT 解析；
- IDaaS HTTP 调用；
- ACL、组织、文件等外部服务调用；
- 消息发送；
- 领域对象、数据库对象之间的转换。

所以需要记住：

> Domain 说“我要什么”，Infrastructure 说“我怎么实现”。

### 3.6 `start`：启动和打包

启动类位于：

```text
start/src/main/java/com/aliyun/fsi/insurance/sso/Application.java
```

它负责启动 Spring Boot，加载配置，并把其他模块组装成一个可以运行的应用。

因此这些 Maven 模块是代码边界，不代表它们一定是独立部署的微服务。

## 四、🚀 实践：这个架构能拿来干什么

### 4.1 同时支持 HTTP 和 RPC

项目既有 HTTP Controller，也有 Sofa RPC Facade：

```text
浏览器或网关
  → HTTP Controller
  → Facade
  → App 应用逻辑
```

```text
业务系统
  → Sofa RPC Facade
  → App 应用逻辑
```

不同入口可以复用同一套应用能力，避免 HTTP 和 RPC 各写一份登录逻辑。

### 4.2 让登录流程可以扩展

登录使用 Pipeline，把一个复杂登录过程拆成多个处理器。OAuth2 登录和密码登录会共享很多处理器，只替换中间的认证步骤。

这样做的好处是：新增登录步骤时，不必把所有逻辑塞进一个巨大方法。

### 4.3 隔离外部身份系统

IDaaS 负责确认用户身份，SSO 负责补充本地账户信息、生成本系统 JWT、处理单设备登录和 Cookie。

调用方只需要理解 SSO 的接口，不需要直接理解 IDaaS、账户表和本地 Token 结构。

### 4.4 组合不同存储和外部能力

| 组件 | 在本项目中的作用 |
| --- | --- |
| MySQL | 保存账户、角色、Token 等长期数据 |
| Redis | 缓存和失效 Token 等临时数据 |
| IDaaS | 登录、用户信息、账户同步 |
| ACL 等外部平台 | 权限、组织、文件等外部能力 |
| 消息总线 | 发布账户变更和通知事件 |

## 五、🔍 最小例子：一次密码登录怎么走

密码 Web 登录的处理链配置在：

```text
aboss-sso-app/src/main/java/com/aliyun/fsi/insurance/sso/executor/login/LoginPipelineRouteConfig.java
```

最小链路可以理解为：

```text
PasswordWebLoginExecutor
  → 初始化上下文
  → 调用 IDaaS 密码登录
  → 查询用户信息
  → 更新登录时间
  → 查询本地账户
  → 生成 SSO JWT
  → 处理单设备登录
  → 写入 Cookie
```

这里每一步都操作同一个登录上下文。前面的处理器把数据写入上下文，后面的处理器继续使用。

输入是用户名、密码和应用 ID；过程是多个 Handler 依次补充身份、账户和 Token 信息；结果是返回登录 Token，并在 Web 登录场景下写入 Cookie。

## 六、⚠️ 边界与常见误区

- Maven 模块不等于微服务。当前项目最终仍然是一个 Spring Boot 应用。
- Controller 越薄越好，但不是完全没有逻辑；入口参数转换、协议适配可以放在这里，核心业务判断不宜集中在这里。
- Domain 层不是“所有代码都必须放进去”。数据库、Redis、HTTP、RPC 等技术细节仍应留在 Infrastructure。
- Gateway 是接口契约，不是数据库表，也不是网络网关。这里的 Gateway 更接近“领域需要的外部能力抽象”。
- 运行时调用方向和代码依赖方向不一定完全相同。App 运行时会调用 Gateway，Infrastructure 实现 Gateway，但 Domain 不应该依赖具体数据库实现。
- 这个项目是实用型分层架构，带有领域驱动和依赖倒置思想，但不是严格、纯粹的教科书架构；阅读时应以真实代码为准。

## 七、📌 总结

- Adapter 解决“请求怎么进来”。
- App 解决“一个用例怎么编排”。
- Domain 解决“业务上需要什么”。
- Infrastructure 解决“技术上怎么实现”。
- Pipeline 解决“复杂流程如何拆成可组合步骤”。
- 架构最重要的价值，是让变化被限制在合适的边界内。

快速记忆句：

> **入口负责接待，App 负责调度，Domain 负责业务，Infrastructure 负责落地。**

相关笔记：

- [[Maven多模块项目高级知识]]
- [[../项目说明/1.SSO-OAuth2.0与IDaaS登录流程]]
