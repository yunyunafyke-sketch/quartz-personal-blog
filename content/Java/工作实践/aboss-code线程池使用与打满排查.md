---
title: aboss-code线程池使用与打满排查
date: 2026-11-03 09:36:59
publish: true
---

## 一、💡 一句话理解

> [!tip] 核心结论
> 线程池打满，意思是“任务处理不过来，工作线程忙着，等待位置也不够了”。先确认是哪一个池，再查线程为什么迟迟不能完成任务。

在 aboss-code 中，**业务异步池 `taskExecutor` 与接收上游请求的 SOFA RPC 服务端执行池需要分别检查**。前者的代码配置是核心线程 5、最大线程 10、队列 100；后者的实际容量需要从运行时平台、依赖配置或实例指标确认。

本文以“上游批量查码值时收到线程池繁忙”为主线。源码检查日期为 2026-11-03，工作区声明 Spring Boot 2.1.13.RELEASE、SOFA Boot 3.4.20；实际部署版本和生效配置仍应与现场核对。

基础概念可结合 [[Java/基础/线程]] 阅读。历史现场记录见 [[Java/工作实践/压测下RPC接口大量失败排查记录]]。

## 二、🧭 理论：先认识线程池和项目里的分工

### 2.1 把接口处理想成一个办事窗口

上游来查码值，就像客户来办理业务。工作人员处理请求，忙不过来时客户先排队；排队位置也满了，就要采取限流、拒绝或其他处理方式。

| 场景角色 | 真实对象 | 需要关注什么 |
| --- | --- | --- |
| 一件待办事项 | 任务 `Runnable` | 每个任务要花多久 |
| 工作人员 | 工作线程 | 是在计算，还是等待数据库、网络、锁 |
| 等候区 | 任务队列 | 积压多少，还能放多少 |
| 窗口管理规则 | 线程池 | 线程数、队列容量、拒绝策略 |
| 转交后台办理 | 异步调用 | 谁接收任务，谁负责最终完成 |

类比只用于理解资源分工。真实线程可交替运行，排队顺序也不等于完成顺序；增加线程不代表增加 CPU 或数据库的实际处理能力。

线程池的正式职责是复用线程、管理任务执行、限制资源使用。**异步只是换一条执行路线，不会让业务本身自动变快。**

### 2.2 项目中有哪些不同的执行资源

| 执行资源 | 代码证据 | 当前能确认的内容 |
| --- | --- | --- |
| SOFA Bolt RPC 服务端执行池 | `CodeRPCFacadeImpl` 等使用 `@SofaService`，绑定 `bolt` | 接收远程调用；仓库中未找到明确容量配置，需查现场 |
| Spring 业务异步池 | `infra/config/AsyncConfig.java` | Bean 名为 `taskExecutor`，配置为 5 / 10 / 100 |
| MQ 消费执行资源 | `app/consumer/DataStandardEventConsumer.java` | 设置 `CONSUME_THREAD_NUMS=1`；不能据此推断所有 MQ 内部线程数 |
| 调度平台执行资源 | 多个 `app/scheduler/*Handler.java` | `getThreadPool()` 返回 `null`，本地没有提供自定义池，平台行为需查依赖 |

上表源码路径均相对于包根 `com/aliyun/fsi/insurance/code/`。不要把 RPC、MQ、调度器和业务异步任务的容量混为一谈。

### 2.3 普通查询不一定进入业务异步池

当前 `queryBatch` 的主要调用链是：

```text
上游服务
  → SOFA RPC 接收调用
  → CodeRPCFacadeImpl.queryBatch
  → BasicCodeBatchQryExe.execute
  → basicCodeGateway.queryCacheByType
  → 遍历码表，筛选所需 code
  → 返回结果
```

`BasicCodeBatchQryExe.execute` 使用普通 `stream().forEach` 串行处理批量参数，没有 `@Async`。沿已检查的这条查询路径，不能因为项目存在 `taskExecutor`，就认为查询一定交给它处理。

这意味着：即使 `Async-Executor-*` 很空闲，RPC 查询仍可能因处理慢而占满接请求的执行资源。

## 三、⚙️ 理论：任务如何进入线程池

本节按 JDK 文档中的“线程规模 → 队列 → 拒绝处理”，再补 Spring 异步代理的顺序理解。

### 3.1 核心线程、最大线程和队列的关系

以项目 `taskExecutor` 的 5 / 10 / 100 为例，在任务持续占用线程的情况下：

