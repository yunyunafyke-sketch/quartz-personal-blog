---
title: MQ 基础
date: 2026-09-29 12:19:20
publish: true
---

## 一、💡 一句话理解

> [!tip] 核心结论
> MQ（Message Queue，消息队列）是放在服务之间的“消息中转站”：生产者只负责发送消息，消费者按自己的速度处理，从而实现异步、解耦和削峰。

面试时先记住这条主线：

```text
生产者 Producer → 消息中间件 Broker → 队列或主题 → 消费者 Consumer
```

## 二、🧭 理论：MQ 是什么

### 2.1 核心角色

| 角色 | 白话理解 | 主要职责 |
| --- | --- | --- |
| Message | 要投递的一份数据 | 通常包含消息体、业务标识和其他属性 |
| Producer | 发消息的服务 | 创建消息并发送给 Broker |
| Broker | 消息中间件服务器 | 接收、存储、路由和投递消息 |
| Queue | 保存消息的队列 | 缓冲待消费的消息 |
| Topic | 消息分类或发布入口 | 让消费者按主题订阅消息 |
| Consumer | 处理消息的服务 | 获取消息、执行业务并确认处理结果 |
| Consumer Group | 一组执行相同逻辑的消费者 | 共同分担消息，提高消费能力 |

> [!info] 不同产品的叫法不同
> RabbitMQ 常见 `Exchange → Queue`；Kafka 常见 `Topic → Partition`；RocketMQ 常见 `Topic → MessageQueue`。概念不能完全画等号，但它们都在解决消息的存储、分发和消费问题。

### 2.2 两种常见消息模型

| 模型 | 特点 | 典型场景 |
| --- | --- | --- |
| 点对点 | 多个消费者竞争消息，一条消息通常只由其中一个消费者处理 | 订单处理、发短信任务 |
| 发布订阅 | 多个订阅方各自收到消息，每组可以执行不同业务 | 订单创建后，库存、积分、通知分别处理 |

同一个消费者组里的多个实例通常是**竞争消费**，用于分摊压力；不同消费者组之间通常是**独立订阅**，各自都能处理一遍消息。

## 三、⚙️ 理论：它是怎么工作的

### 3.1 一条消息的基本流程

```text
1. aboss-sso 完成账户新增、修改、离职或返聘
2. Producer 把消息发送给 Broker
3. Broker 根据 Topic 和 Tag 保存、路由消息
4. 下游系统订阅账户变更消息并处理
5. Consumer 处理成功后返回 ACK
6. Broker 记录消费进度或移除已经确认的消息
```

`ACK` 是消费者发给 Broker 的确认信号，表示消息已经处理完成。如果消费者处理到一半宕机而没有确认，Broker 通常会尝试重新投递，因此业务代码还要考虑幂等。

### 3.2 为什么使用 MQ

#### 3.2.1 异步：缩短主流程响应时间

账户中心完成账户修改后，把“账户发生变化”写入 MQ，后续同步、通知等处理可以由下游异步完成，不必全部阻塞账户修改接口。

#### 3.2.2 解耦：减少服务之间的直接依赖

`aboss-sso` 只发布账户详情，不必直接调用每个需要账户数据的下游系统。新增订阅方时，账户修改主流程不需要增加一条新的同步调用链。

#### 3.2.3 削峰：保护下游服务

批量账户变更时，消息可以先由 Broker 缓冲，下游消费者按自己的处理能力消费，避免瞬时变化直接压垮下游系统。

> [!warning] MQ 不是免费午餐
> 引入 MQ 后会增加消息丢失、重复消费、顺序、堆积、延迟和运维等问题。同步调用足够简单可靠时，不要为了“架构看起来高级”强行使用 MQ。

### 3.3 结合 aboss-sso 理解 Topic 和 Tag

`aboss-sso` 使用 SOFAMQ/OpenMessaging 发送账户变更消息：

| 配置 | 实际值 | 作用 |
| --- | --- | --- |
| Producer Name | `accountChangeMessage` | 在项目中选择对应的生产者实例 |
| Topic | `TP_CIC_MIDABOSS_SSO_ACCOUNT_MODIFY` | 表示“账号中心账户变更”这一类消息 |
| Tag | `TG_CIC_MIDABOSS_SSO_ACCOUNT_MODIFY` | 在 Topic 内进一步标识消息类型 |
| Body | `AccountDetailDTO` 的 JSON 字节 | 携带变更后的账户详情 |

可以把 Topic 理解成“大分类”，Tag 理解成“大分类下的标签”。下游系统按 Topic 订阅，还可以结合 Tag 过滤自己关心的消息。

