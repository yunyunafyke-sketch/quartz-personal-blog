---
title: Redis 缓存问题
date: 2026-09-29 11:09:55
publish: true
---

## 一、💡 一句话理解

> [!tip] 核心结论
> Redis 缓存的价值是用内存换速度、减轻数据库压力；面试重点不是“会用 `GET/SET`”，而是能讲清楚 **Cache Aside、数据一致性、过期与淘汰，以及异常流量如何保护数据库**。

## 二、🧭 理论：缓存是怎么用的

### 2.1 为什么使用缓存

数据库适合可靠地保存数据，但磁盘访问、复杂查询和并发竞争都可能增加响应时间。Redis 把热点数据放在内存中，让大量读请求不必每次查询数据库。

缓存中的数据通常只是数据库数据的副本，所以要接受两个事实：

- 缓存可能短暂过期或不一致。
- 缓存丢失后，数据必须能够从数据库重新加载。

### 2.2 Cache Aside 是什么

Cache Aside（旁路缓存）由应用程序同时管理 Redis 和数据库，是最常见的缓存模式。

```text
读取：先查 Redis → 命中直接返回 → 未命中查数据库 → 写入 Redis
写入：先更新数据库 → 再删除 Redis 中的旧缓存
```

Redis 官方 Cache Aside 示例也是读取时先查缓存，未命中后读取主数据源并回填；写入主数据源后删除缓存，让下一次读取重新加载。

## 三、⚙️ 理论：常见缓存问题

### 3.1 缓存与数据库不一致

最常见方案是：**先更新数据库，再删除缓存**。

为什么通常删除缓存，而不是直接更新缓存？

- 删除逻辑简单，下一次读取会从数据库加载最新值。
- 一个数据库对象可能对应多个缓存结构，直接更新容易漏字段或漏 Key。
- 有些数据写多读少，写入时立刻计算并更新缓存会浪费资源。

```text
更新请求：更新数据库成功 → 删除缓存
下一次查询：缓存未命中 → 查询数据库 → 回填新值
```

如果删除缓存失败，可以通过重试、消息队列或订阅数据库变更日志再次删除。普通业务一般接受短暂的最终一致性；强一致性要求高时，不能只依赖普通 Cache Aside。

> [!warning] 为什么不建议“先删缓存，再更新数据库”
> 删除后若有并发读请求，它可能把数据库中的旧值重新写回缓存；随后数据库虽然更新成功，缓存却继续保留旧值。

### 3.2 过期时间和内存淘汰

这两个概念不要混淆：

| 机制 | 什么时候发生 | 解决什么问题 |
| --- | --- | --- |
| TTL 过期 | Key 到达业务设置的有效期 | 限制数据陈旧时间，避免缓存永久存在 |
| 内存淘汰 | Redis 内存超过 `maxmemory` | 按 `maxmemory-policy` 释放空间 |

常见淘汰策略：

- `noeviction`：不淘汰，新增数据时返回错误。
- `allkeys-lru`：优先淘汰最近最少使用的 Key。
- `allkeys-lfu`：优先淘汰访问频率最低的 Key。
- `volatile-*`：只从设置了 TTL 的 Key 中淘汰。

纯缓存场景常考虑 `allkeys-lru` 或 `allkeys-lfu`，但最终要根据访问模式和命中率选择。Redis 的 LRU、LFU 都是近似实现，不是对全部 Key 做精确排序。

### 3.3 热 Key 和大 Key

- **热 Key**：少数 Key 承担大量访问，可能让单个 Redis 节点、网络或 CPU 成为瓶颈。可使用本地缓存、读副本、拆分 Key、限流等方式分散压力。
- **大 Key**：单个 String、Hash、List、Set 等保存过多数据，会增加网络传输、阻塞时间、删除成本和内存压力。应拆分数据、分页读取，并避免一次处理全部元素。

面试时不必死背“大 Key 必须超过多少字节”。它取决于业务延迟、元素数量和网络环境，重点是能识别影响并提出拆分方案。

### 3.4 穿透、击穿和雪崩

| 问题 | 核心原因 | 主要办法 |
| --- | --- | --- |
| 缓存穿透 | 查询 Redis 和数据库都不存在的数据 | 参数校验、缓存空值、布隆过滤器 |
| 缓存击穿 | 单个热点 Key 失效，大量请求同时查数据库 | 互斥重建、逻辑过期 |
| 缓存雪崩 | 大量 Key 同时失效，或 Redis 整体不可用 | 随机 TTL、高可用、限流和降级 |

详细原理和回答模板见 [[缓存击穿、穿透与雪崩]]。