```text
提交新任务
  → 当前工作线程少于 5：创建核心线程执行
  → 已有至少 5 个线程：优先尝试入队
  → 队列无法接收：尝试扩线程，最多到 10
  → 已无法扩线程：进入拒绝策略
```

关键是：**先排队，队列放不下才向最大线程数扩容。** 不是“先开到 10 个，再开始排队”。

这里比较的是线程池的工作线程数量，而不是简单用活跃线程数与核心线程数比较。有空闲工作线程时，它们可以领取队列中的任务。

> [!warning] “10 + 100”不是整个服务最多同时处理 110 个请求
> 10 个工作线程加 100 个排队位置，只描述这个异步池；还没包括 RPC、HTTP、MQ 等线程。使用调用者执行策略后，池外的提交线程也可能执行任务。

### 3.2 拒绝策略决定“满了以后怎么办”

常见策略中，`AbortPolicy` 抛拒绝异常；本项目配置的是 `CallerRunsPolicy`，意思是“提交者自己做”。

```text
RPC 线程提交耗时异步任务
  → 异步池及队列已满
  → 任务由这个 RPC 线程直接执行
  → RPC 线程迟迟不能返回
  → 后续 RPC 请求可能继续积压
```

这是代码机制允许出现的影响路径，**不是本次事故的已确认根因**。需要看到真实调用链和现场线程堆栈，才能证明是否发生。

按照 JDK 对 `CallerRunsPolicy` 的规定，池关闭后收到的被拒绝任务会被丢弃。因此它不能解释成“任何情况下都保证任务完成”。

### 3.3 Spring 怎样使用这个池

项目的配置入口：

```text
aboss-code-infrastructure/src/main/java/
com/aliyun/fsi/insurance/code/infra/config/AsyncConfig.java
```

下面是已有配置的关键节选，并非需要额外新增的配置文件：

```java
// @EnableAsync：开启 Spring 对异步注解的处理。
// @Bean("taskExecutor")：给线程池注册名称，供 @Async 指定。
ThreadPoolTaskExecutor executor = new ThreadPoolTaskExecutor();
// 核心线程数；默认随任务到来逐步创建。
executor.setCorePoolSize(5);
// 队列无法接收任务时，线程池才尝试向这个上限扩展。
executor.setMaxPoolSize(10);
// 超过核心线程承接能力时，任务优先进入这个等待队列。
executor.setQueueCapacity(100);
// 在线程快照和日志中识别这个业务池。
executor.setThreadNamePrefix("Async-Executor-");
// 饱和时由提交线程直接执行，可能拉长提交方的耗时。
executor.setRejectedExecutionHandler(
    new java.util.concurrent.ThreadPoolExecutor.CallerRunsPolicy());
```

当另一个 Spring Bean 通过代理调用 `@Async("taskExecutor")` 方法时，Spring 将任务交给指定执行器。默认代理模式下，同一个对象内部直接调用自己的方法，通常不会触发异步代理。

项目中的码值导出、地区导入导出、缓存同步等方法共享这个池。长任务与短任务会争用同一组执行资源。

项目还使用 `ContextCopyingDecorator` 复制自定义线程上下文，任务结束后清理；这不等于自动复制所有事务、日志或 RPC 上下文。

### 3.4 配置文件里为什么还有另一组数字

`bootstrap/src/main/resources/application.properties` 有下面几项：

```properties
# 文件中的配置值；不代表 taskExecutor 实际读取了它们。
thread.pool.corePoolSize=10
thread.pool.maxPoolSize=200
thread.pool.keepAliveTime=60
thread.pool.queueCapacity=1000
thread.pool.threadNamePrefix=thread-pool-code-
```

当前 `AsyncConfig` 直接使用常量，没有绑定这些属性；仓库内也未发现其他读取位置。**只修改这组属性，不会改变当前代码创建的 `taskExecutor`。**

是否有外部依赖读取它们尚未确认；不能据此推断 RPC 池最大线程数就是 200。运行现场还应核对部署版本和平台覆盖配置。

## 四、🚀 实践：从准备到验证

### 4.1 前置准备

本地实验只需要 JDK 8 或以上版本，不需要 Spring、数据库、账号或额外依赖。它用于观察底层线程池机制，不启动业务项目，也不复现真实 RPC 协议。

现场排查另外需要：完整报错、接口和方法、故障时间及其时区、目标 IP/实例、traceId，以及查看对应实例日志和监控的权限。采线程快照时，在同一主机或容器使用与目标 JVM 匹配的 JDK 工具和具备权限的账号。

