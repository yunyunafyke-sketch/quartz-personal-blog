---
title: GitHub Actions 自动部署个人展示项目
date: 2026-09-06 23:34:06
publish: true
---

## 1. GitHub Actions 是什么

把 GitHub Actions 想成 GitHub 在你每次推送代码后，临时帮你开的一台“自动干活的云电脑”。你不需要手动在 Mac 上构建、再登录服务器上传文件；它会按你写好的步骤自动完成。

本项目的实际过程是：

```text
Mac 执行 git push origin main
            ↓
GitHub 临时启动一台 Ubuntu 云电脑
            ↓
按 .github/workflows/ 中的 YAML 步骤拉取代码、安装依赖、构建项目
            ↓
使用 SSH 私钥登录 47.99.178.186
            ↓
上传构建结果到 /www/personal/ 下的对应目录
            ↓
临时云电脑任务结束并被回收
```

这里的“临时云电脑”不是你的宝塔服务器。它只负责构建和上传；真正长期保存网站文件、运行后端的仍是 `47.99.178.186`。`.github/workflows/` 里的 YAML 文件就是写给这台临时云电脑的操作清单。

## 2. 本次部署目标

仓库：`yunyunafyke-sketch/personal`  
正式分支：`main`

| 模块 | 本地构建目录 | 服务器发布方式 |
| --- | --- | --- |
| `frontend/` | `frontend/dist/` | rsync 同步到作品集站点目录 |
| `admin/` | `admin/dist/` | rsync 同步到独立管理站点目录 |
| `backend/` | `backend/boot/target/boot-1.0.0-SNAPSHOT.jar` | 上传 JAR 后重启 systemd 服务 |

本教程使用三份独立工作流。修改前台不会重启后端；修改后台不会重新构建前台。

## 3. 每一步在哪里操作

| 操作位置 | 用来做什么 | 本教程中对应的操作 |
| --- | --- | --- |
| Mac 本地终端 | 生成密钥、获取服务器指纹、构建与提交代码 | `ssh-keygen`、`ssh-keyscan`、`npm`、`mvn`、`git` |
| 宝塔的「终端」 | 配置服务器 SSH、后端服务和 Nginx | 编辑 `/root/.ssh/authorized_keys`、执行 `chmod`、创建 systemd 服务 |
| Mac 本地 IDE | 新建和编辑 GitHub Actions 工作流文件 | 创建 `.github/workflows/*.yml` 并粘贴下文 YAML |
| GitHub 仓库网页 | 保存密钥、查看或手动启动部署 | `Settings → Secrets and variables → Actions`、`Actions` |

后文每个步骤都会标明操作位置。不要把 GitHub Secrets 写进代码文件，也不要在宝塔服务器中创建 `.github/workflows/`。

## 4. 本地提交前检查

在项目根目录 `/Volumes/data/ideaWorkSpace/personal` 执行：

```bash
cd /Volumes/data/ideaWorkSpace/personal

(cd frontend && npm ci && npm run build)
(cd admin && npm ci && npm run build)
(cd backend && mvn -B clean package)
```

首次配置前，先将项目推送到 GitHub 的 `main` 分支：

```bash
git add .
git commit -m "初始化个人展示项目"
git push -u origin main
```

`node_modules/`、`dist/`、`target/`、`.idea/` 与 `.vscode/` 不应提交；当前项目的 `.gitignore` 已包含这些规则。

## 5. 配置部署路径和 SSH 连接

### 5.1 确认发布路径

操作位置：宝塔的「终端」或文件管理器。

在 GitHub Secrets 和工作流中使用以下路径：

| 内容 | 服务器路径 |
| --- | --- |
| 作品集前台静态文件 | `/www/personal/frontend/` |
| 管理后台静态文件 | `/www/personal/adminFrontend/` |
| 后端 JAR | `/www/personal/boot-1.0.0-SNAPSHOT.jar` |
| 后端日志 | `/www/personal/logs/` |

前台和管理后台工作流分别同步各自的子目录；不要使用 `--delete` 同步 `/www/personal/` 根目录，以免删除 JAR 或日志。

### 5.2 在 Mac 创建 GitHub Actions 专用密钥

