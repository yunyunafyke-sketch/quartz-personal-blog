---
publish: true
title: 使用 rsync 增量部署 Quartz 博客
---
# 使用 rsync 增量部署 Quartz 博客

## 一、一句话理解

`rsync` 就像“智能搬运”：它会比较本地和服务器的文件，只上传新增或内容真正修改过的部分，比宝塔逐个上传快得多。

## 二、理论：它是什么

当前通过宝塔上传时，浏览器需要逐个处理 `public` 里的文件。文件越多，重复请求越多，即使总容量不大也会很慢。

`rsync` 会对比两个位置：

- 本地：Quartz 生成的 `public` 文件夹
- 服务器：`/www/AfykeBlog/afyke-blog`
- 传输通道：SSH

本地和服务器之间需要先建立网络连接，`rsync` 才能把文件传过去。本教程使用 SSH 作为这条安全的连接通道。

### 2.1 SSH 是什么

SSH 的全称是 **Secure Shell（安全外壳协议）**，是一种通过网络安全地登录和操作远程计算机的通信协议。

可以把它理解为：坐在自己的 Mac 前，通过一条加密线路，使用服务器的终端。

SSH 在连接过程中主要负责：

- **找到服务器**：根据 IP 地址和 SSH 端口发起连接。
- **验证登录身份**：使用密码或 SSH 密钥确认你有权登录。
- **加密通信内容**：防止登录凭证、命令和传输文件在网络中被直接窃取。
- **提供远程操作通道**：可以执行服务器命令，也可以为 `scp`、`sftp` 和 `rsync` 传输文件。

例如：

```bash
ssh -p 22 root@47.99.178.186
```

这条命令表示：通过 SSH 的 `22` 端口，使用 `root` 账号登录 `47.99.178.186` 这台服务器。

在后面的 `rsync` 命令中，两者的分工是：

- `rsync` 负责比较文件，判断哪些内容需要同步。
- SSH 负责验证身份，并提供加密的文件传输通道。

一句话记忆：**SSH 是安全连接和操作服务器的协议。**

如果服务器目标目录是空的，第一次使用时需要上传全部文件。如果服务器已有通过宝塔上传的同内容文件，使用 `-c` 比较内容后可以跳过它们。之后修改一篇文章，通常只会传输相关页面和资源。

## 三、理论：它是怎么工作的

部署过程是：

```text
Markdown 笔记
    ↓
Quartz 构建
    ↓
生成 public 文件夹
    ↓
rsync 比较本地与服务器文件内容
    ↓
只上传发生变化的文件
```

`rsync` 不负责生成博客，它只负责同步文件。因此每次部署前，仍需先运行 Quartz 构建命令。

## 四、实践：部署前准备

本教程暂时按以下信息操作：

- 服务器地址：`47.99.178.186`
- SSH 用户：`root`
- SSH 端口：`22`
- 服务器网站目录：`/www/AfykeBlog/afyke-blog`
- 本地生成目录：`public`

如果你的 SSH 端口不是 `22`，需要把后面命令里的 `22` 换成实际端口。

### 4.1 打开本地博客目录

构建和同步命令必须在 **Mac 本地终端**中执行，不是在 SSH 登录后的服务器终端中执行。

本机 Quartz 项目的实际路径是：

```text
/Users/chenweili/Documents/quartz
```

打开 Mac 的“终端”，输入：

```bash
cd /Users/chenweili/Documents/quartz
```

接着查看当前目录：

```bash
pwd
```

再确认这里存在 `public`：

```bash
ls public
```

能够看到博客文件，就说明位置正确。

> [!IMPORTANT]
> `/www/AfykeBlog/afyke-blog` 是服务器上的接收目录，不是 Mac 上的 Quartz 项目。服务器的 `/root/Public` 也与 Quartz 生成的本地 `public` 无关。

### 4.2 构建最新博客

运行：

```bash
npx quartz build
```

这会根据当前 Markdown 笔记重新生成 `public`。

## 五、第一次测试连接

运行：

```bash
ssh -p 22 root@47.99.178.186
```

第一次连接可能出现确认提示，输入：

```text
yes
```

然后输入服务器的 SSH 密码。

输入密码时，终端不会显示圆点或星号，这是正常现象。直接输入完成后按回车即可。

连接成功后，运行：

```bash
exit
```

退出服务器，回到 Mac。

## 六、最小部署例子

### 6.1 先预演，不实际上传

运行：

