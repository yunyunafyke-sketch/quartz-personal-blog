---
title: HashSet
date: 2026-10-12
publish: true
---

> [!tip] 面试主线
> `HashSet` 的面试题抓住四点：**元素不重复、底层是 HashMap、依靠 hashCode 和 equals 去重、顺序不保证**。

## 一、💡 一句话理解

`HashSet` 是 `Set` 接口的常用实现，适合做**去重**和**快速判断元素是否存在**。

它没有索引，不保证遍历顺序，并且不是线程安全的。

## 二、🧭 理论：它是什么

### 2.1 核心特点

| 特点 | 含义 |
|---|---|
| 元素不重复 | 相等的元素只保留一份 |
| 没有索引 | 不能像 `List` 一样通过下标取值 |
| 顺序不保证 | 遍历顺序不一定等于插入顺序 |
| 允许 `null` | 最多保存一个 `null` |
| 查询通常很快 | 哈希分布合理时，`add`、`remove`、`contains` 通常是 `O(1)` |
| 非线程安全 | 多线程并发修改时不能直接共享使用 |

### 2.2 常见集合怎么选

| 需求 | 选择 |
|---|---|
| 允许重复、需要下标 | `ArrayList` |
| 只去重，不关心顺序 | `HashSet` |
| 去重并保留插入顺序 | `LinkedHashSet` |
| 去重并排序 | `TreeSet` |

## 三、⚙️ 理论：它是怎么工作的

### 3.1 底层结构

`HashSet` 底层由 `HashMap` 支持。放入 `HashSet` 的元素，实际作为 `HashMap` 的 Key 保存；Value 只是内部占位对象。

```text
HashSet.add(element)
        ↓
HashMap.put(element, 占位对象)
        ↓
利用 Key 不重复，实现元素去重
```

底层细节可结合 [[HashMap]] 一起复习。

### 3.2 怎样判断元素重复

添加元素时，可以简化为两步：

1. 调用 `hashCode()` 定位元素可能所在的桶。
2. 再用 `equals()` 判断桶中是否已有相等元素。

```java
Set<String> names = new HashSet<>();

System.out.println(names.add("张三")); // true：添加成功
System.out.println(names.add("张三")); // false：已存在，集合不变
```

> [!warning] 必须记住的约定
> 两个对象如果 `equals()` 相等，`hashCode()` 必须相同；但 `hashCode()` 相同，两个对象不一定相等，因为可能发生哈希冲突。

### 3.3 自定义对象为什么可能去重失败

如果不重写 `equals()` 和 `hashCode()`，两个字段内容相同的普通对象仍可能被当成不同对象。

下面规定“用户 ID 相同就是同一个用户”：

```java
import java.util.Objects;

final class User {
    private final int id;
    private final String name;

    User(int id, String name) {
        this.id = id;
        this.name = name;
    }

    @Override
    public boolean equals(Object object) {
        if (this == object) {
            return true;
        }
        if (!(object instanceof User other)) {
            return false;
        }
        return id == other.id;
    }

    @Override
    public int hashCode() {
        // 必须使用与 equals 相同的身份字段。
        return Objects.hash(id);
    }
}
```

对象加入 `HashSet` 后，不要修改参与 `equals()` 和 `hashCode()` 的字段，否则 `contains()`、`remove()` 可能找不到它。上例把 `id` 设为 `final`，就是为了避免这个问题。

## 四、🚀 实践：常用写法

### 4.1 前置准备

只需要 JDK 自带的 `java.util.HashSet`，不需要第三方依赖。

### 4.2 可以拿来干什么

- 把 `List` 中的重复数据去掉。
- 用 `contains()` 快速判断元素是否存在。
- 利用 `add()` 的返回值判断元素是否第一次出现。

### 4.3 完整实践：去重与判断重复

新建 `HashSetDemo.java`：

```java
import java.util.HashSet;
import java.util.List;
import java.util.Set;

public class HashSetDemo {
    public static void main(String[] args) {
        // 把允许重复的 List 转为 Set，完成去重。
        List<String> tags = List.of("Java", "Redis", "Java");
        Set<String> uniqueTags = new HashSet<>(tags);

        System.out.println(uniqueTags.size());            // 2
        System.out.println(uniqueTags.contains("Java")); // true

        // add 的返回值可直接判断元素是否第一次出现。
        System.out.println(uniqueTags.add("MySQL")); // true
        System.out.println(uniqueTags.add("MySQL")); // false
    }
}
```

