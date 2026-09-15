---
title: CGLIB、Byte Buddy 与 Spring AOP
date: 2026-09-15 11:34:13
publish: true
---

## 一、💡 一句话理解

> [!tip] 核心结论
> JDK 动态代理通过“实现接口”创建代理对象；CGLIB 和 Byte Buddy 可以通过“继承目标类”生成动态子类。Spring AOP 支持 JDK 动态代理和 CGLIB，而不是只使用 CGLIB；不过 Spring Boot 自动配置默认使用 CGLIB，所以在常见的 Spring Boot 项目中，“AOP 用的是 CGLIB”经常是对的。

如果还不熟悉 JDK 动态代理中的 `Proxy`、`InvocationHandler` 和 `Method`，可以先阅读 [[动态代理]]。

## 二、🧭 理论：为什么需要子类代理

### 2.1 JDK 动态代理的前提

JDK 动态代理的核心思路是：在运行时生成一个“实现指定接口”的类。

```java
interface UserService {
    void findUser();
}

class UserServiceImpl implements UserService {

    @Override
    public void findUser() {
        System.out.println("查询用户");
    }
}
```

代理对象实现的是 `UserService` 接口，调用方也应当通过 `UserService` 类型使用它。

如果目标是下面这种没有接口的普通类，JDK 动态代理就无法直接代理它：

```java
class PlainUserService {

    public String findUser() {
        return "用户：小明";
    }
}
```

### 2.2 子类代理的思路

没有接口时，可以换一条路：在运行时生成目标类的子类，再重写需要拦截的方法。

```java
// 这是帮助理解原理的手写示意。
// 真正的代理子类由字节码工具在运行时生成。
class GeneratedProxy extends PlainUserService {

    @Override
    public String findUser() {
        System.out.println("前置增强：记录日志");
        String result = super.findUser();
        System.out.println("后置增强：统计耗时");
        return result;
    }
}
```

调用链可以简化为：

```text
调用方
  ↓
动态生成的子类对象
  ↓
子类重写方法：执行日志、权限或事务逻辑
  ↓
父类原方法：执行真实业务
```

> [!example] 大白话理解
> JDK 代理是“找一个新人按同一份接口合同工作”；子类代理是“培养一个目标类的子类，让它重写可以接管的方法”。

## 三、⚙️ 理论：CGLIB 和 Byte Buddy

### 3.1 CGLIB 是什么

CGLIB 是一个 Java 字节码生成库。它能够在运行时生成目标类的子类，并通过拦截器接管可重写的方法。

CGLIB 中两个容易遇到的核心角色是：

| 角色 | 作用 |
| --- | --- |
| `Enhancer` | 设置父类和拦截器，然后生成代理子类及其对象 |
| `MethodInterceptor` | 在方法调用时执行增强逻辑，并决定是否继续执行原方法 |

下面是 CGLIB 的典型使用结构：

```java
Enhancer enhancer = new Enhancer();

// 动态类将继承 PlainUserService。
enhancer.setSuperclass(PlainUserService.class);

// 可重写方法被调用时，都会先进入拦截器。
enhancer.setCallback((MethodInterceptor) (proxy, method, args, methodProxy) -> {
    long start = System.currentTimeMillis();
    System.out.println("开始调用：" + method.getName());

    try {
        // 调用父类原方法。
        // 如果在这里又通过代理对象普通调用同一方法，可能造成递归拦截。
        return methodProxy.invokeSuper(proxy, args);
    } finally {
        System.out.println("调用结束，耗时："
                + (System.currentTimeMillis() - start) + " ms");
    }
});

PlainUserService proxy = (PlainUserService) enhancer.create();
proxy.findUser();
```

> [!info] Spring 里的 CGLIB
> Spring 将 CGLIB 重新打包到了 `spring-core` 中。使用 Spring AOP 时，通常不需要再单独引入 `cglib` 依赖。

