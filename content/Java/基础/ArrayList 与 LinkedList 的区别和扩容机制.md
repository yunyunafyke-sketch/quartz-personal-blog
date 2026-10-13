---
title: ArrayList 与 LinkedList 的区别和扩容机制
date: 2026-10-10 10:20:31
publish: true
---

## 一、💡 一句话理解

> [!tip] 记忆口诀
> `ArrayList` 像电影院座位，按座位号找人快；`LinkedList` 像手拉手排队，找中间的人慢，但操作队首、队尾方便。

## 二、📋 核心区别

| 对比项 | ArrayList | LinkedList |
|---|---|---|
| 底层结构 | 数组 | 双向链表 |
| 按下标查询 | 快，`O(1)` | 慢，`O(n)` |
| 头部增删 | 慢，需要移动元素 | 快，`O(1)` |
| 内存占用 | 较小 | 较大，要保存前后指针 |
| 适合场景 | 查询、遍历多 | 经常操作队首和队尾 |

> [!warning] 不要死记
> `LinkedList` 在中间插入不一定快。调用 `add(index, value)` 时，它要先找到对应节点，寻找过程仍然是 `O(n)`。

## 三、⚙️ ArrayList 怎么扩容

### 3.1 扩容过程

数组满了以后：

```text
创建更大的数组 → 复制旧元素 → 加入新元素
```

当前常见 OpenJDK 实现优先扩容为原来的约 `1.5` 倍：

```text
10 → 15 → 22 → 33……
```

扩容需要复制元素，所以知道数据量时，可以提前指定容量：

```java
// 预计保存 1000 个元素，减少中途扩容。
List<String> list = new ArrayList<>(1000);
```

> [!info] 注意
> “约 1.5 倍”是当前 OpenJDK 的实现策略，不是 Java API 永远不变的规定。

### 3.2 LinkedList 为什么不用扩容

`LinkedList` 每添加一个元素，就创建一个新节点并接到链表上：

```text
[A] ⇄ [B] ⇄ [C]
```

它没有固定长度的数组，因此没有“容量”，也就不需要整体扩容。

## 四、🚀 最小例子

```java
import java.util.ArrayList;
import java.util.LinkedList;
import java.util.List;

public class ListDemo {
    public static void main(String[] args) {
        // ArrayList：适合查询和遍历。
        List<String> names = new ArrayList<>();
        names.add("小明");
        names.add("小红");
        System.out.println(names.get(1)); // 小红

        // LinkedList：适合操作队首和队尾。
        LinkedList<String> tasks = new LinkedList<>();
        tasks.addLast("普通任务");
        tasks.addFirst("紧急任务");
        System.out.println(tasks.removeFirst()); // 紧急任务
    }
}
```

运行：

```bash
javac -encoding UTF-8 ListDemo.java
java ListDemo
```

输出：

```text
小红
紧急任务
```

## 五、📌 怎么选择

- 不知道选哪个：选 `ArrayList`。
- 查询、遍历多：选 `ArrayList`。
- 经常操作队首、队尾：考虑 `LinkedList`，纯队列场景通常也可以使用 `ArrayDeque`。
- 已知元素数量：给 `ArrayList` 设置初始容量。

最后只记一句：

> `ArrayList` 查得快，满了要搬家；`LinkedList` 不扩容，但找中间慢。

相关面试复习：[[../面试题/Java基础面试题]]、[[../面试所学到的/2.ArrayList参数传递与引用重新赋值]]。

## 六、🔗 官方资料

- [ArrayList API](https://docs.oracle.com/en/java/javase/26/docs/api/java.base/java/util/ArrayList.html)
- [LinkedList API](https://docs.oracle.com/en/java/javase/26/docs/api/java.base/java/util/LinkedList.html)
- [OpenJDK ArrayList 源码](https://github.com/openjdk/jdk/blob/master/src/java.base/share/classes/java/util/ArrayList.java)
