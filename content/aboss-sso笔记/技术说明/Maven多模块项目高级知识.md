---
title: Maven多模块项目高级知识
publish: true
---

# Maven 多模块项目高级知识

## 1. 文档目标

本文结合 `aboss-sso` 项目的真实结构，系统说明 Maven 多模块工程中的核心概念：

- 聚合与继承的区别；
- 模块依赖与依赖传递；
- `dependencies` 与 `dependencyManagement`；
- Maven 依赖作用域及其传递规则；
- 依赖冲突与版本仲裁；
- Reactor 构建顺序；
- 运行时 classpath；
- Spring Boot 多模块扫描原理；
- 可执行 Fat Jar 的组成；
- 常见设计方式、误区和排查∂命令。

## 2. `aboss-sso` 项目结构

根工程的 `pom.xml` 声明了以下模块：

```xml
<modules>
    <module>aboss-sso-client</module>
    <module>aboss-sso-adapter</module>
    <module>aboss-sso-app</module>
    <module>aboss-sso-domain</module>
    <module>aboss-sso-infrastructure</module>
    <module>start</module>
</modules>
```

各模块的主要职责可以概括为：

| 模块 | 主要职责 |
| --- | --- |
| `aboss-sso-client` | 对外接口、请求对象、响应 DTO |
| `aboss-sso-adapter` | HTTP Controller 等入口适配层 |
| `aboss-sso-app` | 应用服务、Facade、业务流程编排 |
| `aboss-sso-domain` | 领域对象、领域能力及相关抽象 |
| `aboss-sso-infrastructure` | 数据库、Redis、外部服务、配置和技术实现 |
| `start` | 应用启动、配置文件、可执行 Jar 打包 |

根工程本身配置为：

```xml
<packaging>pom</packaging>
```

说明根工程通常不产生业务 Jar，它主要承担聚合构建、公共配置和依赖版本管理。

## 3. 三种容易混淆的关系

Maven 多模块项目中需要区分三个概念：

```text
聚合关系：决定一起构建哪些模块
继承关系：决定子模块继承哪些 POM 配置
依赖关系：决定代码是否可以引用，以及运行时 classpath 有哪些类
```

三者可以同时存在，但互不等价。

## 4. 聚合 Aggregation

### 4.1 什么是聚合

聚合由根 POM 的 `<modules>` 定义：

```xml
<modules>
    <module>aboss-sso-client</module>
    <module>aboss-sso-adapter</module>
    <module>aboss-sso-app</module>
    <module>aboss-sso-domain</module>
    <module>aboss-sso-infrastructure</module>
    <module>start</module>
</modules>
```

它告诉 Maven：从根目录执行构建命令时，将这些模块纳入同一个 Reactor 构建。

例如：

```bash
mvn clean package
```

Maven 会收集所有模块、分析模块间依赖，再按正确顺序执行生命周期。

### 4.2 聚合不代表依赖

将一个模块写进 `<modules>`，不会自动让其他模块能引用它。

例如：

```xml
<modules>
    <module>module-a</module>
    <module>module-b</module>
</modules>
```

这只表示 `module-a` 和 `module-b` 一起构建。`module-a` 并不能因此直接引用 `module-b` 中的类。

如果需要引用，必须声明：

```xml
<dependency>
    <groupId>com.example</groupId>
    <artifactId>module-b</artifactId>
    <version>${project.version}</version>
</dependency>
```

### 4.3 聚合 POM 不一定是父 POM

一个 POM 可以只聚合模块而不被模块继承：

```text
aggregator/pom.xml
├── module-a
└── module-b
```

反过来，一个父 POM 也可能只负责被继承，而不使用 `<modules>` 聚合任何项目。

`aboss-sso` 的根 POM 同时扮演：

- 聚合 POM；
- 父 POM；
- 依赖版本管理 POM。

## 5. 继承 Inheritance

### 5.1 子模块如何继承父 POM

各子模块通过 `<parent>` 继承根 POM：

```xml
<parent>
    <groupId>com.aliyun.fsi.insurance</groupId>
    <artifactId>aboss-sso</artifactId>
    <version>1.0.0-SNAPSHOT</version>
    <relativePath>../pom.xml</relativePath>
</parent>
```

`relativePath` 用于告诉 Maven 优先从哪个本地路径寻找父 POM。默认值就是 `../pom.xml`。

父 POM 不在本地时，Maven也可以从本地仓库或远程仓库解析父 POM。

### 5.2 常见可继承内容

子模块通常可以继承或合并以下内容：

- `groupId`；
- `version`；
- `properties`；
- `dependencies`；
- `dependencyManagement`；
- `build` 中的插件配置；
- `pluginManagement`；
- `repositories`；
- `profiles` 的相关配置；
- 编译编码、Java 版本等公共属性。

例如子模块没有声明 `groupId` 和 `version`：

```xml
<artifactId>aboss-sso-app</artifactId>
```

它会继承父工程的：

```text
groupId = com.aliyun.fsi.insurance
version = 1.0.0-SNAPSHOT
```

因此完整坐标为：

```text
com.aliyun.fsi.insurance:aboss-sso-app:1.0.0-SNAPSHOT
```

### 5.3 继承与覆盖

子模块可以覆盖父 POM 的部分配置：

```xml
<properties>
    <maven.compiler.source>17</maven.compiler.source>
    <maven.compiler.target>17</maven.compiler.target>
</properties>
```

如果父 POM 设置 Java 8，而某个子模块重新设置为 Java 17，则该子模块使用自身配置。

复杂节点可能执行合并而不是简单覆盖。需要确认最终配置时，应查看 Effective POM：

```bash
mvn help:effective-pom
```

将结果输出到文件：

```bash
mvn help:effective-pom -Doutput=effective-pom.xml
```

### 5.4 父 POM 中的 `dependencies` 会直接继承

父 POM 如果直接写：

```xml
<dependencies>
    <dependency>
        <groupId>org.example</groupId>
        <artifactId>example-lib</artifactId>
        <version>1.0.0</version>
    </dependency>
</dependencies>
```

所有子模块通常都会实际获得该依赖。

这可能导致：

- 不需要该依赖的模块也被引入；
- classpath 变大；
- 模块职责变得模糊；
- 依赖冲突范围扩大。

