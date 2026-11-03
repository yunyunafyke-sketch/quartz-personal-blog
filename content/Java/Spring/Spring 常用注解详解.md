---
title: Spring 常用注解详解
date: 2026-11-03 14:13:24
publish: true
---

## 一、💡 一句话理解

> [!tip] 核心结论
> 注解是写在代码上的“说明标签”。Spring、Spring MVC 等组件读取标签后，完成对象注册、依赖注入、请求处理等工作。标签本身不会自动执行业务逻辑，必须有对应的处理机制。

以“查询商品接口”为主线：用户访问接口 → Controller 接收参数 → Service 处理业务 → 返回商品信息。注解负责告诉框架：谁接请求、谁处理业务、对象怎么组装。

本文整理日常 Spring / Spring Boot 开发常见注解，不是所有注解的全集。资料核对日期：2026-11-03；示例采用 Java 17、Spring Boot 3.x / Spring Framework 6.x 的常见写法，Boot 4 项目的依赖选择应以对应版本为准。

关联阅读：[[1.Spring IoC、DI与构造方法注入]]、[[Spring Bean 生命周期]]、[[CGLIB、Byte Buddy 与 Spring AOP]]。

## 二、🧭 理论：先弄清楚注解交给谁处理

### 2.1 注解不是一种统一的“魔法”

| 注解来源 | 示例 | 谁处理、起什么作用 |
| --- | --- | --- |
| Java | `@Override` | 编译器检查是否正确重写方法 |
| Spring | `@Service`、`@Autowired` | 容器注册组件、组装依赖 |
| Spring MVC | `@GetMapping`、`@RequestBody` | Web 框架匹配接口、读取请求 |
| Spring Boot | `@SpringBootApplication` | 组合配置、自动配置和组件扫描 |
| Jakarta 标准 | `@Valid`、`@PostConstruct` | 由校验实现或容器集成机制处理 |
| Lombok | `@Data`、`@RequiredArgsConstructor` | 编译期生成方法或构造方法，需要配置 Lombok |
| MyBatis | `@Mapper`、`@Param` | MyBatis 集成机制创建 Mapper 代理、绑定参数 |

看不懂注解时先看 `import`。同名或相似名称可能来自不同包，含义也可能不同。

### 2.2 三个必须分清的动作

| 动作 | 白话解释 | 常见注解 |
| --- | --- | --- |
| 注册 Bean | 告诉容器“这个对象归你管理” | `@Component`、`@Bean` |
| 注入依赖 | 把已管理的对象交给需要它的对象 | `@Autowired`、`@Qualifier` |
| 增强行为 | 在原方法周围增加事务、异步等处理 | `@Transactional`、`@Async` |

类比：注册是登记员工，注入是分配搭档，增强是增加工作流程。真实对象仍是 Java 对象；类比不能推出“贴上标签就一定生效”。

## 三、⚙️ 理论：按对象创建到接口调用理解

### 3.1 对象管理：谁交给 Spring 管

| 注解 | 写在哪里 | 大白话含义 | 常见用途与边界 |
| --- | --- | --- | --- |
| `@Component` | 类 | 这是一个通用组件 | 需被扫描或显式注册 |
| `@Service` | 类 | 这是处理业务的组件 | 是 `@Component` 的特化，不自动开启事务 |
| `@Repository` | 类 | 这是访问数据的组件 | 可参与持久化异常转换，需相应支持；不会自动生成 SQL |
| `@Controller` | 类 | 这是 Web 控制器 | 常用于页面，也可搭配 `@ResponseBody` 返回数据 |
| `@RestController` | 类 | 控制器的方法默认把返回值写进响应体 | 组合了 `@Controller` 与 `@ResponseBody`；不代表所有响应一定是 JSON |
| `@Configuration` | 类 | 这是配置类 | 通常在里面声明 `@Bean` |
| `@Bean` | 方法 | 把这个方法返回的对象注册为 Bean | 常用于第三方类或需要手动构造的对象 |
| `@ComponentScan` | 配置类 | 到指定包里找组件 | 默认扫描指定包及其子包，不是扫描整个工程 |
| `@Import` | 配置类等 | 显式导入配置或组件 | 也支持选择器、注册器等扩展机制 |

