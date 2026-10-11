---
title: ArrayList 参数传递与引用重新赋值
date: 2026-10-12
publish: true
---

## 一、💡 一句话理解

> [!tip] 核心结论
> Java 只有值传递。把 `ArrayList` 传给方法时，传递的是“引用值的副本”：通过副本修改同一个对象，调用方能看到；让副本改为指向新对象，调用方看不到。

## 二、🧭 理论：这道题在考什么

### 2.1 表面考 ArrayList，实际考引用传递规则

这类题通常包含四个考点：

| 考点 | 面试时应该说明 |
| --- | --- |
| Java 参数传递 | 无论基本类型还是引用类型，都是值传递 |
| 引用与对象 | `list` 是引用变量，`new ArrayList<>()` 创建的才是对象 |
| 修改对象 | `list.add("2")` 会修改引用指向的集合对象 |
| 引用重新赋值 | `list = new ArrayList<>()` 只改变当前方法里的引用副本 |

### 2.2 同名变量是不是同一个变量

不是。同名变量如果位于不同方法中，就属于不同的局部作用域：

```java
public static void main(String[] args) {
    // 这个 list 只属于 main 方法。
    List<String> list = new ArrayList<>();
}

private static void test() {
    // 这个 list 只属于 test 方法，与 main.list 没有关系。
    List<String> list = new ArrayList<>();
}
```

变量名相同，不代表两个变量保存着相同的引用，更不代表它们指向同一个对象。

> [!warning] 同一作用域不能重复声明
> 如果方法形参已经叫 `list`，方法体中不能再写 `List<String> list = ...`。可以给形参重新赋值，但不能重复声明。

```java
private static void change(List<String> list) {
    // 编译错误：变量 list 已经由形参声明。
    // List<String> list = new ArrayList<>();

    // 可以编译：这是给现有形参重新赋值。
    list = new ArrayList<>();
}
```

## 三、⚙️ 理论：它是怎么工作的

### 3.1 调用方法时复制的是引用值

假设 `main` 方法创建了集合 A，并加入字符串 `"1"`：

```java
List<String> list = new ArrayList<>();
list.add("1");
change(list);
```

刚进入 `change` 方法时，两个不同的引用变量暂时指向同一个对象：

```text
main.list   ──┐
              ├──> 集合 A ["1"]
change.list ──┘
```

这里不是把 `main.list` 本身交给了方法，而是复制了它保存的引用值。

### 3.2 `add` 修改的是同一个对象

如果方法执行：

```java
list.add("2");
```

它通过引用找到集合 A，然后修改集合 A：

```text
main.list   ──┐
              ├──> 集合 A ["1", "2"]
change.list ──┘
```

方法结束后，`main.list` 仍然指向集合 A，所以调用方能看到 `"2"`。

### 3.3 `new` 后重新赋值只改变引用副本

如果方法执行：

```java
list = new ArrayList<>();
list.add("2");
```

方法里的引用副本改为指向集合 B：

```text
main.list   ─────> 集合 A ["1"]

change.list ─────> 集合 B ["2"]
```

集合 A 没有被修改。方法结束后，局部变量 `change.list` 消失，`main.list` 仍指向集合 A，因此最终打印 `[1]`。

### 3.4 `static` 与结果无关

`static` 只表示方法属于类，可以不创建类的实例就调用它。方法是否为 `static`，不会改变 Java 的参数传递规则。

## 四、🚀 实践：从代码到验证

### 4.1 前置准备

只需要安装 JDK。下面代码不依赖第三方库，可以直接使用 `javac` 和 `java` 运行。

### 4.2 可以拿来干什么

这组例子可以用于：

- 判断方法执行后集合内容是否变化；
- 区分“修改对象”和“修改引用”；
- 回答 Java 是值传递还是引用传递；
- 排查方法里重新创建对象后，调用方为什么没有拿到新对象。

面试时可以先说结论，再画两个引用指向同一对象的图，最后逐行判断代码究竟修改了对象还是引用。

### 4.3 完整实践：复盘两道题

将下面代码保存为 `ArrayListReferenceDemo.java`：

```java
import java.util.ArrayList;
import java.util.List;

public class ArrayListReferenceDemo {

    public static void main(String[] args) {
        // 第一题：方法里重新创建集合并给形参赋值。
        List<String> firstList = new ArrayList<>();
        firstList.add("1");

        replaceList(firstList);
        System.out.println("第一题，main 方法内：" + firstList);

        // 第二题：方法通过引用直接修改原集合。
        List<String> secondList = new ArrayList<>();
        secondList.add("1");

        modifyList(secondList);
        System.out.println("第二题，main 方法内：" + secondList);

        // 如果确实需要替换调用方使用的集合，应返回新引用并接收它。
        secondList = createNewList(secondList);
        System.out.println("接收返回值后：" + secondList);
    }

    private static void replaceList(List<String> list) {
        // 形参 list 是引用值的副本。
        // 重新赋值只让这个副本指向新集合，不会改变调用方的 firstList。
        list = new ArrayList<>();
        list.add("2");
        System.out.println("第一题，replaceList 方法内：" + list);
    }

    private static void modifyList(List<String> list) {
        // 这里没有更换引用，而是修改两个引用共同指向的集合对象。
        list.add("2");
    }

    private static List<String> createNewList(List<String> list) {
        // 参数在这个例子中没有实际用途，只用于对应原面试题的形式。
        list = new ArrayList<>();
        list.add("3");

        // 返回新引用，调用方接收后才能改为使用这个新集合。
        return list;
    }
}
```

编译并运行：

```bash
javac -encoding UTF-8 ArrayListReferenceDemo.java
java ArrayListReferenceDemo
```

预期输出：

```text
第一题，replaceList 方法内：[2]
第一题，main 方法内：[1]
第二题，main 方法内：[1, 2]
接收返回值后：[3]
```

### 4.4 常见追问

**问：Java 到底是值传递还是引用传递？**

答：只有值传递。引用类型传递的是引用值的副本，不是“引用本身”。

**问：为什么方法里 `add` 有效，重新 `new` 却无效？**

答：`add` 修改的是共享对象；重新 `new` 并赋值修改的是局部引用副本的指向。

**问：怎样让调用方使用方法里创建的新集合？**

答：把新集合作为返回值返回，并在调用方重新赋值；也可以根据业务需要，把集合封装为对象字段再通过方法修改。

**问：把方法改成非 `static`，结果会变化吗？**

答：不会。`static` 与参数的值传递规则无关。

## 五、📌 总结

- Java 只有值传递。
- 引用变量和它指向的对象是两回事。
- `list.add(...)` 修改对象，调用方可以看到。
- `list = new ArrayList<>()` 修改形参的指向，调用方看不到。
- 不同方法中的同名局部变量彼此独立。

面试记忆句：

> 修改引用指向的对象，调用方能看到；修改引用变量本身的指向，调用方看不到。

相关知识：[[../基础/ArrayList 与 LinkedList 的区别和扩容机制]]。

## 六、🔗 官方资料

- [Oracle Java Tutorial：Passing Information to a Method or a Constructor](https://docs.oracle.com/javase/tutorial/java/javaOO/arguments.html)
- [Oracle Java API：ArrayList](https://docs.oracle.com/en/java/javase/26/docs/api/java.base/java/util/ArrayList.html)

