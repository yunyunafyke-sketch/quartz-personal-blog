---
title: 该项目AOP理解
publish: true
date: 2026-08-02
---

关联阅读：[[日志文件在哪里]]。

## 一、💡 一句话理解

> [!tip] 核心结论
> 本项目用 AOP 集中处理两类“不是具体业务、却经常要做”的动作：LogAopConfig 为指定 Facade 和外部调用方法统一记录入参、返回值与耗时；AccessAspect 为标记了 @Access 的 RPC 方法校验调用来源。业务方法只保留业务本身。

这里的“统一”有明确边界：并非所有方法都会被拦截，是否生效完全取决于切点规则和调用是否经过 Spring 代理。

## 二、🧭 理论：AOP 在解决什么问题

### 2.1 横切关注点

查询账户、登录、修改灰度配置等业务方法，核心工作是校验、调用执行器和组装结果。但日志、耗时统计、调用来源校验会反复出现在很多地方。

AOP（面向切面编程）用于把这类横跨多处业务代码的公共动作集中维护。Spring 官方将事务管理也视为典型的横切关注点；本项目的日志和来源校验采用的是相同思路。

| 术语 | 白话解释 | 本项目中的对应物 |
| --- | --- | --- |
| 切面（Aspect） | 一组公共规则的集中位置 | LogAopConfig、AccessAspect |
| 切点（Pointcut） | 规则作用范围，即“拦谁” | 包名/类名规则，或 @Access 注解 |
| 通知（Advice） | 命中后实际要做的事 | 两个切面中的 doAround |
| 连接点（Join Point） | 一个业务方法被调用的那一刻；AOP 可以在这一刻前后插入日志、权限校验等公共逻辑 | Spring AOP 中主要是 Bean 的方法执行 |
| 代理（Proxy） | Spring 放在真实业务对象前面的“接待员”；外部调用先经过它，它再执行日志、权限校验等公共逻辑并转交给真实方法 | Spring 注入的 Facade、外部服务 Bean |

### 2.2 为什么必须经过代理

Spring 启动时会识别符合条件的 Bean，并为它创建代理。调用先到代理，代理再执行命中的切面，最后才进入真实业务方法。

> [!info] 什么才算“符合条件的 Bean”
> “符合条件”要同时满足两步，不是只要类上有注解就一定会被切面拦截：
>
> 1. **先成为 Spring Bean**：类被 Spring 扫描并管理，例如使用 @Component、@Service 等注解，或通过配置类创建 Bean；
> 2. **再命中某个切点规则**：该 Bean 至少有一个方法符合 LogAopConfig 或 AccessAspect 的规则，Spring 才需要为它创建代理。
>
> | Bean 或方法 | 是否会被本项目两个切面处理 | 原因 |
> | --- | --- | --- |
> | LoginFacadeImpl | 会被日志切面处理 | 位于 impl 包，类名以 Impl 结尾，且有 public 方法 |
> | IdaasUserExternalServiceImpl | 会被日志切面处理 | 位于 external 包，类名以 Impl 结尾，且有 public 方法 |
> | AccountGreyRpcFacadeImpl.queryAccountGreyList() | 会被日志与来源校验两个切面处理 | 命中 impl.*Impl 规则，且标注了 @Access(authentication = true) |
> | UserInfoQryExe | 不会因这两个切面处理 | 即使它本身是 Bean，也不在日志切点范围内，且未标注 @Access |
>
> 一句话：**先被 Spring 管起来，再有方法命中 AOP 规则，才算这里的“符合条件”。**

~~~text
Controller / RPC 调用方
          ↓
   Spring 代理对象
          ↓
匹配到的一个或多个切面
          ↓
       真实业务方法
~~~

因此，以下两种调用通常不会触发这里的切面：

- 手动 new XxxImpl()：对象未交给 Spring 管理，没有代理；
- 同一类中使用 this.otherMethod()：自调用绕开代理。

## 三、⚙️ 理论：本项目的 AOP 如何工作

### 3.1 两个实际切面