因此公共父 POM 更常把版本写入 `dependencyManagement`，由确实需要的模块自行声明依赖。

## 6. 依赖 Dependencies

### 6.1 依赖决定可见性

模块 A 需要使用模块 B 中的类时，A 必须依赖 B：

```xml
<dependency>
    <groupId>com.aliyun.fsi.insurance</groupId>
    <artifactId>aboss-sso-app</artifactId>
</dependency>
```

声明后，B 的类会进入 A 的编译 classpath。是否继续进入运行时和测试 classpath，则由 `scope` 决定。

### 6.2 `aboss-sso` 的主依赖链

项目中的主要依赖关系是：

```text
start
└── aboss-sso-adapter
    └── aboss-sso-app
        ├── aboss-sso-client
        └── aboss-sso-infrastructure
            ├── aboss-sso-client
            └── aboss-sso-domain
```

这条链说明 `start` 虽然只直接声明了 `aboss-sso-adapter`，但默认情况下可以通过传递依赖获得后面的多个模块。

## 7. 依赖传递 Transitive Dependencies

### 7.1 基本原理

如果：

```text
A 依赖 B
B 依赖 C
```

在依赖作用域允许传递的情况下，A 会间接获得 C：

```text
A
└── B
    └── C
```

因此 `start` 只直接依赖 `adapter`，也能在运行时加载 `app` 和 `infrastructure` 中的类。

### 7.2 直接依赖优于依赖传递

如果 A 的源码直接使用 C 中的类型，最佳实践通常是让 A 显式依赖 C，而不是完全依赖：

```text
A → B → C
```

原因是 B 将来可能删除对 C 的依赖。如果 A 没有显式声明 C，A 会突然编译失败。

原则可以概括为：

> 当前模块直接使用哪个组件的公开类型，就显式声明哪个依赖。

### 7.3 `optional` 依赖

B 可以把 C 声明为可选依赖：

```xml
<dependency>
    <groupId>com.example</groupId>
    <artifactId>component-c</artifactId>
    <version>1.0.0</version>
    <optional>true</optional>
</dependency>
```

此时：

- B 自己可以使用 C；
- A 依赖 B 时，C 不会自动传递给 A；
- A 如果确实需要 C，必须自己声明。

`optional` 常用于：

- 一个库支持多种可选实现；
- JDBC 驱动等由最终应用选择的组件；
- 避免将实现细节传播给所有调用方。

### 7.4 排除传递依赖

如果 B 传递引入了不需要或冲突的 C，可以排除：

```xml
<dependency>
    <groupId>com.example</groupId>
    <artifactId>component-b</artifactId>
    <version>1.0.0</version>
    <exclusions>
        <exclusion>
            <groupId>com.example</groupId>
            <artifactId>component-c</artifactId>
        </exclusion>
    </exclusions>
</dependency>
```

注意：`exclusion` 是针对某一条依赖路径的排除，不是全局禁止。如果 C 还通过另一条路径进入，仍然会存在于依赖树中。

## 8. `dependencies` 与 `dependencyManagement`

### 8.1 `dependencies` 会真正引入依赖

```xml
<dependencies>
    <dependency>
        <groupId>com.example</groupId>
        <artifactId>example-lib</artifactId>
        <version>1.0.0</version>
    </dependency>
</dependencies>
```

这会让 `example-lib` 真正进入当前模块的 classpath。

### 8.2 `dependencyManagement` 默认只管理规则

```xml
<dependencyManagement>
    <dependencies>
        <dependency>
            <groupId>com.example</groupId>
            <artifactId>example-lib</artifactId>
            <version>1.0.0</version>
        </dependency>
    </dependencies>
</dependencyManagement>
```

这通常不会自动引入 `example-lib`，只是预先定义：

- 推荐或强制采用的版本；
- 默认 `scope`；
- 默认排除项等依赖规则。

子模块仍然需要声明：

```xml
<dependency>
    <groupId>com.example</groupId>
    <artifactId>example-lib</artifactId>
</dependency>
```

此时可以省略版本，由父 POM 的 `dependencyManagement` 提供。

### 8.3 为什么集中管理版本

多模块项目如果每个模块自己写版本：

```text
module-a 使用 fastjson 1.x
module-b 使用 fastjson 2.x
module-c 使用另一个传递版本
```

最终应用容易出现冲突。

集中管理的优点：

- 版本统一；
- 升级位置集中；
- 子模块 POM 更简洁；
- 减少依赖仲裁带来的不确定性。

### 8.4 `aboss-sso` 的版本管理

根 POM 中使用：

```xml
<dependencyManagement>
    <dependencies>
        <dependency>
            <groupId>com.aliyun.fsi.insurance</groupId>
            <artifactId>aboss-sso-app</artifactId>
            <version>${project.version}</version>
        </dependency>
    </dependencies>
</dependencyManagement>
```

子模块声明 `aboss-sso-app` 时可以省略版本：

```xml
<dependency>
    <groupId>com.aliyun.fsi.insurance</groupId>
    <artifactId>aboss-sso-app</artifactId>
</dependency>
```

最终版本由根 POM 管理。

### 8.5 本项目中值得特别注意的 `client` 版本

根 POM 对 `aboss-sso-client` 的管理是：

```xml
<dependency>
    <groupId>com.aliyun.fsi.insurance</groupId>
    <artifactId>aboss-sso-client</artifactId>
    <version>${aboss.sso.version}</version>
</dependency>
```

而属性值为：

```xml
<aboss.sso.version>1.3.6-RELEASE</aboss.sso.version>
```

`aboss-sso-client` 虽然继承了版本为 `1.0.0-SNAPSHOT` 的父 POM，但它在自己的 POM 中重新声明了项目版本：

```xml
<artifactId>aboss-sso-client</artifactId>
<version>${aboss.sso.version}</version>
```

子模块显式声明的 `<version>` 会覆盖从父 POM 继承的默认版本。因此当前各构件版本为：

```text
父 POM：
com.aliyun.fsi.insurance:aboss-sso:1.0.0-SNAPSHOT

app 模块：
com.aliyun.fsi.insurance:aboss-sso-app:1.0.0-SNAPSHOT

client 模块：
com.aliyun.fsi.insurance:aboss-sso-client:1.3.6-RELEASE

app 实际依赖的 client：
com.aliyun.fsi.insurance:aboss-sso-client:1.3.6-RELEASE
```

