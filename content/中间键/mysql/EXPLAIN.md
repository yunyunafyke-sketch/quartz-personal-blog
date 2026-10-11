---
title: EXPLAIN
date: 2026-10-10 14:30:29
publish: true
---

## 一、💡 一句话理解

> [!tip] 核心结论
> `EXPLAIN` 查看 MySQL 优化器预计怎样执行 SQL；`EXPLAIN ANALYZE` 会真正执行 SQL，并展示实际行数、耗时和循环次数。排查慢查询时，不要只看“有没有使用索引”，更要寻找数据从哪里突然变多。

本文以 **MySQL 8.4** 为准。理解本文前，可以先阅读 [[MySQL 索引]]。

## 二、🧭 理论：EXPLAIN 是什么

### 2.1 执行计划是什么

收到一条 SQL 后，MySQL 可能有多种执行方式：

- 读取哪张表。
- 先读取哪张表。
- 使用哪个索引。
- 使用索引查找、索引范围扫描还是全表扫描。
- 多张表使用什么方式关联。
- 是否需要额外排序或临时表。

优化器会根据索引、表统计信息和成本估算，选择一个它认为成本较低的方案。这个方案就是**执行计划**。

在查询前加上 `EXPLAIN`，可以查看优化器选择的执行计划：

```sql
EXPLAIN
SELECT id, user_id, status
FROM orders
WHERE user_id = 1001;
```

普通 `EXPLAIN` 主要展示优化器的**预估结果**，不会返回订单数据。

### 2.2 EXPLAIN 与 EXPLAIN ANALYZE 的区别

| 命令 | 是否真正执行查询 | 主要用途 | 风险 |
| --- | --- | --- | --- |
| `EXPLAIN` | 通常不会 | 查看预估执行计划 | 相对较低 |
| `EXPLAIN FORMAT=TREE` | 通常不会 | 用树形结构查看执行关系 | 相对较低 |
| `EXPLAIN FORMAT=JSON` | 通常不会 | 查看更完整、适合程序分析的计划 | 相对较低 |
| `EXPLAIN ANALYZE` | 会 | 对比预估和实际执行情况 | 可能真实消耗 CPU、I/O 和内存 |

> [!warning] 生产环境注意
> `EXPLAIN ANALYZE` 会真正执行 SQL。重查询可能继续给数据库施压；对于可能产生副作用的语句，更不能在生产环境随手使用。应优先在测试环境、只读副本或经过严格限制的数据范围内分析。

## 三、⚙️ 理论：怎样读懂执行计划

### 3.1 推荐阅读顺序

拿到传统表格格式的执行计划后，建议按照下面的顺序阅读：

```text
table
→ type
→ possible_keys 与 key
→ key_len
→ rows 与 filtered
→ Extra
```

不要一开始就逐列硬背，也不要只看 `key` 是否为空。

### 3.2 table：当前访问哪张表

`table` 表示当前这行计划对应的表。

多表查询中，传统格式一般按照 MySQL 读取表的顺序展示。同一查询块里，前面的表产生多少数据，会影响后面的表被访问多少次。

遇到子查询、派生表或物化结果时，不要机械地背“`id` 越大越先执行”。使用树形计划更容易看出父子关系：

```sql
EXPLAIN FORMAT=TREE
SELECT ...;
```

### 3.3 type：以什么方式访问数据

`type` 的正式含义是访问类型。常见类型大致从好到差排列如下：

```text
system
→ const
→ eq_ref
→ ref
→ range
→ index
→ ALL
```

| type | 白话解释 | 一般如何判断 |
| --- | --- | --- |
| `const` | 通过主键或唯一索引确定最多一行 | 很好 |
| `eq_ref` | 前面的表每产生一组数据，当前表最多匹配一行 | 多表关联中很好 |
| `ref` | 根据普通索引找到一批相同值 | 常见且通常合理 |
| `range` | 扫描索引中的一段范围 | 常见于范围、日期和部分 `IN` 条件 |
| `index` | 把整个索引从头扫到尾 | 仍然是全扫描，只是扫描索引 |
| `ALL` | 扫描整张表 | 大表时重点检查 |

> [!info] 不要见到 ALL 就直接判错
> 表只有几十行时，全表扫描可能比读取索引后再回表更便宜。应结合表大小、扫描行数、实际耗时和调用频率判断。

### 3.4 possible_keys 与 key：候选索引和实际索引

- `possible_keys`：优化器认为可能使用的索引。
- `key`：优化器最后选择的索引。
- `key = NULL`：没有选择索引。

出现下面的情况并不一定是优化器出错：