| 切面 | 实际文件 | 匹配规则 | 职责 |
| --- | --- | --- | --- |
| 统一日志 | aboss-sso-infrastructure/src/main/java/com/aliyun/fsi/insurance/sso/config/LogAopConfig.java | impl 或 external 包下，类名以 Impl 结尾的 public 方法 | 输出类名、方法名、入参、返回值、耗时 |
| 调用来源校验 | aboss-sso-infrastructure/src/main/java/com/aliyun/fsi/insurance/sso/config/AccessAspect.java | 方法标注 @Access | 读取 SOFA RPC 来源并检查访问控制配置 |

启动类 start/src/main/java/com/aliyun/fsi/insurance/sso/Application.java 扫描根包 com.aliyun.fsi.insurance.sso。两个切面都在这个根包之下，且均标注了：

~~~java
@Component // 交给 Spring 管理，成为 Bean
@Aspect    // 声明这是一个切面
~~~

> [!info] 为什么切面在 aboss-sso-infrastructure 模块，也能被 start 扫描到
> Spring 看的是 **Java 包名**，不是源码所在的 Maven 模块目录。虽然切面文件物理上位于 aboss-sso-infrastructure/src/main/java/ 下，但它声明的包名是 com.aliyun.fsi.insurance.sso.config，属于启动类扫描根包 com.aliyun.fsi.insurance.sso 的子包。
>
> 同时，运行时依赖链为：start → aboss-sso-adapter → aboss-sso-app → aboss-sso-infrastructure。因此基础设施模块的 class 会进入应用运行时 classpath，Spring 扫描包名时就能找到其中的 LogAopConfig 与 AccessAspect。若模块没有进入运行时依赖，即使包名相同，也无法被扫描到。
>
> 把模块理解成几个盒子：
>
> ~~~text
> start 盒子
>   └─ 用到 adapter 盒子
>        └─ 用到 app 盒子
>             └─ 用到 infrastructure 盒子
> ~~~
>
> 启动时运行的是 `start`，但它会把自己依赖的其他盒子一起带上。
>
> `LogAopConfig` 放在 infrastructure 盒子里；因为 start 最终会带上这个盒子，所以 Spring 才能看到这个类并扫描它。
>
> 反过来，如果 start 根本没有带上 infrastructure，Spring 就完全看不到 LogAopConfig 这个类；即使它的包名写得正确也没有用。
>
> 一句话：**包名告诉 Spring“要找哪类名字的类”；依赖关系保证这个类“已经被带进应用里”。**

### 3.2 LogAopConfig：统一记录调用日志

项目现有日志切点：

> [!info] execution(...) 是什么
> execution(...) 不是在执行某段 Java 代码，而是一种切点筛选语法。它的意思是：**当某个方法正在执行，并且这个方法符合括号中的条件时，就让当前切面处理它。**
>
> 可以把它理解成“挑选方法的过滤规则”。例如 execution(public * com.aliyun.fsi.insurance.sso.impl.*Impl.*(..)) 的白话是：**只挑出 impl 包中、类名以 Impl 结尾、并且是 public 的所有方法。**

~~~java
@Pointcut("execution(public * com.aliyun.fsi.insurance.sso.impl.*Impl.*(..))||" +
        "execution(public * com.aliyun.fsi.insurance.sso.external.*Impl.*(..))")
public void aop() {
}
~~~

它只会命中两类方法：

~~~text
com.aliyun.fsi.insurance.sso.impl 包下，类名以 Impl 结尾的 public 方法
com.aliyun.fsi.insurance.sso.external 包下，类名以 Impl 结尾的 public 方法
~~~

第一段表达式的拆解如下：

| 片段 | 含义 |
| --- | --- |
| public | 仅公共方法 |
| 第一个 * | 返回值类型任意 |
| ...impl.*Impl | impl 包中、类名以 Impl 结尾的类 |
| 第二个 .* | 方法名任意 |
| (..) | 参数数量和类型任意 |

所以 LoginController、UserInfoQryExe 等不满足规则的类，不会由该切面自动打印；它们自身执行 log.info() 时，仍是普通业务日志。

