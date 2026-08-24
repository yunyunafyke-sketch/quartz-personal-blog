---
publish: true
date: 2026-08-23
---

## 一、💡 一句话理解

> [!tip] 核心结论
> `AtomicInteger` 是一个能被多个线程安全修改的整数。用它做计数时，多个请求同时加一也不会少算。

## 二、🧭 理论：它是什么

### 2.1 原子操作是什么意思

“原子”不表示速度快，而是表示一次操作对其他线程来说**不可拆开**：要么还没发生，要么已经完整完成，不会看到只做了一半。

可以把它想成一台带保护的自动计数器。按一次按钮时，机器一定会把当前数字完整地加一；其他人不能在“刚读到旧数字、还没写回新数字”的中间插进来。

```text
普通加一：看数字 → 自己算 +1 → 写回数字
原子加一：          完整地加一
```

假设纸上写着 `0`，两个请求同时到达：

```text
普通 count++：
请求 A：看到 0
请求 B：也看到 0
请求 A：写回 1
请求 B：也写回 1
结果：来了 2 次，纸上却是 1（少算一次）

AtomicInteger 的 incrementAndGet()：
请求 A：0 → 1
请求 B：1 → 2
结果：来了 2 次，纸上是 2
```

所以，原子操作的重点是：**别人无法看见或修改“做到一半”的状态。**

`AtomicInteger` 位于 `java.util.concurrent.atomic` 包中，用来保存一个可以被原子更新的 `int` 值。它从 JDK 1.5 开始提供。

### 2.2 为什么普通的 count++ 不安全

`count++` 表面是一句代码，实际包含三步：

```text
1. 读取 count
2. 计算 count + 1
3. 写回 count
```

如果两个线程同时从 `0` 开始执行，二者都可能写回 `1`；实际加了两次，结果却只增加一次。这叫**丢失更新**。

## 三、⚙️ 理论：它是怎么工作的

### 3.1 用原子方法完成完整动作

`AtomicInteger` 把“读、计算、写回”封装为一个原子动作。例如 `incrementAndGet()` 会安全地加一，并返回加完后的结果。

```java
AtomicInteger count = new AtomicInteger(0);

// 原子地加一；并发调用也不会丢失次数。
int latestCount = count.incrementAndGet();
```

官方 API 明确将它用于“原子递增的计数器”等场景。

### 3.2 常用方法

| 方法 | 结果 |
| --- | --- |
| `get()` | 读取当前值。 |
| `set(10)` | 设为 `10`。 |
| `incrementAndGet()` | 加一，返回新值。 |
| `getAndIncrement()` | 返回旧值，再加一。 |
| `addAndGet(5)` | 加五，返回新值。 |
| `compareAndSet(3, 4)` | 当前值是 `3` 时才更新为 `4`，并返回是否成功。 |

> [!warning] 注意
> `AtomicInteger` 只适合保护一个整数的单步原子更新。若业务要求“同时检查余额、扣款、记录订单”全部成功或全部失败，应使用锁或事务等更完整的方案。

## 四、🚀 实践：从准备到验证

### 4.1 前置准备：先认识 CountDownLatch

需要 JDK 8 或更高版本；无需额外依赖。

```java
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.atomic.AtomicInteger;
```

`CountDownLatch` 是一个“等待大家完成”的计数器。它不是用来计业务次数的，而是用来协调多个线程的执行顺序。

把它想成老师在等 10 个学生交作业：

```text
CountDownLatch(10)：还有 10 份作业没交
第 1 个学生做完：countDown()，剩 9 份
第 2 个学生做完：countDown()，剩 8 份
……
最后一人做完：剩 0 份
老师调用 await()：等到剩 0 份后，才继续下一步
```

它只需要记住三个地方：

| 写法 | 白话意思 |
| --- | --- |
| `new CountDownLatch(10)` | 创建一个从 10 开始倒数的等待器。 |
| `await()` | 当前线程先停下来等，直到数字变为 0。 |
| `countDown()` | 宣布“我完成了一份工作”，让数字减一。 |

