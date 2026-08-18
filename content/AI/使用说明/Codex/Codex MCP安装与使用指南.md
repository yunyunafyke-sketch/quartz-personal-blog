---
title: Codex MCP安装与使用指南
publish: true
---

# Codex MCP 安装与使用指南

## 1. MCP 是什么

MCP 可以理解成 Codex 的“外接工具”。

例如，安装 MySQL MCP 后，Codex 就能通过它查看数据库表结构、执行查询。Codex 本身不会直接连接 MySQL，必须先安装一个支持 MySQL 的 MCP Server。

## 2. 用你的 MySQL 数据库举例

你的数据库信息：

```text
地址：47.99.178.186
端口：3306
数据库：personal
用户名：未提供，需要自己补上
密码：已提供，但不要写进 Git 或笔记
```

下面使用 `mysql-mcp-server`，通过环境变量传递数据库配置。这个 MCP Server 支持通过 STDIO 连接，适合在本机给 Codex 使用。

## 3. 配置 MCP

### 3.1 配置 MySQL MCP

打开 Codex 配置文件：

```text
~/.codex/config.toml
```

加入下面内容：

```toml
[mcp_servers.personal_mysql]
command = "uvx"
args = ["--from", "mysql-mcp-server", "mysql_mcp_server"]

[mcp_servers.personal_mysql.env]
MYSQL_HOST = "47.99.178.186"
MYSQL_PORT = "3306"
MYSQL_USER = "替换成你的数据库用户名"
MYSQL_PASSWORD = "替换成你提供的数据库密码"
MYSQL_DATABASE = "personal"
```

说明：

- `uvx` 是 Python 工具 `uv` 提供的临时运行命令，会自动下载并运行 `mysql-mcp-server`，不需要手动执行 `pip install`。
- 你的 Mac 是 Apple Silicon，Homebrew 默认安装在 `/opt/homebrew`。先执行 `brew install uv`，然后建议将启动命令写成绝对路径：

  ```toml
  command = "/opt/homebrew/bin/uvx"
  ```

- `MYSQL_USER` 必须换成真实数据库用户名。只知道密码还不能连接数据库。
- 密码只放在本机的 `config.toml` 中，不要提交到 Git，也不要发到群聊或截图中。
- 如果本机没有 `uvx`，先安装 `uv`，然后再重启 Codex。

### 3.2 配置其他 MCP

以后安装其他 MCP，先查看该项目 README 中的安装方式、启动命令和环境变量，再在 `~/.codex/config.toml` 中新增一个配置块。每个 MCP 使用不同的名称。

Python MCP：

```toml
[mcp_servers.example]
command = "uvx"
args = ["--from", "Python包名", "启动入口"]
```

Node.js MCP：

```toml
[mcp_servers.example]
command = "npx"
args = ["-y", "npm包名"]
```

本地程序：

```toml
[mcp_servers.example]
command = "/绝对路径/程序名"
args = []
```

远程 HTTP MCP：

```toml
[mcp_servers.example]
url = "https://example.com/mcp"
```

配置后重启 Codex，输入 `/mcp` 检查连接状态。

## 4. 检查是否连接成功

重启 Codex，在输入框执行：

```text
/mcp
```

看到 `personal_mysql` 已连接后，输入：

```text
使用 personal_mysql 查询 personal 数据库有哪些表，只做只读操作。
```

再进一步查询：

```text
使用 personal_mysql 查看 users 表的表结构，并查询 5 条数据。不要执行 INSERT、UPDATE、DELETE、DROP 或 ALTER。
```

## 5. 连接失败时检查

按这个顺序排查：

1. 数据库用户名和密码是否正确。
2. MySQL 是否允许你的电脑访问 `47.99.178.186:3306`。
3. 云服务器安全组、防火墙是否放行 3306 端口。
4. 在终端执行 `uvx --version`，确认 `uvx` 可用。
5. 修改配置后是否重启 Codex。
6. 在 Codex 中重新执行 `/mcp` 查看状态。

### 5.1 公司内网场景：让 `zhps_mysql` 使用 ATrust SOCKS5

如果 MySQL 地址是公司内网域名，例如：

```text
obproxy-testdb.ob.testcloud.cic.inter
```

而 ATrust 在本机提供了 SOCKS5 服务：

```text
127.0.0.1:1080
```

那么 Codex 的 MCP 进程不能只依赖 ATrust 的域名规则。MCP 进程需要明确通过本机 SOCKS5 端口访问，否则可能出现内网域名无法解析或连接失败。

当前 ATrust 规则的含义是：

```text
DOMAIN-SUFFIX,cic.inter,公司代理
IP-CIDR,10.197.0.0/16,公司代理,no-resolve
```

这些规则由 ATrust 代理客户端负责处理，不会自动注入到 Codex 启动的 MCP 子进程中。