> [!info] 与 RabbitMQ 的区别
> `aboss-sso` 代码不是使用 `RabbitTemplate`，而是通过 `io.openmessaging.api.Producer` 发送消息。因此讲项目时应说 SOFAMQ/OpenMessaging 的 `Topic + Tag`，不要套用 RabbitMQ 的 Exchange、Binding 和 Queue 配置。

### 3.4 Consumer Group 到底是什么

Consumer Group 是一组执行相同消费逻辑的消费者实例，也是 MQ 保存订阅关系、消费进度和重试状态的重要标识。

假设账户变更 Topic 有两个消费组：

```text
TP_CIC_MIDABOSS_SSO_ACCOUNT_MODIFY
  ├─ ACL 消费组
  │    ├─ ACL 实例 1
  │    └─ ACL 实例 2
  └─ HRMS 消费组
       ├─ HRMS 实例 1
       └─ HRMS 实例 2
```

- ACL 和 HRMS 是不同消费组，所以一条账户变更消息会被两个组分别处理一次。
- ACL 组内如果是集群消费，实例 1 和实例 2 共同分摊消息，不会要求两个实例各处理一遍。
- 同一个消费组内的实例应该使用相同的 Topic、Tag 和消费逻辑，否则容易出现订阅关系不一致。

### 3.5 集群消费和广播消费

| 对比项 | 集群消费 `CLUSTERING` | 广播消费 `BROADCASTING` |
| --- | --- | --- |
| 一条消息在同组内处理几次 | 由组内某一个实例处理 | 每一个实例都处理 |
| 是否负载均衡 | 是，实例共同分摊 | 否，每台机器都收到全量消息 |
| 扩容效果 | 增加实例通常可提高吞吐量 | 增加实例会增加总处理次数 |
| 常见场景 | 数据同步、订单处理、异步任务 | 刷新本地缓存、推送本机配置 |
| 失败重试 | 通常支持重试和死信队列 | RocketMQ 4.x 广播模式不提供失败重投，需业务自行处理 |

最容易混淆的是：**发布订阅和广播消费不是同一个层次。**

- 不同消费组订阅同一 Topic：每个组都能收到消息，这是发布订阅。
- 同一消费组选择集群模式：组内实例分摊消息。
- 同一消费组选择广播模式：组内每个实例都收到消息。

> [!example] 结合公司项目
> `aboss-property-hrms` 的 `Staff4SsoDepartedListener` 明确设置 `PropertyValueConst.CLUSTERING`，适合多个 HRMS 实例共同处理账户变更。`aboss-organization` 的 `OrgLocalCacheListener` 设置 `PropertyValueConst.BROADCASTING`，因为每个应用实例都有自己的本地缓存，每台机器都必须清理一次。

#### 3.5.1 我踩过的坑：不同应用复用了同一个 Group ID

当时另一个应用也配置了 HRMS 的消费组：

```properties
spring.sofamq.account.outsourced.group=GID_CIC_MIDABOSS_HRMS_ACCOUNT_OUTSOURCED_CHANG_STAFF
```

两个应用都使用这个 Group ID，并且消费者采用 `CLUSTERING` 集群模式。结果是其他应用出现了“消费不到部分消息”的现象。

**表面现象：**

- Topic 中可以查到消息，生产端也发送成功；
- 两个应用都正常启动，没有明显连接异常；
- 有些消息被应用 A 消费，有些消息被应用 B 消费；
- 从单个应用看，就像随机丢消息一样。

**根本原因：**

Group ID 是 MQ 判断消费者是否属于“同一组实例”的消费身份，不是一个可以随意复制的普通配置名称。

```text
应用 A ─┐
        ├─ 相同 Group ID → Broker 认为它们是同一应用的两个实例
应用 B ─┘
                         → 集群负载均衡
                         → 一条消息只分配给其中一个实例
```

应用 B 抢到消息并返回 `Action.CommitMessage` 后，Broker 会推进这个 Group 的消费进度。即使应用 A 的业务也需要这条消息，应用 A 也不会再收到，因此并不是 Broker 把消息弄丢了，而是消息被同组的另一个应用消费并确认了。

如果两个应用使用同一个 Group ID，却订阅不同的 Topic、Tag 或执行不同消费逻辑，还会形成**订阅关系不一致**。这比单纯竞争消费更危险，可能造成订阅混乱和部分实例收不到消息。

**正确修改方式：**

只有“同一个应用、相同 Topic、相同 Tag、相同消费逻辑”的多个实例，才应该共用 Group ID 做水平扩容。

不同应用都需要收到同一条账户变更消息时，应使用不同 Group：