因此，本地 `client` 模块与 `app` 所需依赖的 GAV 是一致的，并不存在 `1.0.0-SNAPSHOT` 与 `1.3.6-RELEASE` 不匹配的问题。

依赖树验证结果为：

```bash
mvn -pl aboss-sso-app dependency:tree \
  -Dincludes=com.aliyun.fsi.insurance:aboss-sso-client
```

```text
com.aliyun.fsi.insurance:aboss-sso-app:jar:1.0.0-SNAPSHOT
\- com.aliyun.fsi.insurance:aboss-sso-client:jar:1.3.6-RELEASE:compile
```

依赖来自当前源码模块还是 Maven 仓库，取决于该模块是否进入本次 Reactor：

```bash
# 只选择 app，client 不一定进入本次 Reactor
mvn package -pl aboss-sso-app

# 选择 app，并将它依赖的 Reactor 模块一起加入构建
mvn package -pl aboss-sso-app -am
```

- 从聚合根工程完整构建，或者使用 `-am` 时，`client:1.3.6-RELEASE` 会进入本次 Reactor。因为 GAV 完全匹配，Maven可以使用本次源码构建的 client。
- 只执行 `-pl aboss-sso-app` 且不使用 `-am` 时，client 可能不在本次 Reactor 中。Maven会从本地仓库或远程仓库解析同坐标的 `1.3.6-RELEASE` Jar。

需要查看最终生效的项目模型时，可以执行：

```bash
mvn help:effective-pom -pl aboss-sso-app
```

这里需要区分两种版本：

```text
父 POM 的 version：
表示父 POM 自身坐标，也是子模块没有声明 version 时的默认值。

子模块自己的 version：
子模块显式声明后，会覆盖从父 POM 继承的默认值。
```

另外，Maven会对下面这种项目版本写法给出警告：

```xml
<version>${aboss.sso.version}</version>
```

警告内容类似：

```text
'version' contains an expression but should be a constant
```

当前 Maven 仍能解析该写法，但项目自身版本使用普通属性表达式并不是 Maven 推荐的稳定模型。它和依赖版本使用属性不是同一问题，后续升级 Maven 时需要关注兼容性。

## 9. BOM 与 `import` Scope

### 9.1 第一次认识 BOM：先建立直觉

第一次看到 BOM 时，不要先把它理解成一种新的依赖类型。最简单的理解是：

> BOM 是别人帮项目整理好的一张“依赖版本搭配表”。

假设一个框架需要下面这些组件共同工作：

```text
spring-core
spring-web
jackson-databind
tomcat
slf4j
```

这些组件并不是随便选择几个版本就一定兼容。例如：

```text
spring-web 版本较新
spring-core 版本较旧
jackson 版本又与当前 Spring Boot 不兼容
```

项目可能编译成功，却在运行时出现：

```text
NoSuchMethodError
ClassNotFoundException
AbstractMethodError
```

Spring Boot 团队会测试一套能够配合工作的版本组合，然后把它们记录在 `spring-boot-dependencies` 这个 POM 中。这个承担“版本搭配清单”职责的 POM，就称为 BOM。

可以用套餐类比：

```text
BOM
    = 套餐配置表，规定各组件采用什么版本

dependencies
    = 真正点了哪些组件

dependencyManagement
    = 项目保存套餐规则的位置

scope=import
    = 把外部套餐规则导入当前项目
```

需要特别记住：

```text
导入套餐配置表
    ≠
把套餐中的所有东西都点一遍
```

同理，导入 BOM 只获得版本管理规则，不会自动把 BOM 中管理的所有 Jar 引入项目。

### 9.2 用一条完整链路理解 BOM

以当前项目导入 Spring Boot BOM 为例：

```text
根 POM 导入 spring-boot-dependencies
    ↓
Maven 读取其中的 dependencyManagement
    ↓
Spring、Jackson、Tomcat 等版本规则进入当前项目
    ↓
子模块声明 spring-boot-starter-web，但不写版本
    ↓
Maven 从依赖管理中找到相应版本
    ↓
真正需要的 Jar 才进入 classpath
```

对应代码分为两步。

第一步，导入版本清单：

```xml
<dependencyManagement>
    <dependencies>
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-dependencies</artifactId>
            <version>${spring-boot.version}</version>
            <type>pom</type>
            <scope>import</scope>
        </dependency>
    </dependencies>
</dependencyManagement>
```

第二步，声明真正需要的依赖：

```xml
<dependencies>
    <dependency>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-web</artifactId>
    </dependency>
</dependencies>
```

第二段没有写 `<version>`，是因为版本已经由导入的 BOM 管理。

如果只完成第一步、没有第二步，Web 相关 Jar 不会因此进入项目。

### 9.3 Maven 怎么知道它是 BOM

Maven 没有 `<bom>true</bom>` 这样的标记，BOM 也不是一种独立文件格式。BOM 是一个 POM 承担的设计角色。

判断一个构件是否作为 BOM 使用，主要看三个特征：

```text
1. 它是 POM 构件
   通常 packaging=pom，使用方写 type=pom

2. 它主要维护 dependencyManagement
   包含大量依赖坐标、版本和兼容规则

3. 使用方通过 scope=import 导入
   表示导入目标 POM 的依赖管理清单
```

因此下面这组配置是最明显的 BOM 导入信号：

```xml
<dependencyManagement>
    <dependencies>
        <dependency>
            <type>pom</type>
            <scope>import</scope>
        </dependency>
    </dependencies>
</dependencyManagement>
```

构件名称以 `-bom`、`-dependencies` 结尾只是常见命名习惯，不是鉴定依据。例如：

```text
spring-cloud-dependencies  → BOM
spring-boot-dependencies   → BOM
company-bom                → 可能是 BOM
```

最终仍要看它的内容和使用方式。

### 9.4 BOM 是什么

BOM 全称为 Bill of Materials，可以理解为“依赖物料清单”。在 Maven 中，它通常是一个 `packaging=pom` 的特殊 POM，主要负责维护一组相互兼容的依赖版本，本身一般不包含业务代码。

例如 Spring Boot BOM 会统一管理：