### 4.2 可以拿来干什么

这套方法有两个直接用途：本地验证“满了以后由谁执行”，现场区分“哪个池出问题”和“线程为什么被占住”。

| 观察到的内容 | 能说明什么 | 还不能说明什么 |
| --- | --- | --- |
| 实验最后一个任务由 `main` 执行 | 调用者执行策略已触发 | 生产 RPC 池也采用相同策略 |
| 异步池活跃数接近 10，队列接近 100 | 业务异步池接近饱和 | 具体哪个业务导致积压 |
| RPC 返回 `Server thread pool busy` | 报错指向服务端执行资源繁忙 | 一定是本地 `taskExecutor` 满了 |

### 4.3 完整实践：复现调用者执行

把以下代码保存为本地实验目录中的 `PoolSaturationDemo.java`。为了快速观察，将配置缩小为核心 1、最大 2、队列 1；机制与项目有界队列相同。

```java
import java.util.concurrent.ArrayBlockingQueue;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ThreadPoolExecutor;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicInteger;

public class PoolSaturationDemo {
    public static void main(String[] args) throws InterruptedException {
        // 让池内任务暂时无法结束，稳定构造“线程忙、队列满”。
        CountDownLatch release = new CountDownLatch(1);
        AtomicInteger sequence = new AtomicInteger();
        ThreadPoolExecutor pool = new ThreadPoolExecutor(
            1, 2, 60, TimeUnit.SECONDS,
            // 有界队列：这里只允许一个任务排队。
            new ArrayBlockingQueue<Runnable>(1),
            // 给工作线程起名，便于和提交任务的 main 线程区分。
            task -> new Thread(task, "demo-worker-" + sequence.incrementAndGet()),
            // execute 无法提交时，直接在调用线程执行。
            new ThreadPoolExecutor.CallerRunsPolicy());

        Runnable blockingTask = () -> {
            System.out.println("池内任务开始：" + Thread.currentThread().getName());
            try {
                // await：等待 main 释放，期间任务占用工作线程。
                release.await();
            } catch (InterruptedException e) {
                // 保留中断状态，让上层仍能知道线程被要求中断。
                Thread.currentThread().interrupt();
            }
        };

        try {
            pool.execute(blockingTask); // 第一个任务创建核心线程。
            pool.execute(blockingTask); // 第二个任务进入唯一的队列位置。
            pool.execute(blockingTask); // 队列满，第三个任务创建第二个线程。
            System.out.printf("提交第四个任务前：pool=%d, queue=%d%n",
                pool.getPoolSize(), pool.getQueue().size());

            // 第四个任务不等待 release，避免 main 自己阻塞而无法释放任务。
            pool.execute(() -> System.out.println(
                "第四个任务执行线程：" + Thread.currentThread().getName()));
            System.out.println("第四个任务结束后，execute 才返回");
        } finally {
            // countDown：放行阻塞的任务，让排队任务也能完成。
            release.countDown();
            // shutdown：停止接收新任务，但继续执行已提交任务。
            pool.shutdown();
            // awaitTermination：等待工作线程退出；超时则发出中断请求。
            if (!pool.awaitTermination(5, TimeUnit.SECONDS)) {
                pool.shutdownNow();
            }
        }
        System.out.println("池内完成任务数：" + pool.getCompletedTaskCount());
    }
}
```

进入保存代码的目录，编译并启动：

```bash
# -encoding UTF-8：确保中文注释和输出字符串正确编译。
javac -encoding UTF-8 PoolSaturationDemo.java
# 本地验证输入就是 main 中连续提交的四个任务，无需 HTTP 请求。
java PoolSaturationDemo
```

关键预期结果如下，工作线程输出的先后顺序可能变化：

```text
提交第四个任务前：pool=2, queue=1
第四个任务执行线程：main
第四个任务结束后，execute 才返回
池内完成任务数：3
```

第四个任务由池外的 `main` 完成，不计入线程池自身的完成任务数。因此监控仅统计池内完成量时，可能漏看调用线程承担的工作。

若提示找不到 `javac`，检查是否安装完整 JDK；若提示找不到主类，确认位于 `.class` 所在目录。若自己改代码后一直不退出，检查是否让第四个任务也等待 `release`，导致负责放行的 `main` 被卡住。

### 4.4 现场第一步：用异常定位服务和实例

先保留完整异常，包括 `Caused by`。需要回答：谁调用谁、哪个方法、哪台机器、什么时间，以及是否重试。

已有历史笔记记载了 2026-10-28 的现场：

