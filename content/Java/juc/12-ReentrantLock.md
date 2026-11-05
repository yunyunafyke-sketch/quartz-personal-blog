---
title: 12-ReentrantLock
date: 2026-11-05 00:00:00
publish: true
---

# 12-ReentrantLock

[返回 JUC 导航](00-目录.md)

### Re-Lock

#### 锁对比

ReentrantLock 相对于 synchronized 具备如下特点：

1. 锁的实现：synchronized 是 JVM 实现的，而 ReentrantLock 是 JDK 实现的
2. 性能：新版本 Java 对 synchronized 进行了很多优化，synchronized 与 ReentrantLock 大致相同
3. 使用：ReentrantLock 需要手动解锁，synchronized 执行完代码块自动解锁
4. **可中断**：ReentrantLock 可中断，而 synchronized 不行
5. **公平锁**：公平锁是指多个线程在等待同一个锁时，必须按照申请锁的时间顺序来依次获得锁
   * ReentrantLock 可以设置公平锁，synchronized 中的锁是非公平的
   * 不公平锁的含义是阻塞队列内公平，队列外非公平
6. 锁超时：尝试获取锁，超时获取不到直接放弃，不进入阻塞队列
   * ReentrantLock 可以设置超时时间，synchronized 会一直等待
7. 锁绑定多个条件：一个 ReentrantLock 可以同时绑定多个 Condition 对象，更细粒度的唤醒线程
8. 两者都是可重入锁



***



#### 使用锁

构造方法：`ReentrantLock lock = new ReentrantLock();`

ReentrantLock 类 API：

* `public void lock()`：获得锁
  * 如果锁没有被另一个线程占用，则将锁定计数设置为 1

  * 如果当前线程已经保持锁定，则保持计数增加 1 

  * 如果锁被另一个线程保持，则当前线程被禁用线程调度，并且在锁定已被获取之前处于休眠状态

* `public void unlock()`：尝试释放锁
  * 如果当前线程是该锁的持有者，则保持计数递减
  * 如果保持计数现在为零，则锁定被释放
  * 如果当前线程不是该锁的持有者，则抛出异常

基本语法：

```java
// 获取锁
reentrantLock.lock();
try {
    // 临界区
} finally {
	// 释放锁
	reentrantLock.unlock();
}
```



***



#### 公平锁

##### 基本使用

构造方法：`ReentrantLock lock = new ReentrantLock(true)`

```java
public ReentrantLock(boolean fair) {
    sync = fair ? new FairSync() : new NonfairSync();
}
```

ReentrantLock 默认是不公平的：

```java
public ReentrantLock() {
    sync = new NonfairSync();
}
```

说明：公平锁一般没有必要，会降低并发度



***



##### 非公原理

###### 加锁

NonfairSync 继承自 AQS

```java
public void lock() {
    sync.lock();
}
```

* 没有竞争：ExclusiveOwnerThread 属于 Thread-0，state 设置为 1

  ```java
  // ReentrantLock.NonfairSync#lock
  final void lock() {
      // 用 cas 尝试（仅尝试一次）将 state 从 0 改为 1, 如果成功表示【获得了独占锁】
      if (compareAndSetState(0, 1))
          // 设置当前线程为独占线程
          setExclusiveOwnerThread(Thread.currentThread());
      else
          acquire(1);//失败进入
  }
  ```

* 第一个竞争出现：Thread-1 执行，CAS 尝试将 state 由 0 改为 1，结果失败（第一次），进入 acquire 逻辑

  ```java
  // AbstractQueuedSynchronizer#acquire
  public final void acquire(int arg) {
      // tryAcquire 尝试获取锁失败时, 会调用 addWaiter 将当前线程封装成node入队，acquireQueued 阻塞当前线程，
      // acquireQueued 返回 true 表示挂起过程中线程被中断唤醒过，false 表示未被中断过
      if (!tryAcquire(arg) && acquireQueued(addWaiter(Node.EXCLUSIVE), arg))
          // 如果线程被中断了逻辑来到这，完成一次真正的打断效果
          selfInterrupt();
  }
  ```

<img src="image/JUC-ReentrantLock-%E9%9D%9E%E5%85%AC%E5%B9%B3%E9%94%811.webp" style="zoom:80%;" />

* 进入 tryAcquire 尝试获取锁逻辑，这时 state 已经是1，结果仍然失败（第二次），加锁成功有两种情况：

  * 当前 AQS 处于无锁状态
  * 加锁线程就是当前线程，说明发生了锁重入

  ```java
  // ReentrantLock.NonfairSync#tryAcquire
  protected final boolean tryAcquire(int acquires) {
      return nonfairTryAcquire(acquires);
  }
  // 抢占成功返回 true，抢占失败返回 false
  final boolean nonfairTryAcquire(int acquires) {
      final Thread current = Thread.currentThread();
      // state 值
      int c = getState();
      // 条件成立说明当前处于【无锁状态】
      if (c == 0) {
          //如果还没有获得锁，尝试用cas获得，这里体现非公平性: 不去检查 AQS 队列是否有阻塞线程直接获取锁        
      	if (compareAndSetState(0, acquires)) {
              // 获取锁成功设置当前线程为独占锁线程。
              setExclusiveOwnerThread(current);
              return true;
           }    
  	}    
     	// 如果已经有线程获得了锁, 独占锁线程还是当前线程, 表示【发生了锁重入】
  	else if (current == getExclusiveOwnerThread()) {
          // 更新锁重入的值
          int nextc = c + acquires;
          // 越界判断，当重入的深度很深时，会导致 nextc < 0，int值达到最大之后再 + 1 变负数
          if (nextc < 0) // overflow
              throw new Error("Maximum lock count exceeded");
          // 更新 state 的值，这里不使用 cas 是因为当前线程正在持有锁，所以这里的操作相当于在一个管程内
          setState(nextc);
          return true;
      }
      // 获取失败
      return false;
  }
  ```

