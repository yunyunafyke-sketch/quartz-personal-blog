---
title: JVM的类加载机制
date: 2026-09-15 11:34:06
publish: true
---

## 一、💡 一句话理解

> [!tip] 核心结论
> JVM 类加载机制就是把磁盘、JAR 包或其他来源中的类二进制数据，变成 JVM 里可以使用的 `Class`。完整主流程是：**加载 → 链接（验证 → 准备 → 解析）→ 初始化**。

最容易混淆的一点是：**类已经加载，不代表类已经初始化**。加载阶段可以已经完成，但静态字段的显式赋值和 `static` 代码块仍可能没有执行。

## 二、🧭 理论：它是什么

### 2.1 为什么需要类加载机制

Java 源文件不能直接交给 JVM 执行。一般需要先经过编译：

```text
Java 源代码（.java）
        ↓ javac 编译
Java 字节码（.class）
        ↓ 类加载机制
JVM 中可使用的 Class
        ↓
创建对象、访问字段、调用方法
```

类加载机制负责把“硬盘上的类文件”接入“正在运行的 JVM”。类通常来自 `.class` 文件或 JAR 包，也可以来自网络、数据库、运行时生成的字节码或自定义类加载器提供的其他位置。

### 2.2 类的生命周期

```mermaid
flowchart LR
    A["加载 Loading"] --> B["验证 Verification"]
    B --> C["准备 Preparation"]
    C --> D["解析 Resolution"]
    D --> E["初始化 Initialization"]
    E --> F["使用 Using"]
    F --> G["卸载 Unloading"]
```

其中，验证、准备和解析统称为**链接（Linking）**：

```text
加载 → 链接（验证 → 准备 → 解析）→ 初始化
```

| 阶段 | 大白话解释 | 主要结果 |
| --- | --- | --- |
| 加载 | 把类找出来并交给 JVM | 得到代表该类的 `Class` 对象 |
| 验证 | 检查字节码是否合法 | 防止错误或危险字节码破坏 JVM |
| 准备 | 为静态字段分配空间并设置默认值 | `static int count = 10` 此时通常先得到 `0` |
| 解析 | 把符号名称对应到实际类、字段和方法 | 符号引用转为可使用的运行时引用 |
| 初始化 | 执行类自己的静态初始化逻辑 | 静态字段得到显式值，`static` 代码块执行 |

## 三、⚙️ 理论：它是怎么工作的

### 3.1 加载：找到类并创建 `Class`

加载阶段主要完成三件事：

1. 根据类的二进制名称寻找类的二进制数据，通常是 `.class` 文件。
2. JVM 根据二进制数据创建内部运行时结构。
3. 创建代表这个类的 `java.lang.Class` 对象。

加载过程由 JVM 和类加载器共同完成。数组类比较特殊：它没有对应的外部 `.class` 文件，而是由 JVM 直接创建。

> [!info] 和反射的关系
> [[反射]] 的入口也是 `Class` 对象。类加载机制先让类进入 JVM，反射再通过这个 `Class` 查看字段、方法和构造器。

### 3.2 链接之一：验证

验证阶段检查字节码是否符合 JVM 的结构和类型安全规则，例如：

- 文件格式是否正确；
- 字节码指令是否合法；
- 跳转指令是否跳到有效位置；
- 方法签名和操作数类型是否正确；
- 字节码是否会破坏 JVM 的类型安全。

如果验证失败，通常会抛出 `VerifyError`。

### 3.3 链接之二：准备

准备阶段为类的静态字段创建存储空间，并设置类型默认值。

```java
class Counter {
    static int count = 10;
}
```

在准备阶段，`count` 通常先被设置为 `int` 的默认值 `0`。表达式中的 `10` 一般要等到初始化阶段才真正赋值。

```text
准备阶段：count = 0
初始化阶段：count = 10
```

> [!warning] 不要混淆两个阶段
> “为静态字段设置默认值”属于准备；“执行程序员写出的静态字段赋值和 `static` 代码块”属于初始化。

### 3.4 链接之三：解析

Java 字节码会用名称描述其他类、字段和方法，例如：

```text
com.example.UserService.findUser
```

这种通过名称描述目标的方式叫作**符号引用**。解析阶段会检查目标是否存在、是否允许访问，并把符号引用转换成 JVM 能够使用的运行时引用。

