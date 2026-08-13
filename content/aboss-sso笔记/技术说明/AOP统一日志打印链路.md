---
title: AOP统一日志打印链路
publish: true
---

# AOP 统一日志打印链路

## 1. 背景

`aboss-sso` 项目使用 Spring AOP 统一记录部分业务方法的请求参数、返回参数和执行耗时。

以根据 Token 查询用户信息的接口为例，业务代码没有显式执行以下日志：

```java
log.info("personNo: {}", userInfoDTO.getPersonNo());
```

但日志中仍然能看到 `personNo`。原因是 AOP 在业务方法执行完成后，将整个返回对象序列化成 JSON；`UserInfoDTO` 位于返回对象的 `data` 字段中，所以其 `personNo` 会被递归序列化并打印。

## 2. 核心代码位置

| 作用 | 文件 |
| --- | --- |
| 应用启动与组件扫描 | `start/src/main/java/com/aliyun/fsi/insurance/sso/Application.java` |
| 统一日志切面 | `aboss-sso-infrastructure/src/main/java/com/aliyun/fsi/insurance/sso/config/LogAopConfig.java` |
| 用户信息 HTTP 入口 | `aboss-sso-adapter/src/main/java/com/aliyun/fsi/insurance/sso/web/LoginController.java` |
| 用户信息 Facade | `aboss-sso-app/src/main/java/com/aliyun/fsi/insurance/sso/impl/LoginFacadeImpl.java` |
| JWT 解析和 DTO 组装 | `aboss-sso-app/src/main/java/com/aliyun/fsi/insurance/sso/executor/account/query/UserInfoQryExe.java` |
| 用户信息 DTO | `aboss-sso-client/src/main/java/com/aliyun/fsi/insurance/sso/dto/data/UserInfoDTO.java` |
| 日志输出配置 | `start/src/main/resources/log4j2.xml` |

## 3. AOP 为什么能够生效

### 3.1 Spring 扫描切面

项目启动类配置了扫描根包：

```java
@SpringBootApplication(scanBasePackages = {"com.aliyun.fsi.insurance.sso"})
public class Application {
}
```

`LogAopConfig` 位于该根包之下，并使用了以下注解：

```java
@Slf4j
@Aspect
@Component
public class LogAopConfig {
}
```

- `@Component`：将类注册为 Spring Bean。
- `@Aspect`：声明该类是一个 AOP 切面。
- `@Slf4j`：由 Lombok 生成日志对象 `log`。

Spring 启动时发现这个切面，并为符合切点条件的 Spring Bean 创建代理对象。其他 Bean 注入目标服务时，拿到的是代理对象，而不是未经包装的原始对象。

### 3.2 切点范围

统一日志切点如下：

```java
@Pointcut("execution(public * com.aliyun.fsi.insurance.sso.impl.*Impl.*(..))||" +
        "execution(public * com.aliyun.fsi.insurance.sso.external.*Impl.*(..))")
public void aop() {
}
```

它会匹配：

```text
com.aliyun.fsi.insurance.sso.impl 包下，*Impl 类中的 public 方法
com.aliyun.fsi.insurance.sso.external 包下，*Impl 类中的 public 方法
```

表达式含义：

```text
execution(public * 包名.*Impl.*(..))
          │      │     │    └─ 任意数量、任意类型的参数
          │      │     └────── 任意方法名
          │      └──────────── 类名以 Impl 结尾
          └─────────────────── 任意返回类型的 public 方法
```

因此它并非拦截项目中的所有方法。Controller、Executor 等不属于上述包和类名规则的方法，不会被这个切面统一打印。

## 4. 环绕通知的执行流程

切面使用 `@Around` 环绕通知：

```java
@Around("aop()")
public Object doAround(ProceedingJoinPoint joinPoint) throws Throwable {
    long startTime = System.currentTimeMillis();
    MethodSignature methodSignature =
            (MethodSignature) joinPoint.getSignature();

    Object result = joinPoint.proceed();

    log.info("请求类 : {}.{} 请求参数 : {} 返回参数 : {} 耗时 : {} ms",
            methodSignature.getDeclaringTypeName(),
            methodSignature.getName(),
            JSON.toJSONString(joinPoint.getArgs()),
            JSON.toJSONString(result),
            System.currentTimeMillis() - startTime);

    return result;
}
```

执行顺序为：

