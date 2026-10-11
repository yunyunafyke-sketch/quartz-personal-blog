---
title: MySQL数据库类型
date: 2026-10-10 14:03:47
publish: true
---

## 一、💡 数据类型怎么选

> [!tip] 核心原则
> 先确定数据保存的是数字、金额还是文字，再选择能够准确表达业务含义的最小类型。

常见业务字段可以这样选择：

| 数据 | 推荐类型 | 示例 |
|---|---|---|
| 主键 ID | `BIGINT` | `10001` |
| 数量、次数 | `INT` | `3` |
| 金额 | `DECIMAL` | `54.70` |
| 长度固定的字符串 | `CHAR` | `CNY` |
| 长度变化的字符串 | `VARCHAR` | `机械键盘` |

## 二、🔢 整数类型：INT 和 BIGINT

`INT` 和 `BIGINT` 都用于保存没有小数部分的整数。

| 类型 | 常见用途 |
|---|---|
| `INT` | 商品数量、年龄、排序号、计数 |
| `BIGINT` | 数据库主键、订单号等可能持续增长的大整数 |

例如：

```sql
id BIGINT PRIMARY KEY,
quantity INT NOT NULL
```

如果数据可能超过 `INT` 的范围，就使用 `BIGINT`。主键通常会长期增长，因此业务表主键常用 `BIGINT`。

## 三、💰 金额类型：DECIMAL

### 3.1 为什么金额使用 DECIMAL

金额优先使用 `DECIMAL`，不要使用 `FLOAT` 或 `DOUBLE`。

`DECIMAL` 保存精确值；`FLOAT` 和 `DOUBLE` 保存近似值。例如在一些编程语言中：

```text
0.1 + 0.2 = 0.30000000000000004
```

这种误差经过大量订单汇总、折扣分摊和税费计算后，可能造成对账差异。

### 3.2 DECIMAL 后面的数字是什么意思

```sql
amount DECIMAL(19, 4) NOT NULL
```

`DECIMAL(19, 4)` 表示：

- 总共最多保存 19 位数字。
- 小数点后最多保存 4 位。
- 小数点前最多保存 `19 - 4 = 15` 位。

常见选择：

| 场景 | 推荐类型 |
|---|---|
| 普通金额，只精确到分 | `DECIMAL(18, 2)` |
| 支付、财务、税费、折扣 | `DECIMAL(19, 4)` |
| 汇率、高精度单价 | 根据业务选择，例如 `DECIMAL(20, 8)` |

Java 中使用 `BigDecimal` 对应数据库的 `DECIMAL`：

```java
import java.math.BigDecimal;

// 使用字符串创建，避免先产生 double 浮点误差。
BigDecimal amount = new BigDecimal("54.70");
```

## 四、🔤 字符串类型：CHAR 和 VARCHAR

### 4.1 最核心的区别

> [!tip] 先记住
> `CHAR(5)` 写入 3 个字符不会报错。`5` 表示最多接收 5 个字符，不是要求每次必须写满 5 个字符。

| 类型 | 保存方式 | 适合保存 |
|---|---|---|
| `CHAR(n)` | 固定长度，不足时在末尾补空格 | 币种代码、国家代码等固定长度内容 |
| `VARCHAR(n)` | 可变长度，按照实际内容保存 | 姓名、商品名、手机号、邮箱、地址 |

### 4.2 CHAR(5) 写入 3 个字符会怎样

创建两个最大长度都是 5 个字符的字段：

```sql
CREATE TABLE string_demo (
    char_value CHAR(5),
    varchar_value VARCHAR(5)
);
```

都只写入 3 个字符：

```sql
INSERT INTO string_demo VALUES ('ABC', 'ABC');
```

两者都能正常写入，不会报错。区别在内部保存方式：

```text
CHAR(5)     按固定长度处理：'ABC  '  末尾补两个空格
VARCHAR(5)  按实际长度保存：'ABC'    不补空格
```

查询时，两者看起来都是 `ABC`：

```sql
SELECT char_value, varchar_value FROM string_demo;
```

```text
char_value  varchar_value
ABC         ABC
```

这是因为 MySQL 默认会删除 `CHAR` 查询结果末尾的空格。

### 4.3 超过 5 个字符会怎样

| 写入内容 | 字符数 | `CHAR(5)` | `VARCHAR(5)` |
|---|---:|---|---|
| `'ABC'` | 3 | 正常，末尾补空格 | 正常，按 3 个字符保存 |
| `'ABCDE'` | 5 | 正常，刚好写满 | 正常，达到最大长度 |
| `'ABCDEF'` | 6 | 严格模式下报错 | 严格模式下报错 |

```sql
INSERT INTO string_demo VALUES ('ABCDEF', 'ABCDEF');
```

严格模式下会出现类似错误：

```text
ERROR 1406 (22001): Data too long for column 'char_value' at row 1
```

非严格模式可能把内容截断成 `ABCDE` 并产生警告。生产环境不要依赖自动截断，应开启严格模式并在应用层校验长度。

## 五、🛒 综合案例：订单明细表

下面这张表把前面的基础类型放到一个真实场景中：

```sql
CREATE TABLE order_item (
    -- 主键会持续增长，使用 BIGINT。
    id BIGINT PRIMARY KEY,

    -- 商品名称长短不一，使用 VARCHAR。
    product_name VARCHAR(100) NOT NULL,

    -- 商品数量是整数，使用 INT。
    quantity INT NOT NULL,

    -- 金额需要精确计算，使用 DECIMAL。
    unit_price DECIMAL(19, 4) NOT NULL,
    pay_amount DECIMAL(19, 4) NOT NULL,

    -- CNY、USD 等币种代码固定为 3 个字符，使用 CHAR。
    currency_code CHAR(3) NOT NULL
);
```

写入一条订单明细：

```sql
INSERT INTO order_item (
    id,
    product_name,
    quantity,
    unit_price,
    pay_amount,
    currency_code
) VALUES (
    10001,
    '机械键盘',
    2,
    299.0000,
    598.0000,
    'CNY'
);
```

这条数据中：

- `10001` 是主键，用 `BIGINT`。
- `机械键盘` 长度不固定，用 `VARCHAR`。
- `2` 是购买数量，用 `INT`。
- `299.0000` 和 `598.0000` 是金额，用 `DECIMAL`。
- `CNY` 固定为 3 个字符，用 `CHAR(3)`。

## 六、📌 快速回顾

- 没有小数的普通数字使用 `INT`；长期增长的主键常用 `BIGINT`。
- 金额使用 `DECIMAL`，Java 中使用 `BigDecimal`。
- 不要使用 `FLOAT` 或 `DOUBLE` 保存需要精确结算的金额。
- 长度经常变化的字符串使用 `VARCHAR`。
- 长度始终固定的短字符串可以使用 `CHAR`。
- `CHAR(5)` 写入 3 个字符不会报错；只有超过 5 个字符才会在严格模式下报错。

## 七、🔗 官方资料

- [MySQL 8.4：整数类型](https://dev.mysql.com/doc/refman/8.4/en/integer-types.html)
- [MySQL 8.4：DECIMAL 与 NUMERIC 定点数类型](https://dev.mysql.com/doc/refman/8.4/en/fixed-point-types.html)
- [MySQL 8.4：精确值与近似值](https://dev.mysql.com/doc/refman/8.4/en/precision-math-numbers.html)
- [MySQL 8.4：CHAR 与 VARCHAR 类型](https://dev.mysql.com/doc/refman/8.4/en/char.html)
