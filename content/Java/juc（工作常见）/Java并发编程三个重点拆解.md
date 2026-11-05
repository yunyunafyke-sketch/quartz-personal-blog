---
title: Java并发编程三个重点拆解
date: 2026-11-05 10:52:20
publish: true
---

## 一、💡 一句话理解

Java 并发编程可以先抓住三个问题：线程池负责安排任务，锁负责保护共享数据，volatile 负责在线程间传递状态。

本文按照“共享数据的问题 → 锁与内存可见性 → 任务调度”的前置关系组织理论，覆盖截图强调的三个重点。依据 Java SE 21 官方规范与 API 文档。

## 二、🧭 理论：为什么需要并发控制

### 2.1 用批量处理订单串起概念

后台同时处理很多订单，需要控制处理数量、累计完成数量，并支持管理员发出停止信号。

| 业务问题 | 技术对象 | 主要职责 |
|---|---|---|
| 同时处理多少订单 | 线程池 | 调度任务、复用线程、限制资源 |
| 多个任务同时累计完成数量 | synchronized / ReentrantLock | 保护共享数据的复合操作 |
| 管理线程通知任务停止 | volatile 状态标记 | 建立状态写入与后续读取的可见性保证 |

可以把线程池类比为班组、线程类比为工作人员、任务队列类比为待办订单。这个类比只解释调度，不代表线程池会自动保护订单数据。

### 2.2 原子性、可见性、有序性

| 概念 | 大白话 | 典型问题 |
|---|---|---|
| 原子性 | 一组操作要作为不可分割的整体执行 | 两个线程同时 count++ 导致丢失更新 |
| 可见性 | 一个线程的更新能按同步规则被另一个线程观察到 | 停止标记已经修改，工作线程仍未感知 |
| 有序性 | 操作之间满足规定的先后约束 | 发布完成信号时，要让此前准备的数据可见 |

`count++` 包含“读取 → 加一 → 写回”。两个线程都读到 0，再各自写回 1，最终只增加了一次。

根源是：多个线程并发访问同一份可变数据，且缺乏合适的同步。

## 三、⚙️ 理论：三个重点怎么工作

### 3.1 synchronized：用同一把锁保护共享数据

`synchronized` 使用对象关联的监视器锁，同一时刻只有一个线程持有该锁。离开同步区域时，无论正常返回还是抛出异常，都会自动释放。

- 实例同步方法锁的是当前对象 this。
- 静态同步方法锁的是声明该方法的类所对应的 Class 对象。
- 同步代码块锁的是括号中指定的对象。
- 所有竞争同一份数据的相关访问，需要遵守一致的同步规则。

同一个线程可以重复获取已持有的同一把锁，称为“可重入”。

释放某个监视器锁 happens-before 后续对同一监视器的获取，因此锁同时提供互斥和内存可见性保证。

### 3.2 ReentrantLock：提供更多获取锁的控制能力

| 对比项 | synchronized | ReentrantLock |
|---|---|---|
| 使用形式 | 语言关键字 | 显式锁对象 |
| 释放方式 | 自动释放 | 显式 unlock，通常放 finally |
| 可重入 | 支持 | 支持 |
| 获取锁时响应中断 | 不支持中断监视器锁获取等待 | lockInterruptibly 支持 |
| 尝试获取或超时获取 | 无对应接口 | tryLock 等接口支持 |
| 公平配置 | 不提供 | 可配置公平锁 |
| 等待通知 | wait / notify / notifyAll | 可建立多个 Condition |

简单互斥可使用 synchronized；确实需要超时、中断获取或多个条件队列时，可考虑 ReentrantLock。不要直接断言某一种永远更快。

公平锁倾向于让等待较久的线程先获取锁，但不保证线程调度公平；无参 tryLock 也不遵守公平设置。

**使用边界：**这两种锁协调的是同一个 JVM 内的线程。多个服务实例共同扣数据库库存，还需要数据库等层面的并发控制。

### 3.3 volatile：发布状态，而不是替代所有锁

典型用途是停止标记、配置开关，以及满足正确发布条件的状态发布。

volatile 写入 happens-before 对同一个 volatile 变量的后续读取。结合程序顺序与传递性，可以让写入标记之前的相关操作对读取方可见。

happens-before 表示规范建立的可见性与顺序保证，不是简单比较操作的物理发生时间，也不意味着禁止所有指令重排。

**常见误区：**给 count 加 volatile，仍不能让 count++ 成为原子操作。它不会把“读、加、写”合为一个不可分割的整体。

另外：

