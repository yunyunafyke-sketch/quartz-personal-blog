---
title: Git常用命令
publish: true
date: 2026-09-11
---

## 🎨 Git 文件颜色代表什么

文件颜色表示 Git 文件状态，不是代码有没有错误。以 JetBrains/PyCharm 默认配色为例：

| 颜色 | Git 状态 | 含义 |
| --- | --- | --- |
| 红色 | Unversioned | 新文件，Git 还没有跟踪 |
| 绿色 | Added | 新文件已经加入暂存区，准备提交 |
| 蓝色 | Modified | 已跟踪的文件被修改了 |
| 灰色 | Ignored | 被 `.gitignore` 忽略 |
| 棕色/橙色 | Deleted | 已跟踪的文件被删除 |
| 普通颜色 | Unchanged | 与最近一次提交相比没有变化 |

> [!note] 颜色可能因 IDE 主题和设置不同而变化
> 最终应以文件所在分组和 `git status` 的输出为准。

## 一、💡 一句话理解

> [!tip] 核心结论
> Git 的日常操作可以记成一条线：查看改动 → 暂存文件 → 创建提交 → 推送远程。status 看状态，add 放入暂存区，commit 保存本地版本，push 上传远程仓库。

本文只整理 Git 本身的常用命令，不展开具体平台、插件或网络故障排查。

## 二、🧭 理论：Git 中的几个区域

Git 可以把一次修改看成在几个区域之间移动：

| 区域 | 白话理解 | 常见命令 |
| --- | --- | --- |
| 工作区（Working tree） | 你正在编辑的文件 | 直接修改文件 |
| 暂存区（Staging area） | 下一次提交准备包含的内容 | git add |
| 本地仓库（Repository） | 已经保存到本机 Git 历史中的版本 | git commit |
| 远程仓库（Remote） | GitHub、GitLab 等服务器上的仓库 | git push、git pull |

~~~text
修改文件
  ↓ git add
暂存区
  ↓ git commit
本地仓库
  ↓ git push
远程仓库
~~~

git status 用来查看当前文件处于哪一步。理解这几个区域，比死记命令更重要。

## 三、⚙️ 理论：一次完整的 Git 工作流

### 3.1 从修改到提交

~~~bash
git status
git diff
git add <文件名>
git diff --staged
git commit -m "说明本次修改"
~~~

这几条命令分别完成：查看状态、查看未暂存的内容、选择要提交的文件、检查暂存内容、创建本地提交。

### 3.2 从本地到远程

~~~bash
git pull
git push
~~~

pull 通常用于获取并整合远程的新提交，push 用于把本地已经提交的内容上传到远程。没有执行 commit 的本地修改，不能直接通过 push 上传。

## 四、🚀 实践：Git 常用命令

### 4.1 前置准备

#### 4.1.1 查看 Git 是否可用

~~~bash
git --version
~~~

输出版本号，说明 Git 已经安装并可以使用。

#### 4.1.2 进入项目目录

~~~bash
cd /项目所在目录
~~~

后续 Git 命令默认作用于当前目录及其父目录中最近的 Git 仓库。

#### 4.1.3 获取一个仓库

复制已有远程仓库：

~~~bash
git clone <仓库地址>
cd <项目目录>
~~~

把普通目录初始化为 Git 仓库：

~~~bash
git init
~~~

clone 适合已有远程仓库的项目；init 适合从本地新项目开始使用 Git。

#### 4.1.4 设置提交者信息

~~~bash
git config --global user.name "你的名字"
git config --global user.email "你的邮箱"
~~~

这些信息会写入后续提交中，用来标识提交者。

### 4.2 可以拿来干什么

#### 4.2.1 查看当前状态

~~~bash
git status
git status --short
~~~

git status 适合完整查看；git status --short 适合快速查看。

常见标记：

| 标记 | 含义 |
| --- | --- |
| M | 已修改的文件 |
| A | 已加入的新文件 |
| D | 已删除的文件 |
| ?? | 尚未被 Git 跟踪的新文件 |

#### 4.2.2 查看文件差异

查看尚未暂存的修改：

~~~bash
git diff
~~~

查看已经暂存、准备提交的修改：

~~~bash
git diff --staged
~~~

查看某个文件的修改：

~~~bash
git diff -- <文件名>
~~~

#### 4.2.3 暂存文件

暂存一个文件：

~~~bash
git add <文件名>
~~~

暂存多个指定文件：

~~~bash
git add <文件1> <文件2>
~~~

暂存当前目录下的全部改动：

~~~bash
git add .
~~~

