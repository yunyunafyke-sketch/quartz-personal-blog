---
title: MQ 丢消息、重复消费
date: 2026-09-29 12:31:22
publish: true
---

## 一、💡 一句话理解

> [!tip] 核心结论
> MQ 为了尽量不丢消息，通常会在发送失败或消费失败时重试；但系统无法总能判断“上一次到底成功没有”，因此重试又可能带来重复消息。常见做法是：**生产端确认与补偿、Broker 持久化与副本、消费端手动 ACK，最后由业务幂等兜底。**

面试时先记住这条主线：

```text
防丢：发送确认 + 持久化/副本 + 正确 ACK + 重试补偿
防重：业务唯一键 + 幂等判断 + 数据库唯一约束
```

前置概念可先看 [[Java/中间键/mq/MQ 基础|MQ 基础]]。

## 二、🧭 理论：问题是什么

### 2.1 消息为什么会丢

一条消息会经过三个阶段，任何阶段出问题都可能丢失：

| 阶段 | 常见原因 | 主要处理办法 |
| --- | --- | --- |
| 生产者 → Broker | 网络超时、发送异常，生产者误以为已经成功 | 开启发送确认；失败重试；重要消息使用本地消息表或事务消息补偿 |
| Broker 内部 | 消息只在内存中，Broker 宕机；单节点磁盘损坏 | 消息持久化；部署副本；等待 Broker 确认后再认为发送成功 |
| Broker → 消费者 | 自动 ACK 太早；业务还没完成就 ACK；异常被吞掉 | 使用手动 ACK；业务成功后再确认；失败进入重试或死信队列 |

> [!warning] `send()` 没报错不等于整个业务链路成功
> 它最多说明客户端调用没有立即失败。还要确认 Broker 是否真正接收、保存消息，以及消费者是否完成业务处理。

### 2.2 消息为什么会重复

重复消息通常不是 MQ “无缘无故多发了一条”，而是系统为了避免丢失而进行了重试。

典型情况：

```text
1. 消费者完成数据库更新
2. 消费者还没来得及 ACK 就宕机
3. Broker 认为消息没有处理成功，再次投递
4. 同一业务被执行第二次
```

生产端也可能重复：Broker 已经收到了消息，但确认响应在网络中丢失。生产者无法判断结果，只能重发，于是 Broker 中出现两条业务相同的消息。

因此可靠 MQ 常见的是 **At least once（至少一次）**：尽量不丢，但允许重复，消费者必须保证幂等。

### 2.3 幂等是什么

幂等就是：同一个业务操作执行一次或执行多次，最终业务结果相同。

例如“把订单状态设置为已支付”比较容易做成幂等；“账户余额再减 100 元”直接重复执行就不幂等。

常见方案：

| 方案 | 做法 | 适用场景 |
| --- | --- | --- |
| 数据库唯一约束 | 用业务唯一键建唯一索引，重复插入会失败 | 创建订单、发放权益、消费记录 |
| 消费记录表 | 先写入 `message_id` 或业务单号，已存在则跳过 | 通用消费者去重 |
| 状态机校验 | 只允许状态按合法方向变化，如“待支付 → 已支付” | 订单、审批、任务流 |
| 条件更新 | SQL 中带上旧状态或版本号，只有首次更新成功 | 扣库存、更新状态 |
| Redis 去重 | 使用 `SET NX` 记录已处理标识 | 可接受缓存丢失风险的场景 |

> [!info] 优先使用业务唯一键
> MQ 自带的消息 ID 不一定能代表同一笔业务。生产者重新创建消息时，消息 ID 可能变化，但订单号、支付流水号等业务标识通常不变。

## 三、⚙️ 理论：可靠链路怎么设计

### 3.1 生产端保证消息发出去

1. 开启 Producer Confirm，只有收到 Broker 确认后才记录发送成功。
2. 发送失败或超时可以重试，但要接受“可能已经成功”的不确定性。
3. 不能丢的重要消息，可先把业务数据和待发送消息写入同一个本地事务，再由后台任务不断补发。
4. 监控长时间未发送成功的消息，并提供人工补偿能力。

### 3.2 Broker 保证消息存得住

1. 开启消息持久化，避免只保存在内存中。
2. 使用多副本或高可用队列，降低单节点故障风险。
3. 配置合理的消息保留时间，防止消费者长期故障后消息已经过期清理。

### 3.3 消费端保证处理完成

正确顺序是：

```text
收到消息 → 校验幂等 → 执行业务事务 → 事务提交成功 → ACK
```

如果处理失败，就不要返回成功 ACK，让消息进入重试。达到最大重试次数后进入死信队列（DLQ），再通过告警、排查和补偿处理。

> [!warning] 不要无限重试
> 参数错误、数据缺失等永久性错误不会因为多试几次自动恢复。无限重试只会浪费资源，甚至阻塞后续消息。

## 四、🚀 实践：用数据库唯一约束实现消费幂等

### 4.1 前置准备

本篇以“订单支付成功后发放积分”为例，不限定 RabbitMQ、RocketMQ 或 Kafka。消息中至少包含：

```json
{
  "eventId": "pay-20260929-10001",
  "orderId": "10001",
  "points": 100
}
```

