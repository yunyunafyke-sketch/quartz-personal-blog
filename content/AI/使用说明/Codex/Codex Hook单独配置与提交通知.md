---
title: Codex Hook单独配置与提交通知
publish: true
date: 2026-08-17
---

# Codex Hook 单独配置与提交通知

## 一、一句话理解

如果希望每次 Git 提交后都收到通知，最可靠的方案是 Git 的 `post-commit` Hook；如果只想监听 Codex 执行的提交，可以使用 Codex 的 `PostToolUse` Hook。

## 二、理论：Codex Hook 是什么

### 2.1 Hook 的作用

Hook 可以在 Codex 生命周期中的指定时机自动执行脚本，例如：

- Codex 执行工具前；
- Codex 执行工具后；
- 新会话启动时；
- 会话结束时；
- 用户提交新的提示词时。

Codex Hook 本质上是“事件 + 匹配条件 + 要执行的命令”。命令 Hook 会从标准输入收到一段 JSON，可以从中读取当前目录、工具名称和具体命令。

### 2.2 Codex Hook 与 Git Hook 的区别

| 类型 | 触发范围 | 适合场景 |
| --- | --- | --- |
| Git `post-commit` | 任何工具完成 Git 提交后触发 | 所有提交都通知 |
| Codex `PostToolUse` | Codex 调用工具完成后触发 | 只监听 Codex 执行的提交 |

Codex 当前没有专门的“Git 提交完成”事件。Codex Hook 只能监听 Codex 的工具调用，因此要通过脚本检查命令中是否包含 `git commit`。

## 三、实践：方案一——所有提交完成后通知

### 3.1 创建 Git Hook

在项目目录中创建文件：

```text
.git/hooks/post-commit
```

写入以下内容：

```bash
#!/bin/sh

COMMIT_MESSAGE=$(git log -1 --pretty=%s)

osascript -e "display notification \"提交完成：$COMMIT_MESSAGE\" with title \"Git 提交通知\""
```

这个例子使用 macOS 的系统通知。提交成功后，会弹出一条通知。

### 3.2 赋予执行权限

在项目根目录执行：

```bash
chmod +x .git/hooks/post-commit
```

以后无论是 Codex、IDE 还是终端执行：

```bash
git commit -m "提交说明"
```

都会触发通知。

### 3.3 替换为远程消息通知

如果希望将消息发送到飞书、企业微信、钉钉、Telegram 等平台，可以把 `osascript` 替换为对应平台的 Webhook 请求。

通用结构如下：

```bash
curl -fsS -X POST "$NOTIFY_WEBHOOK_URL" \
  -H 'Content-Type: application/json' \
  -d "{\"text\":\"提交完成：$COMMIT_MESSAGE\"}"
```

`NOTIFY_WEBHOOK_URL` 建议放在系统环境变量或安全的本地配置中，不要把 Token 直接提交到 Git 仓库。

## 四、实践：方案二——只监听 Codex 执行的提交

### 4.1 配置 Codex Hook

创建全局配置文件：

```text
~/.codex/hooks.json
```

写入：

```json
{
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "^Bash$",
        "hooks": [
          {
            "type": "command",
            "command": "python3 ~/.codex/hooks/notify_commit.py",
            "async": true,
            "timeout": 10
          }
        ]
      }
    ]
  }
}
```

配置含义：

- `PostToolUse`：Codex 工具执行结束后触发。
- `matcher: ^Bash$`：只监听 Codex 执行的 Bash 命令。
- `notify_commit.py`：读取命令并判断是否包含 `git commit`。
- `async: true`：在后台发送通知，不阻塞 Codex 后续工作。
- `timeout: 10`：脚本最多运行 10 秒。

### 4.2 编写通知脚本

创建文件：

```text
~/.codex/hooks/notify_commit.py
```

写入：

```python
#!/usr/bin/env python3

import json
import os
import re
import subprocess
import sys


def escape_applescript(value: str) -> str:
    return value.replace("\\", "\\\\").replace('"', '\\"').replace("\n", " ")


payload = json.load(sys.stdin)
tool_input = payload.get("tool_input") or {}
command = tool_input.get("command", "")

# 不是 git commit 就结束，不发送通知
if not re.search(r"\bgit\s+commit(?:\s|$)", command):
    sys.exit(0)

cwd = payload.get("cwd") or os.getcwd()

try:
    commit_id = subprocess.check_output(
        ["git", "rev-parse", "HEAD"],
        cwd=cwd,
        text=True,
    ).strip()

    commit_message = subprocess.check_output(
        ["git", "log", "-1", "--pretty=%s"],
        cwd=cwd,
        text=True,
    ).strip()

    repo_name = os.path.basename(
        subprocess.check_output(
            ["git", "rev-parse", "--show-toplevel"],
            cwd=cwd,
            text=True,
        ).strip()
    )
except subprocess.CalledProcessError:
    sys.exit(0)

message = f"{repo_name} 提交完成：{commit_message} ({commit_id[:8]})"
message = escape_applescript(message)

subprocess.run(
    [
        "osascript",
        "-e",
        f'display notification "{message}" with title "Codex 提交通知"',
    ],
    check=False,
)
```

这个脚本会：

1. 读取 Codex Hook 传入的 JSON。
2. 检查本次 Bash 命令是否包含 `git commit`。
3. 获取仓库名、提交说明和提交短 SHA。
4. 使用 macOS 通知显示提交信息。

### 4.3 审核并启用 Hook

在 Codex CLI 中输入：

```text
/hooks
```

找到 `notify_commit.py` 对应的 Hook，审核并信任它。修改 Hook 配置或脚本后，Codex 可能要求重新审核。

### 4.4 测试

让 Codex 执行一次提交：

```text
提交当前修改，并在提交完成后通知我。
```

如果提交成功，应该收到类似以下通知：

```text
quartz 提交完成：整理 Codex Hook 配置 (a1b2c3d4)
```

## 五、实践：如何选择方案

### 5.1 需要所有提交都通知

使用 Git 的 `post-commit` Hook。

它可以覆盖：

- Codex 提交；
- IDE 提交；
- 终端提交；
- 脚本或自动化任务提交。

### 5.2 只需要 Codex 提交通知

使用 Codex 的 `PostToolUse` Hook，并在脚本中检查 `tool_input.command` 是否包含 `git commit`。

### 5.3 需要通知到聊天软件

保留 Hook 的触发逻辑，只替换通知函数：

- macOS 本地提醒：使用 `osascript`；
- 飞书、企业微信、钉钉：使用对应 Webhook；
- Telegram：调用 Bot API；
- 邮件：调用本地邮件命令或邮件服务 API。

不要把 Webhook Token、Bot Token、邮箱密码等敏感信息直接写入 `hooks.json` 或提交到仓库。

## 六、总结

### 6.1 推荐配置

如果目标是“每次提交都发消息给我”，推荐使用：

```text
Git post-commit
    ↓
读取最新提交信息
    ↓
调用 macOS 通知或远程 Webhook
    ↓
收到提交提醒
```

只有在明确要求“仅监听 Codex 提交”时，才使用 Codex `PostToolUse` Hook。

### 6.2 官方参考资料

- [OpenAI：Codex Hooks](https://developers.openai.com/codex/hooks)
- [OpenAI：Codex Configuration Reference](https://developers.openai.com/codex/config-reference)