* 接下来进入 addWaiter 逻辑，构造 Node 队列（不是阻塞队列），前置条件是当前线程获取锁失败，说明有线程占用了锁

  * 图中黄色三角表示该 Node 的 waitStatus 状态，其中 0 为默认**正常状态**
  * Node 的创建是懒惰的，其中第一个 Node 称为 **Dummy（哑元）或哨兵**，用来占位，并不关联线程

  ```java
  // AbstractQueuedSynchronizer#addWaiter，返回当前线程的 node 节点
  private Node addWaiter(Node mode) {
      // 将当前线程关联到一个 Node 对象上, 模式为独占模式   
      Node node = new Node(Thread.currentThread(), mode);
      Node pred = tail;
      // 快速入队，如果 tail 不为 null，说明存在队列
      if (pred != null) {
          // 将当前节点的前驱节点指向 尾节点
          node.prev = pred;
          // 通过 cas 将 Node 对象加入 AQS 队列，成为尾节点，【尾插法】
          if (compareAndSetTail(pred, node)) {
              pred.next = node;// 双向链表
              return node;
          }
      }
      // 初始时队列为空，或者 CAS 失败进入这里
      enq(node);
      return node;
  }
  ```

  ```java
  // AbstractQueuedSynchronizer#enq
  private Node enq(final Node node) {
      // 自旋入队，必须入队成功才结束循环
      for (;;) {
          Node t = tail;
          // 说明当前锁被占用，且当前线程可能是【第一个获取锁失败】的线程，【还没有建立队列】
          if (t == null) {
              // 设置一个【哑元节点】，头尾指针都指向该节点
              if (compareAndSetHead(new Node()))
                  tail = head;
          } else {
              // 自旋到这，普通入队方式，首先赋值尾节点的前驱节点【尾插法】
              node.prev = t;
              // 【在设置完尾节点后，才更新的原始尾节点的后继节点，所以此时从前往后遍历会丢失尾节点】
              if (compareAndSetTail(t, node)) {
                  //【此时 t.next  = null，并且这里已经 CAS 结束，线程并不是安全的】
                  t.next = node;
                  return t;	// 返回当前 node 的前驱节点
              }
          }
      }
  }
  ```

  <img src="image/JUC-ReentrantLock-%E9%9D%9E%E5%85%AC%E5%B9%B3%E9%94%812.webp" style="zoom:80%;" />

* 线程节点加入队列成功，进入 AbstractQueuedSynchronizer#acquireQueued 逻辑阻塞线程

  * acquireQueued 会在一个自旋中不断尝试获得锁，失败后进入 park 阻塞

  * 如果当前线程是在 head 节点后，会再次 tryAcquire 尝试获取锁，state 仍为 1 则失败（第三次）

  ```java
  final boolean acquireQueued(final Node node, int arg) {
      // true 表示当前线程抢占锁失败，false 表示成功
      boolean failed = true;
      try {
          // 中断标记，表示当前线程是否被中断
          boolean interrupted = false;
          for (;;) {
              // 获得当前线程节点的前驱节点
              final Node p = node.predecessor();
              // 前驱节点是 head, FIFO 队列的特性表示轮到当前线程可以去获取锁
              if (p == head && tryAcquire(arg)) {
                  // 获取成功, 设置当前线程自己的 node 为 head
                  setHead(node);
                  p.next = null; // help GC
                  // 表示抢占锁成功
                  failed = false;
                  // 返回当前线程是否被中断
                  return interrupted;
              }
              // 判断是否应当 park，返回 false 后需要新一轮的循环，返回 true 进入条件二阻塞线程
              if (shouldParkAfterFailedAcquire(p, node) && parkAndCheckInterrupt())
                  // 条件二返回结果是当前线程是否被打断，没有被打断返回 false 不进入这里的逻辑
                  // 【就算被打断了，也会继续循环，并不会返回】
                  interrupted = true;
          }
      } finally {
          // 【可打断模式下才会进入该逻辑】
          if (failed)
              cancelAcquire(node);
      }
  }
  ```

  * 进入 shouldParkAfterFailedAcquire 逻辑，**将前驱 node 的 waitStatus 改为 -1**，返回 false；waitStatus 为 -1 的节点用来唤醒下一个节点

  ```java
  private static boolean shouldParkAfterFailedAcquire(Node pred, Node node) {
      int ws = pred.waitStatus;
      // 表示前置节点是个可以唤醒当前节点的节点，返回 true
      if (ws == Node.SIGNAL)
          return true;
      // 前置节点的状态处于取消状态，需要【删除前面所有取消的节点】, 返回到外层循环重试
      if (ws > 0) {
          do {
              node.prev = pred = pred.prev;
          } while (pred.waitStatus > 0);
          // 获取到非取消的节点，连接上当前节点
          pred.next = node;
      // 默认情况下 node 的 waitStatus 是 0，进入这里的逻辑
      } else {
          // 【设置上一个节点状态为 Node.SIGNAL】，返回外层循环重试
          compareAndSetWaitStatus(pred, ws, Node.SIGNAL);
      }
      // 返回不应该 park，再次尝试一次
      return false;
  }
  ```

  * shouldParkAfterFailedAcquire 执行完毕回到 acquireQueued ，再次 tryAcquire 尝试获取锁，这时 state 仍为 1 获取失败（第四次）
  * 当再次进入 shouldParkAfterFailedAcquire 时，这时其前驱 node 的 waitStatus 已经是 -1 了，返回 true
  * 进入 parkAndCheckInterrupt， Thread-1 park（灰色表示）

  ```java
  private final boolean parkAndCheckInterrupt() {
      // 阻塞当前线程，如果打断标记已经是 true, 则 park 会失效
      LockSupport.park(this);
      // 判断当前线程是否被打断，清除打断标记
      return Thread.interrupted();
  }
  ```

