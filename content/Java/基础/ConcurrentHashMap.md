---
title: ConcurrentHashMap
date: 2026-08-23
publish: true
---

## 一、💡 先记住一个场景

> [!tip] 核心结论
> `ConcurrentHashMap` 是给多个线程共同使用的 Map。它负责保证“用户 ID → 计数器”这张共享表不会被并发读写弄乱，但计数器内部如何安全加一，仍要由 `LongAdder`、`AtomicInteger` 或锁负责。

### 1.1 场景：双十一接口访问计数

假设我们要统计每位用户访问秒杀接口的次数：

```text
user-1001 → 访问了 2 次
user-1002 → 访问了 5 次
```

Web 服务会同时处理很多请求。线程 A 和线程 B 可能在同一时刻收到 `user-1001` 的请求：

```text
线程 A ─┐
        ├─→ 共享的访问次数表 ─→ user-1001 的计数器
线程 B ─┘
```

这时有两个问题：

1. **共享表要安全**：两个线程不能同时创建两个不同的 `user-1001` 计数器并互相覆盖。
2. **计数器要安全**：两个线程同时加一，结果必须从 0 变成 2，不能只变成 1。

对应关系是：

| 谁负责 | 解决的问题 |
| --- | --- |
| `ConcurrentHashMap` | 安全保存“用户 ID → 计数器”。 |
| `LongAdder` / `AtomicInteger` | 安全修改计数器内部的数字。 |

> [!info] 记忆画面
> 把 `ConcurrentHashMap` 想成一排共享储物柜：用户 ID 是柜门标签，计数器是柜子里的计数牌。它负责让大家安全地找到或创建正确的柜子，但计数牌怎么加一，是计数器自己的职责。

## 二、🧭 理论：它到底是什么

### 2.1 先从 Map 说起

`Map<K, V>` 保存的是“键 → 值”：

```java
Map<String, LongAdder> visitCounts;
```

这行代码表示：

- `String` 是键，例如用户 ID；
- `LongAdder` 是值，例如该用户的访问计数器；
- 一个用户 ID 只对应一个计数器。

`ConcurrentHashMap<K, V>` 是 `ConcurrentMap<K, V>` 的实现，专门用于多个线程共享访问的场景。

### 2.2 它和普通 HashMap 有什么区别

| 对比项 | `HashMap` | `ConcurrentHashMap` |
| --- | --- | --- |
| 线程安全 | 不保证。多线程共享且存在修改时，需要外部同步。 | 保证 Map 操作的线程安全。 |
| 典型场景 | 方法内局部变量、单线程数据。 | 共享缓存、访问计数表、注册表。 |
| 读取 | 没有并发安全保证。 | `get` 等读取通常不阻塞，可以与更新重叠。 |
| 组合操作 | 不能因为有 `computeIfAbsent` 就把它当成并发容器。 | `putIfAbsent`、`compute`、`merge` 等提供原子组合操作。 |
| `null` | 允许一个 `null` 键，也允许 `null` 值。 | 不允许 `null` 键和 `null` 值。 |
| 遍历 | 结构被修改时，迭代器可能快速失败并抛出 `ConcurrentModificationException`。 | 遍历可以和更新同时进行，不抛出该异常，但看到的不是某个瞬间的完整快照。 |
| 顺序 | 不保证遍历顺序。 | 同样不保证遍历顺序。 |

`HashMap` 并不是“不好的 Map”。如果数据只在一个线程中使用，选 [[HashMap]] 更直接。只有数据确实被多个线程共享时，才需要考虑 `ConcurrentHashMap`。

### 2.3 为什么 HashMap 会丢数据

如果共享的是普通 `HashMap`，下面这段“先查、再建、最后放”的代码包含三个独立步骤：

```java
// counters 是多个线程共享的 HashMap。
LongAdder counter = counters.get(userId);

if (counter == null) {
    // 两个线程可能同时发现没有计数器，然后各建一个。
    counter = new LongAdder();
    counters.put(userId, counter);
}
```

可能出现这样的执行顺序：

```text
线程 A：get → 没找到 → 创建计数器 A
线程 B：get → 没找到 → 创建计数器 B
线程 A：put 计数器 A
线程 B：put 计数器 B，覆盖计数器 A
```

问题的本质不是“每一步完全不能运行”，而是这三步合在一起不是一个不可分割的整体。

`ConcurrentHashMap` 可以把它改成一次原子组合操作：

```java
LongAdder counter = counters.computeIfAbsent(
        userId,
        id -> new LongAdder()
);
```