**`@Component` 和 `@Bean` 怎么选？**

- 自己写的业务类：通常用 `@Service`、`@Component` 等。
- 第三方类或需要定制构造过程：通常在配置类的方法上写 `@Bean`。
- `@Bean` 默认名称是方法名；`@Component` 默认通常使用类名首字母小写，连续大写开头等情况存在命名规则例外。

`@Configuration` 默认会代理配置类中的 `@Bean` 方法调用，以支持 Bean 间引用。设置 `proxyBeanMethods = false` 后，不要依赖直接调用另一个 `@Bean` 方法取得容器对象；推荐通过方法参数注入依赖。

### 3.2 依赖注入：对象需要的搭档从哪里来

| 注解 | 写在哪里 | 大白话含义 | 易错点 |
| --- | --- | --- | --- |
| `@Autowired` | 构造方法、字段、方法 | 请容器解析并注入依赖 | 主要按类型查找；单构造方法通常可省略 |
| `@Qualifier("名称")` | 参数、字段等 | 从候选对象里进一步筛选 | 常与构造方法注入组合使用，不负责创建 Bean |
| `@Primary` | 组件类、`@Bean` 方法 | 同类型候选中优先选我 | 主要解决单值注入；不会让集合只剩这一项 |
| `@Resource` | 字段、setter 等 | 按资源名称等规则注入 | 常见用法先按名称；部分默认名称场景可回退按类型，不等于 `@Autowired` |
| `@Value` | 参数、字段等 | 把配置值交给我 | `${key:默认值}` 读取配置，`#{...}` 是表达式 |

推荐构造方法注入：依赖清楚，可用 `final`，测试时也方便手动传入对象。

> [!warning] 两个常见误区
> `@Autowired` 不负责把一个普通类自动注册为 Bean。自己 `new` 出来的普通对象，也不会因为字段上写了注解就自动完成容器注入。

`@Resource` 在 Spring 6 / Boot 3 通常导入 `jakarta.annotation.Resource`；老项目可能使用 `javax.annotation.Resource`，不要直接混用。

### 3.3 配置与启动：应用怎么组装起来

| 注解 | 含义 | 记忆点 |
| --- | --- | --- |
| `@SpringBootApplication` | Boot 常见启动入口组合注解 | 包含 `@SpringBootConfiguration`、`@EnableAutoConfiguration`、`@ComponentScan` |
| `@EnableAutoConfiguration` | 按类路径、已有 Bean、配置等条件启用自动配置 | 是条件装配，不是把所有组件全部装上 |
| `@ConfigurationProperties(prefix = "app")` | 把一组配置绑定到对象 | 比大量分散的 `@Value` 更适合结构化配置 |
| `@ConfigurationPropertiesScan` | 扫描配置属性类 | 普通属性类仅写 `@ConfigurationProperties` 不一定完成注册 |
| `@EnableConfigurationProperties` | 显式启用指定配置属性类 | 是注册属性类的另一种常见方式 |
| `@Profile("dev")` | 指定环境激活时才参与注册 | 适合开发、测试等环境差异 |
| `@ConditionalOnProperty` | 根据配置属性决定是否装配 | Boot 的条件注解，不是 Spring Framework 核心注解 |

启动类通常放在业务包的上层。假设启动类在 `com.example.demo`，组件放在 `com.other`，默认扫描范围通常找不到它。

### 3.4 接口映射：请求应该交给哪个方法

| 注解 | 大白话含义 | 示例 |
| --- | --- | --- |
| `@RequestMapping` | 定义路径、请求方式等映射条件 | 类上 `/products`，方法上 `/{id}`，组合成 `/products/{id}` |
| `@GetMapping` | 处理 GET 请求 | 查询商品 |
| `@PostMapping` | 处理 POST 请求 | 提交创建请求 |
| `@PutMapping` | 处理 PUT 请求 | 通常表达整体替换或更新语义 |
| `@PatchMapping` | 处理 PATCH 请求 | 通常表达部分更新语义 |
| `@DeleteMapping` | 处理 DELETE 请求 | 删除资源 |
| `@ResponseBody` | 将返回值通过消息转换器写进响应体 | 对象常转 JSON，字符串也可能直接作为文本返回 |