* 再有多个线程经历竞争失败后：

  ![](image/JUC-ReentrantLock-%E9%9D%9E%E5%85%AC%E5%B9%B3%E9%94%813.webp)



***



###### 解锁

ReentrantLock#unlock：释放锁

```java
public void unlock() {
    sync.release(1);
}
```

Thread-0 释放锁，进入 release 流程

* 进入 tryRelease，设置 exclusiveOwnerThread 为 null，state = 0

* 当前队列不为 null，并且 head 的 waitStatus = -1，进入 unparkSuccessor

  ```java
  // AbstractQueuedSynchronizer#release
  public final boolean release(int arg) {
      // 尝试释放锁，tryRelease 返回 true 表示当前线程已经【完全释放锁，重入的释放了】
      if (tryRelease(arg)) {
          // 队列头节点
          Node h = head;
          // 头节点什么时候是空？没有发生锁竞争，没有竞争线程创建哑元节点
          // 条件成立说明阻塞队列有等待线程，需要唤醒 head 节点后面的线程
          if (h != null && h.waitStatus != 0)
              unparkSuccessor(h);
          return true;
      }    
      return false;
  }
  ```

  ```java
  // ReentrantLock.Sync#tryRelease
  protected final boolean tryRelease(int releases) {
      // 减去释放的值，可能重入
      int c = getState() - releases;
      // 如果当前线程不是持有锁的线程直接报错
      if (Thread.currentThread() != getExclusiveOwnerThread())
          throw new IllegalMonitorStateException();
      // 是否已经完全释放锁
      boolean free = false;
      // 支持锁重入, 只有 state 减为 0, 才完全释放锁成功
      if (c == 0) {
          free = true;
          setExclusiveOwnerThread(null);
      }
      // 当前线程就是持有锁线程，所以可以直接更新锁，不需要使用 CAS
      setState(c);
      return free;
  }
  ```

* 进入 AbstractQueuedSynchronizer#unparkSuccessor 方法，唤醒当前节点的后继节点

  * 找到队列中距离 head 最近的一个没取消的 Node，unpark 恢复其运行，本例中即为 Thread-1
  * 回到 Thread-1 的 acquireQueued 流程

  ```java
  private void unparkSuccessor(Node node) {
      // 当前节点的状态
      int ws = node.waitStatus;    
      if (ws < 0)        
          // 【尝试重置状态为 0】，因为当前节点要完成对后续节点的唤醒任务了，不需要 -1 了
          compareAndSetWaitStatus(node, ws, 0);    
      // 找到需要 unpark 的节点，当前节点的下一个    
      Node s = node.next;    
      // 已取消的节点不能唤醒，需要找到距离头节点最近的非取消的节点
      if (s == null || s.waitStatus > 0) {
          s = null;
          // AQS 队列【从后至前】找需要 unpark 的节点，直到 t == 当前的 node 为止，找不到就不唤醒了
          for (Node t = tail; t != null && t != node; t = t.prev)
              // 说明当前线程状态需要被唤醒
              if (t.waitStatus <= 0)
                  // 置换引用
                  s = t;
      }
      // 【找到合适的可以被唤醒的 node，则唤醒线程】
      if (s != null)
          LockSupport.unpark(s.thread);
  }
  ```

  **从后向前的唤醒的原因**：enq 方法中，节点是尾插法，首先赋值的是尾节点的前驱节点，此时前驱节点的 next 并没有指向尾节点，从前遍历会丢失尾节点

* 唤醒的线程会从 park 位置开始执行，如果加锁成功（没有竞争），会设置

  * exclusiveOwnerThread 为 Thread-1，state = 1
  * head 指向刚刚 Thread-1 所在的 Node，该 Node 会清空 Thread
  * 原本的 head 因为从链表断开，而可被垃圾回收（图中有错误，原来的头节点的 waitStatus 被改为 0 了）

  ![](image/JUC-ReentrantLock-%E9%9D%9E%E5%85%AC%E5%B9%B3%E9%94%814.webp)

