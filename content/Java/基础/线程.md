---
publish: true
date: 2026-08-23
---

## 一、💡 一句话理解

> [!tip] 核心结论
> **线程**是程序中实际执行代码的单位；**线程池**负责复用和管理线程；**Future**是提交任务后拿到的“结果凭证”。

学习顺序：先认识线程，再用线程池管理任务，最后用 `Future` 获取异步任务的结果。

## 二、🧭 理论：线程是什么

### 2.1 进程、线程和任务

| 名称 | 白话解释 | 例子 |
| --- | --- | --- |
| 进程（Process） | 一个正在运行的程序 | 启动后的 Java 程序。 |
| 线程（Thread） | 进程里真正执行代码的一条路线 | `main` 方法所在的主线程。 |
| 任务（Task） | 希望被执行的一段工作 | 读取文件、计算统计结果。 |

一个 Java 程序至少有一个主线程。多个线程可以执行不同任务，并共享同一进程中的对象和数据。

```text
一个 Java 进程
├─ 主线程：执行 main 方法
├─ 工作线程 A：读取文件
└─ 工作线程 B：计算数据
```

### 2.2 并发和并行

- **并发（concurrency）**：多件事在一段时间内交替推进。
- **并行（parallelism）**：多件事在不同 CPU 核心上真正同时执行。

实际开发中，重点是把彼此独立、耗时较长的任务交给不同线程，让主线程能继续做其他事情。

#### 2.2.1 高并发和并行是什么关系

平时说的**高并发**，指的是同一时间段有很多请求或任务需要系统处理，或者有很多请求仍未完成；它不要求这些任务都真正同时占用 CPU。

| 概念 | 关心的问题 | 是否必须有多个 CPU 核心 |
| --- | --- | --- |
| 高并发 | 同时有多少事情需要处理、正在等待完成 | 否 |
| 并发 | 多件事能否交替推进 | 否 |
| 并行 | 此刻有多少件事真的同时在计算 | 是 |

例如，一个网站同时有 1,000 个请求正在等待数据库返回，这就是高并发。即使服务器只有一个 CPU 核心，操作系统也能让多个线程轮流运行；某个线程等待网络或数据库时，CPU 可以切换去处理其他线程。

如果服务器有 4 个 CPU 核心，4 个计算量很大的任务可以分别在 4 个核心上同时运行，这一部分工作就是并行。多核带来的并行能力通常有助于处理 CPU 密集型任务，但它不是“高并发”的定义。

> [!tip] 一句话区分
> **高并发关心“同时有多少事要处理”，并行关心“此刻有多少事真的一起在 CPU 上算”。**

### 2.3 线程的常见状态

| 状态 | 意思 |
| --- | --- |
| `NEW` | 已创建线程对象，但还没调用 `start()`。 |
| `RUNNABLE` | 可以运行；可能正在使用 CPU，也可能等待 CPU 调度。 |
| `BLOCKED` | 正在等待进入被其他线程占用的 `synchronized` 锁。 |
| `WAITING` | 无限期等待其他线程通知，例如 `Object.wait()`。 |
| `TIMED_WAITING` | 有时间限制地等待，例如 `Thread.sleep(1000)`。 |
| `TERMINATED` | `run()` 方法已执行结束。 |

> [!info] 注意
> `RUNNABLE` 不等于“此刻一定占用 CPU”。操作系统会在可运行的线程之间调度。

## 三、⚙️ 理论：如何创建和控制线程

### 3.1 用 `start()` 启动线程

`run()` 只是普通方法调用，仍在当前线程执行；只有 `start()` 才会启动新线程，再由新线程调用 `run()`。

```java
public class ThreadStartDemo {
    public static void main(String[] args) {
        Thread worker = new Thread(() -> {
            System.out.println("工作线程：" + Thread.currentThread().getName());
        }, "file-worker");

        // 启动新线程。
        worker.start();

        // 这一行仍由 main 线程执行。
        System.out.println("主线程：" + Thread.currentThread().getName());
    }
}
```

两个输出的先后顺序不固定，因为两个线程由操作系统调度。

### 3.2 `sleep`、`join` 与中断

| 方法 | 作用 | 是否释放已持有的 `synchronized` 锁 |
| --- | --- | --- |
| `Thread.sleep(...)` | 让当前线程暂停一段时间 | 否 |
| `thread.join()` | 让当前线程等待目标线程结束 | 否 |
| `thread.interrupt()` | 向目标线程发出中断请求 | 不适用 |

