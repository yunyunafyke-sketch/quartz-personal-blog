---
title: 慢查询与 SQL 优化
date: 2026-10-14 10:11:58
publish: true
---

## 一、💡 一句话理解

> [!tip] 核心结论
> SQL 优化不是看到慢就加索引，而是先找到慢 SQL，再用执行计划确认时间花在哪里，修改后用同样条件重新验证。

本文以 **MySQL 8.4** 为准。相关基础可先看 [[MySQL 索引]] 和 [[EXPLAIN]]。

## 二、🧭 理论：什么是慢查询

### 2.1 慢查询不只是“执行超过几秒”

MySQL 慢查询日志会记录执行时间达到 `long_query_time`，并满足扫描行数等条件的语句。默认情况下，慢查询日志没有开启，`long_query_time` 默认是 10 秒。

实际工作中还要关注：

- 单次很慢的 SQL，例如报表查询需要 8 秒。
- 单次只慢一点、但每秒执行几千次的 SQL。
- 返回数据很少，却扫描大量数据的 SQL。
- 因锁等待而变慢的 SQL。

> [!info] 记忆顺序
> **先定位，后分析，再修改，最后验证。**

## 三、⚙️ 理论：SQL 为什么会慢

### 3.1 常见原因

| 原因 | 白话解释 | 重点检查 |
| --- | --- | --- |
| 缺少合适索引 | 为找少量数据扫描了大量行 | `EXPLAIN` 的 `type`、`key`、`rows` |
| 索引失效 | 有索引，但 SQL 写法使它难以使用 | 函数、隐式类型转换、联合索引顺序 |
| 返回或处理数据过多 | 排序、分组、关联的数据量太大 | `Rows_examined`、临时表、额外排序 |
| 执行计划估算不准 | 优化器以为数据很少，实际很多 | `EXPLAIN ANALYZE` 的预估行数与实际行数 |
| 锁等待 | SQL 本身不复杂，但在等其他事务 | `Lock_time`、事务持续时间 |

下面用 `orders` 订单表分别举例。执行计划中的行数和耗时是为了帮助理解而简化的示意值，实际结果由表结构、数据分布和统计信息决定。

#### 3.1.1 缺少合适索引：为了 20 行扫描 100 万行

```sql
EXPLAIN
SELECT *
FROM orders
WHERE user_id = 1001;
```

假设 `orders` 有 100 万行，`user_id` 没有索引，可能得到：

| type | possible_keys | key | rows | filtered | Extra |
| --- | --- | --- | ---: | ---: | --- |
| `ALL` | `NULL` | `NULL` | 1000000 | 10.00 | `Using where` |

这样阅读：

- `type = ALL`：从头到尾扫描整张表。
- `key = NULL`：没有使用索引。
- `rows = 1000000`：预计检查约 100 万行，不是最终返回行数。
- `Using where`：读出数据后，还要继续判断 `user_id = 1001`。

如果这个查询高频使用，可以评估为 `user_id` 建立索引：

```sql
CREATE INDEX idx_orders_user_id ON orders (user_id);
```

再次 `EXPLAIN`，可能变为：

| type | possible_keys | key | rows | Extra |
| --- | --- | --- | ---: | --- |
| `ref` | `idx_orders_user_id` | `idx_orders_user_id` | 20 | `NULL` |

扫描量从约 100 万行降到约 20 行，才是这个索引真正带来的价值。创建前仍需检查重复索引、表大小和写入影响。

#### 3.1.2 索引失效：在索引列上使用函数

假设 `created_at` 已有索引 `idx_orders_created_at`：

```sql
EXPLAIN
SELECT *
FROM orders
WHERE DATE(created_at) = '2026-10-15';
```

可能得到：

| type | possible_keys | key | rows | Extra |
| --- | --- | --- | ---: | --- |
| `ALL` | `NULL` | `NULL` | 1000000 | `Using where` |

普通索引保存的是原始 `created_at` 值，而查询要先对每行执行 `DATE(created_at)`。优化器可能无法直接用原索引定位日期，于是退化为全表扫描。

把函数计算改成原字段的范围查询：

```sql
EXPLAIN
SELECT *
FROM orders
WHERE created_at >= '2026-10-15 00:00:00'
  AND created_at <  '2026-10-16 00:00:00';
```