* 如果这时有其它线程来竞争**（非公平）**，例如这时有 Thread-4 来了并抢占了锁

  * Thread-4 被设置为 exclusiveOwnerThread，state = 1
  * Thread-1 再次进入 acquireQueued 流程，获取锁失败，重新进入 park 阻塞

  ![](image/JUC-ReentrantLock-%E9%9D%9E%E5%85%AC%E5%B9%B3%E9%94%815.webp)



***



##### 公平原理

与非公平锁主要区别在于 tryAcquire 方法：先检查 AQS 队列中是否有前驱节点，没有才去 CAS 竞争

```java
static final class FairSync extends Sync {
    private static final long serialVersionUID = -3000897897090466540L;
    final void lock() {
        acquire(1);
    }

    protected final boolean tryAcquire(int acquires) {
        final Thread current = Thread.currentThread();
        int c = getState();
        if (c == 0) {
            // 先检查 AQS 队列中是否有前驱节点, 没有(false)才去竞争
            if (!hasQueuedPredecessors() &&
                compareAndSetState(0, acquires)) {
                setExclusiveOwnerThread(current);
                return true;
            }
        }
        // 锁重入
        return false;
    }
}
```

```java
public final boolean hasQueuedPredecessors() {    
    Node t = tail;
    Node h = head;
    Node s;    
    // 头尾指向一个节点，链表为空，返回false
    return h != t &&
        // 头尾之间有节点，判断头节点的下一个是不是空
        // 不是空进入最后的判断，第二个节点的线程是否是本线程，不是返回 true，表示当前节点有前驱节点
        ((s = h.next) == null || s.thread != Thread.currentThread());
}
```



***



#### 可重入

可重入是指同一个线程如果首次获得了这把锁，那么它是这把锁的拥有者，因此有权利再次获取这把锁，如果不可重入锁，那么第二次获得锁时，自己也会被锁挡住，直接造成死锁

源码解析参考：`nonfairTryAcquire(int acquires)) ` 和 `tryRelease(int releases)`

```java
static ReentrantLock lock = new ReentrantLock();
public static void main(String[] args) {
    method1();
}
public static void method1() {
    lock.lock();
    try {
        System.out.println(Thread.currentThread().getName() + " execute method1");
        method2();
    } finally {
        lock.unlock();
    }
}
public static void method2() {
    lock.lock();
    try {
        System.out.println(Thread.currentThread().getName() + " execute method2");
    } finally {
        lock.unlock();
    }
}
```

在 Lock 方法加两把锁会是什么情况呢？

* 加锁两次解锁两次：正常执行
* 加锁两次解锁一次：程序直接卡死，线程不能出来，也就说明**申请几把锁，最后需要解除几把锁**
* 加锁一次解锁两次：运行程序会直接报错

```java
public void getLock() {
    lock.lock();
    lock.lock();
    try {
        System.out.println(Thread.currentThread().getName() + "\t get Lock");
    } finally {
        lock.unlock();
        //lock.unlock();
    }
}
```



****



#### 可打断

##### 基本使用

`public void lockInterruptibly()`：获得可打断的锁

* 如果没有竞争此方法就会获取 lock 对象锁
* 如果有竞争就进入阻塞队列，可以被其他线程用 interrupt 打断

注意：如果是不可中断模式，那么即使使用了 interrupt 也不会让等待状态中的线程中断

```java
public static void main(String[] args) throws InterruptedException {    
    ReentrantLock lock = new ReentrantLock();    
    Thread t1 = new Thread(() -> {        
        try {            
            System.out.println("尝试获取锁");            
            lock.lockInterruptibly();        
        } catch (InterruptedException e) {            
            System.out.println("没有获取到锁，被打断，直接返回");            
            return;        
        }        
        try {            
            System.out.println("获取到锁");        
        } finally {            
            lock.unlock();        
        }    
    }, "t1");    
    lock.lock();    
    t1.start();    
    Thread.sleep(2000);    
    System.out.println("主线程进行打断锁");    
    t1.interrupt();
}
```



***



##### 实现原理

* 不可打断模式：即使它被打断，仍会驻留在 AQS 阻塞队列中，一直要**等到获得锁后才能得知自己被打断**了

  ```java
  public final void acquire(int arg) {    
      if (!tryAcquire(arg) && acquireQueued(addWaiter(Node.EXCLUSIVE), arg))//阻塞等待        
          // 如果acquireQueued返回true，打断状态 interrupted = true        
          selfInterrupt();
  }
  static void selfInterrupt() {
      // 知道自己被打断了，需要重新产生一次中断完成中断效果
      Thread.currentThread().interrupt();
  }
  ```

  ```java
  final boolean acquireQueued(final Node node, int arg) {    
      try {        
          boolean interrupted = false;        
          for (;;) {            
              final Node p = node.predecessor();            
              if (p == head && tryAcquire(arg)) {                
                  setHead(node);                
                  p.next = null; // help GC                
                  failed = false;                
                  // 还是需要获得锁后, 才能返回打断状态
                  return interrupted;            
              }            
              if (shouldParkAfterFailedAcquire(p, node) && parkAndCheckInterrupt()){
                  // 条件二中判断当前线程是否被打断，被打断返回true，设置中断标记为 true，【获取锁后返回】
                  interrupted = true;  
              }                  
          } 
      } finally {
          if (failed)
              cancelAcquire(node);
      }
  }
   private final boolean parkAndCheckInterrupt() {    
       // 阻塞当前线程，如果打断标记已经是 true, 则 park 会失效
       LockSupport.park(this);    
       // 判断当前线程是否被打断，清除打断标记，被打断返回true
       return Thread.interrupted();
   }
  ```