本教程使用 `root` 登录服务器，因此 GitHub Secret `DEPLOY_USER` 填写 `root`。

操作位置：Mac 本地终端。不要把日常个人 SSH 私钥上传到 GitHub；执行以下命令新建专用密钥：

```bash
ssh-keygen -t ed25519 -C "github-actions-personal" -f ~/.ssh/personal_actions
```

这条命令会在当前 Mac 的 `~/.ssh/` 目录创建一对配套文件：

| 文件 | 用途 | 下一步放到哪里 |
| --- | --- | --- |
| `personal_actions` | 私钥，必须保密 | 复制完整内容到 GitHub Secret `SSH_PRIVATE_KEY` |
| `personal_actions.pub` | 公钥，可以公开 | 复制整行内容到服务器 `/root/.ssh/authorized_keys` |

#### 5.2.1 用门锁和钥匙理解私钥、公钥

把服务器的 `root` 登录想成一扇门：

| 现实中的东西 | SSH 中对应的文件                | 放在哪里                             |
| ------ | ------------------------- | -------------------------------- |
| 门锁     | `personal_actions.pub` 公钥 | 服务器 `/root/.ssh/authorized_keys` |
| 唯一钥匙   | `personal_actions` 私钥     | GitHub Secret `SSH_PRIVATE_KEY`  |

部署时，GitHub Actions 拿着“唯一钥匙”敲服务器的门；服务器检查这把钥匙是否能匹配 `authorized_keys` 中保存的“门锁”。匹配成功，服务器才允许 GitHub Actions 以 `root` 身份登录并上传部署文件。

公钥可以放在服务器上，因为它只负责验证；私钥必须只由 GitHub 保存，因为拿到私钥的人就相当于拿到了这扇门的钥匙。因此，私钥不要上传到服务器、不要发给他人，也不要提交进项目仓库。

### 5.3 将私钥写入 GitHub

操作位置：先在 Mac 本地终端读取私钥，再在 GitHub 仓库网页保存。

在 Mac 本地终端执行：

```bash
cat ~/.ssh/personal_actions
```

![](image/Pasted%20image%2020260907002738.webp)
复制输出的全部内容（包含 `BEGIN OPENSSH PRIVATE KEY` 与 `END OPENSSH PRIVATE KEY` 两行）。然后进入 GitHub 仓库 `Settings → Secrets and variables → Actions`，在 **Repository secrets** 区域点击 **New repository secret**，填写：

1. **Name**：`SSH_PRIVATE_KEY`
2. **Secret**：粘贴刚才复制的私钥完整内容
3. 点击 **Add secret** 保存

私钥只写入 GitHub 的 Repository secret；不要写入服务器、项目代码、`.env` 文件或聊天记录。

### 5.4 将公钥写入服务器

操作位置：Mac 本地终端。执行下面命令查看公钥并复制输出的整行内容：

```bash
cat ~/.ssh/personal_actions.pub
```

操作位置：宝塔文件管理器或宝塔「终端」。将该公钥追加到服务器文件：

```text
/root/.ssh/authorized_keys
```

### 5.5 设置 SSH 文件权限

操作位置：宝塔「终端」。设置 SSH 目录与公钥文件权限：

```bash
chmod 700 /root/.ssh
chmod 600 /root/.ssh/authorized_keys
```

#### 5.5.1 这两条权限命令的作用

这两条命令只修改“谁可以访问文件”的权限，不会删除密钥，也不会修改密钥内容：

| 命令 | 实际效果 |
| --- | --- |
| `chmod 700 /root/.ssh` | 只有 `root` 可以进入、查看和修改 `.ssh` 目录；其他服务器账号完全不能访问。 |
| `chmod 600 /root/.ssh/authorized_keys` | 只有 `root` 可以查看和修改允许 SSH 登录的公钥列表；其他服务器账号不能读取或追加公钥。 |

这样做是为了防止其他服务器账号私自往 `authorized_keys` 中加入自己的公钥。SSH 会检查这两个权限；如果目录或文件对其他用户过于开放，SSH 可能直接拒绝使用其中的公钥，GitHub Actions 就会出现 `Permission denied (publickey)`。

### 5.6 获取服务器主机指纹