这些 HTTP 方法的业务语义要靠实现遵守。写了 `@GetMapping`，框架不会检查你的方法里有没有修改数据。

### 3.5 参数读取：数据到底从哪里来

| 注解 | 读取位置 | 请求示例 | 关键区别 |
| --- | --- | --- | --- |
| `@PathVariable("id")` | URL 路径 | `/products/1001` | 读取路径占位符 `{id}` |
| `@RequestParam("keyword")` | 查询参数、表单参数 | `/products?keyword=键盘` | 默认必填，可设置默认值或 `required = false` |
| `@RequestBody` | HTTP 请求体 | JSON：`{"name":"键盘"}` | 通过消息转换器转换为对象；不负责所有合法性检查 |
| `@RequestHeader("X-Trace-Id")` | 请求头 | `X-Trace-Id: abc` | 获取客户端传入的头部值 |
| `@CookieValue("token")` | Cookie | `Cookie: token=abc` | 获取 Cookie，不代表值可信或已认证 |
| `@ModelAttribute` | 常见为查询、表单参数绑定对象 | `?name=键盘&price=99` | 不等于解析 JSON 请求体；也有模型初始化等用途 |

记忆句：**路径用 Path，问号参数用 Param，JSON 主体常用 Body。**

`@RequestParam(defaultValue = "1")` 还会使参数不再强制必填。对于可缺省数字参数，注意使用包装类型、默认值或 `Optional`，避免把空值交给基本类型。

### 3.6 校验和异常：参数不合规则怎么办

| 注解 | 来源与作用 | 注意事项 |
| --- | --- | --- |
| `@Valid` | Jakarta Validation；在 MVC 参数等受支持位置触发校验，也用于级联校验 | 字段上有约束，并不意味着任何普通方法调用都会自动校验 |
| `@Validated` | Spring；支持校验分组等 | 用于服务方法校验时通常需要方法校验基础设施与代理 |
| `@NotNull` | 值不能为 null | 空字符串仍可能通过 |
| `@NotEmpty` | 字符串、集合等不能为 null 或空 | 纯空格字符串仍可能通过 |
| `@NotBlank` | 字符串不能为 null、空串或全空白 | 常用于姓名、商品名 |
| `@Min(1)` | 数值最小为 1 | 不能替代非空约束 |
| `@ExceptionHandler` | 为指定异常提供处理方法 | 可在控制器或全局异常处理类中声明 |
| `@ControllerAdvice` | 为控制器提供统一处理能力 | 还可统一模型数据、绑定规则 |
| `@RestControllerAdvice` | `@ControllerAdvice` 与 `@ResponseBody` 的组合 | 常用于统一返回错误数据 |

Boot 3 使用 `jakarta.validation.*`，并需要校验实现，常见依赖是 `spring-boot-starter-validation`。`@Valid` 本身不是“不能为空”规则，实际约束是 `@NotBlank` 等。

Spring MVC 6.1+ 提供内置方法校验，控制器是否需要类级别 `@Validated` 要按具体校验场景判断，不能套用“所有 Controller 都加”的习惯。

### 3.7 事务、生命周期和扩展能力

