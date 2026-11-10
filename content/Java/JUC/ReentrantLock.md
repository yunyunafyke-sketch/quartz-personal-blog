---
title: ReentrantLock
date: 2026-11-10 18:26:55
publish: true
---


# ReentrantLock

先学会使用这把锁，再理解它提供的其他选择。可以对照 [[synchronized]] 阅读。

## 1. 它是干什么的

**ReentrantLock 是一把需要自己上锁、自己解锁的锁。**

它和 [[synchronized]] 的基本目的相同：让使用同一把锁的多个线程，轮流执行需要保护的那段代码。

例如，多个线程一起修改同一个计数器，我们希望它们一个一个修改，避免相互干扰。

现在先学会基本写法，其他功能等需要时再学。


## 2. 它怎么写

### 2.1 对照 synchronized：自己上锁，自己解锁

用 `synchronized`，进入代码块时自动上锁，离开时自动解锁：

```java
// 这段写在方法里；lockObject 是相关线程共用的同一个对象。
synchronized (lockObject) {
    // 需要保护的业务代码
}
```

换成 ReentrantLock，就把上锁和解锁明确写出来：

```java
import java.util.concurrent.locks.ReentrantLock;

class Counter {
    // 同一个 Counter 对象中的方法，共用这一把锁。
    private final ReentrantLock lock = new ReentrantLock();
    private int count = 0;

    public void increment() {
        lock.lock();          // 获取锁；其他线程占着这把锁时，就等待。
        try {
            count++;          // 获取锁后，才能执行这里的修改。
        } finally {
            lock.unlock();    // 即使修改过程中出现异常，也要释放锁。
        }
    }
}
```

先看懂三个地方就够了：

- `lock.lock()`：拿到锁，开始执行。
- `try`：把需要保护的业务放这里。
- `finally` 中的 `lock.unlock()`：用完释放，让其他线程有机会继续。

**相关线程必须共用同一把锁。** 如果每次调用都重新创建一把锁，就不能让这些线程相互等待。


### 2.2 先准备一份可以运行的代码

需要安装 JDK，不需要额外依赖。把下面完整代码保存为 `ReentrantLockDemo.java`，在 IDE 中运行 `main`，或使用代码后面的命令运行。

```java
import java.util.concurrent.locks.ReentrantLock;

public class ReentrantLockDemo {
    // 两个线程共用同一个 Counter，也就共用它内部的锁。
    static class Counter {
        private final ReentrantLock lock = new ReentrantLock();
        private int count = 0;

        void increment() {
            lock.lock();
            try {
                count++;
            } finally {
                lock.unlock();
            }
        }
    }

    public static void main(String[] args) throws InterruptedException {
        Counter counter = new Counter();

        // 每个线程都给同一个计数器增加 10000 次。
        Runnable task = () -> {
            for (int i = 0; i < 10000; i++) {
                counter.increment();
            }
        };

        Thread first = new Thread(task);
        Thread second = new Thread(task);
        first.start();
        second.start();

        // 等两个线程全部结束后，再读取最终结果。
        first.join();
        second.join();
        System.out.println(counter.count); // 预期：20000
    }
}
```

在文件所在目录执行：

```bash
javac ReentrantLockDemo.java
java ReentrantLockDemo
```

预期输出 `20000`。这里读取结果前，已经通过 `join()` 等待两个线程结束；如果要在线程仍在修改时读取计数，也需要保护读取操作。

若提示找不到 `javac`，先检查 JDK 是否安装并配置好；如果提示文件名不匹配，确认文件名为 `ReentrantLockDemo.java`。


## 3. 它到底锁住谁

### 3.1 看的是同一个 ReentrantLock 对象

判断两个线程是否会相互等待，先找它们调用的 `lock.lock()`，再看 `lock` 是否指向同一个 ReentrantLock 对象。

锁属于哪个业务对象、方法叫什么，都不是最终判断依据。**关键是有没有争抢同一把锁。**

### 3.2 每个对象一把锁，与多个对象共用一把锁

前面示例中的 `private final ReentrantLock lock` 是实例字段：每次创建一个 Counter，就会创建一把新锁。

- 两个线程使用同一个 Counter：共用它内部的锁。
- 两个线程各用一个 Counter：使用不同的锁。
- 如果多个业务对象明确共用同一个 ReentrantLock，它们仍然会竞争这把锁。

`final` 表示这个字段不再指向别的锁对象，并不表示所有 Counter 自动共用一把锁。

## 4. 什么情况下需要等待

### 4.1 不同线程，同一把锁：别人没释放，就需要等待

线程 A 已经获取这把锁，线程 B 再调用它的 `lock()`，就要等到有机会获取锁后才能继续执行后面的代码。

### 4.2 不同线程，不同的锁：不会因为这两把锁互相等待

如果 A、B 各自使用不同的 ReentrantLock，它们不会因争抢同一把锁而排队。若它们修改的却是同一份数据，这种写法就没有保护好数据。