#### 5.6.1 服务器主机指纹的作用

它用于让 GitHub Actions 确认“当前连接的确实是 `47.99.178.186` 这台服务器”。可以把它理解成服务器的身份证：部署时，服务器会出示自己的 SSH 身份信息，GitHub Actions 会与 `SSH_KNOWN_HOSTS` 中保存的记录核对；一致才会上传文件，不一致则停止连接。

#### 5.6.2 用“送快递到正确地址”理解

把 GitHub Actions 想成送部署文件的快递员：

1. `SSH_PRIVATE_KEY` 像快递员手里的开门钥匙，证明“快递员有权进门”。
2. `SSH_KNOWN_HOSTS` 像寄件人提前交给快递员的“房屋身份证照片”，用来确认眼前这栋房子就是要去的那一栋。

即使快递员拿着正确钥匙，也不能只要看到一扇门就开门投递；它必须先核对门牌和房屋身份证。GitHub Actions 也是一样：先核对服务器身份，再用私钥登录。核对失败时宁可停止部署，也不会把网站文件上传到冒充 `47.99.178.186` 的其他服务器。

它与前面创建的部署密钥用途不同：

| GitHub Secret | 验证谁 | 作用 |
| --- | --- | --- |
| `SSH_PRIVATE_KEY` | GitHub Actions | 证明 GitHub Actions 有权限登录服务器。 |
| `SSH_KNOWN_HOSTS` | 服务器 | 证明 GitHub Actions 连的是正确的服务器。 |

操作位置：Mac 本地终端。获取服务器主机指纹并保存：

```bash
ssh-keyscan -p 22 47.99.178.186 > /tmp/personal-known-hosts
cat /tmp/personal-known-hosts
```

将第二条命令输出的全部内容复制到 GitHub Secret `SSH_KNOWN_HOSTS`。

![](image/Pasted%20image%2020260907002738.webp)

## 6. 创建后端 systemd 服务

### 6.1 systemd 是什么

systemd 可以理解成 Linux 服务器里一直值班的“应用管理员”。它不负责写 Java 代码，也不负责构建 JAR；它只负责按你给的说明启动后端、观察后端是否还活着，以及在服务器重启后重新启动后端。

如果只在宝塔终端中执行：

```bash
java -jar boot-1.0.0-SNAPSHOT.jar
```

后端和当前终端窗口绑得很紧：窗口关闭、程序异常退出或服务器重启后，通常需要你再手动启动。把后端交给 systemd 后，systemd 会按固定规则管理它：启动、异常后重试、开机自动启动和查看运行状态。

### 6.2 这一节最终要完成什么

`/etc/systemd/system/personal-backend.service` 是写给 systemd 的“后端运行说明书”。GitHub Actions 每次部署会覆盖 `/www/personal/boot-1.0.0-SNAPSHOT.jar`，然后远程执行 `systemctl restart personal-backend`。systemd 便会停止旧的 Java 后端进程，再用新 JAR 启动一个新的后端进程。

```text
GitHub Actions 上传新的 JAR
            ↓
systemctl restart personal-backend
            ↓
systemd 停掉旧后端 → 按 service 文件启动新后端
            ↓
后端重新监听 9080 端口
```

### 6.3 service 文件每一部分的作用

| 配置                                          | 白话作用                                                         |
| ------------------------------------------- | ------------------------------------------------------------ |
| `[Unit]`                                    | 服务的基本说明和启动前提。`After=network.target` 表示先让网络就绪，再启动后端。          |
| `[Service]`                                 | 后端程序实际怎么运行。                                                  |
| `User=www`                                  | 用宝塔当前 Java 项目使用的 `www` 用户运行后端，保持目录和日志文件的原有权限习惯。        |
| `WorkingDirectory=/www/personal`            | 后端启动时所在的默认目录。                                                |
| `EnvironmentFile=/etc/personal-backend.env` | 从这个服务器文件读取数据库密码、JWT、OSS 等敏感配置，不把它们写进 GitHub 或代码仓库。           |
| `ExecStart=...`                             | 真正启动后端的命令。当前服务器没有全局 `java`，使用宝塔 JDK 路径 `/www/server/java/jdk-17.0.8/bin/java`。 |
| `Restart=always`                            | 后端异常退出时，systemd 自动再次尝试启动。                                    |
| `RestartSec=5`                              | 每次重试前等待 5 秒，避免失败时无限高速重启。                                     |
| `[Install]` 与 `WantedBy=multi-user.target`  | 允许将该服务设置为服务器开机后自动启动。                                         |