中断不是强制终止线程，而是协作信号。处于 `sleep`、`join`、`wait` 等等待中的线程会抛出 `InterruptedException`。如果当前方法不能继续向上抛出异常，通常要恢复中断标记：

```java
try {
    Thread.sleep(1_000);
} catch (InterruptedException exception) {
    // 不吞掉中断信号，交给上层或后续逻辑判断。
    Thread.currentThread().interrupt();
    return;
}
```

## 四、🧭 理论：为什么需要线程池

### 4.1 线程池解决什么问题

频繁使用 `new Thread(...).start()` 有成本。任务突然增多时，线程数量会膨胀，占用内存并增加上下文切换。

线程池将“任务”和“线程”分开：

```text
任务 1、2、3、4、5
        ↓ 提交
线程池：工作线程 + 等待队列
        ↓ 调度
有限数量的线程依次执行任务
```

它的作用是复用线程、限制同时执行的任务数、暂存等待任务，并在结束时统一回收资源。

### 4.2 `ExecutorService`、`execute` 与 `submit`

| 对象或方法 | 用途 | 返回值 |
| --- | --- | --- |
| `ExecutorService` | 管理线程和任务 | 无固定结果 |
| `execute(Runnable)` | 提交不关心返回值的任务 | `void` |
| `submit(Runnable)` | 提交无返回值任务，但可拿到状态 | `Future<?>` |
| `submit(Callable<T>)` | 提交有返回值的任务 | `Future<T>` |

`Runnable` 没有返回值；`Callable<T>` 可以返回 `T`，也可以抛出异常。

### 4.3 关闭线程池

- `shutdown()`：不再接收新任务，已提交任务继续完成。
- `shutdownNow()`：尝试中断正在执行的任务，并返回尚未开始的任务；它不能保证任务一定立即停止。

### 4.4 `ThreadPoolExecutor` 的七个参数

`Executors.newFixedThreadPool(2)` 写起来简单，但它把许多配置隐藏了。需要明确控制线程数、队列和拒绝方式时，直接创建 `ThreadPoolExecutor`：

```java
new ThreadPoolExecutor(
        2,                              // corePoolSize：核心线程数
        4,                              // maximumPoolSize：最大线程数
        30,                             // keepAliveTime：非核心线程的空闲存活时间
        TimeUnit.SECONDS,               // 时间单位
        new ArrayBlockingQueue<>(10),   // workQueue：最多等待 10 个任务
        threadFactory,                  // ThreadFactory：创建线程的规则
        new ThreadPoolExecutor.AbortPolicy() // 拒绝策略
);
```

| 参数 | 白话解释 | 例子中的含义 |
| --- | --- | --- |
| `corePoolSize` | 常驻员工数 | 通常保留 2 个工作线程。 |
| `maximumPoolSize` | 最多允许多少员工 | 繁忙时最多扩到 4 个线程。 |
| `keepAliveTime` | 临时员工空闲多久后离开 | 超过核心数的空闲线程 30 秒后可回收。 |
| `unit` | 上一项的时间单位 | 秒。 |
| `workQueue` | 员工忙时，任务在哪里等候 | 最多排队 10 个任务。 |
| `threadFactory` | 如何创建线程 | 统一命名，便于日志排查。 |
| `handler` | 线程和队列都满时怎么办 | 抛出异常，明确告诉调用方任务未被接收。 |

### 4.5 新任务进入线程池的顺序

以“核心线程数 2、最大线程数 4、队列容量 10”为例，每提交一个任务，线程池按下面的顺序处理：

```text
1. 当前工作线程少于 2 个 → 创建核心线程执行任务
2. 核心线程已满 → 任务先进入队列等待
3. 队列也满，且线程数少于 4 个 → 创建非核心线程执行任务
4. 队列满，线程数也达到 4 个 → 执行拒绝策略
```

> [!tip] 最容易混淆的点
> **不是先创建到最大线程数，再排队。** 默认策略是：先补足核心线程，然后优先入队；只有队列满了，才会继续创建非核心线程。

### 4.6 工作队列怎么选

