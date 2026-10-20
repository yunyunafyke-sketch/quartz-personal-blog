---
title: EXPLAIN
date: 2026-10-10 14:30:29
publish: true
---

## 一、🧋 先想象：你在奶茶店帮老板翻订单

> [!tip] 今天只解决一件事
> 老板问：“42 号顾客最近已经付款的 5 单是什么？”
> 你会亲眼看到：同一个问题，从翻 10000 张订单，变成先找 100 张，再变成顺着目录拿 5 张。

先别背执行计划的十几个字段。把这篇当作一份实验说明书：**先猜怎么找 → 跑 SQL → 对照指定位置 → 解释为什么。**

店里有 10000 张订单，来自 100 个顾客。它们存放在订单表 `orders` 中，先看看表里长什么样。

下面是 **3.2 造数 SQL 将生成的部分记录**，为方便阅读按单号倒序摘出；备注有所省略。数据库查询不写 `ORDER BY` 时，不保证返回顺序。

| id：单号 | customer_id：顾客号 | status：付款状态 | created_at：下单时间 | note：备注 |
| --- | --- | --- | --- | --- |
| 9942 | 42 | 1 | 2026-01-07 21:41:00 | 奶茶订单-9942-… |
| 9941 | 41 | 1 | 2026-01-07 21:40:00 | 奶茶订单-9941-… |
| 9842 | 42 | 0 | 2026-01-07 20:01:00 | 奶茶订单-9842-… |
| 9742 | 42 | 1 | 2026-01-07 18:21:00 | 奶茶订单-9742-… |
| 9642 | 42 | 0 | 2026-01-07 16:41:00 | 奶茶订单-9642-… |
| 9542 | 42 | 1 | 2026-01-07 15:01:00 | 奶茶订单-9542-… |
| 9342 | 42 | 1 | 2026-01-07 11:41:00 | 奶茶订单-9342-… |
| 9142 | 42 | 1 | 2026-01-07 08:21:00 | 奶茶订单-9142-… |

`id` 是每张订单的唯一编号；`customer_id` 表示谁买的；`status` 中 **0 = 未付款，1 = 已付款**；`created_at` 用来判断哪单更新；`note` 是订单备注。

现在看着表帮老板找一遍：

1. **先挑人**：只留下 `customer_id = 42`，9941 号订单是 41 号顾客的，排除。
2. **再看付款**：只留下 `status = 1`，9842、9642 还没付款，排除。
3. **按时间从新到旧排**，再取前 5 单：9942、9742、9542、9342、9142。

这就是下面这条 SQL 要做的事。**这里先看懂问题，建表和插入数据在 3.2，执行查询在后面的实验中。**

```sql
-- status = 1 表示已付款；id 用来打破相同时间的并列，保证排序稳定。
SELECT id, customer_id, status, created_at
FROM explain_milk_tea_lab.orders
WHERE customer_id = 42 AND status = 1
ORDER BY created_at DESC, id DESC
LIMIT 5;
```

| 店里的东西 | MySQL 里对应什么 |
| --- | --- |
| 一张订单 | 表里的一行数据 |
| 整个订单柜 | orders 表 |
| 按顾客整理的目录 | customer_id 上的索引 |
| 按“顾客 → 状态 → 时间 → 单号”整理的目录 | 联合索引 |
| 你打算怎么翻订单 | 执行计划 |
| 事先询问“准备怎么找” | EXPLAIN |
| 真找一遍，记录每步工作量 | EXPLAIN ANALYZE |

类比只帮助理解访问路径。真实索引是树结构，不是另存一份完整订单；优化器还会比较成本，不保证有目录就用目录。索引原理可接着读 [[MySQL 索引]]。

## 二、🔍 理论：先认识两张“观察单”

### 2.1 EXPLAIN：看计划，先盯四处

普通 EXPLAIN 展示优化器的预估方案。本文显式使用 `FORMAT=TRADITIONAL`，让结果固定为表格，避免客户端或服务端默认格式不同。

| 看哪里 | 你在问什么 | 本次最关心的变化 |
| --- | --- | --- |
| `type` | 怎么找？ | `ALL` 全表扫描 → `ref` 按普通索引找一批 |
| `key` | 实际用哪个目录？ | `NULL` → 索引名称 |
| `rows` | 预计检查多少行？ | 大约 10000 → 大约 100；这是估算 |
| `Extra` | 还得做什么？ | `Using filesort` 是否消失，是否出现 `Using index` |

再认识两个容易混淆的词：

- `Using filesort`：需要额外排序，**不等于一定落盘**。
- `Using index`：所需列可以从索引拿齐，称为覆盖索引；不只是“用过索引”。

### 2.2 EXPLAIN ANALYZE：看实际干了多少活

下面是**阅读示意，数字是假设值，不是本实验实测**：