```properties
# HRMS 独立消费组
spring.sofamq.account.outsourced.group=GID_CIC_MIDABOSS_HRMS_ACCOUNT_OUTSOURCED_CHANG_STAFF

# ACL 独立消费组
spring.sofamq.account.modify.group=GID_CIC_MIDABOSS_ACL_ACCOUNT_MODIFY

# 其他应用也要使用自己的 Group ID
spring.sofamq.account.modify.group=GID_CIC_MIDABOSS_OTHER_ACCOUNT_MODIFY
```

```text
账户变更 Topic
  ├─ HRMS Group  → HRMS 独立消费一遍
  ├─ ACL Group   → ACL 独立消费一遍
  └─ Other Group → 其他应用独立消费一遍
```

上面的配置名称用于说明原则，实际值应遵守项目现有的 Group ID 命名和控制台资源配置。

**修改 Group 后还要处理历史消息：**

新 Group 有独立的消费进度，不一定会自动收到旧 Group 已经确认的历史消息。修复配置后还要：

1. 在 SOFAMQ 控制台检查旧 Group 的消费轨迹，确认消息实际被哪个客户端消费。
2. 检查新旧应用的 Topic、Tag 和消费模式是否一致。
3. 根据消息保留时间，重置新 Group 的消费位点，或按消息 ID 重新投递。
4. 补发前确认消费逻辑具备幂等性，避免已经成功的数据被重复处理。
5. 重启消费者后，在控制台确认订阅关系一致，并观察消费进度和堆积量。

> [!warning] 记忆句
> Group ID 相同表示“共同分摊”，Group ID 不同才表示“各自消费”。跨应用复制 MQ 配置时，必须重点检查 Group ID，不能只修改 Topic 和 Tag。

### 3.6 消费消息的完整流程

```text
1. 创建 Consumer，并设置 Group ID
2. 订阅 Topic 和 Tag
3. Consumer 从 Broker 获取消息
4. 把消息体反序列化成业务 DTO
5. 校验参数，并执行数据库或缓存操作
6. 成功返回 CommitMessage
7. 失败返回 ReconsumeLater 或抛出可识别的异常
8. Broker 根据消费结果提交进度，或稍后重新投递
```

在 OpenMessaging/SOFAMQ 风格的代码中：

- `Action.CommitMessage`：消费成功，提交消费结果。以后不应再依赖 MQ 自动重投这条消息。
- `Action.ReconsumeLater`：本次失败，希望 Broker 稍后重投。
- 一直失败：达到最大重试次数后通常进入死信队列，需要告警和人工补偿。

“Push Consumer”也不是 Broker 真正主动调用业务代码。客户端通常在内部通过长轮询获取消息，再回调业务注册的 `MessageListener`。相比手动 Pull，它替开发者管理了拉取、线程、消费进度和重试。

### 3.7 消费端常见问题

| 问题 | 常见原因 | 处理思路 |
| --- | --- | --- |
| 重复消费 | ACK 丢失、消费超时、重试、重平衡 | 用消息 ID 或业务唯一键做幂等，不能假设只投递一次 |
| 消费失败 | 参数异常、数据库故障、下游超时 | 可恢复错误返回稍后重试；不可恢复错误记录并进入人工补偿 |
| 消息堆积 | 生产速度大于消费速度、消费者宕机、单条处理太慢 | 监控消费延迟，扩容集群消费者，优化慢逻辑 |
| 毒消息 | 消息格式错误，每次重试都会失败 | 限制重试次数，进入死信队列并告警 |
| 顺序错乱 | 并发消费、重试、不同队列并行处理 | 同一业务键路由到同一队列，使用顺序消费或业务版本号 |
| 消息过期或进度错误 | 消费组、起始位点或保留时间配置不当 | 上线前确认 Group、消费位点和消息保留策略 |
| 误提交成功 | 捕获异常后仍返回 `CommitMessage` | 只有业务真正完成后才提交；失败必须进入重试或补偿 |

对于账户变更消息，推荐使用 `accId` 作为幂等业务键。仅用“先查再插入/更新”可以降低部分重复影响，但在并发、乱序和重试场景下仍要结合唯一约束、版本号或幂等记录。

### 3.8 死信队列是什么

死信队列（Dead-Letter Queue，DLQ）可以理解成“多次消费仍然失败的消息隔离区”。它的目的不是自动修复业务，而是把持续失败的消息单独保存，避免它无限重试、持续占用消费资源。

```text
正常消息
  → 第一次消费失败
  → 进入重试流程
  → 再次投递
  → 超过最大重试次数
  → 进入当前消费组的死信队列
  → 告警、排查、修复、人工补偿或重新投递
```

| 概念 | 作用 | 后续行为 |
| --- | --- | --- |
| 原 Topic | 保存正常业务消息 | 按正常订阅关系投递 |
| 重试队列 | 暂存等待再次消费的失败消息 | 到达重试时间后重新投递 |
| 死信队列 | 隔离超过最大重试次数的消息 | 通常不再自动消费，需要人工处理或专门程序处理 |