| 队列 | 特点 | 适用理解 |
| --- | --- | --- |
| `ArrayBlockingQueue<>(n)` | 有固定容量 | 最容易控制积压量，初学时优先理解它。 |
| `LinkedBlockingQueue<>()` | 默认可视为无界队列 | 任务可能一直堆积；此时 `maximumPoolSize` 基本不会生效。 |
| `SynchronousQueue` | 不存放任务，必须直接交给空闲线程 | 往往需要较大的最大线程数，线程数可能快速增长。 |

队列不是越大越好。无界队列能暂时少报错，但任务积压会越来越多，等待时间和内存占用也会增长。有限队列能让系统更早暴露“处理不过来”的事实。

### 4.7 四种内置拒绝策略

当线程池已关闭，或“最大线程数和队列容量都到上限”时，新任务会被拒绝。

| 策略 | 行为 | 适合什么情况 |
| --- | --- | --- |
| `AbortPolicy` | 抛出 `RejectedExecutionException` | 默认选择；调用方必须明确处理失败。 |
| `CallerRunsPolicy` | 提交任务的线程自己执行任务 | 以降低提交速度为代价，形成简单的反压。 |
| `DiscardPolicy` | 直接丢弃新任务 | 只有任务丢失完全无影响时才考虑。 |
| `DiscardOldestPolicy` | 丢弃队列中等待最久的任务，再尝试提交新任务 | 很少适合普通业务，容易丢掉用户先提交的工作。 |

### 4.8 给线程命名

默认线程名如 `pool-1-thread-1` 不容易定位。`ThreadFactory` 可以统一命名：

```java
import java.util.concurrent.ThreadFactory;
import java.util.concurrent.atomic.AtomicInteger;

AtomicInteger sequence = new AtomicInteger(1);
ThreadFactory threadFactory = task -> {
    // 每创建一个线程，生成一个清晰且不重复的名称。
    Thread thread = new Thread(task, "report-worker-" + sequence.getAndIncrement());
    return thread;
};
```

发生异常或查看日志时，`report-worker-1` 比默认名称更容易判断这条线程属于哪个业务线程池。

### 4.9 一个有界线程池的完整例子

下面的线程池最多同时执行 4 个任务，最多等待 10 个任务；容量耗尽时直接抛出异常。它适合理解配置含义，实际参数应按任务类型和压测结果调整。

```java
import java.util.concurrent.ArrayBlockingQueue;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.ThreadFactory;
import java.util.concurrent.ThreadPoolExecutor;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicInteger;

public class CustomThreadPoolDemo {
    public static void main(String[] args) {
        AtomicInteger sequence = new AtomicInteger(1);
        ThreadFactory factory = task ->
                new Thread(task, "report-worker-" + sequence.getAndIncrement());

        ExecutorService pool = new ThreadPoolExecutor(
                2, 4,
                30, TimeUnit.SECONDS,
                new ArrayBlockingQueue<>(10),
                factory,
                new ThreadPoolExecutor.AbortPolicy()
        );

        try {
            for (int taskNumber = 1; taskNumber <= 3; taskNumber++) {
                final int currentTask = taskNumber; // Lambda 中使用的局部变量必须不可变。
                pool.execute(() -> System.out.println(
                        Thread.currentThread().getName() + " 执行任务 " + currentTask));
            }
        } finally {
            // 示例结束后关闭线程池，避免工作线程一直存活。
            pool.shutdown();
        }
    }
}
```

运行后可以看到带有 `report-worker-` 前缀的线程名。三个任务中，前两个会创建核心线程执行，第三个通常进入队列等待。

## 五、🚀 实践：线程池与 Future

### 5.1 前置准备

以下示例只需要 JDK 17 或更高版本。将代码保存为 `ThreadPoolFutureDemo.java`，然后执行：

```bash
javac ThreadPoolFutureDemo.java
java ThreadPoolFutureDemo
```

### 5.2 可以拿来干什么

#### 5.2.1 后台执行不需要结果的任务

例如记录操作日志。这个任务只需要完成动作，不需要把结果交回调用方，因此使用 **`Runnable`**。调用方只负责提交，任务由线程池中的工作线程执行：

```java
ExecutorService pool = Executors.newFixedThreadPool(2);

// Runnable 的 run() 没有返回值。
Runnable logTask = () -> {
    // 这里是独立执行的后台任务。
    System.out.println("记录操作日志");
};

// execute 只负责提交 Runnable，不提供任务执行状态或结果。
pool.execute(logTask);

// 不再接收新任务；已提交的任务仍会执行。
pool.shutdown();
```