解析不要求一次全部完成。JVM 可以在某个引用真正被使用时再解析，这通常叫作**延迟解析**。

常见的解析错误包括：

| 错误 | 常见原因 |
| --- | --- |
| `NoSuchFieldError` | 编译时字段存在，运行时使用的类版本中字段已经不存在 |
| `NoSuchMethodError` | 编译时方法存在，运行时加载的版本中方法签名不匹配或已被删除 |
| `IllegalAccessError` | 运行时发现当前代码没有访问目标成员的权限 |

### 3.5 初始化：执行静态初始化逻辑

初始化阶段会执行：

- 静态字段的显式赋值；
- `static` 静态代码块；
- 编译器汇总生成的类初始化方法 `<clinit>`。

同一个类正常情况下只初始化一次。初始化子类前，JVM 会先初始化尚未初始化的父类。静态字段初始化和静态代码块按照源码中的文本顺序执行。

常见的主动初始化触发条件包括：

- 使用 `new` 创建类的实例；
- 调用类自己声明的静态方法；
- 给类自己声明的静态字段赋值；
- 读取类自己声明的、不是编译期常量的静态字段；
- 调用某些反射 API；
- 初始化某个子类时，需要先初始化它尚未初始化的父类；
- JVM 启动时初始化入口类。

下面这些情况通常不会初始化目标类：

- 使用 `类名.class` 获得类字面量；
- 使用 `Class.forName(name, false, loader)` 且第二个参数为 `false`；
- 读取可以在编译期确定的 `static final` 常量；
- 通过子类名称访问实际声明在父类中的静态字段时，子类不会因此初始化。

### 3.6 类初始化的线程安全

JVM 会为每个类或接口维护唯一的初始化锁。多个线程同时第一次使用某个类时，只有一个线程负责执行初始化逻辑，其他线程需要等待。

如果静态初始化代码抛出普通异常，第一次触发初始化的代码通常会收到 `ExceptionInInitializerError`。这个类随后会进入错误状态，后续再次使用时可能收到 `NoClassDefFoundError`。

因此不要在静态初始化代码中放入容易失败、耗时过长或依赖不稳定外部资源的操作。

### 3.7 内置类加载器

现代 JDK 的运行时主要提供以下内置类加载器：

| 类加载器 | 主要职责 |
| --- | --- |
| Bootstrap Class Loader | JVM 内置的启动类加载器；加载核心运行时类，在 Java 代码中通常显示为 `null` |
| Platform Class Loader | 加载 Java 平台 API、实现类和部分 JDK 运行时类 |
| System/Application Class Loader | 通常加载应用 classpath、module path 中的类 |
| 自定义 `ClassLoader` | 按程序规则从特殊来源读取并定义类 |

> [!info] 为什么 `String.class.getClassLoader()` 是 `null`
> 这不表示 `String` 没有类加载器，而是启动类加载器由 JVM 内部实现，Java API 通常使用 `null` 表示它。

### 3.8 双亲委派机制

Oracle 的 `ClassLoader` API 把这套规则称为**委派模型（delegation model）**，中文资料通常称为**双亲委派机制**。

```text
应用类加载器
    ↓ 先委派给父加载器
平台类加载器
    ↓ 先委派给父加载器
启动类加载器
    ↓ 找不到后逐层返回
子加载器再尝试自己查找
```

`ClassLoader.loadClass()` 的默认查找顺序是：

1. 调用 `findLoadedClass()`，检查该类是否已经加载；
2. 委派给父加载器；父加载器为 `null` 时使用 JVM 内置加载器；
3. 父加载器找不到时，调用当前加载器的 `findClass()`；
4. 如果调用者要求解析，再调用 `resolveClass()`。

它主要带来两个好处：

- 避免同一个类在同一条加载链中被重复定义；
- 优先使用平台核心类，降低应用代码冒充核心类的风险。

委派模型是 `ClassLoader` 的默认模型，但不是不可改变的绝对规则。自定义类加载器可以实现其他策略；现代模块系统中也存在比简单树形关系更复杂的可见性情况。

### 3.9 类的身份为什么包含类加载器

JVM 判断两个类是否相同，不只看全限定类名，还要看定义它们的类加载器。

```text
类的运行时身份 = 二进制类名 + 定义它的类加载器
```