### 3.3 @Around：把调用前、执行和调用后包起来

LogAopConfig 的核心代码如下。ProceedingJoinPoint 代表当前被代理的方法和调用上下文。

> [!info] ProceedingJoinPoint 是什么
> 可以把它理解成“当前这次被 AOP 拦住的业务调用的控制器”。例如调用 loginFacade.userInfo(userInfoQry) 时，Spring 会把这次调用包装成 joinPoint 并交给 doAround()。
>
> - joinPoint.getArgs()：拿到本次调用的参数，例如 userInfoQry；
> - joinPoint.getSignature()：拿到方法信息，例如 userInfo(...)；
> - joinPoint.proceed()：放行业务，真正执行 userInfo(...) 并取得返回结果。
>
> 最关键的是：**不调用 proceed()，真实业务方法就不会执行；调用 proceed() 后，才会进入业务方法。** 它只用于 @Around 环绕通知，因为环绕通知需要自己决定是否放行业务方法。

~~~java
@Around("aop()")
public Object doAround(ProceedingJoinPoint joinPoint) throws Throwable {
    // 1. 调用真实业务前，开始计时并读取方法签名
    long startTime = System.currentTimeMillis();
    MethodSignature methodSignature = (MethodSignature) joinPoint.getSignature();

    // 2. 放行：不调用 proceed()，真实业务方法就不会执行
    Object result = joinPoint.proceed();

    // 3. 真实业务正常返回后，记录入参、返回值和总耗时
    log.info("请求类 : {}.{} 请求参数 : {} 返回参数 : {} 耗时 : {} ms",
            methodSignature.getDeclaringTypeName(),
            methodSignature.getName(),
            JSON.toJSONString(joinPoint.getArgs()),
            JSON.toJSONString(result),
            System.currentTimeMillis() - startTime);

    // 4. 原样返回真实业务结果
    return result;
}
~~~

~~~text
代理收到调用
    ↓
记录开始时间和方法信息
    ↓
joinPoint.proceed() 执行真实业务
    ↓
业务正常返回 result
    ↓
Fastjson 序列化入参、返回值，记录耗时
    ↓
将 result 返回给原调用方
~~~

proceed() 不是普通的“下一行代码”，而是对真实目标方法的放行调用。它后面的日志只在业务方法正常返回时执行；如果业务抛出异常，当前实现会跳过这条成功日志。

### 3.4 AccessAspect：用注解声明访问控制

自定义注解位于 aboss-sso-infrastructure/.../config/Access.java：

~~~java
@Target(ElementType.METHOD)              // 只能标注方法
@Retention(RetentionPolicy.RUNTIME)      // 运行时可被切面读取
public @interface Access {
    // true 表示需要校验 RPC 调用来源
    boolean authentication() default false;
}
~~~

AccessAspect 的切点是注解本身：

~~~java
@Pointcut("@annotation(com.aliyun.fsi.insurance.sso.config.Access)")
public void cutMethod() {
}
~~~

命中后，当前实现按以下顺序处理：

1. 读取目标方法的 @Access；
2. 从 SofaRpcContext 获取 appName，为空时使用 referer；
3. 拼出“接口声明类全名 # 方法名”作为资源标识；
4. 当 authentication = true 时，通过 AccessControlGateway.queryBy(methodName, requestSource) 查询该来源是否已配置；
5. 来源为空或无配置时，直接返回 ACCESS_DENIED；校验通过才调用 joinPoint.proceed()。

它的职责仅是调用来源校验，不替代登录态、Token、参数或业务权限校验。

> [!info] 一个方法被两个切面命中时
> AccountGreyRpcFacadeImpl.queryAccountGreyList 既符合 LogAopConfig 的 impl.*Impl 规则，也标了 @Access(authentication = true)，所以两个切面都会参与。当前两者均未配置 @Order，不能依赖谁先执行；若某项业务需要固定顺序，应显式配置顺序并补测试。

## 四、🧩 补充：怎么看本项目的模块依赖关系