常见场景：写操作日志、发送通知、刷新本地缓存、清理临时文件等“做完即可”的工作。

如果仍希望知道 `Runnable` 是否执行结束，也可以写 `Future<?> future = pool.submit(logTask)`；任务成功结束后 `future.get()` 的结果为 `null`。

#### 5.2.2 同时处理两个独立任务，再汇总结果

这里使用的是 **`Callable<Integer>`**：两个任务都要计算并返回一个整数。`submit(Callable<T>)` 立即返回 `Future<T>`，`get()` 在结果真正需要使用时再等待。

前置：`pool` 是已创建的 `ExecutorService`。如果任务不需要返回值，才使用 `Runnable` 并调用 `execute(...)` 或 `submit(...)`。

```java
// Lambda 的返回值使其匹配 Callable<Integer>，而不是 Runnable。
Callable<Integer> firstTask = () -> 10 + 20;
Callable<Integer> secondTask = () -> 30 + 40;

Future<Integer> first = pool.submit(firstTask);
Future<Integer> second = pool.submit(secondTask);

// get() 会等待对应任务完成，并取回返回值。
int total = first.get() + second.get();
System.out.println(total); // 100
```

常见场景：计算统计值、读取文件内容、查询数据库、调用第三方接口等“做完后还要使用结果”的工作。`Callable` 还可以抛出受检异常，因此适合可能出现 I/O 异常的任务。

#### 5.2.3 `Runnable` 和 `Callable` 怎么选

| 你的需求 | 选择 | 原因 |
| --- | --- | --- |
| 只要任务执行，不关心返回内容 | `Runnable` | `run()` 没有返回值，写法更直接。 |
| 要拿到计算、读取或查询的结果 | `Callable<T>` | `call()` 可以返回 `T`。 |
| 任务可能抛出受检异常 | `Callable<T>` | `call()` 可以声明 `throws Exception`。 |
| 只想知道无返回值任务是否完成 | `Runnable` + `submit` | 通过 `Future<?>` 查询状态或等待完成，正常结果为 `null`。 |

### 5.3 完整实践：计算任务结果并处理异常

下面的程序演示创建固定线程池、提交两个 `Callable`、通过 `Future` 获取结果，以及关闭线程池。

```java
import java.util.concurrent.Callable;
import java.util.concurrent.ExecutionException;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.TimeoutException;

public class ThreadPoolFutureDemo {
    public static void main(String[] args) {
        // 最多两个任务同时执行。
        ExecutorService pool = Executors.newFixedThreadPool(2);

        try {
            Callable<Integer> sumTask = () -> {
                Thread.sleep(500); // 模拟耗时计算。
                return 1 + 2 + 3;
            };
            Callable<Integer> productTask = () -> {
                Thread.sleep(300); // 模拟另一项耗时计算。
                return 4 * 5;
            };

            // 提交后立即得到 Future；任务可能正在执行，也可能在队列中等待。
            Future<Integer> sumFuture = pool.submit(sumTask);
            Future<Integer> productFuture = pool.submit(productTask);

            // 最多等待 2 秒；正常完成时，返回 Callable 的结果。
            int sum = sumFuture.get(2, TimeUnit.SECONDS);
            int product = productFuture.get(2, TimeUnit.SECONDS);
            System.out.println("sum = " + sum);
            System.out.println("product = " + product);
        } catch (TimeoutException exception) {
            System.err.println("任务超时");
        } catch (InterruptedException exception) {
            // 等待结果时被中断，恢复中断标记。
            Thread.currentThread().interrupt();
            System.err.println("等待结果时被中断");
        } catch (ExecutionException exception) {
            // 任务内部异常会被包装；getCause() 是原始异常。
            System.err.println("任务执行失败：" + exception.getCause());
        } finally {
            pool.shutdown();
            try {
                if (!pool.awaitTermination(3, TimeUnit.SECONDS)) {
                    pool.shutdownNow();
                }
            } catch (InterruptedException exception) {
                pool.shutdownNow();
                Thread.currentThread().interrupt();
            }
        }
    }
}
```

预期输出：

```text
sum = 6
product = 20
```

### 5.4 `Future.get()` 的结果