### 4.3 不同方法，同一把锁：仍然需要等待

两个方法只要使用同一把锁，不同线程调用它们时就会竞争。并不是只有调用同一个方法才需要等待。

### 4.4 没有获取这把锁的方法：不会自动等待

线程 A 持锁时，线程 B 仍然可以执行没有获取这把锁的普通方法。

**上锁不会冻结整个业务对象。** 如果普通方法也访问同一份共享数据，就需要检查它是否也应当使用这把锁。

### 4.5 看代码时的判断顺序

1. 是同一个线程，还是不同线程？
2. 它们获取的是不是同一个 ReentrantLock 对象？
3. 对共享数据的操作，是否都放在获取锁之后、释放锁之前？

## 5. 什么时候获取锁、释放锁

### 5.1 lock() 成功返回后，才开始执行受保护的代码

使用基本写法时，先调用 `lock.lock()`，获取成功后再进入 `try`。等待期间，不会先执行后面的业务代码。

### 5.2 离开 try，不会自动释放锁

ReentrantLock 要靠 `unlock()` 释放。把它放在 `finally`，是为了让正常结束、提前 return、抛出异常等路径都执行解锁。

### 5.3 异常被 catch 捕获后，会立刻释放吗

不会。捕获异常本身不等于解锁。如果 catch 后还要继续执行代码，锁仍然由当前线程持有，直到执行相应的 `unlock()`。

### 5.4 只能由持有锁的线程解锁

不能让其他线程代替当前线程调用 `unlock()`。没有持有这把锁的线程尝试解锁，会抛出 `IllegalMonitorStateException`。

## 6. 什么是可重入

### 6.1 已经拿到锁的线程，可以再次获取同一把锁

例如，外层方法获取锁后，又调用一个会获取同一把锁的内层方法。因为仍然是同一个线程，所以它可以再次获取，不会把自己挡住。

这就是“可重入”：**自己已经持有的锁，自己还能再获取。**

### 6.2 获取几次，就需要释放几次

同一线程获取两次，就要对应调用两次 `unlock()`。只释放一次，其他线程仍然不能获取它。通常每一层方法都使用自己的 `try/finally`，配对获取和释放。

## 7. 使用时容易犯什么错

### 7.1 每次进入方法，都创建一把新锁

每个线程拿着各自的新锁，彼此就不会排队。应该让需要互相等待的线程共用同一个锁对象。

### 7.2 忘记在 finally 中解锁

如果只在业务代码末尾解锁，前面一旦抛出异常，就可能跳过解锁，让其他线程一直等下去。

### 7.3 只保护了部分操作

例如“检查库存”和“扣减库存”需要作为整体保护，只给扣减动作加锁可能仍然出错。相关的读取和修改也需要遵守同一套加锁规则。

### 7.4 持锁时间太长

把不需要保护的耗时操作也放进锁内，会让其他线程等得更久。先明确要保护哪份数据，再决定哪些代码需要放进去。

## 8. 基本用法学会后，再学哪些功能

下面先知道用途，等前面的内容理解了再逐个展开。

### 8.1 拿不到就算了：tryLock()

立即尝试获取锁，用返回值判断成功或失败。失败时可以选择执行其他逻辑；只有获取成功才需要对应解锁。

### 8.2 最多等一会儿：带超时时间的 tryLock()

例如最多等两秒，超过时间仍未获取，就返回失败，让程序执行其他处理。等待过程也可以响应中断。

### 8.3 等待途中可以取消：lockInterruptibly()

线程等待获取锁时，可以通过中断通知它取消等待；调用方需要处理相应异常。

### 8.4 尽量照顾等得久的线程：公平锁

默认不保证按等待顺序获取。构造时传入 `true` 可以启用公平策略，但它不等于严格保证线程执行顺序；无参 `tryLock()` 也不遵守这个公平设置。

### 8.5 条件没满足，先放下锁等一等：Condition

例如容器为空时，消费者先释放锁并等待；有数据后再被通知、重新获取锁并检查条件。它解决的是线程间的协作问题，后续再单独学。

## 学习顺序与自查

第一轮看第 1～7 节，能回答下面几个问题即可：

- 会不会写 `lock → try → finally → unlock`？
- 能不能判断两个线程使用的是不是同一把锁？
- 知不知道没有获取锁的方法仍然可以执行？
- 能不能解释异常发生时为什么仍要解锁？
- 能不能解释同一线程重复获取与配对释放？

第二轮再逐个学习第 8 节，不必一次记住所有名字。

## 官方资料

- [Java 25 ReentrantLock 官方文档](https://docs.oracle.com/en/java/javase/25/docs/api/java.base/java/util/concurrent/locks/ReentrantLock.html)
- [Java 25 Lock 官方文档](https://docs.oracle.com/en/java/javase/25/docs/api/java.base/java/util/concurrent/locks/Lock.html)