```text
InvokeServerBusyException: Server thread pool busy!
调用方：midaboss-document
被调用方：midaboss-code
方法：CodeRPCFacade.queryBatch
协议：bolt
目标：10.197.136.170:13305
```

这份历史记录支持“当时目标 code 实例的 RPC 服务端线程池繁忙”，不证明当前这次也相同，也没有证实业务异步池饱和。历史线程变慢的最终根因仍未确认。

排查时进入报错目标实例，而不是只看调用方机器。请求在进入业务方法前被拒绝时，业务日志没有该请求并不奇怪。

### 4.5 现场第二步：连续采线程快照

在目标 JVM 所在环境中操作，下面的 PID 必须替换成真实进程号：

```bash
# 查看本机 Java 进程；容器内外的 PID 可能不同。
jcmd -l
# 替换示例 12345；Thread.print -l 输出线程及锁信息。
jcmd 12345 Thread.print -l > /tmp/aboss-code-threads-1.txt
# 等待十秒，比较相同线程是否停在相同调用位置。
sleep 10
jcmd 12345 Thread.print -l > /tmp/aboss-code-threads-2.txt
sleep 10
jcmd 12345 Thread.print -l > /tmp/aboss-code-threads-3.txt
```

`jcmd` 是诊断操作，采集可能带来短暂开销；避免高频持续采集。若无法连接，核实账号权限、PID、容器位置和 JDK 工具兼容性。

| 线程快照表现 | 下一步验证 |
| --- | --- |
| `Async-Executor-*` 多次停在同一业务位置 | 查导入导出、缓存同步是否持续耗时 |
| RPC 工作线程停在码值查询调用链 | 查批量条数、重复 type、缓存读取及码表遍历成本 |
| 多个线程等待数据库连接 | 对照连接池活跃数、等待数、获取连接耗时 |
| 多个线程停在 JDBC 或网络读取 | 对照慢 SQL、数据库和下游响应时间 |
| 多个线程等待同一把锁 | 找持锁线程，确认它为什么迟迟不释放 |
| 大量线程等待任务队列取任务 | 可能只是空闲，需要看堆栈，不能仅凭 WAITING 判断 |

RPC 线程的具体名字以现场快照和依赖版本为准，不在笔记中猜测固定前缀。`RUNNABLE` 也不保证线程一直占 CPU，网络 I/O 等待同样可能表现为这个状态。

### 4.6 现场第三步：把线程与监控对起来

对 `taskExecutor`，至少观察以下信息。它们可从已有监控、获准使用的诊断工具，或本地调试时对实际 Bean 的底层执行器读取；当前代码检查并未确认项目已暴露对应监控接口。

| 指标 | 作用 |
| --- | --- |
| `poolSize` | 当前创建的工作线程数 |
| `activeCount` | 近似的执行任务线程数 |
| `queue.size()` / `remainingCapacity()` | 排队数量与剩余位置 |
| `completedTaskCount` 的增量 | 任务完成速度，非精确业务成功量 |
| 任务耗时、拒绝/调用者执行次数 | 看积压是否扩大、是否拖住提交方 |

**活跃数接近 10、队列接近 100，并持续不下降**，才是这个异步池饱和的有力线索。快照指标存在并发变化，单个瞬间不能说明持续状态；RPC 池必须用它自己的指标和容量判断。

同一时间窗口还要对齐请求量、接口耗时、错误率、CPU、GC、数据库和缓存耗时。应用平均指标可能掩盖某台实例异常，应按报错实例查看。

### 4.7 如何决定修哪里

| 证据 | 优先处理方向 |
| --- | --- |
| 请求批量很大，反复查询相同 type | 核实批次上限、同批次复用结果及查找成本 |
| 数据库、缓存或下游等待明显升高 | 先解决慢调用、连接等待与超时边界 |
| 导入导出挤占其他异步任务 | 评估按任务性质拆池和限制提交速率 |
| 任务耗时正常，稳定流量超过容量 | 在 CPU、内存、连接池及下游承载范围内评估扩容 |
| 失败后重试明显放大流量 | 核实重试次数、退避及调用方并发限制 |

大队列会容纳更多等待任务，也可能拉长等待时间、增加内存压力；更多线程可能把压力推到数据库。调整容量前，先证明“处理能力不足”发生在哪里。

## 五、🎤 面试时怎么流利地说

### 5.1 回答路线

线程池职责 → 核心线程与队列 → 最大线程与拒绝策略 → 项目里的选择 → 饱和排查与边界。