```text
Spring Framework 各组件版本
Jackson 版本
Tomcat 版本
日志组件版本
测试组件版本
其他 Spring Boot 生态依赖版本
```

可以把 BOM 理解为框架或团队已经验证过的“依赖版本套餐”。使用 BOM 的主要目的包括：

- 集中维护大量依赖版本；
- 保证一组依赖之间的兼容性；
- 避免每个子模块重复声明版本；
- 降低多模块项目中的依赖冲突概率；
- 让依赖升级集中在少量位置完成。

### 9.5 为什么需要 BOM

如果没有 BOM，项目可能需要为每个依赖单独维护版本：

```xml
<dependency>
    <groupId>org.springframework</groupId>
    <artifactId>spring-web</artifactId>
    <version>5.1.5.RELEASE</version>
</dependency>

<dependency>
    <groupId>org.springframework</groupId>
    <artifactId>spring-core</artifactId>
    <version>5.1.5.RELEASE</version>
</dependency>

<dependency>
    <groupId>com.fasterxml.jackson.core</groupId>
    <artifactId>jackson-databind</artifactId>
    <version>2.9.8</version>
</dependency>
```

当依赖数量增多后，容易出现：

```text
同一框架的组件版本不一致
底层依赖与框架版本不兼容
不同模块各自维护不同版本
升级时遗漏某个关联组件
```

BOM 将这些版本组合集中起来，由框架团队或项目团队统一验证和维护。

### 9.6 如何导入 BOM

项目根 POM 中导入了 Spring Boot BOM：

```xml
<dependencyManagement>
    <dependencies>
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-dependencies</artifactId>
            <version>${spring-boot.version}</version>
            <type>pom</type>
            <scope>import</scope>
        </dependency>
    </dependencies>
</dependencyManagement>
```

其中两个配置非常关键：

```xml
<type>pom</type>
<scope>import</scope>
```

含义分别是：

```text
type=pom
    → 目标构件是一个 POM，不是普通 Jar。

scope=import
    → 将目标 POM 中的 dependencyManagement
      合并到当前项目的依赖管理中。
```

`import` 是特殊的依赖管理作用域，只适用于：

```text
dependencyManagement 中
type=pom 的依赖
```

它不能像 `compile`、`runtime`、`test` 一样作为普通 Jar 的 classpath Scope 使用。

### 9.7 导入 BOM 后发生什么

假设 Spring Boot BOM 内部包含：

```xml
<dependencyManagement>
    <dependencies>
        <dependency>
            <groupId>org.springframework</groupId>
            <artifactId>spring-web</artifactId>
            <version>5.1.5.RELEASE</version>
        </dependency>

        <dependency>
            <groupId>com.fasterxml.jackson.core</groupId>
            <artifactId>jackson-databind</artifactId>
            <version>2.9.8</version>
        </dependency>
    </dependencies>
</dependencyManagement>
```

导入后，可以将它理解为这些版本管理规则进入了当前项目：

```text
当前项目 dependencyManagement
├── spring-web → 5.1.5.RELEASE
├── jackson-databind → 2.9.8
├── tomcat → BOM 管理的兼容版本
└── 其他 Spring Boot 依赖 → BOM 管理的兼容版本
```

之后项目声明相关依赖时，可以省略版本：

```xml
<dependencies>
    <dependency>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-web</artifactId>
    </dependency>
</dependencies>
```

Maven会从 Effective POM 的 `dependencyManagement` 中查找该依赖的版本。

### 9.8 导入 BOM 不会自动引入所有 Jar

这是理解 BOM 时最重要的一点：

```text
BOM 和 dependencyManagement
    → 负责管理版本和依赖规则

dependencies
    → 负责真正引入依赖
```

导入 Spring Boot BOM 不代表 Spring Web、Jackson、Tomcat 等所有 Jar 都会自动进入项目 classpath。项目仍然需要在 `<dependencies>` 中声明实际使用的依赖。

完整流程为：

```text
导入 BOM
    ↓
BOM 中的版本规则进入 dependencyManagement
    ↓
项目在 dependencies 中声明具体依赖
    ↓
具体依赖没有写 version
    ↓
Maven 从 dependencyManagement 查找版本
    ↓
对应 Jar 才真正进入项目依赖
```

因此仅导入：

```xml
<artifactId>spring-boot-dependencies</artifactId>
```

不会让项目自动获得 Spring MVC 功能。还需要真正声明：

```xml
<artifactId>spring-boot-starter-web</artifactId>
```

### 9.9 BOM 与父 POM 的区别

BOM 和父 POM 都可以提供依赖管理，因此容易混淆。

父 POM 通过以下方式继承：

```xml
<parent>
    <groupId>com.example</groupId>
    <artifactId>example-parent</artifactId>
    <version>1.0.0</version>
</parent>
```

父 POM 可以提供：

- `groupId` 和默认 `version`；
- `properties`；
- `dependencies`；
- `dependencyManagement`；
- `plugins` 和 `pluginManagement`；
- 构建、仓库等其他 Maven 配置。

BOM 通过以下方式导入：

```xml
<dependencyManagement>
    <dependencies>
        <dependency>
            <groupId>com.example</groupId>
            <artifactId>example-bom</artifactId>
            <version>1.0.0</version>
            <type>pom</type>
            <scope>import</scope>
        </dependency>
    </dependencies>
</dependencyManagement>
```

BOM 主要导入该 POM 的依赖管理清单，不会让它成为当前项目的父工程，也不会继承它的插件和完整构建配置。

两者可以概括为：

```text
父 POM
    → 继承一整套 Maven 项目配置

BOM
    → 导入一套依赖管理清单
```

一个项目只能有一个直接父 POM，但可以在 `dependencyManagement` 中导入多个 BOM。因此，项目已经继承公司父 POM 时，仍然可以继续导入 Spring Boot、Spring Cloud 或公司组件 BOM。

### 9.10 BOM 与普通 POM 依赖的区别

普通 Jar 依赖：

```xml
<dependency>
    <groupId>com.example</groupId>
    <artifactId>example-lib</artifactId>
    <version>1.0.0</version>
</dependency>
```

作用是将 `example-lib` 及允许传递的依赖加入 classpath。

BOM 导入：