不要断言 `uniqueTags` 的打印顺序，因为 `HashSet` 没有顺序保证。

编译并运行：

```bash
javac HashSetDemo.java
java HashSetDemo
```

预期输出中的四个值依次为 `2`、`true`、`true`、`false`。

## 五、🎤 面试时怎么流利地说

### 5.1 回答路线

按这条线回答即可：

```text
是什么 → 有什么特点 → 底层怎么实现 → 怎样判断重复 → 使用边界
```

### 5.2 30 秒标准回答

> `HashSet` 是 `Set` 接口的常用实现，主要用于元素去重和快速判断元素是否存在。它底层使用 `HashMap`，元素作为 Key 保存。添加元素时，先根据 `hashCode()` 定位桶，再通过 `equals()` 判断是否重复。哈希分布合理时，添加、删除和查询通常是 `O(1)`。它不保证遍历顺序，也不是线程安全的；自定义对象作为元素时，需要正确重写 `equals()` 和 `hashCode()`。

### 5.3 1—2 分钟展开回答

> `HashSet` 的特点是元素不重复、没有索引、遍历顺序不保证，并且允许一个 `null`。它底层由 `HashMap` 支持，放入集合的元素会作为 Map 的 Key。
>
> 调用 `add()` 时，会先通过元素的 `hashCode()` 定位桶。如果桶中存在候选元素，再用 `equals()` 判断是否真的相等。若已存在相等元素，集合保持不变，`add()` 返回 `false`；否则保存元素并返回 `true`。因此，自定义对象要用同一组业务身份字段实现 `equals()` 和 `hashCode()`。
>
> 哈希分布合理时，`add()`、`remove()` 和 `contains()` 通常是 `O(1)`。使用时不能依赖它的遍历顺序，也不要在元素加入后修改参与相等判断的字段。如果需要保留插入顺序，我会使用 `LinkedHashSet`；需要排序则使用 `TreeSet`；并发修改场景则选择合适的同步或并发方案。

### 5.4 高频追问与短答

**1. 为什么同时重写 `equals()` 和 `hashCode()`？**

`hashCode()` 用于定位桶，`equals()` 用于确认对象是否相等。只重写其中一个会破坏两者约定，可能导致逻辑上重复的对象无法去重。

**2. `hashCode()` 相同，对象一定相等吗？**

不一定。不同对象可能产生相同哈希值，这就是哈希冲突，还要继续用 `equals()` 判断。

**3. HashSet 和 HashMap 有什么关系？**

`HashSet` 底层使用 `HashMap`。Set 中的元素作为 Map 的 Key，利用 Key 的唯一性实现去重。

**4. HashSet 为什么不能保证顺序？**

元素的位置由哈希结果和内部容量决定，扩容后位置还可能变化。如果需要插入顺序，使用 `LinkedHashSet`。

**5. HashSet 是线程安全的吗？**

不是。并发修改时可以进行外部同步，或根据具体读写特点选择并发集合，不能把 fail-fast 异常当成线程安全保证。

## 六、📌 总结

- 用途：去重、快速判断是否存在。
- 结构：底层是 `HashMap`，元素作为 Key。
- 去重：先用 `hashCode()` 定位，再用 `equals()` 确认。
- 边界：不保证顺序、非线程安全、不要修改哈希关键字段。
- 选型：保序用 `LinkedHashSet`，排序用 `TreeSet`。

> [!tip] 记忆句
> `HashSet`：底层 Map 存 Key，hash 定位，equals 判重；顺序不保，并发不安全。

## 七、📚 官方资料

- [Java SE 25 API：HashSet](https://docs.oracle.com/en/java/javase/25/docs/api/java.base/java/util/HashSet.html)
- [Java SE 25 API：Set](https://docs.oracle.com/en/java/javase/25/docs/api/java.base/java/util/Set.html)
- [Java 官方教程：Set 的常用实现](https://docs.oracle.com/javase/tutorial/collections/implementations/set.html)

> 本文依据 Java SE 25 API 整理，查阅日期：2026-10-12。Oracle Collections 教程页面基于 JDK 8，仅用于集合选型顺序参考。