执行计划可能变为：

| type | possible_keys | key | rows | Extra |
| --- | --- | --- | ---: | --- |
| `range` | `idx_orders_created_at` | `idx_orders_created_at` | 12000 | `Using index condition` |

`type = range` 表示只扫描索引中这一天对应的范围。这里不用 `23:59:59` 作为结束时间，可以避免遗漏带小数秒的数据。

#### 3.1.3 处理数据过多：分组后还要排序

```sql
EXPLAIN
SELECT user_id, SUM(amount) AS total_amount
FROM orders
GROUP BY user_id
ORDER BY total_amount DESC;
```

可能得到：

| type | key | rows | Extra |
| --- | --- | ---: | --- |
| `ALL` | `NULL` | 1000000 | `Using temporary; Using filesort` |

执行过程大致是：

```text
扫描 100 万行订单
→ 按 user_id 分组并计算 SUM
→ 把中间结果放入内部临时表
→ 按 total_amount 再排序
→ 返回全部用户
```

- `Using temporary`：需要内部临时表保存分组结果。
- `Using filesort`：需要额外排序；名称不代表一定写入磁盘。
- `rows` 很大：排序之前已经处理了大量订单。

如果业务只要前 10 名，应先加 `LIMIT 10` 减少返回结果，但它不保证省掉前面的全量聚合。数据量很大且查询频繁时，通常还要评估汇总表、定时预计算，或能覆盖筛选条件的索引，而不是只盯着 `filesort`。

#### 3.1.4 执行计划估算不准：预计 100 行，实际 10 万行

普通 `EXPLAIN` 只有估算值。要比较估算与实际，可以使用：

```sql
EXPLAIN ANALYZE
SELECT *
FROM orders
WHERE status = 'PENDING';
```

简化后的树形结果可能类似：

```text
Index lookup on orders using idx_orders_status (status='PENDING')
  (cost=35 rows=100)
  (actual time=0.5..180.0 rows=100000 loops=1)
```

重点对比两个 `rows`：

- `rows=100`：优化器执行前预计返回 100 行。
- `actual ... rows=100000`：实际返回 10 万行。
- 估算相差 1000 倍，可能导致优化器继续选择不合适的索引或关联顺序。

这种情况可能由数据分布突变或统计信息不准确导致。可以进一步检查数据分布和统计信息，再决定是否更新统计信息、调整索引或改写查询，不能看到估算错误就直接使用 `FORCE INDEX`。

> [!warning] EXPLAIN ANALYZE 会真正执行 SQL
> 它会真实消耗 CPU、I/O 和内存。重查询应优先在测试环境、只读副本或限制后的数据范围中执行。

#### 3.1.5 锁等待：执行计划正常，SQL 仍然很慢

```text
事务 A：修改订单 1001，但一直没有提交
事务 B：也要修改订单 1001，只能等待事务 A 释放锁
```

事务 B 的语句可能是：

```sql
UPDATE orders
SET status = 'PAID'
WHERE id = 1001;
```

它的 `EXPLAIN` 可能很正常：

| type | possible_keys | key | rows | Extra |
| --- | --- | --- | ---: | --- |
| `range` | `PRIMARY` | `PRIMARY` | 1 | `Using where` |

主键只定位一行，说明慢的原因不是扫描量。`EXPLAIN` 描述的是执行计划，不会告诉你这条语句实际等待锁多久。这时应改查会话和锁等待：

```sql
SHOW PROCESSLIST;

SELECT *
FROM performance_schema.data_lock_waits;
```

如果发现事务 B 正在等待事务 A，应处理长事务、缩短事务持锁时间或修正事务边界，而不是继续添加索引。

### 3.2 优化的核心目标

优化通常是在减少三样东西：

```text
扫描的行数 → 中间结果的数据量 → SQL 的执行次数
```

索引只是手段之一。索引过多还会占用空间，并增加 `INSERT`、`UPDATE`、`DELETE` 的维护成本。

## 四、🚀 实践：从定位到验证

### 4.1 前置准备

准备一条已确认较慢的 `SELECT`，并记录它的执行时间、调用频率、返回行数和扫描行数。生产环境优先使用脱敏参数，在测试环境或只读副本分析。