| 注解 | 大白话含义 | 生效条件或边界 |
| --- | --- | --- |
| `@Transactional` | 按配置的事务语义执行方法 | 需要事务管理器等支持；默认代理模式下，类内直接调用不会触发被调用方法的事务拦截 |
| `@PostConstruct` | Bean 依赖注入后执行初始化方法 | 不是“整个应用都启动完”的通知 |
| `@PreDestroy` | 容器销毁 Bean 时调用清理方法 | prototype Bean 的销毁不由容器自动完整管理；进程强制终止也不能保证回调 |
| `@Scope("prototype")` | 每次向容器请求时创建新实例 | 注入到单例一次后，该字段不会每次调用自动变成新对象 |
| `@Lazy` | 延迟初始化或在注入点建立延迟解析 | 非懒加载单例直接依赖它时，仍可能在启动阶段创建 |
| `@Async` | 通过异步执行器运行方法 | 通常需 `@EnableAsync`；默认代理模式下类内直接调用不生效 |
| `@Scheduled` | 按周期或 cron 调度执行 | 通常需 `@EnableScheduling`；多实例部署可能各执行一份任务 |
| `@Cacheable` | 按缓存规则复用结果 | 通常需 `@EnableCaching` 与缓存管理器；默认代理模式下也要留意调用路径 |
| `@Aspect` | 声明切面，描述在哪里增加通用处理 | 还需将切面注册为 Bean，并启用相应 AOP 支持 |

事务优先记住这四点：

1. Spring 默认事务规则通常对 `RuntimeException`、`Error` 回滚，对受检异常不自动回滚；项目可以修改全局默认规则。
2. `rollbackFor = Exception.class` 可显式扩大回滚范围；异常被业务代码吞掉，拦截器通常看不到它。
3. `readOnly = true` 主要是事务提示与优化配置，不是防止写操作的权限屏障。
4. 普通本地事务不能自动回滚远程 HTTP 调用、已发送邮件等外部副作用。

> [!info] 为什么“写了注解还不生效”
> 依次检查：对象是否归容器管理 → 是否开启对应功能 → 是否有必要依赖和配置 → 调用有没有经过代理 → 是否存在方法可见性、final 等代理限制。不要只检查拼写。

## 四、🚀 实践：从准备到验证

### 4.1 前置准备

这是一个独立学习示例：只返回固定商品信息，不连接数据库。

准备 Java 17、Maven，并创建 Spring Boot **3.x** Maven 项目，选择 Spring Web、Validation。启动类放在 `com.example.demo` 包，下面代码也全部放在这个包。

如果已有 Boot 3 项目，确认 `pom.xml` 在原有 Boot 父工程或 BOM 管理下包含以下依赖；此片段不是完整 POM，不要覆盖项目原文件。

```xml
<dependencies>
    <!-- 提供 Spring MVC、JSON 转换和内嵌 Web 服务器。 -->
    <dependency>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-web</artifactId>
    </dependency>
    <!-- 提供 Jakarta Validation 的校验实现。 -->
    <dependency>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-validation</artifactId>
    </dependency>
</dependencies>
```

### 4.2 可以拿来干什么

**用途一：声明业务对象并注入控制器。** `ProductService` 来自下面完整示例中的 `@Service`，Controller 是 `@RestController` 注册的 Bean。构造参数是输入依赖，Spring 找到服务对象并传入，控制器才具备查询能力。

```java
// 片段：放在完整示例的 ProductController 类里。
private final ProductService productService;

// 只有一个构造方法，省略 @Autowired；依赖由容器提供。
public ProductController(ProductService productService) {
    this.productService = productService;
}
```

**用途二：从请求读取参数。** 依赖前述 Spring Web 和已注册的 Controller。下面片段位于同一控制器，类级路径为 `/products`。

```java
// 输入 GET /products/1001?prefix=推荐；输出来自 Service 的商品对象。
@GetMapping("/{id}")
public ProductView get(
        @PathVariable("id") Long id, // 从路径读取 1001。
        @RequestParam(name = "prefix", defaultValue = "商品") String prefix) {
    return productService.find(id, prefix);
}
```

**用途三：校验提交的 JSON。** 依赖 Validation starter；`CreateProductRequest` 是下文带 `@NotBlank` 的请求对象。输入非空白商品名时返回对象，空白商品名时返回 HTTP 400。

```java
// 此示例只演示接收和校验，不保存数据。
@PostMapping("/preview")
public ProductView preview(@Valid @RequestBody CreateProductRequest request) {
    return new ProductView(0L, request.name());
}
```

### 4.3 完整代码

文件：`src/main/java/com/example/demo/DemoApplication.java`。