`computeIfAbsent` 可以直接记成：

> **有就返回原来的，没有就创建、放入并返回。整个调用按指定键原子地完成。**

映射函数应该保持短小，不要在里面做慢查询、远程调用或长时间阻塞，因为同一 Map 上的一些更新可能在计算期间等待。

## 三、⚙️ 理论：JDK 8+ 怎么做到并发安全

### 3.1 先记住总体结构

JDK 8 及之后，`ConcurrentHashMap` 的主要结构与 `HashMap` 相似：

```text
数组
 ├─ 桶 0 → 节点
 ├─ 桶 1 → 链表
 ├─ 桶 2 → 红黑树
 └─ 桶 3 → 空
```

哈希值决定键落到哪个桶。哈希冲突较少时使用链表；冲突严重并满足条件时，会转换成红黑树，避免查询退化得太严重。

### 3.2 读取：get 通常不加锁

官方文档明确说明，`get` 等读取操作通常不会阻塞，可以和 `put`、`remove` 等更新操作同时发生。

白话理解：

> 读者只是沿着数组和节点查找，不需要先把整张表锁住排队。

OpenJDK 实现中的表和节点字段配合 `volatile`、原子访问以及内存可见性规则，让一个线程完成的更新可以被后续读取正确观察到。

### 3.3 写入：CAS + 桶级 synchronized

JDK 8+ 写入可以记成两种情况：

1. **目标桶是空的**：通过 CAS 尝试直接放入新节点。
2. **目标桶已有数据**：对该桶的头节点使用 `synchronized`，只协调这个桶里的更新。

CAS 可以先理解成：

> “只有这里仍然是我刚才看到的状态，才把新值放进去；如果别人先改了，我就重试。”

这样做的关键不是“完全没有锁”，而是**锁的范围更小**。线程 A 修改桶 1 时，线程 B 仍可能同时修改桶 8，不必把整张 Map 全部锁住。

### 3.4 扩容：多个线程可以协助搬迁

容量不足时，数据需要迁移到更大的数组。JDK 8+ 的实现允许遇到扩容的线程参与迁移，而不是永远只让一个线程独自搬完所有桶。

面试中不必一开始背迁移源码，只需要记住：

> 普通读写追求缩小竞争范围，扩容时则通过协作迁移分摊工作。

### 3.5 JDK 7 和 JDK 8 的区别

这是常见追问：

| 版本 | 主要并发控制思路 |
| --- | --- |
| JDK 7 | 使用 `Segment` 分段锁，把数据分成多个段。 |
| JDK 8+ | 不再使用原来的分段结构，改为数组、链表/红黑树，并结合 CAS 与桶级 `synchronized`。 |

> [!warning] 面试不要混说
> 如果你回答的是 JDK 8+，不要再说“ConcurrentHashMap 依靠 Segment 分段锁实现”。那是 JDK 7 的典型实现。

### 3.6 它保证什么，又不保证什么

`ConcurrentHashMap` 保证 Map 自身的并发操作，但不会让放进去的对象自动变得线程安全：

```java
ConcurrentHashMap<String, Counter> counters = new ConcurrentHashMap<>();

Counter counter = counters.computeIfAbsent(userId, id -> new Counter());

// 如果 Counter.increment() 内部只是普通的 count++，这里仍可能丢失更新。
counter.increment();
```

可以用一句话记住边界：

> **柜子是安全的，不代表柜子里的东西也是安全的。**

如果值是可变对象，它自己也要使用 [[AtomicInteger]]、`LongAdder`、锁或其他线程安全设计。

### 3.7 为什么不允许 null

`ConcurrentHashMap` 用 `null` 可靠地表达“当前没有这个键对应的结果”。

如果它同时允许存入 `null`，那么 `get(key)` 返回 `null` 时就无法区分：

- 这个键不存在；
- 这个键存在，只是值恰好为 `null`。

并发环境中，刚做完 `containsKey`，另一个线程就可能修改 Map，因此也不能依靠“先判断、再读取”消除歧义。

## 四、🚀 实践：做一个并发访问计数器

### 4.1 前置准备

- JDK 8 或更高版本；
- 不需要第三方依赖；
- 示例文件名：`VisitCounterDemo.java`。

### 4.2 这段代码要解决什么

10 个线程同时模拟访问同一个用户，每个线程记录 1,000 次：

```text
10 个线程 × 每个线程 1,000 次 = 10,000 次
```

这里使用官方文档推荐的频率统计组合：

```java
ConcurrentHashMap<String, LongAdder>
```