- volatile 引用不等于它指向对象的所有后续修改都自动线程安全。
- volatile 停止标记不能自动唤醒阻塞在队列、网络或休眠中的线程。
- 锁不只解决原子性，也提供可见性保证；volatile 则不提供互斥。

记忆：**状态通知考虑 volatile，复合更新考虑锁或合适的原子操作。**

### 3.4 线程池：七个参数按职责记

| 分组 | 参数 | 作用 |
|---|---|---|
| 人数 | corePoolSize | 核心线程数 |
| 人数 | maximumPoolSize | 最大线程数 |
| 回收 | keepAliveTime | 默认情况下，超出核心数量的线程的空闲回收时间 |
| 回收 | unit | 时间单位 |
| 排队 | workQueue | 保存等待执行的任务 |
| 创建 | threadFactory | 创建线程，可设置线程名等 |
| 兜底 | handler | 拒绝任务时如何处理 |

默认按需创建线程，并不是构造线程池后就把核心线程全部建好。允许核心线程超时后，回收规则也能应用到核心线程。

正常运行、无关闭竞态时，可以按下面顺序理解任务提交：

```text
线程数小于核心数 → 创建线程执行
否则 → 尝试放入队列
入队失败 → 尝试扩容到最大线程数
不能再扩容 → 拒绝策略
```

关键点：**先尝试排队，再尝试向最大线程数扩容。** 无界队列通常会让任务持续排队，maximumPoolSize 难以发挥作用，也可能积压大量任务。

例子：核心数 2、最大数 4、队列容量 3。假设任务一直阻塞、没有任务完成：第 1～2 个占用核心线程，第 3～5 个排队，第 6～7 个触发扩容，第 8 个触发拒绝。线程完成、关闭或并发提交时，不能机械套用这个编号推演。

### 3.5 四种拒绝策略

| 策略 | 行为 | 业务注意点 |
|---|---|---|
| AbortPolicy | 抛 RejectedExecutionException，默认策略 | 调用方要处理失败 |
| CallerRunsPolicy | 未关闭时由提交任务的线程执行 | 会阻塞提交方；关闭后丢弃 |
| DiscardPolicy | 丢弃新任务 | 不适合依赖任务必达的业务 |
| DiscardOldestPolicy | 未关闭时丢弃队首任务，再重试提交 | 队首任务不一定是业务上最不重要的任务 |

线程池关闭后提交任务也可能触发拒绝，拒绝不只发生在“满了”的时候。

### 3.6 左侧小图中的补充知识

| 知识点 | 解决的问题 | 边界 |
|---|---|---|
| CAS | 按预期值比较并原子更新 | 不自动保证任意多步骤业务整体原子性 |
| CountDownLatch | 等待一组事件或任务完成 | 计数归零后不能重置复用 |
| Semaphore | 限制同时进入一段逻辑的数量 | 获取成功后，需要正确归还许可 |
| ConcurrentHashMap | 并发访问 Map | 单个操作安全不代表任意组合操作都安全 |

这些内容可以在三个重点之后继续学习，不必一开始同时背所有工具。

## 四、🚀 实践：从准备到验证

### 4.1 前置准备

安装 JDK，确保 javac 与 java 可用；本文示例可使用 JDK 21，无需第三方依赖。在 IDE 中新建普通 Java 类即可，也可以按下文命令运行。

### 4.2 可以拿来干什么

这个最小程序演示后台订单任务的调度与完成数量统计：线程池安排 10 个任务，所有任务使用同一把锁累计数量，主线程等待结束。等待超时后，通过 volatile 标记发出停止信号。

代码中的订单处理仅用计数模拟，不包含数据库、支付或真实库存扣减。停止标记只检查一次，不能保证取消已经开始的任务。

### 4.3 完整实践：代码、启动和验证

新建 ConcurrentDemo.java，写入：