暂存整个仓库中的新增、修改和删除：

~~~bash
git add -A
~~~

> [!warning] 提交前检查
> 使用 git add . 或 git add -A 后，最好执行一次 git status 和 git diff --staged，确认没有把不该提交的文件放进去。

#### 4.2.4 创建提交

~~~bash
git commit -m "简洁说明本次修改"
~~~

提交只会保存到本地仓库，不会自动上传到远程仓库。

常见提交说明可以采用“范围-动作”的格式：

~~~text
文档-补充 Git 常用命令
功能-修复登录校验
配置-调整构建参数
~~~

#### 4.2.5 查看提交历史

查看完整历史：

~~~bash
git log
~~~

查看简洁历史：

~~~bash
git log --oneline
~~~

查看带分支关系的历史：

~~~bash
git log --oneline --graph --decorate --all
~~~

查看某次提交的详细内容：

~~~bash
git show <提交编号>
~~~

#### 4.2.6 使用分支

查看本地分支：

~~~bash
git branch
~~~

创建并切换到新分支：

~~~bash
git switch -c feature/update-docs
~~~

切换到已有分支：

~~~bash
git switch main
~~~

删除已经合并的本地分支：

~~~bash
git branch -d feature/update-docs
~~~

合并分支：

~~~bash
git switch main
git merge feature/update-docs
~~~

分支适合把不同功能或不同类型的修改隔离开。完成修改后，再把分支合并回目标分支。

#### 4.2.7 查看和配置远程仓库

查看远程仓库地址：

~~~bash
git remote -v
~~~

添加远程仓库：

~~~bash
git remote add origin <仓库地址>
~~~

修改远程仓库地址：

~~~bash
git remote set-url origin <新仓库地址>
~~~

这里的 origin 只是远程仓库的本地简称，不是固定名称。

#### 4.2.8 获取和推送远程内容

只获取远程信息，不合并到当前分支：

~~~bash
git fetch origin
~~~

获取远程内容并整合到当前分支：

~~~bash
git pull
~~~

第一次推送当前分支，并建立跟踪关系：

~~~bash
git push -u origin main
~~~

建立跟踪关系后，通常可以直接推送：

~~~bash
git push
~~~

-u 会记录本地分支与远程分支的对应关系，之后执行 git push 或 git pull 时可以省略远程名称和分支名称。

#### 4.2.9 撤销常见操作

这一节要先判断：你是想取消暂存、丢弃本地修改，还是撤销已经提交并推送的内容。

| 当前情况 | 想要的结果 | 使用命令 |
| --- | --- | --- |
| 文件已经暂存，但还没有提交 | 取消暂存，保留文件修改 | git restore --staged <文件名> |
| 文件只在工作区中被修改 | 丢弃这次本地修改 | git restore <文件名> |
| 内容已经 commit，但还没有 push | 用一条新提交抵消旧提交 | git revert <提交编号> |
| 内容已经 push 到远程仓库 | 撤销远程内容，并把撤销提交再次 push | git revert <提交编号>，然后 git push |

##### 4.2.9.1 只取消暂存，不删除修改

例如，先把 README.md 放进暂存区：

~~~bash
git add README.md
~~~

后来发现暂时不想提交它，但修改内容还想保留：

~~~bash
git restore --staged README.md
~~~

执行后，README.md 会从“准备提交”变成“已修改但未暂存”。文件内容仍然存在，只是暂时不在下一次提交中。

可以用下面命令确认结果：

~~~bash
git status
~~~

##### 4.2.9.2 丢弃尚未提交的修改

如果确认某个文件的修改完全不需要了：

~~~bash
git restore README.md
~~~

这会恢复 README.md 的工作区内容。通常情况下，它会恢复到最近一次提交的版本。

> [!warning] 这个命令可能造成内容丢失
> 执行前建议先运行 git diff。确认内容确实不需要后，再执行 git restore <文件名>。

如果文件已经暂存过，工作区和暂存区可能不是同一个版本。遇到这种情况，先执行 git status 和 git diff --staged，确认自己要保留的是哪个版本。

##### 4.2.9.3 撤销已经提交的内容

如果错误内容已经执行过 commit，不建议直接删除历史记录。可以先查看提交编号：

~~~bash
git log --oneline -5
~~~

然后用 git revert 创建一条反向提交：

~~~bash
git revert <提交编号>
~~~

例如：

~~~text
A 提交：新增错误配置
B 提交：修复其他问题
执行 git revert A
C 提交：撤销 A 提交中的错误配置
~~~