### 6.4 创建 service 文件

操作位置：宝塔「终端」。

在服务器创建 `/etc/systemd/system/personal-backend.service`：

```ini
[Unit]
Description=personal backend
After=network.target

[Service]
Type=simple
User=www
WorkingDirectory=/www/personal
EnvironmentFile=/etc/personal-backend.env
ExecStart=/www/server/java/jdk-17.0.8/bin/java -Xmx1024M -Xms256M -jar /www/personal/boot-1.0.0-SNAPSHOT.jar
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
```

创建 `/etc/personal-backend.env`，把数据库、JWT、Redis、阿里云 OSS 等敏感配置填在服务器中，不要写入仓库或 GitHub 工作流：

```dotenv
DB_USERNAME=数据库用户名
DB_PASSWORD=数据库密码
SERVER_PORT=9080
JWT_SECRET=至少32字节的随机密钥
ALIYUN_OSS_ACCESS_KEY_ID=你的AccessKeyId
ALIYUN_OSS_ACCESS_KEY_SECRET=你的AccessKeySecret
ALIYUN_OSS_BUCKET=personal-afyke
```

### 6.5 让 systemd 读取并启动后端

首次启动时在宝塔「终端」执行：

```bash
systemctl daemon-reload
systemctl enable --now personal-backend
systemctl status personal-backend
```

| 命令 | 这一步在做什么 |
| --- | --- |
| `systemctl daemon-reload` | 让 systemd 重新读取刚创建或修改过的 `.service` 文件。 |
| `systemctl enable --now personal-backend` | 设置服务器以后开机自动启动，同时立刻启动当前服务。 |
| `systemctl status personal-backend` | 查看后端是否成功运行；失败时在这里先看错误信息。 |

### 6.6 查看 systemd 后端日志

操作位置：宝塔「终端」。`systemctl status` 只显示少量最近日志；需要排查启动、接口或数据库问题时使用以下命令：

```bash
# 查看该服务目前保留的全部 systemd 日志
journalctl -u personal-backend --no-pager

# 查看最近 500 行
journalctl -u personal-backend -n 500 --no-pager

# 持续实时查看新日志；按 Ctrl+C 停止
journalctl -u personal-backend -f
```

### 6.7 从宝塔 Java 项目切换到 systemd

宝塔当前 Java 项目的“指定变量”与 `/etc/personal-backend.env` 是两套独立配置。切换时按以下顺序操作：

1. 先将宝塔页面中现有的全部环境变量迁移到 `/etc/personal-backend.env`，但暂时不要删除宝塔项目。
2. 在宝塔 Java 项目页面点击“停止”，让它释放 `9080` 端口；此时只停止，不删除配置，方便切换失败时恢复。
3. 在宝塔「终端」执行：

   ```bash
   systemctl daemon-reload
   systemctl enable --now personal-backend
   systemctl status personal-backend
   ```

4. `systemctl status personal-backend` 显示 `active (running)` 后，再打开现有管理后台并执行一次登录、查看项目或技术栈等会请求后端的操作。页面能正常返回数据，就表示“后端能正常访问”。
5. 确认无误后，再删除宝塔 Java 项目的启动配置。

不要让宝塔 Java 项目和 systemd 同时运行：两者都会尝试占用 `9080` 端口，后启动的一方会启动失败。若 systemd 启动失败，先执行 `systemctl disable --now personal-backend`，再在宝塔页面重新启动原 Java 项目即可恢复。

本教程中 `root` 仅用于 GitHub Actions 通过 SSH 上传 JAR 和执行 `systemctl`；后端 Java 进程仍使用宝塔当前的 `www` 用户运行，这两件事不冲突。

## 7. 配置 Nginx

操作位置：宝塔「终端」或宝塔网站的 Nginx 配置编辑页。