### 4.1 先分清“模块目录”和“Java 包名”

这个项目是 Maven 多模块项目。模块目录用于组织和构建代码，例如 start、aboss-sso-adapter、aboss-sso-app、aboss-sso-infrastructure；Java 包名用于组织类并让 Spring 决定扫描范围，例如 com.aliyun.fsi.insurance.sso.config。

两者不是同一件事：

| 要看的问题 | 应该看哪里 | 例子 |
| --- | --- | --- |
| 这个类属于哪个构建模块 | 文件在哪个模块目录下 | LogAopConfig 位于 aboss-sso-infrastructure |
| Spring 会不会扫描这个类 | Java 文件第一行的 package，以及启动类的 scanBasePackages | LogAopConfig 的包名是 com.aliyun.fsi.insurance.sso.config，属于扫描根包的子包 |
| 启动时能不能拿到这个模块的 class | 各模块 pom.xml 的依赖关系 | start 能通过传递依赖拿到 infrastructure |

### 4.2 本项目的实际依赖链

从左往右读：**前一个模块依赖后一个模块**，它不是代码调用顺序。

~~~text
start
  ↓ 依赖
aboss-sso-adapter
  ↓ 依赖
aboss-sso-app
  ↓ 依赖
aboss-sso-infrastructure
~~~

对应的 POM 声明如下：

| 在哪个 POM 中看 | 声明了什么依赖 | 代表什么 |
| --- | --- | --- |
| start/pom.xml | aboss-sso-adapter | 启动模块使用适配层 |
| aboss-sso-adapter/pom.xml | aboss-sso-app | 适配层使用应用层 |
| aboss-sso-app/pom.xml | aboss-sso-infrastructure | 应用层使用基础设施层 |

因此运行 start 时，Maven 会递归带上 adapter、app 和 infrastructure 的 class。LogAopConfig 虽然物理上位于 infrastructure 模块，仍会进入最终应用的运行时 classpath。

### 4.3 排查依赖关系时怎么读

按下面顺序查看即可：

1. **先找启动模块**：本项目是 start，Application.java 位于该模块；
2. **打开当前模块的 pom.xml**：查看 dependencies 中直接依赖了谁；
3. **继续打开被依赖模块的 pom.xml**：顺着依赖继续往下找；
4. **判断类是否可用**：只要类所在模块在这条依赖链上，它的 class 就会被带入运行时；
5. **判断 Spring 是否能扫描**：在“类已被带入运行时”的前提下，再比较该类 package 是否落在 scanBasePackages 范围内。

#### 4.3.1 classpath 是什么，在哪里查看

classpath 可以理解成 Java 程序启动后允许查找 class 和配置文件的“可搜索范围”。例如 Spring 要加载 LogAopConfig，就需要在 classpath 中找到：

~~~text
com/aliyun/fsi/insurance/sso/config/LogAopConfig.class
~~~

依赖关系与包扫描的分工如下：

~~~text
Maven 依赖
  ↓
将 infrastructure 的 class 放进 classpath
  ↓
Spring 包扫描
  ↓
从 classpath 中找 com.aliyun.fsi.insurance.sso 开头的类
  ↓
找到 LogAopConfig 并注册为 Bean
~~~

| 想确认什么 | 在哪里看 | 怎么看 |
| --- | --- | --- |
| 模块为什么会被带入 | IntelliJ IDEA 模块依赖 | File → Project Structure → Modules，选择 start 后查看 Dependencies；再依次查看 adapter、app 的依赖 |
| Maven 实际解析出的依赖链 | Maven 依赖树 | 在项目根目录执行 mvn -pl start dependency:tree |
| 最终启动包实际带了什么 | Spring Boot 最终 jar | 解压或查看 jar：业务 class 在 BOOT-INF/classes/，依赖 jar 在 BOOT-INF/lib/ |

因此，classpath 不是某一个源码目录。它是运行时可供 Java 查找 class 的合集：既包括项目编译后的 class，也包括 Maven 下载或构建出的依赖 jar。