#### 推荐方案：使用 `proxychains-ng` 包装单个 MCP

先安装：

```bash
brew install proxychains-ng
```

创建专用配置文件，例如：

```ini
# /Users/chenweili/.codex/proxychains-zhps.conf
dynamic_chain
proxy_dns

[ProxyList]
socks5 127.0.0.1 1080
```

然后将 `zhps_mysql` 的启动命令改为：

```toml
[mcp_servers.zhps_mysql]
command = "/opt/homebrew/bin/proxychains4"
args = [
  "-q",
  "-f", "/Users/chenweili/.codex/proxychains-zhps.conf",
  "/opt/homebrew/bin/uvx",
  "--from", "mysql-mcp-server",
  "mysql_mcp_server"
]
startup_timeout_sec = 120
tool_timeout_sec = 120

[mcp_servers.zhps_mysql.env]
MYSQL_HOST = "公司内网 MySQL 地址"
MYSQL_PORT = "3306"
MYSQL_USER = "公司数据库用户名"
MYSQL_PASSWORD = "公司数据库密码"
MYSQL_DATABASE = "aboss_sso_ps"
MYSQL_SQL_MODE = ""
```

说明：

- `proxychains4` 只包装 `zhps_mysql`，其他 MCP 不会改变网络路径。
- `proxy_dns` 很重要，可以避免内网域名仍由本机 DNS 直接解析失败。
- 数据库地址继续使用公司内网域名，不要改成公网地址。
- `ALL_PROXY`、`HTTPS_PROXY` 等环境变量不一定被 MySQL 客户端识别，因此不能保证仅靠环境变量生效。
- 修改后重启 Codex，再通过 `/mcp` 检查 `zhps_mysql` 状态。

如果公司 VPN 已连接但仍无法解析 `cic.inter` 域名，通常需要使用上述 SOCKS5 包装方式，或者让公司网络提供跳板机/端口转发方案。Codex 的 `experimental_environment = "remote"` 是将 MCP 放到远程执行环境中运行，不等于让本机 MCP 自动连接公司的 VPN。

#### `sql_mode` 不兼容问题

`sql_mode` 是 MySQL 连接建立时的行为设置。`mysql-mcp-server` 默认使用：

```text
sql_mode = "TRADITIONAL"
```

`TRADITIONAL` 会启用较严格的数据校验规则，但公司的 Obproxy/数据库兼容层不支持这个连接初始化设置，因此会返回：

```text
Not supported feature or function
```

在 `zhps_mysql.env` 中增加：

```toml
MYSQL_SQL_MODE = ""
```

表示不额外要求当前 MCP 连接启用 `TRADITIONAL`。该配置只影响当前连接，不会修改数据库的全局配置。验证结果显示，设置为空后，`SELECT 1` 可以正常执行。主要进行只读查询时通常没有问题；如果以后执行写入，需要额外注意数据校验行为。

## 6. 安全建议

- 最好新建一个只读 MySQL 用户给 MCP 使用，不要使用 root。
- 只允许这个用户访问 `personal` 数据库。
- 第一次只执行查询，不要让 MCP 具备写入权限。
- 你的数据库地址和密码已经在聊天中出现过，正式使用前建议更换密码。

## 7. MCP 查询和统计网站

| 网站 | 适合查看什么 | 统计信息 |
| --- | --- | --- |
| [官方 MCP Registry](https://registry.modelcontextprotocol.io/) | 官方收录、版本、安装方式、环境变量 | 基本没有使用量排名 |
| [PulseMCP](https://www.pulsemcp.com/servers) | 搜索和比较 MCP | 预计访问量、热门排名、GitHub Star |
| [Smithery](https://smithery.ai/) | 搜索、安装和托管 MCP | `useCount`，自建服务还可查看调用分析 |
| [Glama](https://glama.ai/) | 搜索、在线测试、安全和质量检查 | 质量评分、工具数量、生态规模 |
| [MCP.so](https://chat.mcp.so/explore) | 按分类浏览 MCP | 适合发现，使用量统计较少 |
| GitHub、PyPI、npm | 查看源码和软件包 | Star、Fork、Issue、下载量 |

说明：

- 官方 Registry 主要保存 MCP 元数据，不负责托管安装包。
- PulseMCP 的访问量属于估算值，不是精确安装量。
- 使用 `uvx` 在本机运行 MCP 时，网站通常看不到你的实际调用次数。
- 查找 MySQL MCP 时，应同时核对作者、GitHub 仓库和安装包名称，避免安装同名但不同项目的 MCP。

参考：

- [Codex 配置参考](https://developers.openai.com/codex/config-reference)
- [MySQL MCP Server](https://github.com/designcomputer/mysql_mcp_server)