```text
-> Limit: 5 row(s) (... actual time=0.1..0.3 rows=5 loops=1)
    -> Sort: ... (... actual time=0.1..0.3 rows=5 loops=1)
        -> Filter: ... (... actual time=0.01..0.2 rows=50 loops=1)
            -> Table scan on orders (... actual time=0.01..0.15 rows=10000 loops=1)
```

从底往上读：**读 10000 行 → 留下 50 行 → 排序取前 5 → 返回 5 行。**

特别注意：排序节点写 `rows=5`，不代表只读了 5 张订单。要继续看它下面的节点；为了知道谁最新，它通常还需要消费所有候选行。

- `cost=... rows=...`：预估成本和预估输出行数，cost 不是毫秒。
- `actual time=a..b`：当前节点首行、完成的耗时，单位毫秒，包含子节点工作。
- `actual ... rows=n`：当前节点实际输出行数，不一定等于底层读过的行数。
- `loops=n`：当前节点执行几次；多次执行时，时间与输出行数按每次循环的平均值理解，行数乘 loops 可估计总输出。

本实验是简单单表查询，`loops` 通常为 1。先把行数看懂，不必现在引入多表关联。

## 三、🚀 实践：准备一间可以随便翻订单的奶茶店

### 3.1 前置准备与执行方式

建议使用 **MySQL 8.4** 的本地或专用练习实例，以下 SQL 按 8.4 文档编写。MariaDB 的输出不能直接套用。

打开你平时使用的数据库客户端，新建查询窗口，按小节顺序执行。命令行用户也可以用 `mysql -h 127.0.0.1 -u 你的用户名 -p` 连接，再粘贴 SQL；密码在提示时输入。

先运行：

```sql
-- 确认连接版本及当前默认库，避免在错误的连接里练习。
SELECT VERSION(), DATABASE();
```

本篇只提供代码，尚未替你连接数据库执行。下方初始化及建索引会写数据库，由你在练习实例手动运行；如果要我代执行，须先按数据库操作约定核对完整 SQL 和影响范围，再由你回复“确认执行”。

### 3.2 初始化：一次生成 10000 张订单

**目标：`explain_milk_tea_lab` 数据库；新建 `digits`、`orders` 两张表，分别写入 10 行、10000 行。** 不修改业务表，不包含清空或删除操作。数据库和表名不使用 `IF NOT EXISTS`：如果重名就报错停下，避免悄悄复用旧数据。

这段只执行一次；任一句报错都先停下，不要接着执行余下语句。

```sql
CREATE DATABASE explain_milk_tea_lab;

-- 10 个数字，后面通过四次组合生成 0～9999，不需要递归或存储过程。
CREATE TABLE explain_milk_tea_lab.digits (
    d TINYINT NOT NULL PRIMARY KEY
) ENGINE=InnoDB;
INSERT INTO explain_milk_tea_lab.digits (d)
VALUES (0),(1),(2),(3),(4),(5),(6),(7),(8),(9);

-- 起初只有主键，没有 customer_id 的索引。
-- note 模拟订单备注，留到最后观察“索引能不能把所需列拿齐”。
CREATE TABLE explain_milk_tea_lab.orders (
    id INT NOT NULL PRIMARY KEY,
    customer_id INT NOT NULL,
    status TINYINT NOT NULL,
    created_at DATETIME NOT NULL,
    note VARCHAR(200) NOT NULL
) ENGINE=InnoDB;

INSERT INTO explain_milk_tea_lab.orders
    (id, customer_id, status, created_at, note)
SELECT n + 1,
       MOD(n, 100) + 1,
       MOD(FLOOR(n / 100), 2),
       DATE_ADD('2026-01-01 00:00:00', INTERVAL n MINUTE),
       RPAD(CONCAT('奶茶订单-', n + 1, '-'), 100, 'x')
FROM (
    SELECT a.d + b.d * 10 + c.d * 100 + d.d * 1000 AS n
    FROM explain_milk_tea_lab.digits a
    CROSS JOIN explain_milk_tea_lab.digits b
    CROSS JOIN explain_milk_tea_lab.digits c
    CROSS JOIN explain_milk_tea_lab.digits d
) AS numbers;
```

验收数据，预期精确为 `10000 / 100 / 50`：

```sql
SELECT COUNT(*) AS total_orders,
       SUM(customer_id = 42) AS customer_42_orders,
       SUM(customer_id = 42 AND status = 1) AS customer_42_paid
FROM explain_milk_tea_lab.orders;
```

**为什么我能提前知道？** 每连续 100 张订单，每位顾客各有 1 单；100 批共 100 单。付款状态每批切换一次，所以每人恰好 50 单已付款。它没有把“42 号顾客”与付款状态绑定，避免造出某顾客全部未付款的假场景。

### 3.3 第一轮：没有顾客目录，挨张翻