```text
调用 AOP 代理对象
    ↓
进入 doAround()
    ↓
记录开始时间和方法信息
    ↓
joinPoint.proceed() 执行真正的业务方法
    ↓
获取业务方法返回值 result
    ↓
将入参和返回值序列化成 JSON
    ↓
打印类名、方法名、入参、返回值和耗时
    ↓
把 result 返回给原调用方
```

`joinPoint.proceed()` 是连接切面和实际业务方法的关键点。它之前的代码在业务方法调用前执行，它之后的代码在业务方法正常返回后执行。

## 5. `/user-info` 完整调用链

### 5.1 接口入口

请求地址：

```text
POST /platform/api/aboss/sso/user-info
```

Controller 接收请求：

```java
@PostMapping("/user-info")
public ResultModel<UserInfoDTO> userInfo(@RequestBody UserInfoQry userInfoQry) {
    return loginFacade.userInfo(userInfoQry);
}
```

`loginFacade` 是由 Spring 注入的对象。由于 `LoginFacadeImpl` 符合日志切点规则，注入的对象会经过 AOP 代理。

### 5.2 AOP 拦截 Facade 调用

目标方法为：

```text
com.aliyun.fsi.insurance.sso.impl.LoginFacadeImpl.userInfo(...)
```

该方法满足以下条件：

- 位于 `com.aliyun.fsi.insurance.sso.impl` 包下；
- 类名 `LoginFacadeImpl` 以 `Impl` 结尾；
- `userInfo` 是 `public` 方法。

所以 Controller 调用 `loginFacade.userInfo()` 时，会先进入 `LogAopConfig.doAround()`。

### 5.3 Facade 组织返回结果

业务方法调用查询执行器，并将结果放入统一返回模型：

```java
public ResultModel<UserInfoDTO> userInfo(UserInfoQry userInfoQry) {
    ResultModelSupport<UserInfoDTO> resultModel =
            new PageResultModelSupport<>();

    abossBaseOperateTemplate.operate(new AbossBaseOperateCallback() {
        @Override
        public void execute() {
            UserInfoDTO singleResponse = userInfoQryExe.execute(userInfoQry);
            resultModel.setData(singleResponse);
        }
    }, resultModel);

    return resultModel;
}
```

此处的数据关系为：

```text
ResultModel
└── data
    └── UserInfoDTO
        ├── accType
        ├── accId
        ├── username
        ├── personNo
        └── personName
```

### 5.4 解析 JWT 并设置 `personNo`

`UserInfoQryExe` 先解析请求中的 Token：

```java
Map<String, Object> map = jwtUtils.parserJWT(userInfoQry.getToken());
```

然后组装 `UserInfoDTO`：

```java
return new UserInfoDTO()
        .setAccType((String) map.get(JwtTokenConstant.ACC_TYPE))
        .setAccId((String) map.get(JwtTokenConstant.ACC_ID))
        .setUsername((String) map.get(JwtTokenConstant.ACC_NAME))
        .setPersonNo((String) map.get(JwtTokenConstant.ACC_ID))
        .setPersonName((String) map.get(JwtTokenConstant.PERSON_NAME));
```

当前代码中 `personNo` 取自 JWT 的 `ACC_ID`：

```java
.setPersonNo((String) map.get(JwtTokenConstant.ACC_ID))
```

因此在当前实现下，正常情况下 `personNo` 与 `accId` 相同。如果业务要求员工编号来自 JWT 中独立的 `personNo` 字段，应进一步确认这里是否应改用：

```java
map.get(JwtTokenConstant.PERSON_NO)
```

### 5.5 返回结果被统一打印

`LoginFacadeImpl.userInfo()` 返回后，控制权回到环绕通知：

```java
Object result = joinPoint.proceed();
```

此时 `result` 中已经包含 `UserInfoDTO`。切面执行：

```java
JSON.toJSONString(result)
```

Fastjson 会递归序列化整个对象，所以最终日志类似：

```text
请求类 : com.aliyun.fsi.insurance.sso.impl.LoginFacadeImpl.userInfo
请求参数 : [{"token":"..."}]
返回参数 : {"data":{"accId":"123456","personNo":"123456","username":"zhangsan"}}
耗时 : 15 ms
```

这就是没有直接打印 `userInfoDTO.getPersonNo()`，日志中仍然能看到 `personNo` 的原因。

## 6. 日志落盘位置

`log4j2.xml` 中的日志根目录为：

```xml
<property name="APP_NAME" value="aboss-sso"/>
<property name="LOG_HOME" value="./logs/${APP_NAME}"/>
```