```text
possible_keys 有值，但是 key 为 NULL
```

常见原因包括：

- 条件会命中表中很大比例的数据。
- 表很小，全表扫描更便宜。
- 索引区分度低。
- 表统计信息不准确。
- 查询最终需要读取大部分数据。

反过来也要注意：`key` 有值只能证明使用了索引，不能证明查询一定很快。

### 3.5 key_len：联合索引用到了多少部分

`key_len` 表示 MySQL 实际使用的索引键长度，经常用于辅助判断联合索引用到了多少列。

假设存在联合索引：

```text
(user_id, status, created_at)
```

下面两个查询的 `key_len` 通常不同：

```sql
-- 主要使用 user_id 部分。
SELECT *
FROM orders
WHERE user_id = 1001;

-- 可能继续使用 status 部分。
SELECT *
FROM orders
WHERE user_id = 1001
  AND status = 1;
```

不要死背具体字节数，因为 `key_len` 还受到字段类型、字符集、长度、变长字段以及是否允许 `NULL` 等因素影响。

### 3.6 rows 与 filtered：预计扫描和留下多少数据

`rows` 表示 MySQL 预计需要检查的行数。对于 InnoDB 表，这是估算值，不保证精确。

`filtered` 表示经过当前表条件过滤后，预计保留的百分比。

例如：

```text
rows = 100000
filtered = 1.00
```

可以大致理解为：

```text
扫描 100000 行
→ 过滤后保留约 1000 行
```

估算公式为：

```text
传给下一步的预计行数 = rows × filtered%
```

慢查询排查的重点通常是减少前面节点产生的数据量。因为前面多产生一批数据，后面的关联、排序和聚合都可能被放大。

### 3.7 Extra：额外执行信息

| Extra | 含义 | 注意点 |
| --- | --- | --- |
| `Using where` | 读取数据后继续按条件过滤 | 很常见，不代表一定慢 |
| `Using index` | 查询需要的数据可以直接从索引取得 | 覆盖索引，一般是好现象 |
| `Using index condition` | 先在索引层应用部分过滤条件 | 有帮助，但仍可能需要回表 |
| `Using filesort` | 需要额外排序 | 不等于必然写磁盘，要结合排序数据量 |
| `Using temporary` | 需要内部临时表保存中间结果 | 大数据量时重点关注 |
| `Range checked for each record` | 前表每产生一行，都重新判断当前表可使用的索引 | 通常需要检查关联条件和索引 |

`Using filesort` 和 `Using temporary` 值得关注，但不能看到后就机械地添加索引。100 行参与排序和 1000 万行参与排序完全不是一个问题。

### 3.8 EXPLAIN ANALYZE：对比预估和实际

`EXPLAIN ANALYZE` 会真正执行查询，并输出类似下面的信息：

```text
Index lookup on orders using idx_user_id
(cost=100 rows=20)
(actual time=0.2..85.0 rows=50000 loops=1)
```

重点关注：

- `cost`：优化器估算的成本，只适合在同一环境中比较计划，不等同于毫秒。
- 第一个 `rows`：优化器预估返回的行数。
- `actual time`：实际开始产出数据和执行完成的时间，单位为毫秒。
- 第二个 `rows`：实际返回的行数。
- `loops`：当前节点执行的次数。

上面的计划预计返回 20 行，实际却返回 50000 行，说明优化器严重低估了数据量。这可能使它继续选择不合适的关联顺序或访问方式。

> [!warning] 不要直接累加树上所有节点的时间
> 父节点的时间通常包含子节点完成的工作，直接相加会重复计算。存在多次循环时，还要结合 `loops` 判断累计开销。

## 四、🚀 实践：从准备到验证

### 4.1 前置准备

开始排查前，至少要准备：

- 原始慢 SQL，不要只拿删减后的 SQL。
- 真实或有代表性的查询参数。
- 相关表结构和索引信息。
- 表的大致数据量。
- MySQL 版本与执行环境。
- SQL 的耗时、调用频率和业务场景。

可以先执行下面这些只读操作：

```sql
-- 查看 MySQL 版本，避免把其他版本的行为直接套用过来。
SELECT VERSION();

-- 查看目标表的完整建表语句和索引定义。
SHOW CREATE TABLE orders;

-- 单独查看目标表的索引信息。
SHOW INDEX FROM orders;
```

### 4.2 可以拿来干什么

#### 4.2.1 判断是否发生大范围扫描

```sql
EXPLAIN
SELECT id, user_id, status
FROM orders
WHERE user_id = 1001;
```

重点查看 `type`、`key`、`rows` 和 `filtered`，判断是否扫描了远多于结果集的数据。