先猜：订单柜没有按顾客分类，要知道 42 号顾客最近 5 张已付款订单，是不是得先翻完整个柜子？

```sql
EXPLAIN FORMAT=TRADITIONAL
SELECT id, customer_id, status, created_at
FROM explain_milk_tea_lab.orders
WHERE customer_id = 42 AND status = 1
ORDER BY created_at DESC, id DESC
LIMIT 5;

-- 真执行 SELECT，但不会把订单结果集返回给你，返回的是执行统计。
EXPLAIN ANALYZE FORMAT=TREE
SELECT id, customer_id, status, created_at
FROM explain_milk_tea_lab.orders
WHERE customer_id = 42 AND status = 1
ORDER BY created_at DESC, id DESC
LIMIT 5;
```

**具体看这些：**

1. 表格的 `type` 预期为 `ALL`，`key` 为 `NULL`，`Extra` 包含 `Using filesort`。
2. 树最底部找 `Table scan`，实际 `rows` 预期为 **10000**。
3. 往上找过滤节点，实际输出预期为 **50**；最上面的 Limit 返回 **5**。
4. 表格 `rows` 不一定正好 10000，这是统计估算；不要拿它验证精确总数。

你要得到的结论是：**只返回 5 行，也可能先读了 10000 行。**

### 3.4 第二轮：按顾客做目录，只翻他的 100 张

老板加了一份按顾客号排列的目录。下面只给练习表新增一个索引，不改变订单内容：

```sql
CREATE INDEX idx_customer
ON explain_milk_tea_lab.orders (customer_id);
```

**把 3.3 的两条 EXPLAIN 原样再执行一遍。** 查询完全不动，只改变索引，才方便看清因果。

| 观察点 | 第一轮预期 | 第二轮预期 |
| --- | --- | --- |
| `type` | ALL | ref |
| `key` | NULL | idx_customer |
| 底层读取节点 | Table scan，10000 行 | Index lookup，100 行 |
| 付款过滤后的行数 | 50 | 50 |
| `Using filesort` | 有 | 仍然有 |
| 最终返回 | 5 | 5 |

为什么还要排序？目录只把顾客分好了类，没替你按付款状态和时间排列。他的 100 张订单仍要筛成 50 张，再找出最新 5 张。

> [!info] 已经走索引，为什么还有优化空间？
> “用过目录”只回答了一半问题。你还得问：目录帮我缩小到多少张？剩下的排序省了吗？

### 3.5 第三轮：顾客、付款状态、时间一起排好

这次让目录在每位顾客下面继续按状态分类，再把时间和单号从大到小排好。新增第二个索引，保留上轮索引用于对照：

```sql
CREATE INDEX idx_customer_status_time
ON explain_milk_tea_lab.orders
    (customer_id, status, created_at DESC, id DESC);
```

**再次原样执行 3.3 的两条 EXPLAIN。**

这次重点看：

1. `key` 预期选择 `idx_customer_status_time`。
2. `Extra` 预期不再有 `Using filesort`，并出现 `Using index`。
3. 树里预期不再有 Sort 节点；Limit 下面是索引访问节点。
4. 索引访问节点实际输出预期约 **5 行**：定位顾客及状态后，顺着既定顺序拿够 5 行就能停。
5. 表格的预估 `rows` 仍可能接近 **50**。这与实际只读取前 5 行不冲突，不要混淆预估匹配数量与受 Limit 影响的实际执行。

这里发生了两件独立的好事：**目录有序，省排序；所需列都在目录里，省回表。**

### 3.6 结果对账：三轮找到的订单应该相同

现在把第一节的普通 SELECT 执行一次，真正看订单。

这套数据下，返回的 `id` 必须依次为：

```text
9942
9742
9542
9342
9142
```

它们的 `customer_id` 都是 42，`status` 都是 1，`created_at` 从新到旧。索引改变寻找方式，不改变这条确定排序查询的答案。

最终对照表：

| 轮次 | 生活里的找法 | 预期底层读取量 | 排序 | 返回量 |
| --- | --- | --- | --- | --- |
| 无顾客索引 | 整柜翻一遍 | 10000 | 需要 | 5 |
| 单列索引 | 翻这位顾客的订单 | 100 | 需要 | 5 |
| 联合索引 | 直接到已付款分区，拿最新 5 张 | 约 5 | 省掉 | 5 |

以上计划是基于结构和数据分布推导的**预期**，尚未在你的实例实测。精确数据总数、筛选结果和订单 id 可以算定；优化器是否选该计划、预估行数和耗时必须以你的输出为准。

## 四、🎯 加餐：只改一个地方，你能预测结果吗

### 4.1 多取备注：为什么覆盖索引没了

顾客索引里没有备注，老板却又要看备注。保持条件和排序不变，只多取 `note`：