原来的 A 提交仍然存在，只是新增的 C 提交把它造成的修改抵消了。这种方式更适合已经推送到远程、或者已经被其他人看到的提交。

##### 4.2.9.4 撤回已经 push 的提交

如果提交已经 push 到远程仓库，推荐使用下面的流程：

~~~bash
# 查看最近的提交，找到需要撤销的提交编号
git log --oneline -5

# 创建一条新的撤销提交
git revert <提交编号>

# 把撤销提交推送到远程仓库
git push
~~~

例如，某次提交已经推送到远程，但发现其中包含错误配置：

~~~text
A 提交：新增错误配置，并且已经 push
B 提交：git revert A 生成的撤销提交
再次 git push：把 B 提交推送到远程
~~~

这样不会删除远程历史，而是让远程仓库最终回到正确的文件内容。只要其他人可能已经拉取过这个提交，就优先使用这种方式。

> [!info] 最简单的记忆方法
> restore --staged：取消暂存，但保留修改。  
> restore：放弃未提交的修改。  
> revert：撤销已经提交的内容，并留下新的提交记录。  
> 已经 push：revert 之后还要再次 push。

#### 4.2.10 新增 `.gitignore` 规则后如何重新生效

`.gitignore` 只会自动忽略**尚未被 Git 跟踪**的文件。规则新增后，未跟踪文件会立即按新规则处理；已经进入暂存区或已经提交过的文件，仍会继续显示在 Git 中。

例如，新增下面的规则：

~~~gitignore
# 忽略 JetBrains 系列 IDE 生成的项目配置目录
.idea/

# 忽略 Python 项目的本地虚拟环境目录
.venv/

# 忽略所有以 .log 结尾的日志文件
*.log
~~~

##### 4.2.10.1 文件已经暂存，但还没有提交

如果仓库已经至少创建过一次提交，可以先将所有文件移出暂存区，再让 Git 按照新的 `.gitignore` 规则重新暂存：

~~~bash
# 将所有文件移出暂存区，但保留本地修改
git restore --staged .

# 根据新的 .gitignore 规则重新暂存当前目录下的所有改动
git add .

# 查看重新暂存后的结果，确认命中规则的文件已被忽略
git status
~~~

`git restore --staged .` 会清空当前仓库的暂存区，但不会删除工作区中的本地文件或修改。随后执行 `git add .` 时，Git 会按照最新的 `.gitignore` 重新判断：命中忽略规则的未跟踪文件不会进入暂存区，其他新增、修改和删除则会重新暂存。

如果仓库刚执行过 `git init`，还没有创建第一次提交，执行 `git restore --staged .` 可能出现：

~~~text
fatal: could not resolve HEAD
~~~

`HEAD` 通常表示当前分支最近一次提交。仓库尚无任何提交时，没有可供 `git restore --staged` 参照的版本，因此无法解析 `HEAD`。这种情况改用：

~~~bash
# 清空整个暂存区，但保留全部本地文件和修改；首次提交前也可以使用
git reset

# 按照最新的 .gitignore 规则重新暂存当前目录下的所有改动
git add .

# 检查重新暂存后的结果
git status
~~~

这里的 `git reset` 没有使用 `--hard`，只调整暂存区，不会删除本地修改。不要写成 `git reset --hard`，否则未提交的本地修改可能丢失。

##### 4.2.10.2 文件以前已经提交过

已经提交过的文件属于“被 Git 跟踪”的文件，需要先从 Git 索引中移除：

~~~bash
# 从 Git 索引中递归移除 .idea/，停止跟踪但保留本地目录
git rm -r --cached demos/hrms_account_linker/output/

# 把新增或修改后的 .gitignore 放入暂存区
git add .gitignore

# 创建本地提交，记录“停止跟踪 .idea/”和忽略规则的变化
git commit -m "配置-忽略 IDE 本地文件"
~~~

`--cached` 表示只停止 Git 跟踪，不删除工作区中的本地文件。提交并推送后，其他人拉取该提交时，这些文件会从仓库版本中移除，但他们本地由工具重新生成的同名目录仍会被忽略。

> [!warning] 优先指定准确路径
> 不建议为了“刷新全部规则”直接对整个仓库执行 `git rm -r --cached .`。它会重建整个暂存区，容易混入无关改动。已知目标时，应当只处理 `.idea/`、某个日志文件或其他确切路径。

##### 4.2.10.3 检查文件命中了哪条规则

~~~bash
# 显示目标文件命中的忽略规则、规则所在文件及行号
git check-ignore -v .idea/misc.xml
~~~