前台域名根目录指向 `/www/personal/frontend`，管理后台使用单独子域名并指向 `/www/personal/adminFrontend`。两个站点均将 `/api/` 转发给后端 `9080` 端口。

```nginx
location / {
    try_files $uri $uri/ /index.html;
}

location /api/ {
    proxy_pass http://127.0.0.1:9080;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}
```

检查并加载配置：

```bash
nginx -t
systemctl reload nginx
```

## 8. 告诉 GitHub Actions 服务器在哪里、文件放哪里

操作位置：GitHub 仓库网页。

前面保存的私钥和服务器主机指纹，解决的是“能不能安全登录服务器”。这一节的内容则像交给 GitHub Actions 的一张部署地址单：服务器地址、登录端口，以及三种项目文件分别该放到哪个目录。

### 8.1 填写服务器地址和发布目录

再次点击 **New repository secret**，按下表逐项添加：

| Secret 名称 | 填写内容 | 它在部署时做什么 |
| --- | --- | --- |
| `DEPLOY_HOST` | 服务器 IP 或域名 | 告诉 GitHub Actions 要连接哪台服务器；这里填你的服务器 IP。 |
| `DEPLOY_PORT` | SSH 端口，例如 `22` | 告诉它从服务器的哪个 SSH 入口连接；你的服务器使用默认的 `22`。 |
| `DEPLOY_USER` | `root` | 告诉它登录服务器时使用哪个账号；本项目用 `root` 上传部署文件。 |
| `FRONTEND_DEPLOY_PATH` | `/www/personal/frontend` | 前台网页构建完成后，上传到这个目录。 |
| `ADMIN_DEPLOY_PATH` | `/www/personal/adminFrontend` | 管理后台构建完成后，上传到这个目录。 |
| `BACKEND_DEPLOY_PATH` | `/www/personal` | 后端 JAR 上传到这个目录；最终文件是 `/www/personal/boot-1.0.0-SNAPSHOT.jar`。 |

Secret 保存后不能查看明文是正常的；只能覆盖更新。私钥、数据库密码和 JWT 密钥不能提交到 Git 仓库。

## 9. 在项目中创建工作流文件

操作位置：Mac 本地终端和 IDE。

在本地项目根目录执行：

```bash
cd /Volumes/data/ideaWorkSpace/personal
mkdir -p .github/workflows
```

然后在 IDE 的 `.github/workflows/` 目录中分别新建以下三个文件：

```text
deploy-frontend.yml  # 只发布 /www/personal/frontend
deploy-admin.yml     # 只发布 /www/personal/adminFrontend
deploy-backend.yml   # 只覆盖 /www/personal/boot-1.0.0-SNAPSHOT.jar 并重启服务
```

接下来按顺序将下面三段完整内容粘贴到对应文件。不要把工作流放在 `frontend/`、`admin/` 或 `backend/` 目录内；GitHub 只识别项目根目录 `.github/workflows/` 下的 YAML 文件。

## 10. 创建前台部署工作流

创建 `.github/workflows/deploy-frontend.yml`：

```yaml
name: 部署个人作品集前台

on:
  push:
    branches: [main]
    paths:
      - 'frontend/**'
      - '.github/workflows/deploy-frontend.yml'
  workflow_dispatch:

permissions:
  contents: read

concurrency:
  group: personal-frontend-production
  cancel-in-progress: true

jobs:
  deploy:
    runs-on: ubuntu-latest
    timeout-minutes: 15
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm
          cache-dependency-path: frontend/package-lock.json

      - name: 安装依赖并构建
        working-directory: frontend
        run: |
          npm ci
          npm run build
          test -f dist/index.html

      - name: 配置 SSH
        env:
          SSH_PRIVATE_KEY: ${{ secrets.SSH_PRIVATE_KEY }}
          SSH_KNOWN_HOSTS: ${{ secrets.SSH_KNOWN_HOSTS }}
        run: |
          install -m 700 -d ~/.ssh
          printf '%s\n' "$SSH_PRIVATE_KEY" > ~/.ssh/deploy_key
          printf '%s\n' "$SSH_KNOWN_HOSTS" > ~/.ssh/known_hosts
          chmod 600 ~/.ssh/deploy_key ~/.ssh/known_hosts

      - name: 发布前台静态文件
        env:
          DEPLOY_HOST: ${{ secrets.DEPLOY_HOST }}
          DEPLOY_PORT: ${{ secrets.DEPLOY_PORT }}
          DEPLOY_USER: ${{ secrets.DEPLOY_USER }}
          DEPLOY_PATH: ${{ secrets.FRONTEND_DEPLOY_PATH }}
        run: |
          rsync -az --delete \
            -e "ssh -i ~/.ssh/deploy_key -p ${DEPLOY_PORT} -o IdentitiesOnly=yes -o StrictHostKeyChecking=yes" \
            frontend/dist/ \
            "${DEPLOY_USER}@${DEPLOY_HOST}:${DEPLOY_PATH}/"
```