```xml
<dependency>
    <groupId>com.example</groupId>
    <artifactId>example-bom</artifactId>
    <version>1.0.0</version>
    <type>pom</type>
    <scope>import</scope>
</dependency>
```

作用是导入依赖管理规则，不向 classpath 添加业务类。

### 9.11 一个项目导入多个 BOM

项目可以这样导入多个版本清单：

```xml
<dependencyManagement>
    <dependencies>
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-dependencies</artifactId>
            <version>${spring-boot.version}</version>
            <type>pom</type>
            <scope>import</scope>
        </dependency>

        <dependency>
            <groupId>org.springframework.cloud</groupId>
            <artifactId>spring-cloud-dependencies</artifactId>
            <version>${spring-cloud.version}</version>
            <type>pom</type>
            <scope>import</scope>
        </dependency>

        <dependency>
            <groupId>com.example</groupId>
            <artifactId>company-dependencies</artifactId>
            <version>${company-dependencies.version}</version>
            <type>pom</type>
            <scope>import</scope>
        </dependency>
    </dependencies>
</dependencyManagement>
```

导入多个 BOM 时，需要注意它们可能同时管理某个底层依赖。如果版本发生冲突，最终结果会受到当前 POM 的显式管理、父 POM、BOM 导入和 Maven 模型合并结果等因素影响。

不要仅凭原始 POM 的视觉顺序判断最终版本，应查看 Effective POM 和依赖树。

### 9.12 覆盖 BOM 管理的版本

如果 BOM 管理：

```text
example-lib → 1.0.0
```

当前项目确实需要统一使用 `1.1.0`，可以在自己的 `dependencyManagement` 中显式管理：

```xml
<dependencyManagement>
    <dependencies>
        <!-- 导入 BOM -->
        <dependency>
            <groupId>com.example</groupId>
            <artifactId>example-bom</artifactId>
            <version>1.0.0</version>
            <type>pom</type>
            <scope>import</scope>
        </dependency>

        <!-- 当前项目显式管理需要覆盖的版本 -->
        <dependency>
            <groupId>com.example</groupId>
            <artifactId>example-lib</artifactId>
            <version>1.1.0</version>
        </dependency>
    </dependencies>
</dependencyManagement>
```

但是覆盖 BOM 版本前必须确认兼容性。BOM 提供的是一组经过组合验证的版本，单独升级底层依赖可能造成：

```text
NoSuchMethodError
ClassNotFoundException
AbstractMethodError
自动配置不兼容
依赖冲突
```

### 9.13 项目自定义 BOM

大型组织可以建立自己的 BOM，为多个项目统一管理公共组件版本：

```xml
<project>
    <modelVersion>4.0.0</modelVersion>

    <groupId>com.example</groupId>
    <artifactId>company-bom</artifactId>
    <version>1.0.0</version>
    <packaging>pom</packaging>

    <dependencyManagement>
        <dependencies>
            <dependency>
                <groupId>com.example</groupId>
                <artifactId>common-web</artifactId>
                <version>2.1.0</version>
            </dependency>
            <dependency>
                <groupId>com.example</groupId>
                <artifactId>common-security</artifactId>
                <version>3.0.0</version>
            </dependency>
        </dependencies>
    </dependencyManagement>
</project>
```

业务项目导入该 BOM 后，只需声明实际使用的组件，无需重复写版本。

### 9.14 如何确认 BOM 最终管理的版本

查看最终生效的 POM：

```bash
mvn help:effective-pom
```

输出到文件便于搜索：

```bash
mvn help:effective-pom -Doutput=effective-pom.xml
```

查看最终依赖树和冲突仲裁：

```bash
mvn dependency:tree -Dverbose
```

只检查某个依赖：

```bash
mvn dependency:tree \
  -Dincludes=com.fasterxml.jackson.core:jackson-databind
```

排查 BOM 问题时，需要分别回答两个问题：

```text
dependencyManagement 最终管理了哪个版本？
    → 查看 effective-pom

当前模块最终真正引入了哪个版本？
    → 查看 dependency:tree
```

### 9.15 BOM 核心总结

```text
BOM
    = 一组依赖版本和规则的清单

type=pom
    = 目标构件是 POM，不是普通 Jar

scope=import
    = 将目标 POM 的 dependencyManagement
      导入当前项目

导入 BOM
    ≠ 自动引入 BOM 管理的所有 Jar

真正引入依赖
    = 仍然需要在 dependencies 中声明
```

一句话总结：

> BOM 是一份批量依赖版本清单；`type=pom + scope=import` 将这份清单导入当前项目的 `dependencyManagement`，它负责统一版本，但不会自动把清单中的所有 Jar 引入项目。

## 10. Maven 依赖作用域 Scope

### 10.1 `compile`

默认作用域：

```xml
<scope>compile</scope>
```

特点：

- 编译可见；
- 测试可见；
- 运行可见；
- 通常会传递给下游依赖方。

项目内部模块依赖如果未声明 scope，通常就是 `compile`。

### 10.2 `runtime`

特点：

- 当前模块主代码编译时通常不可见；
- 测试和运行时可见；
- 常用于只在运行时需要的实现。

例如应用仅通过 JDBC 标准接口编译，而数据库驱动只在运行时需要。

### 10.3 `provided`

特点：

- 编译和测试时可见；
- 运行环境预计会提供；
- 通常不会被打进最终部署产物；
- 不应指望它正常传递给最终应用。

典型场景：

- Servlet 容器提供的 Servlet API；
- 某些应用服务器 SDK；
- 编译期需要、运行环境已有的组件。

使用错误会造成运行时：

```text
ClassNotFoundException
NoClassDefFoundError
```

### 10.4 `test`

特点：

- 仅测试编译和测试执行可见；
- 不进入主程序运行时；
- 不会传递给依赖当前模块的其他模块。

例如：

```xml
<dependency>
    <groupId>org.testng</groupId>
    <artifactId>testng</artifactId>
    <scope>test</scope>
</dependency>
```

### 10.5 `system`

`system` 类似 `provided`，但依赖通过本机绝对路径指定：

```xml
<scope>system</scope>
<systemPath>/some/local/path/example.jar</systemPath>
```

它会破坏可移植性和可重复构建，通常应避免。更好的方式是把构件发布到 Maven 仓库。