> [!tip] 记忆方法
> Maven 依赖解决“这个 class 有没有被带进应用”；Spring 包扫描解决“带进来的 class 要不要注册为 Bean”。两项都满足，切面才有机会生效。

### 4.4 为什么这件事和 AOP 有关

以 LogAopConfig 为例，AOP 能生效需要同时满足：

~~~text
infrastructure 在 start 的传递依赖链上
    ↓
LogAopConfig.class 被带进运行时
    ↓
它的 package 属于 com.aliyun.fsi.insurance.sso 扫描范围
    ↓
@Component 将它注册为 Spring Bean
    ↓
@Aspect 将它声明为切面
~~~

少任何一步都不行。例如只有正确包名、却没有把模块加入运行时依赖，Spring 根本看不到该 class；只有依赖、包名却不在扫描范围内，Spring 也不会自动注册它。

## 五、🚀 实践：在本项目中正确使用 AOP

### 5.1 前置准备

#### 5.1.1 新切面必须可被扫描

新切面应放在 com.aliyun.fsi.insurance.sso 根包或其子包，并标注 @Component 和 @Aspect。项目根 POM 使用 Spring Boot 2.1.3.RELEASE；如果在新建的独立模块中使用 AOP，还要确认该模块的实际依赖树包含 Spring AOP 与 AspectJ 注解解析所需依赖。

#### 5.1.2 先选对切点

| 需求 | 适合的切点形式 | 本项目例子 |
| --- | --- | --- |
| 一类稳定实现方法都要做同一件事 | execution(...) | 统一日志 |
| 少数敏感方法才需要处理 | @annotation(...) | 调用来源校验 |
| 新增明确业务边界 | 优先定义业务注解 | @Access 的模式 |

包名/类名规则适合稳定的工程规范；范围较小的敏感能力优先使用注解，避免因包结构变化而误拦截。

### 5.2 可以拿来干什么

#### 5.2.1 Facade 方法自动获得统一日志

在 com.aliyun.fsi.insurance.sso.impl 下新增一个 public 的 XxxFacadeImpl 方法，调用只要从 Spring Bean 外部进入，就会命中现有 LogAopConfig，无需再手写入参、出参和耗时日志。

~~~java
// 位于 impl 包、类名以 Impl 结尾、方法为 public：命中当前日志切点
public ResultModel<AccountDTO> queryAccount(AccountQry qry) {
    return accountQryExe.execute(qry);
}
~~~

输入为 AccountQry，输出为 ResultModel<AccountDTO>；方法成功返回时，切面会把这两个对象 JSON 化并记录耗时。

#### 5.2.2 给 RPC Facade 声明调用来源校验

对于只允许已登记系统调用的 RPC 方法，在实现方法上加注解：

~~~java
@Override
@Access(authentication = true) // 先校验调用来源，未通过时不执行目标方法
public ResultModel<List<AccountGreyDTO>> queryAccountGreyList(AccountIdsQry accountIdsQry) {
    // 保留参数校验、查询与结果组装等实际业务逻辑
    return resultModel;
}
~~~

项目的 AccountGreyRpcFacadeImpl 和多个 AccountRpcFacadeImpl 方法已经按这一方式使用。校验失败时，返回失败结果而不是继续执行业务。

#### 5.2.3 通过日志反查调用链

出现如下格式时，可直接定位到 LogAopConfig：

~~~text
请求类 : com.aliyun.fsi.insurance.sso.impl.LoginFacadeImpl.userInfo
请求参数 : [{...}]
返回参数 : {...}
耗时 : 15 ms
~~~

排查顺序：

1. 用“请求类.方法名”找到目标方法；
2. 检查它是否匹配两个 execution(...) 规则；
3. 沿入参和返回对象的构造链找字段来源；AOP 只会序列化对象，不会新增字段；
4. 最后确认调用是否经过 Spring 代理、INFO 日志是否被输出。

### 5.3 完整实践：新增可审计的 RPC Facade 方法

