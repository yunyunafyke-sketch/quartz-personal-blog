---
publish: true
date: 2026-10-12
---

## 一、💡 一句话理解

> [!tip] 核心结论
> `static` 表示成员属于类本身，而不是属于某一个对象。静态成员由同一个类的对象共享，通常使用 `类名.成员名` 访问。

面试时先回答这一句，再展开静态变量、静态方法、静态代码块和 `static final`。

## 二、🧭 理论：它是什么

### 2.1 static 和普通成员有什么区别

```java
class Student {
    // 静态变量：属于 Student 类，所有 Student 对象共享。
    static String schoolName = "第一中学";

    // 实例变量：属于具体对象，每个 Student 都有自己的 name。
    String name;
}
```

| 对比项 | 静态成员 | 实例成员 |
| --- | --- | --- |
| 属于谁 | 类 | 对象 |
| 有多少份 | 同一个类通常一份 | 每个对象一份 |
| 推荐访问方式 | `Student.schoolName` | `student.name` |
| 是否需要先创建对象 | 不需要 | 需要 |
| 能否直接使用 `this` | 不能 | 能 |

### 2.2 static 可以修饰什么

面试常见的四种形式：

```java
class Example {
    static int count;          // 静态变量

    static void print() {      // 静态方法
    }

    static {                   // 静态代码块
        count = 10;
    }

    static class Helper {      // 静态内部类，更准确叫静态嵌套类
    }
}
```

`static` 不能修饰构造方法和普通局部变量。普通顶层类也不能声明为 `static`。

## 三、⚙️ 理论：面试常问什么

### 3.1 static 变量和实例变量有什么区别

静态变量属于类，所有对象共享；实例变量属于对象，每个对象单独保存。

```java
class User {
    static int total;
    String name;
}
```

创建两个 `User` 后：

- `total` 只有一份，两个对象都能看到；
- `name` 有两份，每个对象保存自己的值。

> [!warning] 共享不代表线程安全
> 多个线程同时修改静态变量时，仍可能出现数据竞争。`static` 不提供原子性、可见性或互斥，相关知识见 [[volatile]]、[[AtomicInteger]] 和 [[锁与线程同步]]。

### 3.2 静态方法能直接访问实例变量吗

不能。静态方法属于类，调用时可能还没有创建任何对象，因此 Java 不知道应该访问哪个对象的数据。

```java
class User {
    String name;

    static void printName() {
        // 编译错误：静态方法不知道要读取哪个 User 对象的 name。
        // System.out.println(name);
    }
}
```

如果静态方法获得了具体对象，就可以通过该对象访问：

```java
static void printName(User user) {
    System.out.println(user.name);
}
```

访问规则可以记成：

| 当前位置 | 直接访问静态成员 | 直接访问实例成员 |
| --- | --- | --- |
| 实例方法 | 可以 | 可以 |
| 静态方法 | 可以 | 不可以，必须先获得对象 |

### 3.3 静态方法中为什么不能使用 this

`this` 表示当前对象。静态方法不依赖某个对象调用，所以没有当前对象，也就不能使用 `this`。

```java
class User {
    String name;

    void instanceMethod() {
        // 实例方法针对当前对象执行，可以使用 this。
        System.out.println(this.name);
    }

    static void staticMethod() {
        // 编译错误：静态上下文中没有 this。
        // System.out.println(this.name);
    }
}
```

### 3.4 static 代码块什么时候执行

静态代码块在类初始化时执行，并且对一次类初始化只执行一次。静态字段的显式赋值和静态代码块按照源码中的先后顺序执行。

```java
class InitDemo {
    static int first = print("1. 静态变量");

    static {
        System.out.println("2. 静态代码块");
    }

    static int print(String message) {
        System.out.println(message);
        return 1;
    }
}
```

类的加载、准备和初始化不是同一个阶段，详细过程见 [[2. JVM的类加载机制]]。

### 3.5 static final 一定是常量吗

`static` 表示类共享，[[final]] 表示变量只能赋值一次。两者常一起用于声明常量：

```java
static final int MAX_RETRY_TIMES = 3;
```

但如果保存的是对象引用，`final` 只保证引用不能重新指向其他对象，不保证对象内容不能改变：

```java
import java.util.ArrayList;
import java.util.List;

static final List<String> NAMES = new ArrayList<>();

// 可以修改 List 内部的数据。
NAMES.add("小明");

// 不能让 NAMES 指向另一个 List。
// NAMES = new ArrayList<>();
```

因此，`static final` 引用不等于不可变对象。

### 3.6 static 方法可以被重写吗

不能发生真正的重写。父子类定义同名静态方法叫**方法隐藏（method hiding）**，调用哪个方法由引用的编译时类型决定。

```java
class Parent {
    static void show() {
        System.out.println("Parent");
    }
}

class Child extends Parent {
    static void show() {
        System.out.println("Child");
    }
}

Parent value = new Child();
value.show(); // 输出 Parent
```

实例方法的重写具有运行时多态；静态方法隐藏没有这种效果。

### 3.7 main 方法为什么是 static

```java
public static void main(String[] args) {
}
```

Java 启动器调用程序入口时，还没有当前类的对象。`main` 声明为 `static` 后，就可以直接通过类调用，不需要先创建对象。

### 3.8 static 变量存在哪里

