---
title: Git常用命令与Obsidian推送排查
publish: true
---

# Git 常用命令与 Obsidian 推送排查

## 1. 当前项目笔记仓库

- 本地目录：`/Volumes/data/项目笔记`
- 当前分支：`master`
- 远程名称：`ProjectNote`
- GitHub 仓库：`https://github.com/yunyunafyke-sketch/ProjectNote.git`
- 当前跟踪关系：`master` → `ProjectNote/master`

进入仓库：

```bash
cd /Volumes/data/项目笔记
```

如果不想切换终端目录，也可以使用：

```bash
git -C /Volumes/data/项目笔记 status
```

## 2. 最常用的提交步骤

### 查看有哪些文件发生变化

```bash
git status
```

简洁显示：

```bash
git status --short
```

常见状态：

- `M`：文件已修改。
- `A`：新增文件。
- `D`：删除文件。
- `??`：Git 尚未跟踪的新文件。

### 查看具体修改内容

```bash
git diff
```

查看已经加入暂存区的内容：

```bash
git diff --staged
```

### 选择需要提交的文件

提交单个文件：

```bash
git add "hrms笔记/需求-系分/内部转外包0723/系分/文件名.md"
```

提交整个指定文件夹：

```bash
git add "hrms笔记/需求-系分/内部转外包0723"
```

加入当前仓库的全部改动：

```bash
git add -A
```

> 使用 `git add -A` 前先执行 `git status`，避免把 `.obsidian/workspace.json` 等界面状态文件一起提交。

### 创建本地提交

```bash
git commit -m "内部转外包0723-完善人员关联校验方案"
```

项目笔记建议使用下面的提交标题格式：

```text
文件夹-具体修改内容
```

例如：

```text
工作岗位0820-补充前后端字段契约
Obsidian配置-调整Git历史视图
Git使用说明-新增推送故障排查文档
```

### 推送到 GitHub

当前仓库使用的命令：

```bash
git push ProjectNote master
```

这条命令可以拆成四部分理解：

| 单词            | 含义        | 在当前仓库中的作用                                        |
| ------------- | --------- | ------------------------------------------------ |
| `git`         | 调用 Git 程序 | 告诉终端接下来要执行 Git 操作                                |
| `push`        | 推送        | 把本地已经创建好的提交上传到远程仓库                               |
| `ProjectNote` | 远程仓库名称    | 指向 GitHub 上的 `yunyunafyke-sketch/ProjectNote` 仓库 |
| `master`      | 分支名称      | 把本地 `master` 分支的提交推送到远程同名分支                      |

连起来就是：

> 使用 Git，把本地 `master` 分支中尚未上传的提交，推送到名为 `ProjectNote` 的远程仓库。

空格用于分隔命令的各个部分，顺序不能随意调换。`ProjectNote` 和 `master` 是当前仓库的实际名称，并不是所有项目都固定使用这两个词；其他仓库可能使用 `origin` 和 `main`。

### 怎么知道 GitHub 用户名和仓库地址

`yunyunafyke-sketch` 不是根据本机用户名猜出来的，而是来自当前仓库保存的远程地址。可以执行：

```bash
git remote -v
```

这条命令可以拆成三部分理解：

| 单词 | 含义 |
| --- | --- |
| `git` | 调用 Git 程序 |
| `remote` | 查看或管理远程仓库配置 |
| `-v` | `verbose` 的缩写，表示显示详细信息，包括完整地址 |

当前仓库会显示类似：

```text
ProjectNote  https://github.com/yunyunafyke-sketch/ProjectNote.git (fetch)
ProjectNote  https://github.com/yunyunafyke-sketch/ProjectNote.git (push)
```

其中：

- `ProjectNote`：本地为这个远程仓库设置的简称。
- `yunyunafyke-sketch`：GitHub 用户名或组织名。
- 最后的 `ProjectNote`：GitHub 仓库名称。
- `fetch`：这个地址用于获取远程内容。
- `push`：这个地址用于上传本地提交。

这里只是在读取本地 `.git/config` 中已经保存的地址，不需要登录或查询 GitHub 账号。

### 推送前先确认

推荐先执行：

```bash
git status
```

如果看到类似下面的内容：

```text
Your branch is ahead of 'ProjectNote/master' by 1 commit.
```

表示本地比 GitHub 多 1 个提交，可以执行推送。如果只看到文件被修改，但还没有提交，那么 `push` 不会上传这些未提交的修改；需要先执行 `git add` 和 `git commit`。

### 推送成功后会发生什么