- `ConcurrentHashMap` 负责安全找到或创建某个用户的计数器；
- `LongAdder` 负责高并发下安全加一。

### 4.3 完整代码

将下面代码保存到 `VisitCounterDemo.java`：

```java
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.LongAdder;

/**
 * 演示多个线程同时统计同一用户的访问次数。
 */
public class VisitCounterDemo {

    // 共享表：键是用户 ID，值是这个用户自己的并发计数器。
    private final ConcurrentHashMap<String, LongAdder> visitCounts =
            new ConcurrentHashMap<>();

    /**
     * 记录一次访问。
     */
    public void recordVisit(String userId) {
        // computeIfAbsent：有计数器就直接返回；没有就创建、放入并返回。
        // 这次“查找或创建”对当前 userId 原子地完成。
        LongAdder counter = visitCounts.computeIfAbsent(
                userId,
                id -> new LongAdder()
        );

        // increment：让当前用户的计数器安全加一。
        counter.increment();
    }

    /**
     * 查询指定用户当前的访问次数。
     */
    public long getVisitCount(String userId) {
        LongAdder counter = visitCounts.get(userId);

        // 用户还没有访问过时，Map 中没有对应计数器，返回 0。
        return counter == null ? 0 : counter.sum();
    }

    public static void main(String[] args) throws InterruptedException {
        VisitCounterDemo demo = new VisitCounterDemo();

        int threadCount = 10;
        int visitsPerThread = 1_000;
        Thread[] threads = new Thread[threadCount];

        for (int i = 0; i < threadCount; i++) {
            threads[i] = new Thread(() -> {
                for (int j = 0; j < visitsPerThread; j++) {
                    demo.recordVisit("user-1001");
                }
            });

            // start：让线程开始执行访问计数任务。
            threads[i].start();
        }

        for (Thread thread : threads) {
            // join：main 线程等待所有计数线程结束后再打印结果。
            thread.join();
        }

        System.out.println("user-1001 的访问次数："
                + demo.getVisitCount("user-1001"));
    }
}
```

### 4.4 编译、运行和验证

在文件所在目录执行：

```bash
javac -encoding UTF-8 VisitCounterDemo.java
java VisitCounterDemo
```

预期输出：

```text
user-1001 的访问次数：10000
```

结果为什么不会少：

```text
第一次遇到 user-1001
→ ConcurrentHashMap 安全创建并保存一个 LongAdder

后续所有线程
→ 找到同一个 LongAdder
→ LongAdder 安全执行 10,000 次 increment
```

### 4.5 常见错误与排查

#### 4.5.1 错误：把 get 和 put 拼成计数

```java
// 错误示例：get、加一、put 是三个独立步骤，整体不是原子的。
Integer oldValue = counts.get(userId);
counts.put(userId, oldValue == null ? 1 : oldValue + 1);
```

即使 `counts` 是 `ConcurrentHashMap`，上面这组组合操作仍可能丢失更新。简单整数累加可以使用 `merge`：

```java
// merge：没有旧值就放入 1；有旧值就原子地执行求和。
counts.merge(userId, 1, Integer::sum);
```

高并发频率统计则优先考虑前面的 `LongAdder` 方案。

#### 4.5.2 错误：在 computeIfAbsent 里做慢操作

```java
counters.computeIfAbsent(userId, id -> queryRemoteService(id));
```

映射函数执行期间，一些更新可能等待。这里应该只做短小、确定的初始化；远程调用或慢查询应重新设计执行位置。

#### 4.5.3 错误：把 size 当成实时业务条件

并发更新期间，`size()`、`isEmpty()` 等聚合结果更适合监控或估算，不应被理解成整张 Map 在某个瞬间的事务快照。

## 五、🎤 面试时怎么流利地说

### 5.1 先背一条回答路线

不要一上来堆 `CAS`、`volatile`、红黑树。按下面五步回答：

```text
是什么
→ 为什么需要
→ 怎么实现
→ 和 HashMap 的区别
→ 使用边界
```

记忆口诀：

> **并发 Map，读少挡，写锁桶，组合原子，值另管。**

对应含义：

| 口诀 | 真正含义 |
| --- | --- |
| 并发 Map | 多线程共享时使用。 |
| 读少挡 | `get` 通常不阻塞。 |
| 写锁桶 | JDK 8+ 使用 CAS 和桶级同步缩小竞争范围。 |
| 组合原子 | 使用 `putIfAbsent`、`compute`、`merge` 等方法。 |
| 值另管 | Map 安全不代表 Value 内部安全。 |

### 5.2 30 秒标准回答

