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

- `MYSQL_USER` 必须换成真实数据库用户名。只知道密码还不能连接数据库。
- 密码只放在本机的 `config.toml` 中，不要提交到 Git，也不要发到群聊或截图中。
- 如果本机没有 `uvx`，先安装 `uv`，然后再重启 Codex。

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

## 6. 安全建议

- 最好新建一个只读 MySQL 用户给 MCP 使用，不要使用 root。
- 只允许这个用户访问 `personal` 数据库。
- 第一次只执行查询，不要让 MCP 具备写入权限。
- 你的数据库地址和密码已经在聊天中出现过，正式使用前建议更换密码。

参考：

- [Codex 配置参考](https://developers.openai.com/codex/config-reference)
- [MySQL MCP Server](https://github.com/designcomputer/mysql_mcp_server)
