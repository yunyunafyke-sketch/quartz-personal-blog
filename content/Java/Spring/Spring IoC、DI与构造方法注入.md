---
title: Spring IoC、DI与构造方法注入
date: 2026-09-24 15:21:48
publish: true
---

## 一、💡 一句话理解

> [!tip] 核心结论
> Spring 创建一个对象时，会检查它的构造方法需要哪些参数，再按照参数类型从 IoC 容器中寻找 Bean 并传进去。这个过程叫“基于类型自动装配的构造方法注入”。

本文复习的是 [[AI/Agent开发/11.Function Calling、Tool Calling 原理]] 中涉及的 Spring 基础知识。

## 二、🧭 四个核心概念

| 概念 | 大白话解释 | 在代码中的体现 |
| --- | --- | --- |
| IoC 容器 | 统一保存和管理对象的地方 | Spring 管理 Controller、Service、配置类和 `@Bean` 对象 |
| Bean | 交给 Spring 容器管理的对象 | `ChatClient`、`ChatMemory`、`ChatController` |
| DI | Spring 把对象需要的依赖传进来 | 把 `ChatClient` 传给 `ChatController` |
| 构造方法注入 | 通过构造方法参数接收依赖 | `ChatController(ChatClient chatClient)` |

它们的关系是：

```text
IoC：对象交给 Spring 管理
  → Bean：被 Spring 管理的具体对象
  → DI：Spring 把 Bean 提供给需要它的对象
  → 构造方法注入：通过构造方法完成 DI
```

## 三、⚙️ Spring 怎样选择 Bean

### 3.1 第一判断条件：构造参数类型

```java
public ChatController(ChatClient chatClient) {
    this.chatClient = chatClient;
}
```

Spring 看到构造参数类型是 `ChatClient`，就会在容器中查找 `ChatClient` 类型的 Bean。

字段名称和参数名称不是首要判断条件：

```java
private final ChatClient chatClient;
```

这行只负责保存对象。真正触发依赖注入的是构造方法参数。

### 3.2 候选 Bean 数量不同会怎样

| 匹配结果 | Spring 的处理 |
| --- | --- |
| 恰好一个 Bean | 直接注入 |
| 没有 Bean | 应用启动失败，提示找不到依赖 |
| 多个同类型 Bean | 继续根据 `@Primary`、`@Qualifier` 等规则选择 |
| 多个 Bean 且仍无法确定 | 应用启动失败，不会随便选择 |

### 3.3 `@Primary` 和 `@Qualifier`

`@Primary` 表示“存在多个同类型 Bean 时，默认优先使用这个”。

```java
@Bean
@Primary
ChatClient primaryChatClient(ChatClient.Builder builder) {
    return builder.build();
}
```

`@Qualifier` 表示“这个注入点明确指定某个 Bean”。

```java
public SomeController(
        @Qualifier("businessChatClient") ChatClient chatClient) {
    this.chatClient = chatClient;
}
```

可以这样记：

```text
@Primary：默认选谁
@Qualifier：这一次明确选谁
```

## 四、🔍 结合当前项目理解

### 4.1 `ChatController` 注入的是记忆版 Bean

项目中的构造方法是：

```java
public ChatController(ChatClient chatClient) {
    this.chatClient = chatClient;
}
```

参数类型是 `ChatClient`，所以 Spring 查找 `ChatClient` Bean。

项目在 `ChatMemoryConfig` 中声明了：

```java
@Bean
ChatClient chatClient(
        ChatClient.Builder builder,
        ChatMemory chatMemory) {
    return builder
            .defaultAdvisors(
                    MessageChatMemoryAdvisor.builder(chatMemory).build())
            .build();
}
```

这个 Bean 安装了 `MessageChatMemoryAdvisor`，因此 `ChatController` 使用的是带 Redis 聊天记忆的客户端。

```text
Spring 创建 ChatController
  → 发现需要 ChatClient
  → 找到 ChatMemoryConfig 创建的 ChatClient Bean
  → 注入记忆版客户端
```

### 4.2 `ToolCallingController` 注入的是 Builder

项目中的构造方法是：

```java
public ToolCallingController(ChatClient.Builder builder) {
    this.chatClient = builder.build();
}
```

参数类型是 `ChatClient.Builder`，所以 Spring 查找 Builder，而不是查找 `ChatClient` Bean。

