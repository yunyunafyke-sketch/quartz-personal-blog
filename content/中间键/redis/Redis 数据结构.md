---
title: Redis 数据结构
date: 2026-09-29 10:39:46
publish: true
---

## 一、💡 一句话理解

> [!tip] 核心结论
> Redis 不只是简单的 `key-value` 缓存：key 对应的 value 可以是 String、Hash、List、Set、Sorted Set 等结构。面试时重点讲清楚“结构特点、典型场景、常用命令和底层编码”。

## 二、🧭 理论：常见数据结构

### 2.1 五种经典数据结构

| 类型 | 白话理解 | 常见命令 | 典型场景 | 常见复杂度 |
| --- | --- | --- | --- | --- |
| String | 一个字符串、数字或二进制数据 | `SET`、`GET`、`INCR` | 缓存、计数器、分布式锁 | `GET/SET` 通常为 O(1) |
| Hash | 一个对象里的多个字段 | `HSET`、`HGET`、`HGETALL` | 用户信息、商品信息 | 单字段读写通常为 O(1) |
| List | 按插入顺序排列的双端队列 | `LPUSH`、`RPUSH`、`LPOP`、`LRANGE` | 消息队列、最新列表 | 两端插入删除通常为 O(1) |
| Set | 无序且不重复的集合 | `SADD`、`SISMEMBER`、`SINTER` | 标签、共同关注、去重 | 添加和判断成员通常为 O(1) |
| Sorted Set | 每个成员带一个分数，按分数排序 | `ZADD`、`ZRANGE`、`ZRANK` | 排行榜、延时任务 | 添加通常为 O(log N) |

### 2.2 常见扩展结构

| 类型 | 本质或特点 | 典型场景 |
| --- | --- | --- |
| Bitmap | 在 String 上进行位操作 | 用户签到、在线状态、布尔统计 |
| Geospatial | 基于 Sorted Set 保存地理位置 | 附近的人、门店距离 |
| HyperLogLog | 用少量内存估算不重复元素数量，结果是近似值 | UV 统计 |
| Stream | 类似可持久化的追加日志，支持消费组 | 事件流、消息队列 |

> [!info] 面试范围
> Redis 新版本还提供 JSON、时间序列、向量集合等能力，但常规 Java 面试优先掌握五种经典结构，以及 Bitmap、HyperLogLog、Geospatial、Stream。

## 三、⚙️ 理论：底层是怎么实现的

### 3.1 数据类型和底层编码不是一回事

用户看到的是 String、Hash、List 等**逻辑类型**；Redis 会根据元素数量、内容和配置选择更省内存或更高效的**底层编码**。数据增长超过阈值后，编码可能自动转换。

| 逻辑类型 | Redis 7+ 常见底层编码 | 为什么这样设计 |
| --- | --- | --- |
| String | `int`、`embstr`、`raw` | 整数直接存；短字符串减少内存分配；长字符串使用普通动态字符串 |
| Hash | `listpack`、`hashtable` | 小对象紧凑存储；字段变多后使用哈希表提高查询效率 |
| List | `quicklist`，节点内部通常使用 `listpack` | 同时兼顾两端操作效率和内存占用 |
| Set | `intset`、`listpack`、`hashtable` | 纯整数小集合紧凑存储；普通大集合用哈希表 |
| Sorted Set | `listpack`，或 `skiplist + hashtable` | 小集合节省内存；大集合同时满足按成员查询和按分数排序 |

可以用下面的命令查看某个 key 当前采用的编码：

```redis
OBJECT ENCODING key
```

> [!warning] 版本差异
> 老资料常写 `ziplist`。Redis 7.0 起，Hash 和 Sorted Set 的小对象编码已经使用 `listpack`；回答面试题时最好先说明版本。

### 3.2 为什么 Sorted Set 同时需要跳表和哈希表

- 哈希表：根据成员快速找到分数。
- 跳表：让成员按分数有序，方便排名和范围查询。
- 两份索引指向同一批成员，因此用更多内存换取两类高效查询。

面试可直接回答：**查某个成员靠哈希表，按分数排序和范围查找靠跳表。**

### 3.3 如何选择数据结构

```text
单值、计数器、缓存对象整体      → String
对象需要按字段读写              → Hash
要求顺序，并经常操作首尾         → List
要求去重、成员判断、交并差集      → Set
要求去重，同时还要排序或排名      → Sorted Set
只记录是或否                    → Bitmap
只需要近似统计不重复数量          → HyperLogLog
需要消费组和消息确认              → Stream
```

## 四、🚀 实践：从命令到验证

### 4.1 前置准备

下面示例适用于 Redis 7+。本机已安装 Redis 时，直接进入 `redis-cli`；也可以使用 Docker 启动临时实例：

```bash
docker run --name redis-interview -p 6379:6379 -d redis:7-alpine
docker exec -it redis-interview redis-cli
```