以下示例展示一个只允许已登记调用方访问的 Facade 方法。类位于 impl 包且名称以 Impl 结束，因此自动命中日志切面；@Access 则声明来源校验。DTO、接口和执行器名称为演示名称，落地时替换为项目真实类型。

文件：aboss-sso-app/src/main/java/com/aliyun/fsi/insurance/sso/impl/AccountAuditRpcFacadeImpl.java

~~~java
package com.aliyun.fsi.insurance.sso.impl;

import com.aliyun.fsi.insurance.facade.result.PageResultModelSupport;
import com.aliyun.fsi.insurance.facade.result.ResultModel;
import com.aliyun.fsi.insurance.sso.config.Access;
import org.springframework.stereotype.Component;

import javax.annotation.Resource;
import java.util.List;

/**
 * 示例审计 Facade。
 * public 方法会命中 LogAopConfig 的 impl.*Impl 切点。
 */
@Component
public class AccountAuditRpcFacadeImpl implements AccountAuditRpcFacade {

    @Resource
    private AccountAuditQryExe accountAuditQryExe;

    @Override
    @Access(authentication = true)
    public ResultModel<List<AccountAuditDTO>> queryAuditRecords(AccountAuditQry qry) {
        // 真实项目仍应按既有规范进行参数校验和异常处理。
        List<AccountAuditDTO> records = accountAuditQryExe.execute(qry);

        // Facade 负责将执行器结果组织为统一返回模型。
        ResultModel<List<AccountAuditDTO>> result = new PageResultModelSupport<>();
        result.setData(records);
        return result;
    }
}
~~~

调用与验证过程：

~~~text
RPC 调用 queryAuditRecords(qry)
    ↓
AccessAspect 读取 @Access(authentication = true)
    ↓
从 SofaRpcContext 获取调用来源，并查询 AccessControlGateway
    ├─ 未通过：返回 ACCESS_DENIED，业务方法不执行
    └─ 通过：执行 Facade
              ↓
       LogAopConfig 在成功返回后记录参数、返回值、耗时
~~~

按项目现有方式启动 start 模块后，在应用工作目录验证日志：

~~~bash
rg 'AccountAuditRpcFacadeImpl.queryAuditRecords' ./logs/aboss-sso/common-default.log
~~~

预期是一条包含类名、方法名、JSON 化请求参数、JSON 化返回参数和耗时的 INFO 日志。若得到访问拒绝，应优先检查 RPC 调用来源与访问控制配置，而不是只检查日志切面。

### 5.4 当前实现的边界与排查

| 现象 | 原因 | 建议 |
| --- | --- | --- |
| 没有统一日志 | 不匹配切点，或调用没有经过代理 | 检查包名、类名、public 修饰符与调用方式 |
| 类内另一个方法没有被拦截 | this.xxx() 自调用绕过代理 | 拆到另一个 Bean，调整调用边界 |
| 方法异常后没有成功日志 | 日志位于 proceed() 之后 | 需要异常审计时，用 try/catch/finally 补充且保留原异常 |
| 日志中没有字段 | 业务对象未赋值，或序列化忽略空值 | 沿返回对象构造链排查，不要归因于 AOP |
| Token/密码出现在日志中 | JSON.toJSONString(joinPoint.getArgs()) 会序列化完整入参 | 脱敏或排除敏感字段 |
| 日志过大或序列化失败 | 命中方法的对象被统一序列化 | 对大对象、文件流、请求对象和循环引用做白名单处理 |

> [!warning] 生产日志安全
> 当前日志切面会完整序列化命中方法的入参和返回值。UserInfoQry 这类可能携带 Token 的对象需要特别注意；“便于排障”不是明文记录凭据和个人信息的理由。

### 5.5 日志文件在哪里

start/src/main/resources/log4j2.xml 定义：

~~~xml
<property name="APP_NAME" value="aboss-sso"/>
<property name="LOG_HOME" value="./logs/${APP_NAME}"/>
<RollingFile name="COMMON-APPENDER"
             fileName="${LOG_HOME}/common-default.log">
~~~

因此按应用启动工作目录计算，普通业务与 AOP INFO 日志会写入：