* 可打断模式：AbstractQueuedSynchronizer#acquireInterruptibly，**被打断后会直接抛出异常**

  ```java
  public void lockInterruptibly() throws InterruptedException {    
      sync.acquireInterruptibly(1);
  }
  public final void acquireInterruptibly(int arg) {
      // 被其他线程打断了直接返回 false
      if (Thread.interrupted())
  		throw new InterruptedException();
      if (!tryAcquire(arg))
          // 没获取到锁，进入这里
          doAcquireInterruptibly(arg);
  }
  ```

  ```java
  private void doAcquireInterruptibly(int arg) throws InterruptedException {
      // 返回封装当前线程的节点
      final Node node = addWaiter(Node.EXCLUSIVE);
      boolean failed = true;
      try {
          for (;;) {
              //...
              if (shouldParkAfterFailedAcquire(p, node) && parkAndCheckInterrupt())
                  // 【在 park 过程中如果被 interrupt 会抛出异常】, 而不会再次进入循环获取锁后才完成打断效果
                  throw new InterruptedException();
          }    
      } finally {
          // 抛出异常前会进入这里
          if (failed)
              // 取消当前线程的节点
              cancelAcquire(node);
      }
  }
  ```

  ```java
  // 取消节点出队的逻辑
  private void cancelAcquire(Node node) {
      // 判空
      if (node == null)
          return;
  	// 把当前节点封装的 Thread 置为空
      node.thread = null;
  	// 获取当前取消的 node 的前驱节点
      Node pred = node.prev;
      // 前驱节点也被取消了，循环找到前面最近的没被取消的节点
      while (pred.waitStatus > 0)
          node.prev = pred = pred.prev;
      
  	// 获取前驱节点的后继节点，可能是当前 node，也可能是 waitStatus > 0 的节点
      Node predNext = pred.next;
      
  	// 把当前节点的状态设置为 【取消状态 1】
      node.waitStatus = Node.CANCELLED;
      
  	// 条件成立说明当前节点是尾节点，把当前节点的前驱节点设置为尾节点
      if (node == tail && compareAndSetTail(node, pred)) {
          // 把前驱节点的后继节点置空，这里直接把所有的取消节点出队
          compareAndSetNext(pred, predNext, null);
      } else {
          // 说明当前节点不是 tail 节点
          int ws;
          // 条件一成立说明当前节点不是 head.next 节点
          if (pred != head &&
              // 判断前驱节点的状态是不是 -1，不成立说明前驱状态可能是 0 或者刚被其他线程取消排队了
              ((ws = pred.waitStatus) == Node.SIGNAL ||
               // 如果状态不是 -1，设置前驱节点的状态为 -1
               (ws <= 0 && compareAndSetWaitStatus(pred, ws, Node.SIGNAL))) &&
              // 前驱节点的线程不为null
              pred.thread != null) {
              
              Node next = node.next;
              // 当前节点的后继节点是正常节点
              if (next != null && next.waitStatus <= 0)
                  // 把 前驱节点的后继节点 设置为 当前节点的后继节点，【从队列中删除了当前节点】
                  compareAndSetNext(pred, predNext, next);
          } else {
              // 当前节点是 head.next 节点，唤醒当前节点的后继节点
              unparkSuccessor(node);
          }
          node.next = node; // help GC
      }
  }
  ```
  
  



***



#### 锁超时

##### 基本使用

`public boolean tryLock()`：尝试获取锁，获取到返回 true，获取不到直接放弃，不进入阻塞队列

`public boolean tryLock(long timeout, TimeUnit unit)`：在给定时间内获取锁，获取不到就退出

注意：tryLock 期间也可以被打断

```java
public static void main(String[] args) {
    ReentrantLock lock = new ReentrantLock();
    Thread t1 = new Thread(() -> {
        try {
            if (!lock.tryLock(2, TimeUnit.SECONDS)) {
                System.out.println("获取不到锁");
                return;
            }
        } catch (InterruptedException e) {
            System.out.println("被打断，获取不到锁");
            return;
        }
        try {
            log.debug("获取到锁");
        } finally {
            lock.unlock();
        }
    }, "t1");
    lock.lock();
    System.out.println("主线程获取到锁");
    t1.start();
    
    Thread.sleep(1000);
    try {
        System.out.println("主线程释放了锁");
    } finally {
        lock.unlock();
    }
}
```



***



##### 实现原理

* 成员变量：指定超时限制的阈值，小于该值的线程不会被挂起

  ```java
  static final long spinForTimeoutThreshold = 1000L;
  ```

  超时时间设置的小于该值，就会被禁止挂起，因为阻塞在唤醒的成本太高，不如选择自旋空转

* tryLock()

  ```java
  public boolean tryLock() {   
      // 只尝试一次
      return sync.nonfairTryAcquire(1);
  }
  ```