如果文件被忽略，命令会显示规则所在文件、行号、具体规则和目标文件。例如：

~~~text
.gitignore:62:.idea/    .idea/misc.xml
~~~

如果没有输出，说明该文件没有命中忽略规则，或者它已经被 Git 跟踪。可以继续用下面的命令检查它是否在索引中：

~~~bash
# 查询该文件是否已经存在于 Git 索引中
git ls-files -- .idea/misc.xml
~~~

有输出表示文件已被跟踪；没有输出表示文件不在 Git 索引中。

> [!info] 最简单的判断方法
> 未跟踪文件：新增规则后立即生效。  
> 已暂存且仓库已有提交：使用 `git restore --staged .` 清空暂存区，再用 `git add .` 按新规则重新暂存。  
> 已暂存但仓库尚无首次提交：使用 `git reset` 清空暂存区，再用 `git add .` 按新规则重新暂存。  
> 已经提交过：使用 `git rm --cached <文件>`；目录需要加 `-r`。  
> 不确定命中了哪条规则：使用 `git check-ignore -v <路径>`。

#### 4.2.11 获取命令帮助

~~~bash
git help <命令>
git <命令> --help
git <命令> -h
~~~

例如：

~~~bash
git commit --help
git push -h
~~~

### 4.3 完整实践：完成一次分支修改并推送

下面示例假设远程仓库地址是一个待填写的仓库地址，默认分支为 main，目标是修改文档并推送一个功能分支。

#### 4.3.1 获取项目并创建分支

~~~bash
# 第一次使用时复制远程仓库
git clone <仓库地址>
cd <项目目录>

# 开始工作前先确认当前状态
git status

# 创建并切换到本次工作的分支
git switch -c feature/update-docs
~~~

#### 4.3.2 查看并提交修改

编辑文件后执行：

~~~bash
# 查看工作区修改
git diff

# 只暂存准备提交的文件
git add <文件名>

# 再检查暂存区内容
git diff --staged

# 创建本地提交
git commit -m "文档-更新使用说明"
~~~

#### 4.3.3 推送分支

~~~bash
# 第一次推送该分支时建立跟踪关系
git push -u origin feature/update-docs
~~~

#### 4.3.4 合并回主分支

如果确认需要在本地合并，可以执行：

~~~bash
# 切回主分支并获取远程最新内容
git switch main
git pull

# 合并功能分支
git merge feature/update-docs

# 推送更新后的主分支
git push

# 删除已经合并的本地分支
git branch -d feature/update-docs
~~~

如果 pull 或 merge 产生冲突，需要先手动处理冲突文件，再执行 git add 和 git commit 完成合并。

## 五、📌 总结

- 查看状态：git status
- 查看修改：git diff、git diff --staged
- 暂存和提交：git add、git commit
- 查看历史：git log、git show
- 分支操作：git branch、git switch、git merge
- 远程同步：git fetch、git pull、git push
- 撤销操作：git restore、git revert
- 忽略文件：`.gitignore`、git check-ignore、git rm --cached

记忆句：**先看 status，再用 add，然后 commit，最后按需要 push。**

## 六、📚 官方资料

- [Git 官方 Pro Git：获取 Git 仓库](https://git-scm.com/book/en/v2/Git-Basics-Getting-a-Git-Repository)
- [Git 官方 Pro Git：记录仓库变更](https://git-scm.com/book/en/v2/Git-Basics-Recording-Changes-to-the-Repository)
- [Git 官方 Pro Git：查看提交历史](https://git-scm.com/book/en/v2/Git-Basics-Viewing-the-Commit-History)
- [Git 官方 Pro Git：撤销操作](https://git-scm.com/book/en/v2/Git-Basics-Undoing-Things)
- [Git 官方 Pro Git：使用远程仓库](https://git-scm.com/book/en/v2/Git-Basics-Working-with-Remotes)
- [Git 官方 git status 文档](https://git-scm.com/docs/git-status)
- [Git 官方 git switch 文档](https://git-scm.com/docs/git-switch)
- [Git 官方 git restore 文档](https://git-scm.com/docs/git-restore)
- [Git 官方 git reset 文档](https://git-scm.com/docs/git-reset)
- [Git 官方 git revert 文档](https://git-scm.com/docs/git-revert)
- [Git 官方 gitignore 文档](https://git-scm.com/docs/gitignore)
- [Git 官方 git check-ignore 文档](https://git-scm.com/docs/git-check-ignore)
- [Git 官方 git rm 文档](https://git-scm.com/docs/git-rm)