- 本地提交会出现在 GitHub 仓库的 `master` 分支中。
- 文件仍保留在本地，不会因为推送而被删除。
- `git status` 不再显示本地分支领先远程分支。
- Obsidian 中尚未提交的界面状态或文档修改不会自动进入本次推送。

这相当于在 Obsidian Git 插件中点击 **Push**。需要注意：**Commit** 只是创建本地提交，**Push** 才是上传到 GitHub。

### 完整例子：和 Obsidian UI 对照操作

假设刚刚修改了 `Git笔记/Git常用命令与Obsidian推送排查.md`，希望把它保存为一条 Git 记录并上传到 GitHub：

| 操作步骤 | Obsidian 中的操作 | 对应命令 | 操作结果 |
| --- | --- | --- | --- |
| 1. 查看变化 | 打开 Source Control / Changes | `git status` | 查看哪些文件被修改、新增或删除 |
| 2. 选择文件 | 点击文件旁边的 `+` 或 Stage | `git add "文件路径"` | 把这个文件放入本次待提交清单 |
| 3. 保存本地记录 | 填写提交说明并点击 Commit | `git commit -m "提交说明"` | 创建一条只保存在本地的提交记录 |
| 4. 上传 GitHub | 点击 Push | `git push ProjectNote master` | 把尚未上传的本地提交推送到 GitHub |
| 5. 获取远程内容 | 点击 Pull | `git pull` | 把 GitHub 上的新提交拉到本地 |

> 有些版本的 Obsidian Git 插件提供 Backup 按钮。它可能连续执行暂存、提交和推送，具体行为取决于插件设置，因此操作前仍建议先查看 Changes。

#### 一次完整操作示例

在 Obsidian 中：

1. 打开 **Source Control / Changes**，确认只有准备保存的笔记。
2. 点击笔记旁边的 **Stage** 或 `+`。
3. 输入提交说明：`Git笔记-补充推送命令与UI对照说明`。
4. 点击 **Commit**，然后点击 **Push**。

对应的终端命令是：

```bash
git status
git add "Git笔记/Git常用命令与Obsidian推送排查.md"
git commit -m "Git笔记-补充推送命令与UI对照说明"
git push ProjectNote master
```

这四条命令分别表示：

- `git status`：查看 UI 的 Changes 列表。
- `git add`：相当于选择或 Stage 指定文件。
- `git commit`：相当于填写说明后点击 Commit，只保存本地记录。
- `git push`：相当于点击 Push，把已经提交的记录上传到 GitHub。

推送成功后，重新执行 `git status`，通常不会再显示本地分支领先 `ProjectNote/master`；但没有提交的文件仍会继续显示在 Changes 中。

因为已经设置了上游分支，也可以直接使用：

```bash
git push
```

第一次设置跟踪关系时使用：

```bash
git push -u ProjectNote master
```

`-u` 会让本地 `master` 记住对应的远程分支。以后直接执行 `git push` 和 `git pull` 即可。

## 3. 拉取远程内容

获取远程信息但不修改本地文件：

```bash
git fetch ProjectNote
```

拉取并合并当前分支：

```bash
git pull
```

推荐在开始编辑前拉取一次，提交并推送前再确认一次状态。

## 4. 查看提交记录

查看普通日志：

```bash
git log
```

查看简洁的树状历史：

```bash
git log --oneline --graph --decorate --all
```

查看最近五次提交：

```bash
git log -5 --oneline
```

查看某次提交修改了什么：

```bash
git show 提交编号
```

## 5. 修改最近一次提交文字

仅修改最近一次、尚未推送的提交说明：

```bash
git commit --amend -m "新的中文提交说明"
```

注意事项：

- `amend` 不是一条新的说明，而是用新提交替换最近一次提交。
- 如果最近一次提交已经推送，修改后提交编号会变化，普通推送可能被拒绝。
- 已经与别人共享的历史不要随意改写。
- 不建议为了修改旧文字直接使用强制推送；操作前应先确认影响范围。

## 6. 撤销尚未提交的操作

把文件移出暂存区，但保留文件修改：

```bash
git restore --staged "文件名.md"
```

放弃某个文件尚未提交的修改：

```bash
git restore "文件名.md"
```

> `git restore` 会覆盖未提交内容。执行前先查看 `git diff`，确认修改确实不再需要。

## 7. 初始化与远程仓库配置

把普通文件夹初始化为 Git 仓库：

```bash
git init
```

查看远程仓库：

```bash
git remote -v
```

添加远程仓库：