因此，两个不同类加载器分别定义的 `com.example.User`，即使字节码内容完全相同，JVM 也可以把它们视为不同类型。直接强制转换时可能出现看似奇怪的 `ClassCastException`。

这个特性让应用服务器、插件系统和热部署框架能够隔离不同版本的类，但也增加了排查类冲突的难度。

### 3.10 `ClassNotFoundException` 和 `NoClassDefFoundError`

| 异常或错误 | 大白话区别 | 常见场景 |
| --- | --- | --- |
| `ClassNotFoundException` | 程序主动要求加载某个类，但加载器找不到 | `Class.forName()`、`loadClass()` |
| `NoClassDefFoundError` | 编译时需要的类存在，但 JVM 运行时无法得到它的定义 | 运行时缺少依赖、类初始化曾经失败 |

排查时重点检查：运行时 classpath、依赖版本、类由哪个加载器定义，以及更早位置是否出现过 `ExceptionInInitializerError`。

## 四、🚀 实践：从准备到验证

### 4.1 前置准备

准备 JDK 17、21 或 25。本文实践只使用 JDK 自带工具，不需要 Maven、Gradle 或第三方依赖。

检查环境：

```bash
java -version
javac -version
```

`java` 和 `javac` 应当可用，并且最好来自同一个 JDK。

### 4.2 可以拿来干什么

#### 4.2.1 判断类是否已经初始化

用途：验证“加载”和“初始化”是两个不同阶段。

`Class.forName` 的三个参数版本可以明确控制是否初始化：

```java
// 类名：要加载的二进制名称。
// false：只请求加载，不主动初始化。
// loader：指定使用当前程序的类加载器。
Class<?> type = Class.forName(
        "com.example.User",
        false,
        ClassLoadingDemo.class.getClassLoader()
);
```

输入是类的二进制名称和类加载器，输出是该类对应的 `Class<?>`。如果找不到目标类，会抛出 `ClassNotFoundException`。

#### 4.2.2 查看一个类由谁加载

用途：排查类路径、依赖冲突、插件隔离和类型转换异常。

```java
// 应用类通常由应用类加载器加载。
System.out.println(ClassLoadingDemo.class.getClassLoader());

// String 属于核心类，通常输出 null，表示启动类加载器。
System.out.println(String.class.getClassLoader());
```

输出的具体实现类名可能随 JDK 实现变化，不应在业务代码中依赖其具体字符串。

#### 4.2.3 查看 JVM 的类加载和初始化日志

用途：观察某个类从哪里加载、何时初始化，辅助排查依赖和启动问题。

```bash
# 查看类加载日志。
java -Xlog:class+load=info ClassLoadingDemo

# 查看类初始化日志。
java -Xlog:class+init=info ClassLoadingDemo
```

日志量通常较大，可以在终端中搜索自己的类名，例如 `ClassLoadingDemo`。

### 4.3 完整实践：代码、启动和验证

#### 4.3.1 创建演示代码

新建 `ClassLoadingDemo.java`。这个程序依次验证：只加载不初始化、编译期常量不触发初始化、父类先于子类初始化，以及静态初始化只执行一次。

```java
public class ClassLoadingDemo {

    public static void main(String[] args) throws Exception {
        System.out.println("1. 只请求加载 Child，不执行初始化");

        // initialize=false 表示不主动初始化这个类。
        // 此时可以取得 Class 对象，但 Child 的静态代码还不会执行。
        Class<?> childClass = Class.forName(
                "ClassLoadingDemo$Child",
                false,
                ClassLoadingDemo.class.getClassLoader()
        );

        System.out.println("已经取得 Class：" + childClass.getName());

        System.out.println("\n2. 读取编译期常量");

        // 编译期常量通常会被直接放进调用方的字节码，
        // 所以读取它不会触发 Child 的初始化。
        System.out.println(Child.COMPILE_TIME_CONSTANT);

        System.out.println("\n3. 读取普通静态字段");

        // 读取 Child 自己声明的非编译期常量属于主动使用。
        // JVM 会先初始化 Parent，再初始化 Child。
        System.out.println(Child.childValue);

        System.out.println("\n4. 创建 Child 对象");

        // Child 已经初始化过，静态初始化不会重复执行。
        // 这里只执行实例构造器。
        new Child();

        System.out.println("\n5. 查看类加载器");

        // 应用类通常由应用类加载器加载。
        System.out.println("Child：" + Child.class.getClassLoader());

        // String 属于核心类，通常由 null 表示启动类加载器。
        System.out.println("String：" + String.class.getClassLoader());
    }

    static class Parent {

        // 初始化 Parent 时，先执行这个字段的赋值表达式。
        static int parentValue = print("Parent 静态字段初始化", 10);

        // 再按照源码的文本顺序执行静态代码块。
        static {
            System.out.println("Parent static 代码块");
        }
    }

    static class Child extends Parent {

        // 这是编译期常量，调用方通常直接使用内联后的 100。
        static final int COMPILE_TIME_CONSTANT = 100;

        // 这是普通静态字段，读取它会触发 Child 初始化。
        static int childValue = print("Child 静态字段初始化", 20);

        static {
            System.out.println("Child static 代码块");
        }

        Child() {
            System.out.println("Child 构造器");
        }
    }

    /**
     * 打印初始化发生的时间点，并把传入值返回给静态字段。
     */
    static int print(String message, int value) {
        System.out.println(message);
        return value;
    }
}
```