独立 CGLIB 项目的 README 目前已标明项目处于未维护状态，并提醒它在 JDK 17 及更新版本上可能存在兼容问题。这条结论针对的是独立 CGLIB 项目，不等于 Spring 内部的 CGLIB 代理不能使用。

### 3.2 Byte Buddy 是什么

Byte Buddy 也是 Java 字节码生成库，但它的能力不只是创建代理子类。

Byte Buddy 主要支持三种类型处理方式：

| 方式 | 白话理解 |
| --- | --- |
| `subclass` | 新建一个目标类的子类 |
| `redefine` | 使用新实现重新定义原类 |
| `rebase` | 保留原方法实现，同时为它增加新的入口逻辑 |

它的 API 会先选中类和方法，再声明要用什么逻辑拦截这些方法。

```java
Class<? extends PlainUserService> proxyClass = new ByteBuddy()
        // 新建 PlainUserService 的动态子类。
        .subclass(PlainUserService.class)

        // 选中名为 findUser 的可重写方法。
        .method(ElementMatchers.named("findUser"))

        // 这里仅用固定返回值演示“替换方法实现”。
        .intercept(FixedValue.value("被 Byte Buddy 拦截"))
        .make()
        .load(PlainUserService.class.getClassLoader())
        .getLoaded();

PlainUserService proxy = proxyClass.getDeclaredConstructor().newInstance();
proxy.findUser();
```

这段代码的核心顺序是：

```text
subclass：选择父类
  ↓
method：选择要处理的方法
  ↓
intercept：指定新的方法实现
  ↓
make + load：生成字节码并加载动态类
```

实际项目中，Byte Buddy 还可以结合 `MethodDelegation`、`Advice` 和 `SuperMethodCall` 组合出“增强逻辑 + 原方法”的完整调用链。它常见于 Java Agent、链路追踪、监控、测试框架和底层框架开发。

### 3.3 子类代理的共同限制

无论使用 CGLIB 还是 Byte Buddy 创建普通子类代理，都必须遵守 Java 的继承和方法重写规则。

| 情况 | 无法通过普通子类代理拦截的原因 |
| --- | --- |
| `final` 类 | 不能被继承，无法生成代理子类 |
| `final` 方法 | 不能在子类中重写 |
| `private` 方法 | 对子类不可见，不存在 Java 意义上的重写 |
| 跨包不可见的方法 | 代理子类无法重写 |

> [!warning] 不要过度延伸
> “生成了目标类的子类”不等于“什么方法都能拦截”。Byte Buddy 虽然还支持重定义、重基等更底层的能力，但那些不能与普通的子类代理混为一谈。

### 3.4 CGLIB 与 Byte Buddy 的关系

| 对比项 | CGLIB | Byte Buddy |
| --- | --- | --- |
| 常见理解方式 | 基于子类生成动态代理 | 通用的 Java 字节码生成和修改库 |
| 生成子类 | 支持 | 支持 |
| 重定义、重基类 | 不是主要使用方式 | 原生支持 |
| 常见场景 | Spring AOP 的基于类代理 | Java Agent、监控、Mock 框架、ORM 和底层框架 |
| 与 Spring AOP 的关系 | Spring AOP 的代理实现之一 | 不是 Spring AOP 的默认代理实现 |

## 四、🎯 理论：Spring AOP 到底用什么代理

### 4.1 Spring AOP 不是只使用 CGLIB

Spring AOP 是基于代理的。它的常见代理实现有两种：

- JDK 动态代理；
- CGLIB 代理。

Byte Buddy 不在 Spring AOP 默认的这两种代理实现中。

### 4.2 Spring Framework 的选择规则

Spring Framework 官方文档给出的基本规则是：

| 目标对象与配置 | 代理方式 |
| --- | --- |
| 目标实现了一个或多个接口 | 可使用 JDK 动态代理，代理这些接口 |
| 目标没有实现接口 | 使用 CGLIB 生成目标类的子类 |
| `proxyTargetClass=true` | 即使有接口，也强制使用基于类的 CGLIB 代理 |