| 情况 | `get()` 的表现 | 应对方式 |
| --- | --- | --- |
| 任务正常完成 | 返回任务结果 | 使用结果。 |
| 任务内部抛异常 | 抛出 `ExecutionException` | 查看 `getCause()`。 |
| 等待被中断 | 抛出 `InterruptedException` | 恢复中断标记或继续向上抛出。 |
| 指定等待时间已到 | 抛出 `TimeoutException` | 处理超时；不再需要任务时可尝试 `cancel(true)`。 |

> [!warning] `get()` 会阻塞
> 调用 `future.get()` 的线程会等待结果。先提交多个独立任务，再在需要结果时调用 `get()`，它们才有机会并发执行。

## 六、📌 共享数据与线程安全

### 6.1 同一进程中的线程共享什么

同一个 Java 进程内的线程可以访问同一份堆内存，因此会共享对象、单例和静态变量；这也是多线程协作方便、但需要注意线程安全的原因。

| 是否共享 | 内容 | 例子 |
| --- | --- | --- |
| 共享 | 堆内存中的对象 | `new User()`、集合、缓存。 |
| 共享 | 静态变量和类相关资源 | `static` 字段、常量。 |
| 共享 | 进程持有的资源 | 已打开的文件、网络连接。 |
| 不共享 | 线程栈 | 局部变量、方法调用链。 |
| 不共享 | 程序计数器 | 每个线程各自执行到哪一行代码。 |
| 不共享 | `ThreadLocal` 数据 | 绑定到当前线程的独立数据。 |

例如 Spring 应用中的 `UserService` 通常是单例对象，多个请求线程会共同访问它。如果把可变的请求数据放进它的成员变量，就可能被其他请求线程同时读写。

### 6.2 RPC 服务之间不共享内存

RPC 的两端通常运行在**不同的 Java 进程**，甚至不同的机器上，所以服务 A 与服务 B 的线程和内存彼此独立。请求参数和返回值需要序列化后通过网络传输。

```text
服务 A：线程与内存  ── 序列化 + 网络 ──>  服务 B：线程与内存
```

因此，服务 A 中的静态变量、缓存或对象，服务 B 都无法直接访问。每个服务内部的线程仍共享本服务自己的内存。

### 6.3 为什么 `count++` 不安全

`count++` 包含读取、加一、写回三步。两个线程交错执行时，可能都读取到相同旧值，导致一次增加丢失。

```text
初始 count = 0
线程 A 读取 0        线程 B 读取 0
线程 A 写回 1        线程 B 写回 1
最终是 1，而不是 2
```

### 6.4 常用处理方式

| 场景 | 常用工具 |
| --- | --- |
| 简单计数、递增递减 | `AtomicInteger` |
| 一段代码必须一次只允许一个线程执行 | `synchronized` |
| 更灵活的加锁 | `Lock` |
| 线程间传递任务 | `BlockingQueue` |

```java
import java.util.concurrent.atomic.AtomicInteger;

AtomicInteger count = new AtomicInteger(0);
count.incrementAndGet(); // 原子地加一并返回新值。
```

## 七、🧾 快速回顾

- 线程是执行代码的单位；任务是要执行的工作。
- 用 `start()` 启动新线程，不要把调用 `run()` 当作启动线程。
- 线程池复用线程并限制并发，常用接口是 `ExecutorService`。
- `submit` 返回 `Future`；`get` 取结果，但会让当前线程等待。
- `InterruptedException` 不要直接吞掉，通常应恢复中断标记或继续向上抛出。
- 多线程共享可变数据时，要使用合适的线程安全工具。

一句话记忆：**线程负责执行，线程池负责安排，Future 负责取回结果。**

## 八、🔗 官方资料

- [Java SE 17：Thread](https://docs.oracle.com/en/java/javase/17/docs/api/java.base/java/lang/Thread.html)
- [Java SE 17：ExecutorService](https://docs.oracle.com/en/java/javase/17/docs/api/java.base/java/util/concurrent/ExecutorService.html)
- [Java SE 17：Future](https://docs.oracle.com/en/java/javase/17/docs/api/java.base/java/util/concurrent/Future.html)
- [Java SE 17：ThreadPoolExecutor](https://docs.oracle.com/en/java/javase/17/docs/api/java.base/java/util/concurrent/ThreadPoolExecutor.html)