## 11. 创建管理后台部署工作流

创建 `.github/workflows/deploy-admin.yml`：

```yaml
name: 部署个人展示管理后台

on:
  push:
    branches: [main]
    paths:
      - 'admin/**'
      - '.github/workflows/deploy-admin.yml'
  workflow_dispatch:

permissions:
  contents: read

concurrency:
  group: personal-admin-production
  cancel-in-progress: true

jobs:
  deploy:
    runs-on: ubuntu-latest
    timeout-minutes: 15
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm
          cache-dependency-path: admin/package-lock.json

      - name: 安装依赖并构建
        working-directory: admin
        run: |
          npm ci
          npm run build
          test -f dist/index.html

      - name: 配置 SSH
        env:
          SSH_PRIVATE_KEY: ${{ secrets.SSH_PRIVATE_KEY }}
          SSH_KNOWN_HOSTS: ${{ secrets.SSH_KNOWN_HOSTS }}
        run: |
          install -m 700 -d ~/.ssh
          printf '%s\n' "$SSH_PRIVATE_KEY" > ~/.ssh/deploy_key
          printf '%s\n' "$SSH_KNOWN_HOSTS" > ~/.ssh/known_hosts
          chmod 600 ~/.ssh/deploy_key ~/.ssh/known_hosts

      - name: 发布管理后台静态文件
        env:
          DEPLOY_HOST: ${{ secrets.DEPLOY_HOST }}
          DEPLOY_PORT: ${{ secrets.DEPLOY_PORT }}
          DEPLOY_USER: ${{ secrets.DEPLOY_USER }}
          DEPLOY_PATH: ${{ secrets.ADMIN_DEPLOY_PATH }}
        run: |
          rsync -az --delete \
            -e "ssh -i ~/.ssh/deploy_key -p ${DEPLOY_PORT} -o IdentitiesOnly=yes -o StrictHostKeyChecking=yes" \
            admin/dist/ \
            "${DEPLOY_USER}@${DEPLOY_HOST}:${DEPLOY_PATH}/"
```

## 12. 创建后端部署工作流

创建 `.github/workflows/deploy-backend.yml`：