```java
import java.util.concurrent.*;
import java.util.concurrent.locks.ReentrantLock;

public class ConcurrentDemo {
    // 管理线程写入、工作线程读取，用于协作式停止通知。
    private static volatile boolean stopped = false;
    // 所有任务共享同一个锁对象，才能保护同一个计数。
    private static final ReentrantLock lock = new ReentrantLock();
    private static int completed = 0;

    public static void main(String[] args) throws InterruptedException {
        ThreadPoolExecutor pool = new ThreadPoolExecutor(
                2, 4, 30, TimeUnit.SECONDS,
                new ArrayBlockingQueue<>(10),
                Executors.defaultThreadFactory(),
                new ThreadPoolExecutor.AbortPolicy()
        );
        try {
            for (int i = 0; i < 10; i++) {
                pool.execute(() -> {
                    // 已开始处理的任务不会因标记改变自动回滚。
                    if (stopped) {
                        return;
                    }
                    lock.lock();
                    try {
                        // 模拟完成一笔订单，防止并发递增丢失更新。
                        completed++;
                    } finally {
                        // 业务异常时也必须归还锁。
                        lock.unlock();
                    }
                });
            }
        } finally {
            // 停止接收新任务，已接收任务继续执行。
            pool.shutdown();
        }
        if (pool.awaitTermination(10, TimeUnit.SECONDS)) {
            // 使用同一把锁读取共享数据，明确保持一致的访问规则。
            lock.lock();
            try {
                System.out.println("完成数量：" + completed);
            } finally {
                lock.unlock();
            }
        } else {
            stopped = true;
            System.out.println("等待超时，已发出停止信号");
        }
    }
}
```

在该文件所在目录运行：

```bash
javac ConcurrentDemo.java
java ConcurrentDemo
```

正常预期：`完成数量：10`。代码为学习示例，尚未在本次笔记保存过程中实际编译运行。

任务非常短，通常不会进入超时分支，因此本例不构成停止行为的并发测试。若要改成真实长任务，需要根据阻塞点设计中断、超时及资源清理。

常见排查：

- javac 不存在：检查是否安装了 JDK，以及命令路径配置。
- RejectedExecutionException：检查是否关闭后提交任务，或线程和队列是否饱和。
- 程序不退出：检查是否调用 shutdown，以及任务是否一直阻塞。
- 数量不正确：检查所有写操作是否真的使用同一把锁。

## 五、🎤 面试时怎么流利地说

### 5.1 回答路线

先说遇到什么并发问题，再说工具职责、核心机制和使用边界。

线程池按“七个参数 → 提交顺序 → 队列影响 → 拒绝策略”展开；锁按“互斥与可见性 → 两者共同点 → 扩展能力 → 释放方式”展开；volatile 按“状态可见性 → happens-before → 不保证复合操作原子性”展开。

### 5.2 30 秒标准回答

> 我会从任务调度和共享数据安全两方面理解并发。线程池负责复用线程、任务排队和过载处理，提交任务时先看核心线程数，再尝试入队，入队失败再扩容。共享数据的复合更新可以用 synchronized 或 ReentrantLock，后者提供超时和可中断获取等能力。volatile 适合状态通知，提供可见性和相关顺序保证，但不能让 count++ 变成原子操作。

### 5.3 一到两分钟展开回答

> 比如批量处理订单，我会用线程池控制并发任务数量，避免无限制创建线程。配置时关注核心线程数、最大线程数、队列容量和拒绝策略之间的关系，不能只设置最大线程数而忽略无界队列造成的积压。
>
> 如果多个任务更新共享计数，就需要原子更新。我可以用 synchronized，也可以用 ReentrantLock；两者都可重入，也都提供同步可见性，区别主要在显式锁提供更多获取和等待控制，但必须正确释放。
>
> 如果管理线程只需要发布一个停止状态，可以使用 volatile。不过它不能保证检查状态与后续处理作为一个整体，也不能自动取消已经开始或阻塞中的任务。真实业务还要考虑超时、中断及资源清理；多个服务实例共享库存时，也不能仅靠 JVM 内的锁解决。

### 5.4 高频追问与短答

**线程池为什么还没达到最大线程数，任务就在排队？**

达到核心线程数后，通常先尝试入队，入队失败才扩容。因此使用无界队列时，最大线程数通常不起预期作用。

**volatile 能让 count++ 安全吗？**

不能。count++ 是读、计算、写的复合操作，需要锁或适合的原子类。

**ReentrantLock 一定比 synchronized 快吗？**

不能这样概括。应根据控制能力选型，再在真实负载下测量性能。

## 六、📌 总结

- 先理解原子性、可见性和有序性，再选择工具。
- 线程池负责调度，不自动保护任务访问的共享数据。
- 锁保护共享数据时，相关线程必须遵守同一套锁规则。
- volatile 适合状态通知，不能替代复合操作的同步。
- 学习顺序：基础问题 → synchronized → volatile → ReentrantLock → 线程池 → 其他并发工具。

## 七、📚 官方资料

- [Java 语言规范：线程、锁与内存模型](https://docs.oracle.com/javase/specs/jls/se21/html/jls-17.html)
- [ThreadPoolExecutor：参数、排队与拒绝策略](https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/util/concurrent/ThreadPoolExecutor.html)
- [ReentrantLock：可重入、公平性与使用方式](https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/util/concurrent/locks/ReentrantLock.html)