本例中会用两个 `CountDownLatch`：

```java
// 发令枪：初始是 1，工作线程先在这里等待。
CountDownLatch start = new CountDownLatch(1);

// 终点计数器：10 个工作线程，每完成一个就减一。
CountDownLatch finished = new CountDownLatch(10);
```

它们分别做的事是：

**第一个 `start`：让工作线程先别开始。**

```text
1. 10 个工作线程启动后，先执行 start.await()，所以它们都停在这里等待。
2. main 线程把 10 个工作线程都创建好后，执行 start.countDown()。
3. start 的数字从 1 变为 0，10 个工作线程不再等待，开始各自执行加一。
```

这里的 `start` 就像比赛发令枪：运动员先就位，裁判一声令下，大家才开始跑。

**第二个 `finished`：让 main 线程等所有工作线程做完。**

```text
1. main 线程发令后执行 finished.await()，自己先停下来等待。
2. 每个工作线程完成 10,000 次加一后，执行一次 finished.countDown()。
3. 10 个线程都完成后，finished 的数字从 10 减到 0。
4. main 线程不再等待，最后才打印两个计数结果。
```

这里的 `finished` 就像老师等 10 个学生都交完作业：没收齐前不公布结果，收齐后再统计。

> [!info] 注意
> `CountDownLatch` 倒数到 0 后不能恢复为原来的数字，所以适合“一次性等待”。它只是为了让演示中的线程同时开始、全部结束后再打印结果；真正保证“加一不丢失”的仍是 `AtomicInteger`。

### 4.2 可以拿来干什么

- 统计接口或用户的访问次数；
- 为并发任务生成递增序号；
- 用 `compareAndSet` 抢占一次性执行资格；
- 维护简单的并发状态或库存数量。

它常与 [[Java/ConcurrentHashMap并发安全与计数]] 配合：前者安全地保存“用户 ID → 计数器”，后者安全地递增某个用户的次数。

### 4.3 完整实践：代码、启动和验证

这段程序不是业务代码，而是一个对比实验：让 **10 个线程**各执行 **10,000 次**加一。理论总次数是 `10 × 10,000 = 100,000`。

每次循环中，两个计数器都会加一：

- `normalCount++`：普通写法，多个线程同时执行时可能互相覆盖；
- `requestCount.incrementAndGet()`：原子写法，不会丢失加一。

代码里有两类角色：

```text
main 线程：负责创建工作线程、宣布开始、等待结果、打印结果。
工作线程：等待开始信号、反复加一、宣布自己完成。
```

新建文件 `AtomicIntegerDemo.java`：