#### 4.2.2 判断联合索引是否真正发挥作用

假设已有索引 `(user_id, status, created_at)`：

```sql
EXPLAIN
SELECT id, user_id, status, created_at
FROM orders
WHERE user_id = 1001
  AND status = 1
  AND created_at >= '2026-10-01 00:00:00';
```

结合 `key`、`key_len`、访问类型和树形计划，判断联合索引使用了哪些部分。

#### 4.2.3 判断排序能否提前停止

```sql
EXPLAIN FORMAT=TREE
SELECT id, user_id, created_at
FROM orders
WHERE user_id = 1001
ORDER BY created_at DESC
LIMIT 20;
```

重点确认是否需要额外排序，以及 `LIMIT 20` 能否让读取过程提前停止。

#### 4.2.4 找出预估与实际的偏差

只在确认查询可以安全执行的环境中使用：

```sql
EXPLAIN ANALYZE
SELECT id, user_id, status, created_at
FROM orders
WHERE user_id = 1001
  AND status = 1
ORDER BY created_at DESC
LIMIT 20;
```

重点对比预估 `rows` 和实际 `rows`，然后查看 `actual time` 与 `loops`。

### 4.3 完整实践：排查一条订单慢查询

假设需要排查下面的 SQL：

```sql
SELECT id, user_id, status, created_at
FROM orders
WHERE user_id = 1001
  AND status = 1
ORDER BY created_at DESC
LIMIT 20;
```

#### 4.3.1 第一步：查看传统执行计划

```sql
-- EXPLAIN：只查看优化器预估计划，不返回订单数据。
EXPLAIN
SELECT id, user_id, status, created_at
FROM orders
WHERE user_id = 1001
  AND status = 1
ORDER BY created_at DESC
LIMIT 20;
```

按下面顺序检查：

1. `type` 是否为 `ALL` 或 `index`。
2. `possible_keys` 是否存在合适候选索引。
3. `key` 最终使用了哪个索引。
4. `key_len` 表明联合索引用到了多少部分。
5. `rows` 预计扫描多少行。
6. `Extra` 是否出现 `Using filesort`。

#### 4.3.2 第二步：查看树形计划

```sql
-- FORMAT=TREE：以树形结构展示访问、过滤、排序和限制之间的关系。
EXPLAIN FORMAT=TREE
SELECT id, user_id, status, created_at
FROM orders
WHERE user_id = 1001
  AND status = 1
ORDER BY created_at DESC
LIMIT 20;
```

重点确认：

- 先过滤还是先排序。
- 使用索引查找、范围扫描还是全表扫描。
- 排序前预计产生多少数据。
- `LIMIT 20` 是否可以提前终止读取。

#### 4.3.3 第三步：在安全环境查看实际计划

```sql
-- ANALYZE：会真实执行 SELECT，只能在确认负载安全后使用。
EXPLAIN ANALYZE
SELECT id, user_id, status, created_at
FROM orders
WHERE user_id = 1001
  AND status = 1
ORDER BY created_at DESC
LIMIT 20;
```

重点寻找：

```text
预估行数与实际行数相差很大的节点
→ actual time 明显增加的节点
→ loops 特别高的节点
→ 在排序或关联前产生大量数据的节点
```

#### 4.3.4 第四步：验证优化是否真的有效

调整 SQL 或索引后，要重新执行同样的检查，并使用相同或同类参数进行对比：

```text
优化前后执行计划
→ 扫描行数
→ 实际返回行数
→ loops
→ 实际耗时
→ 业务高峰期稳定性
```

不要只比较一次执行时间。缓存、并发、磁盘状态和参数分布都会影响结果。

## 五、⚠️ 慢查询中最容易忽略的问题

### 5.1 索引列经过函数或计算

下面的写法可能让 MySQL 难以直接利用普通的 `created_at` 索引形成范围：

```sql
WHERE DATE(created_at) = '2026-10-10'
```

通常可以改写为：

```sql
WHERE created_at >= '2026-10-10 00:00:00'
  AND created_at <  '2026-10-11 00:00:00'
```

这里的目标不是“禁止使用函数”，而是让索引列能直接参与范围定位。

### 5.2 隐式类型转换

如果字段是字符串，却使用数字比较，或者关联字段的数据类型、字符集和排序规则不同，可能影响索引使用：

```sql
-- 假设 phone 是 VARCHAR，不要依赖隐式转换。
WHERE phone = 13800138000
```

应按照字段真实类型传值：

```sql
WHERE phone = '13800138000'
```

### 5.3 前置通配符