## 四、🚀 实践：从配置到验证

### 4.1 前置准备

本篇目标是面试表达，不搭建完整项目。使用 Redis 和 `redis-cli` 即可验证 TTL、内存策略和命中率。

### 4.2 可以拿来干什么

#### 4.2.1 给缓存设置 TTL

```redis
SET cache:product:1 "{\"name\":\"键盘\"}" EX 1800
GET cache:product:1
TTL cache:product:1
```

结果：商品缓存 30 分钟后自动失效。生产环境批量写入时可在基础 TTL 上增加随机值，避免大量 Key 同时过期。

#### 4.2.2 查看缓存命中情况

```redis
INFO stats
```

重点观察：

- `keyspace_hits`：查询命中次数。
- `keyspace_misses`：查询未命中次数。
- `evicted_keys`：因内存不足被淘汰的 Key 数量。
- `expired_keys`：因 TTL 到期被删除的 Key 数量。

命中率可粗略计算为：

```text
keyspace_hits / (keyspace_hits + keyspace_misses) × 100%
```

### 4.3 完整实践：一次 Cache Aside 查询

面试时可以用下面的伪代码说明完整流程：

```java
Product queryProduct(long id) {
    // 1. 先查 Redis。命中后直接返回，不访问数据库。
    String cacheKey = "cache:product:" + id;
    String json = redis.get(cacheKey);
    if (json != null) {
        // 命中空值标记时直接返回不存在，不能把标记当成商品 JSON 解析。
        return "__NULL__".equals(json) ? null : deserialize(json);
    }

    // 2. 缓存未命中，再查询数据库。
    Product product = database.findById(id);
    if (product == null) {
        // 3. 不存在的数据缓存一个短期空值，减少缓存穿透。
        redis.set(cacheKey, "__NULL__", 120, SECONDS);
        return null;
    }

    // 4. 回填缓存，并给 TTL 增加随机值，降低集中失效风险。
    long ttl = 1800 + random.nextLong(301);
    redis.set(cacheKey, serialize(product), ttl, SECONDS);
    return product;
}

void updateProduct(Product product) {
    // 5. 先让数据库成为最新的权威数据源。
    database.update(product);

    // 6. 再删除旧缓存；删除失败时应记录日志并进入重试流程。
    redis.delete("cache:product:" + product.getId());
}
```

验证重点：第一次读取访问数据库并回填缓存，第二次读取命中 Redis；更新数据库并删除缓存后，下一次读取重新加载最新值。

## 五、🎤 面试回答模板

### 5.1 一分钟回答

> Redis 缓存通常采用 Cache Aside：读请求先查缓存，未命中再查数据库并回填；写请求先更新数据库，再删除缓存。这样实现简单，但只能保证最终一致性，删除失败要通过重试或消息机制补偿。缓存 Key 应设置合理 TTL，并通过随机过期时间避免集中失效；Redis 达到 `maxmemory` 后还会根据 LRU、LFU 等策略淘汰数据。另外要关注热 Key、大 Key、缓存穿透、击穿和雪崩，核心目标都是保护 Redis 和数据库，避免流量直接压垮后端。

### 5.2 常见追问

**为什么更新数据库后是删除缓存，而不是更新缓存？**

删除更简单，下一次读取会按数据库最新值重建缓存，也能避免复杂缓存结构更新不完整。

**删除缓存失败怎么办？**

记录失败任务并重试；可靠性要求更高时，可通过消息队列或数据库变更日志异步删除缓存。

**设置了 TTL，为什么还需要淘汰策略？**

TTL 解决业务过期问题；淘汰策略处理 Redis 已达到内存上限但仍要写入新数据的问题，两者触发条件不同。

## 六、📌 总结

- Cache Aside：读缓存，未命中查数据库并回填；写数据库后删除缓存。
- 普通缓存通常追求最终一致性，删除失败必须有重试或补偿。
- TTL 是业务过期，内存淘汰是容量保护，二者不能混为一谈。
- 热 Key 要分散流量，大 Key 要拆分数据。
- 记忆句：**读时先缓存，写时删缓存；过期管时间，淘汰管空间。**

## 七、🔗 官方资料

- [Redis Cache Aside with Jedis](https://redis.io/docs/latest/develop/use-cases/cache-aside/java-jedis/)
- [Redis Key Eviction](https://redis.io/docs/latest/develop/reference/eviction/)
- [Redis SET 命令](https://redis.io/docs/latest/commands/set/)
- [Redis Anti-Patterns](https://redis.io/tutorials/redis-anti-patterns-every-developer-should-avoid/)