* tryLock(long timeout, TimeUnit unit)

  ```java
  public final boolean tryAcquireNanos(int arg, long nanosTimeout) {
      if (Thread.interrupted())        
          throw new InterruptedException();    
      // tryAcquire 尝试一次
      return tryAcquire(arg) || doAcquireNanos(arg, nanosTimeout);
  }
  protected final boolean tryAcquire(int acquires) {    
      return nonfairTryAcquire(acquires);
  }
  ```

  ```java
  private boolean doAcquireNanos(int arg, long nanosTimeout) {    
      if (nanosTimeout <= 0L)
          return false;
      // 获取最后期限的时间戳
      final long deadline = System.nanoTime() + nanosTimeout;
      //...
      try {
          for (;;) {
              //...
              // 计算还需等待的时间
              nanosTimeout = deadline - System.nanoTime();
              if (nanosTimeout <= 0L)	//时间已到     
                  return false;
              if (shouldParkAfterFailedAcquire(p, node) &&
                  // 如果 nanosTimeout 大于该值，才有阻塞的意义，否则直接自旋会好点
                  nanosTimeout > spinForTimeoutThreshold)
                  LockSupport.parkNanos(this, nanosTimeout);
              // 【被打断会报异常】
              if (Thread.interrupted())
                  throw new InterruptedException();
          }    
      }
  }
  ```



***



##### 哲学家就餐

```java
public static void main(String[] args) {
    Chopstick c1 = new Chopstick("1");//...
    Chopstick c5 = new Chopstick("5");
    new Philosopher("苏格拉底", c1, c2).start();
    new Philosopher("柏拉图", c2, c3).start();
    new Philosopher("亚里士多德", c3, c4).start();
    new Philosopher("赫拉克利特", c4, c5).start();    
    new Philosopher("阿基米德", c5, c1).start();
}
class Philosopher extends Thread {
    Chopstick left;
    Chopstick right;
    public void run() {
        while (true) {
            // 尝试获得左手筷子
            if (left.tryLock()) {
                try {
                    // 尝试获得右手筷子
                    if (right.tryLock()) {
                        try {
                            System.out.println("eating...");
                            Thread.sleep(1000);
                        } finally {
                            right.unlock();
                        }
                    }
                } finally {
                    left.unlock();
                }
            }
        }
    }
}
class Chopstick extends ReentrantLock {
    String name;
    public Chopstick(String name) {
        this.name = name;
    }
    @Override
    public String toString() {
        return "筷子{" + name + '}';
    }
}
```



***



#### 条件变量

##### 基本使用

synchronized 的条件变量，是当条件不满足时进入 WaitSet 等待；ReentrantLock 的条件变量比 synchronized 强大之处在于支持多个条件变量

ReentrantLock 类获取 Condition 对象：`public Condition newCondition()`

Condition 类 API：

* `void await()`：当前线程从运行状态进入等待状态，释放锁
* `void signal()`：唤醒一个等待在 Condition 上的线程，但是必须获得与该 Condition 相关的锁

使用流程：

* **await / signal 前需要获得锁**
* await 执行后，会释放锁进入 ConditionObject 等待
* await 的线程被唤醒去重新竞争 lock 锁

* **线程在条件队列被打断会抛出中断异常**

* 竞争 lock 锁成功后，从 await 后继续执行

```java
public static void main(String[] args) throws InterruptedException {    
    ReentrantLock lock = new ReentrantLock();
    //创建一个新的条件变量
    Condition condition1 = lock.newCondition();
    Condition condition2 = lock.newCondition();
    new Thread(() -> {
        try {
            lock.lock();
            System.out.println("进入等待");
            //进入休息室等待
            condition1.await();
            System.out.println("被唤醒了");
        } catch (InterruptedException e) {
            e.printStackTrace();
        } finally {
            lock.unlock();
        }    
    }).start();
    Thread.sleep(1000);
    //叫醒
    new Thread(() -> {
        try {            
            lock.lock();
            //唤醒
            condition2.signal();
        } finally {
            lock.unlock();
        }
    }).start();
}
```



****



##### 实现原理

###### await

总体流程是将 await 线程包装成 node 节点放入 ConditionObject 的条件队列，如果被唤醒就将 node 转移到 AQS 的执行阻塞队列，等待获取锁，**每个 Condition 对象都包含一个等待队列**

* 开始 Thread-0 持有锁，调用 await，线程进入 ConditionObject 等待，直到被唤醒或打断，调用 await 方法的线程都是持锁状态的，所以说逻辑里**不存在并发**

  ```java
  public final void await() throws InterruptedException {
       // 判断当前线程是否是中断状态，是就直接给个中断异常
      if (Thread.interrupted())
          throw new InterruptedException();
      // 将调用 await 的线程包装成 Node，添加到条件队列并返回
      Node node = addConditionWaiter();
      // 完全释放节点持有的锁，因为其他线程唤醒当前线程的前提是【持有锁】
      int savedState = fullyRelease(node);
      
      // 设置打断模式为没有被打断，状态码为 0
      int interruptMode = 0;
      
      // 如果该节点还没有转移至 AQS 阻塞队列, park 阻塞，等待进入阻塞队列
      while (!isOnSyncQueue(node)) {
          LockSupport.park(this);
          // 如果被打断，退出等待队列，对应的 node 【也会被迁移到阻塞队列】尾部，状态设置为 0
          if ((interruptMode = checkInterruptWhileWaiting(node)) != 0)
              break;
      }
      // 逻辑到这说明当前线程退出等待队列，进入【阻塞队列】
      
      // 尝试枪锁，释放了多少锁就【重新获取多少锁】，获取锁成功判断打断模式
      if (acquireQueued(node, savedState) && interruptMode != THROW_IE)
          interruptMode = REINTERRUPT;
      
      // node 在条件队列时 如果被外部线程中断唤醒，会加入到阻塞队列，但是并未设 nextWaiter = null
      if (node.nextWaiter != null)
          // 清理条件队列内所有已取消的 Node
          unlinkCancelledWaiters();
      // 条件成立说明挂起期间发生过中断
      if (interruptMode != 0)
          // 应用打断模式
          reportInterruptAfterWait(interruptMode);
  }
  ```

  ```java
  // 打断模式 - 在退出等待时重新设置打断状态
  private static final int REINTERRUPT = 1;
  // 打断模式 - 在退出等待时抛出异常
  private static final int THROW_IE = -1;
  ```

  ![](image/JUC-ReentrantLock-%E6%9D%A1%E4%BB%B6%E5%8F%98%E9%87%8F1.webp)

