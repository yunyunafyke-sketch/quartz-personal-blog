---
title: npm与npx的区别
publish: true
---

# npm 与 npx 的区别

## 一、一句话理解

`npm` 主要负责管理 Node.js 项目中的软件包；`npx` 主要负责临时运行某个软件包提供的命令。简单说：**npm 管理工具，npx 运行工具。**

## 二、理论：npm 和 npx 是什么

### 2.1 npm 是什么

`npm` 是 Node.js 生态中最常用的包管理工具。它可以连接 npm Registry，帮助我们：

- 安装项目依赖；
- 卸载和更新依赖；
- 管理 `package.json`；
- 执行项目脚本；
- 管理依赖版本和锁文件。

例如：

```bash
npm install axios
```

这条命令会把 `axios` 安装到当前项目，并通常更新 `package.json` 和锁文件。

### 2.2 npx 是什么

`npx` 是 npm 提供的命令执行器，用来运行 npm 包中的 CLI 命令。

例如：

```bash
npx prettier . --write
```

它会寻找或准备 `prettier` 命令，然后执行格式化操作。

现代 npm 中，`npx` 与 `npm exec` 是同一类能力的不同入口。`npx` 更适合直接在终端中使用，`npm exec` 更适合写进脚本或需要明确控制参数解析的场景。[npm 官方文档](https://docs.npmjs.com/cli/npm-exec/)

### 2.3 两者的关系

可以把它们理解成一套工具中的两个角色：

```text
npm 负责下载、安装、升级和管理软件包
                         ↓
npx 负责找到并运行软件包提供的命令
```

`npx` 通常会优先使用当前项目中已经存在的命令；如果本地没有，可能从 npm Registry 下载到缓存中再运行，不一定永久安装到项目或系统中。

## 三、理论：npm 和 npx 是怎么工作的

### 3.1 npm 的基本工作方式

当执行：

```bash
npm install prettier
```

大致会发生以下事情：

1. 查询并下载 `prettier` 包。
2. 把包放入当前项目的 `node_modules`。
3. 将依赖信息写入 `package.json`。
4. 更新 `package-lock.json` 或其他锁文件。
5. 以后项目可以直接复用这份依赖。

### 3.2 npx 的基本工作方式

当执行：

```bash
npx prettier . --write
```

大致会发生以下事情：

1. 查找当前项目是否已经安装 `prettier`。
2. 如果存在，优先运行项目中的版本。
3. 如果不存在，根据命令需要准备可执行包。
4. 把命令行参数传给 `prettier`。
5. 执行完成后，不要求把工具作为项目依赖永久保存。

因此，`npx` 适合一次性运行、快速试用或不想污染当前项目依赖的工具。

### 3.3 命令中的参数属于谁

这是使用 `npx` 时最容易混淆的地方：

```bash
npx -y skills add tt-a1i/archify -g
```

可以拆成：

| 部分 | 所属 | 作用 |
| --- | --- | --- |
| `npx` | npm | 运行命令行工具 |
| `-y` | npx | 下载工具时自动确认 |
| `skills` | npx 要运行的工具 | Skills 命令行工具 |
| `add` | skills | 安装 Skill 的子命令 |
| `tt-a1i/archify` | skills | 要安装的 GitHub 仓库 |
| `-g` | skills | 全局安装 Skill |

这里最后的 `-g` 不是 npx 的全局安装参数，而是 `skills add` 的参数。

## 四、实践：npm 常用命令

### 4.1 安装项目依赖

```bash
npm install
```

按照 `package.json` 和锁文件安装项目依赖。

### 4.2 安装一个依赖

```bash
npm install axios
```

安装运行时依赖。

安装开发依赖：

```bash
npm install --save-dev eslint
```

也可以写成：

```bash
npm install -D eslint
```

### 4.3 执行 package.json 脚本

假设 `package.json` 中有：

```json
{
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "test": "vitest"
  }
}
```

执行脚本：

```bash
npm run dev
npm run build
npm test
```

### 4.4 查看和更新依赖

```bash
npm list
npm outdated
npm update
```

这些命令分别用于查看依赖树、检查过期依赖和更新依赖。

## 五、实践：npx 常用命令

### 5.1 运行项目中的工具

```bash
npx eslint src
npx prettier . --write
npx vitest
```

如果项目已经在 `devDependencies` 中安装了这些工具，`npx` 通常会优先使用项目版本。

### 5.2 创建一个新项目

```bash
npx create-vite@latest my-app
```

含义是：运行 `create-vite` 的最新版本，并创建名为 `my-app` 的项目。

### 5.3 临时运行 TypeScript 工具

```bash
npx tsx app.ts
```

这会运行 `tsx`，让它执行 `app.ts`。

### 5.4 固定工具版本

```bash
npx prettier@3.6.2 . --write
```

`@3.6.2` 表示使用指定版本，而不是任意版本。

### 5.5 自动确认下载

```bash
npx -y skills add tt-a1i/archify -g
```

`-y` 或 `--yes` 表示：如果 npx 需要准备命令行工具，不再询问是否确认。

## 六、最小例子：用 npx 安装 archify Skill

### 6.1 archify 是什么

[archify](https://github.com/tt-a1i/archify) 是一个第三方 Agent Skill，可以帮助 Codex 生成架构图、工作流图、时序图、数据流图和生命周期图。

它不是直接由 Codex `/plugins` 浏览器安装的完整 Plugin，而是通过 `skills` 命令行工具安装的第三方 Skill。

### 6.2 全局安装

```bash
npx skills add tt-a1i/archify -g
```

这里的执行链路是：

```text
npx
  ↓
运行 skills 命令行工具
  ↓
skills add
  ↓
下载 tt-a1i/archify
  ↓
安装到全局 Skill 目录
```

安装完成后，重新启动 Codex 或新建会话，然后提出任务：

```text
分析当前仓库，然后使用 archify 创建一张高层运行时架构图。
展示核心组件、主要调用路径、外部依赖和信任边界。
```

### 6.3 临时试用

如果只想试用，不想进行永久安装：

```bash
npx skills use tt-a1i/archify@archify --agent codex
```

这条命令同样使用 `npx` 运行 `skills`，但调用的是 `use` 子命令，而不是 `add`。

### 6.4 这条命令为什么不用 npm install

也可以先把 `skills` 命令行工具安装到全局，再使用它：

```bash
npm install -g skills
skills add tt-a1i/archify -g
```

但一次性使用时，`npx skills ...` 更简洁，因为不需要先把 `skills` 工具永久安装到系统中。

## 七、npm 和 npx 的区别

| 对比项 | npm | npx |
| --- | --- | --- |
| 核心作用 | 管理软件包和项目依赖 | 运行软件包提供的命令 |
| 是否强调安装 | 是 | 不一定永久安装 |
| 常见对象 | 项目依赖、开发依赖、脚本 | CLI 工具、脚手架、一次性命令 |
| 是否修改 package.json | 安装依赖时通常会 | 通常不会 |
| 常见命令 | `npm install`、`npm run` | `npx prettier`、`npx create-vite` |
| 适合场景 | 项目长期使用某个包 | 临时运行或快速试用工具 |

## 八、如何选择

### 8.1 项目长期依赖一个工具

使用 npm：

```bash
npm install --save-dev prettier
```

然后在项目脚本或命令中使用：

```bash
npx prettier . --write
```

这样可以固定项目使用的 Prettier 版本。

### 8.2 只想快速试用一个工具

使用 npx：

```bash
npx create-vite@latest demo
```

### 8.3 想保存一套项目命令

使用 npm 的 `scripts`：

```json
{
  "scripts": {
    "format": "prettier . --write"
  }
}
```

执行：

```bash
npm run format
```

### 8.4 想安装第三方 Skill

按照 Skill 项目 README 提供的命令执行。例如 archify：

```bash
npx skills add tt-a1i/archify -g
```

不能因为命令中出现 `npx`，就认为所有 npx 命令都是安装操作。npx 只负责运行后面的工具，具体是安装、创建项目还是生成文件，取决于后面的子命令。

## 九、常见误区

### 9.1 误以为 npx 等于 npm install

两者不是一回事：

```bash
npm install prettier
```

重点是把 Prettier 安装为项目依赖；

```bash
npx prettier . --write
```

重点是运行 Prettier 命令。

### 9.2 误以为每个 npx 都是临时的

`npx` 是命令执行入口。后面的工具可能会创建项目、写入文件、安装依赖或修改系统配置。是否产生持久化变化，取决于后面的命令。

### 9.3 误以为 `-g` 总是 npx 的参数

例如：

```bash
npx skills add tt-a1i/archify -g
```

这里的 `-g` 属于 `skills add`；它表示 Skill 全局安装，不表示 npx 全局安装。

### 9.4 直接运行来源不明的 npx 命令

`npx` 可能从网络准备并运行软件包。执行陌生命令前，应先检查 npm 包、GitHub 仓库、版本和它会运行的脚本。

## 十、总结

### 10.1 一句话总结

**npm 负责管理 Node.js 软件包，npx 负责运行软件包提供的命令；命令最终做什么，要看 npx 后面的工具和子命令。**

### 10.2 记忆方法

```text
npm install  → 把工具装进项目
npm run      → 执行项目脚本
npx          → 直接运行某个工具
npx -y       → 运行时自动确认
```

### 10.3 官方参考资料

- [npm 官方：npm exec / npx](https://docs.npmjs.com/cli/npm-exec/)
- [npm 官方：npm install](https://docs.npmjs.com/cli/install/)
- [archify GitHub 仓库](https://github.com/tt-a1i/archify)