所以，如果只讨论 Spring Framework 的底层选择能力，“Spring AOP 一定使用 CGLIB”是错的。

### 4.3 Spring Boot 为什么经常是 CGLIB

Spring Boot 又在 Spring Framework 之上加了一层自动配置。当前 Spring Boot 官方文档说明，其 AOP 自动配置默认使用 CGLIB 代理：

```properties
# Spring Boot 中该配置默认为 true。
spring.aop.proxy-target-class=true
```

因此，在普通 Spring Boot 项目中，即使某个 Bean 实现了接口，也很可能仍然看到 CGLIB 代理。

如果希望有接口的 Bean 改用 JDK 动态代理，可以配置：

```yaml
spring:
  aop:
    # false 表示不强制创建基于类的代理。
    proxy-target-class: false
```

> [!tip] 如何回答“AOP 是不是用 CGLIB”
> 可以回答：“Spring AOP 底层可以使用 JDK 动态代理或 CGLIB。有接口时具备使用 JDK 代理的条件，没有接口时通常使用 CGLIB；Spring Boot 的 AOP 自动配置默认强制使用 CGLIB。”

### 4.4 `@Aspect` 不等于真正的 AspectJ 织入

Spring AOP 可以使用 `@Aspect`、`@Before` 和 `@Around` 等 AspectJ 风格的注解，但这不代表底层一定使用了 AspectJ 的编译期或加载期织入。

常见的 Spring AOP 仍然是基于代理对象的：

```text
外部对 Bean 的调用
  ↓
Spring 代理对象
  ↓
切面逻辑
  ↓
目标 Bean 的真实方法
```

这也是同类内部的 `this.xxx()` 自调用容易让 AOP 失效的原因：调用发生在目标对象内部，没有重新经过外面的 Spring 代理对象。

## 五、🚀 实践：确认 Spring 实际使用的代理

### 5.1 前置准备

在 Spring Boot 项目中使用 Spring AOP，通常需要引入 AOP Starter。实际版本由当前 Spring Boot 依赖管理统一控制：

```xml
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-aop</artifactId>
</dependency>
```

下面示例假设项目已经能够正常启动 Spring Boot。

### 5.2 创建一个目标 Bean

文件位置：`src/main/java/com/example/proxy/UserService.java`。

```java
package com.example.proxy;

import org.springframework.stereotype.Service;

@Service
public class UserService {

    public String findUser(String username) {
        return "用户：" + username;
    }
}
```

`UserService` 没有实现业务接口，因此 Spring AOP 如果需要代理它，就必须创建基于类的代理。

### 5.3 创建一个日志切面

文件位置：`src/main/java/com/example/proxy/LoggingAspect.java`。

```java
package com.example.proxy;

import org.aspectj.lang.ProceedingJoinPoint;
import org.aspectj.lang.annotation.Around;
import org.aspectj.lang.annotation.Aspect;
import org.springframework.stereotype.Component;

@Aspect
@Component
public class LoggingAspect {

    /**
     * 拦截 UserService 中的公开方法。
     */
    @Around("execution(public * com.example.proxy.UserService.*(..))")
    public Object log(ProceedingJoinPoint joinPoint) throws Throwable {
        long start = System.currentTimeMillis();
        System.out.println("调用前：" + joinPoint.getSignature().getName());

        try {
            // 继续执行目标方法，并将返回值交还给调用方。
            return joinPoint.proceed();
        } finally {
            System.out.println("调用后，耗时："
                    + (System.currentTimeMillis() - start) + " ms");
        }
    }
}
```

### 5.4 在启动时检查代理类型

文件位置：`src/main/java/com/example/proxy/ProxyCheckRunner.java`。