#### 4.3.2 编译和运行

在 `ClassLoadingDemo.java` 所在目录执行：

```bash
javac ClassLoadingDemo.java
java ClassLoadingDemo
```

#### 4.3.3 验证预期结果

关键输出顺序应当类似：

```text
1. 只请求加载 Child，不执行初始化
已经取得 Class：ClassLoadingDemo$Child

2. 读取编译期常量
100

3. 读取普通静态字段
Parent 静态字段初始化
Parent static 代码块
Child 静态字段初始化
Child static 代码块
20

4. 创建 Child 对象
Child 构造器

5. 查看类加载器
Child：jdk.internal.loader.ClassLoaders$AppClassLoader@...
String：null
```

具体加载器实现名称和对象地址可能因 JDK 而不同。需要关注的是：

1. `Class.forName(..., false, ...)` 后没有出现静态初始化输出；
2. 读取编译期常量 `100` 时仍未初始化 `Child`；
3. 第一次读取 `childValue` 时，先初始化 `Parent`，再初始化 `Child`；
4. 随后创建对象时没有重复执行静态初始化，只执行了构造器；
5. 应用类有可见的应用类加载器，而 `String` 的加载器通常显示为 `null`。

#### 4.3.4 查看 JVM 类加载日志

执行：

```bash
java -Xlog:class+load=info ClassLoadingDemo
```

日志中会出现很多 JDK 自身的类。找到类似下面的记录即可：

```text
[info][class,load] ClassLoadingDemo source: file:...
[info][class,load] ClassLoadingDemo$Parent source: file:...
[info][class,load] ClassLoadingDemo$Child source: file:...
```

再查看初始化日志：

```bash
java -Xlog:class+init=info ClassLoadingDemo
```

如果命令提示不认识 `-Xlog`，通常说明当前环境是过旧的 JDK。先用 `java -version` 检查实际执行的 Java 版本。

## 五、📌 总结

- 完整主流程是：**加载 → 链接 → 初始化**。
- 链接包含：**验证 → 准备 → 解析**。
- 准备阶段为静态字段设置默认值，初始化阶段才执行显式赋值和 `static` 代码块。
- 类加载器默认先询问父加载器，再尝试自己寻找类，这就是常说的双亲委派。
- `Class.forName(name, false, loader)` 可以只请求加载而不主动初始化。
- `new`、调用静态方法、访问普通静态字段等主动使用行为通常会触发初始化。
- 类的运行时身份由“二进制类名 + 定义它的类加载器”共同决定。

记忆句：**先找到类，再检查并接好引用，最后执行静态初始化。**

## 六、📚 官方资料

- [Java 虚拟机规范第 5 章：Loading, Linking, and Initializing](https://docs.oracle.com/javase/specs/jvms/se25/html/jvms-5.html)
- [Java 语言规范第 12 章：Execution](https://docs.oracle.com/javase/specs/jls/se25/html/jls-12.html)
- [Java SE 25 `ClassLoader` API](https://docs.oracle.com/en/java/javase/25/docs/api/java.base/java/lang/ClassLoader.html)
- [Java SE 25 `java` 命令与统一日志参数](https://docs.oracle.com/en/java/javase/25/docs/specs/man/java.html)