```java
package com.example.demo;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

// 启用 Boot 配置、自动配置和本包及子包的组件扫描。
@SpringBootApplication
public class DemoApplication {
    public static void main(String[] args) {
        // run：创建并启动容器，完成 Bean 组装并启动 Web 服务。
        SpringApplication.run(DemoApplication.class, args);
    }
}
```

文件：`src/main/java/com/example/demo/ProductView.java`。

```java
package com.example.demo;

// 响应数据载体，不需要注册成 Bean；由控制器返回后交给消息转换器。
public record ProductView(Long id, String name) {
}
```

文件：`src/main/java/com/example/demo/CreateProductRequest.java`。

```java
package com.example.demo;

import jakarta.validation.constraints.NotBlank;

// @NotBlank：商品名不能为 null、空串或全部空白。
// 这里只声明规则；实际校验由控制器参数上的 @Valid 触发。
public record CreateProductRequest(
        @NotBlank(message = "商品名不能为空") String name) {
}
```

文件：`src/main/java/com/example/demo/ProductService.java`。

```java
package com.example.demo;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

// 声明业务组件，扫描后由 Spring 创建并管理。
@Service
public class ProductService {
    private final String shopName;

    // @Value：读取配置；未提供 app.shop-name 时使用“学习商店”。
    public ProductService(@Value("${app.shop-name:学习商店}") String shopName) {
        this.shopName = shopName;
    }

    public ProductView find(Long id, String prefix) {
        // 固定演示数据，没有数据库读写。
        return new ProductView(id, shopName + "-" + prefix + "-机械键盘");
    }
}
```

文件：`src/main/java/com/example/demo/ProductController.java`。

```java
package com.example.demo;

import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

// 控制器作为 Bean 注册；方法返回值默认写入响应体。
@RestController
// 本类接口的公共路径前缀。
@RequestMapping("/products")
public class ProductController {
    private final ProductService productService;

    // 唯一构造方法自动参与依赖注入，不必额外写 @Autowired。
    public ProductController(ProductService productService) {
        this.productService = productService;
    }

    // 接收 GET /products/{id}。
    @GetMapping("/{id}")
    public ProductView get(
            @PathVariable("id") Long id,
            @RequestParam(name = "prefix", defaultValue = "商品") String prefix) {
        // 调用业务对象；返回结果由 JSON 消息转换器写入 HTTP 响应。
        return productService.find(id, prefix);
    }

    // 接收 JSON，完成校验后返回预览结果，不持久化数据。
    @PostMapping("/preview")
    public ProductView preview(@Valid @RequestBody CreateProductRequest request) {
        return new ProductView(0L, request.name());
    }
}
```

可选配置：`src/main/resources/application.properties`。不创建此配置也能运行，构造参数中的默认值会生效。

```properties
# 商品名称前缀；通过 @Value 注入 ProductService。
app.shop-name=学习商店
```

### 4.4 启动、请求和预期结果

在项目根目录执行，或通过 IDE 运行 `DemoApplication.main`：

```bash
mvn spring-boot:run
```

查询商品：

```bash
curl 'http://localhost:8080/products/1001?prefix=hot'
```

预期 HTTP 200，JSON 字段顺序不作要求：

```json
{"id":1001,"name":"学习商店-hot-机械键盘"}
```

提交有效商品名：

```bash
curl -i -X POST 'http://localhost:8080/products/preview' \
  -H 'Content-Type: application/json' \
  -d '{"name":"鼠标"}'
```

预期 HTTP 200，响应主体为 `{"id":0,"name":"鼠标"}`。

提交空白商品名：

```bash
curl -i -X POST 'http://localhost:8080/products/preview' \
  -H 'Content-Type: application/json' \
  -d '{"name":"   "}'
```

预期 HTTP 400。默认错误体受版本和项目配置影响，不保证直接包含“商品名不能为空”；统一展示该消息需要另写异常处理。

这条调用链是：扫描组件 → 创建 Service 并注入配置 → 创建 Controller 并注入 Service → 匹配请求 → 读取参数、按需校验 → 调用业务 → 转换响应。

以上为供本地实践的完整 Java 示例，本笔记整理时未创建和启动演示项目。

### 4.5 常见报错排查