### 10.6 `import`

`import` 只适用于 `dependencyManagement` 中 `type=pom` 的依赖，用来导入 BOM：

```xml
<type>pom</type>
<scope>import</scope>
```

它不是普通 classpath 依赖作用域。

## 11. 作用域传递的理解方法

假设当前项目 A 依赖 B，B 又依赖 C。C 是否进入 A，取决于 A→B 和 B→C 两条边的 scope 组合。

常见结论：

- B 的 `compile` 依赖通常会传递给 A；
- B 的 `runtime` 依赖通常会进入 A 的运行时；
- B 的 `test` 依赖不会传递给 A；
- B 的 `provided` 依赖通常不会作为 A 的正常运行依赖传递；
- `optional=true` 的依赖不会自动传递给 A。

与其死记所有组合，更可靠的做法是查看当前模块的实际依赖树：

```bash
mvn dependency:tree
```

## 12. 依赖冲突与版本仲裁

### 12.1 冲突场景

假设：

```text
应用 → A → commons-lib:1.0
应用 → B → commons-lib:2.0
```

Java classpath 通常不能同时可靠使用同一坐标的两个不同版本。Maven 必须选择一个版本。

### 12.2 最近路径优先

Maven 的核心仲裁原则是：

> 距离当前项目更近的依赖版本优先。

例如：

```text
应用 → commons-lib:2.0
应用 → A → commons-lib:1.0
```

应用直接依赖的 `2.0` 距离更近，通常会胜出。

### 12.3 同深度时声明顺序影响结果

如果两个冲突版本路径深度相同，通常先声明的依赖路径优先。

不过依靠声明顺序解决关键版本冲突可读性较差。更稳妥的是在 `dependencyManagement` 中显式锁定版本。

### 12.4 被淘汰不等于完全没解析过

使用：

```bash
mvn dependency:tree -Dverbose
```

可能看到：

```text
omitted for conflict with 2.0
```

说明该版本出现在某条依赖路径上，但最终因为冲突仲裁没有成为有效版本。

### 12.5 典型运行时问题

编译时和运行时加载了不兼容版本，可能出现：

```text
NoSuchMethodError
NoClassDefFoundError
ClassNotFoundException
AbstractMethodError
```

其中 `NoSuchMethodError` 很典型：编译时类中有该方法，但运行时实际加载的旧版本中没有该方法。

## 13. Maven Reactor 构建

### 13.1 Reactor 是什么

Reactor 是 Maven 针对当前这一次多模块命令，在内存中建立的构建上下文。它不是一个代码模块，也不是 Maven 仓库；命令结束后，本次 Reactor 也随之结束。

当 Maven 从聚合根工程启动构建时，会建立 Reactor。它负责：

- 收集参与构建的模块；
- 解析模块间依赖；
- 计算构建顺序；
- 在同一次构建中使用前面模块的产物；
- 汇总各模块构建结果。

整体过程可以理解为：

```text
读取聚合 POM
    ↓
根据 <modules> 和命令参数收集项目
    ↓
建立本次 Reactor 项目清单
    ↓
根据完整 GAV 匹配模块依赖
    ↓
计算模块构建顺序
    ↓
对各模块执行指定生命周期
    ↓
输出 Reactor Summary
```

例如从根目录执行：

```bash
mvn clean package
```

根 POM 聚合的各模块会进入本次 Reactor。构建结束时通常会看到：

```text
Reactor Summary:

aboss-sso-client .............. SUCCESS
aboss-sso-domain .............. SUCCESS
aboss-sso-infrastructure ...... SUCCESS
aboss-sso-app ................. SUCCESS
aboss-sso-adapter ............. SUCCESS
start ......................... SUCCESS
```

Reactor 与仓库的区别：

```text
Reactor
├── 只在本次 Maven 命令期间存在
├── 保存本次参与构建的项目模型和构建顺序
└── 可以在同一次构建中共享模块产物

本地 Maven 仓库
├── 通常位于 ~/.m2/repository
├── 保存下载或 mvn install 安装的构件
└── Maven 命令结束后仍然存在

远程 Maven 仓库
└── 保存团队发布的构件，需要通过网络解析
```

### 13.2 构建顺序不是 `<modules>` 的简单顺序

Maven 会根据模块依赖关系进行拓扑排序。

例如：

```text
adapter 依赖 app
app 依赖 infrastructure
```

即使 `<modules>` 中先写 `adapter`，Maven 仍需要先构建它依赖的模块。

### 13.3 常用 Reactor 参数

只构建指定模块：

```bash
mvn package -pl start
```

构建指定模块及其上游依赖：

```bash
mvn package -pl start -am
```

参数含义：

```text
-pl / --projects       指定参与构建的模块
-am / --also-make      同时构建该模块依赖的 Reactor 模块
-amd / --also-make-dependents
                       同时构建依赖该模块的下游模块
-rf / --resume-from    从指定模块恢复构建
```

例如构建失败后从 `aboss-sso-app` 恢复：

```bash
mvn package -rf :aboss-sso-app
```

### 13.4 Reactor 构件与本地仓库构件

同一次 Reactor 构建中，如果依赖的 GAV 与某个 Reactor 模块完全匹配，Maven可以直接使用该模块的构建结果。

出现以下任意情况时，Maven需要继续从仓库解析依赖：

- 需要的模块没有加入本次 Reactor；
- Reactor 中模块的 GAV 与依赖要求不一致。

仓库解析顺序通常是：

```text
本地仓库
    ↓ 未找到
远程仓库
```

因此：

```text
mvn package -pl aboss-sso-app
```

和：

```text
mvn package -pl aboss-sso-app -am
```

虽然目标模块相同，但本次 Reactor 的项目集合不同，依赖来源也可能不同。

再次强调：目录名或 `artifactId` 相似并不足够，版本也是坐标的一部分。Maven通过 `groupId + artifactId + version` 识别 Reactor 模块和仓库构件。

## 14. Maven 生命周期与常用命令

Maven 的常见默认生命周期阶段包括：

```text
validate
compile
test
package
verify
install
deploy
```

执行后面的阶段会依次执行前面的阶段。

### 14.1 `package`

```bash
mvn clean package
```