* **创建新的 Node 状态为 -2（Node.CONDITION）**，关联 Thread-0，加入等待队列尾部

  ```java
  private Node addConditionWaiter() {
      // 获取当前条件队列的尾节点的引用，保存到局部变量 t 中
      Node t = lastWaiter;
      // 当前队列中不是空，并且节点的状态不是 CONDITION（-2），说明当前节点发生了中断
      if (t != null && t.waitStatus != Node.CONDITION) {
          // 清理条件队列内所有已取消的 Node
          unlinkCancelledWaiters();
          // 清理完成重新获取 尾节点 的引用
          t = lastWaiter;
      }
      // 创建一个关联当前线程的新 node, 设置状态为 CONDITION(-2)，添加至队列尾部
      Node node = new Node(Thread.currentThread(), Node.CONDITION);
      if (t == null)
          firstWaiter = node;		// 空队列直接放在队首【不用CAS因为执行线程是持锁线程，并发安全】
      else
          t.nextWaiter = node;	// 非空队列队尾追加
      lastWaiter = node;			// 更新队尾的引用
      return node;
  }
  ```

  ```java
  // 清理条件队列内所有已取消（不是CONDITION）的 node，【链表删除的逻辑】
  private void unlinkCancelledWaiters() {
      // 从头节点开始遍历【FIFO】
      Node t = firstWaiter;
      // 指向正常的 CONDITION 节点
      Node trail = null;
      // 等待队列不空
      while (t != null) {
          // 获取当前节点的后继节点
          Node next = t.nextWaiter;
          // 判断 t 节点是不是 CONDITION 节点，条件队列内不是 CONDITION 就不是正常的
          if (t.waitStatus != Node.CONDITION) { 
              // 不是正常节点，需要 t 与下一个节点断开
              t.nextWaiter = null;
              // 条件成立说明遍历到的节点还未碰到过正常节点
              if (trail == null)
                  // 更新 firstWaiter 指针为下个节点
                  firstWaiter = next;
              else
                  // 让上一个正常节点指向 当前取消节点的 下一个节点，【删除非正常的节点】
                  trail.nextWaiter = next;
              // t 是尾节点了，更新 lastWaiter 指向最后一个正常节点
              if (next == null)
                  lastWaiter = trail;
          } else {
              // trail 指向的是正常节点 
              trail = t;
          }
          // 把 t.next 赋值给 t，循环遍历
          t = next; 
      }
  }
  ```

* 接下来 Thread-0 进入 AQS 的 fullyRelease 流程，释放同步器上的锁

  ```java
  // 线程可能重入，需要将 state 全部释放
  final int fullyRelease(Node node) {
      // 完全释放锁是否成功，false 代表成功
      boolean failed = true;
      try {
          // 获取当前线程所持有的 state 值总数
          int savedState = getState();
          // release -> tryRelease 解锁重入锁
          if (release(savedState)) {
              // 释放成功
              failed = false;
              // 返回解锁的深度
              return savedState;
          } else {
              // 解锁失败抛出异常
              throw new IllegalMonitorStateException();
          }
      } finally {
          // 没有释放成功，将当前 node 设置为取消状态
          if (failed)
              node.waitStatus = Node.CANCELLED;
      }
  }
  ```

* fullyRelease 中会 unpark AQS 队列中的下一个节点竞争锁，假设 Thread-1 竞争成功

  ![](image/JUC-ReentrantLock-%E6%9D%A1%E4%BB%B6%E5%8F%98%E9%87%8F2.webp)

* Thread-0 进入 isOnSyncQueue 逻辑判断节点**是否移动到阻塞队列**，没有就 park 阻塞 Thread-0

  ```java
  final boolean isOnSyncQueue(Node node) {
      // node 的状态是 CONDITION，signal 方法是先修改状态再迁移，所以前驱节点为空证明还【没有完成迁移】
      if (node.waitStatus == Node.CONDITION || node.prev == null)
          return false;
      // 说明当前节点已经成功入队到阻塞队列，且当前节点后面已经有其它 node，因为条件队列的 next 指针为 null
      if (node.next != null)
          return true;
  	// 说明【可能在阻塞队列，但是是尾节点】
      // 从阻塞队列的尾节点开始向前【遍历查找 node】，如果查找到返回 true，查找不到返回 false
      return findNodeFromTail(node);
  }
  ```

