---
publish: true
date: 2026-08-23
---

## 一、💡 一句话理解

> [!tip] 核心结论
> `ConcurrentHashMap` 是可被多个线程同时安全读写的键值对容器。它适合把“用户 ID → 该用户的计数器”这类共享数据放在一起管理。

## 二、🧭 理论：它是什么

### 2.1 Map 是什么

`Map` 用一对数据保存信息：**键（Key）→ 值（Value）**。

例如，把用户 ID 映射到访问计数器：

| 键 | 值 |
| --- | --- |
| `user-1001` | 该用户的 `Counter` |
| `user-1002` | 该用户的 `Counter` |

`ConcurrentHashMap<K, V>` 是 Java 提供的 `Map` 实现，其中 `K` 是键的类型，`V` 是值的类型。它实现了 `ConcurrentMap`，目的是让并发读写更安全。[[Java/面试题/Java基础与集合面试题]] 中也包含集合与并发基础题。

### 2.2 这行代码逐段解释

```java
// 多个 HTTP 请求线程共享的一张“用户 ID → 计数器”表。
private final ConcurrentHashMap<String, Counter> counters = new ConcurrentHashMap<>();
```

| 部分 | 含义 |
| --- | --- |
| `private` | 只有当前类能直接使用这个变量。 |
| `final` | `counters` 这个 Map 对象创建后不能换成另一个；但仍能新增、更新或删除其中的数据。 |
| `ConcurrentHashMap` | 支持并发访问的 Map。 |
| `String` | 键的类型；这里通常是用户 ID。 |
| `Counter` | 值的类型；这里保存该用户的计数信息。 |
| `new ConcurrentHashMap<>()` | 创建一张空的并发安全 Map。 |

## 三、⚙️ 理论：它是怎么工作的

### 3.1 为什么 HTTP 请求会遇到并发问题

Web 服务会用多个线程处理请求。两个请求可能在同一时刻访问同一份 `counters`：

```text
请求线程 A：读取或创建 user-1001 的计数器
请求线程 B：读取或创建 user-1002 的计数器
                 ↓
          共享的 counters Map
```