RocketMQ 4.x 中，集群消费的重试 Topic 通常以 `%RETRY%消费者组` 命名，死信 Topic 通常以 `%DLQ%消费者组` 命名。死信队列属于**消费组**，不是只属于原 Topic：同一条消息可能在 ACL 组消费成功，却在 HRMS 组多次失败后进入 HRMS 自己的死信队列。

以账户变更消息为例：

```text
TP_CIC_MIDABOSS_SSO_ACCOUNT_MODIFY
  ├─ ACL Group：消费成功 → Commit
  └─ HRMS Group：反复失败
       → %RETRY%HRMS_GROUP
       → 超过最大重试次数
       → %DLQ%HRMS_GROUP
```

常见进入原因：

- 消息 JSON 格式错误或缺少必填字段；
- 数据库长期不可用；
- 下游接口持续超时；
- 代码缺陷导致每次处理都抛异常；
- 消息版本与消费者版本不兼容。

> [!warning] 死信队列不是垃圾桶
> 进入 DLQ 后，业务数据可能仍未同步。必须监控死信数量并告警，保留 `msgId`、Topic、Tag、Group、原消息体、异常和重试次数；修复原因后再决定重新投递、人工补数据或确认忽略。重新投递前仍要保证幂等，避免已经部分成功的业务被重复执行。

> [!info] 广播模式注意
> RocketMQ 4.x 官方文档说明广播消费不提供失败重投，因此不能依赖“重试后自动进入 DLQ”。广播场景需要应用自己记录失败实例并执行补偿。

### 3.9 面试必须知道的可靠性边界

一条消息要成功走完，需要关注三个阶段：

```text
生产者 → Broker：发送是否成功
Broker 内部：消息是否持久化、是否有副本
Broker → 消费者：处理成功后是否正确 ACK
```

常见投递语义：

| 语义 | 含义 | 业务影响 |
| --- | --- | --- |
| At most once | 最多一次，可能丢但不重复 | 适合允许少量丢失的场景 |
| At least once | 至少一次，不轻易丢但可能重复 | 最常见，消费者必须保证幂等 |
| Exactly once | 业务效果恰好一次 | 通常需要消息系统与业务共同设计，不能只靠一个配置 |

本篇先掌握边界；消息丢失、重复消费、顺序消息和最终一致性应分别深入。

## 四、🚀 实践：读懂 aboss-sso 账户变更 MQ

### 4.1 前置准备

代码仓库位置：

```text
/Volumes/data/ideaWorkSpace/aboss-sso
```

生产端主要查看四处：

```text
aboss-sso-app/.../executor/account/AbsAccountChangeCmdExe.java
aboss-sso-infrastructure/.../mq/AccountChangeMessage.java
aboss-sso-domain/.../external/MessageProducer.java
start/src/main/resources/application.properties
```

同一 Topic 的真实消费端还可以查看：

```text
aboss-acl-support/.../listener/AccountCenterListener.java
aboss-acl-support/bootstrap/src/main/resources/application.properties
aboss-property-hrms/.../listener/Staff4SsoDepartedListener.java
aboss-property-hrms/bootstrap/src/main/resources/application.properties
```

项目通过 `sofamq-client-all` 提供 MQ 客户端，并使用共享消息组件中的 `AbstractMessageSender` 和 `ProducerSelector`。

实际配置如下：

```properties
spring.sofamq.normal.producers.enable=true
spring.sofamq.normal.producers[1].name=accountChangeMessage
spring.sofamq.account.change.topic=TP_CIC_MIDABOSS_SSO_ACCOUNT_MODIFY
spring.sofamq.account.change.tag=TG_CIC_MIDABOSS_SSO_ACCOUNT_MODIFY
```

### 4.2 可以拿来干什么

当外部账户发生新增、修改、离职、返聘或解绑时，`aboss-sso` 在完成本系统数据处理后，广播最新的账户详情，让下游系统感知变化。

```text
账户变更执行器
  → 修改数据库或调用 IDaaS
  → AbsAccountChangeCmdExe.publish(accId)
  → 查询最新 AccountDetailDTO
  → AccountChangeMessage.publish(dto)
  → SOFAMQ Producer.send(message)
  → TP_CIC_MIDABOSS_SSO_ACCOUNT_MODIFY
       ├─ ACL 消费组：新增或更新 ACL 账户数据
       └─ HRMS 消费组：监听账号中心的账户变更
```

ACL 和 HRMS 使用不同的 Group ID，所以它们都能收到这条消息；如果某个组部署多个实例，集群模式下再由该组的实例共同分摊。这体现了解耦：`aboss-sso` 不需要知道有多少下游系统，也不需要逐个同步调用它们。