| 现象 | 优先检查 |
| --- | --- |
| 找不到 `ProductService` Bean | 是否漏了 `@Service`，包是否在扫描范围内 |
| 同类型 Bean 太多 | 使用 `@Qualifier` 明确筛选，或设置恰当的 `@Primary` |
| 返回 404 | 路径前缀是否正确，Controller 是否被扫描 |
| 返回 405 | HTTP 方法是否匹配 GET / POST |
| 返回 415 | 是否设置了正确的 `Content-Type`，是否有对应转换器 |
| 空白名称校验没生效 | 是否有 Validation starter、字段约束与 `@Valid` |
| 返回 400 | 参数缺失、类型转换失败、JSON 格式或校验失败 |
| 配置值未生效 | 属性名、激活环境、配置文件位置与覆盖优先级 |

## 五、🎤 面试时怎么流利地说

### 5.1 回答路线

注解是元数据 → 对应框架读取 → 注册、注入或增强 → 用接口场景举例 → 说明生效条件。

### 5.2 30 秒标准回答

“Spring 注解本质上是配置元数据，由容器或相关组件读取。比如 `@Service` 标记业务组件，扫描后注册成 Bean；构造方法注入把这个 Bean 交给 Controller；`@GetMapping` 声明请求映射，`@RequestBody` 负责读取请求体。注解能否生效取决于处理机制是否启用，例如事务通常通过代理实现，类内直接调用就不能触发被调用方法的事务拦截。”

### 5.3 高频追问与短答

**`@Service` 和 `@Component` 有什么区别？**

`@Service` 是 `@Component` 的特化，表达业务层职责，便于阅读和切面匹配。它本身不会自动增加事务能力。

**为什么只有一个构造方法可以不写 `@Autowired`？**

Spring 能直接选择该构造方法解析依赖。省略注解不代表没有依赖注入，而是框架已能确定注入入口。

**`@RestController` 返回的一定是 JSON 吗？**

不一定。它使返回值默认写入响应体，具体格式由返回类型、消息转换器和内容协商决定；字符串可以直接作为文本输出。

**为什么 `@Transactional` 可能不生效？**

先看对象是否由容器管理、事务基础设施是否配置、调用是否经过代理。默认代理模式中，`this.xxx()` 绕过代理，被调用方法上的事务语义不会新触发。

## 六、📌 快速回顾

- 管对象：`@Component`、`@Service`、`@Repository`、`@Bean`。
- 找依赖：构造方法注入；有歧义时理解 `@Qualifier` 与 `@Primary`。
- 接请求：`@RestController`、`@GetMapping`、`@PostMapping`。
- 取参数：路径 Path、查询 Param、请求主体 Body。
- 做校验：`@Valid` 触发，`@NotBlank` 等定义规则。
- 查失效：处理机制、容器管理、功能开关、依赖配置、代理调用路径。

## 七、📚 官方资料

按“容器注册 → 注入 → Web 请求 → 事务增强”的依赖顺序组织正文；以下为本次实际查阅的官方资料。

- [组件扫描与组件职责](https://docs.spring.io/spring-framework/reference/core/beans/classpath-scanning.html)
- [使用 @Autowired](https://docs.spring.io/spring-framework/reference/core/beans/annotation-config/autowired.html)
- [使用 @Value](https://docs.spring.io/spring-framework/reference/core/beans/annotation-config/value-annotations.html)
- [Boot 启动组合注解](https://docs.spring.io/spring-boot/reference/using/using-the-springbootapplication-annotation.html)
- [声明 Controller 与 RestController](https://docs.spring.io/spring-framework/reference/web/webmvc/mvc-controller/ann.html)
- [使用 @RequestParam](https://docs.spring.io/spring-framework/reference/web/webmvc/mvc-controller/ann-methods/requestparam.html)
- [使用 @RequestBody 与参数校验](https://docs.spring.io/spring-framework/reference/web/webmvc/mvc-controller/ann-methods/requestbody.html)
- [事务注解与默认事务语义](https://docs.spring.io/spring-framework/reference/data-access/transaction/declarative/annotations.html)