```sql
EXPLAIN FORMAT=TRADITIONAL
SELECT id, customer_id, status, created_at, note
FROM explain_milk_tea_lab.orders
WHERE customer_id = 42 AND status = 1
ORDER BY created_at DESC, id DESC
LIMIT 5;
```

**先猜再看：** `key` 仍可能是联合索引，通常仍能省排序，但 `Using index` 预期消失，因为取备注需要回到完整记录。

别把 `Using index condition` 当成 `Using index`：前者是索引条件下推，仍可能回表。也别因此给索引塞满备注字段；索引更宽会增加存储与写入维护成本。

### 4.2 按单号找：认识 const

像拿着取餐号找唯一一单，不用筛顾客，也不用排序：

```sql
EXPLAIN FORMAT=TRADITIONAL
SELECT id, customer_id, note
FROM explain_milk_tea_lab.orders
WHERE id = 9942;
```

重点看 `type=const`、`key=PRIMARY`、`rows` 通常为 1。主键等值查询最多确定一行。

### 4.3 按单号范围找：认识 range

```sql
EXPLAIN FORMAT=TRADITIONAL
SELECT id, note
FROM explain_milk_tea_lab.orders
WHERE id BETWEEN 9901 AND 9910;
```

重点看 `type=range`、`key=PRIMARY`，预估行数通常接近 10。真的执行同一 SELECT，恰好返回 10 张订单。

至此你已经亲手见过 `ALL / ref / const / range`。先能解释这四种，再去补其余术语，不用先背“性能排名”。

## 五、🛠️ 输出和预期不同，就这样检查

### 5.1 第二、三轮没选预期索引

先运行只读检查：

```sql
SHOW INDEX FROM explain_milk_tea_lab.orders;
SELECT COUNT(*) FROM explain_milk_tea_lab.orders;
SHOW CREATE TABLE explain_milk_tea_lab.orders;
```

检查索引有没有创建成功、行数是不是 10000、SQL 是否原样执行、是否连到了另一个实例。别先加 `FORCE INDEX`，否则会掩盖优化器本来的选择。

如果确认是统计信息偏差，可以再评估 `ANALYZE TABLE explain_milk_tea_lab.orders;`。它会更新统计信息，**不是只读查询**，不作为本实验必须执行的步骤；让我代执行仍需展示影响并获得“确认执行”。

### 5.2 语法报错或重复执行报错

| 现象 | 处理方式 |
| --- | --- |
| EXPLAIN ANALYZE 语法报错 | 先看 VERSION()；本文以 MySQL 8.4 为准 |
| Database/Table already exists | 停下核对是否已经初始化，不要顺手 DROP 或重复 INSERT |
| Duplicate key name | 说明该轮索引可能已创建，先 SHOW INDEX 检查 |
| 传统 EXPLAIN 出来的是树 | 检查是否写了 FORMAT=TRADITIONAL，以及客户端是否在另行展示计划 |

### 5.3 看不出耗时差距

10000 行在本机内存里可能都很快，客户端显示的总耗时还混有网络与界面开销。这次先比较**读取量、Sort 节点和覆盖索引**，不要为了看见“慢”而盲目扩大数据。

多跑几次耗时也可能因缓存而变化；读取量从 10000 到 100 再到约 5，才是本次最值得记住的证据。

## 六、📌 跑完以后，你应该能回答什么

- 为什么 `LIMIT 5` 仍可能先扫描 10000 行？因为得先找全候选，再确定谁最新。
- 为什么走了索引还要排序？单列目录只解决了按顾客定位，没有满足时间顺序。
- 为什么第三轮能提早停？前两列等值固定后，剩余索引顺序正好匹配 ORDER BY。
- 为什么多取一个 note，覆盖索引就没了？索引里没存这列，需要回完整记录取。
- rows 到底看哪个？表格里看估算，ANALYZE 里看每个节点的实际输出，继续向下追读取节点。

> [!tip] 记忆画面
> 整柜翻 → 只翻他的 → 按顺序拿够就走。
> 读执行计划时，把“用了哪个索引”继续追问成“它究竟帮我少干了多少活”。

跑完可以贴三轮的表格计划和树形计划，重点保留 `key / rows / Extra` 以及树中全部节点；这样就能逐行对照你的真实结果解释。

## 七、🔗 官方资料

本文按官方“查看计划 → 解释输出 → 对照实际执行”的知识顺序组织，实验设计与订单编号是本文自建示例。

- [MySQL 8.4：EXPLAIN Statement](https://dev.mysql.com/doc/refman/8.4/en/explain.html)：语法、TREE 格式和 ANALYZE 实际执行统计。
- [MySQL 8.4：EXPLAIN Output Format](https://dev.mysql.com/doc/refman/8.4/en/explain-output.html)：访问类型、rows、filtered 与 Extra 的含义。