```java
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.atomic.AtomicInteger;

public class AtomicIntegerDemo {

    // 普通 int：count++ 不是原子操作，并发递增时可能少算。
    private int normalCount = 0;

    // 原子计数器：多个线程共同递增时不会丢失次数。
    private final AtomicInteger requestCount = new AtomicInteger(0);

    /**
     * 普通加一：实际包含“读取、加一、写回”三步。
     */
    public void handleUnsafeRequest() {
        normalCount++;
    }

    /**
     * 原子加一：三步对其他线程来说不可拆开。
     */
    public void handleAtomicRequest() {
        requestCount.incrementAndGet();
    }

    public static void main(String[] args) throws InterruptedException {
        AtomicIntegerDemo demo = new AtomicIntegerDemo();

        int threadCount = 10;
        int requestsPerThread = 10_000;
        // 创建名为 start 的等待器，倒计时初始为 1。
        // 数字未变成 0 前，调用 start.await() 的工作线程会暂停等待。
        CountDownLatch start = new CountDownLatch(1);
        // 创建名为 finished 的等待器，倒计时初始为 10。
        // main 线程会等 10 个工作线程都报告“完成”后，才继续打印结果。
        CountDownLatch finished = new CountDownLatch(threadCount);

        // 循环 10 次，每次创建 1 个工作线程；一共创建 10 个线程。
        for (int i = 0; i < threadCount; i++) {
            // new Thread(...) 表示：创建一个新线程，并让它执行下面花括号中的代码。
            new Thread(() -> {
                try {
                    // 此时 start 的数字还是 1，所以当前工作线程先停在这里等待。
                    // 直到 main 线程执行 start.countDown()，使数字变成 0，才继续向下计数。
                    start.await();
                    for (int j = 0; j < requestsPerThread; j++) {
                        demo.handleUnsafeRequest(); // 可能丢失更新
                        demo.handleAtomicRequest(); // 不会丢失更新
                    }
                } catch (InterruptedException e) {
                    // 示例中恢复中断标记，然后结束当前线程。
                    Thread.currentThread().interrupt();
                } finally {
                    // 无论是否被中断，都通知 main 线程当前任务已结束。
                    finished.countDown();
                }
            }).start();
        }

        // 循环已启动 10 个工作线程。把 start 从 1 减为 0，放行已经在等待的线程。
        // 若某个线程稍后才执行到 start.await()，它发现数字已是 0，也会直接继续。
        start.countDown();
        // main 线程等待所有请求处理完成，再读取最终计数。
        finished.await();

        int expectedCount = threadCount * requestsPerThread;
        System.out.println("预期次数：" + expectedCount);
        System.out.println("普通 count++：" + demo.normalCount);
        System.out.println("AtomicInteger：" + demo.requestCount.get());
    }
}
```

读这段代码时，不要把所有代码当成一条线。它实际有两条同时推进的路线：

```text
main 线程（从上到下执行）
创建 start 和 finished
        ↓
启动 10 个工作线程
        ↓
start.countDown()：把 start 的数字从 1 变为 0，表示“开始”
        ↓
finished.await()：main 线程在这里等全部工作线程结束
        ↓
打印结果

每个工作线程
启动
        ↓
start.await()：如果 start 还是 1，就先等；若已是 0，就直接继续
        ↓
循环 10,000 次：普通 count++ 加一次，AtomicInteger 加一次
        ↓
finished.countDown()：宣布“我这个线程做完了”
```

这里最容易混淆的两句可以这样翻译：

```java
CountDownLatch start = new CountDownLatch(1);
```

意思是：创建一个叫 `start` 的“开始等待器”，它里面的数字从 `1` 开始。这里的 `1` 不是 1 个线程，而是表示“还需要调用 1 次 `start.countDown()` 才能放行”。

```java
start.await();
```

意思是：当前**工作线程**在这里等一下；只有 `start` 的数字变成 `0`，它才会继续执行下面的加一循环。

```java
start.countDown();
```

意思是：当前的 **main 线程** 把 `start` 的数字从 `1` 减到 `0`，相当于发令。之前在等待的工作线程可以继续了。

在文件所在目录执行：

```bash
javac AtomicIntegerDemo.java
java AtomicIntegerDemo
```

预期输出：

```text
预期次数：100000
普通 count++：98765       // 每次运行的数字可能不同，也可能碰巧是 100000
AtomicInteger：100000
```

这里有 10 个线程，每个线程都做 10,000 次加一，总计应为 100,000。普通 `count++` 的结果**可能**小于预期，因为两个线程可能同时读到同一个旧值再写回；`AtomicInteger` 则稳定等于预期值。

> [!info] 提示
> 普通 `count++` 偶尔也可能碰巧输出 100,000；这不代表它线程安全，只是那次运行没有刚好发生会导致结果错误的交错。并发 Bug 往往不是每次都出现。

## 五、📌 总结

- `AtomicInteger` 是线程安全的整数容器。
- 不要在多线程共享计数中直接使用 `count++`。
- 计数时优先使用 `incrementAndGet()` 或 `getAndIncrement()`。
- 它保护的是单个数值的原子更新，不等于完整业务流程的事务保障。

## 六、📚 官方资料

- [Java SE 25：AtomicInteger API](https://docs.oracle.com/en/java/javase/25/docs/api/java.base/java/util/concurrent/atomic/AtomicInteger.html)
