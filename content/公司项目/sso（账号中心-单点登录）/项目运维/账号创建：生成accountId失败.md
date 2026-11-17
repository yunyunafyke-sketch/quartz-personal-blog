---
title: 账号创建：生成accountId失败
date: 2026-09-15 15:25:30
publish: true
---

# 账号创建：生成 accountId 失败

## 现象

创建外部账号时报错：

```text
生成accountId失败!
```

异常由 `ExternalAccountAddCmdExe#createAccountId` 抛出。该方法生成账号 ID 后，会到账号表中检查 ID 是否已存在；连续冲突达到 3 次后，抛出上述异常。

## accountId 生成规则

外部账号 ID 的格式为：

```text
zhex + 2位应用简称 + 4位自定义编码 + 5位序列号
```

例如：

```text
zhex + hr + A001 + 00001
```

其中：

- 应用简称来自应用路由配置的 `short_id`。
- 自定义编码优先使用接口传入的 `customCode`；未传时使用应用路由中的默认自定义编码。
- 五位序列号来自 `t_abs_app_sequence.seq_no`。

## 直接原因

`createAccountId` 最多尝试生成 3 次。每次生成后都会查询 `t_abs_sso_account`：

```java
String accountId = appSequenceGateway.externalId(externalSource, customCode);
Account accountDB = accountGateway.queryOne(new Account().setAccountId(accountId));
```

如果 3 次生成的 accountId 在账号表中都已经存在，第 4 次进入方法时会抛出：

```java
throw new BizRuntimeException(
    ErrorCode.PARAMETER_ERROR.getErrCode(),
    "生成accountId失败!"
);
```

因此，出现该报错通常说明：**应用序列表中的当前序号落后于账号表中已经使用的实际序号，导致连续生成重复账号 ID。**

## 常见根因

1. `t_abs_app_sequence` 的 `seq_no` 被人工改小或重置。
2. 数据迁移时迁移了 `t_abs_sso_account`，但没有同步迁移对应的应用序列。
3. 不同环境合并账号数据后，序列表没有同步到已使用的最大序号。
4. 同一个 `short_id + customize_code` 存在多条序列记录，查询时取到了错误记录。
5. 账号数据被提前导入，但应用序列仍从较小值开始生成。

## 排查方法

以下均为只读 SQL。执行前替换实际的应用简称、自定义编码和账号 ID 前缀。

### 1. 确定应用简称和自定义编码(P010068-hrms)

先使用创建账号接口入参中的 `externalSource`，到应用路由表 `t_abs_app_router` 查询应用简称和默认自定义编码：

```sql
SELECT app_id,
       short_id,
       default_customize_code,
       is_valid
FROM t_abs_app_router
WHERE app_id = '接口入参externalSource';
```

字段对应关系：

- `short_id`：生成 accountId 使用的 2 位应用简称。
- `default_customize_code`：默认的 4 位自定义编码。
- `app_id`：创建账号接口传入的 `externalSource`。

如果创建账号时传入了 `customCode`，实际使用接口入参中的 `customCode`；只有 `customCode` 为空时，才会使用 `t_abs_app_router.default_customize_code`。

### 2. 查询当前应用序列

目标表：`t_abs_app_sequence`

```sql
SELECT id,
       short_id,
       customize_code,
       seq_no,
       tenant_code,
       is_valid,
       gmt_modified
FROM t_abs_app_sequence
WHERE short_id = '应用简称'
  AND customize_code = '自定义编码';
```

重点确认：

- 是否存在记录。
- `seq_no` 当前值是多少。
- 相同 `short_id + customize_code` 是否存在多条记录。

### 3. 查询账号表中对应前缀的最大账号 ID

目标表：`t_abs_sso_account`

```sql
SELECT MAX(account_id) AS max_account_id,
       COUNT(*) AS account_count
FROM t_abs_sso_account
WHERE account_id LIKE 'zhex应用简称自定义编码%';
```

对比最大账号 ID 末五位流水号和 `t_abs_app_sequence.seq_no`：如果账号表最大流水号明显大于或等于序列表当前值，即可确认序列数据落后。

### 4. 查询生成出来的 ID 是否已经存在

目标表：`t_abs_sso_account`

```sql
SELECT account_id,
       account_name,
       external_id,
       external_source,
       is_valid
FROM t_abs_sso_account
WHERE account_id IN (
    '第一次生成的accountId',
    '第二次生成的accountId',
    '第三次生成的accountId'
);
```

## 代码中的额外缺陷

当前递归重试没有返回递归调用生成的新 ID：

```java
if (Objects.nonNull(accountDB)) {
    createAccountId(externalSource, customCode, num);
}
return accountId;
```

这会导致一种额外问题：第一次 ID 冲突、第二次 ID 不冲突的情况下，内层调用虽然成功生成了新 ID，但最外层仍然返回第一次已经冲突的旧 ID。

应改为接住并直接返回递归结果：

```java
if (Objects.nonNull(accountDB)) {
    return createAccountId(externalSource, customCode, num);
}
return accountId;
```

也可以改成循环实现，避免递归计数和返回值处理错误。

## 处理建议

1. 先通过只读 SQL 确认账号表最大流水号和应用序列表当前值是否不一致。
2. 如需修正 `t_abs_app_sequence.seq_no`，应将它调整到不小于账号表中已使用的最大流水号；数据库更新前需要评估租户、应用简称和自定义编码条件，禁止无条件批量更新。
3. 修复 `createAccountId` 未返回递归结果的问题，并补充以下测试场景：
   - 第一次生成即成功。
   - 第一次冲突、第二次成功。
   - 前两次冲突、第三次成功。
   - 连续三次冲突后抛出明确异常。
4. 建议为 `t_abs_app_sequence` 的业务维度增加唯一性约束或至少增加重复数据监控，防止同一序列维度出现多条记录。

## 其他相似报错的区别

- `应用路由不存在或已失效`：应用路由配置不存在或已禁用，并非账号 ID 冲突。
- `该编码序列使用完毕,请更换编码!`：五位序列号已经达到 `99999`。
- `创建失败，请重试`：序列号乐观更新失败，常见于并发竞争。
- `生成accountId失败!`：连续 3 次生成的账号 ID 均已存在。
