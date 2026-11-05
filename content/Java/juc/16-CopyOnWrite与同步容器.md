---
title: 16-CopyOnWrite与同步容器
date: 2026-11-05 00:00:00
publish: true
---

# 16-CopyOnWrite与同步容器

[返回 JUC 导航](00-目录.md)

### CopyOnWrite

#### 原理分析

CopyOnWriteArrayList 采用了**写入时拷贝**的思想，增删改操作会将底层数组拷贝一份，在新数组上执行操作，不影响其它线程的**并发读，读写分离**

CopyOnWriteArraySet 底层对 CopyOnWriteArrayList 进行了包装，装饰器模式

```java
public CopyOnWriteArraySet() {
    al = new CopyOnWriteArrayList<E>();
}
```

* 存储结构：

  ```java
  private transient volatile Object[] array;	// volatile 保证了读写线程之间的可见性
  ```

* 全局锁：保证线程的执行安全

  ```java
  final transient ReentrantLock lock = new ReentrantLock();
  ```
  
* 新增数据：需要加锁，**创建新的数组操作**

  ```java
  public boolean add(E e) {
      final ReentrantLock lock = this.lock;
      // 加锁，保证线程安全
      lock.lock();
      try {
          // 获取旧的数组
          Object[] elements = getArray();
          int len = elements.length;
          // 【拷贝新的数组（这里是比较耗时的操作，但不影响其它读线程）】
          Object[] newElements = Arrays.copyOf(elements, len + 1);
          // 添加新元素
          newElements[len] = e;
          // 替换旧的数组，【这个操作以后，其他线程获取数组就是获取的新数组了】
          setArray(newElements);
          return true;
      } finally {
          lock.unlock();
      }
  }
  ```

* 读操作：不加锁，**在原数组上操作**

  ```java
  public E get(int index) {
      return get(getArray(), index);
  }
  private E get(Object[] a, int index) {
      return (E) a[index];
  }
  ```

  适合读多写少的应用场景

* 迭代器：CopyOnWriteArrayList 在返回迭代器时，**创建一个内部数组当前的快照（引用）**，即使其他线程替换了原始数组，迭代器遍历的快照依然引用的是创建快照时的数组，所以这种实现方式也存在一定的数据延迟性，对其他线程并行添加的数据不可见

  ```java
  public Iterator<E> iterator() {
      // 获取到数组引用，整个遍历的过程该数组都不会变，一直引用的都是老数组，
      return new COWIterator<E>(getArray(), 0);
  }
  
  // 迭代器会创建一个底层array的快照，故主类的修改不影响该快照
  static final class COWIterator<E> implements ListIterator<E> {
      // 内部数组快照
      private final Object[] snapshot;
  
      private COWIterator(Object[] elements, int initialCursor) {
          cursor = initialCursor;
          // 数组的引用在迭代过程不会改变
          snapshot = elements;
      }
      // 【不支持写操作】，因为是在快照上操作，无法同步回去
      public void remove() {
          throw new UnsupportedOperationException();
      } 
  }
  ```
  
  

***



#### 弱一致性

数据一致性就是读到最新更新的数据：

* 强一致性：当更新操作完成之后，任何多个后续进程或者线程的访问都会返回最新的更新过的值

* 弱一致性：系统并不保证进程或者线程的访问都会返回最新的更新过的值，也不会承诺多久之后可以读到

<img src="image/JUC-CopyOnWriteArrayList%E5%BC%B1%E4%B8%80%E8%87%B4%E6%80%A7.webp" style="zoom:80%;" />

| 时间点 | 操作                         |
| ------ | ---------------------------- |
| 1      | Thread-0 getArray()          |
| 2      | Thread-1 getArray()          |
| 3      | Thread-1 setArray(arrayCopy) |
| 4      | Thread-0 array[index]        |

Thread-0 读到了脏数据

不一定弱一致性就不好

* 数据库的**事务隔离级别**就是弱一致性的表现
* 并发高和一致性是矛盾的，需要权衡



***



#### 安全失败

在 java.util 包的集合类就都是快速失败的，而 java.util.concurrent 包下的类都是安全失败

* 快速失败：在 A 线程使用**迭代器**对集合进行遍历的过程中，此时 B 线程对集合进行修改（增删改），或者 A 线程在遍历过程中对集合进行修改，都会导致 A 线程抛出 ConcurrentModificationException 异常
  * AbstractList 类中的成员变量 modCount，用来记录 List 结构发生变化的次数，**结构发生变化**是指添加或者删除至少一个元素的操作，或者是调整内部数组的大小，仅仅设置元素的值不算结构发生变化
  * 在进行序列化或者迭代等操作时，需要比较操作前后 modCount 是否改变，如果改变了抛出 CME 异常
  
* 安全失败：采用安全失败机制的集合容器，在**迭代器**遍历时直接在原集合数组内容上访问，但其他线程的增删改都会新建数组进行修改，就算修改了集合底层的数组容器，迭代器依然引用着以前的数组（**快照思想**），所以不会出现异常

  ConcurrentHashMap 不会出现并发时的迭代异常，因为在迭代过程中 CHM 的迭代器并没有判断结构的变化，迭代器还可以根据迭代的节点状态去寻找并发扩容时的新表进行迭代

  ```java
  ConcurrentHashMap map = new ConcurrentHashMap();
  // KeyIterator
  Iterator iterator = map.keySet().iterator();
  ```

  ```java
   Traverser(Node<K,V>[] tab, int size, int index, int limit) {
       // 引用还是原来集合的 Node 数组，所以其他线程对数据的修改是可见的
       this.tab = tab;
       this.baseSize = size;
       this.baseIndex = this.index = index;
       this.baseLimit = limit;
       this.next = null;
   }
  ```

  ```java
  public final boolean hasNext() { return next != null; }
  public final K next() {
      Node<K,V> p;
      if ((p = next) == null)
          throw new NoSuchElementException();
      K k = p.key;
      lastReturned = p;
      // 在方法中进行下一个节点的获取，会进行槽位头节点的状态判断
      advance();
      return k;
  }
  ```

  



***



### Collections

Collections类是用来操作集合的工具类，提供了集合转换成线程安全的方法：

```java
 public static <T> Collection<T> synchronizedCollection(Collection<T> c) {
     return new SynchronizedCollection<>(c);
 }
public static <K,V> Map<K,V> synchronizedMap(Map<K,V> m) {
    return new SynchronizedMap<>(m);
}
```

源码：底层也是对方法进行加锁

```java
public boolean add(E e) {
    synchronized (mutex) {return c.add(e);}
}
```



***