### 4.3 完整实践：跟踪一次外部账户修改

第一步，在 `ExternalAccountUpdateCmdExe.execute` 中完成账户更新，然后调用 `publish`。下面只保留“在职外部账户修改”的主链路，离职账户在真实代码中还有单独分支：

```java
@Transactional(rollbackFor = Exception.class)
public String execute(ExternalAccountUpdateCmd cmd) {
    Account account = init(cmd);
    update(account);                 // 更新 aboss-sso 账户数据
    modify(account);                 // 同步修改 IDaaS 账户
    buildRelatedAccount(account);    // 维护关联账户关系
    publish(account.getAccountId()); // 发布账户变更消息
    return account.getAccountId();
}
```

第二步，`AbsAccountChangeCmdExe.publish` 查询变更后的完整账户信息，再调用领域层定义的消息接口：

```java
protected void publish(String accId) {
    // 根据账户 ID 查询最新详情，确保消息体反映变更后的数据。
    List<AccountDetailDTO> details = accountListByAccountIdsQryExe.execute(
            new AccountIdsQry().setAccIds(ImmutableList.of(accId)));

    if (CollectionUtils.isNotEmpty(details)) {
        AccountDetailDTO detail = details.get(0);

        // 离职账户发送原手机号，方便下游识别原账户信息。
        if (!detail.getIsValid()) {
            detail.setPhoneNo(detail.getBeforePhoneNo())
                    .setBeforePhoneNo(null);
        }

        accountChangeMessage.publish(detail);   // 发送 MQ
        accountGateway.cleanAccountDetailCache(accId); // 清理账户详情缓存
    }
}
```

第三步，`AccountChangeMessage.publish` 把 DTO 序列化为 JSON，并组装 OpenMessaging `Message`：

```java
@Override
public void publish(AccountDetailDTO accountDetailDTO) {
    // Topic 决定消息所属业务类别，Tag 用于进一步过滤。
    Message message = new Message(
            topic,
            tag,
            JSON.toJSONString(accountDetailDTO).getBytes(StandardCharsets.UTF_8));

    try {
        // ProducerSelector 根据配置名称选出 accountChangeMessage 生产者。
        getProducer().send(message);
    } catch (Exception e) {
        // 当前实现只记录错误日志，没有继续向上抛出异常。
        log.error("account info modify mq error, body: {}",
                JSON.toJSONString(accountDetailDTO), e);
    }
}
```

消息体使用 `AccountDetailDTO`，包含账户 ID、登录名、手机号、邮箱、组织、账户类型、有效状态等账户详情。对外约定可结合 [[账户变更对外广播消息文档]] 查看。

### 4.4 ACL 如何消费账户变更消息

`aboss-acl-support` 使用独立消费组订阅与 `aboss-sso` 完全相同的 Topic 和 Tag：

```properties
spring.sofamq.normal.consumers[7].group-id=GID_CIC_MIDABOSS_ACL_ACCOUNT_MODIFY
spring.sofamq.normal.consumers[7].bean-name=accountCenterListener
spring.sofamq.normal.consumers[7].topic=TP_CIC_MIDABOSS_SSO_ACCOUNT_MODIFY
spring.sofamq.normal.consumers[7].tag=TG_CIC_MIDABOSS_SSO_ACCOUNT_MODIFY
```

`AccountCenterListener` 的核心消费逻辑可以压缩成：

```java
Consumer consumer = accessPoint.createConsumer(properties);

consumer.subscribe(topic, tag, new MessageListener() {
    @Override
    public Action consume(Message message, ConsumeContext context) {
        // 1. MQ 中保存的是字节数组，先转换成 JSON 字符串。
        String body = new String(message.getBody(), StandardCharsets.UTF_8);

        // 2. 反序列化成 ACL 自己定义的请求 DTO。
        SsoAccountDetailReqDTO account =
                JSONUtils.parseObject(body, SsoAccountDetailReqDTO.class);

        // 3. 校验账户 ID、登录名、组织等必要字段。
        validate(account);

        // 4. 按 accId 判断本地是否已有账户，存在则更新，不存在则新增。
        AccountDetailResModel old =
                accountService.getAccountDetailByAccId(account.getAccId());
        if (old != null) {
            accountService.updateAccount(convert(account));
        } else {
            accountService.insertAccount(convert(account));
        }

        // 5. 业务处理成功后提交，Broker 推进该消费组的消费进度。
        return Action.CommitMessage;
    }
});

consumer.start();
```

> [!info] 示例说明
> 上面是根据真实代码压缩后的学习版，`validate` 和 `convert` 用来代替原代码中的详细字段校验与赋值，不是项目中已经存在的同名方法。