生成 Jar 或其他制品，但不会写入本地 Maven 仓库。

### 14.2 `install`

```bash
mvn clean install
```

除构建外，还会把构件和 POM 写入本地仓库，供其他独立 Maven 构建使用。

### 14.3 `deploy`

```bash
mvn clean deploy
```

将构件发布到远程 Maven 仓库。它属于外部状态变更，执行前需要确认目标仓库和发布版本。

## 15. 编译 classpath 与运行时 classpath

### 15.1 Maven 模块最终会变成 classpath 内容

在 IDEA 中运行 `start` 时，classpath 大致包含：

```text
start/target/classes
aboss-sso-adapter/target/classes
aboss-sso-app/target/classes
aboss-sso-infrastructure/target/classes
aboss-sso-domain/target/classes
解析到的 aboss-sso-client 构件
第三方依赖 Jar
```

在 JVM 看来，这些来源最终都只是 classpath 中的目录或 Jar。

JVM 并不理解 Maven 的“模块目录”概念。

### 15.2 类的真正身份由包名和类名决定

例如：

```java
package com.aliyun.fsi.insurance.sso.config;

public class LogAopConfig {
}
```

它的全限定类名是：

```text
com.aliyun.fsi.insurance.sso.config.LogAopConfig
```

它位于哪个源码模块，并不属于 Java 类名的一部分。

## 16. Spring Boot 多模块扫描原理

启动类为：

```java
@SpringBootApplication(scanBasePackages = {"com.aliyun.fsi.insurance.sso"})
public class Application {
}
```

Spring 扫描的逻辑可以理解为：

```text
从运行时 classpath 中
寻找 com.aliyun.fsi.insurance.sso 及其子包下的类
识别带有 Spring 组件注解的候选类
注册为 Bean
```

因此 Spring 可以扫描到不同 Maven 模块中的：

```text
adapter 模块的 LoginController
app 模块的 LoginFacadeImpl
infrastructure 模块的 LogAopConfig
其他模块中符合条件的 Spring 组件
```

需要同时满足三个条件：

```text
模块通过依赖关系进入运行时 classpath
        +
类的包名位于 scanBasePackages 范围内
        +
类符合 Spring 组件注册条件
```

其中任何一个条件不满足，都可能扫描不到。

### 16.1 `scanBasePackages` 不扫描 Maven 模块

下面的配置：

```java
scanBasePackages = "com.aliyun.fsi.insurance.sso"
```

不是扫描：

```text
aboss-sso-app 文件夹
aboss-sso-infrastructure 文件夹
```

而是扫描 classpath 上以指定包路径开头的 `.class`：

```text
com/aliyun/fsi/insurance/sso/**/*.class
```

### 16.2 第三方 Jar 也可能被扫描

如果某个第三方 Jar：

- 在应用 classpath 中；
- 类包名也位于扫描范围；
- 类上带有组件注解；

它也可能被扫描并注册。扫描根包过大可能引入意外 Bean、Bean 重名或启动时间增加等问题。

## 17. Spring Boot 可执行 Jar

`start` 模块使用 Spring Boot Maven 插件重新打包：

```xml
<plugin>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-maven-plugin</artifactId>
    <configuration>
        <classifier>executable</classifier>
    </configuration>
</plugin>
```

可执行 Jar 的逻辑结构通常类似：

```text
application.jar
├── BOOT-INF/classes
│   ├── Application.class
│   └── application.properties
├── BOOT-INF/lib
│   ├── aboss-sso-adapter.jar
│   ├── aboss-sso-app.jar
│   ├── aboss-sso-infrastructure.jar
│   ├── aboss-sso-domain.jar
│   └── 第三方依赖.jar
└── Spring Boot Loader 相关类
```

Spring Boot 的类加载器会将 `BOOT-INF/classes` 和 `BOOT-INF/lib` 中的依赖作为应用 classpath 使用。

这就是应用打包后仍然能够扫描其他模块 Bean 的原因。

## 18. `pluginManagement` 与 `plugins`

这组概念与依赖管理很相似。

### 18.1 `plugins` 会启用插件

```xml
<build>
    <plugins>
        <plugin>
            <groupId>org.apache.maven.plugins</groupId>
            <artifactId>maven-compiler-plugin</artifactId>
        </plugin>
    </plugins>
</build>
```

插件会参与当前项目的构建。

### 18.2 `pluginManagement` 主要管理插件默认配置

```xml
<build>
    <pluginManagement>
        <plugins>
            <plugin>
                <groupId>org.apache.maven.plugins</groupId>
                <artifactId>maven-compiler-plugin</artifactId>
                <version>3.11.0</version>
            </plugin>
        </plugins>
    </pluginManagement>
</build>
```

它通常只是管理版本和默认配置。子模块需要在 `<plugins>` 中声明插件，才能明确启用相应插件配置。

可以类比：

```text
dependencies          ↔ plugins
dependencyManagement  ↔ pluginManagement
```

但 Maven 默认生命周期自带的插件绑定，以及父子 POM 合并规则，可能让实际行为更复杂，仍应通过 Effective POM 确认。

## 19. 多模块架构中的依赖方向

合理的依赖方向能够避免循环依赖和模块职责混乱。

当前项目可以粗略理解为：

```text
启动层 start
    ↓
入口适配层 adapter
    ↓
应用层 app
    ↓
领域/基础设施能力
```

但 `app` 直接依赖 `infrastructure`，说明当前工程更偏向分层工程实现，不是严格的依赖倒置架构。

更严格的整洁架构或六边形架构通常强调：

```text
外层实现依赖内层抽象
基础设施实现领域或应用层定义的接口
内层不直接依赖外层技术实现
```

是否采用严格依赖倒置，应根据项目复杂度、团队成本和现有架构决定，不能只为形式而拆分。

## 20. 循环依赖

如果：

```text
module-a 依赖 module-b
module-b 又依赖 module-a
```

Maven 无法得到合法的模块构建拓扑，通常会报告 Reactor 循环依赖。

常见解决方式：

- 提取双方共同使用的 DTO 和接口到独立模块；
- 将实现依赖改为接口依赖；
- 重新划分模块职责；
- 避免为了调用少量工具方法而形成反向依赖。

不应通过复制代码或滥用反射掩盖模块边界问题。