```bash
rsync --8-bit-output -azcni --no-times -e "ssh -p 22" public/ root@47.99.178.186:/www/AfykeBlog/afyke-blog/
```

这里的 `-n` 表示“只预览”，不会真的修改服务器。`-c` 会比较文件实际内容，`-i` 只列出发生变化的项目，`--no-times` 忽略文件和目录的修改时间差异，`--8-bit-output` 用于在 Mac 终端中正常显示中文文件名。

> [!IMPORTANT]
> 预演命令中含有 `n`，只会显示差异，不会上传文件。如果只重复运行预演，服务器始终不会更新，同一批变更每次都会继续显示。

确认目标目录正确后，再进行正式上传。

### 6.2 正式同步

运行：

```bash
rsync --8-bit-output -azci --no-times --progress -e "ssh -p 22" public/ root@47.99.178.186:/www/AfykeBlog/afyke-blog/
```

输入 SSH 密码后开始同步。

以后每次更新博客，只需先运行：

```bash
npx quartz build
```

然后运行：

```bash
rsync --8-bit-output -azci --no-times --progress -e "ssh -p 22" public/ root@47.99.178.186:/www/AfykeBlog/afyke-blog/
```

## 七、让服务器与本地完全一致

普通同步不会删除服务器上的旧文件。例如你在本地删除了一篇文章，服务器可能还会保留原来的网页。

确认 `/www/AfykeBlog/afyke-blog` 只存放 Quartz 生成文件后，可以增加 `--delete`：

```bash
rsync --8-bit-output -azcni --no-times --delete -e "ssh -p 22" public/ root@47.99.178.186:/www/AfykeBlog/afyke-blog/
```

先通过 `-n` 查看准备删除的文件。确认无误后，去掉 `n`：

```bash
rsync --8-bit-output -azci --no-times --delete --progress -e "ssh -p 22" public/ root@47.99.178.186:/www/AfykeBlog/afyke-blog/
```

> [!WARNING]
> `--delete` 会删除服务器目录中、本地 `public` 不存在的内容。如果网站目录里还放着手工上传的文件，不要使用这个参数。

## 八、命令中的参数是什么意思

- `-a`：递归同步目录，并尽量保留文件信息
- `-v`：显示详细处理过程；当前推荐命令不使用，避免输出过多目录
- `-z`：传输时压缩内容
- `-c`：计算校验和，按文件实际内容判断是否变化
- `-n`：只预演，不实际修改
- `-i`：按变化类型列出需要更新或删除的项目
- `--no-times`：不同步文件和目录的修改时间，避免把“内容相同、只有时间不同”的文件列为变更
- `--8-bit-output`：让 Mac 自带的旧版 `rsync` 在终端中直接显示中文文件名
- `--progress`：显示传输进度
- `--delete`：删除服务器上多余的旧文件
- `-e "ssh -p 22"`：使用 SSH 的 `22` 端口连接

`public/` 最后的 `/` 很重要。它表示同步 `public` 里面的内容，而不是在服务器中再建立一层 `public` 文件夹。

`-azcni` 是简写组合，等价于：

```bash
-a -z -c -n -i
```

预演时使用 `-azcni`；正式同步时去掉代表预演的 `n`，改为 `-azci`。

精简预演输出中可能看到：

```text
<fcsT.... index.xml
*deleting   旧文件.html
```

- `<f`：该文件需要从 Mac 上传到服务器。
- `c`：文件内容校验和不同。
- `s`：文件大小不同。
- `*deleting`：使用 `--delete` 时，该服务器文件准备被删除。
- 没有列出任何项目：本地与服务器已经一致。

## 九、常见问题

### 9.1 Connection refused

通常表示 SSH 端口不正确、SSH 服务未开启，或者防火墙没有放行对应端口。

### 9.2 Permission denied

这表示服务器和 SSH 端口已经连通，但身份验证失败。先确认登录命令中使用的是正确账号：

```bash
ssh -p 22 root@47.99.178.186
```

这里需要输入的是服务器 `root` 账号的登录密码，不是 Mac 密码、宝塔面板密码或数据库密码。输入密码时终端不显示字符是正常现象。

如果账号和密码确认无误，再检查服务器是否禁止 `root` 通过 SSH 密码登录。

### 9.3 `ls public` 提示没有这个目录

先看终端提示符。如果类似：

```text
[root@服务器名]#
```

说明当前仍在服务器中。执行：

```bash
exit
```

回到 Mac 后，再进入本地 Quartz 项目并检查：

```bash
cd /Users/chenweili/Documents/quartz
ls public
```