* await 线程 park 后如果被 unpark 或者被打断，都会进入 checkInterruptWhileWaiting 判断线程是否被打断：**在条件队列被打断的线程需要抛出异常**

  ```java
  private int checkInterruptWhileWaiting(Node node) {
      // Thread.interrupted() 返回当前线程中断标记位，并且重置当前标记位 为 false
      // 如果被中断了，根据是否在条件队列被中断的，设置中断状态码
      return Thread.interrupted() ?(transferAfterCancelledWait(node) ? THROW_IE : REINTERRUPT) : 0;
  }
  ```

  ```java
  // 这个方法只有在线程是被打断唤醒时才会调用
  final boolean transferAfterCancelledWait(Node node) {
      // 条件成立说明当前node一定是在条件队列内，因为 signal 迁移节点到阻塞队列时，会将节点的状态修改为 0
      if (compareAndSetWaitStatus(node, Node.CONDITION, 0)) {
          // 把【中断唤醒的 node 加入到阻塞队列中】
          enq(node);
          // 表示是在条件队列内被中断了，设置为 THROW_IE 为 -1
          return true;
      }
  
      //执行到这里的情况：
      //1.当前node已经被外部线程调用 signal 方法将其迁移到 阻塞队列 内了
      //2.当前node正在被外部线程调用 signal 方法将其迁移至 阻塞队列 进行中状态
      
      // 如果当前线程还没到阻塞队列，一直释放 CPU
      while (!isOnSyncQueue(node))
          Thread.yield();
  
      // 表示当前节点被中断唤醒时不在条件队列了，设置为 REINTERRUPT 为 1
      return false;
  }
  ```

* 最后开始处理中断状态：

  ```java
  private void reportInterruptAfterWait(int interruptMode) throws InterruptedException {
      // 条件成立说明【在条件队列内发生过中断，此时 await 方法抛出中断异常】
      if (interruptMode == THROW_IE)
          throw new InterruptedException();
  
      // 条件成立说明【在条件队列外发生的中断，此时设置当前线程的中断标记位为 true】
      else if (interruptMode == REINTERRUPT)
          // 进行一次自己打断，产生中断的效果
          selfInterrupt();
  }
  ```

  



***



###### signal

* 假设 Thread-1 要来唤醒 Thread-0，进入 ConditionObject 的 doSignal 流程，**取得等待队列中第一个 Node**，即 Thread-0 所在 Node，必须持有锁才能唤醒, 因此 doSignal 内线程安全

  ```java
  public final void signal() {
      // 判断调用 signal 方法的线程是否是独占锁持有线程
      if (!isHeldExclusively())
          throw new IllegalMonitorStateException();
      // 获取条件队列中第一个 Node
      Node first = firstWaiter;
      // 不为空就将第该节点【迁移到阻塞队列】
      if (first != null)
          doSignal(first);
  }
  ```

  ```java
  // 唤醒 - 【将没取消的第一个节点转移至 AQS 队列尾部】
  private void doSignal(Node first) {
      do {
          // 成立说明当前节点的下一个节点是 null，当前节点是尾节点了，队列中只有当前一个节点了
          if ((firstWaiter = first.nextWaiter) == null)
              lastWaiter = null;
          first.nextWaiter = null;
      // 将等待队列中的 Node 转移至 AQS 队列，不成功且还有节点则继续循环
      } while (!transferForSignal(first) && (first = firstWaiter) != null);
  }
  
  // signalAll() 会调用这个函数，唤醒所有的节点
  private void doSignalAll(Node first) {
      lastWaiter = firstWaiter = null;
      do {
          Node next = first.nextWaiter;
          first.nextWaiter = null;
          transferForSignal(first);
          first = next;
      // 唤醒所有的节点，都放到阻塞队列中
      } while (first != null);
  }
  ```

* 执行 transferForSignal，**先将节点的 waitStatus 改为 0，然后加入 AQS 阻塞队列尾部**，将 Thread-3 的 waitStatus 改为 -1

  ```java
  // 如果节点状态是取消, 返回 false 表示转移失败, 否则转移成功
  final boolean transferForSignal(Node node) {
      // CAS 修改当前节点的状态，修改为 0，因为当前节点马上要迁移到阻塞队列了
      // 如果状态已经不是 CONDITION, 说明线程被取消（await 释放全部锁失败）或者被中断（可打断 cancelAcquire）
      if (!compareAndSetWaitStatus(node, Node.CONDITION, 0))
          // 返回函数调用处继续寻找下一个节点
          return false;
      
      // 【先改状态，再进行迁移】
      // 将当前 node 入阻塞队列，p 是当前节点在阻塞队列的【前驱节点】
      Node p = enq(node);
      int ws = p.waitStatus;
      
      // 如果前驱节点被取消或者不能设置状态为 Node.SIGNAL，就 unpark 取消当前节点线程的阻塞状态, 
      // 让 thread-0 线程竞争锁，重新同步状态
      if (ws > 0 || !compareAndSetWaitStatus(p, ws, Node.SIGNAL))
          LockSupport.unpark(node.thread);
      return true;
  }
  ```

  ![](image/JUC-ReentrantLock-%E6%9D%A1%E4%BB%B6%E5%8F%98%E9%87%8F3.webp)

* Thread-1 释放锁，进入 unlock 流程





***