## 21. SNAPSHOT 与 RELEASE

### 21.1 SNAPSHOT

```text
1.0.0-SNAPSHOT
```

代表开发中的可变版本。远程仓库中的同一 SNAPSHOT 坐标可以随部署而更新。

特点：

- 适合开发联调；
- 构建结果可能随时间变化；
- Maven 会根据更新策略检查新快照。

### 21.2 RELEASE

```text
1.3.6-RELEASE
```

通常代表不可变的发布版本。相同版本号不应覆盖发布。

### 21.3 可重复构建

生产构建如果依赖动态 SNAPSHOT，可能导致同一代码在不同时间构建出不同产物。

提高可重复构建能力的方法包括：

- 发布过程使用固定版本；
- 使用 BOM 或 `dependencyManagement` 锁定版本；
- 避免版本范围；
- 保留构建使用的 JDK、Maven、Settings 和仓库信息；
- 对发布构件建立不可变策略。

## 22. 常用排查命令

### 22.1 查看依赖树

```bash
mvn dependency:tree
```

只看某个构件：

```bash
mvn dependency:tree \
  -Dincludes=com.aliyun.fsi.insurance:aboss-sso-client
```

查看冲突信息：

```bash
mvn dependency:tree -Dverbose
```

### 22.2 查看最终 POM

```bash
mvn help:effective-pom
```

指定模块：

```bash
mvn help:effective-pom -pl aboss-sso-app
```

### 22.3 查看最终 Settings

```bash
mvn help:effective-settings
```

适合排查：

- 镜像仓库；
- 私服地址；
- 激活的 profile；
- 认证配置是否来自预期 Settings。

注意不要把含凭据的 Settings 输出提交到代码仓库或公开日志。

### 22.4 查看激活的 Profile

```bash
mvn help:active-profiles
```

### 22.5 分析未使用和未声明依赖

```bash
mvn dependency:analyze
```

结果中的“未使用”不一定都能直接删除，因为反射、SPI、注解处理器、运行时加载等场景可能无法被静态分析识别。

### 22.6 构建指定模块及其依赖

```bash
mvn clean package -pl start -am
```

### 22.7 查看 Jar 内容

普通 Jar：

```bash
jar tf target/example.jar
```

检查可执行 Jar 的依赖：

```bash
jar tf target/example-executable.jar | rg 'BOOT-INF/lib'
```

检查某个类最终来自哪里，可以结合：

```bash
jar tf some-library.jar | rg '目标类名.class'
```

## 23. 常见误区

### 误区一：写进 `<modules>` 就可以互相调用

错误。`<modules>` 只负责聚合构建，代码可见性由 `<dependencies>` 决定。

### 误区二：`dependencyManagement` 会自动引入依赖

错误。它主要管理版本和规则，子模块一般仍需在 `<dependencies>` 中声明。

### 误区三：父 POM 中配置了依赖版本，所有子模块就都有该 Jar

如果版本配置位于 `dependencyManagement`，不会自动引入。如果位于父 POM 的 `dependencies`，才通常会被子模块继承为实际依赖。

### 误区四：目录名相同就会使用当前模块源码

错误。Maven 按完整 GAV 坐标匹配：

```text
groupId + artifactId + version
```

### 误区五：Spring 扫描的是 Maven 模块

错误。Spring 扫描的是运行时 classpath 中的包和类。

### 误区六：传递依赖可以永远依赖

不推荐。当前模块直接使用某个组件的公开类型时，应考虑显式声明依赖，避免上游模块调整导致编译突然失败。

### 误区七：能编译就说明运行时依赖正确

错误。`provided`、版本冲突、不同启动方式和容器类加载都可能造成编译成功但运行失败。

### 误区八：`mvn package` 后其他独立项目就能依赖本次构件

不一定。`package` 只在当前模块 `target` 中生成产物。其他独立构建通常需要该构件已执行 `install` 写入本地仓库，或已 `deploy` 到远程仓库。

## 24. 推荐实践

### 24.1 根 POM 集中管理版本

使用：

```xml
<properties>
<dependencyManagement>
<pluginManagement>
```

集中管理依赖和插件版本。

### 24.2 子模块只声明真正需要的依赖

不要因为方便就在父 POM 的 `<dependencies>` 中放入大量业务依赖。

### 24.3 保持清晰的依赖方向

避免：

```text
adapter ↔ app
app ↔ infrastructure
```

这样的循环或双向依赖。

### 24.4 对直接使用的依赖显式声明

降低对上游传递依赖结构的偶然耦合。

### 24.5 定期检查依赖树

升级框架、Starter 或公共组件后，重点检查：

- 同一组件是否出现多个版本；
- 是否意外引入旧日志框架；
- 是否存在重复 JSON、HTTP、日志实现；
- 是否出现易受攻击的旧依赖；
- 最终可执行 Jar 中实际包含哪个版本。

### 24.6 以构建结果为准

面对复杂继承、多个 BOM 和传递依赖时，不要仅凭肉眼推断。组合使用：

```bash
mvn help:effective-pom
mvn dependency:tree -Dverbose
jar tf 最终产物.jar
```

## 25. `aboss-sso` 的完整理解链路

```text
根 pom.xml
├── packaging=pom
├── modules：聚合全部模块
├── properties：维护公共版本属性
├── dependencyManagement：管理依赖版本和 BOM
└── dependencies/build：提供公共依赖和构建配置
        ↓
子模块通过 parent 继承根 POM
        ↓
子模块通过 dependencies 建立真实依赖关系
        ↓
Maven Reactor 根据真实依赖进行拓扑构建
        ↓
start 通过 adapter 的传递依赖获得其他模块构件
        ↓
这些构件进入运行时 classpath
        ↓
Spring 扫描 classpath 中
com.aliyun.fsi.insurance.sso 包下的组件
        ↓
Spring Boot Maven 插件把应用类和依赖重新组织为可执行 Jar
```

## 26. 一句话总结

Maven 多模块项目中，`<modules>` 解决“一起构建”，`<parent>` 解决“配置继承”，`<dependencies>` 解决“代码和运行时可见”，`<dependencyManagement>` 解决“版本与规则统一”；这些依赖最终组成 JVM classpath，Spring 才能在 classpath 上扫描不同模块中的组件。