普通业务日志写入：

```xml
<RollingFile name="COMMON-APPENDER"
             fileName="${LOG_HOME}/common-default.log">
```

因此默认日志文件是：

```text
./logs/aboss-sso/common-default.log
```

可以按方法搜索：

```bash
rg 'LoginFacadeImpl.userInfo' ./logs/aboss-sso/common-default.log
```

也可以直接搜索字段：

```bash
rg '"personNo"' ./logs/aboss-sso/common-default.log
```

## 7. 为什么有时看不到日志或 `personNo`

### 7.1 方法不符合切点规则

只有指定包下、类名以 `Impl` 结尾的 `public` 方法才会被当前切面拦截。Controller 或 Executor 方法不会因为这个切面而自动打印。

### 7.2 同一个类内部自调用

如果一个类通过 `this.xxx()` 调用自身另一个方法，调用通常没有经过 Spring 代理，因此可能不会触发该方法对应的 AOP 通知。

### 7.3 对象不是 Spring Bean

通过 `new XxxImpl()` 手动创建的对象不受 Spring 管理，也不会获得 AOP 代理。

### 7.4 目标方法抛出未处理异常

当前日志代码位于：

```java
Object result = joinPoint.proceed();
log.info(...);
```

如果 `joinPoint.proceed()` 抛出异常并且异常继续向外传播，后面的 `log.info()` 不会执行。因此当前切面主要记录正常完成的方法，不保证记录异常调用。

如果希望无论成功失败都记录耗时，需要使用 `try/catch/finally` 重新组织切面逻辑。

### 7.5 日志级别过滤

统一日志使用的是 `log.info()`。如果部署环境将包日志级别调到 `WARN` 或 `ERROR`，INFO 日志将不会输出。

### 7.6 运行版本未更新

如果本地源码存在 `personNo`，但线上运行的旧包中还没有该字段或赋值逻辑，线上日志也不会出现预期字段。需要确认构建版本和部署版本。

### 7.7 字段为空时的序列化行为

Fastjson 的具体配置会影响空字段是否输出。如果 `personNo` 没有成功赋值且序列化配置忽略空值，日志中可能完全看不到该字段，而不是显示 `"personNo": null`。

## 8. 当前实现的注意事项

### 8.1 Token 泄露风险

切面会序列化所有入参：

```java
JSON.toJSONString(joinPoint.getArgs())
```

`UserInfoQry` 中包含 Token，因此日志可能完整记录 Token。Token、密码、手机号、身份证号等敏感信息建议在统一日志层脱敏或排除。

### 8.2 序列化风险

统一序列化任意方法的入参和出参可能带来：

- 大对象导致日志量过大；
- 循环引用或复杂对象导致序列化异常；
- 文件、流、Servlet 请求等对象不适合直接序列化；
- 序列化开销被计入接口调用后的处理时间；
- 返回数据中敏感字段被写入日志。

### 8.3 “全局日志”的准确理解

这里的“全局打印”是指：

> 对切点覆盖范围内的方法统一执行日志逻辑。

它不是对整个应用的每个方法、每个 HTTP 请求进行无差别打印。覆盖范围完全由 `@Pointcut` 表达式决定。

## 9. 链路总结

```text
客户端调用 /platform/api/aboss/sso/user-info
    ↓
LoginController.userInfo() 接收 UserInfoQry
    ↓
调用 Spring 注入的 LoginFacade AOP 代理对象
    ↓
LogAopConfig.doAround() 记录开始时间
    ↓
joinPoint.proceed()
    ↓
LoginFacadeImpl.userInfo()
    ↓
UserInfoQryExe.execute()
    ↓
解析 JWT，创建 UserInfoDTO，设置 personNo
    ↓
UserInfoDTO 放入 ResultModel.data
    ↓
ResultModel 返回到 LogAopConfig
    ↓
JSON.toJSONString(result) 递归序列化返回值
    ↓
personNo 随 data 一起进入返回参数日志
    ↓
日志写入 ./logs/aboss-sso/common-default.log
    ↓
ResultModel 返回 Controller 和客户端
```

## 10. 一句话结论

`personNo` 不是被单独打印的，而是在 `UserInfoQryExe` 中设置到 `UserInfoDTO` 后，随 `ResultModel` 返回给 `LoginFacadeImpl` 的 AOP 代理，再由 `LogAopConfig` 将整个返回对象序列化为 JSON 并统一写入日志。