Linux 区分大小写。服务器的 `/root/Public` 是另一个目录，不是 Quartz 的 `public`。

### 9.4 `change_dir "/root//public" failed`

这个错误表示 `rsync` 在服务器的 `/root` 中寻找 `public`，通常是因为把本应在 Mac 上执行的同步命令，执行在了 SSH 服务器中。

此时也等于让服务器通过公网 IP 再连接自己，没有实际意义。先执行 `exit`，然后在 Mac 的 `/Users/chenweili/Documents/quartz` 目录重新运行。

### 9.5 服务器已经有文件，为什么第一次 `rsync` 还是列出很多文件

`rsync` 不知道文件以前是通过宝塔上传的，它只能比较当前的文件信息。宝塔上传后的修改时间往往与 Mac 本地不同，所以默认比较会把它们列为需要处理的文件。

本教程在命令中加入 `-c`，改为比较文件实际内容。如果内容完全相同，就不会重新上传。

### 9.6 第二次同步仍显示很多 `xfer`，是否重新上传了全部文件

不一定。Quartz 重新构建时可能会改写大量文件的修改时间。不带 `-c` 时，`rsync` 会让它们进入传输检查流程，但仍可能只传输差异数据块。

以本次实际输出为例：

```text
sent 145043 bytes
received 112308 bytes
total size is 14347377
speedup is 55.75
```

网站总大小约为 `14.35 MB`，Mac 实际发送约 `145 KB`，总通信量约 `257 KB`。这表示并没有完整重传全部文件。

使用 `-c` 后，只有内容真正变化的文件才需要传输。代价是本地和服务器都要读取文件并计算校验和，但当前网站只有十几 MB，开销很小。

### 9.7 怎样看懂预演结果

例如：

```text
178 files to consider
sent 8204 bytes  received 20 bytes
total size is 14347377  speedup is 1744.57
```

- `178 files to consider`：检查了 `178` 个文件，不是上传了 `178` 个文件。
- `sent` 和 `received`：本次实际通信量，包括文件数据、校验和与控制信息。
- `total size`：所有本地网站文件的总大小，不是本次上传量。
- `speedup`：总文件量与实际通信量的比值。数字越大，表示避免传输的内容越多。

如果中间没有列出任何文件名，说明本地和服务器的文件内容已经一致，不需要正式同步。

### 9.8 为什么重复预演时，每次都显示同一批变更

预演命令中的 `n` 是 `dry-run`，只显示计划执行的变更，不会实际上传或删除文件。

因此，只重复运行 `-azcni` 时，服务器内容并没有更新，同一批差异会一直显示。确认预演结果后，必须去掉 `n`，使用 `-azci` 执行正式同步。

正式同步完成后，不要重新构建，立即再运行预演。如果没有新的本地改动，此时应该不再列出文件。

### 9.9 为什么会显示大量 `.f..t....`

`.f..t....` 表示文件内容相同，只有修改时间不同。Quartz 重新构建时会改写大量输出文件的时间，因此可能产生大量这类输出。

当前推荐命令使用 `--no-times`，不同步修改时间。这样 `.f..t....` 不会再显示，只保留内容、大小或删除状态真正发生变化的项目。

### 9.10 中文文件名在终端中显示为乱码

如果终端中的中文路径显示为 `\#207`、`\#224` 等转义字符，通常是 Mac 自带的旧版 `rsync` 对高位字符进行了转义显示。

命令中加入下列参数：

```text
--8-bit-output
```

它只改变终端显示方式，不会改变或重新编码服务器文件。

如果加上后仍不能显示中文，再检查 `~/.zshrc` 末尾是否包含：

```bash
unset LC_ALL
export LANG=en_US.UTF-8
export LC_CTYPE=en_US.UTF-8
```

修改后执行：

```bash
source ~/.zshrc
```

### 9.11 rsync: command not found

说明服务器没有安装 `rsync`，需要根据服务器系统安装对应的软件包。

### 9.12 服务器目录没有写入权限

当前命令使用 `root`，通常有权限。如果换成其他用户，需要为该用户配置网站目录写入权限。

### 9.13 同步成功但网站没有变化

依次检查：

1. 是否先运行了 `npx quartz build`
2. 上传目标是否为网站实际运行目录
3. 浏览器或 CDN 是否缓存了旧页面
4. Nginx 网站根目录是否指向 `/www/AfykeBlog/afyke-blog`

### 9.14 首页能打开，但所有文章都是 404

