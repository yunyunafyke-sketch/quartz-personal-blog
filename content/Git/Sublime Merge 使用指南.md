---
title: Sublime Merge 使用指南
date: 2026-10-26 14:38:34
publish: true
---

# Sublime Merge 使用指南

## 提交所有改动：照着点就行

不管是**新增文件、修改文件，还是删除文件**，想把所有改动一起提交，都按下面操作。

1. **在编辑器里保存所有文件**，打开 Sublime Merge 中的 Quartz 仓库。
2. **点右侧的 Stage All**：把全部新增、修改、删除选入本次提交。
3. **在上方 Commit Message 输入中文说明**，例如：`更新笔记及配图`。
4. **点 Commit N files**（N 是本次提交的文件数）：保存到本地。
5. **点最右上角的 ↑**：推送到远程。

**记住：保存文件 → Stage All → 写说明 → Commit → ↑。**

![Sublime Merge 操作界面，Stage All 在右侧上方](images/sublime-merge-quartz.png)

## 几个提示

- **新增文件会一起提交吗？** 会，点 Stage All 后，新增文件也会加入本次提交。
- **删除文件会一起提交吗？** 会，点 Stage All 会把删除记录也加入本次提交，推送后远程对应文件也会删除。
- **已经显示 STAGED FILES，按钮是 Commit N files？** 说明已选好文件，直接写说明，再点 Commit。
- **弹出购买提醒？** 试用期间点 Cancel 关闭提醒，返回后检查提交是否完成。长期使用需要购买许可证。
- **只想本地保存版本？** 点完 Commit 就可以；需要同步远程才点 ↑。

> 不要点 Discard All，它是丢弃修改，不是提交。