> [!example] 可以直接这样说
> `ConcurrentHashMap` 是 Java 提供的线程安全 Map，适合多个线程共享读写。和 `HashMap` 相比，它不仅保证单次读写安全，还提供 `putIfAbsent`、`compute`、`merge` 这类原子组合操作。JDK 8 以后，它底层是数组加链表或红黑树，读取通常不加锁；写入空桶时主要使用 CAS，发生哈希冲突时对桶进行同步，所以不会把整张表锁住。需要注意的是，它不允许 `null` 键和值，而且 Map 安全不代表 Value 内部也安全。

这段回答已经包含：定义、对比、实现和边界。说完先停，让面试官决定追问哪一层。

### 5.3 2 分钟展开回答

> [!example] 面试官让你详细说时
> 我一般在多个线程需要共享一张键值表时使用 `ConcurrentHashMap`，例如“用户 ID 对应访问计数器”。普通 `HashMap` 没有并发安全保证，多个线程同时做 `get` 再 `put` 可能互相覆盖。`ConcurrentHashMap` 提供 `computeIfAbsent`、`merge` 等原子组合方法，可以把多步逻辑合成一次针对指定键的原子操作。
>
> JDK 8 以后，它的结构是数组加链表或红黑树。读取操作通常不需要加锁；写入时，如果桶为空，会尝试通过 CAS 放入节点，如果桶里已经有元素，就只同步当前桶的更新，因此不同桶之间仍然可以并发操作。扩容时多个线程还可以协助迁移数据。它不允许 `null`，这样 `get` 返回 `null` 就能明确表示当前没有映射。
>
> 最后要注意两个边界：第一，`ConcurrentHashMap` 只保证 Map 自身安全，Value 如果是可变对象仍要自己保证线程安全；第二，不要把几个安全的单次方法随便拼起来，例如 `get` 后再 `put`，应该使用 `compute`、`merge` 等原子方法。做访问计数时，我会用 `ConcurrentHashMap<String, LongAdder>`。

### 5.4 高频追问与短答

#### 5.4.1 get 要加锁吗

> 通常不需要。官方文档说明读取一般不阻塞，JDK 8+ 实现通过原子访问、`volatile` 和内存可见性保证读取能够观察到已完成的相关更新。

#### 5.4.2 put 会锁整张表吗

> 不会。空桶优先用 CAS，桶内已有节点时主要同步当前桶，所以不同桶可以并发更新。

#### 5.4.3 为什么不允许 null

> 因为并发场景要让 `null` 明确表示“没有映射”。如果允许存 `null`，就无法可靠区分键不存在和值为 `null`。

#### 5.4.4 ConcurrentHashMap 里做 count++ 安全吗

> 不一定。Map 只保证键和值的存取安全。如果 Value 内部是普通 `int`，`count++` 仍然可能丢失更新，应使用 `AtomicInteger`、`LongAdder` 或锁。

#### 5.4.5 JDK 7 和 JDK 8 有什么区别

> JDK 7 主要是 `Segment` 分段锁；JDK 8 取消了原来的分段结构，使用数组、链表/红黑树，并结合 CAS 和桶级 `synchronized`。

#### 5.4.6 遍历时能看到最新数据吗

> 能和更新同时遍历，也不会像 `HashMap` 那样因为并发结构修改而抛出 `ConcurrentModificationException`，但遍历结果不是整张表在某一时刻的强一致快照。

## 六、📌 最后只记住这六句话

1. `HashMap` 适合不共享的数据，`ConcurrentHashMap` 适合多线程共享的数据。
2. JDK 8+ 的核心结构是数组 + 链表/红黑树。
3. `get` 通常不加锁；写入结合 CAS 和桶级 `synchronized`。
4. 多步逻辑不要写成 `get` 再 `put`，要用 `compute`、`merge` 等原子组合方法。
5. `ConcurrentHashMap` 不允许 `null` 键和值。
6. Map 安全不等于 Value 安全：**柜子安全，柜子里的计数器还要自己安全。**

## 七、📚 官方资料

- [Java SE 25：ConcurrentHashMap API](https://docs.oracle.com/en/java/javase/25/docs/api/java.base/java/util/concurrent/ConcurrentHashMap.html)
- [Java SE 25：HashMap API](https://docs.oracle.com/en/java/javase/25/docs/api/java.base/java/util/HashMap.html)
- [OpenJDK：ConcurrentHashMap 源码](https://github.com/openjdk/jdk/blob/master/src/java.base/share/classes/java/util/concurrent/ConcurrentHashMap.java)