```yaml
name: 部署个人展示后端

on:
  push:
    branches: [main]
    paths:
      - 'backend/**'
      - '.github/workflows/deploy-backend.yml'
  workflow_dispatch:

permissions:
  contents: read

concurrency:
  group: personal-backend-production
  cancel-in-progress: true

jobs:
  deploy:
    runs-on: ubuntu-latest
    timeout-minutes: 20
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-java@v4
        with:
          distribution: temurin
          java-version: '17'
          cache: maven

      - name: 打包后端
        working-directory: backend
        run: |
          mvn -B clean package
          test -f boot/target/boot-1.0.0-SNAPSHOT.jar

      - name: 配置 SSH
        env:
          SSH_PRIVATE_KEY: ${{ secrets.SSH_PRIVATE_KEY }}
          SSH_KNOWN_HOSTS: ${{ secrets.SSH_KNOWN_HOSTS }}
        run: |
          install -m 700 -d ~/.ssh
          printf '%s\n' "$SSH_PRIVATE_KEY" > ~/.ssh/deploy_key
          printf '%s\n' "$SSH_KNOWN_HOSTS" > ~/.ssh/known_hosts
          chmod 600 ~/.ssh/deploy_key ~/.ssh/known_hosts

      - name: 上传 JAR
        env:
          DEPLOY_HOST: ${{ secrets.DEPLOY_HOST }}
          DEPLOY_PORT: ${{ secrets.DEPLOY_PORT }}
          DEPLOY_USER: ${{ secrets.DEPLOY_USER }}
          DEPLOY_PATH: ${{ secrets.BACKEND_DEPLOY_PATH }}
        run: |
          rsync -az \
            -e "ssh -i ~/.ssh/deploy_key -p ${DEPLOY_PORT} -o IdentitiesOnly=yes -o StrictHostKeyChecking=yes" \
            backend/boot/target/boot-1.0.0-SNAPSHOT.jar \
            "${DEPLOY_USER}@${DEPLOY_HOST}:${DEPLOY_PATH}/boot-1.0.0-SNAPSHOT.jar"

      - name: 重启并检查后端
        env:
          DEPLOY_HOST: ${{ secrets.DEPLOY_HOST }}
          DEPLOY_PORT: ${{ secrets.DEPLOY_PORT }}
          DEPLOY_USER: ${{ secrets.DEPLOY_USER }}
        run: |
          ssh -i ~/.ssh/deploy_key -p "${DEPLOY_PORT}" \
            -o IdentitiesOnly=yes -o StrictHostKeyChecking=yes \
            "${DEPLOY_USER}@${DEPLOY_HOST}" \
            'systemctl restart personal-backend && systemctl is-active --quiet personal-backend'
```

## 13. 提交并首次执行

操作位置：Mac 本地终端；随后在 GitHub `Actions` 页面查看执行结果。

将三份工作流提交到 `main`：

```bash
cd /Volumes/data/ideaWorkSpace/personal
git add .github/workflows
git commit -m "部署配置-新增 GitHub Actions 自动部署"
git push origin main
```

打开 GitHub 仓库的 `Actions` 页面，分别查看三个工作流。首次配置建议依次手动运行：前台、管理后台、后端；确认每一个都成功后，再进行日常开发。

## 14. 日常发布

操作位置：Mac 本地终端。

| 修改内容 | 提交并推送后的动作 |
| --- | --- |
| `frontend/` | 仅构建并发布作品集前台 |
| `admin/` | 仅构建并发布管理后台 |
| `backend/` | 仅构建、上传 JAR 并重启后端 |

```bash
git add frontend
git commit -m "个人展示-更新首页内容"
git push origin main
```

工作流文件本身修改后，推送到 `main` 同样会触发对应部署；也可以在 GitHub `Actions` 页面选择工作流后点击 `Run workflow` 手动执行。

## 15. 常见排查

| 现象 | 处理方式 |
| --- | --- |
| `Permission denied (publickey)` | 核对 `SSH_PRIVATE_KEY`、`/root/.ssh/authorized_keys` 和 `.ssh` 文件权限。 |
| `Host key verification failed` | 重新获取并核对服务器主机密钥后，更新 `SSH_KNOWN_HOSTS`。不要关闭主机验证。 |
| rsync 无法写入 | 核对三个部署路径和 `root` 对目录的写入权限。 |
| 后端上传成功但未更新 | 在服务器执行 `systemctl status personal-backend` 与 `journalctl -u personal-backend -n 100`。 |
| 管理后台刷新 404 | 检查管理后台 Nginx 站点是否已配置 `try_files $uri $uri/ /index.html`。 |
| 前端请求 API 失败 | 检查前台站点的 `/api/` 反向代理、后端 `9080` 服务和浏览器控制台请求地址。 |

## 16. 回滚

操作位置：Mac 本地终端。

部署异常时，使用 Git 回滚后再次推送即可触发相应工作流：

```bash
git log --oneline
git revert 提交编号
git push origin main
```

不要在服务器发布目录中手工混放文件：前台、后台工作流使用 `rsync --delete`，会清理构建产物中不存在的旧文件。

## 17. 官方资料

- [Understanding GitHub Actions](https://docs.github.com/en/actions/get-started/understand-github-actions)
- [systemd：Linux 系统与服务管理器](https://www.freedesktop.org/software/systemd/man/latest/systemd.html)
- [systemctl：管理 systemd 服务的命令](https://www.freedesktop.org/software/systemd/man/latest/systemctl.html)