~~~text
./logs/aboss-sso/common-default.log
~~~

### 5.6 接手新项目时如何快速定位 AOP

接手一个陌生项目时，按“先找切面 → 再看切点 → 反查命中方法 → 验证是否生效”的顺序最省时间。

#### 5.6.1 先全局搜索切面和通知注解

在项目根目录执行：

~~~bash
rg -n '@Aspect|@Pointcut|@Around|@Before|@After|@AfterReturning|@AfterThrowing' .
~~~

找到带 @Aspect 的类后，优先阅读它们；这些通常就是项目自定义 AOP 的主要位置。本项目通过这一步可以定位到：

~~~text
@Aspect
├─ LogAopConfig：统一日志
└─ AccessAspect：调用来源校验
~~~

#### 5.6.2 看切点：先弄清“拦谁”

在切面类中找 @Pointcut、@Around、@Before 等注解的括号内容。最常见的两类规则是：

| 看到的写法 | 表示什么 | 下一步怎么找 |
| --- | --- | --- |
| execution(...) | 按包名、类名、方法名、访问修饰符等条件匹配 | 根据表达式中的包名和类名搜索目标类 |
| @annotation(...) | 按方法上的注解匹配 | 搜索对应注解，例如 rg -n '@Access' . |

不要只看切面类名。例如叫“日志切面”的类，实际可能只记录 Facade；真正范围仍要以切点表达式为准。

#### 5.6.3 反查哪些业务方法会被拦截

1. 遇到 execution(...)：将表达式拆成包名、类名、方法修饰符和方法名，找出符合条件的实现类；
2. 遇到 @annotation(Access)：全局搜索 @Access，所有标注该注解的方法都是候选目标；
3. 遇到明确的方法名或自定义注解：直接搜索对应方法或注解；
4. 最后检查调用是否经过 Spring 代理，避免将类内 this.xxx() 自调用误认为会触发 AOP。

#### 5.6.4 最后确认 AOP 是否能生效

即使找到了 @Aspect，也应继续检查：

~~~text
切面类是否在启动类包扫描范围内
    ↓
切面类是否已注册为 Spring Bean，例如标注 @Component
    ↓
切面模块是否处于应用运行时依赖链中
    ↓
目标方法是否命中切点，且调用是否经过 Spring 代理
~~~

如果想查 Spring 提供的事务等 AOP 能力，还可以额外搜索 @Transactional；但它表示框架提供的事务切面，不等同于项目自行编写了一个 @Aspect 类。

记忆顺序：**先找 @Aspect，再看切点“拦谁”，最后反查被拦的方法并验证代理调用。**

## 六、📌 总结

- LogAopConfig 是范围型切面：命中 impl/external 包下的 *Impl 公共方法后，统一记录成功调用日志。
- AccessAspect 是标记型切面：只有标了 @Access 的方法才校验调用来源。
- joinPoint.proceed() 决定真实业务是否放行，原结果仍必须返回给调用方。
- Spring AOP 基于代理，手动创建对象和同类自调用容易绕过切面。
- 统一日志提升排障效率，也会放大敏感信息泄露与序列化开销，必须控制记录范围。

记忆句：**包名/类名决定“日志拦谁”，@Access 决定“权限拦谁”，proceed() 决定“业务是否放行”。**

## 七、📚 官方资料

- [Spring Framework：Aspect Oriented Programming with Spring](https://docs.spring.io/spring-framework/reference/core/aop.html)
- [Spring Framework：@AspectJ support](https://docs.spring.io/spring-framework/reference/core/aop/ataspectj.html)
- [Spring Framework：Proxying Mechanisms](https://docs.spring.io/spring-framework/reference/core/aop/proxying.html)

> [!note] 适用范围
> 上述官方页面展示当前 Spring Framework 文档；项目根 POM 使用 Spring Boot 2.1.3.RELEASE。本文对项目行为的说明，以仓库内 LogAopConfig、AccessAspect、Access、Application 和 log4j2.xml 的实际代码为准。