### 4.2 可以拿来干什么

#### 4.2.1 String：缓存和计数

```redis
SET article:1001 "Redis"
GET article:1001
INCR article:1001:view-count
```

`INCR` 是原子操作，适合单个计数器；高并发下不需要先读取再写回。

#### 4.2.2 Hash：保存对象字段

```redis
HSET user:1 name "Tom" age 20
HGET user:1 name
HGETALL user:1
```

适合字段较少、层级简单，并且需要单独修改某个字段的对象。

#### 4.2.3 List：实现先进先出队列

```redis
LPUSH task:queue task1 task2
RPOP task:queue
```

左边放入、右边取出就是 FIFO 队列。不过需要消费组、确认和消息重试时，优先考虑 Stream，而不是只用 List 硬凑。

#### 4.2.4 Set：去重和集合运算

```redis
SADD user:1:follow 10 20 30
SADD user:2:follow 20 30 40
SINTER user:1:follow user:2:follow
```

交集结果是 `20`、`30`，可用于共同关注。大集合执行交并差集可能消耗较多 CPU，不能只看单个命令是否简单。

#### 4.2.5 Sorted Set：排行榜

```redis
ZADD game:rank 100 Alice 90 Bob 120 Carol
ZREVRANGE game:rank 0 2 WITHSCORES
ZRANK game:rank Alice
```

分数决定排序，成员必须唯一；更新同一成员时会覆盖其旧分数。

### 4.3 完整实践：一次验证五种结构

在 `redis-cli` 中依次执行：

```redis
FLUSHDB

SET demo:string hello
HSET demo:hash name Tom age 20
RPUSH demo:list A B C
SADD demo:set A A B
ZADD demo:zset 10 A 20 B

TYPE demo:string
TYPE demo:hash
TYPE demo:list
TYPE demo:set
TYPE demo:zset

GET demo:string
HGETALL demo:hash
LRANGE demo:list 0 -1
SMEMBERS demo:set
ZRANGE demo:zset 0 -1 WITHSCORES

OBJECT ENCODING demo:string
OBJECT ENCODING demo:hash
OBJECT ENCODING demo:list
OBJECT ENCODING demo:set
OBJECT ENCODING demo:zset
```

预期现象：

- `TYPE` 分别返回 `string`、`hash`、`list`、`set`、`zset`。
- Set 中重复添加的 `A` 只保留一份。
- Sorted Set 按分数从小到大返回 `A`、`B`。
- `OBJECT ENCODING` 的结果会受 Redis 版本、数据内容和配置阈值影响，不应死记某一次输出。

> [!warning] 操作说明
> `FLUSHDB` 会清空当前数据库，只能在临时练习实例中执行，不能在共享或生产环境中使用。

## 五、🎤 面试回答模板

### 5.1 如何介绍 Redis 数据结构

> Redis 最常见的五种数据结构是 String、Hash、List、Set 和 Sorted Set。String 常用于缓存与计数；Hash 保存对象字段；List 适合双端队列；Set 用于去重和集合运算；Sorted Set 通过 score 排序，适合排行榜。除此之外还有 Bitmap、HyperLogLog、Geospatial 和 Stream。逻辑数据类型下面还会根据数据规模使用不同编码，例如 Hash 小数据使用 listpack，大数据转为 hashtable；Sorted Set 大数据通常使用跳表加哈希表。

### 5.2 List 和 Stream 怎么选

- List 更简单，适合轻量队列和首尾操作。
- Stream 支持消息 ID、消费组、待确认消息和消息确认，更适合可靠的事件消费。
- 两者都不能自动等同于专业消息中间件，是否采用还要看可靠性、堆积量和运维要求。

### 5.3 Set 和 Sorted Set 有什么区别

- 两者的成员都不重复。
- Set 无序，擅长成员判断和交并差集。
- Sorted Set 给每个成员关联一个 score，可按分数排序，但占用内存和操作成本通常更高。

## 六、📌 总结

- 先记五种经典结构：String、Hash、List、Set、Sorted Set。
- 选择结构时看四点：是否需要顺序、去重、排序，以及是否按字段访问。
- 逻辑类型不等于底层编码；Redis 会在内存和性能之间做权衡。
- Sorted Set 的高频面试点是“跳表负责排序，哈希表负责按成员查分数”。
- 命令复杂度只是一部分，还要考虑大 key、大集合运算和版本差异。

## 七、🔗 官方资料

- [Redis data types](https://redis.io/docs/latest/develop/data-types/)
- [Compare data types](https://redis.io/docs/latest/develop/data-types/compare-data-types/)
- [Redis Streams](https://redis.io/docs/latest/develop/data-types/streams/)
- [Memory optimization](https://redis.io/docs/latest/operate/oss_and_stack/management/optimization/memory-optimization/)
