---
title: 11-AQS
date: 2026-11-05 00:00:00
publish: true
---

# 11-AQS

[返回 JUC 导航](00-目录.md)

## 同步器

### AQS

#### 核心思想

AQS：AbstractQueuedSynchronizer，是阻塞式锁和相关的同步器工具的框架，许多同步类实现都依赖于该同步器

AQS 用状态属性来表示资源的状态（分**独占模式和共享模式**），子类需要定义如何维护这个状态，控制如何获取锁和释放锁

* 独占模式是只有一个线程能够访问资源，如 ReentrantLock
* 共享模式允许多个线程访问资源，如 Semaphore，ReentrantReadWriteLock 是组合式

AQS 核心思想：

* 如果被请求的共享资源空闲，则将当前请求资源的线程设置为有效的工作线程，并将共享资源设置锁定状态

* 请求的共享资源被占用，AQS 用队列实现线程阻塞等待以及被唤醒时锁分配的机制，将暂时获取不到锁的线程加入到队列中

  CLH 是一种基于单向链表的**高性能、公平的自旋锁**，AQS 是将每条请求共享资源的线程封装成一个 CLH 锁队列的一个结点（Node）来实现锁的分配

  <img src="image/JUC-AQS%E5%8E%9F%E7%90%86%E5%9B%BE.webp" style="zoom: 80%;" />



***



#### 设计原理

设计原理：

* 获取锁：

  ```java
  while(state 状态不允许获取) {	// tryAcquire(arg)
      if(队列中还没有此线程) {
          入队并阻塞 park
      }
  }
  当前线程出队
  ```

* 释放锁：

  ```java
  if(state 状态允许了) {	// tryRelease(arg)
  	恢复阻塞的线程(s) unpark
  }
  ```

AbstractQueuedSynchronizer 中 state 设计：

* state 使用了 32bit int 来维护同步状态，独占模式 0 表示未加锁状态，大于 0 表示已经加锁状态

  ```java
  private volatile int state;
  ```

* state **使用 volatile 修饰配合 cas** 保证其修改时的原子性

* state 表示**线程重入的次数（独占模式）或者剩余许可数（共享模式）**

* state API：

  * `protected final int getState()`：获取 state 状态
  * `protected final void setState(int newState)`：设置 state 状态
  * `protected final boolean compareAndSetState(int expect,int update)`：**CAS** 安全设置 state

封装线程的 Node 节点中 waitstate 设计：

* 使用 **volatile 修饰配合 CAS** 保证其修改时的原子性

* 表示 Node 节点的状态，有以下几种状态：

  ```java
  // 默认为 0
  volatile int waitStatus;
  // 由于超时或中断，此节点被取消，不会再改变状态
  static final int CANCELLED =  1;
  // 此节点后面的节点已（或即将）被阻止（通过park），【当前节点在释放或取消时必须唤醒后面的节点】
  static final int SIGNAL    = -1;
  // 此节点当前在条件队列中
  static final int CONDITION = -2;
  // 将releaseShared传播到其他节点
  static final int PROPAGATE = -3;
  ```

阻塞恢复设计：

* 使用 park & unpark 来实现线程的暂停和恢复，因为命令的先后顺序不影响结果
* park & unpark 是针对线程的，而不是针对同步器的，因此控制粒度更为精细
* park 线程可以通过 interrupt 打断

队列设计：

* 使用了 FIFO 先入先出队列，并不支持优先级队列，**同步队列是双向链表，便于出队入队**

  ```java
  // 头结点，指向哑元节点
  private transient volatile Node head;
  // 阻塞队列的尾节点，阻塞队列不包含头结点，从 head.next → tail 认为是阻塞队列
  private transient volatile Node tail;
  
  static final class Node {
      // 枚举：共享模式
      static final Node SHARED = new Node();
      // 枚举：独占模式
      static final Node EXCLUSIVE = null;
      // node 需要构建成 FIFO 队列，prev 指向前继节点
      volatile Node prev;
      // next 指向后继节点
      volatile Node next;
      // 当前 node 封装的线程
      volatile Thread thread;
      // 条件队列是单向链表，只有后继指针，条件队列使用该属性
      Node nextWaiter;
  }
  ```

  ![](image/JUC-AQS%E9%98%9F%E5%88%97%E8%AE%BE%E8%AE%A1.webp)

* 条件变量来实现等待、唤醒机制，支持多个条件变量，类似于 Monitor 的 WaitSet，**条件队列是单向链表**

  ````java
   public class ConditionObject implements Condition, java.io.Serializable {
       // 指向条件队列的第一个 node 节点
       private transient Node firstWaiter;
       // 指向条件队列的最后一个 node 节点
       private transient Node lastWaiter;
   }
  ````

  



***



#### 模板对象

同步器的设计是基于模板方法模式，该模式是基于继承的，主要是为了在不改变模板结构的前提下在子类中重新定义模板中的内容以实现复用代码

* 使用者继承 `AbstractQueuedSynchronizer` 并重写指定的方法
* 将 AQS 组合在自定义同步组件的实现中，并调用其模板方法，这些模板方法会调用使用者重写的方法

AQS 使用了模板方法模式，自定义同步器时需要重写下面几个 AQS 提供的模板方法：

```java
isHeldExclusively()		//该线程是否正在独占资源。只有用到condition才需要去实现它
tryAcquire(int)			//独占方式。尝试获取资源，成功则返回true，失败则返回false
tryRelease(int)			//独占方式。尝试释放资源，成功则返回true，失败则返回false
tryAcquireShared(int)	//共享方式。尝试获取资源。负数表示失败；0表示成功但没有剩余可用资源；正数表示成功且有剩余资源
tryReleaseShared(int)	//共享方式。尝试释放资源，成功则返回true，失败则返回false
```

* 默认情况下，每个方法都抛出 `UnsupportedOperationException`
* 这些方法的实现必须是内部线程安全的
* AQS 类中的其他方法都是 final ，所以无法被其他类使用，只有这几个方法可以被其他类使用



***



#### 自定义

自定义一个不可重入锁：

```java
class MyLock implements Lock {
    //独占锁 不可重入
    class MySync extends AbstractQueuedSynchronizer {
        @Override
        protected boolean tryAcquire(int arg) {
            if (compareAndSetState(0, 1)) {
                // 加上锁 设置 owner 为当前线程
                setExclusiveOwnerThread(Thread.currentThread());
                return true;
            }
            return false;
        }
        @Override   //解锁
        protected boolean tryRelease(int arg) {
            setExclusiveOwnerThread(null);
            setState(0);//volatile 修饰的变量放在后面，防止指令重排
            return true;
        }
        @Override   //是否持有独占锁
        protected boolean isHeldExclusively() {
            return getState() == 1;
        }
        public Condition newCondition() {
            return new ConditionObject();
        }
    }

    private MySync sync = new MySync();

    @Override   //加锁（不成功进入等待队列等待）
    public void lock() {
        sync.acquire(1);
    }

    @Override   //加锁 可打断
    public void lockInterruptibly() throws InterruptedException {
        sync.acquireInterruptibly(1);
    }

    @Override   //尝试加锁，尝试一次
    public boolean tryLock() {
        return sync.tryAcquire(1);
    }

    @Override   //尝试加锁，带超时
    public boolean tryLock(long time, TimeUnit unit) throws InterruptedException {
        return sync.tryAcquireNanos(1, unit.toNanos(time));
    }
    
    @Override   //解锁
    public void unlock() {
        sync.release(1);
    }
    
    @Override   //条件变量
    public Condition newCondition() {
        return sync.newCondition();
    }
}
```





***



