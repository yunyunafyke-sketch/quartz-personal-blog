---
title: ReentrantLock
date: 2026-11-10 18:26:55
publish: true
---

## 一、ReentrantLock 是什么

**它是一把需要自己获取、自己释放的锁。**

例如，两个线程同时给同一个计数器加一，可能相互干扰。让它们共用一把锁，就能让受保护的加一操作一次只由一个线程执行。

## 二、基本写法

下面是写在类里面的基本结构：

```java
// 文件顶部需要导入：import java.util.concurrent.locks.ReentrantLock;

// 创建一把锁，让访问同一份数据的相关线程共用。
private final ReentrantLock lock = new ReentrantLock();

public void doWork() {
    lock.lock();          // 获取锁；其他线程占着这把锁时，就等待。
    try {
        // 把需要保护的业务操作放在这里。
    } finally {
        lock.unlock();    // 用完释放；业务抛出异常时也会执行。
    }
}
```

记住这个顺序：**获取锁 → 执行业务 → 在 finally 中释放锁。**

`lock()` 成功返回，表示已经拿到锁。`unlock()` 则是用完后把锁释放，让其他线程有机会获取。

为什么要用 `finally`？因为如果业务中途报错，只写在业务末尾的解锁代码可能被跳过；放在 `finally` 中，就能在异常退出时执行解锁。

## 三、完整例子：两个线程给计数器加一

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

## 四、“可重入”是什么意思

**同一个线程已经持有这把锁，还可以再次获取它。**

例如，外层方法拿到锁后，调用的内层方法也要获取同一把锁，这个线程不会因为自己占着锁而把自己挡住。

只需记住：**获取几次，就要对应释放几次。** 每一层都按 `lock → try → finally → unlock` 配对编写即可。

## 五、与 synchronized 有什么区别

### 5.1 目的相同，管理锁的方式不同

它们都能让使用同一把锁的线程，轮流执行受保护的代码。**synchronized 帮你自动获取和释放锁；ReentrantLock 需要你明确调用获取和释放的方法。**

下面用两个独立的类，展示同一个“计数加一”操作的两种写法。这是两种替代方案，不是让它们共同保护一份数据。

```java
import java.util.concurrent.locks.ReentrantLock;

// 方案一：使用 synchronized。
class SynchronizedCounter {
    private final Object lock = new Object();
    private int count = 0;

    public void increment() {
        synchronized (lock) { // 进入前自动获取 lock 对象对应的锁。
            count++;
        }                     // 离开代码块时自动释放。
    }
}

// 方案二：使用 ReentrantLock。
class ExplicitLockCounter {
    private final ReentrantLock lock = new ReentrantLock();
    private int count = 0;

    public void increment() {
        lock.lock();          // 自己调用方法获取锁。
        try {
            count++;
        } finally {
            lock.unlock();    // 自己保证离开时释放锁。
        }
    }
}
```

这两个类用于对照基本写法；要运行多线程例子，可以使用第三节的完整程序。

### 5.2 几个最需要理解的区别

| 对比点 | synchronized | ReentrantLock |
| --- | --- | --- |
| 它是什么 | Java 关键字，可以修饰方法或代码块 | Java 提供的类，需要创建锁对象 |
| 获取锁 | 进入同步方法或代码块前自动获取 | 调用 `lock()` 等方法获取 |
| 释放锁 | 离开同步方法或代码块时自动释放 | 需要调用 `unlock()`，通常放在 `finally` 中 |
| 业务抛出异常 | 异常导致离开同步范围时，自动释放 | 依靠 `finally` 中的解锁代码释放；漏写可能让其他线程一直等 |
| 拿不到锁时 | 等待获取，不能为进入同步范围直接设置超时 | 普通 `lock()` 也会等待；还提供其他获取方式，可尝试一次或最多等一段时间 |
| 同一线程再次获取同一把锁 | 支持，也就是可重入 | 也支持；每次获取都要有对应的释放 |

**可重入不是 ReentrantLock 独有的能力，synchronized 同样支持。**

再注意一个容易误解的地方：`lock()` 并不会自动“等一会儿就放弃”。要限时等待，需要改用带超时时间的 `tryLock(...)`，基础阶段先知道有这个选择即可。

### 5.3 什么时候选哪个

- **只是保护一段代码，让线程轮流执行：** 通常先考虑 `synchronized`，写法简单，也不容易漏掉解锁。
- **需要“拿不到就返回”“最多等两秒”等控制：** 考虑 ReentrantLock，使用它提供的对应方法。

例如，计数加一，两种写法都可以；如果需求变成“等待超过两秒就返回忙碌提示”，ReentrantLock 更方便表达这个要求。

不要把 ReentrantLock 理解为“更高级，所以一定更快”。性能取决于使用场景；入门时先按需要的功能选择。

两种方式都要求相关线程遵守同一套加锁规则。即使把同一个 ReentrantLock 对象写进 `synchronized (lock)`，获取的也不是 `lock.lock()` 管理的那把锁，不能混着用来保护同一份数据。关于 synchronized 本身的写法，可以回看 [[synchronized]]。

## 六、使用时记住三件事

- **共用同一把锁。** 不要在每次调用方法时都创建一把新锁，否则线程之间无法通过它互相等待。
- **成功获取后再释放。** 由拿到锁的线程，在 `finally` 中执行对应的 `unlock()`。
- **把需要一起保护的操作放完整。** 例如检查库存和扣减库存，要一起放在锁保护的代码中。

能看懂并写出第二节的基本结构，再理解第三节为什么得到 `20000`，就完成这一轮基础学习。

## 七、参考资料

- [Java 25 ReentrantLock 官方文档](https://docs.oracle.com/en/java/javase/25/docs/api/java.base/java/util/concurrent/locks/ReentrantLock.html)
- [Java 25 Lock 官方文档：显式锁与 synchronized 的区别](https://docs.oracle.com/en/java/javase/25/docs/api/java.base/java/util/concurrent/locks/Lock.html)