其中 `eventId` 是本次业务事件的唯一标识。

### 4.2 可以拿来干什么

消费者先尝试写入消费记录。`event_id` 有唯一约束，因此同一事件只有第一次能够写入；后续重复投递会被识别并跳过。下面使用 MySQL 语法演示：

```sql
CREATE TABLE mq_consume_record (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    event_id VARCHAR(64) NOT NULL,
    consumer_group VARCHAR(64) NOT NULL,
    consumed_at DATETIME NOT NULL,
    UNIQUE KEY uk_event_consumer (event_id, consumer_group)
);
```

唯一键包含消费者组，是因为同一条消息可能需要被积分、通知等不同消费者分别处理一次。

### 4.3 完整实践：消费、提交和 ACK

下面的伪代码重点是事务边界，与具体 MQ 客户端无关：

```java
@Transactional(rollbackFor = Exception.class)
public void consume(PaymentSucceededEvent event) {
    // insertIfAbsent：内部使用 INSERT IGNORE 写入消费记录。
    // 返回 1 表示首次处理，返回 0 表示唯一键已存在。
    int inserted = consumeRecordRepository.insertIfAbsent(
            event.getEventId(),
            "points-consumer-group");

    if (inserted == 0) {
        // 这条业务事件已经成功处理过，直接返回。
        // 外层仍会正常 ACK，避免无意义重试。
        return;
    }

    // 消费记录和积分发放必须处于同一个数据库事务。
    // 如果积分发放失败，消费记录也会回滚，下次投递仍可重新处理。
    pointsRepository.addPoints(event.getOrderId(), event.getPoints());
}
```

`insertIfAbsent` 对应的核心 SQL：

```sql
INSERT IGNORE INTO mq_consume_record(event_id, consumer_group, consumed_at)
VALUES (?, ?, NOW());
```

使用“插入影响行数”判断是否首次消费，可以避免捕获唯一键异常后，当前数据库事务已经被标记为失败的问题。

监听器的处理原则：

```java
public void onMessage(Message message) {
    try {
        PaymentSucceededEvent event = deserialize(message);
        consumeService.consume(event);

        // 只有业务事务已经成功提交，才能告诉 Broker 消费成功。
        acknowledge(message);
    } catch (Exception e) {
        // 不确认成功，由 MQ 按配置重试；超过次数后进入死信队列。
        rejectForRetry(message, e);
    }
}
```

验证时连续投递两次相同的 `eventId`：消费记录只能有一条，积分也只能增加一次；第二次消息正常 ACK，但不重复执行业务。

## 五、🎤 面试回答模板

### 5.1 一分钟回答

> MQ 丢消息要分三个阶段排查。生产端开启发送确认，失败时重试；可靠性要求高时使用本地消息表或事务消息补偿。Broker 端开启持久化和多副本。消费端使用手动 ACK，只有业务事务提交成功后才确认，失败则重试，超过次数进入死信队列。由于生产重试和消费重投都可能产生重复消息，所以通常采用至少一次投递，并在消费端用业务唯一键、数据库唯一约束、状态机或条件更新保证幂等。核心思想是 MQ 负责尽量投递，业务系统负责最终幂等。

### 5.2 常见追问

**为什么不能先 ACK 再处理业务？**

ACK 后 Broker 会认为消息已经完成。如果业务随后失败，消息通常不会再投递，造成消息丢失。

**为什么业务成功后 ACK 仍可能重复？**

业务已经提交，但 ACK 可能因为宕机或网络异常没有到达 Broker，Broker 只能重新投递。

**Redis `SET NX` 能完全保证幂等吗？**

不能。Key 过期、淘汰或 Redis 故障后可能再次处理，而且“写 Redis”和“写数据库”不是同一个事务。核心业务优先使用数据库唯一约束或状态条件。

**MQ 能不能保证 Exactly Once？**

部分产品在限定范围内提供 Exactly Once 能力，但端到端业务还涉及数据库和外部接口。面试中更稳妥的说法是：使用至少一次投递，再通过业务幂等实现“业务效果只发生一次”。

## 六、📌 总结

- 丢消息要分生产端、Broker 和消费端三个阶段治理。
- 消费成功后再 ACK；失败要有限重试并进入死信队列。
- 重试能降低丢失风险，同时也会产生重复消息。
- 消费幂等优先依赖业务唯一键和数据库唯一约束。
- 记忆句：**确认防丢、重试补偿、幂等防重、死信兜底。**

## 七、🔗 官方资料

- [RabbitMQ：Consumer Acknowledgements and Publisher Confirms](https://www.rabbitmq.com/docs/confirms)
- [RabbitMQ：Reliability Guide](https://www.rabbitmq.com/docs/reliability)
- [Apache RocketMQ：Sending Retry and Throttling Policy](https://rocketmq.apache.org/docs/featureBehavior/05sendretrypolicy/)
- [Apache RocketMQ：Consumption Retry](https://rocketmq.apache.org/docs/featureBehavior/10consumerretrypolicy/)
- [Apache RocketMQ：Basic Best Practices](https://rocketmq.apache.org/docs/bestPractice/01bestpractice/)
- [Apache Kafka：Design - Message Delivery Semantics](https://kafka.apache.org/40/design/design/)