普通 B+Tree 索引通常难以直接定位下面的条件：

```sql
WHERE name LIKE '%关键词'
```

如果业务需要包含搜索，应评估全文索引、搜索引擎或其他适合的检索方案，而不是不断叠加普通索引。

### 5.4 深分页

```sql
SELECT id, created_at
FROM orders
ORDER BY created_at DESC, id DESC
LIMIT 100000, 20;
```

数据库可能需要读取并丢弃前面大量数据。更适合的方式通常是记录上一页最后一条数据的位置：

```sql
SELECT id, created_at
FROM orders
WHERE created_at < :last_created_at
   OR (created_at = :last_created_at AND id < :last_id)
ORDER BY created_at DESC, id DESC
LIMIT 20;
```

其中 `:last_created_at` 和 `:last_id` 来自上一页最后一条记录。排序中加入主键可以避免相同时间导致翻页不稳定。

### 5.5 低区分度索引

如果 `status` 只有 `0` 和 `1` 两个值，单独给它建立索引不代表查询一定会使用。一次命中全表一半数据时，全表扫描可能更便宜。

这类字段通常需要结合其他过滤条件设计联合索引。

### 5.6 SELECT 星号

`SELECT *` 可能导致：

- 读取不需要的大字段。
- 增加回表和网络传输。
- 无法形成合理的覆盖索引。
- 增加排序与临时表成本。

但也不要为了覆盖查询无限扩宽索引。索引越宽，占用的存储越多，写入维护成本也越高。

### 5.7 不要过早使用 FORCE INDEX

`FORCE INDEX` 可能让某个参数下的查询变快，却在数据量和数据分布变化后变慢。

更合理的顺序是：

```text
确认 SQL 和真实参数
→ 检查字段类型与现有索引
→ 对比预估与实际
→ 检查统计信息
→ 调整 SQL 或索引
→ 最后才评估索引提示
```

### 5.8 统计信息可能已经失真

如果预估行数与实际行数相差极大，或者优化器明显选择了不合理的索引，需要检查表统计信息。

MySQL 提供下面的语句更新统计信息：

```sql
ANALYZE TABLE orders;
```

> [!warning] 这不是只读操作
> `ANALYZE TABLE` 会更新目标表统计信息。执行前必须确认目标数据库、目标表、业务时段和预计影响范围；生产环境需要按数据库变更流程获得明确确认后再执行。

## 六、📋 快速排查清单

遇到慢 SQL 时依次确认：

- [ ] 使用的是代表性真实参数，而不是随便填的测试值。
- [ ] `type` 是否出现大表 `ALL` 或全索引扫描 `index`。
- [ ] `key` 使用的索引是否符合查询条件。
- [ ] `key_len` 是否表明联合索引只使用了很小一部分。
- [ ] 扫描行数是否远大于最终返回行数。
- [ ] 预估行数与实际行数是否相差几个数量级。
- [ ] `loops` 是否把一个看起来很快的节点重复执行了很多次。
- [ ] 排序或临时表之前是否已经产生大量数据。
- [ ] 条件中是否存在函数、计算、隐式转换或前置通配符。
- [ ] 是否存在深分页、`SELECT *` 或不稳定排序。
- [ ] 是否只因为“没走索引”就盲目增加索引。
- [ ] 优化后是否用同类参数重新验证执行计划和耗时。

## 七、📌 总结

- 普通 `EXPLAIN` 看预估，`EXPLAIN ANALYZE` 看实际。
- `key` 有值不代表一定快，`ALL` 也不代表一定错。
- 慢查询最重要的是扫描行数、实际行数、循环次数和耗时。
- 预估与实际差异很大时，要检查统计信息和数据分布。
- `Using filesort`、`Using temporary` 必须结合参与处理的数据量判断。
- 优化的核心是让无用数据尽早被过滤，不要让它进入后续关联、排序和聚合。

> [!tip] 记忆句
> 先找数据从哪里突然变多，再查为什么没有尽早过滤；索引名称只是线索，实际执行结果才是证据。

## 八、🔗 官方资料

- [MySQL 8.4：EXPLAIN Statement](https://dev.mysql.com/doc/refman/8.4/en/explain.html)
- [MySQL 8.4：EXPLAIN Output Format](https://dev.mysql.com/doc/refman/8.4/en/explain-output.html)
- [MySQL 8.4：Obtaining Execution Plan Information for a Named Connection](https://dev.mysql.com/doc/refman/8.4/en/explain-for-connection.html)
- [MySQL 8.4：ANALYZE TABLE Statement](https://dev.mysql.com/doc/refman/8.4/en/analyze-table.html)