```bash
git remote add ProjectNote https://github.com/yunyunafyke-sketch/ProjectNote.git
```

修改远程地址：

```bash
git remote set-url ProjectNote https://github.com/yunyunafyke-sketch/ProjectNote.git
```

删除不再使用的远程配置：

```bash
git remote remove 远程名称
```

删除远程配置只会删除本地仓库里的连接信息，不会删除本地提交，也不会删除 GitHub 上的仓库。

## 8. 为什么 Codex 能推送，Obsidian 却可能报 443

这次 Codex 实际使用的是系统 Git：

```text
git version 2.49.0
```

当前系统 Git 的全局凭证助手是：

```text
credential.helper=store
```

因此，系统 Git 可以读取已经保存的 GitHub 凭证，再通过 HTTPS 连接 GitHub。Codex 执行 `git push` 时使用的正是这套系统 Git、网络环境和凭证配置。

Obsidian 插件失败，通常是因为下面某一项与终端环境不同：

- 插件没有使用同一个系统 Git。
- Obsidian 进程没有继承终端里的代理设置。
- 插件没有读取到系统 Git 保存的凭证。
- 防火墙、代理软件或网络规则拦截了 Obsidian 对 GitHub 的访问。
- 插件配置的远程名称、仓库地址或分支不正确。

### 443 到底是什么

`443` 通常不是 Git 的错误编号，而是 HTTPS 使用的网络端口。

如果错误中包含下面这些内容：

```text
Failed to connect to github.com port 443
Connection timed out
Connection refused
```

说明 Git 还没有成功连接到 GitHub，优先检查网络和代理，而不是提交内容。

### 先在终端验证

```bash
git -C /Volumes/data/项目笔记 ls-remote ProjectNote
```

如果能列出远程分支，说明系统 Git 可以访问仓库。再测试：

```bash
git -C /Volumes/data/项目笔记 push
```

- 终端成功、Obsidian 失败：重点检查 Obsidian Git 插件使用的 Git 路径、认证方式和代理环境。
- 终端也失败：重点检查系统网络、代理软件、DNS 和 GitHub 可访问性。

### 查看 Git 是否配置了代理

```bash
git config --global --get http.proxy
git config --global --get https.proxy
```

没有输出表示 Git 没有设置对应代理。是否需要设置代理以及端口是多少，取决于本机代理软件的实际配置，不能照抄别人的端口。

### 443 与 403 不要混淆

- `443` 连接失败：通常是网络或代理问题。
- `403 Forbidden`：已经连接到 GitHub，但账号凭证没有权限。
- `Authentication failed`：凭证无效、已过期，或者认证方式不正确。
- `Repository not found`：仓库地址错误，或者当前账号无权查看私有仓库。

GitHub 的 HTTPS 推送不能使用账号登录密码，需要使用有效的访问令牌或其他受支持的认证方式。

## 9. 凭证安全提醒

当前的 `credential.helper=store` 通常会把 Git 凭证保存在用户目录的凭证文件中，安全性低于 macOS 钥匙串。不要把该凭证文件上传到仓库，也不要把令牌粘贴到笔记、截图或聊天记录中。

macOS 可以考虑改用钥匙串：

```bash
git config --global credential.helper osxkeychain
```

修改后，下一次认证可能需要重新输入 GitHub 用户名和访问令牌。切换前应先确认令牌仍然可用，不要直接删除原凭证。

## 10. Obsidian 中的操作对应关系

| Obsidian Git 操作 | 对应的 Git 行为 |
| --- | --- |
| Commit | 创建本地提交，不等于上传 GitHub |
| Push | 把本地新增提交上传到 GitHub |
| Pull | 把 GitHub 上的新提交拉到本地 |
| Backup | 通常按插件设置依次执行暂存、提交和推送 |
| Amend | 替换最近一次提交，可同时修改提交文字 |
| Source Control / Changes | 查看尚未提交的文件变化 |
| Git Graph | 查看分支、远程分支和提交关系 |

如果只想保存本地历史，执行 Commit 即可；如果希望 GitHub 上也出现这些记录，还需要 Push。

## 11. 项目笔记推荐流程

```bash
cd /Volumes/data/项目笔记
git status --short
git diff
git add "需要提交的笔记或文件夹"
git diff --staged
git commit -m "文件夹-具体修改内容"
git push
git status --short
```

最后一次 `git status --short` 用于确认提交后还剩哪些未处理的文件。Obsidian 的工作区状态文件经常会自动变化，应根据 `.gitignore` 和实际需要决定是否提交。