这段代码体现了消费端五个关键动作：**订阅、反序列化、校验、执行业务、提交消费结果。**

### 4.5 HRMS 的集群消费

`aboss-property-hrms` 使用另一个 Group ID 订阅同一账户变更 Topic：

```properties
spring.sofamq.account.outsourced.group=GID_CIC_MIDABOSS_HRMS_ACCOUNT_OUTSOURCED_CHANG_STAFF
spring.sofamq.account.outsourced.change.topic=TP_CIC_MIDABOSS_SSO_ACCOUNT_MODIFY
spring.sofamq.account.outsourced.change.tag=TG_CIC_MIDABOSS_SSO_ACCOUNT_MODIFY
```

消费者明确设置了集群模式：

```java
properties.setProperty(PropertyKeyConst.GROUP_ID, groupId);

// CLUSTERING：同一个 HRMS 消费组的多个实例共同分摊消息。
properties.setProperty(
        PropertyKeyConst.MESSAGE_MODEL,
        PropertyValueConst.CLUSTERING);

Consumer consumer = accessPoint.createConsumer(properties);
consumer.subscribe(topic, accountChangedTag, (message, context) -> {
    String body = new String(message.getBody(), StandardCharsets.UTF_8);
    AccountDetailDTO account = JSONUtils.parseObject(body, AccountDetailDTO.class);

    // 当前项目代码的可见分支最终都返回 CommitMessage。
    return Action.CommitMessage;
});
consumer.start();
```

如果 HRMS 部署 3 个实例，在集群模式下，一条账户消息通常只交给其中 1 个实例处理；不是 3 个实例都执行一次。

### 4.6 广播消费的真实使用场景

账户变更链路使用集群消费更适合业务数据处理。公司项目中的广播示例位于 `aboss-organization` 的 `OrgLocalCacheListener`：

```java
// BROADCASTING：每个应用实例都收到消息。
properties.setProperty(
        PropertyKeyConst.MESSAGE_MODEL,
        PropertyValueConst.BROADCASTING);

consumer.subscribe(topic, tag, (message, context) -> {
    OrganizationMessageModel org = parse(message);

    // 本地缓存属于当前 JVM，所以每台机器都必须各自清理。
    organizationLocalCache.invalidLocalOrgCacheByCode(org.getBranchOrgCode());
    return Action.CommitMessage;
});
```

如果组织服务部署 3 个实例，每个实例各有一份 Caffeine 本地缓存，那么同一条缓存失效消息必须在 3 台机器上各处理一次，这就是广播消费适合的场景。

### 4.7 消费失败应该怎么返回

下面是消费结果的最小判断方式：

```java
public Action consume(Message message, ConsumeContext context) {
    try {
        AccountDetailDTO account = parseAndValidate(message);

        // 业务必须支持重复执行，例如以 accId 做唯一键或幂等判断。
        accountService.saveOrUpdate(account);

        // 只有业务真正完成后才确认成功。
        return Action.CommitMessage;
    } catch (RetryableException e) {
        // 数据库暂时不可用、下游超时等可恢复故障，稍后重试。
        return Action.ReconsumeLater;
    } catch (IllegalArgumentException e) {
        // 无法恢复的脏数据不能无限重试：记录完整消息并告警。
        saveBadMessageAndAlarm(message, e);
        return Action.CommitMessage;
    }
}
```

其中 `RetryableException`、`parseAndValidate`、`saveOrUpdate` 和 `saveBadMessageAndAlarm` 都是解释流程的占位名称，不代表项目已有这些方法。

> [!warning] 不要无脑捕获异常后提交
> 如果数据库更新失败，却在 `catch` 后仍返回 `CommitMessage`，Broker 会认为消息已经处理完成，不再自动重投。相反，如果参数永远错误却始终返回 `ReconsumeLater`，消息会反复失败，最后进入死信队列。消费端要区分“可恢复故障”和“永久性脏数据”。

### 4.8 发现死信消息后怎么处理

以账户变更消费失败为例，处理顺序应当是：

1. 在 SOFAMQ 控制台确认发生死信的 Consumer Group，而不只是看原 Topic。
2. 根据 `msgId` 查看原 Topic、Tag、消息体、投递次数和最后一次异常。
3. 判断是临时故障、永久脏数据、代码缺陷，还是消息版本不兼容。
4. 先修复真正原因；没有修复前不要反复重新投递。
5. 检查目标系统是否已经部分写入数据，确认补偿操作具备幂等性。
6. 重新投递或人工补数据，并核对 ACL、HRMS 等相关系统的最终状态。
7. 记录处理结果，并为死信数量、最老死信时间和重复进入 DLQ 建立告警。