普通 `HashMap` 不适合多个线程同时修改；并发修改可能导致数据丢失或内部结构异常。`ConcurrentHashMap` 为这种共享 Map 提供线程安全访问：读取操作通常不会阻塞，并且可以和更新操作重叠进行。[Java 官方文档](https://docs.oracle.com/en/java/javase/25/docs/api/java.base/java/util/concurrent/ConcurrentHashMap.html)

### 3.2 它保证什么，不保证什么

`ConcurrentHashMap` 保证的是 **Map 自身操作** 的安全，例如安全地获取、放入或“没有就创建”一个用户对应的对象。

> [!warning] 重要边界
> 它不会自动让 `Counter` 内部的 `count++` 也安全。多个线程同时给同一用户计数时，计数器本身还必须使用原子类型或锁。

官方文档也明确说明：它不允许键或值为 `null`；在并发场景中，`null` 用来可靠表示“当前没有结果”。

## 四、🚀 实践：从准备到验证

### 4.1 前置准备

需要 JDK 8 或更高版本。示例只使用 Java 标准库：

```java
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicInteger;
```

### 4.2 可以拿来干什么

常见用途是按用户、接口、商品或关键字分组统计：

- 每位用户的请求次数；
- 每个接口的访问量；
- 每个关键词出现的次数；
- 多线程共享的缓存或注册表。

对于“统计次数”，Java 官方文档推荐把 `LongAdder` 和 `computeIfAbsent` 配合使用，以构造可扩展的频率统计表。

### 4.3 完整实践：代码、启动和验证

#### 4.3.1 先理解：给每个用户找自己的计数器

```java
Counter counter = counters.computeIfAbsent(userId, id -> new Counter());
```

先不要管方法名长不长，把这句当成一句话记住：

> **这个用户以前来过，就拿回他原来的计数器；这个用户第一次来，就给他新建一个从 0 开始的计数器。**

`counters` 可以想成一排带用户名标签的抽屉：

```text
抽屉标签 user-1001 → 里面放 user-1001 的 Counter
抽屉标签 user-1002 → 里面放 user-1002 的 Counter
```

假设当前收到的用户 ID 是 `"user-1001"`：

```text
第一次请求：没有 user-1001 的抽屉
→ 创建 new Counter()，把它放进 user-1001 的抽屉
→ 得到这个新 Counter，次数从 0 加到 1

第二次请求：已经有 user-1001 的抽屉
→ 直接取出第一次的同一个 Counter
→ 次数从 1 加到 2
```

这一行只需要先认识三个重点：

| 部分 | 意思 |
| --- | --- |
| `counters` | 所有用户计数器的存放处。 |
| `userId` | 当前要找的用户，例如 `"user-1001"`。 |
| `computeIfAbsent(...)` | 找到了就拿；没找到就创建、存入、再拿。 |

最后的 `id -> new Counter()` 现在只要理解成：**“没找到时，新建一个 Counter。”** `id` 是 Java 传进来的当前用户 ID；这段示例暂时没有用它，所以不用纠结它。

之所以不用“先 `get`，没有再 `put`”手写三步，是因为两个请求可能同时遇到新用户；`ConcurrentHashMap` 会安全地处理这次“查找或创建”。[Java 官方 API](https://docs.oracle.com/en/java/javase/25/docs/api/java.base/java/util/concurrent/ConcurrentHashMap.html#computeIfAbsent(K,java.util.function.Function))

#### 4.3.2 完整代码：拆成两个类

先记住分工：

```text
Counter.java
只管一个用户的数字如何安全地加一。

ConcurrentCounterDemo.java
只管“用户 ID 应该对应哪个 Counter”。
```

**文件一：`Counter.java`**

```java
import java.util.concurrent.atomic.AtomicInteger;

/**
 * 一个 Counter 对象只保存一个用户的请求次数。
 */
public class Counter {

    // 这个用户的当前次数；初始为 0。
    // final 表示 count 始终指向同一个 AtomicInteger，不能中途换成另一个计数器；
    // 但仍然可以调用 incrementAndGet() 修改这个计数器内部的数字。
    private final AtomicInteger count = new AtomicInteger(0);

    /**
     * 让当前次数安全地加一，并返回加完后的次数。
     */
    public int increment() {
        return count.incrementAndGet();
    }

    /**
     * 读取当前累计次数。
     */
    public int get() {
        return count.get();
    }
}
```

**文件二：`ConcurrentCounterDemo.java`**

```java
import java.util.concurrent.ConcurrentHashMap;

/**
 * 管理“用户 ID → 该用户的 Counter”。
 */
public class ConcurrentCounterDemo {

    // 所有请求线程共享的一张表。
    // final 表示 counters 只能在构造方法中赋值一次，之后不能换成另一张 Map；
    // 但仍然可以向这张 Map 放入或读取“用户 ID → Counter”数据。
    private final ConcurrentHashMap<String, Counter> counters;

    /**
     * new ConcurrentCounterDemo() 时会自动调用这里。
     * 它只创建一张空表，不会创建任何用户的 Counter，也不会给任何用户加次数。
     */
    public ConcurrentCounterDemo() {
        this.counters = new ConcurrentHashMap<>();
    }

    /**
     * 记录一次指定用户的请求，并返回该用户加完后的累计次数。
     */
    public int recordRequest(String userId) {
        // computeIfAbsent 的意思是“如果不存在，就创建”。
        // 先找 userId 对应的 Counter：找到了，直接返回已有 Counter；
        // 找不到时，才执行 id -> new Counter() 创建一个、放入 counters，再返回这个新 Counter。
        // id 是 Lambda 表达式接到的 userId；本例不需要使用它。
        Counter counter = counters.computeIfAbsent(userId, id -> new Counter());

        // 只给这个用户对应的 Counter 加一。
        return counter.increment();
    }

    /**
     * 查询一个用户当前的次数；这里不加一，只读取。
     */
    public int getRequestCount(String userId) {
        Counter counter = counters.get(userId);
        return counter == null ? 0 : counter.get();
    }

    public static void main(String[] args) throws InterruptedException {
        // 创建“计数管理器”：此刻只得到一张空的 counters 表。
        ConcurrentCounterDemo counterService = new ConcurrentCounterDemo();

        // 模拟请求 A：一个新线程为同一个用户 user-1001 记录一次请求。
        Thread requestA = new Thread(() ->
                counterService.recordRequest("user-1001")
        );

        // 模拟请求 B：另一个新线程也为 user-1001 记录一次请求。
        Thread requestB = new Thread(() ->
                counterService.recordRequest("user-1001")
        );

        // start() 后，两个请求线程会和 main 线程同时推进。
        requestA.start();
        requestB.start();

        // join() 表示 main 线程先等这个请求线程结束，再继续往下执行。
        requestA.join();
        requestB.join();

        // 两个请求都完成后，同一用户的最终次数应为 2。
        System.out.println(counterService.getRequestCount("user-1001"));
    }
}
```

执行 `new ConcurrentCounterDemo()` 时的顺序：

```text
1. 创建一个 ConcurrentCounterDemo 对象。
2. 自动进入 ConcurrentCounterDemo() 构造方法。
3. 执行 new ConcurrentHashMap<>()，创建一张空的 counters 表。
4. 构造完成，得到 counterService。

注意：这里还没有 user-1001，也没有创建 Counter。
真正首次创建某个用户的 Counter，是请求 A 或请求 B 调用 recordRequest("user-1001") 时发生的。
```

在文件所在目录执行：

```bash
javac Counter.java ConcurrentCounterDemo.java
java ConcurrentCounterDemo
```

预期输出：

```text
2
```

这里有两个线程同时读写同一个 `counterService.counters`，而且第一次都可能发现 `user-1001` 还没有 `Counter`。`ConcurrentHashMap` 会安全处理“找到或创建 Counter”这件事；随后 `AtomicInteger` 会安全处理两次加一。

即使换成 `HashMap`，这一次运行也**可能**碰巧输出 `2`；但它不保证多个线程同时修改 Map 时的安全性。`ConcurrentHashMap` 才是这种共享 Map 的正确选择。

## 五、📌 总结

- `ConcurrentHashMap` 是线程安全的键值对容器。
- 它适合保存多个线程共享的“标识 → 对象”关系。
- `computeIfAbsent` 适合安全地实现“没有就创建”。
- Map 安全不等于值对象安全；`Counter` 的递增仍需 [[Java/AtomicInteger原子计数与并发安全|AtomicInteger]]、`LongAdder` 或锁。
- 它不允许 `null` 键和 `null` 值。

## 六、📚 官方资料

- [Java SE 25：ConcurrentHashMap API](https://docs.oracle.com/en/java/javase/25/docs/api/java.base/java/util/concurrent/ConcurrentHashMap.html)