查看慢查询相关配置：

```sql
SHOW VARIABLES LIKE 'slow_query_log';
SHOW VARIABLES LIKE 'long_query_time';
SHOW VARIABLES LIKE 'slow_query_log_file';
```

> [!warning] 生产环境注意
> 开启日志、修改全局参数、创建索引都属于有副作用的操作，需要评估磁盘、写入压力和变更窗口，不能直接在生产库尝试。

### 4.2 可以拿来干什么

定位到慢 SQL 后，先执行普通 `EXPLAIN`，观察访问方式、实际使用的索引和预计扫描行数：

```sql
EXPLAIN
SELECT id, user_id, status, created_at
FROM orders
WHERE user_id = 1001
  AND status = 1
ORDER BY created_at DESC
LIMIT 20;
```

重点看：

- `type` 是否出现大表全表扫描 `ALL`。
- `key` 是否使用了预期索引。
- `rows` 是否远大于最终返回的 20 行。
- `Extra` 是否出现大数据量的 `Using filesort` 或 `Using temporary`。

### 4.3 完整实践：分析、优化、验证

假设查询经常按 `user_id`、`status` 筛选，再按 `created_at` 倒序取最近 20 条。原来只有单列索引，仍需扫描和排序较多数据。

可以评估联合索引：

```sql
-- 先使用等值查询列，再放排序列，使 MySQL 更容易直接按索引顺序取前 20 条。
CREATE INDEX idx_orders_user_status_created
ON orders (user_id, status, created_at DESC);
```

创建索引前要先确认：目标库表、现有重复索引、数据量、磁盘空间和写入影响。创建后使用相同参数重新执行：

```sql
EXPLAIN ANALYZE
SELECT id, user_id, status, created_at
FROM orders
WHERE user_id = 1001
  AND status = 1
ORDER BY created_at DESC
LIMIT 20;
```

验证结果时对比：

1. 实际耗时是否下降。
2. 实际扫描行数是否减少。
3. 是否消除了大量额外排序。
4. 高并发下的整体吞吐是否改善。
5. 新索引是否明显拖慢写入。

`EXPLAIN ANALYZE` 会真实执行 SQL，重查询应先在测试环境或只读副本验证。

## 五、🎤 面试时怎么流利地说

### 5.1 回答路线

```text
定位慢 SQL → EXPLAIN 分析 → 针对原因优化 → 对比验证 → 评估副作用
```

### 5.2 30 秒标准回答

遇到慢查询，我会先通过监控或慢查询日志定位 SQL，结合执行时间、调用频率和扫描行数判断优先级。然后用 `EXPLAIN` 或 `EXPLAIN ANALYZE` 检查访问方式、索引、扫描行数、排序和临时表，再针对性调整索引或改写 SQL。优化后要用相同数据和参数复测，同时观察写入成本，不能只凭“使用了索引”就认定优化成功。

### 5.3 高频追问与短答

**为什么用了索引还是慢？**

可能索引区分度低、扫描范围仍然很大、需要大量回表或排序，也可能慢在锁等待。要结合实际扫描行数和耗时判断。

**是不是索引越多越好？**

不是。索引会占用空间，并增加写操作的维护成本，应尽量让少量高价值索引覆盖常用查询。

## 六、📌 总结

- 慢 SQL 既看单次耗时，也看执行频率和资源消耗。
- 优化前先定位瓶颈，不要直接改 SQL 或加索引。
- `EXPLAIN` 看预估计划，`EXPLAIN ANALYZE` 看实际执行。
- 优化的核心是减少扫描、减少中间数据、减少不必要调用。
- 修改后必须复测，并评估索引对写入的影响。

## 七、🔗 官方资料

- [MySQL 8.4：慢查询日志](https://dev.mysql.com/doc/refman/8.4/en/slow-query-log.html)
- [MySQL 8.4：优化 SELECT 语句](https://dev.mysql.com/doc/refman/8.4/en/select-optimization.html)
- [MySQL 8.4：使用 EXPLAIN 优化查询](https://dev.mysql.com/doc/refman/8.4/en/using-explain.html)
- [MySQL 8.4：优化与索引](https://dev.mysql.com/doc/refman/8.4/en/optimization-indexes.html)