> [!example] aboss-sso 账户变更
> 如果 ACL 消费组因为数据库短暂故障进入重试，数据库恢复后可能重试成功；如果因为 `AccountDetailDTO` 永久缺少必填字段反复失败，继续重试没有意义，应保留原消息并告警。修复数据或兼容逻辑后，再按 `accId` 幂等补偿。

当前代码仓库没有给出生产环境最大重试次数和 DLQ 运维策略，这些值需要从 SOFAMQ 控制台、消费组元数据或环境配置中确认，不能直接套用开源 RocketMQ 的默认值。

### 4.9 如何验证完整链路

在具备内部运行环境和 SOFAMQ 配置时，可以按下面顺序验证：

1. 对测试账户执行一次外部账户修改。
2. 在 `ExternalAccountUpdateCmdExe.execute` 和 `AccountChangeMessage.publish` 设置断点。
3. 确认 `AccountDetailDTO` 是数据库更新后的数据。
4. 检查日志中是否出现 `account info modify mq` 的发送记录。
5. 在 MQ 控制台按 Topic、Tag 或消息 ID 查询生产结果；当前发送代码没有设置业务 Key。
6. 检查 ACL 消费组和 HRMS 消费组各自的消费进度、堆积量和失败次数。
7. 确认 ACL 账户表是否完成新增或更新，并核对消费者日志中的 `msgId`。
8. 用同一条消息做重复投递测试，确认业务结果不会重复新增或被旧数据错误覆盖。

> [!warning] 当前代码的可靠性观察
> `AccountChangeMessage` 捕获发送异常后只记录日志，没有把异常继续抛出。因此 MQ 发送失败时，外层数据库事务不会因为这个异常自动回滚，接口也可能仍然返回成功；反过来，消息发送成功后数据库事务仍可能提交失败。面试时可以据此说明：可靠消息不能只看“调用了 send”，还要考虑发送确认、失败补偿、事务消息或本地消息表，以及下游消费幂等。

`aboss-sso` 仓库本身只有生产者；本篇的实际消费者来自 `aboss-acl-support` 和 `aboss-property-hrms`。最大重试次数、死信队列和服务端消费位点仍需要结合 SOFAMQ 控制台与各环境配置确认。

## 五、🎤 面试回答模板

### 5.1 什么是 MQ，为什么使用它

> MQ 是服务之间传递消息的中间件。以 `aboss-sso` 为例，账户新增、修改、离职或返聘后，项目把最新的 `AccountDetailDTO` 发送到固定 Topic 和 Tag，下游系统自行订阅处理。这样可以实现异步和解耦，也能用 Broker 缓冲流量。代价是要继续处理发送失败、重复消费、消息堆积和数据一致性等问题。

### 5.2 Queue 和 Topic 有什么区别

> Queue 更强调任务排队和竞争消费，一条消息通常由一个消费者实例处理；Topic 更强调按主题发布订阅，不同消费者组可以各自处理一遍消息。`aboss-sso` 使用的是 Topic 和 Tag 模型，账户中心只负责生产消息；下游有几个消费组、每组如何消费，需要结合订阅方配置判断。

### 5.3 如何介绍 aboss-sso 的 MQ 链路

> `aboss-sso` 在账户变更完成后，通过 `AbsAccountChangeCmdExe.publish` 查询最新账户详情，再由 `AccountChangeMessage` 把 `AccountDetailDTO` 序列化成 JSON，通过 SOFAMQ/OpenMessaging Producer 发送到账户变更 Topic。ACL 和 HRMS 使用不同 Group ID 订阅，所以两个系统都能收到消息；HRMS 明确使用集群模式，同组多个实例共同分摊。ACL 消费后按 `accId` 新增或更新本地账户，并在成功后返回 `CommitMessage`。这条链路实现了解耦，但生产端异常只记日志、消费端还可能重复或乱序，因此仍需发送补偿、消费幂等和监控告警。

### 5.4 集群消费和广播消费有什么区别

> 集群消费是同一个消费组里的多个实例共同分摊消息，一条消息通常只由其中一个实例处理，适合业务任务和数据同步。广播消费是同组每个实例都处理每条消息，适合刷新每台机器自己的本地缓存或配置。不同消费组订阅同一 Topic 时，每个组仍会各自消费一遍，这属于发布订阅，不要和组内广播混为一谈。

### 5.5 消费失败怎么办

> 消费成功后返回 `CommitMessage`；数据库临时故障或下游超时等可恢复问题返回 `ReconsumeLater`，让 Broker 稍后重投；超过最大重试次数后进入死信队列并告警。参数永久错误的毒消息不应该无限重试，应保存原消息并人工处理。RocketMQ 4.x 的广播消费不提供失败重投，所以广播场景还要自行做好失败记录和补偿。