```java
package com.example.proxy;

import org.springframework.aop.support.AopUtils;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

@Component
public class ProxyCheckRunner implements CommandLineRunner {

    private final UserService userService;

    public ProxyCheckRunner(UserService userService) {
        // Spring 注入的是代理对象，不是调用方手动 new 出来的对象。
        this.userService = userService;
    }

    @Override
    public void run(String... args) {
        // 先触发一次被切面拦截的方法调用。
        System.out.println(userService.findUser("小明"));

        // 打印实际运行时类名。
        System.out.println("运行时类：" + userService.getClass().getName());

        // 使用 Spring 工具判断代理类型，比只观察类名更清楚。
        System.out.println("JDK 代理："
                + AopUtils.isJdkDynamicProxy(userService));
        System.out.println("CGLIB 代理："
                + AopUtils.isCglibProxy(userService));
    }
}
```

### 5.5 启动和预期结果

正常启动 Spring Boot 应用后，可以看到类似输出：

```text
调用前：findUser
调用后，耗时：0 ms
用户：小明
运行时类：com.example.proxy.UserService$$SpringCGLIB$$0
JDK 代理：false
CGLIB 代理：true
```

动态生成的具体类名和耗时会随环境变化，不需要与示例完全一致。

常见的类名特征是：

| 运行时类名特征 | 通常对应的代理 |
| --- | --- |
| 包含 `$Proxy` 或 `jdk.proxy` | JDK 动态代理 |
| 包含 `SpringCGLIB` | Spring CGLIB 代理 |

### 5.6 常见问题排查

#### 5.6.1 完全没有看到切面日志

优先检查：

- `UserService` 和 `LoggingAspect` 是否都在 Spring 扫描范围内；
- 是否引入了 `spring-boot-starter-aop`；
- 切点表达式是否匹配实际包名和类名；
- 目标对象是否由 Spring 管理，而不是手动 `new UserService()` 创建的。

#### 5.6.2 外部调用有切面，同类自调用没有

这通常是代理边界问题。例如：

```java
public void outer() {
    // this.inner() 没有先离开当前对象再经过 Spring 代理，
    // 因此 inner 方法上的独立增强通常不会被触发。
    this.inner();
}
```

更常见的处理方式是调整类职责，将需要被独立增强的方法放到另一个 Spring Bean 中，让调用真正经过代理对象。

#### 5.6.3 CGLIB 代理没有拦截某个方法

检查目标类和方法是否使用了 `final`、`private` 或其他导致子类无法重写的可见性。

## 六、📌 总结

- JDK 动态代理生成接口实现类，目标通常需要通过接口暴露能力。
- CGLIB 可以生成目标类的子类，通过重写可重写方法实现拦截。
- Byte Buddy 也能生成子类，还提供重定义、重基和 Java Agent 等更广的字节码操作能力。
- `final` 类、`final` 方法和 `private` 方法无法被普通的子类代理覆盖。
- Spring AOP 支持 JDK 动态代理和 CGLIB；Byte Buddy 不是 Spring AOP 的默认代理实现。
- Spring Boot 的 AOP 自动配置默认使用 CGLIB，可通过 `spring.aop.proxy-target-class=false` 允许有接口的 Bean 使用 JDK 代理。
- Spring AOP 基于代理，手动创建对象和同类 `this.xxx()` 自调用容易绕过切面。

记忆句：**JDK 代理找接口，CGLIB 和 Byte Buddy 可以造子类；Spring AOP 在 JDK 与 CGLIB 之间选择，Spring Boot 默认更偏向 CGLIB。**

## 七、📚 官方资料

- [Spring Framework：AOP Proxying Mechanisms](https://docs.spring.io/spring-framework/reference/core/aop/proxying.html)
- [Spring Framework：AOP Proxies](https://docs.spring.io/spring-framework/reference/core/aop/introduction-proxies.html)
- [Spring Boot：Aspect-Oriented Programming](https://docs.spring.io/spring-boot/reference/features/aop.html)
- [CGLIB：项目 README](https://github.com/cglib/cglib)
- [Byte Buddy：官方教程](https://bytebuddy.net/#/tutorial)