### 5.2 30 秒标准回答

“线程池用来复用线程并管理任务执行。提交任务时，先按核心线程数创建工作线程，达到核心数量后优先排队，队列放不下再扩到最大线程数，仍接不住就进入拒绝策略。我们项目的异步池是 5、10、100，用调用者执行策略，所以满了可能拖慢提交任务的请求线程。遇到繁忙报错，我会先确认是 RPC 池还是业务池，再看积压、完成速度和线程堆栈，而不是直接加线程。”

### 5.3 进一步展开项目例子

“码值查询的 RPC 入口与异步导入导出是不同的执行路径，queryBatch 本身按入参串行查询、筛选码值。上游报服务端繁忙时，要先定位目标实例，结合多次线程快照和监控判断，是慢 SQL、缓存、锁、GC 还是批量处理导致请求变慢。只有确认资源余量和下游承载后，才评估线程池扩容。”

### 5.4 高频追问

**为什么最大线程配置了 10，却只看到 5 个线程？**

有界队列优先接收任务，没满时一般不会继续扩到最大值。先看队列和任务状态，不要直接认为最大线程配置失效。

**CallerRunsPolicy 能保证永远异步吗？**

不能。饱和时任务在提交线程里运行；池关闭时被拒绝的任务还可能被丢弃。它也不提供持久化或故障恢复保障。

**线程池满是不是 CPU 一定满？**

不是。线程可能长时间等待数据库、网络或锁，此时 CPU 不高也会耗尽执行能力。

## 六、📌 总结

- 记住顺序：**核心线程 → 排队 → 扩线程 → 拒绝策略**。
- 项目 `taskExecutor` 的代码配置为 **5 / 10 / 100**，共享多个后台任务。
- `CallerRunsPolicy` 会把压力传回提交线程；“不抛拒绝异常”不代表没有影响。
- RPC 繁忙先定位实例和执行池，再查线程为什么慢；历史现场不能代替本次证据。
- 排查口诀：**先认池，再看队，抓堆栈，对时间，找慢点。**

## 七、📚 官方资料与代码依据

查阅日期：2026-11-03。底层实验使用 Java 8 API；Spring 注解行为参考 5.1.x 文档，与项目声明的旧版 Spring Boot 更接近。实际依赖版本仍以项目解析结果和部署包为准。

- [JDK 8 ThreadPoolExecutor](https://docs.oracle.com/javase/8/docs/api/java/util/concurrent/ThreadPoolExecutor.html)：线程规模、队列、拒绝策略与指标定义。
- [JDK 8 CallerRunsPolicy](https://docs.oracle.com/javase/8/docs/api/java/util/concurrent/ThreadPoolExecutor.CallerRunsPolicy.html)：调用者执行以及关闭后的丢弃行为。
- [Spring Framework 5.1.14 异步执行](https://docs.spring.io/spring-framework/docs/5.1.14.RELEASE/spring-framework-reference/integration.html#scheduling-annotation-support-async)：异步注解、执行器选择和代理限制。
- [Spring Task Execution and Scheduling](https://docs.spring.io/spring-framework/reference/integration/scheduling.html)：作为当前官方说明补充阅读，不据此假定项目支持新版特性。

项目代码根目录：`/Volumes/data/ideaWorkSpace/aboss-code`。为方便笔记长期使用，以下路径均为仓库相对路径：

| 文件 | 核对内容 |
| --- | --- |
| `aboss-code-infrastructure/src/main/java/com/aliyun/fsi/insurance/code/infra/config/AsyncConfig.java` | 实际异步池配置 |
| `aboss-code-infrastructure/src/main/java/com/aliyun/fsi/insurance/code/infra/config/ContextCopyingDecorator.java` | 自定义上下文复制与清理 |
| `bootstrap/src/main/resources/application.properties` | 尚未发现本地读取位置的 thread.pool 属性 |
| `aboss-code-app/src/main/java/com/aliyun/fsi/insurance/code/app/impl/code/CodeRPCFacadeImpl.java` | Bolt RPC 入口 |
| `aboss-code-app/src/main/java/com/aliyun/fsi/insurance/code/app/executor/code/query/BasicCodeBatchQryExe.java` | 批量查询串行处理逻辑 |
| `aboss-code-app/src/main/java/com/aliyun/fsi/insurance/code/app/consumer/DataStandardEventConsumer.java` | MQ 消费并发设置 |

本文未访问生产实例、未执行数据库操作、未修改业务代码。事故根因需要用当前报错和现场数据继续确认。