### 5.6 如何防止重复消费

> MQ 一般按至少一次投递设计，ACK 丢失、消费超时、重试和重平衡都可能造成重复。消费者不能依赖“MQ 只发一次”，而要使用消息 ID 或业务唯一键做幂等。账户变更场景可以以 `accId` 为业务键，结合数据库唯一约束、幂等记录或数据版本号，避免重复新增以及旧消息覆盖新数据。

### 5.7 什么是死信队列

> 死信队列是隔离“超过最大重试次数仍消费失败”的消息的特殊队列。它可以避免毒消息无限重试，但不会自动修复业务。RocketMQ 的 DLQ 通常按 Consumer Group 隔离，所以同一条账户变更消息可能在 ACL 组消费成功，却进入 HRMS 组的死信队列。生产环境要监控死信并告警，结合消息 ID 和异常排查原因，修复后再幂等地重新投递或人工补偿。

### 5.8 如何介绍这次 Group ID 踩坑

> 我遇到过一次 MQ 消费问题：另一个应用误用了 HRMS 的 `GID_CIC_MIDABOSS_HRMS_ACCOUNT_OUTSOURCED_CHANG_STAFF`。因为消费者使用集群模式，Broker 把两个不同应用当成同一个消费组的两个实例，消息在它们之间负载均衡。某个应用消费并提交后，另一个应用就不会再收到，所以表现得像随机丢消息。如果两个应用的 Topic 或 Tag 还不一致，也会造成订阅关系不一致。后来改成每个独立业务应用使用自己的 Group ID，并通过控制台检查消费轨迹、订阅关系和消费位点；需要补历史消息时，再重置位点或按消息 ID 重投，同时保证消费幂等。

## 六、📌 总结

- MQ 的核心链路是 `Producer → Broker → Consumer`。
- 三个主要价值是异步、解耦和削峰。
- 不同消费组各自消费一遍；集群模式下同组实例分摊，广播模式下同组每个实例都消费。
- 不同业务应用不能复用 Group ID，否则会被当成同组实例竞争消息。
- ACK 表示消费完成；没有成功确认的消息可能被重新投递。
- `At least once` 场景下可能重复消费，业务必须考虑幂等。
- `aboss-sso` 是账户变更消息的生产者，使用 SOFAMQ/OpenMessaging 的 Topic 和 Tag 模型。
- ACL 和 HRMS 是该账户消息的真实消费者，使用各自的 Group ID 独立消费。
- 消费成功才返回 `CommitMessage`；可恢复故障应进入重试，永久错误应告警和补偿。
- 超过最大重试次数的消息进入当前消费组的死信队列，之后需要人工排查和补偿。
- 项目代码中的发送异常只记日志，这正是面试中可以展开说明的可靠性风险。

## 七、🔗 官方资料

- [RabbitMQ：AMQP 0-9-1 Model Explained](https://www.rabbitmq.com/tutorials/amqp-concepts)
- [RabbitMQ：Java Hello World Tutorial](https://www.rabbitmq.com/tutorials/tutorial-one-java)
- [Spring AMQP：RabbitTemplate](https://docs.spring.io/spring-amqp/reference/amqp/template.html)
- [Spring AMQP：@RabbitListener](https://docs.spring.io/spring-amqp/reference/amqp/receiving-messages/async-annotation-driven.html)
- [Apache RocketMQ 5.0：Domain Model](https://rocketmq.apache.org/docs/domainModel/01main/)
- [Apache RocketMQ 5.0：Consumer Types](https://rocketmq.apache.org/docs/featureBehavior/06consumertype/)
- [Apache RocketMQ 5.0：Consumer Load Balancing](https://rocketmq.apache.org/docs/featureBehavior/08consumerloadbalance/)
- [Apache RocketMQ 5.0：Message Filtering](https://rocketmq.apache.org/docs/featureBehavior/07messagefilter/)
- [Apache RocketMQ 5.0：Consumption Retry](https://rocketmq.apache.org/docs/featureBehavior/10consumerretrypolicy/)
- [Apache RocketMQ 4.x：Push Consumer、集群与广播模式](https://rocketmq.apache.org/docs/4.x/consumer/02push/)
- [Apache RocketMQ 5.0：Consumer Group 与死信策略](https://rocketmq.apache.org/docs/domainModel/08consumergroup/)
- [Apache RocketMQ 4.x：订阅关系一致性](https://rocketmq.apache.org/docs/4.x/bestPractice/07subscribe/)

## 八、📚 相关笔记

- [[MQ 丢消息、重复消费|MQ 丢消息、重复消费]]
- [[aboss-sso项目架构]]
- [[账户变更对外广播消息文档]]