面试时不要简单回答“都在方法区”。更稳妥的说法是：

> 静态字段属于类，它的生命周期通常与对应的 `Class` 一致。具体物理存放位置属于 JVM 实现细节，不能仅凭 Java 语言规范断言所有 JVM 都放在同一个固定区域。

如果面试官继续问 HotSpot 的内存结构，再结合具体 JDK 版本讨论。Java 内存区域见 [[1. JVM运行时数据区]]。

## 四、🚀 实践：把面试题跑一遍

### 4.1 前置准备

只需要 JDK 17 或更高版本，不需要第三方依赖：

```bash
java -version
javac -version
```

### 4.2 这个例子验证什么

下面的完整程序只验证面试高频问题：

1. 静态变量是否被多个对象共享；
2. 实例变量是否属于各自对象；
3. 静态代码块何时执行；
4. 静态方法如何访问实例数据；
5. `static final` 如何使用；
6. 静态方法隐藏和实例方法重写有什么区别。

### 4.3 完整实践：StaticInterviewDemo.java

创建 `StaticInterviewDemo.java`：

```java
public class StaticInterviewDemo {

    public static void main(String[] args) {
        // 第一次主动使用 Student 时，会先初始化 Student 类。
        // 因此静态代码块会在创建第一个对象前执行。
        Student first = new Student("小明");
        Student second = new Student("小红");

        // name 是实例变量，每个对象保存自己的值。
        System.out.println("第一个学生：" + first.name);
        System.out.println("第二个学生：" + second.name);

        // total 是静态变量，两个对象共享同一份计数。
        System.out.println("学生总数：" + Student.total);

        // static final 常量通过类名访问。
        System.out.println("学校名称：" + Student.SCHOOL_NAME);

        // 静态方法没有 this，但可以通过传入的对象读取实例变量。
        Student.printName(first);

        // 静态方法发生隐藏：调用结果由引用的编译时类型决定。
        Parent parent = new Child();
        parent.staticMethod();

        // 实例方法发生重写：运行时调用实际对象 Child 的方法。
        parent.instanceMethod();
    }

    static class Student {
        // static final：属于类，并且不能重新赋值。
        static final String SCHOOL_NAME = "第一中学";

        // 静态变量：所有 Student 对象共享。
        static int total;

        // 实例变量：每个 Student 对象各自保存。
        String name;

        static {
            // 类初始化时执行一次。
            System.out.println("Student 静态代码块执行");
        }

        Student(String name) {
            // this 代表当前创建的 Student 对象。
            this.name = name;

            // 每创建一个对象，共享计数加一。
            total++;
        }

        static void printName(Student student) {
            // 静态方法通过明确的对象访问实例变量。
            System.out.println("静态方法打印姓名：" + student.name);
        }
    }

    static class Parent {
        static void staticMethod() {
            System.out.println("Parent 静态方法");
        }

        void instanceMethod() {
            System.out.println("Parent 实例方法");
        }
    }

    static class Child extends Parent {
        // 这是静态方法隐藏，不是重写。
        static void staticMethod() {
            System.out.println("Child 静态方法");
        }

        // 这是实例方法重写，具有运行时多态。
        @Override
        void instanceMethod() {
            System.out.println("Child 实例方法");
        }
    }
}
```

编译并运行：

```bash
javac StaticInterviewDemo.java
java StaticInterviewDemo
```

预期输出：

```text
Student 静态代码块执行
第一个学生：小明
第二个学生：小红
学生总数：2
学校名称：第一中学
静态方法打印姓名：小明
Parent 静态方法
Child 实例方法
```

结果说明：

- 静态代码块只输出一次；
- 两个对象共享 `total`，最终值是 `2`；
- 两个对象的 `name` 互不影响；
- `parent.staticMethod()` 调用 `Parent`，说明静态方法是隐藏；
- `parent.instanceMethod()` 调用 `Child`，说明实例方法发生了重写。

### 4.4 高频报错：静态方法直接访问实例变量

```java
class User {
    String name;

    static void print() {
        // 编译错误：non-static variable name cannot be referenced
        // from a static context
        System.out.println(name);
    }
}
```

原因：静态方法没有当前对象，不知道应该读取哪个 `name`。

不要为了消除报错就随手把 `name` 改成 `static`。如果姓名属于具体用户，应把 `print()` 改成实例方法，或者向静态方法传入一个 `User` 对象。

## 五、📌 总结

- `static` 成员属于类，实例成员属于对象。
- 静态方法没有 `this`，不能直接访问实例成员。
- 静态代码块在类初始化时执行，一次类初始化只执行一次。
- `static final` 引用不能重新赋值，但对象内容仍可能可变。
- 静态方法在继承中是隐藏，不是重写。
- `static` 共享变量不会自动获得线程安全。

面试记忆句：**类共享用 `static`，对象独有不用 `static`；静态方法没有当前对象，所以没有 `this`。**

## 六、📚 官方资料

- [Oracle Java Tutorial：Understanding Class Members](https://docs.oracle.com/javase/tutorial/java/javaOO/classvars.html)
- [Java Language Specification 21：Classes](https://docs.oracle.com/javase/specs/jls/se21/html/jls-8.html)
- [Java Language Specification 21：Initialization of Classes and Interfaces](https://docs.oracle.com/javase/specs/jls/se21/html/jls-12.html#jls-12.4)