```text
Spring 创建 ToolCallingController
  → 发现需要 ChatClient.Builder
  → 注入 Spring AI 自动配置的 Builder
  → Controller 自己调用 builder.build()
  → 创建另一个 ChatClient 对象
```

`builder.build()` 是普通 Java 方法调用，不是 Spring 再次查找 Bean。

### 4.3 两个 `chatClient` 有什么区别

| 对比项 | `ChatController` | `ToolCallingController` |
| --- | --- | --- |
| 构造参数 | `ChatClient` | `ChatClient.Builder` |
| 对象来源 | `ChatMemoryConfig` 创建的 Bean | Controller 自己调用 `builder.build()` 创建 |
| Redis 聊天记忆 | 有 | 没有 |
| Tool | 当前请求没有注册 Tool | 当前请求注册 `DateTimeTools` |
| 返回方式 | `.stream()` 流式返回 | `.call()` 一次返回 |
| 底层模型配置 | DeepSeek | 同一个 DeepSeek 配置 |

两个字段虽然都叫 `chatClient`，但它们属于不同的 Controller，也保存着不同的对象。

可以把它们理解为：使用同一台模型发动机，组装出的两辆不同配置的车。

## 五、🧩 `@Bean`、自动配置和普通对象

### 5.1 什么对象是 Bean

常见的 Bean 来源：

| 来源 | 示例 |
| --- | --- |
| 组件扫描 | `@RestController`、`@Service`、`@Component` |
| 配置方法 | `@Configuration` 中的 `@Bean` 方法 |
| Spring Boot 自动配置 | Spring AI 自动创建的 `ChatModel` 和 `ChatClient.Builder` |

### 5.2 `new` 或 `build()` 出来的对象一定是 Bean 吗

不一定。

```java
this.chatClient = builder.build();
```

这里创建的 `ChatClient` 只是保存在 Controller 字段中，没有单独注册进 Spring 容器，所以它本身不是一个可被其他类直接注入的 `ChatClient` Bean。

如果在 `@Bean` 方法中返回它：

```java
@Bean
ChatClient chatClient(ChatClient.Builder builder) {
    return builder.build();
}
```

返回的对象才会由 Spring 注册和管理。

## 六、📌 高频复习题

### 6.1 为什么只有一个构造方法时不用写 `@Autowired`

Spring 会自动使用唯一的构造方法完成依赖注入，因此可以省略 `@Autowired`。

### 6.2 字段名相同会冲突吗

不会。两个字段分别属于两个 Controller 对象，互不影响。Spring 主要根据构造参数类型查找 Bean。

### 6.3 类型相同就一定是同一个对象吗

不一定。同一个接口可以有多个实例，也可以有多个 Bean。要看对象是从哪里创建、是否注册进容器，以及是否使用 `@Qualifier` 或 `@Primary`。

### 6.4 `builder.build()` 会使用容器中的 `ChatClient` Bean 吗

不会。它会根据当前 Builder 配置创建一个新的 `ChatClient` 对象。

### 6.5 如何让 `ToolCallingController` 使用记忆版客户端

把构造参数改为直接注入 `ChatClient`：

```java
public ToolCallingController(ChatClient chatClient) {
    this.chatClient = chatClient;
}
```

但当前记忆 Advisor 需要会话 ID，调用时还要传入 `ChatMemory.CONVERSATION_ID`，否则它不知道应该读取哪段聊天记录。

## 七、🧠 快速记忆

- IoC：对象交给 Spring 管。
- DI：Spring 把依赖给对象。
- 构造方法注入：依赖通过构造参数传入。
- Spring 首先根据参数类型寻找 Bean。
- 一个候选直接注入，多个候选使用 `@Primary` 或 `@Qualifier`。
- `ChatClient` 和 `ChatClient.Builder` 是两个不同类型。
- `builder.build()` 是创建新对象，不是查找已有 Bean。

> [!tip] 记忆句
> Spring 看构造参数类型找 Bean；字段只负责保存对象，`build()` 只负责创建新对象。

## 八、📚 官方资料

- [Spring Framework：使用 `@Autowired`](https://docs.spring.io/spring-framework/reference/core/beans/annotation-config/autowired.html)
- [Spring Framework：自动装配协作者](https://docs.spring.io/spring-framework/reference/core/beans/dependencies/factory-autowire.html)
- [Spring AI：ChatClient API](https://docs.spring.io/spring-ai/reference/api/chatclient.html)