如果 `index.html` 可以正常显示，但点击文章后进入 Quartz 的“私有笔记或笔记不存在”页面，通常不是文章没有上传，而是 Nginx 缺少无扩展名路由规则。

Quartz 生成的文章链接通常不带 `.html`。例如浏览器访问：

```text
/博客搭建笔记/quartz/quartz个人博客使用教程
```

服务器中对应的真实文件却是：

```text
/博客搭建笔记/quartz/quartz个人博客使用教程.html
```

如果 Nginx 只查找原始地址，就找不到实际的 `.html` 文件，于是返回 `404.html`。首页本身对应 `index.html`，所以仍然可以正常显示。

#### 9.14.1 快速验证

在出现 404 的文章地址末尾手动添加 `.html`。如果添加后能正常打开，就可以确认是 Nginx 路由规则问题。

#### 9.14.2 宝塔中的修复方法

进入：

```text
网站 → 对应站点 → 设置 → 配置文件
```

确认网站根目录正确：

```nginx
root /www/AfykeBlog/afyke-blog;
index index.html;
```

本次宝塔站点的实际配置为：

```nginx
listen 100;
server_name 47.99.178.186;
root /www/AfykeBlog/afyke-blog;
```

当前配置中没有 `location /`。在下面这段配置之后：

```nginx
#REWRITE-START URL重写规则引用,修改后将导致面板设置的伪静态规则失效
include /www/server/panel/vhost/rewrite/47.99.178.186_100.conf;
#REWRITE-END
```

加入：

```nginx
# Quartz 文章链接不带 .html，自动匹配实际 HTML 文件
location / {
    try_files $uri $uri.html $uri/ =404;
}
```

关键是 `$uri.html`：当原始地址不存在时，Nginx 会继续寻找同名的 `.html` 文件。

原配置中已经存在下面这条错误页规则，不要重复添加：

```nginx
error_page 404 /404.html;
```

> [!WARNING]
> 如果以后配置中已经存在 `location /`，应修改已有规则，不能再添加第二个，否则 Nginx 会因为配置冲突而无法重新加载。

保存配置并重新加载 Nginx，然后使用 `Command + Shift + R` 强制刷新浏览器页面。

#### 9.14.3 注意访问端口

该站点监听的是 `100` 端口：

```nginx
listen 100;
```

因此访问地址必须包含 `:100`：

```text
http://47.99.178.186:100/
```

如果访问地址中没有 `:100`，请求会进入其他监听 `80` 端口的站点配置，此处修改不会生效。

## 十、rsync 和 Git 部署怎么选

`rsync` 更适合当前情况：

- 配置简单
- 可以直接代替宝塔网页上传
- 只同步变化的文件
- 不需要在服务器配置完整的构建环境

Git 部署更适合后期自动化：

- 本地把源码推送到 GitHub 或 Gitee
- 自动化程序拉取代码
- 自动构建 Quartz
- 自动把生成结果发布到服务器

Git 部署配置更多。建议先把 `rsync` 跑通，之后再考虑全自动部署。

## 十一、总结

日常更新只需要三步。

第一步，进入 Mac 本地的 Quartz 项目目录：

```bash
cd /Users/chenweili/Documents/quartz
```

第二步，构建最新博客：

```bash
npx quartz build
```

第三步，根据需要选择同步方式。

**普通增量同步**：更新新增或修改的文件，但不删除服务器上多出的旧文件。

```bash
rsync --8-bit-output -azci --no-times --progress -e "ssh -p 22" public/ root@47.99.178.186:/www/AfykeBlog/afyke-blog/
```

**与本地 `public` 完全保持一致**：更新有变化的文件，并删除服务器上本地 `public` 不存在的旧文件。

先预演：

```bash
rsync --8-bit-output -azcni --no-times --delete -e "ssh -p 22" public/ root@47.99.178.186:/www/AfykeBlog/afyke-blog/
```

确认列出的上传和删除内容无误后，再正式同步：

```bash
rsync --8-bit-output -azci --no-times --delete --progress -e "ssh -p 22" public/ root@47.99.178.186:/www/AfykeBlog/afyke-blog/
```

> [!WARNING]
> 只有确认 `/www/AfykeBlog/afyke-blog` 专门存放 Quartz 生成文件时，才使用 `--delete`。如果目录里还有手工上传且本地 `public` 中没有的文件，它们也会被删除。

一句话记忆：Quartz 负责生成网页，`rsync` 负责把发生变化的网页快速同步到服务器。
